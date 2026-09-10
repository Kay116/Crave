import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoom } from '@/context/room-context';
import { shareRoomInvite } from '@/services/sharing';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

const CONNECTION_COPY: Record<string, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  polling: 'Syncing every few seconds',
  error: 'Connection issue — still syncing on refresh',
};

export default function RoomLobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const room = useRoom();

  if (room.screenState === 'loading') {
    return <View style={styles.center}><ActivityIndicator color={colors.coral} /><Text style={styles.centerText}>Opening room…</Text></View>;
  }

  if (room.screenState === 'no-access') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header code={code} />
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>◎</Text>
          <Text style={styles.noticeTitle}>Sign in to join this room</Text>
          <Text style={styles.noticeText}>Shared craving rooms need an account so everyone’s swipes stay in sync.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/auth', params: { mode: 'signup' } })} style={styles.primary}>
            <Text style={styles.primaryText}>Create an account</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/auth')} style={styles.linkBtn}><Text style={styles.linkText}>I have an account</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (room.screenState === 'not-found' || !room.room) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header code={code} />
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>!</Text>
          <Text style={styles.noticeTitle}>Room unavailable</Text>
          <Text style={styles.noticeText}>{room.error ?? 'That invitation code is not valid, or the room has been closed.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/friends')} style={styles.primary}><Text style={styles.primaryText}>Back to Friends</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { room: data, members, phase, isCreator, myCompleted, connection } = room;
  const others = members.filter((m) => m.userId !== room.myUserId);
  const finishedCount = members.filter((m) => m.completedAt != null).length;

  let statusLine = 'Waiting for friends to join.';
  if (phase === 'expired') statusLine = 'This room has expired.';
  else if (phase === 'closed') statusLine = 'The host closed this room.';
  else if (phase === 'completed') statusLine = 'Everyone finished — your group match is ready.';
  else if (others.length === 0) statusLine = 'No one else has joined yet. Share the code below.';
  else if (finishedCount > 0 && finishedCount < members.length) statusLine = `${finishedCount} of ${members.length} finished — the rest are still swiping.`;
  else statusLine = `${members.length} in the room. Start swiping when you’re ready.`;

  const goSwipe = async () => {
    if (isCreator && phase === 'waiting') await room.startSwiping();
    router.push({ pathname: '/room/[code]/swipe', params: { code: data.code } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header code={code} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>CRAVING ROOM</Text>
        <Text style={styles.title}>{data.name}</Text>
        <View style={[styles.connBadge, connection === 'error' && styles.connBadgeWarn]}>
          <View style={[styles.connDot, connection === 'live' && styles.connDotLive, connection === 'error' && styles.connDotWarn]} />
          <Text style={styles.connText}>{CONNECTION_COPY[connection]}</Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>INVITATION CODE</Text>
          <Text style={styles.code} accessibilityLabel={`Invitation code ${data.code.split('').join(' ')}`}>{data.code}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Share this room" onPress={() => shareRoomInvite(data.name, data.code)} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share invitation</Text>
            <Text style={styles.shareText}>↗</Text>
          </Pressable>
          {data.expiresAt != null && (
            <Text style={styles.expiry}>Closes {new Date(data.expiresAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
          )}
        </View>

        <Text style={styles.status}>{statusLine}</Text>
        {room.error && <Text style={styles.errorLine}>{room.error}</Text>}

        <Text style={styles.section}>IN THE ROOM ({members.length})</Text>
        {members.map((member) => (
          <View key={member.userId} style={styles.memberRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(member.displayName || 'G').charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.memberName} numberOfLines={1}>
              {member.displayName}{member.userId === room.myUserId ? ' (you)' : ''}{member.userId === data.createdBy ? ' · host' : ''}
            </Text>
            <Text style={[styles.memberState, member.completedAt != null && styles.memberDone]}>
              {member.completedAt != null ? 'Finished' : phase === 'waiting' ? 'Ready' : 'Swiping'}
            </Text>
          </View>
        ))}

        <View style={styles.actions}>
          {(phase === 'waiting' || phase === 'swiping') && !myCompleted && (
            <Pressable accessibilityRole="button" accessibilityLabel="Start swiping" onPress={goSwipe} style={styles.primary}>
              <Text style={styles.primaryText}>{isCreator && phase === 'waiting' ? 'Start swiping' : 'Join the swiping'}</Text>
            </Pressable>
          )}
          {(myCompleted || phase === 'completed') && (
            <Pressable accessibilityRole="button" accessibilityLabel="See the group result" onPress={() => router.push({ pathname: '/room/[code]/results', params: { code: data.code } })} style={styles.primary}>
              <Text style={styles.primaryText}>See the group result</Text>
            </Pressable>
          )}
          {(phase === 'expired' || phase === 'closed') && (
            <Pressable accessibilityRole="button" onPress={() => router.replace('/friends')} style={styles.primary}><Text style={styles.primaryText}>Back to Friends</Text></Pressable>
          )}
          {isCreator && phase !== 'closed' && phase !== 'expired' && (
            <Pressable accessibilityRole="button" accessibilityLabel="Close this room" onPress={room.closeRoom} style={styles.closeRoom}>
              <Text style={styles.closeRoomText}>Close room</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ code }: { code?: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.replace('/friends')} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Room {code}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, gap: 10 },
  centerText: { color: colors.muted, fontSize: 13 },
  header: { height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  backText: { color: colors.charcoal, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.7 },
  title: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 34, marginTop: 6 },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.sageSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.full, marginTop: 12 },
  connBadgeWarn: { backgroundColor: colors.coralSoft },
  connDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  connDotLive: { backgroundColor: colors.sage },
  connDotWarn: { backgroundColor: colors.coral },
  connText: { color: colors.charcoal, fontWeight: '800', fontSize: 10 },
  codeCard: { backgroundColor: colors.charcoal, borderRadius: radius.lg, padding: 20, marginTop: 18, alignItems: 'center' },
  codeLabel: { color: 'rgba(255,255,255,0.55)', fontWeight: '900', fontSize: 9, letterSpacing: 2 },
  code: { color: colors.white, fontWeight: '900', fontSize: 40, letterSpacing: 8, marginTop: 8, marginLeft: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.coral, borderRadius: radius.full, paddingHorizontal: 20, paddingVertical: 12, marginTop: 14 },
  shareText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  expiry: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 12 },
  status: { color: colors.charcoal, fontSize: 14, lineHeight: 20, marginTop: 20, fontWeight: '600' },
  errorLine: { color: colors.coral, fontSize: 12, marginTop: 8 },
  section: { color: colors.muted, fontWeight: '900', fontSize: 10, letterSpacing: 1.4, marginTop: 24, marginBottom: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.sage, fontWeight: '900', fontSize: 14 },
  memberName: { flex: 1, color: colors.charcoal, fontWeight: '700', fontSize: 13 },
  memberState: { color: colors.muted, fontWeight: '800', fontSize: 10 },
  memberDone: { color: colors.sage },
  actions: { marginTop: 24, gap: 12 },
  primary: { minHeight: 54, borderRadius: radius.full, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', ...shadow },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  closeRoom: { alignItems: 'center', paddingVertical: 14 },
  closeRoomText: { color: colors.coral, fontWeight: '800', fontSize: 13 },
  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  noticeIcon: { color: colors.coral, fontSize: 42, fontWeight: '700' },
  noticeTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 24, marginTop: 10 },
  noticeText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 340 },
  linkBtn: { padding: 14 },
  linkText: { color: colors.sage, fontWeight: '800' },
});
