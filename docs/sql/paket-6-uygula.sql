-- PAKET 6: Hakediş süresi (5 iş günü, ETAHS Yön. md. 11/2-a) + iade mahsubu
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, tek işlem (begin/commit) olarak çalıştırılır.
-- Geri alma: docs/sql/paket-6-geri-al.sql
--
-- Özet
--  1) oz_hold_days(): yalnız oz_payout_hold_days (varsayılan 3, takvim günü). return_days+7 bağı kalktı. Ayar 21 → 3.
--  2) oz_add_business_days(ts, n): hafta sonlarını (Europe/Istanbul) atlar. RESMÎ TATİLLERİ BİLMEZ.
--  3) oz_seller_adjustments: satıcıya negatif düzeltme (mahsup). RLS: satıcı kendi kaydını, yönetici hepsini okur;
--     yazma yalnız SECURITY DEFINER fonksiyonlarla (doğrudan insert/update/delete politikası yok).
--  4) oz_admin_mark_refunded: ücret iadesi işaretlenince sipariş ZATEN bir hakedişe bağlıysa (payout pending/paid)
--     -seller_share_kurus tutarında düzeltme kaydı (sipariş başına tek kayıt). Bağlı değilse kayıt yok
--     (sipariş 'returned' olduğu için zaten hakedişe girmez).
--  5) oz_admin_create_payout: brüt − çözülmemiş düzeltmeler; net ≤ 0 → "Mahsup sonrası ödenecek tutar yok"
--     (düzeltmeler sonraya kalır); düzeltmeler settled_payout_id ile işaretlenir.
--  6) oz_admin_mark_payout (başarısız): o ödemeye bağlanan düzeltmeler serbest kalır; o ödemedeki siparişler için
--     henüz çözülmemiş düzeltmeler silinir (para hiç gitmediği için mahsup gereksiz).
--  7) oz_seller_earnings ve oz_admin_overview: pending_adjustments_kurus; overview: payouts_overdue
--     (teslimden 5 iş günü geçmiş, ödenmemiş sipariş sayısı).
--  8) oz_admin_list('payouts_due'): satıcı başına ödemeye hazır tutar, mahsup, en eski teslim ve son ödeme günü.
begin;

-- 1) bekletme süresi
create or replace function public.oz_hold_days()
 returns integer language sql stable security definer set search_path to ''
as $function$ select public.oz_int('oz_payout_hold_days', 3) $function$;

update public.oz_settings set value = to_jsonb(3), updated_at = now() where key = 'oz_payout_hold_days';
insert into public.oz_settings(key, value, updated_at) select 'oz_payout_hold_days', to_jsonb(3), now()
 where not exists (select 1 from public.oz_settings where key = 'oz_payout_hold_days');

-- 2) iş günü (Cumartesi/Pazar atlanır; resmî tatiller hesaba KATILMAZ)
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
revoke all on function public.oz_add_business_days(timestamptz, integer) from public, anon;
grant execute on function public.oz_add_business_days(timestamptz, integer) to authenticated;

