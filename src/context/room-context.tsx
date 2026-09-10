import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { dishById } from '@/data/dishes';
import { addRecentRoom } from '@/services/recent-rooms';
import {
  fetchMembers, fetchMySwipes, fetchRoomByCode, fetchRoomResults, joinRoom,
  markMemberComplete, normalizeRoomCode, roomPhase, setRoomStatus, submitRoomSwipe, subscribeToRoom,
} from '@/services/rooms';
import type { RoomPhase, RoomResultTally } from '@/services/rooms';
import { CravingRoom, Dish, RoomMember, RoomSwipe, SwipeChoice } from '@/types';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'error';
export type RoomScreenState =
  | 'loading' | 'no-access' | 'not-found' | 'ready';

type RoomContextValue = {
  screenState: RoomScreenState;
  connection: ConnectionState;
  error: string | null;
  room: CravingRoom | null;
  members: RoomMember[];
  deck: Dish[];
  mySwipes: RoomSwipe[];
  results: RoomResultTally[];
  phase: RoomPhase;
  isCreator: boolean;
  myUserId: string | null;
  myCompleted: boolean;
  refresh: () => Promise<void>;
  submitSwipe: (dishId: string, choice: SwipeChoice) => Promise<void>;
  finishSwiping: () => Promise<void>;
  startSwiping: () => Promise<void>;
  closeRoom: () => Promise<void>;
};

const Context = createContext<RoomContextValue | null>(null);

const displayNameFor = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) => {
  const meta = (user?.user_metadata?.display_name as string | undefined)?.trim();
  return meta || user?.email?.split('@')[0] || 'Guest';
};

export function RoomProvider({ code, children }: PropsWithChildren<{ code: string }>) {
  const { user, loading: authLoading } = useAuth();
  const normalizedCode = normalizeRoomCode(code);

  // `dataState` is only ever set from async callbacks; the guest / loading cases
  // are derived below so nothing calls setState synchronously in an effect.
  const [dataState, setDataState] = useState<'loading' | 'not-found' | 'ready'>('loading');
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<CravingRoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [mySwipes, setMySwipes] = useState<RoomSwipe[]>([]);
  const [results, setResults] = useState<RoomResultTally[]>([]);

  const roomIdRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const deck = useMemo(
    () => (room?.dishIds ?? []).map((id) => dishById.get(id)).filter((d): d is Dish => Boolean(d)),
    [room?.dishIds],
  );
  const phase = useMemo(() => (room ? roomPhase(room, members) : 'waiting'), [room, members]);
  const myUserId = user?.id ?? null;
  const isCreator = Boolean(room && myUserId && room.createdBy === myUserId);
  const myCompleted = members.some((m) => m.userId === myUserId && m.completedAt != null);

  const loadSlices = useCallback(async (roomId: string) => {
    const [nextMembers, nextMine, nextResults] = await Promise.all([
      fetchMembers(roomId),
      fetchMySwipes(roomId),
      fetchRoomResults(roomId).catch(() => [] as RoomResultTally[]),
    ]);
    setMembers(nextMembers);
    setMySwipes(nextMine);
    setResults(nextResults);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshingRef.current || !myUserId) return;
    refreshingRef.current = true;
    try {
      let current = await fetchRoomByCode(normalizedCode);
      if (!current) {
        // We might just not be a member yet — the join RPC is idempotent.
        try {
          current = await joinRoom(normalizedCode, displayNameFor(user));
        } catch (joinError) {
          setDataState('not-found');
          setError(joinError instanceof Error ? joinError.message : 'That room is not available.');
          return;
        }
      }
      if (!current) {
        setDataState('not-found');
        return;
      }
      roomIdRef.current = current.id;
      setRoom(current);
      await loadSlices(current.id);
      setDataState('ready');
      setError(null);
      addRecentRoom(myUserId, { code: current.code, name: current.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync the room.');
      setConnection('error');
    } finally {
      refreshingRef.current = false;
    }
  }, [normalizedCode, myUserId, user, loadSlices]);

  const screenState: RoomScreenState = authLoading ? 'loading' : !user ? 'no-access' : dataState;

  // Initial load once auth is resolved and we have a signed-in user. `refresh`
  // only touches state after its first `await`, so this is a data-fetch effect,
  // not a render-cascade.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading && user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, normalizedCode]);

  // Realtime subscription — re-fetch on every event so duplicates / reconnects
  // are harmless. Falls back to polling if the channel errors.
  useEffect(() => {
    const roomId = roomIdRef.current ?? room?.id;
    if (!roomId || dataState !== 'ready') return;
    const unsubscribe = subscribeToRoom(roomId, {
      onRoom: () => { refresh(); },
      onMembers: () => { loadSlices(roomId).catch(() => {}); },
      onSwipes: () => { loadSlices(roomId).catch(() => {}); },
      onStatus: (state) => setConnection(state === 'connected' ? 'live' : 'polling'),
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, dataState]);

  // Polling fallback: always on (slow), so a manual refresh / dropped socket
  // still converges. Cadence depends on how "live" the room is.
  useEffect(() => {
    if (dataState !== 'ready') return;
    const done = phase === 'closed' || phase === 'expired';
    const interval = done ? 30000 : phase === 'completed' ? 12000 : connection === 'live' ? 10000 : 4000;
    const id = setInterval(() => {
      const roomId = roomIdRef.current;
      if (!roomId) { refresh(); return; }
      loadSlices(roomId).catch(() => {});
      // occasionally re-pull the room row too (status / expiry changes)
      fetchRoomByCode(normalizedCode).then((r) => { if (r) setRoom(r); }).catch(() => {});
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataState, phase, connection, normalizedCode]);

  const submitSwipe = useCallback(async (dishId: string, choice: SwipeChoice) => {
    const roomId = roomIdRef.current;
    if (!roomId || !myUserId) return;
    // Optimistic local update so the deck keeps moving even if offline.
    setMySwipes((prev) => [...prev.filter((s) => s.dishId !== dishId), { roomId, userId: myUserId, dishId, choice, swipedAt: Date.now() }]);
    try {
      await submitRoomSwipe(roomId, myUserId, dishId, choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That swipe did not save — retrying on the next sync.');
    }
  }, [myUserId]);

  const finishSwiping = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId || !myUserId) return;
    try {
      await markMemberComplete(roomId, myUserId);
      if (isCreator) await setRoomStatus(roomId, 'completed').catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark you finished.');
    }
    await refresh();
  }, [myUserId, isCreator, refresh]);

  const startSwiping = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId || !isCreator) return;
    try {
      await setRoomStatus(roomId, 'swiping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the room.');
    }
    await refresh();
  }, [isCreator, refresh]);

  const closeRoom = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId || !isCreator) return;
    try {
      await setRoomStatus(roomId, 'closed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the room.');
    }
    await refresh();
  }, [isCreator, refresh]);

  const value = useMemo<RoomContextValue>(() => ({
    screenState, connection, error, room, members, deck, mySwipes, results, phase,
    isCreator, myUserId, myCompleted,
    refresh, submitSwipe, finishSwiping, startSwiping, closeRoom,
  }), [screenState, connection, error, room, members, deck, mySwipes, results, phase, isCreator, myUserId, myCompleted, refresh, submitSwipe, finishSwiping, startSwiping, closeRoom]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRoom() {
  const value = useContext(Context);
  if (!value) throw new Error('useRoom must be used inside RoomProvider');
  return value;
}
