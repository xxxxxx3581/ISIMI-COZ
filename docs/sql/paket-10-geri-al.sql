-- Paket 10 GERİ ALMA: paket-10-uygula.sql'den önceki hale döndürür (fonksiyon gövdeleri canlıdan 17.10.2026'da okunan özgün metinlerdir; md5 doğrulandı).
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla çalıştırılır.
-- Dikkat: oz_payments tablosu ve iyzico kolonları silinir (ödeme kayıtları ve paymentTransactionId'ler kaybolur). iyzico ile ödenmiş
-- (payment_method 'online') sipariş varsa önce dışa aktarın; bu siparişler geri almadan sonra elle hakedişe girebilir (çift ödeme riski).

begin;

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

drop function if exists public.oz_admin_iyzico_items(integer);
drop function if exists public.oz_iyz_seller_sync_result(uuid, uuid, text, text, text);
drop function if exists public.oz_iyz_seller_for_sync(uuid, uuid);
drop function if exists public.oz_iyz_record_approval(uuid, text, uuid, text, boolean, jsonb, text);
drop function if exists public.oz_iyz_approval_target(uuid, text, uuid, text);
drop function if exists public.oz_iyz_complete(uuid, text, boolean, text, integer, jsonb, jsonb, text);
drop function if exists public.oz_iyz_payment_by_token(text);
drop function if exists public.oz_iyz_attach(uuid, text);
drop function if exists public.oz_iyz_prepare(uuid, uuid[]);
drop function if exists public.oz_iyz_safe_summary(jsonb);
drop function if exists public.oz_iyz_actor_admin(uuid);
drop function if exists public.oz_payment_provider();

drop table if exists public.oz_payments;

alter table public.oz_orders drop constraint if exists oz_orders_iyzico_ship_approve_status_check;
alter table public.oz_orders drop column if exists iyzico_ship_approve_status;
alter table public.oz_orders drop column if exists iyzico_ship_approved_at;
alter table public.oz_orders drop column if exists iyzico_ship_transaction_id;
alter table public.oz_order_items drop constraint if exists oz_order_items_iyzico_approve_status_check;
alter table public.oz_order_items drop column if exists iyzico_approve_status;
alter table public.oz_order_items drop column if exists iyzico_approved_at;
alter table public.oz_order_items drop column if exists iyzico_payment_transaction_id;
alter table public.oz_sellers drop constraint if exists oz_sellers_iyzico_sync_status_check;
alter table public.oz_sellers drop column if exists iyzico_synced_at;
alter table public.oz_sellers drop column if exists iyzico_sync_error;
alter table public.oz_sellers drop column if exists iyzico_sync_status;
alter table public.oz_sellers drop column if exists iyzico_sub_merchant_key;

delete from public.oz_settings where key = 'oz_payment_provider';

commit;
