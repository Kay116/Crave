import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { goBack } from '@/services/nav';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

type Mode = 'signin' | 'signup' | 'reset';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resent, setResent] = useState(false);

  const switchMode = (next: Mode) => { setMode(next); setMessage(''); setResent(false); };

  const submit = async () => {
    setMessage('');
    setResent(false);
    if (!email.includes('@')) { setMessage('Enter a valid email address.'); return; }
    if (mode !== 'reset' && password.length < 8) { setMessage('Use at least 8 characters for your password.'); return; }
    if (mode === 'signup' && !name.trim()) { setMessage('Tell us what to call you.'); return; }
    setBusy(true);
    const result = mode === 'signup' ? await auth.signUp(email, password, name)
      : mode === 'reset' ? await auth.resetPassword(email)
      : await auth.signIn(email, password);
    setBusy(false);
    if (result.error) { setMessage(result.error); return; }
    if (mode === 'reset') { setResetSent(true); return; }
    if (result.needsEmailConfirmation) { setConfirmed(true); return; }
    router.replace('/preferences');
  };

  const submitNewPassword = async () => {
    setMessage('');
    if (password.length < 8) { setMessage('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    const result = await auth.updatePassword(password);
    setBusy(false);
    if (result.error) { setMessage(result.error); return; }
    router.replace('/preferences');
  };

  const resend = async () => {
    setMessage('');
    if (!email.includes('@')) { setMessage('Enter your email address above first.'); return; }
    setBusy(true);
    const result = await auth.resendConfirmation(email);
    setBusy(false);
    if (result.error) { setMessage(result.error); return; }
    setResent(true);
  };

  if (auth.recovering) return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><View style={styles.brand}><View style={styles.dot} /><Text style={styles.logo}>CRAVE</Text></View><Text style={styles.kicker}>ALMOST THERE</Text><Text style={styles.title}>Set a new password.</Text><Text style={styles.subtitle}>Choose a new password and you’ll be signed in.</Text><View style={styles.form}><View><Text style={styles.label}>NEW PASSWORD</Text><TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#AAA098" secureTextEntry autoCapitalize="none" autoComplete="new-password" style={styles.input} /></View>{message ? <Text style={styles.error}>{message}</Text> : null}<Pressable onPress={submitNewPassword} disabled={busy || !auth.configured} style={[styles.primary, (!auth.configured || busy) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>Update password</Text><Text style={styles.primaryText}>→</Text></>}</Pressable></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;

  if (auth.recoveryError) return <SafeAreaView style={styles.safe}><View style={styles.success}><View style={styles.successIcon}><Text style={styles.successCheck}>!</Text></View><Text style={styles.successTitle}>That link didn’t work</Text><Text style={styles.successText}>{auth.recoveryError}. Reset links can only be used once and expire after an hour — request a fresh one.</Text><Pressable onPress={() => switchMode('reset')} style={styles.primary}><Text style={styles.primaryText}>Send a new reset link</Text><Text style={styles.primaryText}>→</Text></Pressable></View></SafeAreaView>;

  if (confirmed) return <SafeAreaView style={styles.safe}><View style={styles.success}><View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View><Text style={styles.successTitle}>Check your inbox</Text><Text style={styles.successText}>We sent a confirmation link to {email}. Open it, then come back and sign in.</Text>{resent ? <Text style={styles.resent}>Sent again — give it a minute.</Text> : <Pressable onPress={resend} disabled={busy} style={styles.linkButton}><Text style={styles.linkText}>{busy ? 'Sending…' : 'Resend confirmation email'}</Text></Pressable>}{message ? <Text style={styles.error}>{message}</Text> : null}<Pressable onPress={() => { setConfirmed(false); switchMode('signin'); }} style={styles.primary}><Text style={styles.primaryText}>Back to sign in</Text><Text style={styles.primaryText}>→</Text></Pressable></View></SafeAreaView>;

  if (resetSent) return <SafeAreaView style={styles.safe}><View style={styles.success}><View style={styles.successIcon}><Text style={styles.successCheck}>✉</Text></View><Text style={styles.successTitle}>Check your inbox</Text><Text style={styles.successText}>We sent a password reset link to {email}. Open it to choose a new password. The link also confirms your email.</Text><Pressable onPress={() => { setResetSent(false); switchMode('signin'); }} style={styles.primary}><Text style={styles.primaryText}>Back to sign in</Text><Text style={styles.primaryText}>→</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => goBack()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable><View style={styles.brand}><View style={styles.dot} /><Text style={styles.logo}>CRAVE</Text></View><Text style={styles.kicker}>{mode === 'signup' ? 'MAKE IT YOURS' : mode === 'reset' ? 'FORGOT YOUR PASSWORD?' : 'WELCOME BACK'}</Text><Text style={styles.title}>{mode === 'signup' ? 'Your taste gets better with time.' : mode === 'reset' ? 'We’ll send you a reset link.' : 'Pick up where you left off.'}</Text><Text style={styles.subtitle}>{mode === 'signup' ? 'Create an account to keep your cravings, likes, and recommendations in sync.' : mode === 'reset' ? 'Enter the email you signed up with and we’ll email you a link to set a new password.' : 'Sign in to restore your preference history and learned taste profile.'}</Text>{!auth.configured && <View style={styles.config}><Text style={styles.configTitle}>Supabase setup needed</Text><Text style={styles.configText}>Add the project URL and publishable key to `.env.local`, then restart Expo.</Text></View>}<View style={styles.form}>{mode === 'signup' && <View><Text style={styles.label}>NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#AAA098" autoComplete="name" style={styles.input} /></View>}<View><Text style={styles.label}>EMAIL</Text><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#AAA098" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.input} /></View>{mode !== 'reset' && <View><Text style={styles.label}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#AAA098" secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} style={styles.input} /></View>}{mode === 'signin' && <Pressable onPress={() => switchMode('reset')} style={styles.forgot}><Text style={styles.forgotText}>Forgot password?</Text></Pressable>}{message ? <Text style={styles.error}>{message}</Text> : null}<Pressable onPress={submit} disabled={busy || !auth.configured} style={[styles.primary, (!auth.configured || busy) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>{mode === 'signup' ? 'Create my account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</Text><Text style={styles.primaryText}>→</Text></>}</Pressable>{mode === 'signin' && message ? (resent ? <Text style={styles.resent}>Confirmation email sent again.</Text> : <Pressable onPress={resend} disabled={busy} style={styles.linkButton}><Text style={styles.linkText}>Didn’t confirm your email? Resend link</Text></Pressable>) : null}</View><Pressable onPress={() => switchMode(mode === 'signup' ? 'signin' : mode === 'reset' ? 'signin' : 'signup')} style={styles.switch}><Text style={styles.switchMuted}>{mode === 'signup' ? 'Already have an account? ' : mode === 'reset' ? 'Remembered it? ' : 'New to Crave? '}</Text><Text style={styles.switchStrong}>{mode === 'signup' ? 'Sign in' : mode === 'reset' ? 'Sign in' : 'Create one'}</Text></Pressable><Pressable onPress={() => router.replace('/preferences')} style={styles.guest}><Text style={styles.guestText}>Continue as guest</Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.cream }, flex: { flex: 1 }, content: { padding: spacing.xl, paddingBottom: 42, maxWidth: 540, width: '100%', alignSelf: 'center' }, close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.charcoal, fontSize: 28, marginTop: -3 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral }, logo: { color: colors.charcoal, fontWeight: '900', letterSpacing: 2.7, fontSize: 15 }, kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.8, marginTop: 34 }, title: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 36, lineHeight: 41, marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 11 }, config: { backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: 15, marginTop: 20 }, configTitle: { color: '#9C3C28', fontWeight: '900', fontSize: 13 }, configText: { color: '#9C3C28', fontSize: 12, lineHeight: 18, marginTop: 3 }, form: { gap: 16, marginTop: 26 }, label: { color: colors.muted, fontWeight: '900', fontSize: 9, letterSpacing: 1.4, marginBottom: 7 }, input: { height: 55, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 16, color: colors.charcoal, fontSize: 15 }, forgot: { alignSelf: 'flex-end', marginTop: -6 }, forgotText: { color: colors.sage, fontWeight: '800', fontSize: 12 }, error: { color: colors.coral, fontSize: 12, lineHeight: 17 }, resent: { color: colors.sage, fontSize: 12, lineHeight: 17, fontWeight: '700' }, linkButton: { alignItems: 'center', paddingVertical: 4 }, linkText: { color: colors.sage, fontWeight: '800', fontSize: 12 }, primary: { minHeight: 58, borderRadius: radius.full, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 21, ...shadow }, disabled: { opacity: 0.45 }, primaryText: { color: colors.white, fontWeight: '900', fontSize: 15 }, switch: { flexDirection: 'row', justifyContent: 'center', marginTop: 23 }, switchMuted: { color: colors.muted, fontSize: 13 }, switchStrong: { color: colors.coral, fontWeight: '900', fontSize: 13 }, guest: { alignItems: 'center', padding: 17 }, guestText: { color: colors.sage, fontWeight: '800', fontSize: 13 }, success: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }, successIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }, successCheck: { color: colors.sage, fontSize: 34, fontWeight: '900' }, successTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 30, marginTop: 22 }, successText: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 9, marginBottom: 26, maxWidth: 380 },
});
