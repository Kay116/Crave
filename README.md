# Crave — Version 3

Crave is a premium, photo-first food discovery app built with Expo, React Native, TypeScript, Google Places, and Supabase. Version 3 adds real accounts and a recommendation engine that learns across sessions.

## Version 3 flow

```text
Create account or continue as guest
→ Choose today’s mood
→ Swipe dishes
→ Save every preference session and swipe
→ Build a time-weighted taste profile
→ Improve the next recommendation
→ Sync history across devices
```

## New in Version 3

- Email/password accounts through Supabase Auth
- Email-confirmation, sign-in, sign-out, loading, error, and guest states
- Persistent account sessions using AsyncStorage on native platforms
- Cloud-backed preference sessions, swipe events, and saved dishes
- Row Level Security policies limiting every record to its owner
- Automatic migration of local Version 2 preferences, likes, and swipes
- Automatic guest-history upload after sign-in
- A new account dashboard with sync status and activity counts
- A “Taste history” screen showing learned signals, recent swipes, and past cravings
- A recency-weighted recommendation algorithm that learns from likes and passes

Version 2’s nearby restaurant search remains included.

## Recommendation model

The algorithm combines four layers:

1. **Current mood matches** — strongest weight, so today’s intent wins.
2. **Current cuisine matches** — a direct boost for selected cuisines.
3. **Historical swipes** — likes strengthen similar moods/cuisines; passes gently reduce them.
4. **Preference history** — frequently selected moods and cuisines add a smaller long-term signal.

Swipe influence uses a 60-day half-life. Preference sessions use a 90-day half-life. This lets Crave learn without permanently trapping someone in old preferences.

## Supabase setup

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it once.
3. Under **Authentication → Providers**, keep Email enabled.
4. In **Project Settings → Connect**, select the Expo React Native/mobile instructions.
5. Copy `.env.example` to `.env.local` and add your project values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

The publishable key is designed for client use. Never put the Supabase `service_role` or secret key in an Expo environment variable.

## Google Places setup

Enable **Places API (New)** in Google Cloud, then add this to `.env.local`:

```dotenv
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

For a public production release, proxy the Places web-service request through a server or edge function instead of bundling that key into the client.

## Run it

```bash
npm install
npm start
```

Restart Expo whenever `.env.local` changes:

```bash
npm start -- --clear
```

## Verify it

```bash
npm run verify
npx expo export --platform web
```

## Key files

- `src/context/auth-context.tsx` — auth session and account actions
- `src/context/crave-context.tsx` — local state, learning model, migration, and cloud sync
- `src/services/supabase.ts` — Expo-compatible Supabase client
- `src/services/cloud-history.ts` — cloud read/write boundary
- `src/app/auth.tsx` — sign-in and account creation
- `src/app/account.tsx` — account and synchronization dashboard
- `src/app/history.tsx` — preference and swipe-history insights
- `supabase/schema.sql` — tables, indexes, constraints, and RLS policies

## Privacy and data behavior

- Guests stay fully local.
- Signed-in users sync preference sessions, swipe events, and saved dish IDs.
- Location coordinates are used only for the active restaurant search and are not saved in the Crave schema.
- Account data is isolated by Supabase Row Level Security.