-- 3) düzeltme (mahsup) tablosu
create table public.oz_seller_adjustments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.oz_sellers(id) on delete restrict,
  order_id uuid references public.oz_orders(id) on delete set null,
  amount_kurus integer not null check (amount_kurus < 0),
  reason text not null check (char_length(reason) between 1 and 300),
  settled_payout_id uuid references public.oz_payouts(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index oz_seller_adjustments_order_uq on public.oz_seller_adjustments(order_id) where order_id is not null;
create index oz_seller_adjustments_open_idx on public.oz_seller_adjustments(seller_id) where settled_payout_id is null;
alter table public.oz_seller_adjustments enable row level security;
revoke all on public.oz_seller_adjustments from anon, authenticated;
grant select on public.oz_seller_adjustments to authenticated;
create policy p_adj_sel on public.oz_seller_adjustments for select to authenticated
  using ((seller_id = public.oz_my_seller()) or public.pf_is_admin());

-- 4) ücret iadesi → (hakedişe bağlıysa) mahsup kaydı
create or replace function public.oz_admin_mark_refunded(p_order uuid, p_reference text default null::text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o public.oz_orders%rowtype;
begin
  perform public.oz_admin_guard();
  update public.oz_orders set payment_status = 'refunded', payment_reference = coalesce(nullif(btrim(p_reference), ''), payment_reference)
   where id = p_order and payment_status = 'refund_pending' returning * into o;
  if not found then raise exception 'PF_STATE: Bu sipariş iade bekleyen durumda değil'; end if;
  if o.payout_id is not null and o.seller_share_kurus > 0
     and exists (select 1 from public.oz_payouts where id = o.payout_id and status in ('pending', 'paid')) then
    insert into public.oz_seller_adjustments (seller_id, order_id, amount_kurus, reason)
    values (o.seller_id, o.id, -o.seller_share_kurus, 'İade mahsubu: ' || o.order_no)
    on conflict (order_id) where order_id is not null do nothing;
    if found then
      perform public.pf_audit('oz_adjustment_add', 'oz_order', p_order::text,
        jsonb_build_object('amount_kurus', -o.seller_share_kurus, 'payout_id', o.payout_id));
    end if;
  end if;
  perform public.oz_notify((select customer_id from public.oz_orders where id = p_order), p_order, 'refunded', 'Ödeme iadesi yapıldı', 'Ödemen iade edildi.', 'refunded:' || p_order);
  perform public.pf_audit('oz_refund_done', 'oz_order', p_order::text, jsonb_build_object('reference', p_reference));
end $function$;

-- 5) hakediş: brüt − mahsup
create or replace function public.oz_admin_create_payout(p_seller uuid)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare hold int := public.oz_hold_days(); v_sum int; v_adj int; v_net int; v_id uuid; v_iban text;
begin
  perform public.oz_admin_guard();
  select iban into v_iban from public.oz_sellers where id = p_seller for update;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  if v_iban is null or not public.oz_iban_ok(v_iban) then raise exception 'PF_STATE: Satıcı geçerli bir IBAN girmemiş; ödeme kaydı oluşturulamaz'; end if;
  select coalesce(sum(seller_share_kurus), 0) into v_sum from public.oz_orders
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid'
     and delivered_at <= now() - make_interval(days => hold);
  if v_sum <= 0 then raise exception 'PF_STATE: Ödenecek tutar yok'; end if;
  perform 1 from public.oz_seller_adjustments where seller_id = p_seller and settled_payout_id is null for update;
  select coalesce(sum(amount_kurus), 0) into v_adj from public.oz_seller_adjustments where seller_id = p_seller and settled_payout_id is null;
  v_net := v_sum + v_adj;
  if v_net <= 0 then raise exception 'PF_STATE: Mahsup sonrası ödenecek tutar yok'; end if;
  insert into public.oz_payouts (seller_id, amount_kurus, note)
  values (p_seller, v_net, case when v_adj < 0 then 'Brüt ' || v_sum || ' kuruş, mahsup ' || v_adj || ' kuruş' end) returning id into v_id;
  update public.oz_orders set payout_id = v_id
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid'
     and delivered_at <= now() - make_interval(days => hold);
  update public.oz_seller_adjustments set settled_payout_id = v_id where seller_id = p_seller and settled_payout_id is null;
  perform public.pf_audit('oz_payout_create', 'oz_payout', v_id::text, jsonb_build_object('amount_kurus', v_net, 'gross_kurus', v_sum, 'adjustments_kurus', v_adj));
  return v_id;
end $function$;

-- 6) ödeme başarısız → mahsup serbest / gereksiz mahsup silinir
create or replace function public.oz_admin_mark_payout(p_id uuid, p_paid boolean, p_reference text default null::text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare po public.oz_payouts%rowtype; n_rel int := 0; n_del int := 0;
begin
  perform public.oz_admin_guard();
  select * into po from public.oz_payouts where id = p_id for update;
  if not found or po.status <> 'pending' then raise exception 'PF_STATE: Ödeme kaydı bekleyen durumda değil'; end if;
  update public.oz_payouts set status = case when p_paid then 'paid' else 'failed' end, bank_reference = nullif(btrim(p_reference), ''),
         paid_at = case when p_paid then now() end where id = p_id;
  if not p_paid then
    delete from public.oz_seller_adjustments
     where settled_payout_id is null and order_id in (select id from public.oz_orders where payout_id = p_id);
    get diagnostics n_del = row_count;
    update public.oz_seller_adjustments set settled_payout_id = null where settled_payout_id = p_id;
    get diagnostics n_rel = row_count;
    update public.oz_orders set payout_id = null where payout_id = p_id;
  end if;
  perform public.oz_notify((select owner_user_id from public.oz_sellers where id = po.seller_id), null, 'payout',
    case when p_paid then 'Ödemen yapıldı' else 'Ödeme başarısız' end, '', 'payout:' || p_id);
  perform public.pf_audit('oz_payout_mark', 'oz_payout', p_id::text,
    jsonb_build_object('paid', p_paid) || case when p_paid then '{}'::jsonb else jsonb_build_object('adjustments_released', n_rel, 'adjustments_voided', n_del) end);
end $function$;

-- 7a) satıcı kazancı: pending_adjustments_kurus (pozitif, düşülecek tutar)
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

-- 7b) yönetici özeti: pending_adjustments_kurus + payouts_overdue
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
    'payouts_pending', (select count(*) from public.oz_payouts where status = 'pending'),
    'pending_adjustments_kurus', coalesce((select -sum(amount_kurus) from public.oz_seller_adjustments where settled_payout_id is null), 0),
    'payouts_overdue', (select count(*) from public.oz_orders o left join public.oz_payouts pa on pa.id = o.payout_id
                         where o.status = 'delivered' and o.payment_status = 'paid' and (o.payout_id is null or pa.status = 'pending')
                           and public.oz_add_business_days(o.delivered_at, 5) < now())
  );
end $function$;

-- 8) oz_admin_list: 'payouts_due' türü eklendi (diğer türler aynen)
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

commit;
