# Crave — Version 4

Crave is a premium, photo-first food discovery app built with Expo, React Native,
TypeScript, Google Places, and Supabase. Version 4 adds **shared craving rooms**
so a group can decide together, and a **much larger, richer dish catalog** with
multiple photos per dish and deeper preference filters.

Everything from Version 3 is preserved: guest usage, Supabase email/password
accounts, account-isolated storage, preference/swipe history, the recency-weighted
recommendation model, saved dishes, and the nearby Google Places search.

---

## What's new in Version 4

| Area | Version 4 |
| --- | --- |
| **Shared rooms** | Create a room, share a 6-character code or link, everyone swipes the same deck, Crave computes the group's best match. New routes: `/friends`, `/room/[code]`, `/room/[code]/swipe`, `/room/[code]/results`. |
| **Group algorithm** | Pure, tested `scoreGroup` / `scoreGroupFromTallies` that prioritise consensus (unanimous → most-liked → personalised → fewest passes). |
| **Realtime** | Supabase Realtime for joins / completion / results, with a polling fallback so a manual refresh always works. |
| **Native sharing** | Room invites, single dishes, solo results, group results, and restaurant links via the OS share sheet (Web Share API + copy fallback on web). |
| **Catalog** | 48 curated dishes across 12 cuisines, 2–3 photos each, alt text, texture/meal-type/protein/dietary/spice tags, and Places search terms. |
| **Multi-photo cards** | Tap the left/right edge of a swipe card (or open the details modal) to browse a dish's photos — no horizontal image swipe that would fight the like/pass gesture. `● ○ ○` position dots. |
| **More filters** | Optional Texture / Meal type / Protein / Spice / Price / Dietary / Light-vs-filling / Hot-vs-cold behind a "More options" section. "Surprise me" still needs nothing selected. Over-strict filters relax the lowest-priority ones and say so. |

Do **not** expect chat, friend requests, profiles, push notifications, or a full
social graph — those are intentionally out of scope for this version.

---

## Shared-room flow

```text
Sign in
→ Friends → Create a craving room (name, optional 24-hour expiry)
→ Share the invitation code or link
→ Friends open the link / enter the code (Friends → Join)
→ Everyone swipes the same shared deck
→ Each person finishes; Crave tallies likes/passes per dish
→ Group result: best match + 2–3 alternatives + "3 of 4 friends liked this"
→ Find the winning dish nearby, or share the result
```

- **Signed-in users** can create and join live rooms.
- **Guests** keep the normal solo experience and can still share individual
  dishes and their solo result.
- Room state moves through `waiting → swiping → completed`, plus `closed`
  (creator ends it) and an `expired` view when a 24-hour room lapses.
- Only room members can read a room, its members, or its aggregate results.
  Individual swipe choices are never exposed — the results screen shows counts
  only.

---

## Data model

### Dish (`src/types.ts`)

```ts
type DishImage = {
  url: string;
  alt: string;
  sourceName?: string;    // e.g. "Unsplash"
  sourceUrl?: string;
  photographer?: string;  // only when known — never invented
};

type Dish = {
  id: string;
  name: string;
  cuisine: Cuisine;            // 12 cuisines
  description: string;
  images: DishImage[];         // 2–3 per dish
  moods: Mood[];
  textures: string[];
  mealTypes: string[];         // breakfast | lunch | dinner | snack | dessert
  dietaryTags: string[];       // discovery metadata, NOT allergy/medical advice
  proteins: string[];
  spiceLevel: number;          // 0–4
  price: number;               // 1–3
  time: number;                // minutes
  searchTerms: string[];       // Google Places queries
  image: string;               // back-compat: === images[0].url
  tags: string[];              // back-compat: short chips shown on the card
};
```

`src/data/dishes.ts` builds every dish through `defineDish()`, which fills the
legacy `image` / `tags` fields so older screens keep working while new screens
use `images[]`.

### Rooms (`craving_rooms`, `room_members`, `room_swipes`)

```text
craving_rooms(id, code, name, created_by, status, dish_ids,
              selected_moods, selected_cuisines, created_at, expires_at)
room_members(room_id, user_id, display_name, joined_at, completed_at)
room_swipes(room_id, user_id, dish_id, choice, swiped_at)   -- PK (room_id,user_id,dish_id)
```

No latitude/longitude or other precise-location data is stored on a room.

---

## Supabase migration

Version 4 adds three tables, four RPCs, RLS policies, and realtime publication.

### Fresh project

Run **`supabase/schema.sql`** once in the Supabase SQL Editor. It contains the
Version 3 tables **and** the Version 4 room objects.

### Existing Version 3 project

Run **`supabase/migrations/0001_v4_craving_rooms.sql`** once in the SQL Editor.
It is idempotent (`create table if not exists`, `create or replace function`,
`drop policy if exists`), so re-running it is safe.

What it creates:

