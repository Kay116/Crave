# Crave — Version 2

A premium, photo-first food discovery app built with Expo, React Native, and TypeScript. Version 2 turns a food recommendation into an actionable nearby restaurant search.

## Version 2 flow

```text
Choose a craving → Swipe dishes → Get a match → Share location
→ Find nearby restaurants → Compare distance, rating, price level, and open status
→ Open the restaurant in Google Maps
```

## New in Version 2

- Google Places API (New) Text Search integration
- Foreground device-location permission with purpose-specific copy
- 3 km, 5 km, and 10 km search radii
- Restaurant results sorted by calculated straight-line distance
- Live Google rating and review count
- Google price level, current open/closed state, category, and address
- Direct Google Maps links
- Nearby search from the top recommendation, alternate matches, and saved dishes
- Explicit loading, permission-denied, missing-key, API-error, and zero-result states
- Version 1 local preference and like data migration

Google Places returns a restaurant-level price category (`$`–`$$$$`), not the exact current menu price of a specific dish.

## API setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable billing and **Places API (New)**.
3. Create an API key. For this MVP, restrict it to Places API (New) and set an appropriate quota.
4. Copy `.env.example` to `.env.local`.
5. Replace the placeholder value:

```dotenv
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

6. Restart Expo after changing the environment file.

`EXPO_PUBLIC_` values are bundled into client applications. Before public release, move `findRestaurantsForDish` behind a server or edge-function proxy and keep the production key there.

## Run it

```bash
npm install
npm start
```

Scan the QR code with Expo Go. Location and Google Places search are intended for the native iOS/Android build; web browsers can additionally be subject to Google Web Service CORS restrictions.

## Verify it

```bash
npm run verify
npx expo export --platform web
```

## Key files

- `src/app/nearby.tsx` — permission, location, search, and restaurant-results UI
- `src/services/places.ts` — Places request, response normalization, distance, and price formatting
- `src/app/results.tsx` — recommendation-to-nearby handoff
- `src/app/likes.tsx` — saved-dish-to-nearby handoff
- `app.json` — Expo location permission configuration
- `.env.example` — API configuration template

## Data and privacy

Coordinates are used for the active Places search and are not persisted by Crave. Google processes the restaurant request according to Google Maps Platform terms. Crave stores only onboarding, food preferences, swipe history, and saved dish IDs on the device.
