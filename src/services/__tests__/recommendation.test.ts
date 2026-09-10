import assert from 'node:assert/strict';
import test from 'node:test';
import { dishes } from '@/data/dishes';
import { normalizeFilters, scoreDish, selectDeck } from '@/services/recommendation';
import { Dish } from '@/types';

const byId = (id: string) => dishes.find((d) => d.id === id) as Dish;

test('personal scoring rewards matching moods and cuisines', () => {
  const pizza = byId('hot-honey-pizza'); // spicy, cheesy, comfort / Italian
  const withMatch = scoreDish(pizza, ['spicy', 'cheesy'], ['Italian'], []);
  const withoutMatch = scoreDish(pizza, ['fresh'], ['Japanese'], []);
  assert.ok(withMatch > withoutMatch, 'mood + cuisine match should score higher');
});

test('current-session swipes outweigh equivalent old history', () => {
  const target = byId('truffle-tagliatelle'); // cheesy, comfort / Italian
  const neighbour = byId('cacio-e-pepe').id;   // also cheesy, comfort / Italian
  const old = Date.now() - 45 * 86400000;

  const sessionLike = scoreDish(target, [], [], [{ dishId: neighbour, choice: 'like', at: Date.now() }]);
  const historyLike = scoreDish(target, [], [], [], [{ dishId: neighbour, choice: 'like', at: old }]);
  assert.ok(sessionLike > historyLike, 'a fresh session like should move the needle more than a 45-day-old one');
});

test('filters add weight for texture / meal-type / protein matches', () => {
  const katsu = byId('chicken-katsu-curry'); // crunchy,tender / lunch,dinner / chicken
  const base = scoreDish(katsu, [], [], []);
  const boosted = scoreDish(katsu, [], [], [], [], [], normalizeFilters({
    textures: ['crunchy'], mealTypes: ['lunch'], proteins: ['chicken'],
  }));
  assert.ok(boosted > base);
});

test('selectDeck returns a non-empty, ranked deck for reasonable filters', () => {
  const { deck, relaxed, usedFallback } = selectDeck({ cuisines: ['Italian', 'Japanese'] }, {});
  assert.ok(deck.length >= 8);
  assert.equal(relaxed.length, 0);
  assert.equal(usedFallback, false);
  assert.ok(deck.every((d) => d.cuisine === 'Italian' || d.cuisine === 'Japanese'));
});

test('overly strict filters relax lower-priority ones instead of returning nothing', () => {
  const { deck, relaxed } = selectDeck(
    { cuisines: ['Thai'], proteins: ['tofu'], maxSpice: 0, maxPrice: 1, textures: ['flaky'] },
    {},
    { minCount: 6 },
  );
  assert.ok(deck.length >= 6, 'still surfaces a full-ish deck');
  assert.ok(relaxed.length > 0, 'reports which filters were relaxed');
  // texture is the lowest priority, so it must be among the first relaxed.
  assert.ok(relaxed.includes('texture'));
});

test('dietary filter is respected and never silently dropped', () => {
  const { deck } = selectDeck({ dietary: ['vegan'] }, {}, { minCount: 8 });
  assert.ok(deck.length >= 1);
  assert.ok(deck.every((d) => d.dietaryTags.includes('vegan')), 'every dish honours the vegan tag');
});

test('empty filters ("Surprise me") return the whole catalogue', () => {
  const { deck, relaxed, usedFallback } = selectDeck(null, {});
  assert.equal(deck.length, dishes.length);
  assert.equal(relaxed.length, 0);
  assert.equal(usedFallback, false);
});
