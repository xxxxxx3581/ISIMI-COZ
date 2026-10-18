-- Paket 11 testi, 2. kısım: Paket 11 SONRASI karşılaştırma ve yeni alanlar (çıktı: 'anahtar => değer')
\set ON_ERROR_STOP 0
\set VERBOSITY terse
create function pg_temp.t(q text) returns text language plpgsql as $$ declare r text; begin execute q into r; return coalesce(r,'(null)'); exception when others then return 'HATA '||sqlerrm; end $$;
create function pg_temp.u(x text) returns void language sql as $$ select set_config('t.uid', x, false) $$;
create table pg_temp.after1 (k text, v jsonb);
select pg_temp.u('00000000-0000-0000-0000-0000000000b1'); insert into pg_temp.after1 select 'earn_a1', public.oz_seller_earnings();
select pg_temp.u('00000000-0000-0000-0000-0000000000b2'); insert into pg_temp.after1 select 'earn_a2', public.oz_seller_earnings();
select pg_temp.u('00000000-0000-0000-0000-00000000000a'); insert into pg_temp.after1 select 'overview', public.oz_admin_overview();
insert into pg_temp.after1 select 'due', public.oz_admin_list('payouts_due', null, null, 100, 0);
insert into pg_temp.after1 select 'returns', public.oz_admin_list('returns', null, null, 100, 0);
-- karşılaştırma: eski anahtarların değerleri aynı mı (yeni alanlar hariç)
select 'a) online yokken aynı: '||b.k k, case when b.k in ('due','returns') then
   (select (b.v = coalesce((select jsonb_agg(e - 'payment_method' - 'iyzico_approved') from jsonb_array_elements(a.v) e), '[]'))::text)
  else ((a.v - 'iyzico_pending_kurus' - 'iyzico_approved_kurus' - 'iyzico_waiting_kurus' - 'refund_required_count') = b.v)::text end
  ||' yeni='||coalesce((select string_agg(k2||'='||(a.v->>k2), ',') from unnest(array['iyzico_pending_kurus','iyzico_approved_kurus','iyzico_waiting_kurus','refund_required_count']) k2 where a.v ? k2),'-') v
  from tsnap.before b join pg_temp.after1 a using (k) order by 1;
select 'a) due satır sayısı' k, jsonb_array_length(v)::text v from pg_temp.after1 where k='due';
-- (b) sahte online siparişler (a1 satıcısı): durumları farklı, kalemli; elle hakediş toplamına girmemeli
insert into public.oz_orders(id,order_no,customer_id,seller_id,status,payment_method,payment_status,subtotal_kurus,shipping_fee_kurus,total_kurus,commission_bps,commission_kurus,seller_share_kurus,delivered_at,iyzico_ship_transaction_id,iyzico_ship_approve_status)
values ('10000000-0000-0000-0000-0000000000f1','ON1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','new','online','paid',33333+17777,4990,33333+17777+4990,1000,5111,33333+17777-5111+4990,null,'PS1','pending'),
       ('10000000-0000-0000-0000-0000000000f2','ON2','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','delivered','online','paid',29999,0,29999,1250,3749,29999-3749,now()-interval '1 day',null,null),
       ('10000000-0000-0000-0000-0000000000f3','ON3','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','delivered','online','paid',10001+10001+10001,7500,30003+7500,1000,3000,30003-3000+7500,now()-interval '10 days','PS3','approved'),
       ('10000000-0000-0000-0000-0000000000f4','ON4','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','delivered','online','paid',9999,4990,14989,1000,999,9999-999+4990,now()-interval '10 days','PS4','pending');
insert into public.oz_order_items(order_id,product_name,unit_price_kurus,quantity,line_total_kurus,iyzico_payment_transaction_id,iyzico_approve_status) values
 ('10000000-0000-0000-0000-0000000000f1','A',33333,1,33333,'P1','pending'),('10000000-0000-0000-0000-0000000000f1','B',17777,1,17777,'P2','pending'),
 ('10000000-0000-0000-0000-0000000000f2','C',29999,1,29999,'P3','pending'),
 ('10000000-0000-0000-0000-0000000000f3','D',10001,1,10001,'P4','approved'),('10000000-0000-0000-0000-0000000000f3','E',10001,1,10001,'P5','approved'),('10000000-0000-0000-0000-0000000000f3','F',10001,1,10001,'P6','pending'),
 ('10000000-0000-0000-0000-0000000000f4','G',9999,1,9999,'P7','pending');
