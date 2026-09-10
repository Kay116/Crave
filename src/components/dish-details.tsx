import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SmartImage } from '@/components/smart-image';
import { colors, fonts, radius, spacing } from '@/theme';
import { Dish } from '@/types';

function Chips({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <View style={styles.chipBlock}>
      <Text style={styles.chipLabel}>{label.toUpperCase()}</Text>
      <View style={styles.chipRow}>
        {values.map((value) => (
          <View key={value} style={styles.chip}>
            <Text style={styles.chipText}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function DishDetails({
  dish,
  visible,
  onClose,
  onFindNearby,
  onShare,
}: {
  dish: Dish | null;
  visible: boolean;
  onClose: () => void;
  onFindNearby?: (dish: Dish) => void;
  onShare?: (dish: Dish) => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  if (!dish) return null;
  const carouselWidth = Math.min(width, 560);
  const images = dish.images.length ? dish.images : [{ url: dish.image, alt: dish.name }];
  const attribution = images[Math.min(page, images.length - 1)];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxWidth: 560 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={{ height: 260 }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / carouselWidth))}
              >
                {images.map((image, index) => (
                  <SmartImage
                    key={`${dish.id}-detail-${index}`}
                    uri={image.url}
                    alt={image.alt}
                    style={{ width: carouselWidth, height: 260 }}
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === Math.min(page, images.length - 1) && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.body}>
              <Text style={styles.kicker}>{dish.cuisine.toUpperCase()}</Text>
              <Text style={styles.title}>{dish.name}</Text>
              <Text style={styles.meta}>
                {'$'.repeat(Math.max(1, dish.price))} · {dish.time} min
                {dish.spiceLevel > 0 ? ` · spice ${dish.spiceLevel}/4` : ''}
              </Text>
              <Text style={styles.description}>{dish.description}</Text>

              <Chips label="Mood" values={dish.moods} />
              <Chips label="Texture" values={dish.textures} />
              <Chips label="Good for" values={dish.mealTypes} />
              <Chips label="Dietary notes" values={dish.dietaryTags} />

              {dish.dietaryTags.length > 0 && (
                <Text style={styles.disclaimer}>
                  Dietary tags are a discovery aid, not a guarantee — check with the restaurant for allergies.
                </Text>
              )}

              {(attribution.sourceName || attribution.photographer) && (
                <Text style={styles.attribution}>
                  Photo: {[attribution.photographer, attribution.sourceName].filter(Boolean).join(' · ')}
                </Text>
              )}

              <View style={styles.actions}>
                {onFindNearby && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Find ${dish.name} nearby`} onPress={() => onFindNearby(dish)} style={styles.primary}>
                    <Text style={styles.primaryText}>⌖  Find nearby</Text>
                  </Pressable>
                )}
                {onShare && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Share ${dish.name}`} onPress={() => onShare(dish)} style={styles.secondary}>
                    <Text style={styles.secondaryText}>Share</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,14,12,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '92%', width: '100%', alignSelf: 'center', overflow: 'hidden' },
  handleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line },
  close: { position: 'absolute', right: 12, top: 4, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  closeText: { fontSize: 24, color: colors.charcoal, marginTop: -3 },
  content: { paddingBottom: 30 },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: colors.white, width: 18 },
  body: { padding: spacing.lg },
  kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.6 },
  title: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 30, marginTop: 5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6, fontWeight: '700' },
  description: { color: colors.charcoal, fontSize: 15, lineHeight: 22, marginTop: 12 },
  chipBlock: { marginTop: 16 },
  chipLabel: { color: colors.muted, fontWeight: '900', fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: colors.charcoal, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14 },
  attribution: { color: colors.muted, fontSize: 10, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  primary: { flex: 1, backgroundColor: colors.coral, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  secondary: { borderWidth: 1, borderColor: colors.charcoal, borderRadius: radius.full, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' },
  secondaryText: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
});
