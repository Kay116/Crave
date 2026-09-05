# Crave

A premium, photo-first food discovery app built with Expo, React Native, and TypeScript.

## What Version 1 includes

- Mood and cuisine preference selection
- Swipeable food cards with YUM/PASS feedback and button alternatives
- A local 12-dish editorial dataset
- Persistent onboarding, preferences, swipe history, and saved dishes
- Recommendation scoring based on selected moods, cuisines, and positive swipes
- Ranked result and saved-cravings screens
- Responsive native and web layouts, haptics, gradients, and image transitions

No API key or backend is required. Food photography loads from Unsplash, so an internet connection is needed for images.

## Run it

```bash
npm install
npm start
```

Then scan the QR code with Expo Go, press `a` for Android, or press `w` for the web version.

## Verify it

```bash
npm run verify
npx expo export --platform web
```

## Project map

- `src/app/` — routes and screens
- `src/components/` — reusable brand and swipe-card components
- `src/context/` — persistent app state and recommendation scoring
- `src/data/` — local dish catalog
- `src/theme.ts` — colors, spacing, typography, radii, and shadows
- `src/types.ts` — app data types

## Next production steps

Replace remote editorial images with licensed/local assets, connect restaurant inventory and location APIs, add dietary/allergy filters, and introduce account sync only when multi-device support is needed.