create table pg_temp.after2 (k text, v jsonb);
select pg_temp.u('00000000-0000-0000-0000-0000000000b1'); insert into pg_temp.after2 select 'earn_a1', public.oz_seller_earnings();
select pg_temp.u('00000000-0000-0000-0000-00000000000a'); insert into pg_temp.after2 select 'overview', public.oz_admin_overview();
insert into pg_temp.after2 select 'due', public.oz_admin_list('payouts_due', null, null, 100, 0);
select 'b) elle hakediş değişmedi: '||a.k k, ((a.v - 'iyzico_pending_kurus' - 'iyzico_approved_kurus' - 'iyzico_waiting_kurus' - 'refund_required_count' - 'today_kurus' - 'today_orders' - 'week_kurus' - 'week_orders' - 'orders' - 'gmv_kurus' - 'commission_kurus')
   = (b.v - 'iyzico_pending_kurus' - 'iyzico_approved_kurus' - 'iyzico_waiting_kurus' - 'refund_required_count' - 'today_kurus' - 'today_orders' - 'week_kurus' - 'week_orders' - 'orders' - 'gmv_kurus' - 'commission_kurus'))::text v
  from pg_temp.after1 a join pg_temp.after2 b using (k) where a.k in ('earn_a1','overview')
union all select 'b) ödemeye hazır listesi değişmedi', ((select v from pg_temp.after1 where k='due') = (select v from pg_temp.after2 where k='due'))::text;
select 'b) yeni alanlar' k, (v->>'iyzico_pending_kurus')||' / '||(v->>'iyzico_approved_kurus')||' / '||(v->>'iyzico_waiting_kurus') v from pg_temp.after2 where k='earn_a1';
-- beklenen (elle): ON1 waiting = 33333+17777-5111+4990 = 51,  ON2 waiting = 26250, ON3 approved: D+E payı, pending: F payı + kargo 7500 (kargo pending), ON4 pending = 9999-999+4990
select 'b) beklenen' k, 'pending='||((select sum(share_kurus) from public.oz_iyz_item_shares(null, array['10000000-0000-0000-0000-0000000000f3'::uuid]) where approve_status<>'approved')+ (9999-999+4990))
  ||' approved='||(select sum(share_kurus) from public.oz_iyz_item_shares(null, array['10000000-0000-0000-0000-0000000000f3'::uuid]) where approve_status='approved')
  ||' waiting='||((33333+17777-5111+4990)+(29999-3749)) v;
