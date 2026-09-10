import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Tolerate the common paste mistakes in a CI secret / .env: surrounding quotes,
// stray whitespace, or the "KEY=" prefix pasted into the value.
function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '').replace(/^EXPO_PUBLIC_[A-Z_]+=/, '').trim();
}

const rawUrl = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const publishableKey = clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
// Only treat the URL as usable if it actually looks like one — a malformed value
// degrades to guest-only mode instead of crashing the bundle / static export.
const url = /^https:\/\/[^\s/]+\.[^\s/]+/i.test(rawUrl) ? rawUrl : '';

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

function makeClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  try {
    return createClient(url, publishableKey, {
      auth: {
        ...(isWeb ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        // On web, let supabase-js pick up the session that email-confirmation
        // and password-reset links carry in the URL fragment.
        detectSessionInUrl: isWeb,
      },
    });
  } catch {
    return null;
  }
}

export const supabase = makeClient();

if (supabase && !isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
