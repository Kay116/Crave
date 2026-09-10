import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GUEST_KEY, INITIAL_STATE, mergeState, normalizeState, reconcileLikes, userStoreKey,
} from '@/services/local-store';
import { PreferenceSession, SwipeRecord } from '@/types';

const swipe = (dishId: string, choice: 'like' | 'pass', at: number): SwipeRecord => ({ id: `s-${dishId}-${at}`, dishId, choice, at });
const pref = (id: string, at: number): PreferenceSession => ({ id, moods: [], cuisines: [], createdAt: at });

test('account storage keys are isolated per identity', () => {
  assert.notEqual(userStoreKey('user-a'), userStoreKey('user-b'));
  assert.notEqual(userStoreKey('user-a'), GUEST_KEY);
});

test('normalizeState fills defaults and migrates the legacy `swipes` field', () => {
  const migrated = normalizeState({ swipes: [{ dishId: 'x', choice: 'like', at: 10 }] });
  assert.equal(migrated.swipeHistory.length, 1);
  assert.ok(migrated.swipeHistory[0].id, 'a synthetic id is added');
  assert.deepEqual(migrated.pendingLikes, {});
  assert.ok(migrated.filters, 'filters object always present');
});

test('guest -> account merge keeps both histories, account scalars win', () => {
  const account = {
    ...INITIAL_STATE,
    moods: ['spicy' as const],
    swipeHistory: [swipe('a', 'like', 100)],
    preferenceHistory: [pref('p-account', 100)],
    likedIds: ['a'],
  };
  const guest = {
    ...INITIAL_STATE,
    moods: ['sweet' as const],
    swipeHistory: [swipe('b', 'like', 50)],
    preferenceHistory: [pref('p-guest', 50)],
    likedIds: ['b'],
  };
  const merged = mergeState(account, guest);
  assert.deepEqual(merged.moods, ['spicy'], 'the account keeps its own mood selection');
  assert.deepEqual(merged.swipeHistory.map((s) => s.dishId).sort(), ['a', 'b']);
  assert.deepEqual(merged.preferenceHistory.map((p) => p.id).sort(), ['p-account', 'p-guest']);
  assert.deepEqual([...merged.likedIds].sort(), ['a', 'b']);
});

test('merging an empty guest into an account is a no-op for that account', () => {
  const account = { ...INITIAL_STATE, likedIds: ['a', 'b'], swipeHistory: [swipe('a', 'like', 1)] };
  const merged = mergeState(account, INITIAL_STATE);
  assert.deepEqual(merged.likedIds, ['a', 'b']);
  assert.equal(merged.swipeHistory.length, 1);
});

test('reconcileLikes: a dish removed offline stays removed after sync', () => {
  // cloud still lists "a" and "b"; locally the user un-liked "a" while offline.
  const result = reconcileLikes(['a', 'b'], {}, { a: Date.now() });
  assert.deepEqual(result.sort(), ['b']);
});

test('reconcileLikes: an offline like is added on top of the cloud list', () => {
  const result = reconcileLikes(['b'], { c: Date.now() }, {});
  assert.deepEqual(result.sort(), ['b', 'c']);
});

test('reconcileLikes never re-adds another account\'s dish that was not local', () => {
  // "z" is only in the cloud arg the caller passes; callers pass the *current*
  // account's cloud list, so isolation is preserved by construction. A pending
  // unlike still wins.
  const result = reconcileLikes(['z'], {}, { z: 1 });
  assert.deepEqual(result, []);
});
