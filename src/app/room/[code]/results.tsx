import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SmartImage } from '@/components/smart-image';
import { useCrave } from '@/context/crave-context';
import { useRoom } from '@/context/room-context';
import { scoreDish } from '@/services/recommendation';
import { matchPercent, scoreGroupFromTallies } from '@/services/group-score';
import { shareGroupResult } from '@/services/sharing';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

export default function RoomResultsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const room = useRoom();
  const store = useCrave();

  const personalScores = useMemo(() => {
    const scores: Record<string, number> = {};
    if (!room.room) return scores;
    for (const dish of room.deck) {
      scores[dish.id] = scoreDish(dish, room.room.selectedMoods, room.room.selectedCuisines, [], store.swipeHistory, store.preferenceHistory);
    }
    return scores;
  }, [room.room, room.deck, store.swipeHistory, store.preferenceHistory]);

  const result = useMemo(() => {
    if (!room.room) return null;
    const tallies = Object.fromEntries(room.results.map((r) => [r.dishId, { likes: r.likes, passes: r.passes, voters: r.voters }]));
    return scoreGroupFromTallies({
      deck: room.deck,
      totalMembers: room.members.length,
      finishedMembers: room.members.filter((m) => m.completedAt != null).length,
      tallies,
      personalScores,
    });
  }, [room.room, room.deck, room.results, room.members, personalScores]);

  if (room.screenState === 'loading') {
    return <View style={styles.center}><ActivityIndicator color={colors.coral} /></View>;
  }
  if (room.screenState !== 'ready' || !room.room || !result) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header code={code} />
        <View style={styles.center}>
          <Text style={styles.noneTitle}>Results unavailable</Text>
          <Text style={styles.noneText}>{room.error ?? 'This room is not available anymore.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/friends')} style={styles.primary}><Text style={styles.primaryText}>Back to Friends</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { best, alternatives, everyoneFinished, finishedMembers, totalMembers } = result;
  const progressLine = everyoneFinished
    ? `All ${totalMembers} finished`
    : `${finishedMembers} of ${totalMembers} finished — updates as the rest swipe`;

  return (
    <SafeAreaView style={styles.safe}>
      <Header code={code} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{room.room.name.toUpperCase()}</Text>
        <Text style={styles.title}>The group’s match</Text>
        <Text style={styles.progress}>{progressLine}</Text>
        {room.connection === 'error' && <Text style={styles.warn}>Connection issue — pull to refresh if this looks stale.</Text>}

        {!best ? (
          <View style={styles.noneCard}>
            <Text style={styles.noneIcon}>◇</Text>
            <Text style={styles.noneTitle}>No likes yet</Text>
            <Text style={styles.noneText}>Once someone likes a dish, the group match shows up here.</Text>
            {!room.myCompleted && (
              <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/room/[code]/swipe', params: { code: code ?? '' } })} style={styles.primary}>
                <Text style={styles.primaryText}>Keep swiping</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <SmartImage uri={best.dish.images[0]?.url ?? best.dish.image} alt={best.dish.images[0]?.alt ?? best.dish.name} style={StyleSheet.absoluteFill} />
              <View style={styles.heroShade} />
              <View style={styles.badge}><Text style={styles.badgeText}>{matchPercent(best)}% MATCH</Text></View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroCuisine}>{best.dish.cuisine.toUpperCase()}</Text>
                <Text style={styles.heroName}>{best.dish.name}</Text>
                <Text style={styles.heroExplain}>{best.explanation}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Find ${best.dish.name} nearby`} onPress={() => router.push({ pathname: '/nearby', params: { dishId: best.dish.id } })} style={styles.primary}>
                <Text style={styles.primaryText}>⌖  Find it nearby</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share the group result" onPress={() => shareGroupResult(room.room!.name, best.dish, best.likes, best.totalMembers)} style={styles.secondary}>
                <Text style={styles.secondaryText}>Share result</Text>
              </Pressable>
            </View>

            {alternatives.length > 0 && (
              <>
                <Text style={styles.section}>ALSO IN THE RUNNING</Text>
                {alternatives.map((alt) => (
                  <Pressable
                    key={alt.dish.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${alt.dish.name}, ${alt.explanation}. Find nearby`}
                    onPress={() => router.push({ pathname: '/nearby', params: { dishId: alt.dish.id } })}
                    style={styles.altRow}
                  >
                    <SmartImage uri={alt.dish.images[0]?.url ?? alt.dish.image} alt={alt.dish.images[0]?.alt ?? alt.dish.name} style={styles.altImage} />
                    <View style={styles.altCopy}>
                      <Text style={styles.altName} numberOfLines={1}>{alt.dish.name}</Text>
                      <Text style={styles.altMeta}>{alt.explanation} · {matchPercent(alt)}%</Text>
                    </View>
                    <Text style={styles.altArrow}>›</Text>
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/room/[code]', params: { code: code ?? '' } })} style={styles.backToRoom}>
          <Text style={styles.backToRoomText}>Back to the room</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ code }: { code?: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to room" onPress={() => router.replace({ pathname: '/room/[code]', params: { code: code ?? '' } })} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Group result</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: { height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  backText: { color: colors.charcoal, fontSize: 28, lineHeight: 30, marginTop: -3 },
  headerTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.7 },
  title: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 34, marginTop: 6 },
  progress: { color: colors.muted, fontSize: 12, marginTop: 6, fontWeight: '700' },
  warn: { color: colors.coral, fontSize: 11, marginTop: 6 },
  hero: { height: 380, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.charcoal, marginTop: 18, ...shadow },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,12,10,0.42)' },
  badge: { position: 'absolute', right: 16, top: 16, backgroundColor: colors.coral, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  badgeText: { color: colors.white, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  heroCopy: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  heroCuisine: { color: '#FFD2C7', fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  heroName: { color: colors.white, fontFamily: fonts.serif, fontWeight: '700', fontSize: 33, marginTop: 5 },
  heroExplain: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 7, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, minHeight: 52, borderRadius: radius.full, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', ...shadow },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  secondary: { minHeight: 52, borderRadius: radius.full, borderWidth: 1, borderColor: colors.charcoal, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  secondaryText: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
  section: { color: colors.muted, fontWeight: '900', fontSize: 10, letterSpacing: 1.4, marginTop: 28, marginBottom: 11 },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10, marginBottom: 9 },
  altImage: { width: 58, height: 58, borderRadius: radius.sm },
  altCopy: { flex: 1 },
  altName: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
  altMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  altArrow: { color: colors.muted, fontSize: 22 },
  noneCard: { alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 28, marginTop: 20, gap: 4 },
  noneIcon: { color: colors.coral, fontSize: 36 },
  noneTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 22, marginTop: 6 },
  noneText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 4, marginBottom: 12 },
  backToRoom: { alignItems: 'center', paddingVertical: 18 },
  backToRoomText: { color: colors.sage, fontWeight: '800' },
});
