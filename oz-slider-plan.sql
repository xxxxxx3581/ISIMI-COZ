-- Özüne Dön · F1 — Ana ekran slaytları (reklam / üretici tanıtımı) için tablo planı
-- DURUM: UYGULANMADI. Yalnız plan; Supabase SQL Editor'de elle çalıştırılmalı.
--
-- Açıklama: Ana ekran slider'ı bugün oz-market-v1.js içindeki sabit HERO_SL dizisinden gelir ve her slayt
-- isteğe bağlı producerId alanını destekler (verilirse kısa dokunuş o üreticinin sayfasını açar). Bu tablo
-- uygulandığında slaytlar yönetimden eklenip zamanlanabilir: herkes yalnız aktif ve yayın aralığı içindeki
-- slaytları okuyabilir, ekleme/güncelleme/silme yalnız yöneticiye (pf_is_admin) açıktır. Ön yüz bağlantısı
-- ayrı bir adımda yapılacaktır; tablo yokken sabit slaytlar aynen çalışır.

create table if not exists public.oz_home_slides (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 80),
  subtitle    text check (subtitle is null or char_length(subtitle) <= 140),
  image_url   text check (image_url is null or image_url ~* '^https://'),
  producer_id uuid null references public.oz_sellers(id) on delete set null,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  starts_at   timestamptz null,
  ends_at     timestamptz null,
  created_at  timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists oz_home_slides_active_idx on public.oz_home_slides (active, sort_order);

alter table public.oz_home_slides enable row level security;

-- Okuma: herkes (anon + authenticated) yalnız aktif ve süresi içindeki slaytları görür
create policy oz_home_slides_read on public.oz_home_slides
  for select to anon, authenticated
  using (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

-- Yönetici tümünü görür ve yazar
create policy oz_home_slides_admin_all on public.oz_home_slides
  for all to authenticated
  using (public.pf_is_admin())
  with check (public.pf_is_admin());

grant select on public.oz_home_slides to anon, authenticated;
grant insert, update, delete on public.oz_home_slides to authenticated;

-- Geri alma:
-- drop table if exists public.oz_home_slides;
