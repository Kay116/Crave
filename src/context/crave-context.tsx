import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { dishes } from '@/data/dishes';
import { Cuisine, Dish, Mood, SwipeChoice, SwipeRecord } from '@/types';

type PersistedState = { hasOnboarded: boolean; moods: Mood[]; cuisines: Cuisine[]; swipes: SwipeRecord[]; likedIds: string[] };
type CraveContextValue = PersistedState & {
  hydrated: boolean; likedDishes: Dish[]; recommendations: Dish[];
  completeOnboarding: () => Promise<void>; setPreferences: (moods: Mood[], cuisines: Cuisine[]) => void;
  recordSwipe: (dishId: string, choice: SwipeChoice) => void; toggleLike: (dishId: string) => void;
  clearSession: () => void; resetAll: () => Promise<void>;
};
const KEY = '@crave/v2';
const LEGACY_KEY = '@crave/v1';
const initial: PersistedState = { hasOnboarded: false, moods: [], cuisines: [], swipes: [], likedIds: [] };
const Context = createContext<CraveContextValue | null>(null);

export function scoreDish(dish: Dish, moods: Mood[], cuisines: Cuisine[], swipes: SwipeRecord[]) {
  const moodScore = dish.moods.filter((m) => moods.includes(m)).length * 4;
  const cuisineScore = cuisines.includes(dish.cuisine) ? 3 : 0;
  const liked = swipes.filter((s) => s.choice === 'like').map((s) => dishes.find((d) => d.id === s.dishId)).filter((d): d is Dish => Boolean(d));
  const learnedMoodScore = dish.moods.reduce((sum, mood) => sum + liked.filter((d) => d.moods.includes(mood)).length, 0);
  const learnedCuisineScore = liked.filter((d) => d.cuisine === dish.cuisine).length * 1.5;
  return moodScore + cuisineScore + learnedMoodScore + learnedCuisineScore;
}

export function CraveProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(LEGACY_KEY)]).then(([current, legacy]) => { const raw = current ?? legacy; if (raw) setState({ ...initial, ...JSON.parse(raw) }); }).catch(() => {}).finally(() => setHydrated(true)); }, []);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [hydrated, state]);
  const update = (patch: Partial<PersistedState>) => setState((current) => ({ ...current, ...patch }));
  const value = useMemo<CraveContextValue>(() => ({
    ...state, hydrated,
    likedDishes: state.likedIds.map((id) => dishes.find((dish) => dish.id === id)).filter((dish): dish is Dish => Boolean(dish)),
    recommendations: [...dishes].sort((a, b) => scoreDish(b, state.moods, state.cuisines, state.swipes) - scoreDish(a, state.moods, state.cuisines, state.swipes)),
    completeOnboarding: async () => update({ hasOnboarded: true }),
    setPreferences: (moods, cuisines) => update({ moods, cuisines, swipes: [] }),
    recordSwipe: (dishId, choice) => setState((current) => ({ ...current, swipes: [...current.swipes.filter((s) => s.dishId !== dishId), { dishId, choice, at: Date.now() }], likedIds: choice === 'like' ? Array.from(new Set([...current.likedIds, dishId])) : current.likedIds })),
    toggleLike: (dishId) => setState((current) => ({ ...current, likedIds: current.likedIds.includes(dishId) ? current.likedIds.filter((id) => id !== dishId) : [...current.likedIds, dishId] })),
    clearSession: () => update({ swipes: [] }),
    resetAll: async () => { setState(initial); await AsyncStorage.removeItem(KEY); },
  }), [state, hydrated]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCrave() { const value = useContext(Context); if (!value) throw new Error('useCrave must be used inside CraveProvider'); return value; }
