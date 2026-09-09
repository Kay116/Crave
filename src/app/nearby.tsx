import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dishes } from '@/data/dishes';
import { Coordinates, findRestaurantsForDish, formatPrice, PlacesConfigurationError, Restaurant } from '@/services/places';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

type SearchState = 'ready' | 'locating' | 'searching' | 'done' | 'error' | 'permission';
const radiusOptions = [3, 5, 10];

export default function NearbyScreen() {
  const params = useLocalSearchParams<{ dishId?: string }>();
  const dish = dishes.find((item) => item.id === params.dishId) ?? dishes[0];
  const [status, setStatus] = useState<SearchState>('ready');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [area, setArea] = useState('Your current location');
  const [message, setMessage] = useState('');

  const search = async (requestedRadius = radiusKm, knownOrigin = origin) => {
    try {
      let coordinates = knownOrigin;
      if (!coordinates) {
        setStatus('locating');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) { setStatus('permission'); return; }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setOrigin(coordinates);
        Location.reverseGeocodeAsync(coordinates).then(([place]) => {
          if (place) setArea([place.city, place.region].filter(Boolean).join(', ') || 'Near you');
        }).catch(() => {});
      }
      setStatus('searching');
      setMessage('');
      const places = await findRestaurantsForDish(dish.name, coordinates, requestedRadius);
      setRestaurants(places);
      setStatus('done');
    } catch (error) {
      setMessage(error instanceof PlacesConfigurationError ? 'Add your Google Places API key to the .env file, then restart Expo.' : error instanceof Error ? error.message : 'Restaurant search failed. Please try again.');
      setStatus('error');
    }
  };

  const changeRadius = (next: number) => { setRadiusKm(next); if (origin) search(next, origin); };
  const loading = status === 'locating' || status === 'searching';

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={styles.headerCopy}><Text style={styles.headerKicker}>NEARBY FOR</Text><Text numberOfLines={1} style={styles.headerTitle}>{dish.name}</Text></View><Image source={dish.image} style={styles.thumb} contentFit="cover" /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.locationRow}><View style={styles.pin}><Text style={styles.pinText}>⌖</Text></View><View style={styles.locationCopy}><Text style={styles.locationLabel}>SEARCHING AROUND</Text><Text style={styles.locationText}>{area}</Text></View></View>
      <View style={styles.radiusRow}>{radiusOptions.map((option) => <Pressable key={option} onPress={() => changeRadius(option)} disabled={loading} style={[styles.radiusChip, radiusKm === option && styles.radiusActive]}><Text style={[styles.radiusText, radiusKm === option && styles.radiusTextActive]}>{option} km</Text></Pressable>)}</View>

      {status === 'ready' && <View style={styles.intro}><Text style={styles.introIcon}>⌖</Text><Text style={styles.introTitle}>Find the real thing</Text><Text style={styles.introText}>Use your location to find nearby restaurants that may serve {dish.name.toLowerCase()}, with live Google ratings and price levels.</Text><Pressable onPress={() => search()} style={styles.primary}><Text style={styles.primaryText}>Use my location</Text><Text style={styles.primaryText}>→</Text></Pressable><Text style={styles.privacy}>Your coordinates are used for this search and aren’t stored.</Text></View>}
      {loading && <View style={styles.loading}><ActivityIndicator size="large" color={colors.coral} /><Text style={styles.loadingTitle}>{status === 'locating' ? 'Finding you…' : 'Checking nearby kitchens…'}</Text><Text style={styles.loadingText}>Looking for the closest matches within {radiusKm} km.</Text></View>}
      {status === 'permission' && <View style={styles.notice}><Text style={styles.noticeIcon}>◎</Text><Text style={styles.noticeTitle}>Location is turned off</Text><Text style={styles.noticeText}>{Platform.OS === 'web' ? 'Allow location for this site from your browser’s address-bar controls, then try again.' : 'Allow location access in your device settings so Crave can search nearby.'}</Text><Pressable onPress={() => Platform.OS === 'web' ? search() : Linking.openSettings()} style={styles.outline}><Text style={styles.outlineText}>{Platform.OS === 'web' ? 'Try again' : 'Open settings'}</Text></Pressable></View>}
      {status === 'error' && <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><Text style={styles.noticeTitle}>We couldn’t search yet</Text><Text style={styles.noticeText}>{message}</Text><Pressable onPress={() => search()} style={styles.outline}><Text style={styles.outlineText}>Try again</Text></Pressable></View>}
      {status === 'done' && <><View style={styles.resultHeader}><Text style={styles.resultCount}>{restaurants.length} {restaurants.length === 1 ? 'PLACE' : 'PLACES'} FOUND</Text><Text style={styles.powered}>Live Google Places data</Text></View>{restaurants.length === 0 ? <View style={styles.notice}><Text style={styles.noticeIcon}>◇</Text><Text style={styles.noticeTitle}>No close matches</Text><Text style={styles.noticeText}>Try a wider radius, or search for another saved dish.</Text></View> : restaurants.map((restaurant, index) => <View key={restaurant.id} style={styles.card}><View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View><View style={styles.cardBody}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{restaurant.name}</Text><Text style={styles.distance}>{restaurant.distanceKm < 1 ? `${Math.round(restaurant.distanceKm * 1000)} m` : `${restaurant.distanceKm.toFixed(1)} km`}</Text></View><Text style={styles.category}>{restaurant.category}</Text><View style={styles.stats}>{restaurant.rating !== null && <View style={styles.rating}><Text style={styles.star}>★</Text><Text style={styles.ratingValue}>{restaurant.rating.toFixed(1)}</Text><Text style={styles.reviews}>({restaurant.reviewCount.toLocaleString()})</Text></View>}<Text style={styles.price}>{formatPrice(restaurant.priceLevel)}</Text>{restaurant.isOpen !== null && <Text style={[styles.open, !restaurant.isOpen && styles.closed]}>{restaurant.isOpen ? 'Open now' : 'Closed'}</Text>}</View><Text numberOfLines={2} style={styles.address}>{restaurant.address}</Text><Pressable onPress={() => Linking.openURL(restaurant.mapsUrl)} style={styles.mapsButton}><Text style={styles.mapsText}>View in Google Maps</Text><Text style={styles.mapsArrow}>↗</Text></Pressable></View></View>)}</>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, header: { height: 72, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, backText: { color: colors.charcoal, fontSize: 30, lineHeight: 32, marginTop: -3 }, headerCopy: { flex: 1 }, headerKicker: { color: colors.coral, fontWeight: '900', fontSize: 9, letterSpacing: 1.4 }, headerTitle: { color: colors.charcoal, fontWeight: '800', fontSize: 16, marginTop: 2 }, thumb: { width: 45, height: 45, borderRadius: 14 }, content: { padding: spacing.lg, paddingBottom: 40 }, locationRow: { flexDirection: 'row', alignItems: 'center' }, pin: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }, pinText: { color: colors.sage, fontSize: 22, fontWeight: '900' }, locationCopy: { marginLeft: 11, flex: 1 }, locationLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, locationText: { color: colors.charcoal, fontSize: 17, fontWeight: '800', marginTop: 2 }, radiusRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 18 }, radiusChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper }, radiusActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal }, radiusText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, radiusTextActive: { color: colors.white }, intro: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 28, marginTop: 18 }, introIcon: { color: colors.coral, fontSize: 50 }, introTitle: { fontFamily: fonts.serif, fontSize: 27, color: colors.charcoal, fontWeight: '700', marginTop: 7 }, introText: { color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 9 }, primary: { width: '100%', backgroundColor: colors.coral, height: 56, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 24, ...shadow }, primaryText: { color: colors.white, fontWeight: '800', fontSize: 15 }, privacy: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 13 }, loading: { alignItems: 'center', paddingVertical: 80 }, loadingTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 24, marginTop: 20 }, loadingText: { color: colors.muted, marginTop: 7 }, notice: { alignItems: 'center', backgroundColor: colors.paper, padding: 28, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, marginTop: 24 }, noticeIcon: { color: colors.coral, fontSize: 38, fontWeight: '700' }, noticeTitle: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 23, marginTop: 9 }, noticeText: { color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 8 }, outline: { borderWidth: 1, borderColor: colors.charcoal, borderRadius: radius.full, paddingHorizontal: 22, paddingVertical: 12, marginTop: 20 }, outlineText: { color: colors.charcoal, fontWeight: '800' }, resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }, resultCount: { color: colors.charcoal, fontWeight: '900', fontSize: 10, letterSpacing: 1.4 }, powered: { color: colors.muted, fontSize: 10 }, card: { flexDirection: 'row', gap: 11, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, marginBottom: 11 }, number: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.coral, fontWeight: '900', fontSize: 12 }, cardBody: { flex: 1 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, name: { color: colors.charcoal, fontFamily: fonts.serif, fontWeight: '700', fontSize: 19, flex: 1 }, distance: { color: colors.sage, fontWeight: '900', fontSize: 11 }, category: { color: colors.muted, fontSize: 11, marginTop: 2 }, stats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' }, rating: { flexDirection: 'row', alignItems: 'center', gap: 3 }, star: { color: colors.gold, fontSize: 14 }, ratingValue: { color: colors.charcoal, fontWeight: '900', fontSize: 12 }, reviews: { color: colors.muted, fontSize: 10 }, price: { color: colors.charcoal, fontWeight: '800', fontSize: 11 }, open: { color: colors.sage, fontWeight: '800', fontSize: 11 }, closed: { color: colors.coral }, address: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 9 }, mapsButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11, marginTop: 11 }, mapsText: { color: colors.coral, fontWeight: '800', fontSize: 12 }, mapsArrow: { color: colors.coral, fontSize: 16 },
});
