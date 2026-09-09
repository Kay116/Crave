export type Coordinates = { latitude: number; longitude: number };

type GoogleText = { text?: string };
type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  formattedAddress?: string;
  location?: Coordinates;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri?: string;
  currentOpeningHours?: { openNow?: boolean };
  primaryTypeDisplayName?: GoogleText;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  mapsUrl: string;
  isOpen: boolean | null;
  category: string;
  distanceKm: number;
};

export class PlacesConfigurationError extends Error {}
export class PlacesRequestError extends Error {}

const endpoint = 'https://places.googleapis.com/v1/places:searchText';
const fieldMask = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.priceLevel', 'places.googleMapsUri',
  'places.currentOpeningHours', 'places.primaryTypeDisplayName',
].join(',');

function distanceBetween(a: Coordinates, b: Coordinates) {
  const earthKm = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizePriceLevel(value?: string) {
  const levels: Record<string, number> = {
    PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return value && value in levels ? levels[value] : null;
}

export async function findRestaurantsForDish(dishName: string, origin: Coordinates, radiusKm = 5): Promise<Restaurant[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new PlacesConfigurationError('Google Places API key is not configured.');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
    body: JSON.stringify({
      textQuery: `${dishName} restaurant`,
      pageSize: 15,
      languageCode: 'en',
      rankPreference: 'DISTANCE',
      locationBias: { circle: { center: origin, radius: Math.min(radiusKm * 1000, 50000) } },
    }),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new PlacesRequestError(details?.error?.message ?? `Restaurant search failed (${response.status}).`);
  }
  const data = await response.json() as { places?: GooglePlace[] };
  return (data.places ?? []).flatMap((place): Restaurant[] => {
    if (!place.id || !place.displayName?.text || !place.location) return [];
    return [{
      id: place.id,
      name: place.displayName.text,
      address: place.formattedAddress ?? 'Address unavailable',
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? 0,
      priceLevel: normalizePriceLevel(place.priceLevel),
      mapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${place.location.latitude},${place.location.longitude}`,
      isOpen: place.currentOpeningHours?.openNow ?? null,
      category: place.primaryTypeDisplayName?.text ?? 'Restaurant',
      distanceKm: distanceBetween(origin, place.location),
    }];
  }).filter((place) => place.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatPrice(level: number | null) {
  if (level === null) return 'Price unavailable';
  if (level === 0) return 'Free';
  return '$'.repeat(level);
}
