import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { dishes } from '@/data/dishes';
import { loadCloudHistory, saveLike, savePreference, saveSwipe } from '@/services/cloud-history';
import { Cuisine, Dish, Mood, PreferenceSession, SwipeChoice, SwipeRecord, TasteSignal } from '@/types';

type PersistedState = {
  hasOnboarded: boolean; moods: Mood[]; cuisines: Cuisine[]; swipes: SwipeRecord[];
  likedIds: string[]; preferenceHistory: PreferenceSession[]; swipeHistory: SwipeRecord[];
  // Tombstones for saved dishes: a local like/unlike that has not been confirmed
  // against the cloud yet. Keyed by dish id, valued by the local mutation time.
  pendingLikes: Record<string, number>; pendingUnlikes: Record<string, number>;
};
type CloudStatus = 'local' | 'syncing' | 'synced' | 'error';
type CraveContextValue = PersistedState & {
  hydrated: boolean; likedDishes: Dish[]; recommendations: Dish[]; tasteProfile: TasteSignal[];
  cloudStatus: CloudStatus; cloudError: string | null;
  completeOnboarding: () => Promise<void>; setPreferences: (moods: Mood[], cuisines: Cuisine[]) => void;
  recordSwipe: (dishId: string, choice: SwipeChoice) => void; toggleLike: (dishId: string) => void;
  clearSession: () => void; resetAll: () => Promise<void>; syncCloud: () => Promise<void>;
};

// Account-isolated storage. Guest activity and every signed-in user each get their
// own key, so one account's history can never be persisted into — or uploaded
// from — another account on a shared device.
const GUEST_KEY = '@crave/v3/guest';
const userKey = (id: string) => `@crave/v3/user/${id}`;
// Older builds stored everything under a single key. Kept only so existing
// installs fold cleanly into the guest slot on first launch of this version.
const LEGACY_V3_KEY = '@crave/v3';
const LEGACY_V2_KEY = '@crave/v2';
// Written once, the first time guest history is merged into any account. After
// that guest data is never auto-migrated again, so it cannot later be pulled
// into a different account.
const GUEST_CLAIMED_KEY = '@crave/v3/guest-claimed';

const initial: PersistedState = { hasOnboarded: false, moods: [], cuisines: [], swipes: [], likedIds: [], preferenceHistory: [], swipeHistory: [], pendingLikes: {}, pendingUnlikes: {} };
const Context = createContext<CraveContextValue | null>(null);
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const decay = (timestamp: number, halfLifeDays = 60) => Math.exp(-Math.log(2) * Math.max(0, Date.now() - timestamp) / (halfLifeDays * 86400000));

function normalize(raw: (Partial<PersistedState> & { swipes?: SwipeRecord[] }) | null | undefined): PersistedState {
  if (!raw) return { ...initial };
  const legacySwipes = raw.swipes ?? [];
  return {
    ...initial,
    ...raw,
    pendingLikes: raw.pendingLikes ?? {},
    pendingUnlikes: raw.pendingUnlikes ?? {},
    swipeHistory: raw.swipeHistory ?? legacySwipes.map((swipe) => ({ ...swipe, id: swipe.id ?? `${swipe.at}-${swipe.dishId}` })),
  };
}

