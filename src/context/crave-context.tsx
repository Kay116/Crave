import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { dishes } from '@/data/dishes';
import { loadCloudHistory, saveLike, savePreference, saveSwipe } from '@/services/cloud-history';
import { Cuisine, Dish, Mood, PreferenceSession, SwipeChoice, SwipeRecord, TasteSignal } from '@/types';

type PersistedState = {
  hasOnboarded: boolean; moods: Mood[]; cuisines: Cuisine[]; swipes: SwipeRecord[];
  likedIds: string[]; preferenceHistory: PreferenceSession[]; swipeHistory: SwipeRecord[];
};
type CloudStatus = 'local' | 'syncing' | 'synced' | 'error';
type CraveContextValue = PersistedState & {
  hydrated: boolean; likedDishes: Dish[]; recommendations: Dish[]; tasteProfile: TasteSignal[];
  cloudStatus: CloudStatus; cloudError: string | null;
  completeOnboarding: () => Promise<void>; setPreferences: (moods: Mood[], cuisines: Cuisine[]) => void;
  recordSwipe: (dishId: string, choice: SwipeChoice) => void; toggleLike: (dishId: string) => void;
  clearSession: () => void; resetAll: () => Promise<void>; syncCloud: () => Promise<void>;
};

const KEY = '@crave/v3';
const LEGACY_KEY = '@crave/v2';
const initial: PersistedState = { hasOnboarded: false, moods: [], cuisines: [], swipes: [], likedIds: [], preferenceHistory: [], swipeHistory: [] };
const Context = createContext<CraveContextValue | null>(null);
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const decay = (timestamp: number, halfLifeDays = 60) => Math.exp(-Math.log(2) * Math.max(0, Date.now() - timestamp) / (halfLifeDays * 86400000));

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

export function CraveProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [state, setState] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local');
  const [cloudError, setCloudError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(LEGACY_KEY)]).then(([current, legacy]) => {
      const raw = current ?? legacy;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const legacySwipes = parsed.swipes ?? [];
      setState({ ...initial, ...parsed, swipeHistory: parsed.swipeHistory ?? legacySwipes.map((swipe) => ({ ...swipe, id: swipe.id ?? `${swipe.at}-${swipe.dishId}` })) });
    }).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [hydrated, state]);

  const syncCloud = useCallback(async () => {
    if (!user || !hydrated) return;
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      const localSnapshot = state;
      const cloud = await loadCloudHistory(user.id);
      await Promise.all([
        ...localSnapshot.preferenceHistory.map((item) => savePreference(user.id, item)),
        ...localSnapshot.swipeHistory.map((item) => saveSwipe(user.id, item)),
        ...localSnapshot.likedIds.map((dishId) => saveLike(user.id, dishId, true)),
      ]);
      setState((current) => ({
        ...current,
        preferenceHistory: [...new Map([...cloud.preferences, ...current.preferenceHistory].map((item) => [item.id, item])).values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100),
        swipeHistory: mergeSwipes(current.swipeHistory, cloud.swipes),
        likedIds: Array.from(new Set([...cloud.likedIds, ...current.likedIds])),
      }));
      setCloudStatus('synced');
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Cloud sync failed.');
      setCloudStatus('error');
    }
  }, [user, hydrated, state]);

  // Account changes intentionally trigger a one-time remote synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (user && hydrated) syncCloud(); }, [user?.id, hydrated]);

  const value = useMemo<CraveContextValue>(() => ({
    ...state, hydrated, cloudStatus: user ? cloudStatus : 'local', cloudError: user ? cloudError : null,
    likedDishes: state.likedIds.map((id) => dishes.find((dish) => dish.id === id)).filter((dish): dish is Dish => Boolean(dish)),
    recommendations: [...dishes].sort((a, b) => scoreDish(b, state.moods, state.cuisines, state.swipes, state.swipeHistory, state.preferenceHistory) - scoreDish(a, state.moods, state.cuisines, state.swipes, state.swipeHistory, state.preferenceHistory)),
    tasteProfile: buildTasteProfile(state.swipeHistory, state.preferenceHistory),
    completeOnboarding: async () => setState((current) => ({ ...current, hasOnboarded: true })),
    setPreferences: (moods, cuisines) => {
      const preference = { id: makeId('preference'), moods, cuisines, createdAt: Date.now() };
      setState((current) => ({ ...current, moods, cuisines, swipes: [], preferenceHistory: [preference, ...current.preferenceHistory].slice(0, 100) }));
      if (user) savePreference(user.id, preference).catch(() => setCloudStatus('error'));
    },
    recordSwipe: (dishId, choice) => {
      const swipe = { id: makeId('swipe'), dishId, choice, at: Date.now() };
      setState((current) => ({ ...current, swipes: [...current.swipes.filter((item) => item.dishId !== dishId), swipe], swipeHistory: [swipe, ...current.swipeHistory].slice(0, 500), likedIds: choice === 'like' ? Array.from(new Set([...current.likedIds, dishId])) : current.likedIds }));
      if (user) Promise.all([saveSwipe(user.id, swipe), ...(choice === 'like' ? [saveLike(user.id, dishId, true)] : [])]).catch(() => setCloudStatus('error'));
    },
    toggleLike: (dishId) => {
      const liked = !state.likedIds.includes(dishId);
      setState((current) => ({ ...current, likedIds: liked ? [...current.likedIds, dishId] : current.likedIds.filter((id) => id !== dishId) }));
      if (user) saveLike(user.id, dishId, liked).catch(() => setCloudStatus('error'));
    },
    clearSession: () => setState((current) => ({ ...current, swipes: [] })),
    resetAll: async () => { setState(initial); await AsyncStorage.multiRemove([KEY, LEGACY_KEY]); },
    syncCloud,
  }), [state, hydrated, cloudStatus, cloudError, user, syncCloud]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCrave() {
  const value = useContext(Context);
  if (!value) throw new Error('useCrave must be used inside CraveProvider');
  return value;
}
