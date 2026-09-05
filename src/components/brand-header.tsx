import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export function BrandHeader({ showLikes = true }: { showLikes?: boolean }) {
  return <View style={styles.row}><Pressable onPress={() => router.replace('/preferences')} style={styles.brand}><View style={styles.dot} /><Text style={styles.logo}>CRAVE</Text></Pressable>{showLikes && <Pressable accessibilityLabel="Saved dishes" onPress={() => router.push('/likes')} style={styles.saved}><Text style={styles.heart}>♥</Text></Pressable>}</View>;
}
const styles = StyleSheet.create({ row: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral }, logo: { color: colors.charcoal, fontWeight: '900', letterSpacing: 2.7, fontSize: 15 }, saved: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, heart: { color: colors.coral, fontSize: 20, marginTop: -1 } });
