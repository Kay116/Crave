import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { DishDetails } from '@/components/dish-details';
import { prefetchDishImages } from '@/components/smart-image';
import { SwipeCard } from '@/components/swipe-card';
import { useCrave } from '@/context/crave-context';
import { shareDish } from '@/services/sharing';
import { colors, radius, shadow, spacing } from '@/theme';
import { Dish, SwipeChoice } from '@/types';

const SESSION_LENGTH = 8;

export default function SwipeScreen() {
  const store = useCrave();
  const deck = useMemo(() => store.recommendations.slice(0, SESSION_LENGTH), [store.recommendations]);
  const [index, setIndex] = useState(0);
  const [details, setDetails] = useState<Dish | null>(null);
  const current = deck[index];

  // Warm only the next couple of cards, never the whole catalogue.
  useEffect(() => {
    prefetchDishImages(deck.slice(index + 1, index + 3).flatMap((dish) => dish.images.map((image) => image.url)), 4);
  }, [deck, index]);

  const choose = (choice: SwipeChoice) => {
    if (!current) return;
    store.recordSwipe(current.id, choice);
    Haptics.impactAsync(choice === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (index >= deck.length - 1) router.replace('/results');
    else setIndex((value) => value + 1);
  };

  const relaxedNote = store.deckUsedFallback
    ? 'Those filters were strict, so here are the closest matches.'
    : store.deckRelaxed.length
      ? `Showing the closest matches — we eased the ${store.deckRelaxed.join(' and ')} filter${store.deckRelaxed.length > 1 ? 's' : ''}.`
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandHeader />
      <View style={styles.top}>
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>FOLLOW YOUR GUT</Text>
          <Text style={styles.heading}>What looks good?</Text>
        </View>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{Math.min(index + 1, deck.length)} / {deck.length}</Text>
        </View>
      </View>
      {relaxedNote && <Text style={styles.relaxed}>{relaxedNote}</Text>}
      <View style={styles.deck}>
        {deck[index + 1] && <View style={styles.behind} />}
        {current && <SwipeCard key={current.id} dish={current} onSwipe={choose} onOpenDetails={() => setDetails(current)} />}
      </View>
      <Text style={styles.hint}>SWIPE LEFT TO PASS  ·  RIGHT TO LIKE  ·  TAP EDGES FOR MORE PHOTOS</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={() => choose('pass')} style={({ pressed }) => [styles.action, styles.pass, pressed && styles.pressed]}>
          <Text style={styles.x}>×</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="I've seen enough, show results" onPress={() => router.replace('/results')} style={styles.done}>
          <Text style={styles.doneText}>I’ve seen enough</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Like" onPress={() => choose('like')} style={({ pressed }) => [styles.action, styles.like, pressed && styles.pressed]}>
          <Text style={styles.heart}>♥</Text>
        </Pressable>
      </View>
      <DishDetails
        dish={details}
        visible={details !== null}
        onClose={() => setDetails(null)}
        onFindNearby={(dish) => { setDetails(null); router.push({ pathname: '/nearby', params: { dishId: dish.id } }); }}
        onShare={(dish) => shareDish(dish)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.lg, backgroundColor: colors.cream },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5, marginBottom: 10, gap: 12 },
  topCopy: { flex: 1 },
  kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.8 },
  heading: { color: colors.charcoal, fontSize: 24, fontWeight: '800', marginTop: 3 },
  progress: { backgroundColor: colors.coralSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  progressText: { color: colors.coral, fontWeight: '800', fontSize: 12 },
  relaxed: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 },
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
});
