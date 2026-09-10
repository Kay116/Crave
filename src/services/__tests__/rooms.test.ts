import assert from 'node:assert/strict';
import test from 'node:test';
import { isRoomExpired, isValidRoomCode, normalizeRoomCode, roomPhase } from '@/services/room-helpers';

test('room codes normalise to the safe uppercase alphabet', () => {
  assert.equal(normalizeRoomCode(' ab2-3d9 '), 'AB23D9');
  assert.equal(normalizeRoomCode('abcdefghijk'), 'ABCDEF');
  assert.equal(isValidRoomCode('ABC234'), true);
  assert.equal(isValidRoomCode('ABC23'), false, 'too short');
  assert.equal(isValidRoomCode('ABC2I0'), false, 'contains ambiguous I / 0');
});

test('isRoomExpired only fires once the expiry timestamp has passed', () => {
  const now = 1_000_000;
  assert.equal(isRoomExpired({ expiresAt: null }, now), false);
  assert.equal(isRoomExpired({ expiresAt: now + 1 }, now), false);
  assert.equal(isRoomExpired({ expiresAt: now - 1 }, now), true);
  assert.equal(isRoomExpired({ expiresAt: now }, now), true);
});

test('roomPhase reflects expiry, closure and completion', () => {
  const now = 5_000;
  assert.equal(roomPhase({ status: 'swiping', expiresAt: now - 1 }, [], now), 'expired');
  assert.equal(roomPhase({ status: 'closed', expiresAt: null }, [], now), 'closed');
  assert.equal(
    roomPhase({ status: 'swiping', expiresAt: null }, [{ completedAt: 1 }, { completedAt: 2 }], now),
    'completed',
    'all members finished',
  );
  assert.equal(
    roomPhase({ status: 'swiping', expiresAt: null }, [{ completedAt: null }, { completedAt: 1 }], now),
    'swiping',
    'someone is still swiping',
  );
  assert.equal(roomPhase({ status: 'waiting', expiresAt: null }, [{ completedAt: null }], now), 'waiting');
});
