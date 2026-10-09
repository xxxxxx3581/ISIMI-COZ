-- Özüne Dön · Paket 4.2 — Bildirimlerde "Tümünü sil"
-- DURUM: UYGULANMADI. Supabase SQL Editor'de elle çalıştırılmalı.
--
-- Neden gerekli: public.oz_notifications tablosunda yalnız SELECT politikası var (user_id = auth.uid());
-- authenticated rolünün DELETE yetkisi yok. RLS'i gevşetmek yerine kullanıcının yalnız KENDİ bildirimlerini
-- silen dar kapsamlı bir RPC ekleniyor (security definer, user_id = auth.uid() ile sınırlı).
--
-- Ön yüz (oz-market-v1.js) bu fonksiyonu önce p_check => true ile çağırır (hiçbir şey silmez, yalnız varlığını
-- ve oturumu doğrular). Fonksiyon yoksa "Tümünü sil" düğmesi gizli kalır; eski davranış aynen sürer.

create or replace function public.oz_delete_my_notifications(p_check boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then raise exception 'PF_AUTH: Giriş yapmalısın'; end if;
  if p_check then return 0; end if;
  delete from public.oz_notifications where user_id = uid;
  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.oz_delete_my_notifications(boolean) from public, anon;
grant execute on function public.oz_delete_my_notifications(boolean) to authenticated;

-- Geri alma:
-- drop function if exists public.oz_delete_my_notifications(boolean);