- Tables `craving_rooms`, `room_members`, `room_swipes` + indexes.
- `generate_room_code()` — secure random 6-char code from `gen_random_uuid()`
  bytes over an unambiguous alphabet (no `0/O/1/I/L`), retrying on collision.
- `create_craving_room(...)` — `SECURITY DEFINER`; creates the room and adds the
  creator as the first member atomically.
- `join_craving_room(p_code, p_display_name)` — `SECURITY DEFINER`; **the only
  way to join a room you didn't create**, so rooms are never exposed by guessing
  a UUID. Rejects closed / expired / unknown codes.
- `room_results(p_room_id)` — `SECURITY DEFINER`; returns per-dish
  `likes / passes / voters` **counts only** for members of that room.
- RLS: members read their rooms and co-members; only the creator updates a room;
  participants only ever read/insert/update **their own** `room_swipes`.
- Adds the three tables to the `supabase_realtime` publication.

Only the `anon` publishable key is used by the app. The `service_role` key is
never referenced in client code or env.

---

## Realtime setup

`0001_v4_craving_rooms.sql` already runs:

```sql
alter publication supabase_realtime add table public.craving_rooms;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.room_swipes;
```

If you manage Realtime from the dashboard instead, enable replication for those
three tables under **Database → Replication → `supabase_realtime`**.

The client (`src/context/room-context.tsx`) subscribes with
`supabase.channel(...).on('postgres_changes', ...)` and **re-fetches on every
event** rather than trusting payloads, so duplicate events and reconnects are
harmless. A slow polling loop (4–30 s depending on room phase) runs alongside,
so the room still converges after a manual refresh if Realtime drops.

---

## Email links (confirmation & password reset)

Confirmation and password-reset emails send the user back to `<origin>/auth`.
For that to work:

1. **Supabase → Authentication → URL Configuration → Redirect URLs** — add every
   origin the app runs on, e.g.
   `http://localhost:8081/auth`, `http://localhost:8081/**`,
   `https://your-app.example.com/auth`, `https://your-app.example.com/**`,
   and `crave://auth` for the native build.
   *If the redirect URL isn't allow-listed, Supabase silently ignores it and
   sends the user to the **Site URL** instead — which is the usual cause of a
   blank page after clicking a reset link.*
2. **Site URL** — set it to the origin you actually serve (e.g.
   `http://localhost:8081` in dev, your public URL in prod).
3. The web client uses `detectSessionInUrl: true`, so supabase-js reads the
   session/`type=recovery` params from the URL fragment on load. `auth.tsx` then
   shows **"Set a new password"** (or **"That link didn't work"** for an
   expired/used link → *Send a new reset link*).

On native, the reset link opens `crave://auth`; test it on a device or simulator
where that scheme is registered.

---

## `EXPO_PUBLIC_APP_URL` setup

Set this to the **public HTTPS origin** where the web build is hosted (no
trailing slash):

```dotenv
EXPO_PUBLIC_APP_URL=https://crave.example.com
```

- When set to a real public URL, a room invite includes
  `https://crave.example.com/room/ABC234`.
- When blank, `http://…`, or a `localhost` / private-LAN address, the invite
  shares the **code only** with manual-entry instructions — Crave never sends a
  broken localhost link.

---

## Image-source policy

