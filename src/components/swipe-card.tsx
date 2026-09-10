/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps */
// React Native Animated values intentionally live in refs so gestures do not trigger renders.
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SmartImage } from '@/components/smart-image';
import { colors, fonts, radius, shadow, spacing } from '@/theme';
import { Dish, SwipeChoice } from '@/types';

export function PhotoDots({ count, index }: { count: number; index: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dots} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  );
}

export function SwipeCard({
  dish,
  onSwipe,
  onOpenDetails,
}: {
  dish: Dish;
  onSwipe: (choice: SwipeChoice) => void;
  onOpenDetails?: () => void;
}) {
  const { width } = useWindowDimensions();
  const threshold = Math.min(120, Math.max(64, width * 0.28));
  const position = useRef(new Animated.ValueXY()).current;
  const [photo, setPhoto] = useState(0);
  const images = dish.images.length ? dish.images : [{ url: dish.image, alt: dish.name }];
  const current = images[Math.min(photo, images.length - 1)];

  const rotate = position.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = position.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const finish = (choice: SwipeChoice) =>
    Animated.timing(position, {
      toValue: { x: choice === 'like' ? width * 1.4 : -width * 1.4, y: 25 },
      duration: 240,
      useNativeDriver: true,
    }).start(() => onSwipe(choice));

  const step = (delta: number) => setPhoto((value) => (value + delta + images.length) % images.length);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture on a real horizontal drag, so taps still reach
        // the photo zones and the details button.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (g.dx > threshold) finish('like');
          else if (g.dx < -threshold) finish('pass');
          else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
        },
      }),
    [dish.id, threshold],
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
    >
      <SmartImage uri={current.url} alt={current.alt} style={StyleSheet.absoluteFill} recyclingKey={`${dish.id}-${photo}`} />
      <LinearGradient colors={['rgba(17,14,12,0.28)', 'transparent', 'rgba(17,14,12,0.9)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      {images.length > 1 && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
            onPress={() => step(-1)}
            style={[styles.photoZone, styles.photoZoneLeft]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next photo"
            onPress={() => step(1)}
            style={[styles.photoZone, styles.photoZoneRight]}
          />
        </>
      )}

      <View style={styles.topRow} pointerEvents="box-none">
        <PhotoDots count={images.length} index={Math.min(photo, images.length - 1)} />
        {onOpenDetails && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More about ${dish.name}`}
            onPress={onOpenDetails}
            style={styles.infoButton}
          >
            <Text style={styles.infoButtonText}>Details</Text>
          </Pressable>
        )}
      </View>

      <Animated.View style={[styles.stamp, styles.yum, { opacity: likeOpacity }]}>
        <Text style={styles.yumText}>YUM</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.pass, { opacity: passOpacity }]}>
        <Text style={styles.passText}>PASS</Text>
      </Animated.View>

      <View style={styles.info} pointerEvents="none">
        <View style={styles.meta}>
          <Text style={styles.cuisine}>{dish.cuisine.toUpperCase()}</Text>
          <Text style={styles.dotSep}>•</Text>
          <Text style={styles.metaText}>{'$'.repeat(Math.max(1, dish.price))}</Text>
          <Text style={styles.dotSep}>•</Text>
          <Text style={styles.metaText}>{dish.time} min</Text>
          {dish.spiceLevel > 0 && (
            <>
              <Text style={styles.dotSep}>•</Text>
              <Text style={styles.metaText}>{'🌶️'.repeat(Math.min(3, dish.spiceLevel))}</Text>
            </>
          )}
        </View>
        <Text style={styles.name}>{dish.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{dish.description}</Text>
        <View style={styles.tags}>
          {dish.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', width: '100%', height: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.charcoal, ...shadow },
  photoZone: { position: 'absolute', top: 0, bottom: '32%', width: '34%' },
  photoZoneLeft: { left: 0 },
  photoZoneRight: { right: 0 },
  topRow: { position: 'absolute', top: 14, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.white, width: 18 },
  infoButton: { backgroundColor: 'rgba(17,14,12,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  infoButtonText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  info: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' },
  cuisine: { color: '#FFD2C7', fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  dotSep: { color: 'rgba(255,255,255,.45)' },
  metaText: { color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: '600' },
  name: { color: colors.white, fontSize: 32, lineHeight: 36, fontFamily: fonts.serif, fontWeight: '700' },
  description: { color: 'rgba(255,255,255,.78)', fontSize: 13, lineHeight: 19, marginTop: 7 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  tag: { backgroundColor: 'rgba(255,255,255,.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', maxWidth: '46%' },
  tagText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  stamp: { position: 'absolute', top: 46, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 3, borderRadius: 9, transform: [{ rotate: '-9deg' }] },
  yum: { left: 24, borderColor: '#D5FFB9' },
  pass: { right: 24, borderColor: '#FFD4CC', transform: [{ rotate: '9deg' }] },
  yumText: { color: '#D5FFB9', fontWeight: '900', fontSize: 24, letterSpacing: 2 },
  passText: { color: '#FFD4CC', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
});
