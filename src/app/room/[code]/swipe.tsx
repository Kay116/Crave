import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DishDetails } from '@/components/dish-details';
import { prefetchDishImages } from '@/components/smart-image';
import { SwipeCard } from '@/components/swipe-card';
import { useRoom } from '@/context/room-context';
import { shareDish } from '@/services/sharing';
import { colors, radius, shadow, spacing } from '@/theme';
import { Dish, SwipeChoice } from '@/types';

export default function RoomSwipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const room = useRoom();
  const [details, setDetails] = useState<Dish | null>(null);
  const finishingRef = useRef(false);

  const swipedIds = useMemo(() => new Set(room.mySwipes.map((s) => s.dishId)), [room.mySwipes]);
  const index = room.deck.findIndex((dish) => !swipedIds.has(dish.id));
  const current = index >= 0 ? room.deck[index] : undefined;
  const done = room.deck.length > 0 && index === -1;

  useEffect(() => {
    if (index < 0) return;
    prefetchDishImages(room.deck.slice(index + 1, index + 3).flatMap((d) => d.images.map((i) => i.url)), 4);
  }, [room.deck, index]);

  // If the host closes / the room expires mid-swipe, bounce back to the lobby.
  useEffect(() => {
    if (room.phase === 'closed' || room.phase === 'expired') {
      router.replace({ pathname: '/room/[code]', params: { code: code ?? room.room?.code ?? '' } });
    }
  }, [room.phase, code, room.room?.code]);

  useEffect(() => {
    if (!done || finishingRef.current) return;
    finishingRef.current = true;
    room.finishSwiping().finally(() => {
      router.replace({ pathname: '/room/[code]/results', params: { code: code ?? room.room?.code ?? '' } });
    });
  }, [done, room, code]);

  if (room.screenState !== 'ready') {
    return <View style={styles.center}><ActivityIndicator color={colors.coral} /></View>;
  }

  if (room.deck.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>This room has no dishes to swipe.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/room/[code]', params: { code: code ?? '' } })} style={styles.primary}>
            <Text style={styles.primaryText}>Back to room</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const choose = (choice: SwipeChoice) => {
    if (!current) return;
    room.submitSwipe(current.id, choice);
    Haptics.impactAsync(choice === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const finishedOthers = room.members.filter((m) => m.userId !== room.myUserId && m.completedAt != null).length;
  const otherCount = Math.max(0, room.members.length - 1);
  const swipedCount = room.deck.filter((d) => swipedIds.has(d.id)).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to room" onPress={() => router.replace({ pathname: '/room/[code]', params: { code: code ?? '' } })} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>{room.room?.name?.toUpperCase() ?? 'ROOM'}</Text>
          <Text style={styles.heading}>Swipe the group deck</Text>
        </View>
        <View style={styles.progress}><Text style={styles.progressText}>{Math.min(swipedCount + 1, room.deck.length)} / {room.deck.length}</Text></View>
      </View>

      <Text style={styles.groupLine}>
        {otherCount === 0 ? 'No one else has joined yet — your votes still count.' : `${finishedOthers} of ${otherCount} friend${otherCount === 1 ? '' : 's'} finished`}
      </Text>
      {room.error && <Text style={styles.errorLine}>{room.error}</Text>}

      <View style={styles.deck}>
        {room.deck[index + 1] && <View style={styles.behind} />}
        {current
          ? <SwipeCard key={current.id} dish={current} onSwipe={choose} onOpenDetails={() => setDetails(current)} />
          : <View style={styles.center}><ActivityIndicator color={colors.coral} /><Text style={styles.emptyText}>Saving your picks…</Text></View>}
      </View>

      <Text style={styles.hint}>SWIPE LEFT TO PASS  ·  RIGHT TO LIKE</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={() => choose('pass')} style={({ pressed }) => [styles.action, styles.pass, pressed && styles.pressed]}>
          <Text style={styles.x}>×</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Finish and see the group result" onPress={() => { finishingRef.current = true; room.finishSwiping().finally(() => router.replace({ pathname: '/room/[code]/results', params: { code: code ?? '' } })); }} style={styles.done}>
          <Text style={styles.doneText}>Finish now</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Like" onPress={() => choose('like')} style={({ pressed }) => [styles.action, styles.like, pressed && styles.pressed]}>
          <Text style={styles.heart}>♥</Text>
        </Pressable>
      </View>

      <DishDetails
        dish={details}
        visible={details !== null}
        onClose={() => setDetails(null)}
        onShare={(dish) => shareDish(dish)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.lg, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  backText: { color: colors.charcoal, fontSize: 28, lineHeight: 30, marginTop: -3 },
  topCopy: { flex: 1 },
  kicker: { color: colors.coral, fontWeight: '900', fontSize: 9, letterSpacing: 1.4 },
  heading: { color: colors.charcoal, fontSize: 20, fontWeight: '800', marginTop: 2 },
  progress: { backgroundColor: colors.coralSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.full },
  progressText: { color: colors.coral, fontWeight: '800', fontSize: 11 },
  groupLine: { color: colors.muted, fontSize: 11, marginBottom: 6 },
  errorLine: { color: colors.coral, fontSize: 11, marginBottom: 6 },
  deck: { flex: 1, position: 'relative', marginHorizontal: 2, marginBottom: 12 },
  behind: { position: 'absolute', backgroundColor: '#E8DCD0', left: 10, right: 10, top: 8, bottom: -7, borderRadius: radius.lg, transform: [{ scale: 0.97 }] },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginVertical: 8 },
  actions: { minHeight: 78, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, paddingBottom: 7 },
  action: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, ...shadow },
  pass: { borderWidth: 1, borderColor: colors.line },
  like: { backgroundColor: colors.coral },
  pressed: { transform: [{ scale: 0.93 }] },
  x: { color: colors.muted, fontSize: 38, fontWeight: '300', marginTop: -5 },
  heart: { color: colors.white, fontSize: 24 },
  done: { paddingHorizontal: 4, paddingVertical: 16 },
  doneText: { color: colors.sage, fontWeight: '800', fontSize: 12 },
  emptyText: { color: colors.muted, fontSize: 13 },
  primary: { minHeight: 50, borderRadius: radius.full, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 14 },
});
