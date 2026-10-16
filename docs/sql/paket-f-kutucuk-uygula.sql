-- PAKET F: kutucuk görselleri için home_hero_slides'a 4 yeni rol (16.10.2026 canlıya uygulandı; onay: A+B)
begin;
alter table public.home_hero_slides drop constraint home_hero_slides_role_check;
alter table public.home_hero_slides add constraint home_hero_slides_role_check
  check (role = any (array['base','slide','tile_food','tile_market','tile_ilan','tile_hizmet']));

create or replace function public.pf_admin_hero_add(p_role text, p_path text, p_caption text default null::text)
 returns uuid language plpgsql security definer set search_path to '' as $function$ declare v uuid; n int; c text := nullif(btrim(coalesce(p_caption,'')),''); begin
  perform public.pf_require('ops');
  if p_role not in ('base','slide','tile_food','tile_market','tile_ilan','tile_hizmet') then raise exception 'PF_INPUT: Rol geçersiz.'; end if;
  if p_path is null or p_path !~ '^[A-Za-z0-9._-]{1,120}$' or p_path like '%..%' then raise exception 'PF_INPUT: Dosya yolu geçersiz.'; end if;
  if c is not null and char_length(c) > 24 then raise exception 'PF_INPUT: Ad en fazla 24 karakter olabilir.'; end if;
  if p_role='slide' then
    select count(*) into n from public.home_hero_slides where role='slide' and is_active;
    if n >= 8 then raise exception 'PF_STATE: En fazla 8 kayan fotoğraf olabilir.'; end if;
  else
    update public.home_hero_slides set is_active=false where role=p_role and is_active;
    c := null;
  end if;
  insert into public.home_hero_slides(role,storage_path,sort_order,caption) values (p_role,p_path,
    coalesce((select max(sort_order)+1 from public.home_hero_slides where role=p_role),0), c) returning id into v;
  perform public.pf_audit('hero.add','hero',v::text,jsonb_build_object('role',p_role,'path',p_path,'caption',c));
  return v;
end $function$;

create or replace function public.pf_admin_hero_update(p_id uuid, p_sort integer default null::integer, p_active boolean default null::boolean, p_caption text default null::text)
 returns void language plpgsql security definer set search_path to '' as $function$ declare r public.home_hero_slides; c text := nullif(btrim(coalesce(p_caption,'')),''); begin
  perform public.pf_require('ops');
  select * into r from public.home_hero_slides where id=p_id;
  if not found then raise exception 'PF_INPUT: Kayıt bulunamadı.'; end if;
  if p_caption is not null and c is not null and char_length(c) > 24 then raise exception 'PF_INPUT: Ad en fazla 24 karakter olabilir.'; end if;
  if p_active is true and r.role<>'slide' then update public.home_hero_slides set is_active=false where role=r.role and is_active and id<>p_id; end if;
  if p_active is true and r.role='slide' and not r.is_active and (select count(*) from public.home_hero_slides where role='slide' and is_active)>=8 then
    raise exception 'PF_STATE: En fazla 8 kayan fotoğraf olabilir.'; end if;
  update public.home_hero_slides set sort_order=coalesce(p_sort,sort_order), is_active=coalesce(p_active,is_active),
    caption = case when p_caption is null then caption else c end where id=p_id;
  perform public.pf_audit('hero.update','hero',p_id::text,jsonb_build_object('sort',p_sort,'active',p_active,'caption',p_caption));
end $function$;
create unique index home_hero_one_active_tile on public.home_hero_slides(role) where role like 'tile\_%' and is_active;
commit;
