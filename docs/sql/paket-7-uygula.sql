-- Paket 7: Cayma hakkı ve "çabuk bozulur" ürün kuralları
-- DURUM: UYGULANMADI. Yalnız kullanıcının açık onayıyla, Supabase SQL Editor'de tek parça çalıştırılır.
-- Geri alma: docs/sql/paket-7-geri-al.sql
--
-- Değişenler (başka RPC'ye dokunulmaz; oz_seller_earnings, oz_admin_list, oz_decide_return aynı kalır):
--  1) oz_products.perishable boolean NULL (ürün düzeyi). Etkin değer = coalesce(ürün.perishable, kategori.perishable, false).
--  2) oz_returns.kind text NOT NULL DEFAULT 'cayma', ('cayma' | 'ayip').
--  3) oz_product_save: satıcı yalnız TRUE işaretleyebilir (false gönderilirse NULL yazılır → kategori değeri geçerli;
--     kategori true ise etkin değer false'a çekilemez). Eski istemci 'perishable' göndermezse mevcut değer korunur.
--     Satıcı daha önce işaretlediği "çabuk bozulur"u kaldırırsa yayındaki ürün yeniden onaya girer.
--  4) oz_product_detail: çıktıya 'no_withdrawal' (etkin değer) eklenir.
--  5) oz_order_detail: can_return çabuk bozulan siparişte de true olabilir; yeni alan 'return_mode' ('cayma' | 'ayip_only').
--  6) oz_request_return: çabuk bozulan siparişte yalnız 5 ayıp nedeni kabul edilir (kind='ayip'); diğerlerinde eski davranış (kind='cayma').
-- Yetki/RLS: tablolar değişmez (SELECT politikaları aynı); fonksiyonlar CREATE OR REPLACE ile mevcut yetkilerini korur.

begin;

alter table public.oz_products add column if not exists perishable boolean;
comment on column public.oz_products.perishable is 'Paket 7: satıcı işareti (yalnız true ya da null). Etkin değer = coalesce(perishable, kategori.perishable, false)';

alter table public.oz_returns add column if not exists kind text not null default 'cayma';
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'oz_returns_kind_check' and conrelid = 'public.oz_returns'::regclass) then
    alter table public.oz_returns add constraint oz_returns_kind_check check (kind in ('cayma', 'ayip'));
  end if;
end $c$;

