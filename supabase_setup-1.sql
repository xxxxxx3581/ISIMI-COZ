-- İŞİMİ ÇÖZ — Supabase kurulum dosyası
-- Bu dosyayı Supabase > SQL Editor içine yapıştırıp Run ile çalıştır.

create extension if not exists pgcrypto;

-- Hizmet sağlayıcıları
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  district text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  city text default 'İzmir',
  services jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Hizmet talepleri
create table if not exists public.talepler (
  id uuid primary key default gen_random_uuid(),
  talep_no text unique not null,
  kategori text not null,
  aciklama text not null,
  il text default 'İzmir',
  ilce text not null,
  mahalle text,
  aciliyet text,
  ad_soyad text not null,
  telefon text not null,
  durum text not null default 'Beklemede',
  created_at timestamptz not null default now()
);

-- Kategoriler
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Sağlayıcı-kategori ilişkileri
create table if not exists public.provider_categories (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  unique(provider_id, category_id)
);

-- Teklifler
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.talepler(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  price numeric not null,
  available_time text not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Temel kategorileri ekle
insert into public.categories (name) values
('Klima'),
('Elektrik'),
('Tesisat'),
('Beyaz Eşya'),
('Temizlik'),
('Nakliye'),
('Çilingir'),
('Oto')
on conflict (name) do nothing;

-- API'nin tabloları okuyup yazabilmesi için RLS'yi kapat.
-- Pilot/prototip kullanım içindir.
alter table public.providers disable row level security;
alter table public.talepler disable row level security;
alter table public.categories disable row level security;
alter table public.provider_categories disable row level security;
alter table public.offers disable row level security;

-- Şema önbelleğini yenile
notify pgrst, 'reload schema';
