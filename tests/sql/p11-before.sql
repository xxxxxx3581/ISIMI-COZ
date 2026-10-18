-- Paket 11 testi, 1. kısım: Paket 11 ÖNCESİ (canlı fonksiyonlar) elle hakediş sonuçlarının anlık görüntüsü
\set ON_ERROR_STOP 1
\set VERBOSITY terse
create function pg_temp.t(q text) returns text language plpgsql as $$ declare r text; begin execute q into r; return coalesce(r,'(null)'); exception when others then return 'HATA '||sqlerrm; end $$;
create function pg_temp.u(x text) returns void language sql as $$ select set_config('t.uid', x, false) $$;
-- elle hakedişli (mock/cod) siparişler: çeşitli durumlar (doğrudan veri)
insert into public.oz_orders(order_no,customer_id,seller_id,status,payment_method,payment_status,subtotal_kurus,shipping_fee_kurus,total_kurus,commission_bps,commission_kurus,seller_share_kurus,delivered_at,created_at)
select 'M'||g, '00000000-0000-0000-0000-0000000000c1', (array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2']::uuid[])[1+g%2],
       (array['new','accepted','shipped','delivered','delivered','delivered','cancelled'])[1+g%7], case when g%5=0 then 'cod' else 'mock' end,
       case when g%7=6 then 'refunded' else 'paid' end, 10000+g*37, 4990, 14990+g*37, 1000, (10000+g*37)/10, 10000+g*37-(10000+g*37)/10+4990,
       case when g%7 between 3 and 5 then now() - make_interval(days => g%9) end, now() - make_interval(hours => g*5)
  from generate_series(1,40) g;
-- (a) ESKİ sonuçlar (canlı fonksiyonlar)
create schema if not exists tsnap;
create table tsnap.before as
select 'earn_a1' k, (select set_config('t.uid','00000000-0000-0000-0000-0000000000b1',false)) is not null and true as dummy, public.oz_seller_earnings() v
union all select 'earn_a2', (select set_config('t.uid','00000000-0000-0000-0000-0000000000b2',false)) is not null, public.oz_seller_earnings()
union all select 'overview', (select set_config('t.uid','00000000-0000-0000-0000-00000000000a',false)) is not null, public.oz_admin_overview()
union all select 'due', true, public.oz_admin_list('payouts_due', null, null, 100, 0)
union all select 'returns', true, public.oz_admin_list('returns', null, null, 100, 0);
