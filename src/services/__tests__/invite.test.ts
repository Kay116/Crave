import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRoomInviteMessage, normalizePublicUrl, roomInviteUrl } from '@/services/invite';

test('normalizePublicUrl accepts only public https origins', () => {
  assert.equal(normalizePublicUrl('https://crave.example.com/'), 'https://crave.example.com');
  assert.equal(normalizePublicUrl('http://crave.example.com'), null, 'http is rejected');
  assert.equal(normalizePublicUrl('https://localhost:8081'), null, 'localhost is rejected');
  assert.equal(normalizePublicUrl('https://127.0.0.1:19006'), null);
  assert.equal(normalizePublicUrl('https://192.168.1.5:8081'), null, 'LAN address is rejected');
  assert.equal(normalizePublicUrl(''), null);
  assert.equal(normalizePublicUrl(undefined), null);
});

test('roomInviteUrl returns a link only for a configured public URL', () => {
  assert.equal(roomInviteUrl('ABC234', 'https://crave.example.com'), 'https://crave.example.com/room/ABC234');
  assert.equal(roomInviteUrl('ABC234', 'http://localhost:8081'), null);
  assert.equal(roomInviteUrl('ABC234', ''), null);
});

test('invite message always carries the code, and a link only when it is real', () => {
  const withUrl = buildRoomInviteMessage('Taco Tuesday', 'ABC234', 'https://crave.example.com');
  assert.ok(withUrl.includes('ABC234'));
  assert.ok(withUrl.includes('https://crave.example.com/room/ABC234'));
  assert.ok(withUrl.includes('Taco Tuesday'));

  const noUrl = buildRoomInviteMessage('Taco Tuesday', 'ABC234', 'http://localhost:8081');
  assert.ok(noUrl.includes('ABC234'));
  assert.ok(!/localhost/.test(noUrl), 'never leaks a broken localhost link');
  assert.ok(!/https?:\/\//.test(noUrl), 'no URL at all when none is configured');
  assert.ok(/enter the code ABC234/i.test(noUrl), 'explains the manual fallback');
});
