import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { useAuth } from '@/context/auth-context';
import { useCrave } from '@/context/crave-context';
import { getRecentRooms, RecentRoom } from '@/services/recent-rooms';
import { createRoom, isValidRoomCode, joinRoom, normalizeRoomCode } from '@/services/rooms';
import { shareRoomInvite } from '@/services/sharing';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

const DECK_SIZE = 10;

export default function FriendsScreen() {
  const auth = useAuth();
  const store = useCrave();
  const [name, setName] = useState('');
  const [expires, setExpires] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [message, setMessage] = useState('');
  const [recent, setRecent] = useState<RecentRoom[]>([]);

  useEffect(() => {
    if (auth.user) getRecentRooms(auth.user.id).then(setRecent).catch(() => {});
  }, [auth.user]);

  if (auth.loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.coral} /></View>;
  }

  if (!auth.user) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandHeader showLikes={false} />
        <View style={styles.guest}>
          <Text style={styles.guestIcon}>◎</Text>
          <Text style={styles.guestTitle}>Decide together</Text>
          <Text style={styles.guestText}>Create an account to start a shared craving room. Everyone swipes the same dishes and Crave finds your group’s match.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })} style={styles.primary}>
            <Text style={styles.primaryText}>Create an account</Text>
            <Text style={styles.primaryText}>→</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.linkBtn}>
            <Text style={styles.linkText}>I already have an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const onCreate = async () => {
    setMessage('');
    setBusy('create');
    try {
      const deck = store.recommendations.slice(0, DECK_SIZE);
      const room = await createRoom({
        name: name.trim() || 'Crave room',
        dishIds: deck.map((dish) => dish.id),
        moods: store.moods,
        cuisines: store.cuisines,
        displayName: auth.user!.user_metadata?.display_name || auth.user!.email?.split('@')[0] || 'Guest',
        expires,
      });
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the room.');
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    setMessage('');
    const clean = normalizeRoomCode(code);
    if (!isValidRoomCode(clean)) {
      setMessage('Enter the 6-character invitation code.');
      return;
    }
    setBusy('join');
    try {
      const room = await joinRoom(clean, auth.user!.user_metadata?.display_name || auth.user!.email?.split('@')[0] || 'Guest');
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join that room.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BrandHeader showLikes={false} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>EAT TOGETHER</Text>
          <Text style={styles.title}>Craving rooms</Text>
          <Text style={styles.sub}>Start a room, share the code, and everyone swipes the same dishes. Crave picks the group’s match.</Text>

          {message ? <Text style={styles.error}>{message}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create a room</Text>
            <Text style={styles.label}>ROOM NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Friday dinner"
              placeholderTextColor="#AAA098"
              accessibilityLabel="Room name"
              style={styles.input}
            />
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Expire after 24 hours</Text>
                <Text style={styles.switchSub}>The room closes itself the next day.</Text>
              </View>
              <Switch
                value={expires}
                onValueChange={setExpires}
                accessibilityLabel="Expire the room after 24 hours"
                trackColor={{ true: colors.coral, false: colors.line }}
              />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Create room" disabled={busy !== null} onPress={onCreate} style={[styles.primary, busy && styles.disabled]}>
              {busy === 'create' ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>Create room</Text><Text style={styles.primaryText}>→</Text></>}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join with a code</Text>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(normalizeRoomCode(text))}
              placeholder="ABC234"
              placeholderTextColor="#AAA098"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              accessibilityLabel="Invitation code"
              style={[styles.input, styles.codeInput]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Join room" disabled={busy !== null} onPress={onJoin} style={[styles.secondary, busy && styles.disabled]}>
              {busy === 'join' ? <ActivityIndicator color={colors.charcoal} /> : <Text style={styles.secondaryText}>Join room</Text>}
            </Pressable>
          </View>

          {recent.length > 0 && (
            <View style={styles.recent}>
              <Text style={styles.recentTitle}>RECENT ROOMS</Text>
              {recent.map((entry) => (
                <View key={entry.code} style={styles.recentRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open room ${entry.name}`}
                    style={styles.recentOpen}
                    onPress={() => router.push({ pathname: '/room/[code]', params: { code: entry.code } })}
                  >
                    <Text style={styles.recentName} numberOfLines={1}>{entry.name}</Text>
                    <Text style={styles.recentCode}>{entry.code}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Share room ${entry.name}`}
                    onPress={() => shareRoomInvite(entry.name, entry.code)}
                    style={styles.recentShare}
                  >
                    <Text style={styles.recentShareText}>Share</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  content: { paddingBottom: 40 },
  kicker: { marginTop: 14, color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: colors.charcoal, fontWeight: '700', marginTop: 6 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 460 },
  error: { color: colors.coral, fontSize: 13, lineHeight: 18, marginTop: 14 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 18, marginTop: 18 },
  cardTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 15, marginBottom: 12 },
  label: { color: colors.muted, fontWeight: '900', fontSize: 9, letterSpacing: 1.4, marginBottom: 7 },
  input: { height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 15, color: colors.charcoal, fontSize: 15 },
  codeInput: { fontSize: 22, letterSpacing: 6, fontWeight: '800', textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.charcoal, fontWeight: '800', fontSize: 13 },
  switchSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  primary: { minHeight: 54, borderRadius: radius.full, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16, ...shadow },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  secondary: { minHeight: 52, borderRadius: radius.full, borderWidth: 1, borderColor: colors.charcoal, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryText: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.5 },
  recent: { marginTop: 26 },
  recentTitle: { color: colors.muted, fontWeight: '900', fontSize: 10, letterSpacing: 1.4, marginBottom: 10 },
  recentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, marginBottom: 8 },
  recentOpen: { flex: 1, padding: 14 },
  recentName: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
  recentCode: { color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 3 },
  recentShare: { paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: colors.line },
  recentShareText: { color: colors.sage, fontWeight: '800', fontSize: 12 },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 60 },
  guestIcon: { color: colors.coral, fontSize: 52 },
  guestTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 29, marginTop: 12 },
  guestText: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 380, marginTop: 9 },
  linkBtn: { padding: 17 },
  linkText: { color: colors.sage, fontWeight: '800' },
});
