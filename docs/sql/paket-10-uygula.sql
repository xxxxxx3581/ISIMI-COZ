-- Paket 10: iyzico Pazaryeri (SANDBOX) altyapısı
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, Supabase SQL Editor'de tek parça çalıştırılır. Ön koşul: Paket 6 (oz_hold_days,
-- oz_add_business_days) uygulanmış olmalı (canlıda var). Paket 8 (tax_type) yoksa alt üye senkronu "manual_review" der.
-- Geri alma: docs/sql/paket-10-geri-al.sql
--
-- Varsayılan DEĞİŞMEZ: oz_payment_provider = 'mock' → mevcut taklit ödeme (oz_mock_pay) ve kapıda ödeme aynen çalışır.
-- Değişenler:
--  1) oz_settings.oz_payment_provider (mock | iyzico_sandbox | iyzico; varsayılan mock) + oz_payment_provider().
--  2) oz_sellers.iyzico_sub_merchant_key / iyzico_sync_status / iyzico_sync_error / iyzico_synced_at;
--     oz_order_items.iyzico_payment_transaction_id / iyzico_approved_at / iyzico_approve_status;
--     kargo kalemi için oz_orders.iyzico_ship_transaction_id / iyzico_ship_approved_at / iyzico_ship_approve_status.
--  3) oz_payments (RLS: yalnız ilgili alıcı ve yönetici okur; yazma yalnız SECURITY DEFINER RPC).
--  4) Yalnız Edge Function (service_role) çağırır: oz_iyz_prepare, oz_iyz_attach, oz_iyz_payment_by_token, oz_iyz_complete (idempotent),
--     oz_iyz_approval_target, oz_iyz_record_approval, oz_iyz_seller_for_sync, oz_iyz_seller_sync_result.
--  5) oz_admin_iyzico_items (yönetici, salt okunur).
--  6) oz_place_order: 'online' yöntemi yalnız sağlayıcı iyzico iken; sepetteki satıcılar alt üye olmalı. Diğer yollar aynen.
--  7) oz_public_settings: + payment_provider.
--  8) oz_admin_create_payout: iyzico ile ödenmiş (payment_method 'online') siparişler elle hakedişe girmez (para iyzico onayıyla aktarılır;
--     çift ödeme önlenir). Not: oz_seller_earnings / oz_admin_overview / payouts_due gösterimleri bu siparişleri hâlâ "ödenebilir" sayar (TODO).
-- Teyitsiz (iyzico'ya soruluyor; koda gömülmedi): onay sonrası aktarım süresi, onay sonrası iade/geri çekme, alt üye türüne göre zorunlu
-- alanlar, stopajın kimde olduğu, esnaf (muaf) / çiftçi için alt üye türü.

begin;

-- 1) ayar + yardımcılar
insert into public.oz_settings (key, value) values ('oz_payment_provider', '"mock"'::jsonb) on conflict (key) do nothing;

create or replace function public.oz_payment_provider()
 returns text language sql stable security definer set search_path to ''
as $function$
  select case when v in ('mock', 'iyzico_sandbox', 'iyzico') then v else 'mock' end
    from (select coalesce((select value #>> '{}' from public.oz_settings where key = 'oz_payment_provider'), 'mock') as v) x
$function$;
revoke all on function public.oz_payment_provider() from public;
grant execute on function public.oz_payment_provider() to anon, authenticated, service_role;

-- Edge Function service role ile çağırır; auth.uid() boştur → yetki, JWT'den doğrulanmış kullanıcı id'si ile kontrol edilir (pf_is_admin ile aynı kaynak)
create or replace function public.oz_iyz_actor_admin(p_actor uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select p_actor is not null and (exists (select 1 from public.pf_admin_roles r where r.user_id = p_actor)
                                  or exists (select 1 from public.food_admins a where a.user_id = p_actor))
$function$;

-- güvenli özet: yalnız izinli alanlar (kart bilgisi, bin, son 4 hane, ad vb. ASLA saklanmaz)
create or replace function public.oz_iyz_safe_summary(p jsonb)
 returns jsonb language sql immutable set search_path to ''
as $function$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(coalesce(p, '{}'::jsonb)) e(k, v)
   where k in ('status', 'paymentStatus', 'fraudStatus', 'errorCode', 'errorMessage', 'errorGroup', 'currency', 'price', 'paidPrice',
               'installment', 'phase', 'mdStatus', 'network', 'signatureOk', 'op', 'httpStatus')
     and jsonb_typeof(v) in ('string', 'number', 'boolean', 'null')
$function$;

-- 2) kolonlar
alter table public.oz_sellers add column if not exists iyzico_sub_merchant_key text;
alter table public.oz_sellers add column if not exists iyzico_sync_status text;
alter table public.oz_sellers add column if not exists iyzico_sync_error text;
alter table public.oz_sellers add column if not exists iyzico_synced_at timestamptz;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'oz_sellers_iyzico_sync_status_check' and conrelid = 'public.oz_sellers'::regclass) then
    alter table public.oz_sellers add constraint oz_sellers_iyzico_sync_status_check
      check (iyzico_sync_status is null or iyzico_sync_status in ('pending', 'synced', 'failed', 'manual_review'));
  end if;
end $c$;

alter table public.oz_order_items add column if not exists iyzico_payment_transaction_id text;
alter table public.oz_order_items add column if not exists iyzico_approved_at timestamptz;
alter table public.oz_order_items add column if not exists iyzico_approve_status text;
alter table public.oz_orders add column if not exists iyzico_ship_transaction_id text;
alter table public.oz_orders add column if not exists iyzico_ship_approved_at timestamptz;
alter table public.oz_orders add column if not exists iyzico_ship_approve_status text;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'oz_order_items_iyzico_approve_status_check' and conrelid = 'public.oz_order_items'::regclass) then
    alter table public.oz_order_items add constraint oz_order_items_iyzico_approve_status_check
      check (iyzico_approve_status is null or iyzico_approve_status in ('pending', 'approved', 'failed', 'disapproved', 'refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'oz_orders_iyzico_ship_approve_status_check' and conrelid = 'public.oz_orders'::regclass) then
    alter table public.oz_orders add constraint oz_orders_iyzico_ship_approve_status_check
      check (iyzico_ship_approve_status is null or iyzico_ship_approve_status in ('pending', 'approved', 'failed', 'disapproved', 'refunded'));
  end if;
end $c$;

-- 3) ödeme kayıtları
create table if not exists public.oz_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  order_ids uuid[] not null check (cardinality(order_ids) between 1 and 40),
  provider text not null check (provider in ('iyzico_sandbox', 'iyzico')),
  conversation_id text not null unique,
  token text unique,
  status text not null default 'initiated' check (status in ('initiated', 'paid', 'failed', 'refunded')),
  payment_id text,
  amount_kurus integer not null check (amount_kurus > 0),
  paid_kurus integer,
  summary jsonb not null default '{}'::jsonb,
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists oz_payments_orders_idx on public.oz_payments using gin (order_ids);
create index if not exists oz_payments_customer_idx on public.oz_payments (customer_id, created_at desc);
alter table public.oz_payments enable row level security;
revoke all on public.oz_payments from public, anon, authenticated;
grant select on public.oz_payments to authenticated;
drop policy if exists p_ozpay_sel on public.oz_payments;
create policy p_ozpay_sel on public.oz_payments for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.pf_is_admin()));

