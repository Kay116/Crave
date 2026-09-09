import { Cuisine, Mood, PreferenceSession, SwipeRecord } from '@/types';
import { supabase } from '@/services/supabase';

export type CloudHistory = { preferences: PreferenceSession[]; swipes: SwipeRecord[]; likedIds: string[] };

export async function loadCloudHistory(userId: string): Promise<CloudHistory> {
  if (!supabase) return { preferences: [], swipes: [], likedIds: [] };
  const [preferences, swipes, likes] = await Promise.all([
    supabase.from('preference_sessions').select('id,moods,cuisines,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('swipe_events').select('client_id,dish_id,choice,swiped_at').eq('user_id', userId).order('swiped_at', { ascending: false }).limit(500),
    supabase.from('saved_dishes').select('dish_id').eq('user_id', userId),
  ]);
  const error = preferences.error ?? swipes.error ?? likes.error;
  if (error) throw error;
  return {
    preferences: (preferences.data ?? []).map((row) => ({ id: String(row.id), moods: row.moods as Mood[], cuisines: row.cuisines as Cuisine[], createdAt: new Date(row.created_at).getTime() })),
    swipes: (swipes.data ?? []).map((row) => ({ id: row.client_id, dishId: row.dish_id, choice: row.choice, at: new Date(row.swiped_at).getTime() } as SwipeRecord)),
    likedIds: (likes.data ?? []).map((row) => row.dish_id),
  };
}

export async function savePreference(userId: string, session: PreferenceSession) {
  if (!supabase) return;
  const { error } = await supabase.from('preference_sessions').upsert({ id: session.id, user_id: userId, moods: session.moods, cuisines: session.cuisines, created_at: new Date(session.createdAt).toISOString() });
  if (error) throw error;
}

export async function saveSwipe(userId: string, swipe: SwipeRecord) {
  if (!supabase) return;
  const clientId = swipe.id ?? `${swipe.at}-${swipe.dishId}`;
  const { error } = await supabase.from('swipe_events').upsert({ user_id: userId, client_id: clientId, dish_id: swipe.dishId, choice: swipe.choice, swiped_at: new Date(swipe.at).toISOString() }, { onConflict: 'user_id,client_id' });
  if (error) throw error;
}

export async function saveLike(userId: string, dishId: string, liked: boolean) {
  if (!supabase) return;
  const query = liked ? supabase.from('saved_dishes').upsert({ user_id: userId, dish_id: dishId }) : supabase.from('saved_dishes').delete().eq('user_id', userId).eq('dish_id', dishId);
  const { error } = await query;
  if (error) throw error;
}
