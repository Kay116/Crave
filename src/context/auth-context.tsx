import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isSupabaseConfigured, recoveryLinkError, recoveryLinkInUrl, supabase } from '@/services/supabase';

type AuthResult = { error?: string; needsEmailConfirmation?: boolean };
type AuthContextValue = {
  user: User | null; session: Session | null; loading: boolean; configured: boolean;
  // True after the user returns via a password-reset link and still needs to
  // choose a new password. Cleared once the password is updated.
  recovering: boolean;
  // Set when a reset/confirmation link came back with an error (expired, reused).
  recoveryError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
};

const Context = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED = 'Add your Supabase project URL and publishable key to .env.local.';

// Where confirmation / reset emails send the user back to. On web this must be
// the exact running origin (and be listed under Supabase → Authentication → URL
// Configuration → Redirect URLs); on native it is the app's deep-link scheme.
const emailRedirectTo = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/auth`;
  return Linking.createURL('/auth');
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  // Seed from the URL fragment so the "set a new password" screen shows even if
  // the PASSWORD_RECOVERY event fires before this provider mounts.
  const [recovering, setRecovering] = useState(recoveryLinkInUrl);
  const [recoveryError, setRecoveryError] = useState<string | null>(recoveryLinkError);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    // Resolve the initial session before anything downstream decides which local
    // state to hydrate. `loading` stays true until this (or the first auth event)
    // settles. Never log the session, its user id, or any token.
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session); })
      .finally(() => { if (active) setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') { setRecovering(true); setRecoveryError(null); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured,
    recovering,
    recoveryError,
    signIn: async (email, password) => {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { error: error.message } : {};
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() }, emailRedirectTo: emailRedirectTo() },
      });
      if (error) return { error: error.message };
      return { needsEmailConfirmation: !data.session };
    },
    signOut: async () => {
      if (!supabase) return {};
      const { error } = await supabase.auth.signOut();
      return error ? { error: error.message } : {};
    },
    resetPassword: async (email) => {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: emailRedirectTo() });
      return error ? { error: error.message } : {};
    },
    resendConfirmation: async (email) => {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: emailRedirectTo() } });
      return error ? { error: error.message } : {};
    },
    updatePassword: async (password) => {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      setRecovering(false);
      setRecoveryError(null);
      return {};
    },
  }), [session, loading, recovering, recoveryError]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
