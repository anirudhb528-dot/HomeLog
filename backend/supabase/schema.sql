-- ============================================================================
-- HomeLog — Supabase Postgres schema (source of truth)
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run: it uses IF NOT EXISTS / CREATE OR REPLACE where possible.
--
-- Auth: user accounts live in Supabase's built-in `auth.users` table.
-- This file adds the application tables in the `public` schema, all keyed to
-- `auth.users(id)`, plus Row-Level Security (RLS) so a user can only touch
-- their own rows. The Render API uses the service_role key (bypasses RLS) and
-- also enforces ownership in code; RLS is defense-in-depth.
-- ============================================================================

-- ── Helper: keep updated_at fresh on every UPDATE ───────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles: extra per-user data (1:1 with auth.users) ─────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  avatar_url text,
  avatar_path text,
  home       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up. Runs as the
-- table owner (SECURITY DEFINER) so it can write regardless of the caller.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── maintenance_tasks ───────────────────────────────────────────────────────
create table if not exists public.maintenance_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  notes        text,
  category     text not null default 'general'
               check (category in ('hvac','plumbing','electrical','exterior','appliances','safety','landscaping','general')),
  due_date     timestamptz not null,
  recurrence   text not null default 'none'
               check (recurrence in ('none','monthly','quarterly','biannual','annual')),
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  status       text not null default 'pending' check (status in ('pending','done','skipped')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists maintenance_tasks_user_due_idx on public.maintenance_tasks (user_id, due_date);

-- ── expenses ────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  description     text not null,
  amount          numeric(12,2) not null check (amount >= 0),
  currency        text not null default 'USD',
  category        text not null default 'other'
                  check (category in ('maintenance','utilities','improvement','insurance','taxes','services','other')),
  date            timestamptz not null default now(),
  related_task_id uuid references public.maintenance_tasks (id) on delete set null,
  receipt_url     text,
  receipt_path    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);

-- ── service_providers (global directory; managed by admins/service key) ─────
create table if not exists public.service_providers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  trade        text not null
               check (trade in ('plumber','electrician','hvac','landscaper','roofer','painter','cleaner','handyman','pest-control','general')),
  phone        text,
  email        text,
  city         text,
  state        text,
  description  text,
  avg_rating   numeric(2,1) not null default 0,
  review_count integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists service_providers_trade_idx on public.service_providers (trade);
create index if not exists service_providers_city_idx on public.service_providers (city);

-- ── reviews (per provider) ──────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_provider_idx on public.reviews (provider_id);

-- ── bookings ────────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  provider_id   uuid not null references public.service_providers (id) on delete cascade,
  scheduled_for timestamptz,
  notes         text,
  status        text not null default 'requested'
                check (status in ('requested','confirmed','completed','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

-- ── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.maintenance_tasks;
create trigger set_updated_at before update on public.maintenance_tasks
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.service_providers;
create trigger set_updated_at before update on public.service_providers
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.bookings;
create trigger set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- The Render API uses the service_role key, which BYPASSES these policies.
-- They protect against any direct client (anon key) access as defense-in-depth.
alter table public.profiles          enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.expenses          enable row level security;
alter table public.service_providers enable row level security;
alter table public.reviews           enable row level security;
alter table public.bookings          enable row level security;

-- profiles: a user sees/edits only their own
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- maintenance_tasks / expenses / bookings: full CRUD on own rows
drop policy if exists "own tasks" on public.maintenance_tasks;
create policy "own tasks" on public.maintenance_tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own bookings" on public.bookings;
create policy "own bookings" on public.bookings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- service_providers: readable by any signed-in user; no client writes
drop policy if exists "providers readable" on public.service_providers;
create policy "providers readable" on public.service_providers for select
  using (auth.role() = 'authenticated');

-- reviews: readable by any signed-in user; a user may add their own
drop policy if exists "reviews readable" on public.reviews;
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews readable" on public.reviews for select using (auth.role() = 'authenticated');
create policy "reviews insert own" on public.reviews for insert with check (auth.uid() = user_id);
