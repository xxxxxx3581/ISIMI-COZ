-- Paket 12: oz_admin_iyzico_items çıktısına siparişin payment_status alanı eklenir (iyzico iade düğmeleri için).
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, Supabase SQL Editor'de çalıştırılır.
-- Geriye dönük uyumlu: mevcut alanlar ve sırası aynı; siparişin durumu zaten "status" alanında vardı; yalnız "payment_status" EKLENİR
-- (iç sorguların SONUNA). block_reason ve due_by mantığı DEĞİŞMEZ. Yetkiler CREATE OR REPLACE ile korunur.
--
-- GERİ ALMA (bu dosyadan önceki hal; canlıdan 18.10.2026'da okunan özgün metin, md5 ebda1e4386c300406dc3fc2876c5ec8c):
-- CREATE OR REPLACE FUNCTION public.oz_admin_iyzico_items(p_limit integer DEFAULT 100)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  STABLE SECURITY DEFINER
--  SET search_path TO ''
-- AS $function$
-- declare hold int := public.oz_hold_days();
-- begin
--   perform public.oz_admin_guard();
--   return coalesce((select jsonb_agg(to_jsonb(x) order by x.delivered_at nulls last, x.order_no, x.kind) from (
--     select k.*, case when k.approve_status = 'approved' then null when k.status <> 'delivered' then 'Teslim edilmedi'
--                      when k.delivered_at > now() - make_interval(days => hold) then 'Bekleme süresi dolmadı'
--                      when k.open_return then 'Açık iade/ayıp talebi var' else null end as block_reason,
--            case when k.delivered_at is not null then public.oz_add_business_days(k.delivered_at, 5) end as due_by
--       from (
--         select 'item' kind, i.id, o.id order_id, o.order_no, s.display_name seller_name, i.product_name name, i.line_total_kurus price_kurus,
--                coalesce(i.iyzico_approve_status, 'pending') approve_status, i.iyzico_approved_at approved_at, o.status, o.delivered_at,
--                exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved')) open_return
--           from public.oz_order_items i join public.oz_orders o on o.id = i.order_id join public.oz_sellers s on s.id = o.seller_id
--          where o.payment_method = 'online' and i.iyzico_payment_transaction_id is not null
--         union all
--         select 'ship', o.id, o.id, o.order_no, s.display_name, 'Kargo', o.shipping_fee_kurus, coalesce(o.iyzico_ship_approve_status, 'pending'),
--                o.iyzico_ship_approved_at, o.status, o.delivered_at,
--                exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved'))
--           from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
--          where o.payment_method = 'online' and o.iyzico_ship_transaction_id is not null) k
--      order by k.delivered_at nulls last limit greatest(1, least(coalesce(p_limit, 100), 500))) x), '[]'::jsonb);
-- end $function$;

CREATE OR REPLACE FUNCTION public.oz_admin_iyzico_items(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare hold int := public.oz_hold_days();
begin
  perform public.oz_admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.delivered_at nulls last, x.order_no, x.kind) from (
    select k.*, case when k.approve_status = 'approved' then null when k.status <> 'delivered' then 'Teslim edilmedi'
                     when k.delivered_at > now() - make_interval(days => hold) then 'Bekleme süresi dolmadı'
                     when k.open_return then 'Açık iade/ayıp talebi var' else null end as block_reason,
           case when k.delivered_at is not null then public.oz_add_business_days(k.delivered_at, 5) end as due_by
      from (
        select 'item' kind, i.id, o.id order_id, o.order_no, s.display_name seller_name, i.product_name name, i.line_total_kurus price_kurus,
               coalesce(i.iyzico_approve_status, 'pending') approve_status, i.iyzico_approved_at approved_at, o.status, o.delivered_at,
               exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved')) open_return,
               o.payment_status
          from public.oz_order_items i join public.oz_orders o on o.id = i.order_id join public.oz_sellers s on s.id = o.seller_id
         where o.payment_method = 'online' and i.iyzico_payment_transaction_id is not null
        union all
        select 'ship', o.id, o.id, o.order_no, s.display_name, 'Kargo', o.shipping_fee_kurus, coalesce(o.iyzico_ship_approve_status, 'pending'),
               o.iyzico_ship_approved_at, o.status, o.delivered_at,
               exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved')),
               o.payment_status
          from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
         where o.payment_method = 'online' and o.iyzico_ship_transaction_id is not null) k
     order by k.delivered_at nulls last limit greatest(1, least(coalesce(p_limit, 100), 500))) x), '[]'::jsonb);
end $function$;
