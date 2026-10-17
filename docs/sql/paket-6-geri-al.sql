-- PAKET 6 GERİ ALMA: hakediş/mahsup değişikliklerini 17.10.2026'da canlıdan okunan özgün tanımlara döndürür.
-- DİKKAT: oz_seller_adjustments tablosu silinir. Çözülmemiş mahsup kayıtları varsa önce dökümünü alın:
--   select * from public.oz_seller_adjustments order by created_at;
-- Mahsupla oluşmuş ödemelerin tutarı (oz_payouts.amount_kurus) ve notu olduğu gibi kalır.
begin;

create or replace function public.oz_hold_days()
 returns integer language sql stable security definer set search_path to ''
as $function$ select greatest(public.oz_int('oz_payout_hold_days', 7), public.oz_int('oz_return_days', 14) + 7) $function$;

update public.oz_settings set value = to_jsonb(21), updated_at = now() where key = 'oz_payout_hold_days';

create or replace function public.oz_admin_mark_refunded(p_order uuid, p_reference text default null::text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  perform public.oz_admin_guard();
  update public.oz_orders set payment_status = 'refunded', payment_reference = coalesce(nullif(btrim(p_reference), ''), payment_reference)
   where id = p_order and payment_status = 'refund_pending';
  if not found then raise exception 'PF_STATE: Bu sipariş iade bekleyen durumda değil'; end if;
  perform public.oz_notify((select customer_id from public.oz_orders where id = p_order), p_order, 'refunded', 'Ödeme iadesi yapıldı', 'Ödemen iade edildi.', 'refunded:' || p_order);
  perform public.pf_audit('oz_refund_done', 'oz_order', p_order::text, jsonb_build_object('reference', p_reference));
end $function$;

create or replace function public.oz_admin_create_payout(p_seller uuid)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare hold int := public.oz_hold_days(); v_sum int; v_id uuid; v_iban text;
begin
  perform public.oz_admin_guard();
  select iban into v_iban from public.oz_sellers where id = p_seller for update;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  if v_iban is null or not public.oz_iban_ok(v_iban) then raise exception 'PF_STATE: Satıcı geçerli bir IBAN girmemiş; ödeme kaydı oluşturulamaz'; end if;
  select coalesce(sum(seller_share_kurus), 0) into v_sum from public.oz_orders
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid'
     and delivered_at <= now() - make_interval(days => hold);
  if v_sum <= 0 then raise exception 'PF_STATE: Ödenecek tutar yok'; end if;
  insert into public.oz_payouts (seller_id, amount_kurus) values (p_seller, v_sum) returning id into v_id;
  update public.oz_orders set payout_id = v_id
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid'
     and delivered_at <= now() - make_interval(days => hold);
  perform public.pf_audit('oz_payout_create', 'oz_payout', v_id::text, jsonb_build_object('amount_kurus', v_sum));
  return v_id;
end $function$;

create or replace function public.oz_admin_mark_payout(p_id uuid, p_paid boolean, p_reference text default null::text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare po public.oz_payouts%rowtype;
begin
  perform public.oz_admin_guard();
  select * into po from public.oz_payouts where id = p_id for update;
  if not found or po.status <> 'pending' then raise exception 'PF_STATE: Ödeme kaydı bekleyen durumda değil'; end if;
  update public.oz_payouts set status = case when p_paid then 'paid' else 'failed' end, bank_reference = nullif(btrim(p_reference), ''),
         paid_at = case when p_paid then now() end where id = p_id;
  if not p_paid then update public.oz_orders set payout_id = null where payout_id = p_id; end if;
  perform public.oz_notify((select owner_user_id from public.oz_sellers where id = po.seller_id), null, 'payout',
    case when p_paid then 'Ödemen yapıldı' else 'Ödeme başarısız' end, '', 'payout:' || p_id);
  perform public.pf_audit('oz_payout_mark', 'oz_payout', p_id::text, jsonb_build_object('paid', p_paid));
end $function$;

create or replace function public.oz_seller_earnings()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
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

create or replace function public.oz_admin_overview()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
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
    'payouts_pending', (select count(*) from public.oz_payouts where status = 'pending')
  );
end $function$;

create or replace function public.oz_admin_list(p_kind text, p_status text default null::text, p_q text default null::text, p_limit integer default 50, p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
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

drop table if exists public.oz_seller_adjustments;
drop function if exists public.oz_add_business_days(timestamptz, integer);

commit;
