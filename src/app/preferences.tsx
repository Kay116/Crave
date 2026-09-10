import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { useCrave } from '@/context/crave-context';
import { colors, fonts, radius, shadow, spacing } from '@/theme';
import { Cuisine, DietaryTag, Fullness, MealType, Mood, Protein, Temperature, Texture } from '@/types';

const moodOptions: { id: Mood; emoji: string; label: string }[] = [
  { id: 'spicy', emoji: '🌶️', label: 'Spicy' }, { id: 'soupy', emoji: '🍜', label: 'Soupy' },
  { id: 'crispy', emoji: '✨', label: 'Crispy' }, { id: 'cheesy', emoji: '🧀', label: 'Cheesy' },
  { id: 'fresh', emoji: '🥬', label: 'Fresh' }, { id: 'comfort', emoji: '🤎', label: 'Comfort' },
  { id: 'sweet', emoji: '🍯', label: 'Sweet' }, { id: 'smoky', emoji: '🔥', label: 'Smoky' },
];
const cuisineOptions: Cuisine[] = [
  'Italian', 'Japanese', 'Mexican', 'Thai', 'American', 'Mediterranean',
  'Indian', 'Korean', 'Chinese', 'Vietnamese', 'Caribbean', 'Middle Eastern',
];
const textureOptions: Texture[] = ['crispy', 'crunchy', 'creamy', 'silky', 'chewy', 'juicy'];
const mealOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
const proteinOptions: Protein[] = ['chicken', 'beef', 'pork', 'seafood', 'tofu', 'beans'];
const dietaryOptions: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal'];

