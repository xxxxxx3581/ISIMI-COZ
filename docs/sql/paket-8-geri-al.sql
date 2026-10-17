-- Paket 8 GERİ ALMA: paket-8-uygula.sql'den önceki hale döndürür (fonksiyon gövdeleri canlıdan 17.10.2026'da okunan özgün metinlerdir).
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla çalıştırılır.
-- Dikkat: oz_sellers.tax_type / sells_food / declarations_at silinir (değerler kaybolur).
-- Eski doc_type kısıtı yeni türleri kabul etmediği için, varsa bu belgeler dönüştürülür:
--   farmer_registration → producer_cert (Çiftçi / üretici belgesi), esnaf_exemption → other (Diğer belge). Dosyalar silinmez.

begin;

CREATE OR REPLACE FUNCTION public.oz_seller_apply(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  s public.oz_sellers%rowtype;
  v_name text; v_kind text; v_phone text; v_tax text; v_legal text; v_iban text; v_holder text;
  v_id uuid;
begin
  if uid is null then raise exception 'PF_AUTH: Giriş yapmalısın'; end if;
  p := coalesce(p, '{}'::jsonb);
  select * into s from public.oz_sellers where owner_user_id = uid for update;

  if not found then
    if not public.oz_flag('oz_seller_signup_enabled', true) and not public.pf_is_admin() then
      raise exception 'PF_STATE: Satıcı başvuruları şu an kapalı';
    end if;
    v_name := public.oz_clean(p->>'display_name', 'Mağaza adı', true, 80);
    if char_length(v_name) < 2 then raise exception 'PF_INPUT: Mağaza adı çok kısa'; end if;
    v_id := gen_random_uuid();
    insert into public.oz_sellers (id, owner_user_id, display_name, slug)
    values (v_id, uid, v_name, public.oz_slugify(v_name) || '-' || substr(v_id::text, 1, 4));
    select * into s from public.oz_sellers where id = v_id;
  elsif s.status in ('pending', 'suspended') then
    raise exception 'PF_STATE: Başvurun şu an incelemede veya askıda; değişiklik yapılamaz';
  end if;

  if p ? 'display_name' then v_name := public.oz_clean(p->>'display_name', 'Mağaza adı', true, 80); else v_name := s.display_name; end if;
  v_kind := case when p ? 'kind' then p->>'kind' else s.kind end;
  if v_kind not in ('person', 'business') then raise exception 'PF_INPUT: Satıcı türü geçersiz'; end if;
  v_phone := case when p ? 'phone' then nullif(regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g'), '') else s.phone end;
  v_tax := case when p ? 'tax_no' then nullif(regexp_replace(coalesce(p->>'tax_no', ''), '[^0-9]', '', 'g'), '') else s.tax_no end;
  if v_tax is not null and char_length(v_tax) not in (10, 11) then raise exception 'PF_INPUT: Vergi/TC no 10 veya 11 haneli olmalı'; end if;
  if v_phone is not null and char_length(v_phone) < 10 then raise exception 'PF_INPUT: Telefon numarası eksik'; end if;
  v_legal := case when p ? 'legal_name' then public.oz_clean(p->>'legal_name', 'Ünvan', false, 160) else s.legal_name end;
  if s.status = 'approved' and (v_kind <> s.kind or v_tax is distinct from s.tax_no or v_legal is distinct from s.legal_name) then
    raise exception 'PF_STATE: Onaylı hesapta tür, ünvan ve vergi no değiştirilemez; destekle iletişime geç';
  end if;

  v_iban := case when p ? 'iban' then nullif(upper(regexp_replace(coalesce(p->>'iban', ''), '\s', '', 'g')), '') else s.iban end;
  if v_iban is not null and not public.oz_iban_ok(v_iban) then raise exception 'PF_INPUT: IBAN geçersiz (TR ile başlayan 26 haneli IBAN gir)'; end if;
  v_holder := case when p ? 'iban_holder' then public.oz_clean(p->>'iban_holder', 'Hesap sahibi', false, 160) else s.iban_holder end;

  update public.oz_sellers set
    display_name = v_name,
    kind = v_kind,
    phone = v_phone,
    tax_no = v_tax,
    legal_name = v_legal,
    iban = v_iban,
    iban_holder = v_holder,
    tax_office = case when p ? 'tax_office' then public.oz_clean(p->>'tax_office', 'Vergi dairesi', false, 80) else tax_office end,
    city = case when p ? 'city' then public.oz_clean(p->>'city', 'İl', false, 60) else city end,
    district = case when p ? 'district' then public.oz_clean(p->>'district', 'İlçe', false, 60) else district end,
    ship_from_city = case when p ? 'ship_from_city' then public.oz_clean(p->>'ship_from_city', 'Gönderim ili', false, 60) else ship_from_city end,
    story = case when p ? 'story' then public.oz_clean(p->>'story', 'Hikâye', false, 2000) else story end,
    logo_url = case when p ? 'logo_url' then nullif(p->>'logo_url', '') else logo_url end,
    cover_url = case when p ? 'cover_url' then nullif(p->>'cover_url', '') else cover_url end,
    handling_days = case when p ? 'handling_days' then greatest(1, least(14, (p->>'handling_days')::int)) else handling_days end,
    free_ship_over_kurus = case when p ? 'free_ship_over_kurus' then nullif(p->>'free_ship_over_kurus', '')::int else free_ship_over_kurus end,
    status = case when status = 'rejected' then 'draft' else status end
  where id = s.id;

  if v_iban is distinct from s.iban or v_holder is distinct from s.iban_holder then
    perform public.pf_audit('oz_seller_iban_change', 'oz_seller', s.id::text,
      jsonb_build_object('iban_last4', right(coalesce(v_iban, ''), 4), 'was_set', s.iban is not null));
  end if;

  if p ? 'story' then perform public.oz_clean_claims(p->>'story', 'Hikâye'); end if;
  return jsonb_build_object('seller_id', s.id);
end $function$;

CREATE OR REPLACE FUNCTION public.oz_seller_submit()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.oz_sellers%rowtype; has_id boolean; has_tax boolean;
begin
  select * into s from public.oz_sellers where owner_user_id = auth.uid() for update;
  if not found then raise exception 'PF_STATE: Önce başvuru bilgilerini kaydet'; end if;
  if s.status not in ('draft', 'rejected') then raise exception 'PF_STATE: Başvuru zaten gönderilmiş'; end if;
  if s.phone is null or s.city is null or s.district is null or s.ship_from_city is null then
    raise exception 'PF_INPUT: Telefon, il, ilçe ve gönderim ili zorunlu';
  end if;
  select exists (select 1 from public.oz_seller_documents where seller_id = s.id and doc_type = 'identity' and status <> 'rejected'),
         exists (select 1 from public.oz_seller_documents where seller_id = s.id and doc_type = 'tax_plate' and status <> 'rejected')
    into has_id, has_tax;
  if not has_id then raise exception 'PF_INPUT: Kimlik belgesi yüklemelisin'; end if;
  if s.kind = 'business' and (s.tax_no is null or s.legal_name is null or not has_tax) then
    raise exception 'PF_INPUT: İşletme için ünvan, vergi no ve vergi levhası zorunlu';
  end if;
  update public.oz_sellers set status = 'pending', status_reason = null where id = s.id;
  perform public.oz_notify_admins('admin_seller_application', 'Yeni satıcı başvurusu', s.display_name || ' başvurusunu gönderdi.', 'adm:seller:' || s.id::text || ':' || extract(epoch from now())::bigint);
end $function$;

CREATE OR REPLACE FUNCTION public.oz_admin_review_seller(p_id uuid, p_decision text, p_reason text DEFAULT NULL::text, p_commission_bps integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.oz_sellers%rowtype; v_reason text := public.oz_clean(p_reason, 'Gerekçe', false, 500); v_new text;
begin
  perform public.oz_admin_guard();
  select * into s from public.oz_sellers where id = p_id for update;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  if p_decision = 'approve' then
    if s.status not in ('pending', 'suspended', 'rejected') then raise exception 'PF_STATE: Bu durumdaki satıcı onaylanamaz'; end if;
    v_new := 'approved';
  elsif p_decision = 'reject' then
    if s.status <> 'pending' then raise exception 'PF_STATE: Yalnızca bekleyen başvuru reddedilebilir'; end if;
    if v_reason is null then raise exception 'PF_INPUT: Red gerekçesi yaz'; end if;
    v_new := 'rejected';
  elsif p_decision = 'suspend' then
    if s.status <> 'approved' then raise exception 'PF_STATE: Yalnızca onaylı satıcı askıya alınır'; end if;
    if v_reason is null then raise exception 'PF_INPUT: Gerekçe yaz'; end if;
    v_new := 'suspended';
  else
    raise exception 'PF_INPUT: Bilinmeyen karar';
  end if;
  if p_commission_bps is not null and (p_commission_bps < 0 or p_commission_bps > 5000) then raise exception 'PF_INPUT: Komisyon 0 ile 5000 (yüzde 50) arasında olmalı'; end if;
  update public.oz_sellers set status = v_new, status_reason = v_reason, reviewed_by = auth.uid(), reviewed_at = now(),
         commission_bps = coalesce(p_commission_bps, commission_bps) where id = p_id;
  if v_new = 'suspended' then
    update public.oz_products set status = 'hidden' where seller_id = p_id and status = 'published';
  end if;
  perform public.oz_notify(s.owner_user_id, null, 'seller_' || v_new,
    case v_new when 'approved' then 'Satıcı başvurun onaylandı' when 'rejected' then 'Satıcı başvurun reddedildi' else 'Hesabın askıya alındı' end,
    coalesce(v_reason, ''), 'seller:' || p_id || ':' || v_new || ':' || extract(epoch from now())::bigint);
  perform public.pf_audit('oz_seller_' || p_decision, 'oz_seller', p_id::text, jsonb_build_object('reason', v_reason, 'commission_bps', p_commission_bps));
end $function$;

drop function if exists public.oz_seller_declare();
drop function if exists public.oz_seller_required_docs(text, text, boolean);
drop function if exists public.oz_seller_doc_label(text);

update public.oz_seller_documents set doc_type = 'producer_cert' where doc_type = 'farmer_registration';
update public.oz_seller_documents set doc_type = 'other' where doc_type = 'esnaf_exemption';
alter table public.oz_seller_documents drop constraint if exists oz_seller_documents_doc_type_check;
alter table public.oz_seller_documents add constraint oz_seller_documents_doc_type_check
  check (doc_type = any (array['identity'::text, 'tax_plate'::text, 'food_registration'::text, 'producer_cert'::text, 'organic_cert'::text, 'other'::text]));

alter table public.oz_sellers drop constraint if exists oz_sellers_tax_type_check;
alter table public.oz_sellers drop column if exists declarations_at;
alter table public.oz_sellers drop column if exists sells_food;
alter table public.oz_sellers drop column if exists tax_type;

commit;