- Every dish photo is hot-linked from the **Unsplash CDN** and used under the
  [Unsplash License](https://unsplash.com/license), which permits this use.
- `sourceName` is set to `Unsplash`; `photographer` is included only where it is
  actually known — credits are never fabricated.
- Do not scrape or embed images from Google, Yelp, restaurant sites, or other
  unauthorised sources. Swap in owned or properly licensed assets before a real
  launch, keeping the same `DishImage` shape.
- `src/components/smart-image.tsx` (`SmartImage`) adds `expo-image` disk+memory
  caching, a blur placeholder, and an automatic fallback image if a URL fails —
  a broken photo never breaks a card.
- The catalog was checked for broken URLs, duplicate image IDs, and duplicate
  dish IDs (all 100 image URLs return 200/302; 0 duplicates).

---

## Recommendation model

### Personal (`src/services/recommendation.ts`)

Layers, in order of weight:

1. **Current mood** matches — today's intent wins.
2. **Current cuisine** filter (a hard filter with graceful relaxation).
3. **Version 4 attributes** — texture / meal-type / protein / dietary / spice /
   price / hot-cold / light-filling.
4. **Current-session swipes** — weighted `×1.6` so they outrank old history.
5. **Historical swipes** — 60-day half-life; likes strengthen, passes soften.
6. **Preference history** — 90-day half-life, smaller long-term signal.

`selectDeck(filters, ctx)` applies the hard filters, and if the deck would be too
small it relaxes them **lowest priority first** (texture → … → cuisine; `dietary`
is never auto-relaxed) and reports which filters were eased. "Surprise me" passes
no filters and returns the whole catalog.

### Group (`src/services/group-score.ts`)

`scoreGroup` / `scoreGroupFromTallies` rank dishes by:

1. **Unanimous likes**
2. **Most participants liked it** (also the match %)
3. **Highest combined personalised score** (tie-break only; never shown to users)
4. **Fewest passes** (final tie-break)

Duplicate / re-cast swipes collapse to the latest choice per (user, dish).
`everyoneFinished` is surfaced so results can show provisional vs final.

---

## Run it

```bash
npm install
npm start                 # or: npm run web / android / ios
npm start -- --clear      # after changing .env.local
```

## Verify it

```bash
npm run verify            # tsc + test typecheck + expo lint + unit tests
npx expo-doctor
npx expo export --platform web --clear
git status
```

`npm test` runs the focused unit suite (Node's test runner via `tsx`):

- personal recommendation scoring & session-vs-history weighting
- strict filters relaxing to reasonable matches; dietary respected
- group scoring: unanimous, split, partial completion, no-likes
- duplicate swipe collapsing
- room code validation & expiration / phase
- guest→account merge (once) & account-key isolation
- a saved dish removed offline staying removed after sync
- invite messages never leaking a localhost link

### Manual checks

1. New user → **Start craving** → signup screen (not `/preferences`).
2. Continue as guest → preferences (incl. **More options** & **Surprise me**) →
   swipe → results → likes.
3. Guest history → sign in → history migrates once.
4. User A signs out → guest state has none of A's history.
5. User B signs in → A's history is never uploaded or shown.
6. Remove a saved dish → stays removed after the next sync.
7. Web location denial → "Try again", never `Linking.openSettings()`.
8. Restart the app → correct state for the current account.
9. Create a room; join from a second account; share the code; both swipe the
   deck; group result appears; refresh mid-room; try a bad/expired code.
10. Browse a card's photos (tap edges / details modal) without liking/passing.

---

## Key files

| File | Purpose |
| --- | --- |
| `src/types.ts` | Dish, filter, and room types |
| `src/data/dishes.ts` | 48-dish catalog + `defineDish` + fallback image |
| `src/services/recommendation.ts` | pure personal scoring + `selectDeck` |
| `src/services/group-score.ts` | pure group scoring |
| `src/services/local-store.ts` | pure per-account state helpers (merge / reconcile) |
| `src/services/rooms.ts` / `room-helpers.ts` | Supabase room I/O + pure code/expiry helpers |
| `src/services/sharing.ts` / `invite.ts` | native share + pure invite-message builder |
| `src/services/recent-rooms.ts` | per-account list of recently seen rooms |
| `src/context/crave-context.tsx` | local state, learning model, migration, cloud sync |
| `src/context/room-context.tsx` | room load + realtime + polling + actions |
| `src/components/swipe-card.tsx` | multi-photo swipe card |
| `src/components/dish-details.tsx` | photo-carousel details modal |
| `src/components/smart-image.tsx` | cached image with placeholder + fallback |
| `src/app/friends.tsx`, `src/app/room/[code]/*` | room screens |
| `supabase/schema.sql` | full baseline schema (V3 + V4) |
| `supabase/migrations/0001_v4_craving_rooms.sql` | standalone V4 migration |

---

## Privacy & security

- Guests stay fully local. Signed-in users sync only preference sessions, swipe
  events, and saved dish IDs.
- Per-account local storage keys (`@crave/v3/guest`, `@crave/v3/user/<id>`) keep
  one account's data from ever being written into — or uploaded from — another on
  a shared device. Guest history migrates into an account **at most once, ever**.
- Room data is readable only by room members; individual votes are never exposed.
- Location coordinates are used only for the active restaurant search and are not
  stored in the Crave schema or on a room.
- No API key, access token, password, session object, or Supabase secret is
  logged or committed. `.env.local` stays git-ignored; `.env.example` holds
  placeholders only.

---

## Known limitations

- **expo-doctor** reports 4 Expo packages a patch or two behind the SDK's
  preferred versions (`expo`, `expo-router`, `@expo/ui`, `expo-glass-effect`).
  This pre-dates Version 4 and is left as-is to avoid pulling in unvetted
  versions; run `npx expo install --check` when you're ready to bump them.
- The **group personalised tie-break** uses the *viewing* member's own history
  (other members' histories aren't shared, by design), so ordering of otherwise-
  tied dishes can differ slightly per viewer.
- **Guest auto-migration is once-per-device.** A second guest session after a
  migration won't auto-merge into a later account (their cloud history still
  loads normally) — the deliberate cost of never leaking one account's data into
  another.
- A few **secondary dish photos** are cuisine-appropriate stock rather than the
  exact plated dish; all URLs are verified and the details modal shows source
  attribution.
- Realtime needs the three room tables in the `supabase_realtime` publication
  (the migration does this); without it the app still works via polling.
- `EXPO_PUBLIC_*` values are bundled into the client by design (publishable keys
  only) — proxy the Google Places call before a public production release.
