-- Marketplace A3.5 foundation
-- This migration is intentionally added to the test branch only.
-- It is not applied to production by this commit.

create table if not exists public.marketplace_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  seller_type text not null default 'individual'
    check (seller_type in ('individual','professional')),
  country_code text not null default 'TR',
  locale text not null default 'tr-TR',
  city text,
  district text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_profiles_city_idx
  on public.marketplace_profiles(city);

create index if not exists marketplace_profiles_seller_type_idx
  on public.marketplace_profiles(seller_type);

alter table public.marketplace_profiles enable row level security;

-- Public profile presentation is opt-in through is_public.
drop policy if exists "marketplace_profiles_public_read" on public.marketplace_profiles;
create policy "marketplace_profiles_public_read"
on public.marketplace_profiles
for select
using (is_public = true or auth.uid() = user_id);

-- Users can manage only their own profile.
drop policy if exists "marketplace_profiles_owner_insert" on public.marketplace_profiles;
create policy "marketplace_profiles_owner_insert"
on public.marketplace_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "marketplace_profiles_owner_update" on public.marketplace_profiles;
create policy "marketplace_profiles_owner_update"
on public.marketplace_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "marketplace_profiles_owner_delete" on public.marketplace_profiles;
create policy "marketplace_profiles_owner_delete"
on public.marketplace_profiles
for delete
using (auth.uid() = user_id);

-- Keep updated_at current without requiring application-side bookkeeping.
create or replace function public.set_marketplace_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketplace_profiles_updated_at on public.marketplace_profiles;
create trigger marketplace_profiles_updated_at
before update on public.marketplace_profiles
for each row execute function public.set_marketplace_profile_updated_at();
