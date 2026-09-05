import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { SwipeCard } from '@/components/swipe-card';
import { useCrave } from '@/context/crave-context';
import { colors, radius, shadow, spacing } from '@/theme';
import { SwipeChoice } from '@/types';

const SESSION_LENGTH = 8;
export default function SwipeScreen() {
  const store = useCrave();
  const [deck] = useState(() => store.recommendations.slice(0, SESSION_LENGTH));
  const [index, setIndex] = useState(0);
  const current = deck[index];
  const choose = (choice: SwipeChoice) => {
    if (!current) return;
    store.recordSwipe(current.id, choice);
    Haptics.impactAsync(choice === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (index >= deck.length - 1) router.replace('/results'); else setIndex((value) => value + 1);
  };
  return <SafeAreaView style={styles.safe}><BrandHeader /><View style={styles.top}><View><Text style={styles.kicker}>FOLLOW YOUR GUT</Text><Text style={styles.heading}>What looks good?</Text></View><View style={styles.progress}><Text style={styles.progressText}>{Math.min(index + 1, deck.length)} / {deck.length}</Text></View></View><View style={styles.deck}>{deck[index + 1] && <View style={styles.behind} />}{current && <SwipeCard key={current.id} dish={current} onSwipe={choose} />}</View><Text style={styles.hint}>SWIPE LEFT TO PASS  ·  RIGHT TO LIKE</Text><View style={styles.actions}><Pressable accessibilityLabel="Pass" onPress={() => choose('pass')} style={({ pressed }) => [styles.action, styles.pass, pressed && styles.pressed]}><Text style={styles.x}>×</Text></Pressable><Pressable onPress={() => router.replace('/results')} style={styles.done}><Text style={styles.doneText}>I’ve seen enough</Text></Pressable><Pressable accessibilityLabel="Like" onPress={() => choose('like')} style={({ pressed }) => [styles.action, styles.like, pressed && styles.pressed]}><Text style={styles.heart}>♥</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, paddingHorizontal: spacing.lg, backgroundColor: colors.cream }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5, marginBottom: 15 }, kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.8 }, heading: { color: colors.charcoal, fontSize: 24, fontWeight: '800', marginTop: 3 }, progress: { backgroundColor: colors.coralSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full }, progressText: { color: colors.coral, fontWeight: '800', fontSize: 12 }, deck: { flex: 1, position: 'relative', marginHorizontal: 2, marginBottom: 12 }, behind: { position: 'absolute', backgroundColor: '#E8DCD0', left: 10, right: 10, top: 8, bottom: -7, borderRadius: radius.lg, transform: [{ scale: 0.97 }] }, hint: { textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.15, marginVertical: 8 }, actions: { minHeight: 78, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, paddingBottom: 7 }, action: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, ...shadow }, pass: { borderWidth: 1, borderColor: colors.line }, like: { backgroundColor: colors.coral }, pressed: { transform: [{ scale: 0.93 }] }, x: { color: colors.muted, fontSize: 38, fontWeight: '300', marginTop: -5 }, heart: { color: colors.white, fontSize: 24 }, done: { paddingHorizontal: 4, paddingVertical: 16 }, doneText: { color: colors.sage, fontWeight: '800', fontSize: 12 } });
