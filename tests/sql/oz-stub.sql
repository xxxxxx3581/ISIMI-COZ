-- Özüne Dön yerel PostgreSQL test şeması (canlı şemanın sade taklidi; yalnız geçici test veritabanında kullanılır)
do $r$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role; end if; end $r$;
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('t.uid', true), '')::uuid $$;
create table public.pf_admin_roles(user_id uuid primary key, roles text[]);
create table public.food_admins(user_id uuid primary key);
create function public.pf_is_admin() returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and (exists (select 1 from public.pf_admin_roles r where r.user_id = auth.uid()) or exists (select 1 from public.food_admins a where a.user_id = auth.uid())) $$;
create function public.oz_admin_guard() returns void language plpgsql stable security definer set search_path to '' as $$ begin if not public.pf_is_admin() then raise exception 'PF_AUTH: Yönetici yetkisi gerekli'; end if; end $$;
create table public.pf_audit_log(id bigserial, action text, target_type text, target_id text, details jsonb);
create function public.pf_audit(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}') returns void language sql security definer set search_path to '' as $$ insert into public.pf_audit_log(action,target_type,target_id,details) values (p_action,p_target_type,p_target_id,p_details) $$;
create table public.oz_settings(key text primary key, value jsonb, updated_at timestamptz default now());
insert into public.oz_settings(key,value) values ('oz_market_enabled','true'),('oz_orders_enabled','true'),('oz_payment_mock_enabled','true'),('oz_cod_enabled','false'),('oz_min_order_kurus','5000'),('oz_return_days','14'),('oz_payout_hold_days','3'),('oz_default_ship_kurus','7500');
create function public.oz_flag(p_key text, p_default boolean default false) returns boolean language sql stable security definer set search_path to '' as $$ select coalesce((select (value)::text::boolean from public.oz_settings where key = p_key), p_default) $$;
create function public.oz_int(p_key text, p_default integer) returns integer language sql stable security definer set search_path to '' as $$ select coalesce((select (value)::text::integer from public.oz_settings where key = p_key), p_default) $$;
create function public.oz_market_open() returns boolean language sql stable security definer set search_path to '' as $$ select public.oz_flag('oz_market_enabled', false) or public.pf_is_admin() $$;
create function public.oz_clean(t text, lbl text, req boolean, mx int) returns text language plpgsql as $$ begin t:=nullif(btrim(t),''); if req and t is null then raise exception 'PF_INPUT: % gerekli', lbl; end if; return t; end $$;
create table public.oz_notifications(id bigserial, user_id uuid, order_id uuid, type text, title text, body text, dedupe_key text unique);
create function public.oz_notify(p_user uuid, p_order uuid, p_type text, p_title text, p_body text, p_dedupe text default null) returns void language plpgsql security definer set search_path to '' as $$
begin if p_user is null then return; end if; insert into public.oz_notifications (user_id, order_id, type, title, body, dedupe_key) values (p_user, p_order, p_type, p_title, p_body, p_dedupe) on conflict (dedupe_key) do nothing; end $$;
create table public.oz_sellers(id uuid primary key default gen_random_uuid(), owner_user_id uuid, display_name text, kind text default 'person', legal_name text, tax_no text, tax_office text, phone text, city text, district text, ship_from_city text,
  handling_days int default 2, free_ship_over_kurus int, status text default 'approved', commission_bps int default 1000, iban text, iban_holder text, tax_type text);
create table public.oz_products(id uuid primary key default gen_random_uuid(), seller_id uuid, name text, status text default 'published', images text[]);
create table public.oz_variants(id uuid primary key default gen_random_uuid(), product_id uuid, label text, price_kurus int, stock int default 100, weight_g int default 500, is_active boolean default true);
create table public.oz_shipping_rates(seller_id uuid, max_weight_g int, fee_kurus int);
create table public.oz_addresses(id uuid primary key default gen_random_uuid(), user_id uuid, title text, recipient text, phone text, city text, district text, neighborhood text, address_line text, postal_code text);
create sequence oz_order_no_seq;
create table public.oz_orders(id uuid primary key default gen_random_uuid(), order_no text default ('OZ-'||nextval('oz_order_no_seq')), customer_id uuid, seller_id uuid, status text, ship_to jsonb, phone text, note text,
  payment_method text check (payment_method in ('mock','cod','online')), payment_status text, payment_reference text, subtotal_kurus int, shipping_fee_kurus int, discount_kurus int not null default 0, total_kurus int,
  commission_bps int, commission_kurus int, seller_share_kurus int, client_request_id uuid, terms_accepted_at timestamptz, delivered_at timestamptz, payout_id uuid, created_at timestamptz default now());
