-- Paket 11 GERİ ALMA: paket-11-uygula.sql'den önceki hale döndürür (fonksiyon gövdeleri canlıdan 18.10.2026'da okunan özgün metinlerdir; md5 doğrulandı).
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla çalıştırılır.
-- Dikkat: oz_payments.resolved_at / resolved_note silinir ("elle iade edildi" notları kaybolur; pf_audit kayıtları kalır).

begin;

CREATE OR REPLACE FUNCTION public.oz_seller_earnings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid := public.oz_my_seller(); hold int := public.oz_hold_days();
  d0 timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
begin
  if sid is null then raise exception 'PF_STATE: Satıcı hesabı yok'; end if;
  return jsonb_build_object(
    'in_progress_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and status in ('new','accepted','packed','shipped') and payment_status = 'paid'), 0),
    'holding_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and status = 'delivered' and payout_id is null and payment_status = 'paid'
          and delivered_at > now() - make_interval(days => hold)), 0),
    'available_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and status = 'delivered' and payout_id is null and delivered_at <= now() - make_interval(days => hold)
          and payment_status = 'paid'), 0),
    'payout_pending_kurus', coalesce((select sum(amount_kurus) from public.oz_payouts where seller_id = sid and status = 'pending'), 0),
    'paid_kurus', coalesce((select sum(amount_kurus) from public.oz_payouts where seller_id = sid and status = 'paid'), 0),
    'pending_adjustments_kurus', coalesce((select -sum(amount_kurus) from public.oz_seller_adjustments where seller_id = sid and settled_payout_id is null), 0),
    'hold_days', hold,
    'today_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and payment_status = 'paid' and status not in ('cancelled') and created_at >= d0), 0),
    'today_orders', (select count(*) from public.oz_orders
        where seller_id = sid and payment_status = 'paid' and status not in ('cancelled') and created_at >= d0),
    'week_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and payment_status = 'paid' and status not in ('cancelled') and created_at >= d0 - interval '6 days'), 0),
    'week_orders', (select count(*) from public.oz_orders
        where seller_id = sid and payment_status = 'paid' and status not in ('cancelled') and created_at >= d0 - interval '6 days')
  );
end $function$;

CREATE OR REPLACE FUNCTION public.oz_admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare hold int := public.oz_hold_days();
begin
  perform public.oz_admin_guard();
  return jsonb_build_object(
    'sellers_pending', (select count(*) from public.oz_sellers where status = 'pending'),
    'sellers_approved', (select count(*) from public.oz_sellers where status = 'approved'),
    'products_pending', (select count(*) from public.oz_products where status = 'pending'),
    'products_published', (select count(*) from public.oz_products where status = 'published'),
    'returns_open', (select count(*) from public.oz_returns where status = 'requested'),
    'refunds_pending', (select count(*) from public.oz_orders where payment_status = 'refund_pending'),
    'orders', coalesce((select jsonb_object_agg(status, c) from (select status, count(*) c from public.oz_orders group by status) x), '{}'::jsonb),
    'gmv_kurus', coalesce((select sum(total_kurus) from public.oz_orders where status = 'delivered'), 0),
    'commission_kurus', coalesce((select sum(commission_kurus) from public.oz_orders where status = 'delivered'), 0),
    'payable_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders where status = 'delivered' and payout_id is null
                                 and payment_status = 'paid' and delivered_at <= now() - make_interval(days => hold)), 0),
    'payouts_pending', (select count(*) from public.oz_payouts where status = 'pending'),
    'pending_adjustments_kurus', coalesce((select -sum(amount_kurus) from public.oz_seller_adjustments where settled_payout_id is null), 0),
    'payouts_overdue', (select count(*) from public.oz_orders o left join public.oz_payouts pa on pa.id = o.payout_id
                         where o.status = 'delivered' and o.payment_status = 'paid' and (o.payout_id is null or pa.status = 'pending')
                           and public.oz_add_business_days(o.delivered_at, 5) < now())
  );
end $function$;

