import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCrave } from '@/context/crave-context';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { hydrated, hasOnboarded, completeOnboarding } = useCrave();
  const [starting, setStarting] = useState(false);

  if (!hydrated) return <View style={styles.loading}><ActivityIndicator color={colors.coral} /></View>;
  // Returning users go straight to preferences — but not while we are actively
  // sending a first-time user to signup, or the redirect would win the race.
  if (hasOnboarded && !starting) return <Redirect href="/preferences" />;

  const start = async () => {
    if (starting) return;
    setStarting(true);
    router.replace({ pathname: '/auth', params: { mode: 'signup' } });
    await completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <Image source="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=90" style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(25,20,16,0.04)', 'rgba(25,20,16,0.2)', 'rgba(20,16,12,0.92)']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.brand}><View style={styles.brandDot} /><Text style={styles.brandText}>CRAVE</Text></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>DINNER, DECIDED.</Text>
          <Text style={styles.title}>Swipe until{`\n`}it feels right.</Text>
          <Text style={styles.subtitle}>Skip the endless search. Follow your appetite, one beautiful plate at a time.</Text>
          <Pressable onPress={start} disabled={starting} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Start craving</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
          <Text style={styles.note}>No account needed</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.charcoal }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: spacing.sm }, brandDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral }, brandText: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 3 }, copy: { maxWidth: 520 }, eyebrow: { color: '#FFD2C7', fontSize: 12, fontWeight: '800', letterSpacing: 2.2, marginBottom: 14 }, title: { color: colors.white, fontSize: 49, lineHeight: 52, letterSpacing: -2, fontFamily: fonts.serif, fontWeight: '700' }, subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 17, lineHeight: 25, marginTop: 18, marginBottom: 28, maxWidth: 380 }, button: { height: 62, borderRadius: radius.full, backgroundColor: colors.coral, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 }, buttonText: { color: colors.white, fontWeight: '800', fontSize: 17 }, arrow: { color: colors.white, fontSize: 27, marginTop: -3 }, note: { color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 13, fontSize: 12 } });