-- 4) ödeme başlatma: sepet SUNUCUDA siparişlerden kurulur; istemci tutarı hiç kullanılmaz
create or replace function public.oz_iyz_prepare(p_user uuid, p_order_ids uuid[])
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_prov text := public.oz_payment_provider(); v_ids uuid[]; v_items jsonb; v_amount int; v_conv text; v_pid uuid;
        v_first public.oz_orders%rowtype; v_email text; v_bad text;
begin
  if v_prov not in ('iyzico_sandbox', 'iyzico') then raise exception 'PF_STATE: Online ödeme şu an kapalı'; end if;
  if p_user is null then raise exception 'PF_AUTH: Giriş yapmalısın'; end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_order_ids) x where x is not null;
  if v_ids is null or cardinality(v_ids) > 40 then raise exception 'PF_INPUT: Sipariş seçilmedi'; end if;
  perform 1 from public.oz_orders where id = any (v_ids) order by id for update;
  if exists (select 1 from unnest(v_ids) x(id) left join public.oz_orders o on o.id = x.id
              where o.id is null or o.customer_id <> p_user or o.status <> 'awaiting_payment' or o.payment_method <> 'online' or o.payment_status <> 'pending') then
    raise exception 'PF_STATE: Sipariş ödemeye uygun değil';
  end if;
  -- tutar tutarlılığı (sipariş satırları oz_place_order'da varyant fiyatından sunucuda yazıldı)
  select o.order_no into v_bad from public.oz_orders o where o.id = any (v_ids) and (
      o.discount_kurus <> 0 or o.subtotal_kurus <= 0
      or o.subtotal_kurus <> (select coalesce(sum(i.line_total_kurus), 0) from public.oz_order_items i where i.order_id = o.id)
      or o.total_kurus <> o.subtotal_kurus + o.shipping_fee_kurus
      or o.seller_share_kurus <> o.subtotal_kurus - o.commission_kurus + o.shipping_fee_kurus
      or o.commission_kurus < 0 or o.commission_kurus >= o.subtotal_kurus
      or exists (select 1 from public.oz_order_items i where i.order_id = o.id and (i.line_total_kurus <= 0 or i.line_total_kurus <> i.unit_price_kurus * i.quantity)))
    limit 1;
  if v_bad is not null then raise exception 'PF_STATE: % numaralı siparişin tutarı doğrulanamadı', v_bad; end if;
  select s.display_name into v_bad from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
   where o.id = any (v_ids) and (s.iyzico_sub_merchant_key is null or s.iyzico_sync_status is distinct from 'synced') limit 1;
  if v_bad is not null then raise exception 'PF_STATE: "%" şu an online ödeme alamıyor', v_bad; end if;

  -- kalemler: ürün satırı fiyatı = satır toplamı; satıcı payı = satır − komisyonun satıra düşen kısmı (en büyük kalan yöntemiyle, toplamı birebir)
  with it as (
    select i.id, i.order_id, i.product_name, i.line_total_kurus lt, o.commission_kurus comm, s.iyzico_sub_merchant_key smk,
           ((i.line_total_kurus::bigint * o.commission_kurus) / o.subtotal_kurus)::int base,
           ((i.line_total_kurus::bigint * o.commission_kurus) % o.subtotal_kurus) frac
      from public.oz_order_items i join public.oz_orders o on o.id = i.order_id join public.oz_sellers s on s.id = o.seller_id
     where o.id = any (v_ids)),
  r as (select it.*, comm - sum(base) over (partition by order_id) rem, row_number() over (partition by order_id order by frac desc, id) rn from it),
  lines as (
    select order_id, 1 k, id::text ref, 'item:' || id bid, left(coalesce(product_name, 'Ürün'), 100) nm, lt price, lt - (base + case when rn <= rem then 1 else 0 end) sub, smk from r
    union all
    select o.id, 2, o.id::text, 'ship:' || o.id, 'Kargo', o.shipping_fee_kurus, o.shipping_fee_kurus, s.iyzico_sub_merchant_key
      from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id where o.id = any (v_ids) and o.shipping_fee_kurus > 0)
  select jsonb_agg(jsonb_build_object('id', bid, 'kind', case k when 1 then 'item' else 'ship' end, 'ref', ref, 'order_id', order_id, 'name', nm,
                   'price_kurus', price, 'sub_merchant_key', smk, 'sub_merchant_price_kurus', sub) order by order_id, k, ref),
         sum(price)
    into v_items, v_amount from lines;
  -- denetim: kalem toplamı = sipariş toplamları; satıcı payları = seller_share; her kalem > 0 ve satıcı payı ≤ fiyat
  if v_amount is distinct from (select sum(total_kurus) from public.oz_orders where id = any (v_ids))
     or exists (select 1 from jsonb_array_elements(v_items) e where (e->>'price_kurus')::int <= 0 or (e->>'sub_merchant_price_kurus')::int <= 0
                   or (e->>'sub_merchant_price_kurus')::int > (e->>'price_kurus')::int)
     or exists (select 1 from public.oz_orders o where o.id = any (v_ids) and o.seller_share_kurus <>
                  (select sum((e->>'sub_merchant_price_kurus')::int) from jsonb_array_elements(v_items) e where (e->>'order_id')::uuid = o.id)) then
    raise exception 'PF_STATE: Ödeme tutarı doğrulanamadı';
  end if;

  select * into v_first from public.oz_orders where id = v_ids[1];
  select email into v_email from auth.users where id = p_user;
  v_conv := gen_random_uuid()::text;
  insert into public.oz_payments (customer_id, order_ids, provider, conversation_id, amount_kurus)
  values (p_user, v_ids, v_prov, v_conv, v_amount) returning id into v_pid;
  perform public.pf_audit('oz_iyz_init', 'oz_payment', v_pid::text, jsonb_build_object('actor', p_user, 'orders', to_jsonb(v_ids), 'amount_kurus', v_amount, 'provider', v_prov));
  return jsonb_build_object('payment_id', v_pid, 'conversation_id', v_conv, 'provider', v_prov, 'amount_kurus', v_amount, 'items', v_items,
    'buyer', jsonb_build_object('id', p_user, 'email', v_email, 'name', v_first.ship_to->>'recipient', 'phone', coalesce(v_first.phone, v_first.ship_to->>'phone')),
    'address', jsonb_build_object('recipient', v_first.ship_to->>'recipient', 'city', v_first.ship_to->>'city', 'district', v_first.ship_to->>'district',
      'line', concat_ws(', ', v_first.ship_to->>'address_line', v_first.ship_to->>'neighborhood', v_first.ship_to->>'district'), 'postal_code', v_first.ship_to->>'postal_code'));
end $function$;

create or replace function public.oz_iyz_attach(p_payment uuid, p_token text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if p_token is null or char_length(p_token) not between 8 and 200 then raise exception 'PF_INPUT: Geçersiz ödeme anahtarı'; end if;
  update public.oz_payments set token = p_token, updated_at = now() where id = p_payment and status = 'initiated' and token is null;
  if not found then raise exception 'PF_STATE: Ödeme kaydı bulunamadı'; end if;
end $function$;

create or replace function public.oz_iyz_payment_by_token(p_token text)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object('id', id, 'conversation_id', conversation_id, 'status', status, 'amount_kurus', amount_kurus, 'order_ids', to_jsonb(order_ids),
                            'provider', provider, 'customer_id', customer_id, 'token', token)
    from public.oz_payments where token = p_token and p_token is not null
$function$;

-- 5) ödeme sonucu: idempotent (aynı geri çağrı ikinci kez gelirse yalnız mevcut durum döner)
create or replace function public.oz_iyz_complete(p_payment uuid, p_token text, p_success boolean, p_payment_id text, p_paid_kurus integer,
                                                   p_items jsonb, p_summary jsonb, p_error text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare pay public.oz_payments%rowtype; v_sum jsonb := public.oz_iyz_safe_summary(p_summary); it jsonb; n int := 0; n_need int; o record;
begin
  select * into pay from public.oz_payments where id = p_payment for update;
  if not found then raise exception 'PF_STATE: Ödeme kaydı bulunamadı'; end if;
  if pay.token is null or p_token is null or pay.token <> p_token then raise exception 'PF_AUTH: Ödeme anahtarı eşleşmedi'; end if;
  if pay.status <> 'initiated' then
    return jsonb_build_object('status', pay.status, 'duplicate', true, 'order_ids', to_jsonb(pay.order_ids));
  end if;
  if not coalesce(p_success, false) then
    update public.oz_payments set status = 'failed', error = left(coalesce(p_error, 'Ödeme başarısız'), 500), summary = v_sum, updated_at = now() where id = pay.id;
    perform public.pf_audit('oz_iyz_failed', 'oz_payment', pay.id::text, jsonb_build_object('error', left(p_error, 200)));
    return jsonb_build_object('status', 'failed', 'order_ids', to_jsonb(pay.order_ids));
  end if;
  if p_paid_kurus is distinct from pay.amount_kurus then
    update public.oz_payments set status = 'failed', payment_id = p_payment_id, paid_kurus = p_paid_kurus, summary = v_sum, updated_at = now(),
           error = 'Tahsil edilen tutar beklenenden farklı; iade gerekebilir' where id = pay.id;
    perform public.pf_audit('oz_iyz_amount_mismatch', 'oz_payment', pay.id::text, jsonb_build_object('expected', pay.amount_kurus, 'paid', p_paid_kurus, 'payment_id', p_payment_id));
    return jsonb_build_object('status', 'failed', 'refund_required', true, 'order_ids', to_jsonb(pay.order_ids));
  end if;
  perform 1 from public.oz_orders where id = any (pay.order_ids) order by id for update;
  if exists (select 1 from public.oz_orders where id = any (pay.order_ids) and (status <> 'awaiting_payment' or payment_status <> 'pending')) then
    -- sipariş bu arada iptal edilmiş / başka ödemeyle ödenmiş: para alındı ama sipariş açılmaz → iade gerekir (TODO: otomatik iade)
    update public.oz_payments set status = 'failed', payment_id = p_payment_id, paid_kurus = p_paid_kurus, summary = v_sum, updated_at = now(),
           error = 'Sipariş ödemeye uygun değildi (iptal/çift ödeme); iade gerekir' where id = pay.id;
    perform public.pf_audit('oz_iyz_late_payment', 'oz_payment', pay.id::text, jsonb_build_object('payment_id', p_payment_id, 'paid', p_paid_kurus));
    return jsonb_build_object('status', 'failed', 'refund_required', true, 'order_ids', to_jsonb(pay.order_ids));
  end if;
  -- kırılımlar: her sepet kalemi için tek paymentTransactionId, hepsi bu ödemenin siparişlerine ait olmalı
  if jsonb_typeof(p_items) <> 'array' then raise exception 'PF_INPUT: Ödeme kırılımları eksik'; end if;
  select count(*) + (select count(*) from public.oz_orders where id = any (pay.order_ids) and shipping_fee_kurus > 0) into n_need
    from public.oz_order_items where order_id = any (pay.order_ids);
  for it in select * from jsonb_array_elements(p_items) loop
    if coalesce(it->>'payment_transaction_id', '') !~ '^[0-9A-Za-z_-]{1,64}$' then raise exception 'PF_INPUT: Ödeme kırılımı geçersiz'; end if;
    if it->>'id' like 'item:%' then
      update public.oz_order_items set iyzico_payment_transaction_id = it->>'payment_transaction_id', iyzico_approve_status = 'pending'
       where id::text = substr(it->>'id', 6) and order_id = any (pay.order_ids) and iyzico_payment_transaction_id is null;
    elsif it->>'id' like 'ship:%' then
      update public.oz_orders set iyzico_ship_transaction_id = it->>'payment_transaction_id', iyzico_ship_approve_status = 'pending'
       where id::text = substr(it->>'id', 6) and id = any (pay.order_ids) and shipping_fee_kurus > 0 and iyzico_ship_transaction_id is null;
    else
      raise exception 'PF_INPUT: Ödeme kırılımı geçersiz';
    end if;
    if found then n := n + 1; end if;
  end loop;
  if n <> n_need or jsonb_array_length(p_items) <> n_need then raise exception 'PF_STATE: Ödeme kırılımları siparişlerle eşleşmedi'; end if;
  perform set_config('oz.actor_role', 'system', true);
  perform set_config('oz.reason', 'iyzico ödemesi', true);
  update public.oz_orders set payment_status = 'paid', payment_reference = left(p_payment_id, 64), status = 'new' where id = any (pay.order_ids);
  for o in select id, order_no, seller_id from public.oz_orders where id = any (pay.order_ids) loop
    perform public.oz_notify((select owner_user_id from public.oz_sellers where id = o.seller_id), o.id, 'new_order',
      'Yeni sipariş', o.order_no || ' numaralı yeni siparişin var.', 'new_order:' || o.id);
  end loop;
  update public.oz_payments set status = 'paid', payment_id = p_payment_id, paid_kurus = p_paid_kurus, paid_at = now(), summary = v_sum, updated_at = now() where id = pay.id;
  perform public.pf_audit('oz_iyz_paid', 'oz_payment', pay.id::text, jsonb_build_object('payment_id', p_payment_id, 'amount_kurus', p_paid_kurus, 'orders', to_jsonb(pay.order_ids)));
  return jsonb_build_object('status', 'paid', 'order_ids', to_jsonb(pay.order_ids));
end $function$;

-- 6) onay / onay geri alma / kırılım iadesi kapısı (yalnız yönetici, yalnız sandbox)
create or replace function public.oz_iyz_approval_target(p_actor uuid, p_kind text, p_id uuid, p_action text)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare o public.oz_orders%rowtype; v_tx text; v_st text; v_price int; v_smk text;
begin
  if not public.oz_iyz_actor_admin(p_actor) then raise exception 'PF_AUTH: Yönetici yetkisi gerekli'; end if;
  if public.oz_payment_provider() <> 'iyzico_sandbox' then raise exception 'PF_STATE: iyzico onayı yalnız test (sandbox) modunda açık'; end if;
  if p_action not in ('approve', 'disapprove', 'refund') or p_kind not in ('item', 'ship') then raise exception 'PF_INPUT: Bilinmeyen işlem'; end if;
  if p_kind = 'item' then
    select o2.* into o from public.oz_order_items i join public.oz_orders o2 on o2.id = i.order_id where i.id = p_id;
    select iyzico_payment_transaction_id, iyzico_approve_status, line_total_kurus into v_tx, v_st, v_price from public.oz_order_items where id = p_id;
  else
    select * into o from public.oz_orders where id = p_id;
    v_tx := o.iyzico_ship_transaction_id; v_st := o.iyzico_ship_approve_status; v_price := o.shipping_fee_kurus;
  end if;
  if o.id is null or v_tx is null or o.payment_method <> 'online' then raise exception 'PF_STATE: Bu kalem iyzico ile ödenmemiş'; end if;
  select iyzico_sub_merchant_key into v_smk from public.oz_sellers where id = o.seller_id;
  if p_action = 'approve' then
    if v_st = 'approved' then raise exception 'PF_STATE: Bu kalem zaten onaylandı'; end if;
    if v_st = 'refunded' then raise exception 'PF_STATE: İade edilen kalem onaylanamaz'; end if;
    if o.payment_status <> 'paid' or o.status <> 'delivered' then raise exception 'PF_STATE: Yalnız teslim edilmiş siparişin kalemi onaylanır'; end if;
    if o.delivered_at > now() - make_interval(days => public.oz_hold_days()) then raise exception 'PF_STATE: Bekleme süresi henüz dolmadı'; end if;
    if exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved')) then
      raise exception 'PF_STATE: Siparişte açık iade/ayıp talebi var';
    end if;
  elsif p_action = 'disapprove' then
    if v_st is distinct from 'approved' then raise exception 'PF_STATE: Yalnız onaylanmış kalemin onayı geri alınır'; end if;
  else
    if o.payment_status <> 'refund_pending' then raise exception 'PF_STATE: Bu sipariş için iade beklenmiyor'; end if;
    if v_st in ('approved', 'refunded') then raise exception 'PF_STATE: Onaylanmış veya iade edilmiş kalem iade edilemez (önce onayı geri al)'; end if;
  end if;
  return jsonb_build_object('kind', p_kind, 'id', p_id, 'order_id', o.id, 'payment_transaction_id', v_tx, 'price_kurus', v_price,
                            'sub_merchant_key', v_smk, 'status', v_st);
end $function$;

create or replace function public.oz_iyz_record_approval(p_actor uuid, p_kind text, p_id uuid, p_action text, p_success boolean, p_summary jsonb, p_error text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_new text;
begin
  if not public.oz_iyz_actor_admin(p_actor) then raise exception 'PF_AUTH: Yönetici yetkisi gerekli'; end if;
  if p_action not in ('approve', 'disapprove', 'refund') or p_kind not in ('item', 'ship') then raise exception 'PF_INPUT: Bilinmeyen işlem'; end if;
  v_new := case when not coalesce(p_success, false) then (case p_action when 'approve' then 'failed' else null end)
                when p_action = 'approve' then 'approved' when p_action = 'disapprove' then 'disapproved' else 'refunded' end;
  if v_new is not null then
    if p_kind = 'item' then
      update public.oz_order_items set iyzico_approve_status = v_new,
             iyzico_approved_at = case when v_new = 'approved' then now() when v_new = 'disapproved' then null else iyzico_approved_at end
       where id = p_id and iyzico_payment_transaction_id is not null;
    else
      update public.oz_orders set iyzico_ship_approve_status = v_new,
             iyzico_ship_approved_at = case when v_new = 'approved' then now() when v_new = 'disapproved' then null else iyzico_ship_approved_at end
       where id = p_id and iyzico_ship_transaction_id is not null;
    end if;
    if not found then raise exception 'PF_STATE: Kalem bulunamadı'; end if;
  end if;
  perform public.pf_audit('oz_iyz_' || p_action || case when coalesce(p_success, false) then '' else '_failed' end, 'oz_iyz_' || p_kind, p_id::text,
    jsonb_build_object('actor', p_actor, 'summary', public.oz_iyz_safe_summary(p_summary), 'error', left(p_error, 200)));
  return jsonb_build_object('status', coalesce(v_new, 'unchanged'));
end $function$;

-- 7) alt üye senkronu: esnaf (muaf) ve çiftçi için tür eşlemesi TEYİTSİZ → bloklanır, manual_review
create or replace function public.oz_iyz_seller_for_sync(p_actor uuid, p_seller uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare s public.oz_sellers%rowtype; v_tt text; v_type text; v_reason text;
begin
  if not public.oz_iyz_actor_admin(p_actor) then raise exception 'PF_AUTH: Yönetici yetkisi gerekli'; end if;
  if public.oz_payment_provider() <> 'iyzico_sandbox' then raise exception 'PF_STATE: iyzico alt üye senkronu yalnız test (sandbox) modunda açık'; end if;
  select * into s from public.oz_sellers where id = p_seller for update;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  if s.status <> 'approved' then raise exception 'PF_STATE: Yalnız onaylı satıcı alt üye yapılır'; end if;
  v_tt := to_jsonb(s)->>'tax_type';  -- Paket 8 kolonu; yoksa null
  v_type := case v_tt when 'company' then 'LIMITED_OR_JOINT_STOCK_COMPANY' when 'sole_prop' then 'PRIVATE_COMPANY' else null end;
  if v_type is null then
    v_reason := case when v_tt in ('esnaf_exempt', 'farmer') then 'Vergi durumu "' || v_tt || '" için iyzico alt üye türü eşlemesi teyit edilmedi; elle incelenmeli'
                     else 'Satıcının vergi durumu seçilmemiş; alt üye türü belirlenemedi' end;
    update public.oz_sellers set iyzico_sync_status = 'manual_review', iyzico_sync_error = v_reason where id = s.id;
    perform public.pf_audit('oz_iyz_seller_blocked', 'oz_seller', s.id::text, jsonb_build_object('actor', p_actor, 'tax_type', v_tt));
    return jsonb_build_object('blocked', true, 'reason', v_reason);
  end if;
  return jsonb_build_object('blocked', false, 'seller_id', s.id, 'sub_merchant_type', v_type, 'sub_merchant_key', s.iyzico_sub_merchant_key,
    'name', s.display_name, 'legal_name', s.legal_name, 'tax_no', s.tax_no, 'tax_office', s.tax_office, 'phone', s.phone,
    'email', (select email from auth.users where id = s.owner_user_id), 'iban', s.iban, 'iban_holder', s.iban_holder,
    'address', concat_ws(', ', s.district, s.city), 'city', coalesce(s.ship_from_city, s.city));
end $function$;

create or replace function public.oz_iyz_seller_sync_result(p_actor uuid, p_seller uuid, p_status text, p_key text, p_error text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public.oz_iyz_actor_admin(p_actor) then raise exception 'PF_AUTH: Yönetici yetkisi gerekli'; end if;
  if p_status not in ('synced', 'failed', 'manual_review') then raise exception 'PF_INPUT: Geçersiz durum'; end if;
  if p_status = 'synced' and (p_key is null or p_key !~ '^[0-9A-Za-z+/=_-]{4,200}$') then raise exception 'PF_INPUT: Alt üye anahtarı geçersiz'; end if;
  update public.oz_sellers set iyzico_sync_status = p_status, iyzico_sync_error = left(p_error, 500),
         iyzico_sub_merchant_key = case when p_status = 'synced' then p_key else iyzico_sub_merchant_key end,
         iyzico_synced_at = case when p_status = 'synced' then now() else iyzico_synced_at end
   where id = p_seller;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  perform public.pf_audit('oz_iyz_seller_' || p_status, 'oz_seller', p_seller::text, jsonb_build_object('actor', p_actor, 'error', left(p_error, 200)));
end $function$;

-- 8) yönetici ekranı (salt okunur): iyzico ile ödenmiş kalemler, onay uygunluğu, son ödeme günü
create or replace function public.oz_admin_iyzico_items(p_limit integer default 100)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
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
               exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved')) open_return
          from public.oz_order_items i join public.oz_orders o on o.id = i.order_id join public.oz_sellers s on s.id = o.seller_id
         where o.payment_method = 'online' and i.iyzico_payment_transaction_id is not null
        union all
        select 'ship', o.id, o.id, o.order_no, s.display_name, 'Kargo', o.shipping_fee_kurus, coalesce(o.iyzico_ship_approve_status, 'pending'),
               o.iyzico_ship_approved_at, o.status, o.delivered_at,
               exists (select 1 from public.oz_returns r where r.order_id = o.id and r.status in ('requested', 'approved'))
          from public.oz_orders o join public.oz_sellers s on s.id = o.seller_id
         where o.payment_method = 'online' and o.iyzico_ship_transaction_id is not null) k
     order by k.delivered_at nulls last limit greatest(1, least(coalesce(p_limit, 100), 500))) x), '[]'::jsonb);
