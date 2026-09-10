import { normalizeRoomCode } from '@/services/room-helpers';
import { supabase } from '@/services/supabase';
import { Cuisine, CravingRoom, Mood, RoomMember, RoomStatus, RoomSwipe, SwipeChoice } from '@/types';

export {
  everyoneFinished, isRoomExpired, isValidRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH, roomPhase,
} from '@/services/room-helpers';
export type { RoomPhase } from '@/services/room-helpers';

// --------------------------------------------------------------- row mappers
type RoomRow = {
  id: string; code: string; name: string; created_by: string; status: RoomStatus;
  dish_ids: string[] | null; selected_moods: string[] | null; selected_cuisines: string[] | null;
  created_at: string; expires_at: string | null;
};
type MemberRow = { room_id: string; user_id: string; display_name: string; joined_at: string; completed_at: string | null };
type SwipeRow = { room_id: string; user_id: string; dish_id: string; choice: SwipeChoice; swiped_at: string };

const toRoom = (row: RoomRow): CravingRoom => ({
  id: row.id,
  code: row.code,
  name: row.name,
  createdBy: row.created_by,
  status: row.status,
  dishIds: row.dish_ids ?? [],
  selectedMoods: (row.selected_moods ?? []) as Mood[],
  selectedCuisines: (row.selected_cuisines ?? []) as Cuisine[],
  createdAt: new Date(row.created_at).getTime(),
  expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
});

const toMember = (row: MemberRow): RoomMember => ({
  roomId: row.room_id,
  userId: row.user_id,
  displayName: row.display_name,
  joinedAt: new Date(row.joined_at).getTime(),
  completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
});

const toSwipe = (row: SwipeRow): RoomSwipe => ({
  roomId: row.room_id,
  userId: row.user_id,
  dishId: row.dish_id,
  choice: row.choice,
  swipedAt: new Date(row.swiped_at).getTime(),
});

export type RoomResultTally = { dishId: string; likes: number; passes: number; voters: number };

export class RoomsUnavailableError extends Error {}
const requireClient = () => {
  if (!supabase) throw new RoomsUnavailableError('Sign in and connect Supabase to use shared rooms.');
  return supabase;
};

const SETUP_HINT =
  'Shared rooms aren’t set up on this Supabase project yet. Run supabase/migrations/0001_v4_craving_rooms.sql in the SQL Editor, then reload the API schema (Dashboard → Settings → API → "Reload schema", or run  notify pgrst, \'reload schema\';  ).';

// Turn a "the room objects don't exist / schema cache is stale" Postgres/PostgREST
// error into an actionable message; pass everything else straight through.
function roomError(error: { message?: string; code?: string; hint?: string | null } | null): Error {
  const message = error?.message ?? 'Room request failed.';
  const code = error?.code ?? '';
  if (
    code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01' ||
    /schema cache|Could not find the (function|table)|relation .* does not exist|function .* does not exist/i.test(message)
  ) {
    return new Error(SETUP_HINT);
  }
  return new Error(message);
}

// ------------------------------------------------------------------- queries
export async function createRoom(params: {
  name: string; dishIds: string[]; moods: Mood[]; cuisines: Cuisine[]; displayName: string; expires: boolean;
}): Promise<CravingRoom> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_craving_room', {
    p_name: params.name,
    p_dish_ids: params.dishIds,
    p_moods: params.moods,
    p_cuisines: params.cuisines,
    p_display_name: params.displayName,
    p_expires: params.expires,
  });
  if (error) throw roomError(error);
  return toRoom(data as RoomRow);
}

export async function joinRoom(code: string, displayName: string): Promise<CravingRoom> {
  const client = requireClient();
  const { data, error } = await client.rpc('join_craving_room', {
    p_code: normalizeRoomCode(code),
    p_display_name: displayName,
  });
  if (error) throw roomError(error);
  return toRoom(data as RoomRow);
}

export async function fetchRoomByCode(code: string): Promise<CravingRoom | null> {
  const client = requireClient();
  const { data, error } = await client.from('craving_rooms').select('*').eq('code', normalizeRoomCode(code)).maybeSingle();
  if (error) throw roomError(error);
  return data ? toRoom(data as RoomRow) : null;
}

export async function fetchMembers(roomId: string): Promise<RoomMember[]> {
  const client = requireClient();
  const { data, error } = await client.from('room_members').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
  if (error) throw roomError(error);
  return (data as MemberRow[] | null ?? []).map(toMember);
}

export async function fetchMySwipes(roomId: string): Promise<RoomSwipe[]> {
  const client = requireClient();
  const { data, error } = await client.from('room_swipes').select('*').eq('room_id', roomId);
  if (error) throw roomError(error);
  return (data as SwipeRow[] | null ?? []).map(toSwipe);
}

export async function fetchRoomResults(roomId: string): Promise<RoomResultTally[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('room_results', { p_room_id: roomId });
  if (error) throw roomError(error);
  return (data as { dish_id: string; likes: number; passes: number; voters: number }[] | null ?? []).map((row) => ({
    dishId: row.dish_id, likes: row.likes, passes: row.passes, voters: row.voters,
  }));
}

export async function submitRoomSwipe(roomId: string, userId: string, dishId: string, choice: SwipeChoice): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('room_swipes').upsert(
    { room_id: roomId, user_id: userId, dish_id: dishId, choice, swiped_at: new Date().toISOString() },
    { onConflict: 'room_id,user_id,dish_id' },
  );
  if (error) throw roomError(error);
}

export async function markMemberComplete(roomId: string, userId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('room_members').update({ completed_at: new Date().toISOString() })
    .eq('room_id', roomId).eq('user_id', userId).is('completed_at', null);
  if (error) throw roomError(error);
}

export async function setRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('craving_rooms').update({ status }).eq('id', roomId);
  if (error) throw roomError(error);
}

// ------------------------------------------------------------------ realtime
export type RoomChannelHandlers = {
  onRoom?: () => void;
  onMembers?: () => void;
  onSwipes?: () => void;
  onStatus?: (state: 'connected' | 'error' | 'closed') => void;
};

// Callers should re-fetch on every callback rather than trust payloads, which
// makes duplicate events and reconnects harmless.
export function subscribeToRoom(roomId: string, handlers: RoomChannelHandlers): () => void {
  if (!supabase) return () => {};
  const filter = `room_id=eq.${roomId}`;
  const channel = supabase
    .channel(`crave-room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'craving_rooms', filter: `id=eq.${roomId}` }, () => handlers.onRoom?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter }, () => handlers.onMembers?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_swipes', filter }, () => handlers.onSwipes?.())
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onStatus?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onStatus?.('error');
      else if (status === 'CLOSED') handlers.onStatus?.('closed');
    });
  return () => { supabase?.removeChannel(channel); };
}
