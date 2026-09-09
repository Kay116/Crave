-- Run once in the Supabase SQL Editor for Crave Version 3.
create table if not exists public.preference_sessions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  moods text[] not null default '{}',
  cuisines text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.swipe_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  dish_id text not null,
  choice text not null check (choice in ('like', 'pass')),
  swiped_at timestamptz not null default now()
);

create table if not exists public.saved_dishes (
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);

create index if not exists preference_sessions_user_date_idx on public.preference_sessions(user_id, created_at desc);
create index if not exists swipe_events_user_date_idx on public.swipe_events(user_id, swiped_at desc);
create unique index if not exists swipe_events_user_client_idx on public.swipe_events(user_id, client_id);

alter table public.preference_sessions enable row level security;
alter table public.swipe_events enable row level security;
alter table public.saved_dishes enable row level security;

drop policy if exists "Users manage their preference sessions" on public.preference_sessions;
drop policy if exists "Users manage their swipe history" on public.swipe_events;
drop policy if exists "Users manage their saved dishes" on public.saved_dishes;

create policy "Users manage their preference sessions" on public.preference_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their swipe history" on public.swipe_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their saved dishes" on public.saved_dishes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
