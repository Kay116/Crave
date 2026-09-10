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

-- ===========================================================================
-- Version 4 — shared craving rooms
-- The statements below are identical to supabase/migrations/0001_v4_craving_rooms.sql
-- and are safe to re-run.
-- ===========================================================================

create table if not exists public.craving_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null default 'Crave room',
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'swiping', 'completed', 'closed')),
  dish_ids text[] not null default '{}',
  selected_moods text[] not null default '{}',
  selected_cuisines text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.room_members (
  room_id uuid not null references public.craving_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Guest',
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists public.room_swipes (
  room_id uuid not null references public.craving_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null,
  choice text not null check (choice in ('like', 'pass')),
  swiped_at timestamptz not null default now(),
  primary key (room_id, user_id, dish_id)
);

create index if not exists craving_rooms_code_idx on public.craving_rooms (code);
create index if not exists craving_rooms_creator_idx on public.craving_rooms (created_by);
create index if not exists room_members_user_idx on public.room_members (user_id);
create index if not exists room_swipes_room_idx on public.room_swipes (room_id);

create or replace function public.is_room_member(p_room_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id and m.user_id = p_user_id
  );
$$;

create or replace function public.generate_room_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_raw bytea;
  v_code text;
begin
  loop
    v_raw := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for v_i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_raw, v_i) % length(v_alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.craving_rooms r where r.code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.create_craving_room(
  p_name text, p_dish_ids text[], p_moods text[], p_cuisines text[], p_display_name text, p_expires boolean default false
)
returns public.craving_rooms language plpgsql security definer set search_path = public as $$
declare
  v_room public.craving_rooms;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a room';
  end if;
  insert into public.craving_rooms (code, name, created_by, dish_ids, selected_moods, selected_cuisines, expires_at)
  values (
    public.generate_room_code(),
    coalesce(nullif(trim(p_name), ''), 'Crave room'),
    auth.uid(),
    coalesce(p_dish_ids, '{}'::text[]),
    coalesce(p_moods, '{}'::text[]),
    coalesce(p_cuisines, '{}'::text[]),
    case when p_expires then now() + interval '24 hours' else null end
  )
  returning * into v_room;
  insert into public.room_members (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Guest'))
  on conflict (room_id, user_id) do nothing;
  return v_room;
end;
$$;

create or replace function public.join_craving_room(p_code text, p_display_name text)
returns public.craving_rooms language plpgsql security definer set search_path = public as $$
declare
  v_room public.craving_rooms;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a room';
  end if;
  select * into v_room from public.craving_rooms r where r.code = upper(trim(p_code)) limit 1;
  if v_room.id is null then
    raise exception 'That invitation code is not valid';
  end if;
  if v_room.status = 'closed' then
    raise exception 'That room has been closed';
  end if;
  if v_room.expires_at is not null and v_room.expires_at < now() then
    raise exception 'That room has expired';
  end if;
  insert into public.room_members (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Guest'))
  on conflict (room_id, user_id) do nothing;
  return v_room;
end;
$$;

create or replace function public.room_results(p_room_id uuid)
returns table (dish_id text, likes integer, passes integer, voters integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_room_member(p_room_id, auth.uid()) then
    raise exception 'Not a member of this room';
  end if;
  return query
    select s.dish_id,
           count(*) filter (where s.choice = 'like')::int as likes,
           count(*) filter (where s.choice = 'pass')::int as passes,
           count(distinct s.user_id)::int as voters
    from public.room_swipes s
    where s.room_id = p_room_id
    group by s.dish_id;
end;
$$;

revoke all on function public.generate_room_code() from anon, authenticated;
grant execute on function public.create_craving_room(text, text[], text[], text[], text, boolean) to authenticated;
grant execute on function public.join_craving_room(text, text) to authenticated;
grant execute on function public.room_results(uuid) to authenticated;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;

alter table public.craving_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_swipes enable row level security;

drop policy if exists "Members read their rooms" on public.craving_rooms;
drop policy if exists "Creator updates the room" on public.craving_rooms;
drop policy if exists "Members read co-members" on public.room_members;
drop policy if exists "Self join as creator" on public.room_members;
drop policy if exists "Update own membership" on public.room_members;
drop policy if exists "Leave own membership" on public.room_members;
drop policy if exists "Read own swipes" on public.room_swipes;
drop policy if exists "Insert own swipes" on public.room_swipes;
drop policy if exists "Update own swipes" on public.room_swipes;

create policy "Members read their rooms" on public.craving_rooms
  for select using (public.is_room_member(id, auth.uid()));
create policy "Creator updates the room" on public.craving_rooms
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "Members read co-members" on public.room_members
  for select using (public.is_room_member(room_id, auth.uid()));
create policy "Self join as creator" on public.room_members
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.craving_rooms r where r.id = room_id and r.created_by = auth.uid())
  );
create policy "Update own membership" on public.room_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Leave own membership" on public.room_members
  for delete using (user_id = auth.uid());

create policy "Read own swipes" on public.room_swipes
  for select using (user_id = auth.uid() and public.is_room_member(room_id, auth.uid()));
create policy "Insert own swipes" on public.room_swipes
  for insert with check (user_id = auth.uid() and public.is_room_member(room_id, auth.uid()));
create policy "Update own swipes" on public.room_swipes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.craving_rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.room_swipes;
exception when duplicate_object then null; end $$;
