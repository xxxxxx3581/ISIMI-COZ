-- Paket 8: Satıcı kayıt şartları (vergi türü, belgeler, beyan)
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, Supabase SQL Editor'de tek parça çalıştırılır.
-- Geri alma: docs/sql/paket-8-geri-al.sql
--
-- Değişenler:
--  1) oz_sellers: tax_type (company | sole_prop | esnaf_exempt | farmer, NULL olabilir), sells_food (varsayılan true), declarations_at.
--  2) oz_seller_documents.doc_type CHECK genişler: + esnaf_exemption, farmer_registration (mevcut değerler aynen kalır).
--  3) oz_seller_required_docs(tax_type, kind, sells_food): zorunlu belge listesi (iç yardımcı; istemciye açık değil).
--  4) oz_seller_apply: tax_type ve sells_food alanlarını kabul eder; onaylı hesapta tax_type tür/ünvan/vergi no gibi değiştirilemez.
--  5) oz_seller_declare(): satıcı beyanını declarations_at = now() ile kaydeder + pf_audit.
--  6) oz_seller_submit: mevcut kontroller + vergi durumu, beyan ve türe göre belgeler (reddedilmemiş belge sayılır); eksik olanı tek tek söyler.
--  7) oz_admin_review_seller: 'approve' kararında zorunlu belgelerin hepsi onaylı olmalı; eksikler listelenir.
-- Mevcut satıcılar: tax_type NULL kalır; zorunluluklar yalnız yeni gönderimde (draft/rejected → pending) ve yeni onayda uygulanır.
-- tax_type NULL olan eski satıcıda onay için: kimlik + (işletme ise vergi levhası) + (gıda satıyorsa gıda kayıt belgesi).
-- Yetki/RLS: tablo politikaları değişmez; fonksiyonlar SECURITY DEFINER, CREATE OR REPLACE mevcut yetkileri korur.

begin;

alter table public.oz_sellers add column if not exists tax_type text;
alter table public.oz_sellers add column if not exists sells_food boolean not null default true;
alter table public.oz_sellers add column if not exists declarations_at timestamptz;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'oz_sellers_tax_type_check' and conrelid = 'public.oz_sellers'::regclass) then
    alter table public.oz_sellers add constraint oz_sellers_tax_type_check
      check (tax_type is null or tax_type in ('company', 'sole_prop', 'esnaf_exempt', 'farmer'));
  end if;
end $c$;
comment on column public.oz_sellers.tax_type is 'Paket 8: company Şirket, sole_prop Şahıs işletmesi, esnaf_exempt Esnaf (muaf), farmer Çiftçi/üretici';

alter table public.oz_seller_documents drop constraint if exists oz_seller_documents_doc_type_check;
alter table public.oz_seller_documents add constraint oz_seller_documents_doc_type_check
  check (doc_type = any (array['identity', 'tax_plate', 'food_registration', 'producer_cert', 'organic_cert', 'other', 'esnaf_exemption', 'farmer_registration']));

CREATE OR REPLACE FUNCTION public.oz_seller_required_docs(p_tax_type text, p_kind text, p_sells_food boolean)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select array['identity']
    || case when p_tax_type in ('company', 'sole_prop') or (p_tax_type is null and p_kind = 'business') then array['tax_plate'] else '{}'::text[] end
    || case when p_tax_type = 'esnaf_exempt' then array['esnaf_exemption'] else '{}'::text[] end
    || case when p_tax_type = 'farmer' then array['farmer_registration'] else '{}'::text[] end
    || case when coalesce(p_sells_food, true) then array['food_registration'] else '{}'::text[] end
$function$;
revoke all on function public.oz_seller_required_docs(text, text, boolean) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.oz_seller_doc_label(p_type text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_type when 'identity' then 'Kimlik belgesi' when 'tax_plate' then 'Vergi levhası'
    when 'food_registration' then 'Gıda işletme kayıt belgesi' when 'esnaf_exemption' then 'Esnaf muaflık belgesi'
    when 'farmer_registration' then 'Çiftçi kayıt belgesi' else p_type end
$function$;
revoke all on function public.oz_seller_doc_label(text) from public, anon, authenticated;

-- 4) Başvuru bilgileri
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
  v_ttype text; v_food boolean;
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
  -- P8: vergi durumu ve gıda satışı
  v_ttype := case when p ? 'tax_type' then nullif(btrim(coalesce(p->>'tax_type', '')), '') else s.tax_type end;
  if v_ttype is not null and v_ttype not in ('company', 'sole_prop', 'esnaf_exempt', 'farmer') then raise exception 'PF_INPUT: Vergi durumu geçersiz'; end if;
  if p ? 'sells_food' and jsonb_typeof(p->'sells_food') <> 'boolean' then raise exception 'PF_INPUT: Gıda satışı alanı geçersiz'; end if;
  v_food := case when p ? 'sells_food' then (p->>'sells_food')::boolean else s.sells_food end;
  if s.status = 'approved' and (v_kind <> s.kind or v_tax is distinct from s.tax_no or v_legal is distinct from s.legal_name
                                or v_ttype is distinct from s.tax_type) then
    raise exception 'PF_STATE: Onaylı hesapta tür, vergi durumu, ünvan ve vergi no değiştirilemez; destekle iletişime geç';
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
    tax_type = v_ttype,
    sells_food = v_food,
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

