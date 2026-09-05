import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { useCrave } from '@/context/crave-context';
import { colors, fonts, radius, shadow, spacing } from '@/theme';
import { Cuisine, Mood } from '@/types';

const moodOptions: { id: Mood; emoji: string; label: string }[] = [
  { id: 'spicy', emoji: '🌶️', label: 'Spicy' }, { id: 'soupy', emoji: '🍜', label: 'Soupy' },
  { id: 'crispy', emoji: '✨', label: 'Crispy' }, { id: 'cheesy', emoji: '🧀', label: 'Cheesy' },
  { id: 'fresh', emoji: '🥬', label: 'Fresh' }, { id: 'comfort', emoji: '🤎', label: 'Comfort' },
  { id: 'sweet', emoji: '🍯', label: 'Sweet' }, { id: 'smoky', emoji: '🔥', label: 'Smoky' },
];
const cuisineOptions: Cuisine[] = ['Italian','Japanese','Mexican','Thai','American','Mediterranean','Indian','Korean'];

export default function PreferencesScreen() {
  const store = useCrave();
  const [moods, setMoods] = useState<Mood[]>(store.moods);
  const [cuisines, setCuisines] = useState<Cuisine[]>(store.cuisines);
  const toggle = <T,>(item: T, items: T[], setter: (next: T[]) => void) => setter(items.includes(item) ? items.filter((x) => x !== item) : [...items, item]);
  const go = (surprise = false) => { store.setPreferences(surprise ? [] : moods, surprise ? [] : cuisines); router.push('/swipe'); };
  return <SafeAreaView style={styles.safe}><BrandHeader /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><Text style={styles.kicker}>SET THE VIBE</Text><Text style={styles.title}>What sounds good?</Text><Text style={styles.sub}>Pick anything you’re feeling. We’ll learn the rest from your swipes.</Text><Text style={styles.section}>YOUR MOOD</Text><View style={styles.grid}>{moodOptions.map((item) => { const active = moods.includes(item.id); return <Pressable key={item.id} onPress={() => toggle(item.id, moods, setMoods)} style={[styles.mood, active && styles.activeMood]}><Text style={styles.emoji}>{item.emoji}</Text><Text style={[styles.moodText, active && styles.activeText]}>{item.label}</Text>{active && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}</Pressable>; })}</View><Text style={styles.section}>ANY CUISINE IN MIND?</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{cuisineOptions.map((item) => { const active = cuisines.includes(item); return <Pressable key={item} onPress={() => toggle(item, cuisines, setCuisines)} style={[styles.chip, active && styles.activeChip]}><Text style={[styles.chipText, active && styles.activeChipText]}>{item}</Text></Pressable>; })}</ScrollView><Pressable onPress={() => go()} style={styles.primary}><Text style={styles.primaryText}>Show me the food</Text><Text style={styles.primaryText}>→</Text></Pressable><Pressable onPress={() => go(true)} style={styles.surprise}><Text style={styles.surpriseText}>✦  Surprise me</Text></Pressable></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg }, content: { paddingBottom: 36 }, kicker: { marginTop: 14, color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 2 }, title: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 44, color: colors.charcoal, fontWeight: '700', marginTop: 6 }, sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 430 }, section: { color: colors.muted, fontSize: 10, letterSpacing: 1.8, fontWeight: '900', marginTop: 28, marginBottom: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 }, mood: { width: '48%', minHeight: 91, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 15, justifyContent: 'space-between' }, activeMood: { backgroundColor: colors.coralSoft, borderColor: colors.coral }, emoji: { fontSize: 23 }, moodText: { color: colors.charcoal, fontWeight: '700', fontSize: 15 }, activeText: { color: '#A83A24' }, check: { position: 'absolute', right: 11, top: 11, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }, checkText: { color: colors.white, fontWeight: '900', fontSize: 12 }, chips: { gap: 9, paddingRight: 4 }, chip: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: radius.full, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line }, activeChip: { backgroundColor: colors.sage, borderColor: colors.sage }, chipText: { color: colors.charcoal, fontWeight: '700' }, activeChipText: { color: colors.white }, primary: { marginTop: 29, height: 60, borderRadius: radius.full, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 23, ...shadow }, primaryText: { color: colors.white, fontWeight: '800', fontSize: 16 }, surprise: { alignItems: 'center', paddingVertical: 17 }, surpriseText: { color: colors.sage, fontWeight: '800', fontSize: 14 } });
