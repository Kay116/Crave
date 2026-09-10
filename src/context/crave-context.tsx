import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { dishById } from '@/data/dishes';
import { loadCloudHistory, saveLike, savePreference, saveSwipe } from '@/services/cloud-history';
import {
  clearPending, GUEST_CLAIMED_KEY, GUEST_KEY, hasContent, INITIAL_STATE, LEGACY_V2_KEY, LEGACY_V3_KEY,
  mergeState, mergeSwipes, normalizeState, PersistedState, reconcileLikes, userStoreKey,
} from '@/services/local-store';
import { buildTasteProfile, normalizeFilters, selectDeck } from '@/services/recommendation';
import { Cuisine, Dish, Filters, Mood, PreferenceSession, SwipeChoice, TasteSignal } from '@/types';

// Re-exported so existing imports (`@/context/crave-context`) keep working.
export { scoreDish } from '@/services/recommendation';

type CloudStatus = 'local' | 'syncing' | 'synced' | 'error';
type CraveContextValue = PersistedState & {
  hydrated: boolean; likedDishes: Dish[]; recommendations: Dish[]; tasteProfile: TasteSignal[];
  deckRelaxed: string[]; deckUsedFallback: boolean;
  cloudStatus: CloudStatus; cloudError: string | null;
  completeOnboarding: () => Promise<void>;
  setPreferences: (moods: Mood[], cuisines: Cuisine[], filters?: Partial<Filters>) => void;
  recordSwipe: (dishId: string, choice: SwipeChoice) => void; toggleLike: (dishId: string) => void;
  clearSession: () => void; resetAll: () => Promise<void>; syncCloud: () => Promise<void>;
};

const initial = INITIAL_STATE;
const userKey = userStoreKey;
const Context = createContext<CraveContextValue | null>(null);
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