-- 3) Satıcı ürün kaydı
CREATE OR REPLACE FUNCTION public.oz_product_save(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sid uuid := public.oz_my_seller();
  s public.oz_sellers%rowtype;
  old public.oz_products%rowtype;
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_name text; v_desc text; v_ing text; v_cat uuid;
  v_images text[]; v_allergens text[]; v_content_changed boolean := false;
  v_per boolean;
  v jsonb; keep uuid[] := '{}'; vid uuid; i int;
begin
  if sid is null then raise exception 'PF_STATE: Önce satıcı başvurusu oluştur'; end if;
  select * into s from public.oz_sellers where id = sid;
  if s.status in ('suspended') then raise exception 'PF_STATE: Hesabın askıda'; end if;

  v_name := public.oz_clean(p->>'name', 'Ürün adı', true, 120);
  v_desc := public.oz_clean(p->>'description', 'Açıklama', false, 4000);
  v_ing := public.oz_clean(p->>'ingredients', 'İçindekiler', false, 1000);
  perform public.oz_clean_claims(v_name, 'Ürün adı');
  perform public.oz_clean_claims(v_desc, 'Açıklama');
  perform public.oz_clean_claims(v_ing, 'İçindekiler');
  perform public.oz_clean(p->>'origin_note', 'Menşe notu', false, 500);
  perform public.oz_clean(p->>'storage_info', 'Saklama bilgisi', false, 300);

  v_cat := nullif(p->>'category_id', '')::uuid;
  if v_cat is not null and not exists (select 1 from public.oz_categories where id = v_cat and is_active) then
    raise exception 'PF_INPUT: Kategori geçersiz';
  end if;

  -- P7: satıcı yalnız TRUE işaretleyebilir; false/boş → NULL (kategori değeri geçerli, kategori true ise false'a çekilemez)
  if jsonb_typeof(p->'perishable') not in ('boolean', 'null') then raise exception 'PF_INPUT: Çabuk bozulur alanı geçersiz'; end if;
  v_per := case when (p->>'perishable') = 'true' then true else null end;

  select coalesce(array_agg(x), '{}') into v_images from jsonb_array_elements_text(coalesce(p->'images', '[]'::jsonb)) x;
  if cardinality(v_images) > 8 then raise exception 'PF_INPUT: En fazla 8 fotoğraf'; end if;
  for i in 1 .. coalesce(cardinality(v_images), 0) loop
    if position('/oz-images/' || sid::text || '/' in v_images[i]) = 0 then raise exception 'PF_INPUT: Fotoğraf yolu geçersiz'; end if;
  end loop;
  select coalesce(array_agg(left(btrim(x), 40)), '{}') into v_allergens
    from (select x from jsonb_array_elements_text(coalesce(p->'allergens', '[]'::jsonb)) x limit 20) q where btrim(x) <> '';

  if v_id is null then
    insert into public.oz_products (seller_id, category_id, name, description, ingredients, origin_city, origin_note, net_content,
        shelf_life_days, storage_info, allergens, images, organic_cert, perishable)
    values (sid, v_cat, v_name, v_desc, v_ing, nullif(btrim(p->>'origin_city'), ''), nullif(btrim(p->>'origin_note'), ''),
        nullif(btrim(p->>'net_content'), ''), nullif(p->>'shelf_life_days', '')::int, nullif(btrim(p->>'storage_info'), ''),
        v_allergens, v_images, nullif(btrim(p->>'organic_cert'), ''), v_per)
    returning id into v_id;
  else
    select * into old from public.oz_products where id = v_id and seller_id = sid for update;
    if not found then raise exception 'PF_STATE: Ürün bulunamadı'; end if;
    -- P7: alanı göndermeyen (eski) istemci mevcut değeri silmez
    if not (p ? 'perishable') then v_per := old.perishable; end if;
    v_content_changed := old.name is distinct from v_name or old.description is distinct from v_desc
      or old.ingredients is distinct from v_ing or old.images is distinct from v_images
      or old.category_id is distinct from v_cat
      or old.organic_cert is distinct from nullif(btrim(p->>'organic_cert'), '')
      or old.allergens is distinct from v_allergens
      or old.origin_city is distinct from nullif(btrim(p->>'origin_city'), '')
      or old.origin_note is distinct from nullif(btrim(p->>'origin_note'), '')
      or old.net_content is distinct from nullif(btrim(p->>'net_content'), '')
      or old.storage_info is distinct from nullif(btrim(p->>'storage_info'), '')
      or old.shelf_life_days is distinct from nullif(p->>'shelf_life_days', '')::int
      or (old.perishable is true and v_per is null);
    update public.oz_products set
      category_id = v_cat, name = v_name, description = v_desc, ingredients = v_ing,
      origin_city = nullif(btrim(p->>'origin_city'), ''), origin_note = nullif(btrim(p->>'origin_note'), ''),
      net_content = nullif(btrim(p->>'net_content'), ''), shelf_life_days = nullif(p->>'shelf_life_days', '')::int,
      storage_info = nullif(btrim(p->>'storage_info'), ''), allergens = v_allergens, images = v_images,
      organic_cert = nullif(btrim(p->>'organic_cert'), ''), perishable = v_per,
      status = case when v_content_changed and old.status in ('published', 'pending') then 'pending' else old.status end,
      status_reason = case when v_content_changed and old.status = 'published' then null else status_reason end
    where id = v_id;
  end if;

  if p ? 'variants' then
    if jsonb_typeof(p->'variants') <> 'array' or jsonb_array_length(p->'variants') > 20 then raise exception 'PF_INPUT: Seçenekler geçersiz'; end if;
    for v in select * from jsonb_array_elements(p->'variants') loop
      vid := nullif(v->>'id', '')::uuid;
      if vid is not null and exists (select 1 from public.oz_variants where id = vid and product_id = v_id) then
        update public.oz_variants set
          label = btrim(v->>'label'), price_kurus = (v->>'price_kurus')::int,
          compare_at_kurus = nullif(v->>'compare_at_kurus', '')::int, stock = (v->>'stock')::int,
          weight_g = (v->>'weight_g')::int, sku = nullif(btrim(v->>'sku'), ''),
          is_active = coalesce((v->>'is_active')::boolean, true), sort = coalesce((v->>'sort')::int, 0)
        where id = vid;
      else
        insert into public.oz_variants (product_id, label, price_kurus, compare_at_kurus, stock, weight_g, sku, is_active, sort)
        values (v_id, btrim(v->>'label'), (v->>'price_kurus')::int, nullif(v->>'compare_at_kurus', '')::int,
                (v->>'stock')::int, (v->>'weight_g')::int, nullif(btrim(v->>'sku'), ''),
                coalesce((v->>'is_active')::boolean, true), coalesce((v->>'sort')::int, 0))
        returning id into vid;
      end if;
      keep := keep || vid;
    end loop;
    delete from public.oz_variants where product_id = v_id and not (id = any (keep));
  end if;
  return v_id;
end $function$;

-- 4) Ürün detayı: no_withdrawal
CREATE OR REPLACE FUNCTION public.oz_product_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pr public.oz_products%rowtype; s public.oz_sellers%rowtype; allowed boolean;
begin
  select * into pr from public.oz_products where id = p_id;
  if not found then raise exception 'PF_STATE: Ürün bulunamadı'; end if;
  select * into s from public.oz_sellers where id = pr.seller_id;
  allowed := public.oz_product_visible(p_id) or s.owner_user_id = auth.uid() or public.pf_is_admin();
  if not allowed then raise exception 'PF_STATE: Ürün bulunamadı'; end if;
  return jsonb_build_object(
    'id', pr.id, 'name', pr.name, 'description', pr.description, 'ingredients', pr.ingredients,
    'origin_city', pr.origin_city, 'origin_note', pr.origin_note, 'net_content', pr.net_content,
    'shelf_life_days', pr.shelf_life_days, 'storage_info', pr.storage_info, 'allergens', pr.allergens,
    'images', pr.images, 'organic_cert', pr.organic_cert, 'status', pr.status,
    'rating_avg', pr.rating_avg, 'rating_count', pr.rating_count, 'sold_count', pr.sold_count,
    'category', (select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'perishable', c.perishable) from public.oz_categories c where c.id = pr.category_id),
    'no_withdrawal', coalesce(pr.perishable, (select c.perishable from public.oz_categories c where c.id = pr.category_id), false),
    'variants', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'label', v.label, 'price_kurus', v.price_kurus,
                'compare_at_kurus', v.compare_at_kurus, 'stock', v.stock, 'weight_g', v.weight_g) order by v.sort, v.price_kurus)
                from public.oz_variants v where v.product_id = pr.id and v.is_active), '[]'::jsonb),
    'seller', jsonb_build_object('id', s.id, 'display_name', s.display_name, 'slug', s.slug, 'city', s.city, 'district', s.district,
                'story', s.story, 'logo_url', s.logo_url, 'handling_days', s.handling_days,
                'free_ship_over_kurus', s.free_ship_over_kurus, 'rating_avg', s.rating_avg, 'rating_count', s.rating_count),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment, 'seller_reply', r.seller_reply,
                'created_at', r.created_at, 'name', public.oz_mask_name(r.user_id)) order by r.created_at desc)
                from (select * from public.oz_reviews where product_id = pr.id and not hidden order by created_at desc limit 30) r), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'answer', q.answer,
                'created_at', q.created_at, 'answered_at', q.answered_at) order by q.created_at desc)
                from (select * from public.oz_questions where product_id = pr.id and status = 'visible' order by created_at desc limit 30) q), '[]'::jsonb),
    'is_favorite', exists (select 1 from public.oz_favorites f where f.product_id = pr.id and f.user_id = auth.uid())
  );