async function readState(key: string): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? normalize(JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

const hasContent = (snapshot: PersistedState) =>
  snapshot.swipeHistory.length > 0 || snapshot.preferenceHistory.length > 0 || snapshot.likedIds.length > 0 ||
  snapshot.moods.length > 0 || snapshot.cuisines.length > 0;

function clearPending(current: PersistedState, kind: 'like' | 'unlike', dishId: string, at: number): PersistedState {
  const field = kind === 'like' ? 'pendingLikes' : 'pendingUnlikes';
  if (current[field][dishId] !== at) return current;
  const next = { ...current[field] };
  delete next[dishId];
  return { ...current, [field]: next };
}

export function scoreDish(dish: Dish, moods: Mood[], cuisines: Cuisine[], currentSwipes: SwipeRecord[], swipeHistory: SwipeRecord[] = [], preferenceHistory: PreferenceSession[] = []) {
  let score = dish.moods.filter((mood) => moods.includes(mood)).length * 6;
  score += cuisines.includes(dish.cuisine) ? 4 : 0;

  for (const swipe of swipeHistory) {
    const source = dishes.find((item) => item.id === swipe.dishId);
    if (!source) continue;
    const recency = decay(swipe.at);
    const moodOverlap = dish.moods.filter((mood) => source.moods.includes(mood)).length;
    const cuisineMatch = dish.cuisine === source.cuisine ? 1 : 0;
    const exactMatch = dish.id === source.id ? 1 : 0;
    score += swipe.choice === 'like'
      ? recency * (moodOverlap * 0.9 + cuisineMatch * 1.1 + exactMatch * 1.5)
      : recency * -(moodOverlap * 0.35 + cuisineMatch * 0.45 + exactMatch * 1.2);
  }

  for (const preference of preferenceHistory) {
    const recency = decay(preference.createdAt, 90);
    score += recency * dish.moods.filter((mood) => preference.moods.includes(mood)).length * 0.3;
    score += recency * (preference.cuisines.includes(dish.cuisine) ? 0.4 : 0);
  }

  for (const swipe of currentSwipes) {
    const source = dishes.find((item) => item.id === swipe.dishId);
    if (!source || source.id === dish.id) continue;
    const overlap = dish.moods.filter((mood) => source.moods.includes(mood)).length;
    score += swipe.choice === 'like' ? overlap * 1.4 : -overlap * 0.55;
  }
  return score;
}

function buildTasteProfile(swipes: SwipeRecord[], preferences: PreferenceSession[]): TasteSignal[] {
  const signals = new Map<string, TasteSignal>();
  const add = (label: string, kind: TasteSignal['kind'], amount: number) => {
    const key = `${kind}:${label}`;
    const current = signals.get(key);
    signals.set(key, { label, kind, score: (current?.score ?? 0) + amount });
  };
  for (const swipe of swipes) {
    const dish = dishes.find((item) => item.id === swipe.dishId);
    if (!dish) continue;
    const value = decay(swipe.at) * (swipe.choice === 'like' ? 1 : -0.45);
    dish.moods.forEach((mood) => add(mood, 'mood', value));
    add(dish.cuisine, 'cuisine', value * 1.2);
  }
  for (const preference of preferences) {
    const value = decay(preference.createdAt, 90) * 0.35;
    preference.moods.forEach((mood) => add(mood, 'mood', value));
    preference.cuisines.forEach((cuisine) => add(cuisine, 'cuisine', value));
  }
  return [...signals.values()].filter((signal) => signal.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

function mergeSwipes(local: SwipeRecord[], cloud: SwipeRecord[]) {
  const merged = new Map<string, SwipeRecord>();
  [...cloud, ...local].forEach((swipe) => merged.set(swipe.id ?? `${swipe.at}-${swipe.dishId}`, swipe));
  return [...merged.values()].sort((a, b) => b.at - a.at).slice(0, 500);
}

// Fold two local snapshots together (used only for the one-time guest -> account
// migration). The account's own data always wins for scalar fields.
function mergeState(base: PersistedState, extra: PersistedState): PersistedState {
  const preferenceHistory = [...new Map([...extra.preferenceHistory, ...base.preferenceHistory].map((item) => [item.id, item])).values()]
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  return {
    hasOnboarded: base.hasOnboarded || extra.hasOnboarded,
    moods: base.moods.length ? base.moods : extra.moods,
    cuisines: base.cuisines.length ? base.cuisines : extra.cuisines,
    swipes: base.swipes.length ? base.swipes : extra.swipes,
    likedIds: Array.from(new Set([...base.likedIds, ...extra.likedIds])),
    preferenceHistory,
    swipeHistory: mergeSwipes(base.swipeHistory, extra.swipeHistory),
    pendingLikes: { ...extra.pendingLikes, ...base.pendingLikes },
    pendingUnlikes: { ...extra.pendingUnlikes, ...base.pendingUnlikes },
  };
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
        // so a dish removed offline stays removed instead of resurfacing.
        const likes = new Set(cloud.likedIds);
        pendingLikeIds.forEach((id) => likes.add(id));
        pendingUnlikeIds.forEach((id) => likes.delete(id));
        Object.keys(pendingLikes).forEach((id) => likes.add(id));
        Object.keys(pendingUnlikes).forEach((id) => likes.delete(id));
        return {
          ...current,
          preferenceHistory: [...new Map([...cloud.preferences, ...current.preferenceHistory].map((item) => [item.id, item])).values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100),
          swipeHistory: mergeSwipes(current.swipeHistory, cloud.swipes),
          likedIds: Array.from(likes),
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
    return {
      ...state, hydrated, cloudStatus: user ? cloudStatus : 'local', cloudError: user ? cloudError : null,
      likedDishes: state.likedIds.map((id) => dishes.find((dish) => dish.id === id)).filter((dish): dish is Dish => Boolean(dish)),
      recommendations: [...dishes].sort((a, b) => scoreDish(b, state.moods, state.cuisines, state.swipes, state.swipeHistory, state.preferenceHistory) - scoreDish(a, state.moods, state.cuisines, state.swipes, state.swipeHistory, state.preferenceHistory)),
      tasteProfile: buildTasteProfile(state.swipeHistory, state.preferenceHistory),
      completeOnboarding: async () => setState((current) => ({ ...current, hasOnboarded: true })),
      setPreferences: (moods, cuisines) => {
        const preference = { id: makeId('preference'), moods, cuisines, createdAt: Date.now() };
        setState((current) => ({ ...current, moods, cuisines, swipes: [], preferenceHistory: [preference, ...current.preferenceHistory].slice(0, 100) }));
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