-- (c) kalem payları toplamı = seller_share_kurus (rastgele 300 sipariş) ve oz_iyz_prepare'nin gönderdiğiyle aynı
insert into public.oz_orders(id,order_no,customer_id,seller_id,status,payment_method,payment_status,subtotal_kurus,shipping_fee_kurus,total_kurus,commission_bps,commission_kurus,seller_share_kurus)
select ('20000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid, 'R'||g, '00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2','awaiting_payment','online','pending',0,(g*137)%9000,0,(g*53)%5001,0,0
  from generate_series(1,300) g;
insert into public.oz_order_items(order_id,product_name,unit_price_kurus,quantity,line_total_kurus)
select ('20000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid, 'X', 1+((g*7919+k*104729)%99999), 1+(g+k)%3, (1+((g*7919+k*104729)%99999))*(1+(g+k)%3)
  from generate_series(1,300) g, generate_series(1,1+g%6) k;
update public.oz_orders o set subtotal_kurus=s.sub, total_kurus=s.sub+o.shipping_fee_kurus, commission_kurus=floor(s.sub*o.commission_bps/10000.0), seller_share_kurus=s.sub-floor(s.sub*o.commission_bps/10000.0)::int+o.shipping_fee_kurus
  from (select order_id, sum(line_total_kurus) sub from public.oz_order_items group by 1) s where s.order_id=o.id and o.order_no like 'R%';
select 'c) toplam = seller_share (300 sipariş)' k, count(*) filter (where s.tot = o.seller_share_kurus)||'/'||count(*) v
  from public.oz_orders o join (select order_id, sum(share_kurus) tot from public.oz_iyz_item_shares(null, null) group by 1) s on s.order_id=o.id where o.order_no like 'R%';
select 'c) negatif/sıfır pay' k, count(*)::text v from public.oz_iyz_item_shares(null, null) where share_kurus <= 0;
update public.oz_settings set value='"iyzico_sandbox"' where key='oz_payment_provider';
update public.oz_sellers set iyzico_sub_merchant_key='SMK-2', iyzico_sync_status='synced' where id='00000000-0000-0000-0000-0000000000a2';
select 'c) oz_iyz_prepare ile aynı (300 sipariş)' k, count(*) filter (where ok)||'/'||count(*) v from (
  select g, (select bool_and((e->>'sub_merchant_price_kurus')::int = sh.share_kurus)
               from jsonb_array_elements(public.oz_iyz_prepare('00000000-0000-0000-0000-0000000000c1', array[('20000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid])->'items') e
               join public.oz_iyz_item_shares(null, array[('20000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid]) sh on (e->>'kind')=sh.kind and (e->>'ref')=sh.ref::text) ok
    from generate_series(1,300) g) x;
update public.oz_settings set value='"mock"' where key='oz_payment_provider';
-- (d) iade gerekli listesi ve çözüldü
insert into public.oz_payments(id,customer_id,order_ids,provider,conversation_id,status,payment_id,amount_kurus,paid_kurus,error) values
 ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1',array['10000000-0000-0000-0000-0000000000f2'::uuid],'iyzico_sandbox','cv1','failed','IYZ-1',29999,29999,'Sipariş ödemeye uygun değildi (iptal/çift ödeme); iade gerekir'),
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1',array['10000000-0000-0000-0000-0000000000f4'::uuid],'iyzico_sandbox','cv2','failed','IYZ-2',14989,100,'Tahsil edilen tutar beklenenden farklı; iade gerekebilir'),
 ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000c1',array['10000000-0000-0000-0000-0000000000f4'::uuid],'iyzico_sandbox','cv3','failed',null,14989,null,'Kart reddedildi'),
 ('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000c1',array['10000000-0000-0000-0000-0000000000f4'::uuid],'iyzico_sandbox','cv4','paid','IYZ-4',14989,14989,null);
select pg_temp.u('00000000-0000-0000-0000-00000000000a');
select 'd) liste' k, string_agg((e->>'payment_id')||':'||(e->>'paid_kurus')||':'||(e->'order_nos')::text,' | ') v from jsonb_array_elements(public.oz_admin_refund_required()) e;
select 'd) sayaç' k, (public.oz_admin_overview()->>'refund_required_count') v;
select pg_temp.u('00000000-0000-0000-0000-0000000000c1');
select 'd) yetkisiz liste' k, pg_temp.t('select public.oz_admin_refund_required()::text') v;
select 'd) yetkisiz çözüm' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000001','iade yapıldı')::text$q$) v;
select pg_temp.u('00000000-0000-0000-0000-00000000000a');
select 'd) notsuz' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000001','  ')::text$q$) v;
select 'd) uzun not' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000001',repeat('x',301))::text$q$) v;
select 'd) iadesiz kayıt' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000003','not')::text$q$) v;
select 'd) çözüldü' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000001','iyzico panelinden iade edildi')::text$q$) v;
select 'd) tekrar' k, pg_temp.t($q$select public.oz_admin_refund_resolve('30000000-0000-0000-0000-000000000001','tekrar')::text$q$) v;
select 'd) sonra liste/sayaç' k, jsonb_array_length(public.oz_admin_refund_required())||' / '||(public.oz_admin_overview()->>'refund_required_count')||' / tümü='||jsonb_array_length(public.oz_admin_refund_required(true)) v;
select 'd) denetim' k, string_agg(action||':'||(details->>'note'),',') v from public.pf_audit_log where action='oz_refund_resolved';
-- returns: iyzico onaylı uyarı alanı
insert into public.oz_returns(order_id,status) values ('10000000-0000-0000-0000-0000000000f3','requested'),('10000000-0000-0000-0000-0000000000f4','requested');
select 'returns iyzico_approved' k, string_agg((e->>'order_no')||'='||(e->>'iyzico_approved')||'/'||(e->>'payment_method'),', ' order by e->>'order_no') v from jsonb_array_elements(public.oz_admin_list('returns',null,null,100,0)) e where e->>'payment_method'='online';