end $function$;

-- 5) Sipariş detayı: can_return çabuk bozulanda da açık; return_mode
CREATE OR REPLACE FUNCTION public.oz_order_detail(p_order uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.oz_orders%rowtype; is_cust boolean; o_json jsonb; v_ayip boolean;
begin
  if not public.oz_order_access(p_order) then raise exception 'PF_AUTH: Bu siparişe erişimin yok'; end if;
  select * into o from public.oz_orders where id = p_order;
  is_cust := o.customer_id = auth.uid();
  o_json := to_jsonb(o) - 'client_request_id' - 'cancelled_by';
  if is_cust and not public.pf_is_admin() and o.seller_id is distinct from public.oz_my_seller() then
    o_json := o_json - 'commission_bps' - 'commission_kurus' - 'seller_share_kurus' - 'payout_id';
  end if;
  v_ayip := exists (select 1 from public.oz_order_items i join public.oz_products pr on pr.id = i.product_id
                      left join public.oz_categories c on c.id = pr.category_id
                     where i.order_id = p_order and coalesce(pr.perishable, c.perishable, false));
  return jsonb_build_object(
    'order', o_json,
    'seller_name', (select display_name from public.oz_sellers where id = o.seller_id),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.oz_order_items i where i.order_id = p_order), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('from', e.from_status, 'to', e.to_status, 'role', e.actor_role, 'reason', e.reason, 'at', e.created_at) order by e.id)
                          from public.oz_order_events e where e.order_id = p_order), '[]'::jsonb),
    'return', (select to_jsonb(r) from public.oz_returns r where r.order_id = p_order limit 1),
    'reviewed_product_ids', coalesce((select jsonb_agg(product_id) from public.oz_reviews where order_id = p_order), '[]'::jsonb),
    'can_return', is_cust and o.status = 'delivered' and o.delivered_at >= now() - make_interval(days => public.oz_int('oz_return_days', 14))
        and not exists (select 1 from public.oz_returns where order_id = p_order),
    'return_mode', case when v_ayip then 'ayip_only' else 'cayma' end
  );
