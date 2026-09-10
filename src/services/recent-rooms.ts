import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentRoom = { code: string; name: string; lastSeen: number };

const keyFor = (userId: string) => `@crave/v4/rooms/${userId}`;
const LIMIT = 8;

export async function getRecentRooms(userId: string): Promise<RecentRoom[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as RecentRoom[]) : [];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.lastSeen - a.lastSeen) : [];
  } catch {
    return [];
  }
}

export async function addRecentRoom(userId: string, room: { code: string; name: string }): Promise<void> {
  try {
    const existing = await getRecentRooms(userId);
    const next = [
      { code: room.code, name: room.name, lastSeen: Date.now() },
      ...existing.filter((entry) => entry.code !== room.code),
    ].slice(0, LIMIT);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* best effort only */
  }
}

export async function removeRecentRoom(userId: string, code: string): Promise<void> {
  try {
    const existing = await getRecentRooms(userId);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(existing.filter((entry) => entry.code !== code)));
  } catch {
    /* best effort only */
  }
}