-- 5) Satıcı beyanı
CREATE OR REPLACE FUNCTION public.oz_seller_declare()
 RETURNS timestamptz
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.oz_sellers%rowtype; v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'PF_AUTH: Giriş yapmalısın'; end if;
  select * into s from public.oz_sellers where owner_user_id = auth.uid() for update;
  if not found then raise exception 'PF_STATE: Önce başvuru bilgilerini kaydet'; end if;
  if s.status = 'suspended' then raise exception 'PF_STATE: Hesabın askıda'; end if;
  update public.oz_sellers set declarations_at = v_at where id = s.id;
  perform public.pf_audit('oz_seller_declare', 'oz_seller', s.id::text, jsonb_build_object('at', v_at, 'previous', s.declarations_at));
  return v_at;
end $function$;
revoke all on function public.oz_seller_declare() from public, anon;
grant execute on function public.oz_seller_declare() to authenticated;

-- 6) Başvuru gönderimi
CREATE OR REPLACE FUNCTION public.oz_seller_submit()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.oz_sellers%rowtype; has_id boolean; has_tax boolean; v_doc text;
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
  -- P8: vergi durumu, türe göre bilgiler ve belgeler (eksik olan tek tek söylenir), sonra beyan
  if s.tax_type is null then raise exception 'PF_INPUT: Vergi durumunu seçmelisin'; end if;
  if s.tax_type in ('company', 'sole_prop') then
    if s.legal_name is null then raise exception 'PF_INPUT: Ünvanı yazmalısın'; end if;
    if s.tax_no is null then raise exception 'PF_INPUT: Vergi numarasını yazmalısın'; end if;
  elsif s.tax_type = 'esnaf_exempt' and s.tax_no is null then
    raise exception 'PF_INPUT: TC kimlik / vergi numarasını yazmalısın';
  end if;
  select d into v_doc from unnest(public.oz_seller_required_docs(s.tax_type, s.kind, s.sells_food)) with ordinality as r(d, n)
   where not exists (select 1 from public.oz_seller_documents where seller_id = s.id and doc_type = r.d and status <> 'rejected')
   order by n limit 1;
  if v_doc is not null then raise exception 'PF_INPUT: % yüklemelisin', public.oz_seller_doc_label(v_doc); end if;
  -- mevcut işletme kuralı (P8 öncesi) aynen korunur
  if s.kind = 'business' and (s.tax_no is null or s.legal_name is null or not has_tax) then
    raise exception 'PF_INPUT: İşletme için ünvan, vergi no ve vergi levhası zorunlu';
  end if;
  if s.declarations_at is null then raise exception 'PF_INPUT: Satıcı beyanını onaylamalısın'; end if;
  update public.oz_sellers set status = 'pending', status_reason = null where id = s.id;
  perform public.oz_notify_admins('admin_seller_application', 'Yeni satıcı başvurusu', s.display_name || ' başvurusunu gönderdi.', 'adm:seller:' || s.id::text || ':' || extract(epoch from now())::bigint);
end $function$;

-- 7) Yönetici kararı: onay için zorunlu belgeler onaylı olmalı
CREATE OR REPLACE FUNCTION public.oz_admin_review_seller(p_id uuid, p_decision text, p_reason text DEFAULT NULL::text, p_commission_bps integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.oz_sellers%rowtype; v_reason text := public.oz_clean(p_reason, 'Gerekçe', false, 500); v_new text; v_missing text;
begin
  perform public.oz_admin_guard();
  select * into s from public.oz_sellers where id = p_id for update;
  if not found then raise exception 'PF_STATE: Satıcı bulunamadı'; end if;
  if p_decision = 'approve' then
    if s.status not in ('pending', 'suspended', 'rejected') then raise exception 'PF_STATE: Bu durumdaki satıcı onaylanamaz'; end if;
    -- P8: zorunlu belgelerin hepsi onaylı olmalı
    select string_agg(public.oz_seller_doc_label(r.d), ', ' order by r.n) into v_missing
      from unnest(public.oz_seller_required_docs(s.tax_type, s.kind, s.sells_food)) with ordinality as r(d, n)
     where not exists (select 1 from public.oz_seller_documents where seller_id = s.id and doc_type = r.d and status = 'approved');
    if v_missing is not null then raise exception 'PF_STATE: Onay için şu belgeler onaylanmalı: %', v_missing; end if;
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

commit;
