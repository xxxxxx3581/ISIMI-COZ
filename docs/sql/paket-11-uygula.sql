-- Paket 11: iyzico siparişleri için ekran/sayaç düzeltmeleri ve "iade gerekli ödeme" görünürlüğü
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, Supabase SQL Editor'de tek parça çalıştırılır. Ön koşul: Paket 10 uygulanmış olmalı
-- (oz_payments, iyzico kolonları; canlıda var). Geri alma: docs/sql/paket-11-geri-al.sql
--
-- Elle hakediş (mock/cod) sonuçları DEĞİŞMEZ: yalnız payment_method <> 'online' koşulu eklenir; canlıda online sipariş yok.
-- Değişenler (mevcut alanlar silinmez/yeniden adlandırılmaz; yalnız ekleme):
--  1) oz_iyz_item_shares(): kalem bazında satıcı payı (oz_iyz_prepare ile aynı dağıtım; toplam = seller_share_kurus).
--  2) oz_seller_earnings: in_progress/holding/available yalnız elle hakedişli siparişler; + iyzico_pending_kurus, iyzico_approved_kurus,
--     iyzico_waiting_kurus (onay sonrası satıcı hesabına aktarım süresi TEYİTSİZ).
--  3) oz_admin_overview: payable_kurus ve payouts_overdue yalnız elle hakedişli; + refund_required_count.
--  4) oz_admin_list: payouts_due yalnız elle hakedişli; returns satırına + payment_method, iyzico_approved.
--  5) oz_payments.resolved_at / resolved_note; oz_admin_refund_required(), oz_admin_refund_resolve() (yalnız not; otomatik iade YOK).

begin;

-- 1) kalem bazında satıcı payı (iyzico'ya oz_iyz_prepare ile gönderilen subMerchantPrice ile AYNI yöntem):
--    ürün satırı payı = satır − komisyonun satıra düşen kısmı; komisyon satırlara satır tutarıyla orantılı tabanla (floor) dağıtılır,
--    kalan kuruşlar en büyük kesirli kalana sahip satırlara (eşitlikte id sırası) birer birer verilir; kargo kalemi tamamen satıcıya.
--    Böylece bir siparişin kalem payları toplamı = subtotal − commission + shipping = seller_share_kurus (kuruşu kuruşuna).
create or replace function public.oz_iyz_item_shares(p_seller uuid default null, p_orders uuid[] default null)
 returns table (kind text, ref uuid, order_id uuid, seller_id uuid, share_kurus integer, approve_status text)
 language sql stable security definer set search_path to ''
as $function$
  with o as (
    select o.* from public.oz_orders o
     where o.payment_method = 'online' and (p_seller is null or o.seller_id = p_seller) and (p_orders is null or o.id = any (p_orders))
       and o.subtotal_kurus > 0),
  it as (
    select i.id, i.order_id, o.seller_id, i.line_total_kurus lt, o.commission_kurus comm, coalesce(i.iyzico_approve_status, 'pending') st,
           ((i.line_total_kurus::bigint * o.commission_kurus) / o.subtotal_kurus)::int base,
           ((i.line_total_kurus::bigint * o.commission_kurus) % o.subtotal_kurus) frac
      from public.oz_order_items i join o on o.id = i.order_id),
  r as (select it.*, comm - sum(base) over (partition by it.order_id) rem, row_number() over (partition by it.order_id order by frac desc, id) rn from it)
  select 'item', r.id, r.order_id, r.seller_id, (r.lt - (r.base + case when r.rn <= r.rem then 1 else 0 end))::int, r.st from r
  union all
  select 'ship', o.id, o.id, o.seller_id, o.shipping_fee_kurus, coalesce(o.iyzico_ship_approve_status, 'pending') from o where o.shipping_fee_kurus > 0
$function$;
revoke all on function public.oz_iyz_item_shares(uuid, uuid[]) from public, anon, authenticated;

-- 2) "iade gerekli" kayıtlarının çözüldü işareti
alter table public.oz_payments add column if not exists resolved_at timestamptz;
alter table public.oz_payments add column if not exists resolved_note text;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'oz_payments_resolved_note_check' and conrelid = 'public.oz_payments'::regclass) then
    alter table public.oz_payments add constraint oz_payments_resolved_note_check check (resolved_note is null or char_length(resolved_note) <= 300);
  end if;
end $c$;

-- 3) para alınmış ama sipariş açılmamış ödemeler (status failed + paid_kurus dolu) — salt okunur
create or replace function public.oz_admin_refund_required(p_include_resolved boolean default false)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
  perform public.oz_admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select p.id, p.payment_id, p.paid_kurus, p.amount_kurus, p.error, p.created_at, p.updated_at, p.resolved_at, p.resolved_note,
           (select coalesce(jsonb_agg(o.order_no order by o.order_no), '[]'::jsonb) from public.oz_orders o where o.id = any (p.order_ids)) as order_nos
      from public.oz_payments p
     where p.status = 'failed' and p.paid_kurus is not null and (coalesce(p_include_resolved, false) or p.resolved_at is null)
     order by p.created_at desc limit 200) x), '[]'::jsonb);
end $function$;
revoke all on function public.oz_admin_refund_required(boolean) from public, anon;
grant execute on function public.oz_admin_refund_required(boolean) to authenticated;

