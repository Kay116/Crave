// Pure personal-recommendation scoring and deck selection. No React / RN / async
// imports so this module can be unit-tested directly with `tsx`.
import { dishById, dishes as allDishes } from '@/data/dishes';
import { Cuisine, Dish, Filters, Mood, PreferenceSession, SwipeRecord, TasteSignal } from '@/types';

export const decay = (timestamp: number, halfLifeDays = 60) =>
  Math.exp(-Math.log(2) * Math.max(0, Date.now() - timestamp) / (halfLifeDays * 86400000));

// Current-session swipes count for more than decayed history.
const SESSION_WEIGHT = 1.6;

export type ScoreContext = {
  currentSwipes?: SwipeRecord[];
  swipeHistory?: SwipeRecord[];
  preferenceHistory?: PreferenceSession[];
  filters?: Partial<Filters>;
};

function overlapCount(a: readonly string[], b: readonly string[]) {
  return a.filter((value) => b.includes(value)).length;
}

// Back-compatible signature kept for existing callers (results screen, tests).
// The optional `filters` argument layers in the Version 4 discovery attributes.
export function scoreDish(
  dish: Dish,
  moods: Mood[],
  cuisines: Cuisine[],
  currentSwipes: SwipeRecord[],
  swipeHistory: SwipeRecord[] = [],
  preferenceHistory: PreferenceSession[] = [],
  filters?: Partial<Filters>,
) {
  let score = overlapCount(dish.moods, moods) * 6;
  score += cuisines.includes(dish.cuisine) ? 4 : 0;

  if (filters) {
    score += overlapCount(dish.textures, filters.textures ?? []) * 2;
    score += overlapCount(dish.mealTypes, filters.mealTypes ?? []) * 2;
    score += overlapCount(dish.proteins, filters.proteins ?? []) * 1.5;
    score += overlapCount(dish.dietaryTags, filters.dietary ?? []) * 1.2;
    if (filters.maxSpice != null) score += dish.spiceLevel <= filters.maxSpice ? 1.5 : -2;
    if (filters.maxPrice != null) score += dish.price <= filters.maxPrice ? 1 : -2;
    if (filters.temperature === 'hot') score += dish.moods.some((m) => m === 'soupy' || m === 'comfort' || m === 'smoky') ? 1.4 : 0;
    if (filters.temperature === 'cold') score += dish.moods.includes('fresh') ? 1.6 : -0.6;
    if (filters.fullness === 'light') score += dish.moods.includes('fresh') || dish.price === 1 ? 1.2 : -0.5;
    if (filters.fullness === 'filling') score += dish.moods.includes('comfort') || dish.moods.includes('cheesy') ? 1.2 : 0;
  }

  for (const swipe of swipeHistory) {
    const source = dishById.get(swipe.dishId);
    if (!source) continue;
    const recency = decay(swipe.at);
    const moodOverlap = overlapCount(dish.moods, source.moods);
    const cuisineMatch = dish.cuisine === source.cuisine ? 1 : 0;
    const exactMatch = dish.id === source.id ? 1 : 0;
    score += swipe.choice === 'like'
      ? recency * (moodOverlap * 0.9 + cuisineMatch * 1.1 + exactMatch * 1.5)
      : recency * -(moodOverlap * 0.35 + cuisineMatch * 0.45 + exactMatch * 1.2);
  }

  for (const preference of preferenceHistory) {
    const recency = decay(preference.createdAt, 90);
    score += recency * overlapCount(dish.moods, preference.moods) * 0.3;
    score += recency * (preference.cuisines.includes(dish.cuisine) ? 0.4 : 0);
  }

  for (const swipe of currentSwipes) {
    const source = dishById.get(swipe.dishId);
    if (!source || source.id === dish.id) continue;
    const overlap = overlapCount(dish.moods, source.moods);
    score += (swipe.choice === 'like' ? overlap * 1.4 : -overlap * 0.55) * SESSION_WEIGHT;
  }
  return score;
}

export function scoreWith(dish: Dish, moods: Mood[], cuisines: Cuisine[], ctx: ScoreContext) {
  return scoreDish(dish, moods, cuisines, ctx.currentSwipes ?? [], ctx.swipeHistory ?? [], ctx.preferenceHistory ?? [], ctx.filters);
}

