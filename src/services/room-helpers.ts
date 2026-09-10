// Pure room helpers (no Supabase / RN imports) so room-code and expiry logic can
// be unit-tested directly.
import { CravingRoom, RoomMember, RoomStatus } from '@/types';

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(input: string): string {
  return (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(input: string): boolean {
  const code = normalizeRoomCode(input);
  return code.length === ROOM_CODE_LENGTH && [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}

export function isRoomExpired(
  room: Pick<CravingRoom, 'expiresAt'>,
  now: number = Date.now(),
): boolean {
  return room.expiresAt != null && room.expiresAt <= now;
}

export type RoomPhase = RoomStatus | 'expired';

export function roomPhase(
  room: Pick<CravingRoom, 'status' | 'expiresAt'>,
  members: Pick<RoomMember, 'completedAt'>[],
  now: number = Date.now(),
): RoomPhase {
  if (room.status === 'closed') return 'closed';
  if (isRoomExpired(room, now)) return 'expired';
  if (room.status === 'completed') return 'completed';
  if (members.length > 0 && members.every((m) => m.completedAt != null)) return 'completed';
  if (members.some((m) => m.completedAt == null) && members.length > 1) return 'swiping';
  return room.status;
}

export function everyoneFinished(members: Pick<RoomMember, 'completedAt'>[]): boolean {
  return members.length > 0 && members.every((m) => m.completedAt != null);
}