end $function$;

revoke all on function public.oz_iyz_actor_admin(uuid) from public, anon, authenticated;
revoke all on function public.oz_iyz_safe_summary(jsonb) from public, anon, authenticated;
revoke all on function public.oz_iyz_prepare(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.oz_iyz_attach(uuid, text) from public, anon, authenticated;
revoke all on function public.oz_iyz_payment_by_token(text) from public, anon, authenticated;
revoke all on function public.oz_iyz_complete(uuid, text, boolean, text, integer, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.oz_iyz_approval_target(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.oz_iyz_record_approval(uuid, text, uuid, text, boolean, jsonb, text) from public, anon, authenticated;
revoke all on function public.oz_iyz_seller_for_sync(uuid, uuid) from public, anon, authenticated;
revoke all on function public.oz_iyz_seller_sync_result(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.oz_iyz_prepare(uuid, uuid[]) to service_role;
grant execute on function public.oz_iyz_attach(uuid, text) to service_role;
grant execute on function public.oz_iyz_payment_by_token(text) to service_role;
grant execute on function public.oz_iyz_complete(uuid, text, boolean, text, integer, jsonb, jsonb, text) to service_role;
grant execute on function public.oz_iyz_approval_target(uuid, text, uuid, text) to service_role;
grant execute on function public.oz_iyz_record_approval(uuid, text, uuid, text, boolean, jsonb, text) to service_role;
grant execute on function public.oz_iyz_seller_for_sync(uuid, uuid) to service_role;
grant execute on function public.oz_iyz_seller_sync_result(uuid, uuid, text, text, text) to service_role;
revoke all on function public.oz_admin_iyzico_items(integer) from public, anon;
grant execute on function public.oz_admin_iyzico_items(integer) to authenticated;

-- 9) değişen mevcut fonksiyonlar (özgün metin + P10 eklemeleri)
CREATE OR REPLACE FUNCTION public.oz_place_order(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  a public.oz_addresses%rowtype;
  v_method text := coalesce(p->>'payment_method', 'mock');
  v_crid uuid := nullif(p->>'client_request_id', '')::uuid;
  v_ids uuid[]; v_cnt int; bad record; g record; l record;
  v_sub int; v_w int; v_fee int; v_comm int; v_oid uuid; v_status text; v_pay text; v_orders jsonb := '[]'::jsonb; v_order_no text;
  v_tot_sub int := 0; v_note text;
begin
  if uid is null then raise exception 'PF_AUTH: Giriş yapmalısın'; end if;
  if v_crid is null then raise exception 'PF_INPUT: İstek kimliği eksik'; end if;
  if not public.oz_market_open() then raise exception 'PF_STATE: Özüne Dön çok yakında açılıyor'; end if;
  if not public.oz_flag('oz_orders_enabled', true) then raise exception 'PF_STATE: Siparişler geçici olarak kapalı'; end if;
  if coalesce((p->>'terms')::boolean, false) is not true then raise exception 'PF_INPUT: Mesafeli satış sözleşmesini onaylamalısın'; end if;
  if p->'items' is null or jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 or jsonb_array_length(p->'items') > 40 then
    raise exception 'PF_INPUT: Sepet boş veya geçersiz';
  end if;

  if exists (select 1 from public.oz_orders where customer_id = uid and client_request_id = v_crid) then
    return jsonb_build_object('duplicate', true, 'orders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'order_no', order_no,
      'seller_id', seller_id, 'status', status, 'total_kurus', total_kurus)) from public.oz_orders where customer_id = uid and client_request_id = v_crid), '[]'::jsonb));
  end if;

  if v_method = 'mock' then
    if not (public.oz_flag('oz_payment_mock_enabled', false) or public.pf_is_admin()) then raise exception 'PF_STATE: Ödeme yöntemi şu an kullanılamıyor'; end if;
  elsif v_method = 'cod' then
    if not public.oz_flag('oz_cod_enabled', false) then raise exception 'PF_STATE: Kapıda ödeme şu an kullanılamıyor'; end if;
  elsif v_method = 'online' then
    -- P10: yalnız iyzico sağlayıcısı seçiliyken (oz_payment_provider); taklit ödeme ve kapıda ödeme aynen
    if public.oz_payment_provider() not in ('iyzico_sandbox', 'iyzico') then raise exception 'PF_STATE: Online ödeme henüz aktif değil'; end if;
  else
    raise exception 'PF_STATE: Online ödeme henüz aktif değil';
  end if;

  select * into a from public.oz_addresses where id = nullif(p->>'address_id', '')::uuid and user_id = uid;
  if not found then raise exception 'PF_INPUT: Teslimat adresi seç'; end if;
  v_note := public.oz_clean(p->>'note', 'Sipariş notu', false, 300);

  select array_agg(distinct (e->>'variant_id')::uuid) into v_ids from jsonb_array_elements(p->'items') e;
  perform 1 from public.oz_variants where id = any (v_ids) order by id for update;
  select count(*) into v_cnt from public.oz_lines(p->'items');
  if v_cnt <> cardinality(v_ids) then raise exception 'PF_STATE: Sepetteki bir ürün artık mevcut değil'; end if;
  for bad in select * from public.oz_lines(p->'items') where issue is not null or owner = uid loop
    if bad.owner = uid then raise exception 'PF_STATE: Kendi ürününü satın alamazsın'; end if;
    raise exception 'PF_STATE: "%" için %', bad.pname, case bad.issue when 'stock' then 'yeterli stok yok' else 'şu an satın alınamıyor' end;
  end loop;
  select coalesce(sum(price * qty), 0) into v_tot_sub from public.oz_lines(p->'items');
  -- P10: online ödemede sepetteki her satıcı iyzico alt üyesi olmalı
  if v_method = 'online' then
    select s.display_name into v_note from public.oz_lines(p->'items') ln join public.oz_sellers s on s.id = ln.seller_id
     where s.iyzico_sub_merchant_key is null or s.iyzico_sync_status is distinct from 'synced' limit 1;
    if v_note is not null then raise exception 'PF_STATE: "%" şu an online ödeme alamıyor', v_note; end if;
    v_note := public.oz_clean(p->>'note', 'Sipariş notu', false, 300);
  end if;
  if v_tot_sub < public.oz_int('oz_min_order_kurus', 5000) then
    raise exception 'PF_INPUT: Minimum sepet tutarı % TL', (public.oz_int('oz_min_order_kurus', 5000) / 100);
  end if;

  perform set_config('oz.actor_role', 'customer', true);
  for g in select seller_id, max(free_over) free_over, max(commission_bps) bps from public.oz_lines(p->'items') group by seller_id loop
    select sum(price * qty), sum(weight * qty) into v_sub, v_w from public.oz_lines(p->'items') where seller_id = g.seller_id;
    v_fee := public.oz_ship_fee(g.seller_id, v_w, v_sub, g.free_over);
    v_comm := floor(v_sub * g.bps / 10000.0);
    v_status := case v_method when 'cod' then 'new' else 'awaiting_payment' end;
    v_pay := case v_method when 'cod' then 'cod' else 'pending' end;
    insert into public.oz_orders (customer_id, seller_id, status, ship_to, phone, note, payment_method, payment_status,
        subtotal_kurus, shipping_fee_kurus, total_kurus, commission_bps, commission_kurus, seller_share_kurus, client_request_id, terms_accepted_at)
    values (uid, g.seller_id, v_status,
        jsonb_build_object('title', a.title, 'recipient', a.recipient, 'phone', a.phone, 'city', a.city, 'district', a.district,
                           'neighborhood', a.neighborhood, 'address_line', a.address_line, 'postal_code', a.postal_code),
        a.phone, v_note, v_method, v_pay, v_sub, v_fee, v_sub + v_fee, g.bps, v_comm, v_sub - v_comm + v_fee, v_crid, now())
    returning id, order_no into v_oid, v_order_no;
    for l in select * from public.oz_lines(p->'items') where seller_id = g.seller_id loop
      insert into public.oz_order_items (order_id, product_id, variant_id, product_name, variant_label, image_url, unit_price_kurus, quantity, line_total_kurus, weight_g)
      values (v_oid, l.product_id, l.variant_id, l.pname, l.label, l.img, l.price, l.qty, l.price * l.qty, l.weight);
      update public.oz_variants set stock = stock - l.qty where id = l.variant_id;
    end loop;
    if v_status = 'new' then
      perform public.oz_notify((select owner_user_id from public.oz_sellers where id = g.seller_id), v_oid, 'new_order',
        'Yeni sipariş', v_order_no || ' numaralı yeni siparişin var.', 'new_order:' || v_oid);
    end if;
    v_orders := v_orders || jsonb_build_object('id', v_oid, 'order_no', v_order_no, 'seller_id', g.seller_id, 'status', v_status, 'total_kurus', v_sub + v_fee);
  end loop;
  return jsonb_build_object('duplicate', false, 'orders', v_orders);
