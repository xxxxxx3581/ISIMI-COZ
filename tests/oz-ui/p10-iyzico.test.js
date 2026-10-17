// Paket 10: iyzico Pazaryeri (SANDBOX) — Edge Function mantığı (sahte iyzico/DB yanıtlarıyla) + arayüz (390px). Veri yazmaz, ağa çıkmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p10-iyzico.test.js
// Doğrulanan:
//  A) supabase/functions/oz-iyzico/core.ts: tutar ve kalemler yalnız sunucu hazırlığından (istemcinin gönderdiği tutar yok sayılır);
//     kalem toplamı = price = paidPrice; subMerchantKey/subMerchantPrice; IYZWSv2 imzası; kopya ve eşzamanlı geri çağrı tek sefer işlenir;
//     mock modunda init kapalı; esnaf/çiftçi alt üye senkronu bloklanır (iyzico'ya istek yok); onay yalnız yönetici; anahtar hiçbir çıktıda yok;
//     kart bilgisi özete/loga girmez; tutarsız sepet ve yanlış basketId reddedilir.
//  B) arayüz: mock (varsayılan) modunda ödeme ekranı ve akış eskisi gibi; iyzico_sandbox'ta "Kartla öde" + "Test ödemesi", sipariş →
//     onay kaydı → init (yalnız sipariş id'leri, tutar yok) → iyzico ödeme sayfasına yönlendirme; sonuç ekranı; ?oz_pay dönüş parametresi;
//     yönetici ödeme listesinde "iyzico onayı" (Son ödeme günü / Gecikti korunur, uygun olmayan kalemde düğme kapalı); satıcı detayında alt üye durumu.
const path=require('path');
const {chromium,open,enter}=require('./harness.js');
const API='sandbox-APIKEY-0123456789abcdef',SECRET='sandbox-SECRETKEY-fedcba9876543210',SERVICE='eyJhbGciOi.service-role-payload.sig',ANON='eyJhbGciOi.anon-payload.sig';
const SECRETS=[API,SECRET,SERVICE,Buffer.from(API).toString('base64'),Buffer.from(SECRET).toString('base64')];
const U1='11111111-1111-4111-8111-111111111111',ADM='22222222-2222-4222-8222-222222222222',O1='33333333-3333-4333-8333-333333333333',O2='44444444-4444-4444-8444-444444444444',PAY='55555555-5555-4555-8555-555555555555',SEL='66666666-6666-4666-8666-666666666666';
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 // ---------------------------------------------------------------- A) Edge Function mantığı
 const core=await import(path.join(__dirname,'../../supabase/functions/oz-iyzico/core.ts'));
 const out=[];// tüm çıktılar (yanıt gövdeleri, loglar, Supabase'e giden gövdeler) — anahtar araması için
 const db={provider:'iyzico_sandbox',pay:null,completeCalls:0,paidTransitions:0,syncResults:[],approvals:[]};
 const prep={payment_id:PAY,conversation_id:'conv-1',provider:'iyzico_sandbox',amount_kurus:111376,
  items:[{id:'item:a1',kind:'item',order_id:O1,name:'Zeytinyağı',price_kurus:35554,sub_merchant_key:'SMK-1',sub_merchant_price_kurus:31999},
         {id:'item:a2',kind:'item',order_id:O1,name:'Zeytinyağı 500',price_kurus:33333,sub_merchant_key:'SMK-1',sub_merchant_price_kurus:30000},
         {id:'ship:o1',kind:'ship',order_id:O1,name:'Kargo',price_kurus:4990,sub_merchant_key:'SMK-1',sub_merchant_price_kurus:4990},
         {id:'item:b1',kind:'item',order_id:O2,name:'Bal',price_kurus:29999,sub_merchant_key:'SMK-2',sub_merchant_price_kurus:26250},
         {id:'ship:o2',kind:'ship',order_id:O2,name:'Kargo',price_kurus:7500,sub_merchant_key:'SMK-2',sub_merchant_price_kurus:7500}],
  buyer:{id:U1,email:'alici@ornek.com',name:'Can Yılmaz',phone:'05321234567'},address:{recipient:'Can Yılmaz',city:'İzmir',line:'100. Sk. No:5, Kazımdirik',postal_code:'35100'}};
 const iyz=[];// iyzico'ya giden istekler
 let sellerRow={blocked:false,seller_id:SEL,sub_merchant_type:'LIMITED_OR_JOINT_STOCK_COMPANY',sub_merchant_key:null,name:'Şirket Satıcı',legal_name:'Şirket AŞ',tax_no:'1234567890',tax_office:'Bornova',phone:'05001112233',email:'s@x',iban:'TR000000000000000000000001',iban_holder:'Şirket AŞ',address:'Bornova, İzmir',city:'İzmir'};
 let detailRes=null;
 const resp=(status,body)=>({ok:status<400,status,text:async()=>typeof body==='string'?body:JSON.stringify(body),json:async()=>body});
 const fakeFetch=async(url,init={})=>{
  const body=init.body?JSON.parse(init.body):null;
  if(url.includes('/auth/v1/user')){const a=(init.headers||{}).Authorization||'';return a==='Bearer u.jwt.alici'?resp(200,{id:U1}):a==='Bearer a.jwt.admin'?resp(200,{id:ADM}):resp(401,{})}
  if(url.includes('/rest/v1/rpc/')){const fn=url.split('/rpc/')[1];out.push('rpc '+fn+' '+JSON.stringify(body));
   const f={
    oz_payment_provider:()=>db.provider,
    oz_iyz_prepare:()=>{if(body.p_user!==U1)throw {message:'PF_STATE: Sipariş ödemeye uygun değil'};db.pay={id:PAY,conversation_id:'conv-1',status:'initiated',token:null,order_ids:[O1,O2]};return prep},
    oz_iyz_attach:()=>{db.pay.token=body.p_token;return null},
    oz_iyz_payment_by_token:()=>db.pay&&db.pay.token===body.p_token?Object.assign({},db.pay):null,
    oz_iyz_complete:async()=>{db.completeCalls++;await new Promise(r=>setTimeout(r,5));// FOR UPDATE benzetimi: ilk çağrı durumu değiştirir
     if(db.pay.status!=='initiated')return {status:db.pay.status,duplicate:true};
     db.pay.status=body.p_success?'paid':'failed';if(body.p_success)db.paidTransitions++;db.lastComplete=body;return {status:db.pay.status}},
    oz_iyz_seller_for_sync:()=>body.p_actor!==ADM?(()=>{throw {message:'PF_AUTH: Yönetici yetkisi gerekli'}})():sellerRow,
    oz_iyz_seller_sync_result:()=>{db.syncResults.push(body);return null},
    oz_iyz_approval_target:()=>{if(body.p_actor!==ADM)throw {message:'PF_AUTH: Yönetici yetkisi gerekli'};if(body.p_id===O2)throw {message:'PF_STATE: Bekleme süresi henüz dolmadı'};return {kind:body.p_kind,id:body.p_id,payment_transaction_id:'PT-777',price_kurus:35554,status:'pending'}},
    oz_iyz_record_approval:()=>{db.approvals.push(body);return {status:body.p_success?'approved':'failed'}},
   }[fn];
   if(!f)return resp(404,{message:'yok'});
   try{const r=await f();return resp(200,r)}catch(e){return resp(400,{message:e.message})}}
  if(url.startsWith(core.IYZICO_SANDBOX)){const p=url.slice(core.IYZICO_SANDBOX.length);iyz.push({path:p,method:init.method,headers:init.headers,body});
   if(p===core.PATHS.cfInit)return resp(200,{status:'success',token:'tok-ABCDEFGH123',paymentPageUrl:'https://sandbox-cpp.iyzipay.com/?token=tok-ABCDEFGH123',checkoutFormContent:'<script></script>'});
   if(p===core.PATHS.cfDetail)return resp(200,detailRes);
   if(p===core.PATHS.subMerchant)return resp(200,{status:'success',subMerchantKey:'SMK-NEW-123'});
   if(p===core.PATHS.approve)return resp(200,{status:'success',paymentTransactionId:'PT-777'});
   return resp(404,{status:'failure'})}
  return resp(404,{})};
 const logs=[];
 const env={SUPABASE_URL:'https://proj.supabase.co',SUPABASE_ANON_KEY:ANON,SUPABASE_SERVICE_ROLE_KEY:SERVICE,IYZICO_SANDBOX_API_KEY:API,IYZICO_SANDBOX_SECRET_KEY:SECRET,IYZICO_BUYER_IDENTITY_NUMBER:'11111111111',OZ_SITE_URL:'https://site.test'};
 const h=core.createHandler({env:k=>env[k]||'',fetch:fakeFetch,log:(m,meta)=>logs.push(m+' '+JSON.stringify(meta||{}))});
 const call=async(action,body,auth,form)=>{const init={method:'POST',headers:{}};if(auth)init.headers.authorization='Bearer '+auth;
  if(form){const fd=new FormData();for(const k in form)fd.append(k,form[k]);init.body=fd}else if(body)init.body=JSON.stringify(body),init.headers['content-type']='application/json';
  const r=await h(new Request('https://proj.supabase.co/functions/v1/oz-iyzico?action='+action,init));const t=r.status===303?'':await r.text();out.push('res '+action+' '+r.status+' '+t+' '+(r.headers.get('location')||''));let j=null;try{j=JSON.parse(t)}catch(e){}return {s:r.status,j,loc:r.headers.get('location')}};
 // A1) mock modunda init kapalı, iyzico'ya istek yok
 db.provider='mock';let r=await call('init',{order_ids:[O1]},'u.jwt.alici');
 ok(r.s===409&&r.j&&r.j.error==='Online ödeme şu an kapalı.'&&!iyz.length,'mock modunda init kapalı: '+JSON.stringify(r));
 db.provider='iyzico';r=await call('init',{order_ids:[O1]},'u.jwt.alici');ok(r.s===403&&!iyz.length,'canlı iyzico kapalı: '+JSON.stringify(r));
 db.provider='iyzico_sandbox';
 r=await call('init',{order_ids:[O1]},null);ok(r.s===401,'oturumsuz init reddedilir');
 // A2) init: istemci tutar/kalem gönderse de sunucu hazırlığı kullanılır
 r=await call('init',{order_ids:[O1,O2],amount_kurus:1,price:'0.01',items:[{id:'x',price_kurus:1}]},'u.jwt.alici');
 const ci=iyz.find(x=>x.path===core.PATHS.cfInit);const rb=ci&&ci.body;
 ok(r.s===200&&r.j.payment_page_url&&r.j.payment_id===PAY&&r.j.amount_kurus===111376,'init başarılı: '+JSON.stringify(r.j));
 const sumItems=rb?rb.basketItems.reduce((n,b)=>n+Math.round(Number(b.price)*100),0):0;
 ok(rb&&rb.price==='1113.76'&&rb.paidPrice==='1113.76'&&sumItems===111376&&rb.basketId===PAY&&rb.conversationId==='conv-1'&&rb.currency==='TRY','init: tutar sunucu hazırlığından, kalem toplamı = price: '+JSON.stringify(rb&&{price:rb.price,paid:rb.paidPrice,sum:sumItems}));
 ok(rb&&rb.basketItems.every((b,i)=>b.subMerchantKey===prep.items[i].sub_merchant_key&&b.subMerchantPrice===(prep.items[i].sub_merchant_price_kurus/100).toFixed(2)&&Number(b.price)>0),'init: subMerchantKey/subMerchantPrice her kalemde: '+JSON.stringify(rb&&rb.basketItems.map(b=>[b.id,b.price,b.subMerchantPrice,b.subMerchantKey])));
 // imza: IYZWSv2, HMAC-SHA256(secret, rnd+path+payload)
 const au=ci&&ci.headers.Authorization||'';const dec=Buffer.from(au.replace(/^IYZWSv2 /,''),'base64').toString();
 const exp=require('crypto').createHmac('sha256',SECRET).update(ci.headers['x-iyzi-rnd']+core.PATHS.cfInit+JSON.stringify(rb)).digest('hex');
 ok(/^IYZWSv2 /.test(au)&&dec===('apiKey:'+API+'&randomKey:'+ci.headers['x-iyzi-rnd']+'&signature:'+exp),'IYZWSv2 imzası doğru');
 ok(db.pay.token==='tok-ABCDEFGH123','init: token kaydedildi');
 r=await call('init',{order_ids:['bozuk']},'u.jwt.alici');ok(r.s===400,'init: geçersiz sipariş id reddedilir');
 // A3) sepet doğrulama (istemci tutarına hiç bakılmaz; sunucu hazırlığı bile tutarsızsa reddedilir)
 const bad=JSON.parse(JSON.stringify(prep));bad.items[0].price_kurus=0;
 let thr='';try{core.validateBasket(bad)}catch(e){thr=e.message}ok(/sıfır/.test(thr),'kalem fiyatı sıfır olamaz: '+thr);
 const bad2=JSON.parse(JSON.stringify(prep));bad2.amount_kurus=111377;thr='';try{core.validateBasket(bad2)}catch(e){thr=e.message}ok(/eşit değil/.test(thr),'kalem toplamı ≠ tutar reddedilir: '+thr);
 const bad3=JSON.parse(JSON.stringify(prep));bad3.items[1].sub_merchant_price_kurus=99999;thr='';try{core.validateBasket(bad3)}catch(e){thr=e.message}ok(/Satıcı payı/.test(thr),'satıcı payı > fiyat reddedilir: '+thr);
 // A4) geri çağrı: başarı + kopya + eşzamanlı
 const mkDetail=async(o)=>{const d=Object.assign({status:'success',paymentStatus:'SUCCESS',paymentId:'PAYID-1',currency:'TRY',basketId:PAY,conversationId:'conv-1',paidPrice:'1113.76',price:'1113.76',token:'tok-ABCDEFGH123',fraudStatus:1,
   binNumber:'552879',lastFourDigits:'0008',cardHolderName:'CAN YILMAZ',cardAssociation:'MASTER_CARD',
   itemTransactions:prep.items.map((x,i)=>({itemId:x.id,paymentTransactionId:'PT-'+(i+1),price:(x.price_kurus/100).toFixed(2),subMerchantKey:x.sub_merchant_key}))},o||{});
   const f=[d.paymentStatus,d.paymentId,d.currency,d.basketId,d.conversationId,d.paidPrice,d.price,d.token].join(':');d.signature=require('crypto').createHmac('sha256',SECRET).update(f).digest('hex');return d};
 detailRes=await mkDetail();
 const [c1,c2]=await Promise.all([call('callback',null,null,{token:'tok-ABCDEFGH123'}),call('callback',null,null,{token:'tok-ABCDEFGH123'})]);
 r=await call('callback',null,null,{token:'tok-ABCDEFGH123'});
 ok(db.paidTransitions===1&&db.pay.status==='paid','kopya/eşzamanlı geri çağrı tek sefer işlendi: '+JSON.stringify({paid:db.paidTransitions,complete:db.completeCalls}));
 ok(iyz.filter(x=>x.path===core.PATHS.cfDetail).length<=2&&db.completeCalls<=2,'üçüncü (kopya) geri çağrı iyzico/DB işlemi yapmaz: '+JSON.stringify({detail:iyz.filter(x=>x.path===core.PATHS.cfDetail).length,complete:db.completeCalls}));
 ok([c1,c2,r].every(x=>x.s===303&&x.loc==='https://site.test/?oz_pay='+PAY),'geri çağrı sitenin sonuç sayfasına döner: '+JSON.stringify([c1.loc,r.loc]));
 const lc=db.lastComplete||{};
 ok(lc.p_success===true&&lc.p_paid_kurus===111376&&lc.p_payment_id==='PAYID-1'&&Array.isArray(lc.p_items)&&lc.p_items.length===5&&lc.p_items.every(i=>/^PT-\d$/.test(i.payment_transaction_id))&&lc.p_summary.signatureOk===true,'kırılımlar ve tutar kaydedilir: '+JSON.stringify(lc));
 ok(!/552879|0008|CAN YILMAZ|MASTER_CARD|binNumber|lastFour|cardHolder/.test(JSON.stringify(lc.p_summary)+logs.join('')),'kart bilgisi özete/loga girmez: '+JSON.stringify(lc.p_summary));
 r=await call('callback',null,null,{token:'tok-YOK'});ok(r.s===303&&/oz_pay=x$/.test(r.loc||''),'bilinmeyen token: işlem yok');
 // A5) yanlış basketId / imza bozuk → başarısız sayılır
 const v=core.verdict(await mkDetail({basketId:'baska'}),{id:PAY,conversation_id:'conv-1'});ok(!v.success,'yanlış basketId reddedilir');
 const sd=await mkDetail();sd.paidPrice='1.00';ok((await core.responseSignatureOk(sd,SECRET))===false,'imza bozuksa false');
 // A6) alt üye senkronu
 sellerRow={blocked:true,reason:'Vergi durumu "farmer" için iyzico alt üye türü eşlemesi teyit edilmedi; elle incelenmeli'};
 const nBefore=iyz.length;r=await call('sync_seller',{seller_id:SEL},'a.jwt.admin');
 ok(r.j&&r.j.manual_review===true&&/teyit edilmedi/.test(r.j.error)&&iyz.length===nBefore,'çiftçi/esnaf senkronu bloklanır, iyzico\'ya istek yok: '+JSON.stringify(r.j));
 r=await call('sync_seller',{seller_id:SEL},'u.jwt.alici');ok(r.s===403&&r.j.error==='Yönetici yetkisi gerekli','senkron yalnız yönetici: '+JSON.stringify(r));
 sellerRow={blocked:false,seller_id:SEL,sub_merchant_type:'LIMITED_OR_JOINT_STOCK_COMPANY',sub_merchant_key:null,name:'Şirket Satıcı',legal_name:'Şirket AŞ',tax_no:'1234567890',tax_office:'Bornova',phone:'05001112233',email:'s@x',iban:'TR000000000000000000000001',iban_holder:'Şirket AŞ',address:'Bornova, İzmir'};
 r=await call('sync_seller',{seller_id:SEL},'a.jwt.admin');const sm=iyz.filter(x=>x.path===core.PATHS.subMerchant).pop();
 ok(r.j&&r.j.ok&&sm&&sm.method==='POST'&&sm.body.subMerchantType==='LIMITED_OR_JOINT_STOCK_COMPANY'&&sm.body.taxNumber==='1234567890'&&db.syncResults.pop().p_key==='SMK-NEW-123','şirket alt üye açılır ve anahtar kaydedilir: '+JSON.stringify(sm&&sm.body));
 sellerRow=Object.assign({},sellerRow,{tax_office:null});const n2=iyz.length;r=await call('sync_seller',{seller_id:SEL},'a.jwt.admin');
 ok(r.j&&r.j.manual_review&&/taxOffice/.test(r.j.error)&&iyz.length===n2,'zorunlu alan eksikse manual_review: '+JSON.stringify(r.j));
 // A7) onay
 r=await call('approve',{kind:'item',id:O1,op:'approve'},'u.jwt.alici');ok(r.s===403&&!iyz.some(x=>x.path===core.PATHS.approve),'onay yalnız yönetici: '+JSON.stringify(r.j));
 r=await call('approve',{kind:'item',id:O2,op:'approve'},'a.jwt.admin');ok(r.s===409&&r.j.error==='Bekleme süresi henüz dolmadı','kapı kapalıysa iyzico\'ya gidilmez: '+JSON.stringify(r.j));
 r=await call('approve',{kind:'item',id:O1,op:'approve'},'a.jwt.admin');const ap=iyz.find(x=>x.path===core.PATHS.approve);
 ok(r.j&&r.j.ok&&ap&&ap.body.paymentTransactionId==='PT-777'&&db.approvals.length===1&&db.approvals[0].p_success===true,'yönetici onayı item/approve çağırır ve kaydedilir: '+JSON.stringify(ap&&ap.body));
 // A8) anahtarlar hiçbir çıktıda yok (yanıtlar, loglar, Supabase'e giden gövdeler)
 const all=out.join('\n')+logs.join('\n');ok(!SECRETS.some(k=>all.includes(k)),'anahtar hiçbir çıktıda yok');
 // ---------------------------------------------------------------- B) arayüz (390px)
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const cart0=JSON.stringify([{variant_id:'v1',product_id:'p0',qty:2,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'500 ml',image:null,price_kurus:65000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:10}]);
 const setup=async(p,prov)=>p.evaluate(([prov])=>{const F=window.__OZ_FX;if(prov)F.R.oz_public_settings=Object.assign({},F.R.oz_public_settings,{payment_provider:prov});
  F.R.pf_legal_current=['oz_on_bilgilendirme','oz_mesafeli_satis','oz_iade_cayma','oz_satici_sozlesmesi','oz_urun_kurallari','oz_kvkk_eki'].map((k,i)=>({doc_type:k,title:k,version:1}));
  F.R.pf_record_consents={saved:[{},{},{}],not_published:[]};window.__calls=[];const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){window.__calls.push([fn,JSON.parse(JSON.stringify(a||{}))]);return orig.apply(this,arguments)};
  // ayarlar modüle girişte okunur (üretimdeki gibi); sağlayıcı değişince yeniden giriş
  return OZ.tryEnter()},[prov]);
 const toCart=async p=>{await p.evaluate(c=>{document.querySelectorAll('.ozOv,.pfxOv,.ozToast').forEach(x=>x.remove());localStorage.setItem('isimi_oz_cart',c);window.__calls=[];OZ.go('cart',{})},cart0);await p.waitForTimeout(1800);
  for(const k of ['oz_on_bilgilendirme','oz_mesafeli_satis','oz_iade_cayma'])await p.check('#ozT_'+k);await p.waitForTimeout(100)};
 // B1) mock (varsayılan): eski akış
 {const {p,st}=await open(br,{w:390,h:844,visible:true});await enter(p);await setup(p,null);await toCart(p);
  const s1=await p.evaluate(()=>({pays:[...document.querySelectorAll('input[name=ozPay]')].map(x=>x.value),test:!!document.querySelector('[data-iyz-test]'),btn:document.getElementById('ozPlace').textContent}));
  ok(!s1.pays.includes('online')&&!s1.test&&s1.btn==='Siparişi onayla ve öde','mock: ödeme ekranı eskisi gibi (online yok, test etiketi yok): '+JSON.stringify(s1));
  await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(2500);
  const cs=await p.evaluate(()=>window.__calls.filter(x=>/^(oz_place_order|pf_record_consents|oz_mock_pay)$/.test(x[0])).map(x=>x[0]+(x[0]==='oz_place_order'?':'+x[1].p.payment_method:'')));
  ok(JSON.stringify(cs)===JSON.stringify(['oz_place_order:mock','pf_record_consents','oz_mock_pay']),'mock: sipariş → onay → deneme ödemesi (değişmedi): '+JSON.stringify(cs));
  // ?oz_pay dönüş parametresi: adres çubuğundan silinir, sonuç ekranı için saklanır
  await p.goto(p.url().split('?')[0].split('#')[0]+'?oz_pay='+PAY);await p.waitForTimeout(800);
  const dl=await p.evaluate(()=>({q:location.search,id:window.__ozPayReturn||null}));ok(dl.q===''&&dl.id===PAY,'?oz_pay: parametre silinir, dönüş kimliği alınır: '+JSON.stringify(dl));
  ok(!st.errors.length,'B1 sayfa hatası: '+st.errors.join(' | '));await p.context().close()}
 // B2) iyzico_sandbox: Kartla öde + Test ödemesi → init → iyzico sayfası
 {const {p,st}=await open(br,{w:390,h:844,visible:true});await enter(p);await setup(p,'iyzico_sandbox');
  const edge=[];await p.route('**/functions/v1/oz-iyzico**',async r=>{const u=r.request().url();edge.push({a:new URL(u).searchParams.get('action'),body:JSON.parse(r.request().postData()||'{}'),auth:r.request().headers()['authorization']||''});
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,payment_id:PAY,payment_page_url:'https://sandbox-cpp.iyzipay.com/?token=tok-1',amount_kurus:134990,mode:'sandbox'})})});
  await p.route('https://sandbox-cpp.iyzipay.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body>iyzico test</body></html>'}));
  await p.evaluate(()=>{window.__OZ_FX.R.oz_place_order={duplicate:false,orders:[{id:'o1',order_no:'OZ-1001',seller_id:'s1',status:'awaiting_payment',total_kurus:134990}]}});
  await toCart(p);
  const s2=await p.evaluate(()=>({pays:[...document.querySelectorAll('input[name=ozPay]')].map(x=>({v:x.value,on:x.checked,t:x.closest('label').textContent})),test:(document.querySelector('[data-iyz-test]')||{}).textContent||null}));
  ok(s2.pays.length&&s2.pays[0].v==='online'&&s2.pays[0].on&&s2.pays[0].t==='Kartla öde'&&s2.test==='Test ödemesi','sandbox: "Kartla öde" seçili ve "Test ödemesi" etiketi: '+JSON.stringify(s2));
  await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(2500);
  const cs=await p.evaluate(()=>(window.__calls||[]).filter(x=>/^(oz_place_order|pf_record_consents|oz_mock_pay)$/.test(x[0])).map(x=>x[0]+(x[0]==='oz_place_order'?':'+x[1].p.payment_method:'')));
  ok(/^https:\/\/sandbox-cpp\.iyzipay\.com\//.test(p.url()),'sandbox: iyzico ödeme sayfasına yönlendirildi: '+p.url());
  ok(edge.length===1&&edge[0].a==='init'&&JSON.stringify(Object.keys(edge[0].body))==='["order_ids"]'&&edge[0].body.order_ids[0]==='o1'&&/^Bearer /.test(edge[0].auth),'init yalnız sipariş id\'leri ile (tutar gönderilmez), oturum belirteciyle: '+JSON.stringify(edge));
  ok(!st.errors.length,'B2 sayfa hatası: '+st.errors.join(' | '));await p.context().close()}
 // B3) sonuç ekranı + sipariş detayında tekrar ödeme + yönetici
 {const {p,st}=await open(br,{w:390,h:844,visible:true});await enter(p);await setup(p,'iyzico_sandbox');
  const res=async s=>{await p.evaluate(([s,PAY])=>{window.__OZ_FX.T.oz_payments=[{id:PAY,status:s,order_ids:['o1']}];document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());OZ.go('payres',{id:PAY})},[s,PAY]);await p.waitForTimeout(900);
   return p.evaluate(()=>{const b=document.getElementById('ozPayRes');return b?{st:(b.querySelector('[data-paystate]')||{}).dataset?.paystate||null,h:(b.querySelector('h3')||{}).textContent,go:!!b.querySelector('[data-k=order][data-id=o1]'),test:!!b.querySelector('[data-iyz-test]')}:null})};
  let x=await res('paid');ok(x&&x.st==='paid'&&x.h==='Ödemen alındı'&&x.go&&x.test,'sonuç: ödendi + siparişe git: '+JSON.stringify(x));
  x=await res('failed');ok(x&&x.st==='failed'&&x.h==='Ödeme tamamlanamadı'&&x.go,'sonuç: başarısız: '+JSON.stringify(x));
  await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_order_detail;d.order=Object.assign({},d.order,{status:'awaiting_payment',payment_method:'online'});OZ.go('order',{id:'o1'})});await p.waitForTimeout(1300);
  const od=await p.evaluate(()=>({iyz:!!document.querySelector('#ozRoot [data-a=iyzPay]'),mock:!!document.querySelector('#ozRoot [data-a=mockPay]')}));
  ok(od.iyz&&!od.mock,'sipariş detayı: online siparişte "Ödemeyi tamamla" iyzico ile: '+JSON.stringify(od));
  // yönetici: ödeme listesi "iyzico onayı"
  const past=new Date(Date.now()-3*864e5).toISOString(),fut=new Date(Date.now()+4*864e5).toISOString();
  const edge=[];await p.route('**/functions/v1/oz-iyzico**',async r=>{edge.push({a:new URL(r.request().url()).searchParams.get('action'),body:JSON.parse(r.request().postData()||'{}')});return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"status":"approved"}'})});
  const admin=async prov=>{await p.evaluate(([past,fut,prov])=>{const F=window.__OZ_FX;F.R.oz_public_settings=Object.assign({},F.R.oz_public_settings,{payment_provider:prov});
    F.R.oz_admin_iyzico_items=[{kind:'item',id:'i1',order_no:'OZ-9',seller_name:'Yayla',name:'Zeytinyağı',price_kurus:35554,approve_status:'pending',due_by:past,block_reason:null},
      {kind:'ship',id:'o9',order_no:'OZ-9',seller_name:'Yayla',name:'Kargo',price_kurus:4990,approve_status:'approved',due_by:past,block_reason:null},
      {kind:'item',id:'i2',order_no:'OZ-10',seller_name:'Ova',name:'Bal',price_kurus:29999,approve_status:'pending',due_by:fut,block_reason:'Bekleme süresi dolmadı'}];
    window.PF.roles={is_admin:true,roles:['super']};document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());PF.openAdmin('oz_payouts')},[past,fut,prov]);await p.waitForTimeout(1500);
   return p.evaluate(()=>({h:(document.getElementById('ozAIyzH')||{}).textContent||null,rows:[...document.querySelectorAll('[data-iyz]')].map(c=>{const b=c.querySelector('[data-a=aIyz]'),l=c.querySelector('[data-late]');return {k:c.dataset.iyz,st:c.querySelector('[data-iyzst]').textContent,btn:b?(b.disabled?'kapalı':'açık'):'yok',due:!!c.querySelector('[data-due]'),late:!!l,col:l?getComputedStyle(l).color:null,blk:(c.querySelector('[data-block]')||{}).textContent||null}}),pay:/Ödeme kayıtları/.test(document.body.innerText)}))};
  let a=await admin('iyzico_sandbox');
  ok(a.h&&/iyzico onayı/.test(a.h)&&/Test ödemesi/.test(a.h)&&a.pay,'yönetici: "iyzico onayı" bölümü + ödeme kayıtları korunur: '+JSON.stringify(a.h));
  ok(a.rows.length===3&&a.rows[0].btn==='açık'&&a.rows[0].late&&a.rows[1].btn==='yok'&&a.rows[1].st==='Onaylandı'&&!a.rows[1].late&&a.rows[2].btn==='kapalı'&&!a.rows[2].late&&a.rows[2].blk==='Bekleme süresi dolmadı'&&a.rows.every(r=>r.due),'yönetici: onay düğmesi/Gecikti/son ödeme günü: '+JSON.stringify(a.rows));
  const red=a.rows[0].col&&a.rows[0].col.match(/\d+/g).map(Number);ok(red&&red[0]>150&&red[0]-red[1]>60,'"Gecikti" kırmızı: '+a.rows[0].col);
  await p.click('[data-iyz="item:i1"] [data-a=aIyz]');await p.waitForTimeout(400);
  const cb=await p.$('.ozOv [data-ok], .ozOv .ozBtn.pri, .pfxOv .pfxBtn.pri');
  if(cb){await p.evaluate(()=>{const b=[...document.querySelectorAll('.ozOv button')].find(x=>x.textContent.trim()==='Onayla');if(b)b.click()})}await p.waitForTimeout(1500);
  ok(edge.length===1&&edge[0].a==='approve'&&JSON.stringify(edge[0].body)===JSON.stringify({kind:'item',id:'i1',op:'approve'}),'yönetici onayı Edge Function approve\'u çağırır: '+JSON.stringify(edge));
  a=await admin('mock');ok(a.rows.length===3&&a.rows.every(r=>r.btn!=='açık')&&/Onay yalnız test/.test(await p.evaluate(()=>document.body.innerText)),'mock modunda onay düğmeleri kapalı: '+JSON.stringify(a.rows.map(r=>r.btn)));
  // satıcı detayı: alt üye durumu
  await p.evaluate(()=>{const F=window.__OZ_FX;F.R.oz_public_settings=Object.assign({},F.R.oz_public_settings,{payment_provider:'iyzico_sandbox'});const d=F.R.oz_admin_seller_detail;
   d.seller=Object.assign({},d.seller,{status:'approved',iyzico_sync_status:'manual_review',iyzico_sync_error:'Vergi durumu "farmer" için iyzico alt üye türü eşlemesi teyit edilmedi; elle incelenmeli',iyzico_sub_merchant_key:null});
   document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());PF.openAdmin('oz_sellers')});await p.waitForTimeout(1300);
  await p.click('[data-a=aSeller]');await p.waitForTimeout(1300);
  const sd=await p.evaluate(()=>{const c=document.getElementById('ozAIyzS');return c?{t:c.querySelector('[data-sync]').textContent,e:(c.querySelector('[data-syncerr]')||{}).textContent||null,btn:!c.querySelector('[data-a=aIyzSync]').disabled}:null});
  ok(sd&&sd.t==='Elle inceleme gerekli'&&/teyit edilmedi/.test(sd.e||'')&&sd.btn,'satıcı detayı: alt üye durumu ve neden: '+JSON.stringify(sd));
  ok(!st.errors.length,'B3 sayfa hatası: '+st.errors.join(' | '));await p.context().close()}
 await br.close();
 if(fails.length){console.error('p10-iyzico BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p10-iyzico: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p10-iyzico HATA:',e);process.exit(1)});