function toggle<T>(item: T, items: T[]): T[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function ChipGroup<T extends string>({ label, options, selected, onToggle }: {
  label: string; options: T[]; selected: T[]; onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${option}`}
              onPress={() => onToggle(option)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Segmented<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T | null; onChange: (value: T | null) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${option.label}`}
              onPress={() => onChange(active ? null : option.value)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function PreferencesScreen() {
  const store = useCrave();
  const [moods, setMoods] = useState<Mood[]>(store.moods);
  const [cuisines, setCuisines] = useState<Cuisine[]>(store.cuisines);
  const [textures, setTextures] = useState<Texture[]>((store.filters.textures ?? []) as Texture[]);
  const [meals, setMeals] = useState<MealType[]>((store.filters.mealTypes ?? []) as MealType[]);
  const [proteins, setProteins] = useState<Protein[]>((store.filters.proteins ?? []) as Protein[]);
  const [dietary, setDietary] = useState<DietaryTag[]>((store.filters.dietary ?? []) as DietaryTag[]);
  const [maxSpice, setMaxSpice] = useState<number | null>(store.filters.maxSpice ?? null);
  const [maxPrice, setMaxPrice] = useState<number | null>(store.filters.maxPrice ?? null);
  const [temperature, setTemperature] = useState<Temperature | null>(store.filters.temperature ?? null);
  const [fullness, setFullness] = useState<Fullness | null>(store.filters.fullness ?? null);
  const [expanded, setExpanded] = useState(false);

  const advancedCount = useMemo(
    () => textures.length + meals.length + proteins.length + dietary.length
      + (maxSpice != null ? 1 : 0) + (maxPrice != null ? 1 : 0) + (temperature ? 1 : 0) + (fullness ? 1 : 0),
    [textures, meals, proteins, dietary, maxSpice, maxPrice, temperature, fullness],
  );

  const go = (surprise = false) => {
    if (surprise) {
      store.setPreferences([], [], {});
    } else {
      store.setPreferences(moods, cuisines, {
        textures, mealTypes: meals, proteins, dietary, maxSpice, maxPrice, temperature, fullness,
      });
    }
    router.push('/swipe');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BrandHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>SET THE VIBE</Text>
        <Text style={styles.title}>What sounds good?</Text>
        <Text style={styles.sub}>Pick anything you’re feeling — or nothing at all. We’ll learn the rest from your swipes.</Text>

        <Text style={styles.section}>YOUR MOOD</Text>
        <View style={styles.grid}>
          {moodOptions.map((item) => {
            const active = moods.includes(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Mood: ${item.label}`}
                onPress={() => setMoods((prev) => toggle(item.id, prev))}
                style={[styles.mood, active && styles.activeMood]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.moodText, active && styles.activeText]}>{item.label}</Text>
                {active && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>ANY CUISINE IN MIND?</Text>
        <View style={styles.chipWrap}>
          {cuisineOptions.map((item) => {
            const active = cuisines.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Cuisine: ${item}`}
                onPress={() => setCuisines((prev) => toggle(item, prev))}
                style={[styles.chip, active && styles.activeChip]}
              >
                <Text style={[styles.chipText, active && styles.activeChipText]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={styles.moreToggle}
        >
          <Text style={styles.moreToggleText}>
            {expanded ? 'Fewer options' : 'More options'}{advancedCount > 0 ? `  ·  ${advancedCount} set` : ''}
          </Text>
          <Text style={styles.moreChevron}>{expanded ? '▲' : '▼'}</Text>
        </Pressable>

        {expanded && (
          <View style={styles.advanced}>
            <ChipGroup label="Texture" options={textureOptions} selected={textures} onToggle={(v) => setTextures((p) => toggle(v, p))} />
            <ChipGroup label="Meal type" options={mealOptions} selected={meals} onToggle={(v) => setMeals((p) => toggle(v, p))} />
            <ChipGroup label="Protein" options={proteinOptions} selected={proteins} onToggle={(v) => setProteins((p) => toggle(v, p))} />
            <ChipGroup label="Dietary preference" options={dietaryOptions} selected={dietary} onToggle={(v) => setDietary((p) => toggle(v, p))} />
            <Segmented
              label="Spice level"
              value={maxSpice}
              onChange={setMaxSpice}
              options={[{ value: 0, label: 'None' }, { value: 1, label: 'Mild' }, { value: 2, label: 'Medium' }, { value: 3, label: 'Hot' }]}
            />
            <Segmented
              label="Price level"
              value={maxPrice}
              onChange={setMaxPrice}
              options={[{ value: 1, label: '$' }, { value: 2, label: '$$' }, { value: 3, label: '$$$' }]}
            />
            <Segmented
              label="Light vs filling"
              value={fullness}
              onChange={setFullness}
              options={[{ value: 'light', label: 'Light' }, { value: 'filling', label: 'Filling' }]}
            />
            <Segmented
              label="Hot vs cold"
              value={temperature}
              onChange={setTemperature}
              options={[{ value: 'hot', label: 'Hot' }, { value: 'cold', label: 'Cold' }]}
            />
            <Text style={styles.dietaryNote}>Dietary tags help you discover options — they aren’t allergy or medical advice.</Text>
          </View>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Show me the food" onPress={() => go()} style={styles.primary}>
          <Text style={styles.primaryText}>Show me the food</Text>
          <Text style={styles.primaryText}>→</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Surprise me" onPress={() => go(true)} style={styles.surprise}>
          <Text style={styles.surpriseText}>✦  Surprise me</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg },
  content: { paddingBottom: 36 },
  kicker: { marginTop: 14, color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 44, color: colors.charcoal, fontWeight: '700', marginTop: 6 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 460 },
  section: { color: colors.muted, fontSize: 10, letterSpacing: 1.8, fontWeight: '900', marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  mood: { width: '47%', flexGrow: 1, minHeight: 88, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 15, justifyContent: 'space-between' },
  activeMood: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  emoji: { fontSize: 22 },
  moodText: { color: colors.charcoal, fontWeight: '700', fontSize: 15 },
  activeText: { color: '#A83A24' },
  check: { position: 'absolute', right: 11, top: 11, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.full, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  activeChip: { backgroundColor: colors.sage, borderColor: colors.sage },
  chipText: { color: colors.charcoal, fontWeight: '700' },
  activeChipText: { color: colors.white },
  moreToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  moreToggleText: { color: colors.charcoal, fontWeight: '800', fontSize: 13 },
  moreChevron: { color: colors.muted, fontSize: 11 },
  advanced: { marginTop: 6 },
  filterBlock: { marginTop: 18 },
  filterLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  filterChipActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  filterChipText: { color: colors.charcoal, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  filterChipTextActive: { color: colors.white },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { flexGrow: 1, minWidth: 64, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  segmentActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  segmentText: { color: colors.charcoal, fontWeight: '800', fontSize: 12 },
  segmentTextActive: { color: colors.white },
  dietaryNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 16 },
  primary: { marginTop: 28, height: 60, borderRadius: radius.full, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 23, ...shadow },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  surprise: { alignItems: 'center', paddingVertical: 17 },
  surpriseText: { color: colors.sage, fontWeight: '800', fontSize: 14 },
});