-- 4) "elle iade edildi" notu (iade iyzico panelinden elle yapılır; burada otomatik iade YOK)
create or replace function public.oz_admin_refund_resolve(p_payment uuid, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_note text := nullif(btrim(coalesce(p_note, '')), ''); pay public.oz_payments%rowtype;
begin
  perform public.oz_admin_guard();
  if v_note is null or char_length(v_note) < 3 then raise exception 'PF_INPUT: Not yaz (en az 3 karakter)'; end if;
  if char_length(v_note) > 300 then raise exception 'PF_INPUT: Not en fazla 300 karakter olabilir'; end if;
  select * into pay from public.oz_payments where id = p_payment for update;
  if not found then raise exception 'PF_STATE: Ödeme kaydı bulunamadı'; end if;
  if pay.status <> 'failed' or pay.paid_kurus is null then raise exception 'PF_STATE: Bu ödeme için iade beklenmiyor'; end if;
  if pay.resolved_at is not null then raise exception 'PF_STATE: Bu kayıt zaten çözüldü olarak işaretlendi'; end if;
  update public.oz_payments set resolved_at = now(), resolved_note = v_note, updated_at = now() where id = pay.id;
  perform public.pf_audit('oz_refund_resolved', 'oz_payment', pay.id::text,
    jsonb_build_object('note', v_note, 'payment_id', pay.payment_id, 'paid_kurus', pay.paid_kurus));
end $function$;
revoke all on function public.oz_admin_refund_resolve(uuid, text) from public, anon;
grant execute on function public.oz_admin_refund_resolve(uuid, text) to authenticated;

-- 6) değişen mevcut fonksiyonlar (özgün metin + P11 eklemeleri)
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
        where seller_id = sid and status in ('new','accepted','packed','shipped') and payment_status = 'paid' and payment_method <> 'online'), 0),
    'holding_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and status = 'delivered' and payout_id is null and payment_status = 'paid' and payment_method <> 'online'
          and delivered_at > now() - make_interval(days => hold)), 0),
    'available_kurus', coalesce((select sum(seller_share_kurus) from public.oz_orders
        where seller_id = sid and status = 'delivered' and payout_id is null and delivered_at <= now() - make_interval(days => hold)
          and payment_status = 'paid' and payment_method <> 'online'), 0),
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
        where seller_id = sid and payment_status = 'paid' and status not in ('cancelled') and created_at >= d0 - interval '6 days'),
    -- P11: kartla (iyzico) ödenen siparişler — elle hakedişe girmez; kalem payı oz_iyz_item_shares (iyzico'ya gönderilenle aynı)
    'iyzico_pending_kurus', coalesce((select sum(x.share_kurus) from public.oz_iyz_item_shares(sid, null) x join public.oz_orders o on o.id = x.order_id
        where o.payment_status = 'paid' and x.approve_status not in ('approved', 'refunded')
          and o.status = 'delivered' and o.delivered_at <= now() - make_interval(days => hold)), 0),
    'iyzico_approved_kurus', coalesce((select sum(x.share_kurus) from public.oz_iyz_item_shares(sid, null) x join public.oz_orders o on o.id = x.order_id
        where o.payment_status = 'paid' and x.approve_status = 'approved'), 0),
    'iyzico_waiting_kurus', coalesce((select sum(x.share_kurus) from public.oz_iyz_item_shares(sid, null) x join public.oz_orders o on o.id = x.order_id
        where o.payment_status = 'paid' and x.approve_status not in ('approved', 'refunded')
          and (o.status in ('new','accepted','packed','shipped') or (o.status = 'delivered' and o.delivered_at > now() - make_interval(days => hold)))), 0)
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
                                 and payment_status = 'paid' and payment_method <> 'online' and delivered_at <= now() - make_interval(days => hold)), 0),
    'payouts_pending', (select count(*) from public.oz_payouts where status = 'pending'),
    'pending_adjustments_kurus', coalesce((select -sum(amount_kurus) from public.oz_seller_adjustments where settled_payout_id is null), 0),
    'payouts_overdue', (select count(*) from public.oz_orders o left join public.oz_payouts pa on pa.id = o.payout_id
                         where o.status = 'delivered' and o.payment_status = 'paid' and o.payment_method <> 'online' and (o.payout_id is null or pa.status = 'pending')
                           and public.oz_add_business_days(o.delivered_at, 5) < now()),
    -- P11: para alınmış ama sipariş açılmamış (iade gerekli), çözülmemiş ödeme sayısı
    'refund_required_count', (select count(*) from public.oz_payments where status = 'failed' and paid_kurus is not null and resolved_at is null)
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
      select r.id, r.status, r.reason, r.details, r.decision_note, r.created_at, o.id as order_id, o.order_no, o.total_kurus, s.display_name as seller_name,
             o.payment_method,  -- P11: iyzico onayı verilmiş kalem var mı (iade onayında uyarı için)
             (o.iyzico_ship_approve_status = 'approved' or exists (select 1 from public.oz_order_items i where i.order_id = o.id and i.iyzico_approve_status = 'approved')) is true as iyzico_approved
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
       where o.status = 'delivered' and o.payment_status = 'paid' and o.payout_id is null and o.payment_method <> 'online'
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

commit;