end $function$;

CREATE OR REPLACE FUNCTION public.oz_public_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'market_enabled', public.oz_flag('oz_market_enabled', false),
    'market_open', public.oz_market_open(),
    'seller_signup_enabled', public.oz_flag('oz_seller_signup_enabled', true),
    'orders_enabled', public.oz_flag('oz_orders_enabled', true),
    'payment_mock', public.oz_flag('oz_payment_mock_enabled', false) or public.pf_is_admin(),
    'payment_provider', public.oz_payment_provider(),
    'cod', public.oz_flag('oz_cod_enabled', false),
    'return_days', public.oz_int('oz_return_days', 14),
    'min_order_kurus', public.oz_int('oz_min_order_kurus', 5000),
    'is_admin', public.pf_is_admin(),
    'my_seller', (select jsonb_build_object('id', id, 'status', status) from public.oz_sellers where owner_user_id = auth.uid())
  )
$function$;

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
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid' and payment_method <> 'online'
     and delivered_at <= now() - make_interval(days => hold);
  if v_sum <= 0 then raise exception 'PF_STATE: Ödenecek tutar yok'; end if;
  perform 1 from public.oz_seller_adjustments where seller_id = p_seller and settled_payout_id is null for update;
  select coalesce(sum(amount_kurus), 0) into v_adj from public.oz_seller_adjustments where seller_id = p_seller and settled_payout_id is null;
  v_net := v_sum + v_adj;
  if v_net <= 0 then raise exception 'PF_STATE: Mahsup sonrası ödenecek tutar yok'; end if;
  insert into public.oz_payouts (seller_id, amount_kurus, note)
  values (p_seller, v_net, case when v_adj < 0 then 'Brüt ' || v_sum || ' kuruş, mahsup ' || v_adj || ' kuruş' end) returning id into v_id;
  update public.oz_orders set payout_id = v_id
   where seller_id = p_seller and status = 'delivered' and payout_id is null and payment_status = 'paid' and payment_method <> 'online'
     and delivered_at <= now() - make_interval(days => hold);
  update public.oz_seller_adjustments set settled_payout_id = v_id where seller_id = p_seller and settled_payout_id is null;
  perform public.pf_audit('oz_payout_create', 'oz_payout', v_id::text, jsonb_build_object('amount_kurus', v_net, 'gross_kurus', v_sum, 'adjustments_kurus', v_adj));
  return v_id;
end $function$;

commit;