end $function$;

-- 6) İade talebi: çabuk bozulanda yalnız ayıp nedenleri
CREATE OR REPLACE FUNCTION public.oz_request_return(p_order uuid, p_reason text, p_details text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.oz_orders%rowtype; v_id uuid; v_reason text; v_details text; v_ayip boolean;
begin
  select * into o from public.oz_orders where id = p_order for update;
  if not found or o.customer_id <> auth.uid() then raise exception 'PF_STATE: Sipariş bulunamadı'; end if;
  if o.status <> 'delivered' then raise exception 'PF_STATE: Yalnızca teslim edilen sipariş için iade istenebilir'; end if;
  if o.delivered_at < now() - make_interval(days => public.oz_int('oz_return_days', 14)) then raise exception 'PF_STATE: İade süresi geçmiş'; end if;
  if exists (select 1 from public.oz_returns where order_id = p_order) then raise exception 'PF_STATE: Bu sipariş için iade talebi zaten var'; end if;
  v_ayip := exists (select 1 from public.oz_order_items i join public.oz_products pr on pr.id = i.product_id
                      left join public.oz_categories c on c.id = pr.category_id
                     where i.order_id = p_order and coalesce(pr.perishable, c.perishable, false));
  if v_ayip and (p_reason is null or btrim(p_reason) not in ('Hasarlı geldi', 'Yanlış ürün gönderildi', 'Eksik ürün', 'Ürün açıklamayla uyuşmuyor', 'Bozuk / tarihi geçmiş')) then
    raise exception 'PF_STATE: Çabuk bozulabilen ürünlerde cayma hakkı yoktur; yalnız ayıplı, hasarlı, yanlış veya eksik ürün için iade isteyebilirsin';
  end if;
  v_reason := public.oz_clean(p_reason, 'İade nedeni', true, 200);
  v_details := public.oz_clean(p_details, 'Açıklama', false, 1000);
  perform set_config('oz.actor_role', 'customer', true);
  perform set_config('oz.reason', v_reason, true);
  insert into public.oz_returns (order_id, requester_id, reason, details, kind)
    values (p_order, auth.uid(), v_reason, v_details, case when v_ayip then 'ayip' else 'cayma' end) returning id into v_id;
  update public.oz_orders set status = 'return_requested' where id = p_order;
  perform public.oz_notify((select owner_user_id from public.oz_sellers where id = o.seller_id), p_order, 'return_requested',
    'İade talebi', o.order_no || ' için iade talebi geldi.', 'return:' || v_id);
  return v_id;
end $function$;

commit;

-- Kontrol (isteğe bağlı, salt okunur):
-- select column_name, data_type, column_default from information_schema.columns
--  where table_schema='public' and ((table_name='oz_products' and column_name='perishable') or (table_name='oz_returns' and column_name='kind'));
