import assert from 'node:assert/strict';
import test from 'node:test';
import { dishes } from '@/data/dishes';
import { matchPercent, scoreGroup } from '@/services/group-score';
import { RoomSwipe } from '@/types';

const deck = dishes.slice(0, 4);
const [d0, d1, d2, d3] = deck;
const members = (ids: string[], completed = true) => ids.map((userId) => ({ userId, completed }));
const swipe = (userId: string, dishId: string, choice: 'like' | 'pass', at = 1): RoomSwipe => ({
  roomId: 'r', userId, dishId, choice, swipedAt: at,
});

test('unanimous like wins over a merely-popular dish', () => {
  const result = scoreGroup({
    deck,
    members: members(['a', 'b', 'c']),
    swipes: [
      swipe('a', d0.id, 'like'), swipe('b', d0.id, 'like'), swipe('c', d0.id, 'like'), // unanimous
      swipe('a', d1.id, 'like'), swipe('b', d1.id, 'like'), swipe('c', d1.id, 'pass'), // 2 of 3
    ],
  });
  assert.equal(result.best?.dish.id, d0.id);
  assert.equal(result.best?.unanimous, true);
  assert.equal(result.best?.likes, 3);
  assert.equal(matchPercent(result.best!), 100);
  assert.equal(result.everyoneFinished, true);
});

test('split vote picks the dish most people liked and explains it', () => {
  const result = scoreGroup({
    deck,
    members: members(['a', 'b', 'c', 'd']),
    swipes: [
      swipe('a', d1.id, 'like'), swipe('b', d1.id, 'like'), swipe('c', d1.id, 'like'), swipe('d', d1.id, 'pass'), // 3/4
      swipe('a', d2.id, 'like'), swipe('b', d2.id, 'like'), swipe('c', d2.id, 'pass'), swipe('d', d2.id, 'pass'), // 2/4
    ],
  });
  assert.equal(result.best?.dish.id, d1.id);
  assert.equal(result.best?.unanimous, false);
  assert.equal(result.best?.explanation, '3 of 4 friends liked this');
  assert.equal(matchPercent(result.best!), 75);
});

test('duplicate / re-cast swipes collapse to the latest choice', () => {
  const result = scoreGroup({
    deck,
    members: members(['a', 'b']),
    swipes: [
      swipe('a', d0.id, 'like', 1),
      swipe('a', d0.id, 'like', 2), // duplicate realtime event
      swipe('a', d0.id, 'pass', 3), // user changed their mind last
      swipe('b', d0.id, 'like', 1),
    ],
  });
  const match = [result.best, ...result.alternatives].find((m) => m?.dish.id === d0.id) ?? result.best;
  assert.equal(match?.likes, 1, 'only b still likes it');
  assert.equal(match?.passes, 1, 'a counts once, as a pass');
});

test('personal score only breaks ties, never overrides consensus', () => {
  const result = scoreGroup({
    deck,
    members: members(['a', 'b']),
    swipes: [
      swipe('a', d2.id, 'like'), swipe('b', d2.id, 'like'), // 2 likes
      swipe('a', d3.id, 'like'), swipe('b', d3.id, 'like'), // 2 likes -> tie
    ],
    personalScores: { [d3.id]: 100, [d2.id]: 1 },
  });
  assert.equal(result.best?.dish.id, d3.id, 'tie broken by higher personal score');
});

test('no likes anywhere yields no best match', () => {
  const result = scoreGroup({
    deck,
    members: members(['a'], false),
    swipes: [swipe('a', d0.id, 'pass')],
  });
  assert.equal(result.best, null);
  assert.equal(result.everyoneFinished, false);
  assert.equal(result.alternatives.length, 0);
});

test('partial completion still produces provisional results', () => {
  const result = scoreGroup({
    deck,
    members: [{ userId: 'a', completed: true }, { userId: 'b', completed: false }],
    swipes: [swipe('a', d0.id, 'like')],
  });
  assert.equal(result.everyoneFinished, false);
  assert.equal(result.finishedMembers, 1);
  assert.equal(result.best?.dish.id, d0.id);
  assert.equal(result.best?.explanation, '1 of 2 friends liked this');
});
