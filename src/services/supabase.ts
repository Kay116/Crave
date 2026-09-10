import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

const isWeb = Platform.OS === 'web';

// Snapshot the auth params Supabase appends to the URL fragment *before* the
// client consumes and clears them, so the UI can react to a password-reset link
// even if the auth event races the first render.
function readAuthHash() {
  if (!isWeb || typeof window === 'undefined') return { recovery: false, error: null as string | null };
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const recovery = params.get('type') === 'recovery';
  const error = params.get('error_description') || params.get('error') || null;
  return { recovery, error: error ? decodeURIComponent(error).replace(/\+/g, ' ') : null };
}

const authHash = readAuthHash();
export const recoveryLinkInUrl = authHash.recovery;
export const recoveryLinkError = authHash.recovery ? null : authHash.error;

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        ...(isWeb ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        // On web, let supabase-js pick up the session that email-confirmation
        // and password-reset links carry in the URL fragment.
        detectSessionInUrl: isWeb,
      },
    })
  : null;

if (supabase && !isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