async function readState(key: string): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? normalizeState(JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

export function CraveProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  // True while the active account (and therefore the storage key) is changing.
  // Nothing is persisted or synced to the cloud while this is set.
  const [switching, setSwitching] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local');
  const [cloudError, setCloudError] = useState<string | null>(null);
  // `activeKeyRef` is the async-safe source of truth used inside effects and the
  // sync callback; `activeKey` mirrors it for render-time gating in the memo.
  const activeKeyRef = useRef<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const guestMigratedRef = useRef(false);
  const setActive = useCallback((key: string | null) => { activeKeyRef.current = key; setActiveKey(key); }, []);

  // Pick and hydrate the correct local state whenever the signed-in user becomes
  // known or changes. Only runs once Supabase auth has finished loading, so we
  // never hydrate guest data over a returning user (or vice versa).
  useEffect(() => {
    if (authLoading) return;
    const targetKey = user ? userKey(user.id) : GUEST_KEY;
    if (activeKeyRef.current === targetKey) return;

    let cancelled = false;
    setSwitching(true);

    (async () => {
      let next = await readState(targetKey);

      if (!user) {
        // Fresh install of this version: fold any legacy single-key data into guest.
        if (!next) {
          const legacy = (await readState(LEGACY_V3_KEY)) ?? (await readState(LEGACY_V2_KEY));
          if (legacy) {
            next = legacy;
            try {
              await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(legacy));
              await AsyncStorage.multiRemove([LEGACY_V3_KEY, LEGACY_V2_KEY]);
            } catch {
              // Non-fatal: the legacy data is still readable next launch.
            }
          }
        }
        if (cancelled) return;
        setActive(GUEST_KEY);
        setState(next ?? { ...initial });
        setHydrated(true);
        setSwitching(false);
        return;
      }

      let merged = next ?? { ...initial };

      // One-time guest -> account migration. Guarded so guest history is claimed
      // by at most one account, ever, on this device.
      let claimed = false;
      try { claimed = Boolean(await AsyncStorage.getItem(GUEST_CLAIMED_KEY)); } catch { claimed = false; }
      if (!claimed && !guestMigratedRef.current) {
        const guest = await readState(GUEST_KEY);
        if (guest && hasContent(guest)) {
          guestMigratedRef.current = true;
          merged = mergeState(merged, guest);
          const at = Date.now();
          // Queue the migrated likes for upload into this account's cloud history.
          merged.pendingLikes = { ...merged.pendingLikes, ...Object.fromEntries(guest.likedIds.map((id) => [id, at])) };
          try {
            await AsyncStorage.setItem(targetKey, JSON.stringify(merged));
            await AsyncStorage.setItem(GUEST_CLAIMED_KEY, '1');
            await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(initial));
          } catch {
            // Non-fatal: retried on the next sign-in while the claim flag is unset.
          }
        }
      }

      if (cancelled) return;
      setActive(targetKey);
      setState(merged);
      setHydrated(true);
      setSwitching(false);
    })().catch(() => {
      if (cancelled) return;
      setHydrated(true);
      setSwitching(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Persist to the active account's key only, and never mid-switch.
  useEffect(() => {
    if (!hydrated || switching) return;
    const key = activeKeyRef.current;
    if (!key) return;
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [hydrated, switching, state]);

  const syncCloud = useCallback(async () => {
    if (!user || !hydrated || switching) return;
    const activeUserId = user.id;
    // Never upload while the active storage key belongs to a different account.
    if (activeKeyRef.current !== userKey(activeUserId)) return;

    setCloudStatus('syncing');
    setCloudError(null);
    try {
      const localSnapshot = state;
      const pendingLikeIds = Object.keys(localSnapshot.pendingLikes);
      const pendingUnlikeIds = Object.keys(localSnapshot.pendingUnlikes);

      const cloud = await loadCloudHistory(activeUserId);

      // The account must not have changed while we were on the network.
      if (activeKeyRef.current !== userKey(activeUserId)) { setCloudStatus('local'); return; }

      await Promise.all([
        ...localSnapshot.preferenceHistory.map((item) => savePreference(activeUserId, item)),
        ...localSnapshot.swipeHistory.map((item) => saveSwipe(activeUserId, item)),
        ...pendingLikeIds.map((dishId) => saveLike(activeUserId, dishId, true)),
        ...pendingUnlikeIds.map((dishId) => saveLike(activeUserId, dishId, false)),
      ]);

      if (activeKeyRef.current !== userKey(activeUserId)) { setCloudStatus('local'); return; }

      setState((current) => {
        const pendingLikes = { ...current.pendingLikes };
        const pendingUnlikes = { ...current.pendingUnlikes };
        // Drop only the tombstones we actually pushed; keep anything toggled since.
        pendingLikeIds.forEach((id) => { if (pendingLikes[id] === localSnapshot.pendingLikes[id]) delete pendingLikes[id]; });
        pendingUnlikeIds.forEach((id) => { if (pendingUnlikes[id] === localSnapshot.pendingUnlikes[id]) delete pendingUnlikes[id]; });
        // The cloud list is authoritative once our pending ops have been applied,
        // so a dish removed offline stays removed instead of resurfacing. Local
        // toggles that landed mid-sync are still pending and re-applied here.
        const pushedLikes = Object.fromEntries(pendingLikeIds.map((id) => [id, 1]));
        const pushedUnlikes = Object.fromEntries(pendingUnlikeIds.map((id) => [id, 1]));
        const likedIds = reconcileLikes(
          reconcileLikes(cloud.likedIds, pushedLikes, pushedUnlikes),
          pendingLikes,
          pendingUnlikes,
        );
        return {
          ...current,
          preferenceHistory: [...new Map([...cloud.preferences, ...current.preferenceHistory].map((item) => [item.id, item])).values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100),
          swipeHistory: mergeSwipes(current.swipeHistory, cloud.swipes),
          likedIds,
          pendingLikes,
          pendingUnlikes,
        };
      });
      setCloudStatus('synced');
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Cloud sync failed.');
      setCloudStatus('error');
    }
  }, [user, hydrated, switching, state]);

  // Account changes intentionally trigger a one-time remote synchronization, but
  // only once the local state for that exact account has settled.
  useEffect(() => {
    if (user && hydrated && !switching && activeKeyRef.current === userKey(user.id)) syncCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hydrated, switching]);

  const value = useMemo<CraveContextValue>(() => {
    // Non-null only when this exact account's local state has fully settled, so
    // writes and uploads can never target a different account.
    const activeUser = !switching && user && activeKey === userKey(user.id) ? user : null;
    const selection = selectDeck(state.filters, {
      currentSwipes: state.swipes,
      swipeHistory: state.swipeHistory,
      preferenceHistory: state.preferenceHistory,
    });
    return {
      ...state, hydrated, cloudStatus: user ? cloudStatus : 'local', cloudError: user ? cloudError : null,
      likedDishes: state.likedIds.map((id) => dishById.get(id)).filter((dish): dish is Dish => Boolean(dish)),
      recommendations: selection.deck,
      deckRelaxed: selection.relaxed,
      deckUsedFallback: selection.usedFallback,
      tasteProfile: buildTasteProfile(state.swipeHistory, state.preferenceHistory),
      completeOnboarding: async () => setState((current) => ({ ...current, hasOnboarded: true })),
      setPreferences: (moods, cuisines, filters) => {
        const nextFilters = normalizeFilters({ ...filters, moods, cuisines });
        const preference: PreferenceSession = { id: makeId('preference'), moods, cuisines, createdAt: Date.now(), filters };
        setState((current) => ({ ...current, moods, cuisines, filters: nextFilters, swipes: [], preferenceHistory: [preference, ...current.preferenceHistory].slice(0, 100) }));
        if (activeUser) savePreference(activeUser.id, preference).catch(() => setCloudStatus('error'));
      },
      recordSwipe: (dishId, choice) => {
        const swipe = { id: makeId('swipe'), dishId, choice, at: Date.now() };
        const at = swipe.at;
        setState((current) => {
          const pendingLikes = { ...current.pendingLikes };
          const pendingUnlikes = { ...current.pendingUnlikes };
          if (choice === 'like') { pendingLikes[dishId] = at; delete pendingUnlikes[dishId]; }
          return {
            ...current,
            swipes: [...current.swipes.filter((item) => item.dishId !== dishId), swipe],
            swipeHistory: [swipe, ...current.swipeHistory].slice(0, 500),
            likedIds: choice === 'like' ? Array.from(new Set([...current.likedIds, dishId])) : current.likedIds,
            pendingLikes,
            pendingUnlikes,
          };
        });
        if (activeUser) {
          Promise.all([saveSwipe(activeUser.id, swipe), ...(choice === 'like' ? [saveLike(activeUser.id, dishId, true)] : [])])
            .then(() => { if (choice === 'like') setState((current) => clearPending(current, 'like', dishId, at)); })
            .catch(() => setCloudStatus('error'));
        }
      },
      toggleLike: (dishId) => {
        const liked = !state.likedIds.includes(dishId);
        const at = Date.now();
        setState((current) => {
          const pendingLikes = { ...current.pendingLikes };
          const pendingUnlikes = { ...current.pendingUnlikes };
          if (liked) { pendingLikes[dishId] = at; delete pendingUnlikes[dishId]; }
          else { pendingUnlikes[dishId] = at; delete pendingLikes[dishId]; }
          return {
            ...current,
            likedIds: liked ? [...current.likedIds, dishId] : current.likedIds.filter((id) => id !== dishId),
            pendingLikes,
            pendingUnlikes,
          };
        });
        if (activeUser) {
          saveLike(activeUser.id, dishId, liked)
            .then(() => setState((current) => clearPending(current, liked ? 'like' : 'unlike', dishId, at)))
            .catch(() => setCloudStatus('error'));
        }
      },
      clearSession: () => setState((current) => ({ ...current, swipes: [] })),
      // Sign-out cleanup: drop back to a clean guest state immediately. Does NOT
      // delete the signed-in user's local cache or their cloud history.
      resetAll: async () => {
        setSwitching(true);
        setActive(GUEST_KEY);
        const guest = await readState(GUEST_KEY);
        setState(guest ?? { ...initial });
        setHydrated(true);
        setSwitching(false);
      },
      syncCloud,
    };
  }, [state, hydrated, switching, activeKey, cloudStatus, cloudError, user, syncCloud, setActive]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCrave() {
  const value = useContext(Context);
  if (!value) throw new Error('useCrave must be used inside CraveProvider');
  return value;
}