create table public.oz_order_items(id uuid primary key default gen_random_uuid(), order_id uuid, product_id uuid, variant_id uuid, product_name text, variant_label text, image_url text, unit_price_kurus int, quantity int, line_total_kurus int, weight_g int);
create table public.oz_returns(id uuid primary key default gen_random_uuid(), order_id uuid, status text);
create table public.oz_payouts(id uuid primary key default gen_random_uuid(), seller_id uuid, amount_kurus int, note text, status text default 'pending');
create table public.oz_seller_adjustments(id uuid primary key default gen_random_uuid(), seller_id uuid, order_id uuid, amount_kurus int, settled_payout_id uuid);
create function public.oz_iban_ok(t text) returns boolean language sql immutable as $$ select t like 'TR%' $$;
CREATE OR REPLACE FUNCTION public.oz_lines(p_items jsonb)
 RETURNS TABLE(variant_id uuid, product_id uuid, seller_id uuid, seller_name text, owner uuid, pname text, label text, img text, price integer, stock integer, weight integer, qty integer, commission_bps integer, free_over integer, handling_days integer, issue text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select v.id, pr.id, s.id, s.display_name, s.owner_user_id, pr.name, v.label, pr.images[1],
         v.price_kurus, v.stock, v.weight_g, q.qty, s.commission_bps, s.free_ship_over_kurus, s.handling_days,
         case when not public.oz_market_open() then 'closed'
              when not v.is_active or pr.status <> 'published' or s.status <> 'approved' then 'unavailable'
              when q.qty > v.stock then 'stock' end
    from (select (e->>'variant_id')::uuid as vid, least(sum(greatest((e->>'qty')::int, 1)), 50)::int as qty
            from jsonb_array_elements(p_items) e group by 1) q
    join public.oz_variants v on v.id = q.vid
    join public.oz_products pr on pr.id = v.product_id
    join public.oz_sellers s on s.id = pr.seller_id
$function$;
CREATE OR REPLACE FUNCTION public.oz_ship_fee(p_seller uuid, p_weight integer, p_subtotal integer, p_free_over integer)
 RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
declare f integer;
begin
  if p_free_over is not null and p_subtotal >= p_free_over then return 0; end if;
  select fee_kurus into f from public.oz_shipping_rates where seller_id = p_seller and max_weight_g >= p_weight order by max_weight_g limit 1;
  if f is null then select fee_kurus into f from public.oz_shipping_rates where seller_id = p_seller order by max_weight_g desc limit 1; end if;
  return coalesce(f, public.oz_int('oz_default_ship_kurus', 7500));
end $function$;
create or replace function public.oz_hold_days()
 returns integer language sql stable security definer set search_path to ''
as $function$ select public.oz_int('oz_payout_hold_days', 3) $function$;
create or replace function public.oz_add_business_days(p_ts timestamptz, p_n integer)
 returns timestamptz language plpgsql stable set search_path to ''
as $function$
declare d timestamptz := p_ts; k int := 0;
begin
  if p_ts is null or p_n is null then return null; end if;
  while k < p_n loop
    d := d + interval '1 day';
    if extract(isodow from (d at time zone 'Europe/Istanbul')) < 6 then k := k + 1; end if;
  end loop;
  return d;
end $function$;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','admin@x'),('00000000-0000-0000-0000-0000000000c1','alici@x'),('00000000-0000-0000-0000-0000000000c2','baska@x'),
 ('00000000-0000-0000-0000-0000000000b1','s1@x'),('00000000-0000-0000-0000-0000000000b2','s2@x'),('00000000-0000-0000-0000-0000000000b3','s3@x'),('00000000-0000-0000-0000-0000000000b4','s4@x');
insert into public.pf_admin_roles values ('00000000-0000-0000-0000-00000000000a','{super}');
insert into public.oz_sellers(id,owner_user_id,display_name,kind,legal_name,tax_no,tax_office,phone,city,district,iban,iban_holder,tax_type,commission_bps) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Şirket Satıcı','business','Şirket AŞ','1234567890','Bornova','05001112233','İzmir','Bornova','TR000000000000000000000001','Şirket AŞ','company',1000),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b2','Şahıs Satıcı','business','Ali Veli','12345678901','Ula','05001112244','Muğla','Ula','TR000000000000000000000002','Ali Veli','sole_prop',1250),
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b3','Çiftçi','person','Ayşe','12345678902',null,'05001112255','Aydın','Söke','TR000000000000000000000003','Ayşe','farmer',1000),
 ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-0000000000b4','Esnaf','person','Mehmet','12345678903',null,'05001112266','Denizli','Merkez','TR000000000000000000000004','Mehmet','esnaf_exempt',1000);
insert into public.oz_products(id,seller_id,name) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a1','Zeytinyağı'),('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000a2','Bal'),('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000a3','Domates');
insert into public.oz_variants(id,product_id,label,price_kurus) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1','1 L',33333),('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000d1','500 ml',17777),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000d2','450 g',29999),('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000d3','1 kg',9000);
insert into public.oz_shipping_rates values ('00000000-0000-0000-0000-0000000000a1',5000,4990);
insert into public.oz_addresses(id,user_id,title,recipient,phone,city,district,neighborhood,address_line,postal_code) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1','Ev','Can Yılmaz','05321234567','İzmir','Bornova','Kazımdirik','100. Sk. No:5','35100');
create function public.pf_norm_text(t text) returns text language sql immutable as $$ select lower(t) $$;
create table public.oz_categories(id uuid primary key default gen_random_uuid(), name text);
create table public.oz_reviews(id uuid, product_id uuid, rating int, comment text, hidden boolean, created_at timestamptz);
create table public.oz_questions(id uuid, product_id uuid, question text, answer text, status text, created_at timestamptz);
create table public.oz_seller_documents(id uuid, seller_id uuid, status text);
alter table public.oz_products add column if not exists category_id uuid, add column if not exists status_reason text, add column if not exists created_at timestamptz default now();
alter table public.oz_returns add column if not exists reason text default 'x', add column if not exists details text, add column if not exists decision_note text, add column if not exists created_at timestamptz default now();
alter table public.oz_sellers add column if not exists slug text, add column if not exists status_reason text, add column if not exists rating_avg numeric, add column if not exists created_at timestamptz default now();
alter table public.oz_orders add column if not exists tracking_no text, add column if not exists carrier text;
alter table public.oz_payouts add column if not exists created_at timestamptz default now(), add column if not exists paid_at timestamptz, add column if not exists bank_reference text;
create function public.oz_my_seller() returns uuid language sql stable security definer set search_path to '' as $$ select id from public.oz_sellers where owner_user_id = auth.uid() $$;
