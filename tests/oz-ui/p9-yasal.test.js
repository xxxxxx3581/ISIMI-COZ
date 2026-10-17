// Paket 9: Özüne Dön yasal metinleri ve onay kayıtları — yalnız arayüz, 390px, sahte veri, veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p9-yasal.test.js
// Doğrulanan: ödemede üç ayrı onay (oz_on_bilgilendirme, oz_mesafeli_satis, oz_iade_cayma) başlık+sürüm pf_legal_current'tan, KVKK eki
// kutusuz bağlantı; üçü işaretlenmeden ödeme düğmesi kapalı; sipariş sonrası pf_record_consents (context 'oz_order', subject = sipariş id)
// ödemeden ÖNCE; metin yayında değilse kutular kapalı + uyarı ve sipariş/ödeme başlamaz; not_published doluysa ödeme başlamaz + uyarı;
// satıcı başvurusunda iki kutu (oz_satici_sozlesmesi, oz_urun_kurallari), context 'seller_application' + subject = satıcı id, yayında değilse
// gönder kapalı; yönetici özetinde "Yasal metinler: X/6 yayında".
const {chromium,open,enter}=require('./harness.js');
const ORD=['oz_on_bilgilendirme','oz_mesafeli_satis','oz_iade_cayma'];
const DOCS={oz_on_bilgilendirme:'Ön Bilgilendirme Formu (ÖD)',oz_mesafeli_satis:'Mesafeli Satış Sözleşmesi (ÖD)',oz_iade_cayma:'İade ve Cayma Koşulları (ÖD)',oz_satici_sozlesmesi:'Satıcı Sözleşmesi (ÖD)',oz_urun_kurallari:'Ürün Kuralları (ÖD)',oz_kvkk_eki:'KVKK Aydınlatma Eki (ÖD)'};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);
 // sepet test verisi (aj1-tema ile aynı biçim): tek satıcı, tek kalem
 const cart0=JSON.stringify([{variant_id:'v1',product_id:'p0',qty:2,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'500 ml',image:null,price_kurus:65000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:10}]);
 await p.evaluate(D=>{window.__D=D;window.__pub=k=>Object.keys(D).filter(x=>k.includes(x)).map((x,i)=>({doc_type:x,title:D[x],version:i+2,consent_kind:'required',audience:['all']}));
  const F=window.__OZ_FX;F.R.pf_legal_current=window.__pub(Object.keys(D));F.R.pf_record_consents={saved:[{},{},{}],not_published:[]};
  window.__calls=[];const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){window.__calls.push([fn,JSON.parse(JSON.stringify(a||{}))]);return orig.apply(this,arguments)}},DOCS);
 const toCart=async()=>{await p.evaluate(c=>{document.querySelectorAll('.ozOv,.pfxOv,.ozToast').forEach(x=>x.remove());localStorage.setItem('isimi_oz_cart',c);window.__calls=[];OZ.go('cart',{})},cart0);await p.waitForTimeout(1800)};
 const coState=()=>p.evaluate(()=>{const b=document.getElementById('ozPlace');return {off:b&&b.getAttribute('aria-disabled')==='true',
  rows:[...document.querySelectorAll('#ozConsR .ozCons2[data-doc]')].map(r=>({k:r.dataset.doc,t:r.querySelector('label span').textContent,v:(r.querySelector('.ozLVer')||{}).textContent||null,dis:r.querySelector('input').disabled,oku:!!r.querySelector('[data-a=legal][data-t='+r.dataset.doc+']')})),
  kvkk:(document.querySelector('#ozConsR [data-kvkk]')||{}).textContent||null,kvkkBox:!!document.querySelector('#ozConsR input[data-doc=oz_kvkk_eki]'),kvkkLink:!!document.querySelector('#ozConsR [data-kvkk] [data-a=legal][data-t=oz_kvkk_eki]'),
  na:(document.getElementById('ozLegalNA')||{}).textContent||null,old:!!document.getElementById('ozTAll')}});
 // 1) ödeme: üç kutu, sürüm, KVKK kutusuz
 await toCart();
 let c=await coState();
 ok(JSON.stringify(c.rows.map(r=>r.k))===JSON.stringify(ORD)&&!c.old,'ödeme: üç ayrı onay (Özüne Dön anahtarları), eski tek kutu yok: '+JSON.stringify(c.rows.map(r=>r.k)));
 ok(c.rows.every(r=>r.t===DOCS[r.k]+' metnini okudum, onaylıyorum.'&&/^Sürüm \d+$/.test(r.v||'')&&!r.dis&&r.oku),'ödeme: başlık ve sürüm veritabanından, "Oku" bağlantısı: '+JSON.stringify(c.rows));
 ok(c.kvkkLink&&!c.kvkkBox&&/KVKK Aydınlatma Eki \(ÖD\)/.test(c.kvkk||'')&&/Sürüm/.test(c.kvkk||''),'ödeme: KVKK eki yalnız bağlantı, kutu yok: '+JSON.stringify({k:c.kvkk,box:c.kvkkBox}));
 ok(c.off,'ödeme: kutular boşken düğme kapalı');
 await p.check('#ozT_oz_on_bilgilendirme');await p.check('#ozT_oz_mesafeli_satis');await p.waitForTimeout(100);
 ok((await coState()).off,'ödeme: iki kutu işaretliyken düğme hâlâ kapalı');
 await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(600);
 ok(!(await p.evaluate(()=>window.__calls.some(x=>x[0]==='oz_place_order'))),'ödeme: eksik onayla sipariş oluşturulmaz');
 await p.check('#ozT_oz_iade_cayma');await p.waitForTimeout(100);
 ok(!(await coState()).off,'ödeme: üçü işaretlenince düğme açık');
 await p.evaluate(()=>{window.__calls=[]});await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(2500);
 let calls=await p.evaluate(()=>window.__calls.filter(x=>/^(oz_place_order|pf_record_consents|oz_mock_pay)$/.test(x[0])));
 ok(JSON.stringify(calls.map(x=>x[0]))===JSON.stringify(['oz_place_order','pf_record_consents','oz_mock_pay']),'sıra: sipariş → onay kaydı → ödeme: '+JSON.stringify(calls.map(x=>x[0])));
 const rc=(calls.find(x=>x[0]==='pf_record_consents')||[])[1]||{};
 ok(rc.p_context==='oz_order'&&rc.p_subject_id==='o1'&&JSON.stringify((rc.p_items||[]).map(i=>i.doc_type+':'+i.accepted))===JSON.stringify(ORD.map(k=>k+':true'))&&typeof rc.p_user_agent==='string','onay kaydı: context oz_order, subject sipariş id, üç belge: '+JSON.stringify(rc));
 // 2) not_published dolu → ödeme başlamaz + uyarı
 // yeni sipariş id'si (o2): o1'in onayı bu oturumda zaten kaydedildi ve tekrar kaydedilmez (istemci önbelleği)
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.pf_record_consents={saved:[{},{}],not_published:['oz_iade_cayma']};R.oz_place_order={duplicate:false,orders:[{id:'o2',order_no:'OZ-1002',seller_id:'s1',status:'awaiting_payment',total_kurus:129990}]}});
 await toCart();for(const k of ORD)await p.check('#ozT_'+k);await p.waitForTimeout(100);
 await p.evaluate(()=>{window.__calls=[]});await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(2500);
 calls=await p.evaluate(()=>window.__calls.map(x=>x[0]));
 const tErr=await p.evaluate(()=>(document.querySelector('.ozToast.err')||{}).textContent||'');
 ok(calls.includes('pf_record_consents')&&!calls.includes('oz_mock_pay'),'not_published doluyken ödeme başlamaz: '+JSON.stringify(calls));
 ok(/Yasal metinler şu an hazır değil, daha sonra tekrar dene\./.test(tErr),'not_published doluyken uyarı: '+JSON.stringify(tErr));
 // 2b) siparişten "Ödemeyi tamamla" ile tekrar: onay kaydı yine olmazsa ödeme yok
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_order_detail;d.order=Object.assign({},d.order,{id:'o2',status:'awaiting_payment',payment_method:'mock'});window.__calls=[]});
 await p.evaluate(()=>{document.querySelectorAll('.ozToast').forEach(x=>x.remove());OZ.go('order',{id:'o2'})});await p.waitForTimeout(1400);
 if(await p.$('#ozRoot [data-a=mockPay]')){await p.click('#ozRoot [data-a=mockPay]');await p.waitForTimeout(1200);
  calls=await p.evaluate(()=>window.__calls.map(x=>x[0]));ok(calls.includes('pf_record_consents')&&!calls.includes('oz_mock_pay'),'detayda tekrar ödeme: onay kaydı olmadan ödeme yok: '+JSON.stringify(calls))}
 else ok(false,'sipariş detayında "Ödemeyi tamamla" bulunamadı');
 // 3) metinler yayında değil → kutular kapalı, uyarı, sipariş başlamaz
 await p.evaluate(()=>{const F=window.__OZ_FX;F.R.pf_legal_current=window.__pub(['oz_satici_sozlesmesi','oz_urun_kurallari']);F.R.pf_record_consents={saved:[{},{},{}],not_published:[]}});
 await toCart();c=await coState();
 ok(c.rows.length===3&&c.rows.every(r=>r.dis&&r.v===null)&&c.na==='Yasal metinler şu an hazır değil, daha sonra tekrar dene.'&&c.off,'yayında değil: kutular kapalı, sürüm yok, uyarı, düğme kapalı: '+JSON.stringify(c));
 await p.evaluate(()=>document.getElementById('ozPlace').click());await p.waitForTimeout(800);
 ok(!(await p.evaluate(()=>window.__calls.some(x=>x[0]==='oz_place_order'))),'yayında değilken sipariş oluşturulmaz');
 // 4) satıcı başvurusu: iki kutu, KVKK bağlantı, doğru context/subject
 await p.evaluate(()=>{const F=window.__OZ_FX;F.R.pf_legal_current=window.__pub(Object.keys(window.__D));F.R.pf_record_consents={saved:[{},{}],not_published:[]};F.R.oz_seller_declare='2026-10-17T10:00:00Z';
  Object.assign(F.T.oz_sellers[0],{status:'draft',tax_type:'company',sells_food:false,declarations_at:'2026-10-16T10:00:00Z'});
  F.T.oz_seller_documents=[{id:'d1',doc_type:'tax_plate',status:'pending'},{id:'d2',doc_type:'identity',status:'pending'}]});
 const sell=async()=>{await p.evaluate(()=>{document.querySelectorAll('.ozOv,.pfxOv,.ozToast').forEach(x=>x.remove());window.__calls=[];OZ.go('sellerApply',{tab:'4'})});await p.waitForTimeout(1600);
  return p.evaluate(()=>({rows:[...document.querySelectorAll('#ozSCons .ozCons2[data-doc]')].map(r=>({k:r.dataset.doc,t:r.querySelector('label span').textContent,v:(r.querySelector('.ozLVer')||{}).textContent||null,dis:r.querySelector('input').disabled})),
   kvkkBox:!!document.querySelector('#ozSCons input[data-doc=oz_kvkk_eki]'),kvkkLink:!!document.querySelector('#ozSCons [data-kvkk] [data-a=legal][data-t=oz_kvkk_eki]'),old:!!document.getElementById('ozSTerms'),
   off:document.getElementById('ozSubB').disabled,why:document.getElementById('ozSubWhy').textContent,na:!!document.getElementById('ozSLegalNA')}))};
 let sv=await sell();
 ok(JSON.stringify(sv.rows.map(r=>r.k))===JSON.stringify(['oz_satici_sozlesmesi','oz_urun_kurallari'])&&sv.rows.every(r=>!r.dis&&/^Sürüm \d+$/.test(r.v||'')&&r.t===window_t(r.k))&&!sv.old,'satıcı: iki ayrı kutu, sürüm, eski kutu yok: '+JSON.stringify(sv.rows));
 function window_t(k){return DOCS[k]+' metnini okudum, onaylıyorum.'}
 ok(sv.kvkkLink&&!sv.kvkkBox,'satıcı: KVKK eki yalnız bağlantı');
 ok(sv.off&&/Satıcı Sözleşmesi \(ÖD\) onayını işaretle/.test(sv.why)&&/Ürün Kuralları \(ÖD\) onayını işaretle/.test(sv.why),'satıcı: kutular boşken gönder kapalı ve nedenleri: '+sv.why);
 await p.check('#ozSDecl');await p.check('#ozSC_oz_satici_sozlesmesi');await p.waitForTimeout(100);
 ok(await p.evaluate(()=>document.getElementById('ozSubB').disabled),'satıcı: tek kutuyla gönder kapalı');
 await p.check('#ozSC_oz_urun_kurallari');await p.waitForTimeout(100);
 ok(!(await p.evaluate(()=>document.getElementById('ozSubB').disabled)),'satıcı: iki kutu + Paket 8 şartları tamam → gönder açık');
 await p.click('#ozSubB');await p.waitForTimeout(1500);
 calls=await p.evaluate(()=>window.__calls.filter(x=>/^(pf_record_consents|oz_seller_declare|oz_seller_submit)$/.test(x[0])));
 const sc=(calls.find(x=>x[0]==='pf_record_consents')||[])[1]||{};
 ok(sc.p_context==='seller_application'&&sc.p_subject_id==='s1'&&JSON.stringify((sc.p_items||[]).map(i=>i.doc_type+':'+i.accepted))===JSON.stringify(['oz_satici_sozlesmesi:true','oz_urun_kurallari:true']),'satıcı: onay kaydı context/subject/belgeler: '+JSON.stringify(sc));
 ok(JSON.stringify(calls.map(x=>x[0]))===JSON.stringify(['pf_record_consents','oz_seller_submit']),'satıcı: önce onay kaydı, sonra başvuru (beyan önceden var): '+JSON.stringify(calls.map(x=>x[0])));
 // 4b) satıcı: onay kaydı not_published → başvuru gönderilmez
 await p.evaluate(()=>{window.__OZ_FX.R.pf_record_consents={saved:[],not_published:['oz_urun_kurallari']};window.__OZ_FX.T.oz_sellers[0].status='draft'});
 sv=await sell();await p.check('#ozSC_oz_satici_sozlesmesi');await p.check('#ozSC_oz_urun_kurallari');await p.click('#ozSubB');await p.waitForTimeout(1500);
 calls=await p.evaluate(()=>window.__calls.map(x=>x[0]));
 ok(calls.includes('pf_record_consents')&&!calls.includes('oz_seller_submit'),'satıcı: not_published doluyken başvuru gönderilmez: '+JSON.stringify(calls));
 // 4c) satıcı metinleri yayında değil → kutular kapalı, gönder kapalı + not
 await p.evaluate(()=>{window.__OZ_FX.R.pf_legal_current=window.__pub(['oz_on_bilgilendirme','oz_mesafeli_satis','oz_iade_cayma'])});
 sv=await sell();
 ok(sv.rows.every(r=>r.dis)&&sv.na&&sv.off&&/Yasal metinler hazır değil/.test(sv.why),'satıcı: metinler yayında değil → kutular ve gönder kapalı + not: '+JSON.stringify(sv));
 // 5) yönetici özeti şeridi
 const adm=async()=>{await p.evaluate(()=>{document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());window.PF.roles={is_admin:true,roles:['super']};PF.openAdmin('oz_overview')});await p.waitForTimeout(1300);
  return p.evaluate(()=>(document.getElementById('ozALegal')||{}).textContent||null)};
 let a=await adm();ok(/^Yasal metinler: 3\/6 yayında/.test(a||''),'yönetici: "Yasal metinler: 3/6 yayında": '+JSON.stringify(a));
 await p.evaluate(()=>{window.__OZ_FX.R.pf_legal_current=window.__pub(Object.keys(window.__D))});a=await adm();
 ok(/^Yasal metinler: 6\/6 yayında/.test(a||''),'yönetici: 6/6: '+JSON.stringify(a));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p9-yasal BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p9-yasal: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p9-yasal HATA:',e);process.exit(1)});
