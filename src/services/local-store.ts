// Pure helpers for the per-account local store. No React / RN / async imports so
// the account-isolation and guest-migration logic can be unit-tested directly.
import { normalizeFilters } from '@/services/recommendation';
import { Cuisine, Filters, Mood, PreferenceSession, SwipeRecord } from '@/types';

export type PersistedState = {
  hasOnboarded: boolean;
  moods: Mood[];
  cuisines: Cuisine[];
  swipes: SwipeRecord[];
  likedIds: string[];
  preferenceHistory: PreferenceSession[];
  swipeHistory: SwipeRecord[];
  pendingLikes: Record<string, number>;
  pendingUnlikes: Record<string, number>;
  filters: Filters;
};

export const INITIAL_STATE: PersistedState = {
  hasOnboarded: false, moods: [], cuisines: [], swipes: [], likedIds: [],
  preferenceHistory: [], swipeHistory: [], pendingLikes: {}, pendingUnlikes: {},
  filters: normalizeFilters(),
};

// Account-isolated keys: guest activity and every signed-in user get their own
// slot so one account's data can never be written into another on a device.
export const GUEST_KEY = '@crave/v3/guest';
export const userStoreKey = (id: string) => `@crave/v3/user/${id}`;
export const LEGACY_V3_KEY = '@crave/v3';
export const LEGACY_V2_KEY = '@crave/v2';
export const GUEST_CLAIMED_KEY = '@crave/v3/guest-claimed';

export function normalizeState(raw: (Partial<PersistedState> & { swipes?: SwipeRecord[] }) | null | undefined): PersistedState {
  if (!raw) return { ...INITIAL_STATE, filters: normalizeFilters() };
  const legacySwipes = raw.swipes ?? [];
  return {
    ...INITIAL_STATE,
    ...raw,
    pendingLikes: raw.pendingLikes ?? {},
    pendingUnlikes: raw.pendingUnlikes ?? {},
    filters: normalizeFilters(raw.filters),
    swipeHistory: raw.swipeHistory ?? legacySwipes.map((swipe) => ({ ...swipe, id: swipe.id ?? `${swipe.at}-${swipe.dishId}` })),
  };
}

export function hasContent(snapshot: PersistedState): boolean {
  return snapshot.swipeHistory.length > 0 || snapshot.preferenceHistory.length > 0 || snapshot.likedIds.length > 0 ||
    snapshot.moods.length > 0 || snapshot.cuisines.length > 0;
}

export function mergeSwipes(local: SwipeRecord[], cloud: SwipeRecord[]): SwipeRecord[] {
  const merged = new Map<string, SwipeRecord>();
  [...cloud, ...local].forEach((swipe) => merged.set(swipe.id ?? `${swipe.at}-${swipe.dishId}`, swipe));
  return [...merged.values()].sort((a, b) => b.at - a.at).slice(0, 500);
}

// Fold two local snapshots together (used only for the one-time guest -> account
// migration). The account's own data wins for scalar fields.
export function mergeState(base: PersistedState, extra: PersistedState): PersistedState {
  const preferenceHistory = [...new Map([...extra.preferenceHistory, ...base.preferenceHistory].map((item) => [item.id, item])).values()]
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  const baseHasFilters = base.moods.length > 0 || base.cuisines.length > 0;
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
    filters: baseHasFilters ? base.filters : extra.filters,
  };
}

export function clearPending(current: PersistedState, kind: 'like' | 'unlike', dishId: string, at: number): PersistedState {
  const field = kind === 'like' ? 'pendingLikes' : 'pendingUnlikes';
  if (current[field][dishId] !== at) return current;
  const next = { ...current[field] };
  delete next[dishId];
  return { ...current, [field]: next };
}

// The cloud liked list is authoritative once pending local ops are applied, so a
// dish removed offline never resurfaces via a blind union.
export function reconcileLikes(
  cloudLikedIds: string[],
  pendingLikes: Record<string, number>,
  pendingUnlikes: Record<string, number>,
): string[] {
  const set = new Set(cloudLikedIds);
  Object.keys(pendingLikes).forEach((id) => set.add(id));
  Object.keys(pendingUnlikes).forEach((id) => set.delete(id));
  return [...set];
}
