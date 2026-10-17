// Paket 8: satıcı kayıt şartları (vergi durumu, belgeler, beyan) — yalnız arayüz, 390px, sahte veri, veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p8-satici-kayit.test.js
// Doğrulanan: başvuru 1. adımda "Vergi durumun" (4 seçenek + açıklama), "Gıda ürünü satacağım" (varsayılan işaretli) ve seçime göre
// gereken belgeler listesi (4 vergi türü + gıda kutusu); kayıtta tax_type/kind/sells_food; 2. adımda yeni belge türü etiketleri ve ilk eksik
// belgenin seçili gelmesi; 4. adımda beyan metni + kutusu, eksik varken "Başvuruyu gönder" devre dışı ve nedenleri, tamamlanınca
// oz_seller_declare → oz_seller_submit sırası; SQL uygulanmamışsa (tax_type alanı yok) eski akış; yönetici satıcı detayında vergi durumu,
// gıda satışı, beyan tarihi ve zorunlu belgeler (yeşil/kırmızı rozet + uyarı).
const {chromium,open,enter}=require('./harness.js');
const DECL='Ürünlerimin mevzuata uygun üretildiğini, etiket bilgilerinin (içerik, alerjen, net miktar, son tüketim tarihi, menşe, üretici) doğru olduğunu, gerekli kayıt ve izinlere sahip olduğumu ve ürünlerden kaynaklı sorumluluğun bende olduğunu beyan ederim.';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{dash:{status:'draft'}}});
 await enter(p);
 await p.evaluate(()=>{const F=window.__OZ_FX;Object.assign(F.T.oz_sellers[0],{status:'draft',tax_type:null,sells_food:true,declarations_at:null});
  F.R.oz_seller_declare='2026-10-17T10:00:00Z';
  // P9 (bilinçli beklenti değişikliği): tek "satıcı sözleşmesi" kutusu yerine iki yasal metin onayı (oz_satici_sozlesmesi, oz_urun_kurallari);
  // metinler yayında sayılır ve onay kaydı başarılı döner
  F.R.pf_legal_current=[{doc_type:'oz_satici_sozlesmesi',title:'Satıcı Sözleşmesi',version:1},{doc_type:'oz_urun_kurallari',title:'Ürün Kuralları',version:1}];
  F.R.pf_record_consents={saved:[{doc_type:'oz_satici_sozlesmesi'},{doc_type:'oz_urun_kurallari'}],not_published:[]};window.__calls=[];const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){window.__calls.push([fn,a]);return orig.apply(this,arguments)}});
 const step=async n=>{await p.evaluate(n=>{document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());OZ.go('sellerApply',{tab:String(n)})},n);await p.waitForTimeout(1400)};
 const req=()=>p.evaluate(()=>[...document.querySelectorAll('#ozSReq li')].map(l=>l.dataset.doc+':'+l.querySelector('.ozTag').textContent));
 // 1) 1. adım: vergi durumu seçenekleri, gıda kutusu, belge listesi
 await step(1);
 const f1=await p.evaluate(()=>({opts:[...document.querySelectorAll('#ozRoot input[name=ozTax]')].map(r=>({v:r.value,t:r.closest('label').querySelector('b').textContent,d:r.closest('label').querySelector('small').textContent})),
  leg:(document.querySelector('#ozRoot fieldset legend')||{}).textContent,food:(document.getElementById('ozS_food')||{}).checked,foodL:(document.getElementById('ozS_food')||{closest:()=>null}).closest('label')?.textContent,kind:!!document.querySelector('input[name=ozKind]')}));
 ok(f1.leg==='Vergi durumun'&&JSON.stringify(f1.opts.map(o=>o.t))===JSON.stringify(['Şirket','Şahıs işletmesi','Esnaf (muaf)','Çiftçi / üretici'])&&f1.opts.every(o=>o.d.length>10)&&!f1.kind,'1. adım: 4 vergi durumu + açıklama, eski tür seçimi yok: '+JSON.stringify(f1));
 ok(f1.food===true&&f1.foodL==='Gıda ürünü satacağım','1. adım: "Gıda ürünü satacağım" varsayılan işaretli: '+JSON.stringify(f1));
 const EXP={company:['identity:Eksik','tax_plate:Yüklendi','food_registration:Eksik'],sole_prop:['identity:Eksik','tax_plate:Yüklendi','food_registration:Eksik'],
  esnaf_exempt:['identity:Eksik','esnaf_exemption:Eksik','food_registration:Eksik'],farmer:['identity:Eksik','farmer_registration:Eksik','food_registration:Eksik']};
 for(const k of Object.keys(EXP)){await p.check('#ozRoot input[name=ozTax][value='+k+']');await p.waitForTimeout(150);const r=await req();
  ok(JSON.stringify(r)===JSON.stringify(EXP[k]),'gereken belgeler ('+k+'): '+JSON.stringify(r));
  ok(await p.evaluate(k=>document.querySelector('#ozRoot input[name=ozTax][value='+k+']').closest('label').classList.contains('on'),k),'seçilen kart vurgulu ('+k+')')}
 await p.uncheck('#ozS_food');await p.waitForTimeout(150);
 let r=await req();ok(JSON.stringify(r)===JSON.stringify(['identity:Eksik','farmer_registration:Eksik']),'gıda kutusu kaldırılınca gıda belgesi istenmez: '+JSON.stringify(r));
 // fikstürde IBAN yok; form IBAN olmadan kaydetmez (mevcut kural) → test verisi olarak doldurulur
 await p.fill('#ozS_iban','TR000000000000000000000001');await p.fill('#ozS_iban_holder','Yayla Tarım Ltd.');
 await p.click('#ozRoot [data-a=storeSave]');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>{const e=document.getElementById('ozSErr');return !e||e.hidden}),'kayıt formu hata vermedi: '+await p.evaluate(()=>(document.getElementById('ozSErr')||{}).textContent));
 const ap=await p.evaluate(()=>{const c=window.__calls.filter(x=>x[0]==='oz_seller_apply').pop();return c&&c[1].p});
 ok(ap&&ap.tax_type==='farmer'&&ap.kind==='person'&&ap.sells_food===false,'kayıtta tax_type/kind/sells_food: '+JSON.stringify(ap&&{t:ap.tax_type,k:ap.kind,f:ap.sells_food}));
 // 2) 2. adım: yeni belge etiketleri, ilk eksik seçili
 await p.evaluate(()=>Object.assign(window.__OZ_FX.T.oz_sellers[0],{tax_type:'esnaf_exempt',kind:'person',sells_food:true}));
 await step(2);
 const s2=await p.evaluate(()=>{const s=document.getElementById('ozDocT');return {o:[...s.options].map(o=>o.textContent),sel:s.value,req:[...document.querySelectorAll('#ozSReq li')].map(l=>l.dataset.doc)}});
 ok(['Esnaf muaflık belgesi','Çiftçi kayıt belgesi','Gıda işletme kayıt/onay belgesi'].every(x=>s2.o.includes(x)),'2. adım: yeni belge türü etiketleri: '+JSON.stringify(s2.o));
 ok(s2.sel==='identity'&&JSON.stringify(s2.req)===JSON.stringify(['identity','esnaf_exemption','food_registration']),'2. adım: liste ve ilk eksik belge seçili: '+JSON.stringify(s2));
 // 3) 4. adım: eksikken devre dışı, beyan
 await p.evaluate(()=>Object.assign(window.__OZ_FX.T.oz_sellers[0],{tax_type:'company',kind:'business'}));
 await step(4);
 const g1=await p.evaluate(()=>({dis:document.getElementById('ozSubB').disabled,t:document.getElementById('ozSubB').textContent,why:document.getElementById('ozSubWhy').textContent,decl:(document.getElementById('ozSDecl')||{closest:()=>null}).closest('label')?.textContent,dc:(document.getElementById('ozSDecl')||{}).checked}));
 ok(g1.t==='Başvuruyu gönder'&&g1.dis&&g1.decl===DECL&&g1.dc===false,'4. adım: düğme devre dışı, beyan metni ve kutusu: '+JSON.stringify(g1));
 ok(/Kimlik belgesi yükle/.test(g1.why)&&/Gıda işletme kayıt\/onay belgesi yükle/.test(g1.why)&&!/Vergi levhası yükle/.test(g1.why)&&/Satıcı beyanını onayla/.test(g1.why)&&/Satıcı Sözleşmesi onayını işaretle/.test(g1.why)&&/Ürün Kuralları onayını işaretle/.test(g1.why),'4. adım: eksikler tek tek yazılı: '+g1.why);
 await p.check('#ozSDecl');await p.check('#ozSC_oz_satici_sozlesmesi');await p.check('#ozSC_oz_urun_kurallari');await p.waitForTimeout(150);
 const g2=await p.evaluate(()=>({dis:document.getElementById('ozSubB').disabled,why:document.getElementById('ozSubWhy').textContent}));
 ok(g2.dis&&!/beyan|sözleşme|kurallar/i.test(g2.why)&&/Kimlik belgesi yükle/.test(g2.why),'kutular işaretli ama belge eksik → hâlâ devre dışı: '+JSON.stringify(g2));
 await p.evaluate(()=>{const T=window.__OZ_FX.T;T.oz_seller_documents=T.oz_seller_documents.concat([{id:'d2',doc_type:'identity',status:'pending'},{id:'d3',doc_type:'food_registration',status:'pending'}])});
 await step(4);
 ok(await p.evaluate(()=>document.getElementById('ozSubB').disabled),'belgeler tam, kutular boş → devre dışı');
 await p.check('#ozSDecl');await p.waitForTimeout(100);
 ok(await p.evaluate(()=>document.getElementById('ozSubB').disabled&&/Satıcı Sözleşmesi onayını/.test(document.getElementById('ozSubWhy').textContent)),'yalnız beyan işaretli → sözleşme eksik');
 await p.check('#ozSC_oz_satici_sozlesmesi');await p.check('#ozSC_oz_urun_kurallari');await p.waitForTimeout(100);
 const g3=await p.evaluate(()=>({dis:document.getElementById('ozSubB').disabled,why:document.getElementById('ozSubWhy').textContent}));
 ok(!g3.dis&&g3.why==='Başvurun gönderilmeye hazır.','tamamlanınca etkin: '+JSON.stringify(g3));
 await p.evaluate(()=>{window.__calls=[]});await p.click('#ozSubB');await p.waitForTimeout(1500);
 const seq=await p.evaluate(()=>window.__calls.map(x=>x[0]).filter(f=>/^oz_seller_(declare|submit)$/.test(f)));
 ok(JSON.stringify(seq)===JSON.stringify(['oz_seller_declare','oz_seller_submit']),'gönderimde önce beyan, sonra başvuru: '+JSON.stringify(seq));
 // 4) SQL uygulanmamış (tax_type alanı yok) → eski akış
 await p.evaluate(()=>{const s=window.__OZ_FX.T.oz_sellers[0];delete s.tax_type;delete s.sells_food;delete s.declarations_at;s.status='draft'});
 await step(1);
 const lg=await p.evaluate(()=>({kind:!!document.querySelector('input[name=ozKind]'),tax:!!document.querySelector('input[name=ozTax]'),food:!!document.getElementById('ozS_food')}));
 ok(lg.kind&&!lg.tax&&!lg.food,'SQL yokken 1. adım eski tür seçimi: '+JSON.stringify(lg));
 await step(4);
 const lg4=await p.evaluate(()=>({decl:!!document.getElementById('ozSDecl'),dis:document.getElementById('ozSubB').disabled}));
 await p.check('#ozSC_oz_satici_sozlesmesi');await p.check('#ozSC_oz_urun_kurallari');await p.waitForTimeout(100);
 ok(!lg4.decl&&lg4.dis&&!(await p.evaluate(()=>document.getElementById('ozSubB').disabled)),'SQL yokken 4. adım: beyan kutusu yok, sözleşmeyle etkin: '+JSON.stringify(lg4));
 // 5) yönetici satıcı detayı
 await p.evaluate(()=>{const R=window.__OZ_FX.R;const d=R.oz_admin_seller_detail;
  d.seller=Object.assign({},d.seller,{tax_type:'esnaf_exempt',kind:'person',sells_food:true,declarations_at:'2026-10-10T09:30:00Z',status:'pending'});
  d.documents=[{id:'x1',doc_type:'identity',status:'approved',storage_path:'s1/a.pdf'},{id:'x2',doc_type:'esnaf_exemption',status:'pending',storage_path:'s1/b.pdf'}];window.PF.roles={is_admin:true,roles:['super']}});
 await p.evaluate(()=>{document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());PF.openAdmin('oz_sellers')});await p.waitForTimeout(1300);
 await p.click('[data-a=aSeller]');await p.waitForTimeout(1300);
 const ad=await p.evaluate(()=>{const rows={};document.querySelectorAll('.pfxTbl tr').forEach(tr=>{const th=tr.querySelector('th');if(th)rows[th.textContent]=tr.querySelector('td').textContent});
  const bg=[...document.querySelectorAll('#ozAReq [data-req]')].map(e=>({k:e.dataset.req,ok:e.dataset.ok,t:e.textContent,col:getComputedStyle(e).color}));return {rows,bg,warn:!!document.querySelector('#ozAReq [data-reqwarn]')}});
 ok(ad.rows['Vergi durumu']==='Esnaf (muaf)'&&ad.rows['Gıda satışı']==='Evet'&&/2026/.test(ad.rows['Beyan tarihi']||''),'yönetici: vergi durumu, gıda, beyan tarihi: '+JSON.stringify(ad.rows));
 ok(JSON.stringify(ad.bg.map(b=>b.k+':'+b.ok+':'+b.t))===JSON.stringify(['identity:1:Onaylı','esnaf_exemption:0:Onay bekliyor','food_registration:0:Eksik'])&&ad.warn,'yönetici: zorunlu belgeler rozetleri + uyarı: '+JSON.stringify(ad.bg));
 const rgb=c=>c.match(/\d+/g).map(Number);const g=rgb(ad.bg[0].col),b=rgb(ad.bg[2].col);
 ok(g[1]>g[0]&&b[0]>b[1],'rozet renkleri yeşil/kırmızı: '+JSON.stringify([ad.bg[0].col,ad.bg[2].col]));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p8-satici-kayit BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p8-satici-kayit: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p8-satici-kayit HATA:',e);process.exit(1)});