CREATE OR REPLACE FUNCTION public.oz_admin_list(p_kind text, p_status text DEFAULT NULL::text, p_q text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare lim int := greatest(1, least(p_limit, 100)); off int := greatest(0, p_offset); q text := nullif(public.pf_norm_text(coalesce(p_q, '')), ''); res jsonb;
begin
  perform public.oz_admin_guard();
  if p_kind = 'sellers' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select s.id, s.display_name, s.kind, s.legal_name, s.city, s.status, s.status_reason, s.commission_bps, s.rating_avg, s.created_at,
             (select count(*) from public.oz_seller_documents d where d.seller_id = s.id and d.status = 'pending') as docs_pending,
             (select count(*) from public.oz_products pr where pr.seller_id = s.id) as product_count
        from public.oz_sellers s where (p_status is null or s.status = p_status)
         and (q is null or public.pf_norm_text(s.display_name) like '%' || q || '%')
       order by (s.status = 'pending') desc, s.created_at desc limit lim offset off) x;
  elsif p_kind = 'products' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select pr.id, pr.name, pr.status, pr.status_reason, pr.images[1] as image, s.display_name as seller_name, c.name as category,
             (select min(price_kurus) from public.oz_variants v where v.product_id = pr.id) as price_kurus, pr.created_at
        from public.oz_products pr join public.oz_sellers s on s.id = pr.seller_id left join public.oz_categories c on c.id = pr.category_id
       where (p_status is null or pr.status = p_status) and (q is null or public.pf_norm_text(pr.name) like '%' || q || '%')
       order by (pr.status = 'pending') desc, pr.created_at desc limit lim offset off) x;
  elsif p_kind = 'orders' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select o.id, o.order_no, o.status, o.payment_status, o.payment_method, o.total_kurus, o.commission_kurus, o.created_at, s.display_name as seller_name,
             o.ship_to->>'recipient' as recipient, o.tracking_no, o.carrier
        from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
       where (p_status is null or o.status = p_status or o.payment_status = p_status)
         and (q is null or public.pf_norm_text(o.order_no) like '%' || q || '%' or public.pf_norm_text(coalesce(o.ship_to->>'recipient', '')) like '%' || q || '%')
       order by o.created_at desc limit lim offset off) x;
  elsif p_kind = 'returns' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select r.id, r.status, r.reason, r.details, r.decision_note, r.created_at, o.id as order_id, o.order_no, o.total_kurus, s.display_name as seller_name
        from public.oz_returns r join public.oz_orders o on o.id = r.order_id join public.oz_sellers s on s.id = o.seller_id
       where (p_status is null or r.status = p_status) order by (r.status = 'requested') desc, r.created_at desc limit lim offset off) x;
  elsif p_kind = 'payouts' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select pa.*, s.display_name as seller_name from public.oz_payouts pa join public.oz_sellers s on s.id = pa.seller_id
       where (p_status is null or pa.status = p_status) order by pa.created_at desc limit lim offset off) x;
  elsif p_kind = 'payouts_due' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select s.id as seller_id, s.display_name as seller_name,
             coalesce(sum(o.seller_share_kurus) filter (where o.delivered_at <= now() - make_interval(days => public.oz_hold_days())), 0) as available_kurus,
             sum(o.seller_share_kurus) as unpaid_kurus, count(*) as order_count, min(o.delivered_at) as oldest_delivered_at,
             public.oz_add_business_days(min(o.delivered_at), 5) as due_by,
             coalesce((select -sum(a.amount_kurus) from public.oz_seller_adjustments a where a.seller_id = s.id and a.settled_payout_id is null), 0) as pending_adjustments_kurus
        from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
       where o.status = 'delivered' and o.payment_status = 'paid' and o.payout_id is null
       group by s.id, s.display_name order by min(o.delivered_at) limit lim offset off) x;
  elsif p_kind = 'reviews' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select rv.id, rv.rating, rv.comment, rv.hidden, rv.created_at, pr.name as product_name
        from public.oz_reviews rv join public.oz_products pr on pr.id = rv.product_id order by rv.created_at desc limit lim offset off) x;
  elsif p_kind = 'questions' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into res from (
      select qu.id, qu.question, qu.answer, qu.status, qu.created_at, pr.name as product_name
        from public.oz_questions qu join public.oz_products pr on pr.id = qu.product_id order by qu.created_at desc limit lim offset off) x;
  else
    raise exception 'PF_INPUT: Bilinmeyen liste';
  end if;
  return res;
end $function$;

drop function if exists public.oz_admin_refund_resolve(uuid, text);
drop function if exists public.oz_admin_refund_required(boolean);
drop function if exists public.oz_iyz_item_shares(uuid, uuid[]);
alter table public.oz_payments drop constraint if exists oz_payments_resolved_note_check;
alter table public.oz_payments drop column if exists resolved_note;
alter table public.oz_payments drop column if exists resolved_at;

commit;
