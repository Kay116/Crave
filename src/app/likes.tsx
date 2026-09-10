import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '@/components/brand-header';
import { DishDetails } from '@/components/dish-details';
import { SmartImage } from '@/components/smart-image';
import { useCrave } from '@/context/crave-context';
import { shareDish } from '@/services/sharing';
import { colors, fonts, radius, spacing } from '@/theme';
import { Dish } from '@/types';

export default function LikesScreen() {
  const store = useCrave();
  const [details, setDetails] = useState<Dish | null>(null);
  return <SafeAreaView style={styles.safe}>
    <BrandHeader showLikes={false} />
    <View style={styles.headingRow}><View><Text style={styles.kicker}>YOUR SHORTLIST</Text><Text style={styles.title}>Saved cravings</Text></View><View style={styles.count}><Text style={styles.countText}>{store.likedDishes.length}</Text></View></View>
    {store.likedDishes.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>♡</Text><Text style={styles.emptyTitle}>Nothing saved yet</Text><Text style={styles.emptyText}>Swipe right on anything that makes you hungry. It’ll wait for you here.</Text><Pressable onPress={() => router.replace('/preferences')} style={styles.discover}><Text style={styles.discoverText}>Find something delicious</Text></Pressable></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      {store.likedDishes.map((dish) => <View key={dish.id} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${dish.name}`} onPress={() => setDetails(dish)}>
          <SmartImage uri={dish.images[0]?.url ?? dish.image} alt={dish.images[0]?.alt ?? dish.name} style={styles.image} />
        </Pressable>
        <View style={styles.cardCopy}><Text style={styles.cuisine}>{dish.cuisine.toUpperCase()}</Text><Text style={styles.name} numberOfLines={2}>{dish.name}</Text><Text style={styles.meta}>{'$'.repeat(Math.max(1, dish.price))}  ·  {dish.time} min</Text><View style={styles.cardActions}><Pressable accessibilityRole="button" accessibilityLabel={`Find ${dish.name} nearby`} onPress={() => router.push({ pathname: '/nearby', params: { dishId: dish.id } })} style={styles.nearby}><Text style={styles.nearbyText}>⌖ Nearby</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Share ${dish.name}`} onPress={() => shareDish(dish)} style={styles.shareChip}><Text style={styles.shareChipText}>Share</Text></Pressable></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${dish.name} from saved`} onPress={() => store.toggleLike(dish.id)} style={styles.remove}><Text style={styles.removeText}>♥</Text></Pressable>
      </View>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Find more food" onPress={() => router.replace('/preferences')} style={styles.more}><Text style={styles.moreText}>Find more food</Text></Pressable>
    </ScrollView>}
    <DishDetails
      dish={details}
      visible={details !== null}
      onClose={() => setDetails(null)}
      onFindNearby={(dish) => { setDetails(null); router.push({ pathname: '/nearby', params: { dishId: dish.id } }); }}
      onShare={(dish) => shareDish(dish)}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15, marginBottom: 20 }, kicker: { color: colors.coral, fontWeight: '900', fontSize: 10, letterSpacing: 1.8 }, title: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 35, marginTop: 5 }, count: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.coralSoft, justifyContent: 'center', alignItems: 'center' }, countText: { color: colors.coral, fontWeight: '900' }, list: { gap: 12, paddingBottom: 35 }, card: { minHeight: 130, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, padding: 9, flexDirection: 'row', alignItems: 'center' }, image: { width: 112, height: 112, borderRadius: radius.sm }, cardCopy: { flex: 1, paddingHorizontal: 13 }, cuisine: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, name: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 19, marginTop: 4, paddingRight: 23 }, meta: { color: colors.muted, fontSize: 11, marginTop: 5 }, cardActions: { flexDirection: 'row', gap: 7, marginTop: 11, flexWrap: 'wrap' }, nearby: { backgroundColor: colors.sageSoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 7 }, nearbyText: { color: colors.sage, fontSize: 10, fontWeight: '900' }, shareChip: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 7 }, shareChipText: { color: colors.charcoal, fontSize: 10, fontWeight: '900' }, remove: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, removeText: { color: colors.coral, fontSize: 16 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 70 }, emptyEmoji: { color: colors.coral, fontSize: 58 }, emptyTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 26, marginTop: 10 }, emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8 }, discover: { backgroundColor: colors.coral, borderRadius: radius.full, paddingHorizontal: 22, paddingVertical: 15, marginTop: 24 }, discoverText: { color: colors.white, fontWeight: '800' }, more: { alignItems: 'center', padding: 17 }, moreText: { color: colors.sage, fontWeight: '800' },
});