export function buildTasteProfile(swipes: SwipeRecord[], preferences: PreferenceSession[]): TasteSignal[] {
  const signals = new Map<string, TasteSignal>();
  const add = (label: string, kind: TasteSignal['kind'], amount: number) => {
    const key = `${kind}:${label}`;
    const current = signals.get(key);
    signals.set(key, { label, kind, score: (current?.score ?? 0) + amount });
  };
  for (const swipe of swipes) {
    const dish = dishById.get(swipe.dishId);
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

// ---------------------------------------------------------------------------
// Filtered deck selection with graceful fallback.
// ---------------------------------------------------------------------------
const emptyFilters: Filters = {
  moods: [], cuisines: [], textures: [], mealTypes: [], proteins: [], dietary: [],
  maxSpice: null, maxPrice: null, temperature: null, fullness: null,
};

export function normalizeFilters(partial?: Partial<Filters> | null): Filters {
  return { ...emptyFilters, ...(partial ?? {}) };
}

// Predicates in priority order. Lower in the list is relaxed first when the
// deck would otherwise be too small. `dietary` is never auto-relaxed.
const RELAXABLE: { key: keyof Filters; label: string; test: (d: Dish, f: Filters) => boolean }[] = [
  { key: 'textures', label: 'texture', test: (d, f) => !f.textures.length || d.textures.some((t) => f.textures.includes(t as never)) },
  { key: 'fullness', label: 'light vs filling', test: (d, f) => !f.fullness || (f.fullness === 'light' ? d.price <= 2 : true) },
  { key: 'temperature', label: 'hot vs cold', test: (d, f) => !f.temperature || (f.temperature === 'cold' ? d.moods.includes('fresh') : !d.moods.includes('fresh') || d.moods.length > 1) },
  { key: 'maxSpice', label: 'spice level', test: (d, f) => f.maxSpice == null || d.spiceLevel <= f.maxSpice },
  { key: 'maxPrice', label: 'price', test: (d, f) => f.maxPrice == null || d.price <= f.maxPrice },
  { key: 'mealTypes', label: 'meal type', test: (d, f) => !f.mealTypes.length || d.mealTypes.some((m) => f.mealTypes.includes(m as never)) },
  { key: 'proteins', label: 'protein', test: (d, f) => !f.proteins.length || d.proteins.some((p) => f.proteins.includes(p as never)) },
  { key: 'cuisines', label: 'cuisine', test: (d, f) => !f.cuisines.length || f.cuisines.includes(d.cuisine) },
];

const dietaryOk = (d: Dish, f: Filters) => !f.dietary.length || f.dietary.every((tag) => d.dietaryTags.includes(tag as never));

export type DeckSelection = { deck: Dish[]; relaxed: string[]; usedFallback: boolean };

export function selectDeck(
  filters: Partial<Filters> | null,
  ctx: ScoreContext,
  options: { minCount?: number; pool?: Dish[] } = {},
): DeckSelection {
  const f = normalizeFilters(filters);
  const pool = options.pool ?? allDishes;
  const minCount = options.minCount ?? 8;
  const active = RELAXABLE.filter(({ key }) => {
    const value = f[key];
    return Array.isArray(value) ? value.length > 0 : value != null;
  });

  const dietaryPool = pool.filter((d) => dietaryOk(d, f));
  let dropped = 0;
  let matched = dietaryPool.filter((d) => active.every(({ test }) => test(d, f)));
  const relaxed: string[] = [];
  while (matched.length < minCount && dropped < active.length) {
    dropped += 1;
    const keep = active.slice(0, active.length - dropped);
    relaxed.unshift(active[active.length - dropped].label);
    matched = dietaryPool.filter((d) => keep.every(({ test }) => test(d, f)));
  }

  let usedFallback = false;
  if (matched.length < Math.min(minCount, 3)) {
    matched = dietaryPool.length ? dietaryPool : pool.slice();
    usedFallback = true;
  }

  const sorted = matched
    .map((dish) => ({ dish, score: scoreWith(dish, f.moods, f.cuisines, { ...ctx, filters: f }) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.dish);

  return { deck: sorted, relaxed, usedFallback };
}
