// Paket 20: başvuru ve ilk kurulum deneyimi (yalnız arayüz) — 390px, krem ve koyu tema, sahte veri, ağa çıkmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p20-basvuru-kurulum.test.js   (P20_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Özüne Dön: "Satıcı ol" 4 renkli adım kartı + not + 56px başlat; adım çubuğu (biten ✓, aktif, bekleyen; tıklanınca o adım) ve "Adım N / 4 · Ad";
// 1. adım gruplu form + yardım + alan altında hata; 2. adım belge kartları (Eksik/Yüklendi/Reddedildi + gerekçe, önizleme, Değiştir/Sil, "N belgeden M'i
// tamam"), kart yüklemesi mevcut oz_seller_add_document'i kartın türüyle çağırır; 4. adım ✓/! satırları, eksik satır o adıma gider, Gönder kilidi aynı;
// inceleniyor sarı kart + 3 adımlı çizgi; reddedildi kırmızı gerekçe + büyük "Düzenle ve yeniden gönder"; onaylıda "Kurulum rehberi" yalnız eksikken.
// Yemek: işletme ekleme gruplu + "3 dakikada hazır" + 56px düğme; panel ve Ayarlar'da "Başlangıç rehberi"; Ayarlar rozetleri; enlem/boylam "Gelişmiş" altında.
// Her ekranda: yatay taşma yok, görünür düğmeler ≥44px, sayfa hatası yok.
const {chromium,open,enter,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P20_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const shots=[];
 const shot=async(p,n)=>{if(!SHOTS)return;const f=path.join(SHOTS,n+'.png');await p.evaluate(()=>document.querySelectorAll('#v2Toast,.ozToast').forEach(x=>x.remove()));await p.screenshot({path:f,fullPage:true});shots.push(f)};
 const chk=async(p,root,tg)=>{const r=await p.evaluate(root=>{const R=document.querySelector(root);if(!R)return null;
   const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('details:not([open])')};
   // hariç: sesle yazma düğmesi (ayrı modül a7-voice-input.js) ve cümle içi KVKK metin bağlantısı (P9, satır içi bağlantı)
   const skip=e=>e.matches('.a7VoiceBtn,[data-kvkk] .ozLink');
   return {small:[...R.querySelectorAll('button,.ozFile,a.fb,.fb')].filter(vis).filter(e=>!skip(e)).filter(e=>e.getBoundingClientRect().height<44).map(e=>(e.textContent.trim().slice(0,24)||e.className)+':'+Math.round(e.getBoundingClientRect().height))}},root);
  ok(r,tg+': ekran yok '+root);if(!r)return;ok((await overflow(p))<=0,tg+': yatay taşma');ok(!r.small.length,tg+': 44px altı: '+r.small.join(', '))};
 for(const light of [true,false]){const th=light?'krem':'koyu';
  /* ================= Özüne Dön ================= */
  let {ctx,p,st}=await open(br,{w:390,h:844,visible:true,theme:light?'light':'dark',fx:{dash:{status:'draft'}}});
  await enter(p);
  await p.evaluate(()=>{const F=window.__OZ_FX;Object.assign(F.T.oz_sellers[0],{status:'draft',tax_type:'esnaf_exempt',kind:'person',sells_food:true,declarations_at:null,logo_url:null,cover_url:null});
   F.R.pf_legal_current=[{doc_type:'oz_satici_sozlesmesi',title:'Satıcı Sözleşmesi',version:1},{doc_type:'oz_urun_kurallari',title:'Ürün Kuralları',version:1}];
   F.T.oz_seller_documents=[{id:'d1',doc_type:'identity',status:'pending',file_name:'kimlik.jpg',mime_type:'image/jpeg',storage_path:'s1/kimlik.jpg',created_at:'2026-10-01T10:00:00Z'},
    {id:'d2',doc_type:'esnaf_exemption',status:'rejected',reject_reason:'Belge okunmuyor, net fotoğraf yükle.',file_name:'muaf.pdf',storage_path:'s1/muaf.pdf',created_at:'2026-10-01T10:00:00Z'}];
   F.R.oz_seller_add_document='d9'});
  const go=async(k,a)=>{await p.evaluate(([k,a])=>{document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());OZ.go(k,a)},[k,a]);await p.waitForTimeout(1500)};
  // A1: başlangıç (satıcı kaydı yok)
  await p.evaluate(()=>{const F=window.__OZ_FX;F.__dash=F.R.oz_seller_dashboard;F.R.oz_seller_dashboard={has_seller:false}});
  await go('seller',{});
  let r=await p.evaluate(()=>({n:[...document.querySelectorAll('#ozRoot .ozApIntro li')].map(l=>l.querySelector('.n').textContent+':'+l.querySelector('b').textContent),
   bg:[...document.querySelectorAll('#ozRoot .ozApIntro .n')].map(e=>getComputedStyle(e).backgroundColor),note:(document.querySelector('#ozRoot .ozApNote')||{}).textContent||'',
   b:(()=>{const b=document.querySelector('#ozRoot [data-k=sellerApply].btnNext');return b?{t:b.textContent,h:Math.round(b.getBoundingClientRect().height)}:null})()}));
  ok(JSON.stringify(r.n)==='["1:Mağaza","2:Belgeler","3:Kargo","4:Gönder"]'&&new Set(r.bg).size===4,'['+th+'] başlangıç: 4 renkli numaralı kart: '+JSON.stringify(r));
  ok(/Yarım bırakıp dönebilirsin|yarım bırakıp dönebilirsin/.test(r.note)&&r.b&&r.b.t==='Başvuruya başla'&&r.b.h>=56,'['+th+'] başlangıç: not + 56px "Başvuruya başla": '+JSON.stringify(r));
  await chk(p,'#ozRoot','['+th+'] başlangıç');await shot(p,'oz-basla-'+th);
  // fikstür dash yalnız {status} içerir → satıcı kaydı olan pano verisi açıkça kurulur
  await p.evaluate(()=>{const F=window.__OZ_FX;F.R.oz_seller_dashboard={has_seller:true,status:'draft',status_reason:null,display_name:'Yayla Üreticileri',orders:{},products:{},low_stock:0,open_questions:0,unreplied_reviews:0,open_returns:0}});
  // A2/A3: 1. adım
  await go('sellerApply',{tab:'1'});
  r=await p.evaluate(()=>({bar:[...document.querySelectorAll('#ozRoot .ozApBar li')].map(l=>l.className+':'+l.querySelector('.n').textContent),lab:(document.querySelector('#ozRoot .ozApL')||{}).textContent,
   g:[...document.querySelectorAll('#ozRoot .ozFGH')].map(h=>h.textContent.trim()),help:document.querySelectorAll('#ozRoot .ozFHelp').length,leg:(document.querySelector('#ozRoot fieldset legend')||{}).textContent,
   req:[...document.querySelectorAll('#ozSReq li .ozTag')].map(t=>t.textContent+':'+t.className)}));
  ok(r.lab==='Adım 1 / 4 · Mağaza'&&r.bar.length===4&&r.bar[0]==='cur:1','['+th+'] 1. adım: çubuk + etiket: '+JSON.stringify(r.bar)+' '+r.lab);
  ok(JSON.stringify(r.g)==='["🏪 Mağaza","📞 İletişim","🧾 Vergi ve ödeme","📷 Fotoğraflar"]'&&r.help>=5&&r.leg==='Vergi durumun','['+th+'] 1. adım: gruplar + yardım: '+JSON.stringify(r));
  ok(r.req.some(x=>/^Eksik:ozTag warn$/.test(x))&&r.req.some(x=>/^Reddedildi:ozTag bad$/.test(x))&&r.req.some(x=>/^Yüklendi:ozTag ok$/.test(x)),'['+th+'] 1. adım: gerekli belge listesi renkli rozet: '+JSON.stringify(r.req));
  // P20 düzeltme: birden çok eksik → hepsi işaretli (kırmızı çerçeve + alan altında metin), üstte somut özet, ilk alana ortalı kaydırma + odak
  await p.fill('#ozS_display_name','');await p.fill('#ozS_phone','');await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));
  const s0=st.calls.length;await p.click('#ozRoot [data-a=storeSave]');await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const e=document.querySelector('#ozRoot .ozFErr');const i=document.getElementById('ozS_display_name');const b=i.getBoundingClientRect();
   return e?{t:e.textContent,after:!!(i.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING),near:e.getBoundingClientRect().top-b.bottom,inv:i.getAttribute('aria-invalid'),bd:getComputedStyle(i).borderTopColor,
    marked:[...document.querySelectorAll('#ozRoot .ozFErr')].map(x=>x.dataset.for),sum:(document.getElementById('ozSErrTop')||{}).textContent,sumOn:!document.getElementById('ozSErrTop').hidden,bottom:document.getElementById('ozSErr').hidden,
    focus:document.activeElement&&document.activeElement.id,mid:Math.abs((b.top+b.bottom)/2-innerHeight/2)<innerHeight/3}:null});
  ok(r&&r.t==='⚠ Mağaza adı yazılmalı (en az 3 harf).'&&r.after&&r.near<60&&r.inv==='true'&&r.bottom,'['+th+'] 1. adım: hata alanın altında, kırmızı + ikon: '+JSON.stringify(r));
  ok(r&&JSON.stringify(r.marked)==='["display_name","phone","iban","iban_holder"]','['+th+'] 1. adım: tüm eksik alanlar işaretli: '+JSON.stringify(r&&r.marked));
  ok(r&&r.sumOn&&r.sum==='4 alan eksik veya hatalı: Mağaza adı, Telefon, IBAN, Hesap sahibi adı','['+th+'] 1. adım: üstte somut özet: '+(r&&r.sum));
  ok(r&&r.focus==='ozS_display_name'&&r.mid,'['+th+'] 1. adım: ilk eksik alana kaydırma + odak: '+JSON.stringify(r&&{f:r.focus,m:r.mid}));
  ok(!st.calls.slice(s0).some(x=>x[0]==='oz_seller_apply'),'['+th+'] 1. adım: eksikken sunucuya gönderilmedi');
  await p.type('#ozS_display_name','Yayla');await p.waitForTimeout(100);
  ok(await p.evaluate(()=>!document.querySelector('#ozRoot .ozFErr[data-for=display_name]')&&!document.getElementById('ozS_display_name').getAttribute('aria-invalid')),'['+th+'] 1. adım: yazınca alanın hatası kalkar');
  ok(await p.evaluate(()=>document.getElementById('ozSErrTop').textContent==='3 alan eksik veya hatalı: Telefon, IBAN, Hesap sahibi adı'),'['+th+'] 1. adım: özet düzeltilen alanı çıkarır: '+await p.evaluate(()=>document.getElementById('ozSErrTop').textContent));
  await shot(p,'oz-adim1-eksik-'+th);
  // sunucu hatası: alanla eşlenen alanda, eşlenemeyen olduğu gibi altta
  await p.fill('#ozS_phone','05321234567');await p.fill('#ozS_iban','TR000000000000000000000001');await p.fill('#ozS_iban_holder','Yayla Tarım');
  await p.evaluate(()=>{window.__OZ_FX.fail={oz_seller_apply:'IBAN geçersiz (TR ile başlayan 26 haneli IBAN gir)'}});await p.click('#ozRoot [data-a=storeSave]');await p.waitForTimeout(800);
  r=await p.evaluate(()=>({m:[...document.querySelectorAll('#ozRoot .ozFErr')].map(x=>x.dataset.for+':'+x.textContent),f:document.activeElement&&document.activeElement.id,b:document.getElementById('ozSErr').hidden}));
  ok(JSON.stringify(r.m)==='["iban:⚠ IBAN geçersiz (TR ile başlayan 26 haneli IBAN gir)"]'&&r.f==='ozS_iban'&&r.b,'['+th+'] sunucu hatası alanla eşlendi: '+JSON.stringify(r));
  await p.evaluate(()=>{window.__OZ_FX.fail={oz_seller_apply:'Başvurun şu an incelemede veya askıda; değişiklik yapılamaz'}});await p.click('#ozRoot [data-a=storeSave]');await p.waitForTimeout(800);
  r=await p.evaluate(()=>({m:document.querySelectorAll('#ozRoot .ozFErr').length,t:document.getElementById('ozSErr').textContent,b:document.getElementById('ozSErr').hidden}));
  ok(!r.m&&!r.b&&r.t==='Başvurun şu an incelemede veya askıda; değişiklik yapılamaz','['+th+'] eşlenemeyen sunucu hatası olduğu gibi: '+JSON.stringify(r));
  await p.evaluate(()=>{window.__OZ_FX.fail=null});await go('sellerApply',{tab:'1'});
  await chk(p,'#ozRoot','['+th+'] 1. adım');await shot(p,'oz-adim1-'+th);
  // A4: 2. adım belge kartları
  await go('sellerApply',{tab:'2'});
  r=await p.evaluate(()=>({lab:document.querySelector('#ozRoot .ozApL').textContent,bar:[...document.querySelectorAll('#ozRoot .ozApBar li')].map(l=>l.className),n:(document.querySelector('#ozRoot .ozDocN')||{}).textContent,
   cards:[...document.querySelectorAll('#ozSReq li.ozDocC')].map(l=>({d:l.dataset.doc,tag:l.querySelector('.ozTag').textContent,bl:getComputedStyle(l).borderLeftColor,rs:(l.querySelector('.ozDocR')||{}).textContent||'',prev:!!l.querySelector('.ozDocP'),
    chg:!!l.querySelector('.ozFile input[data-dt="'+l.dataset.doc+'"]')&&/Değiştir/.test(l.textContent),del:!!l.querySelector('[data-a=docDel]'),big:(l.querySelector('.ozFileBig')||{}).textContent||''})),sel:document.getElementById('ozDocT').value}));
  ok(r.lab==='Adım 2 / 4 · Belgeler'&&r.bar[0]==='done'&&r.bar[1]==='cur','['+th+'] 2. adım: çubuk (1 bitti ✓, 2 aktif): '+JSON.stringify(r.bar));
  ok(r.n==="3 belgeden 1'i tamam",'['+th+'] 2. adım: sayaç: '+r.n);
  const c=Object.fromEntries((r.cards||[]).map(x=>[x.d,x]));
  ok(c.identity&&c.identity.tag==='Yüklendi'&&c.identity.prev&&c.identity.chg&&c.identity.del,'['+th+'] 2. adım: yüklenen belge önizleme + Değiştir/Sil: '+JSON.stringify(c.identity));
  ok(c.esnaf_exemption&&c.esnaf_exemption.tag==='Reddedildi'&&/Belge okunmuyor/.test(c.esnaf_exemption.rs)&&/Fotoğraf çek veya dosya seç/.test(c.esnaf_exemption.big),'['+th+'] 2. adım: reddedilen + gerekçe + yükle: '+JSON.stringify(c.esnaf_exemption));
  ok(c.food_registration&&c.food_registration.tag==='Eksik'&&c.food_registration.big==='📷 Fotoğraf çek veya dosya seç','['+th+'] 2. adım: eksik belge büyük düğme: '+JSON.stringify(c.food_registration));
  ok(new Set([c.identity,c.esnaf_exemption,c.food_registration].map(x=>x&&x.bl)).size===3,'['+th+'] 2. adım: durum renkleri farklı (yeşil/kırmızı/turuncu)');
  ok(r.sel==='esnaf_exemption','['+th+'] 2. adım: ek belge seçiminde ilk eksik seçili (mevcut): '+r.sel);
  await chk(p,'#ozRoot','['+th+'] 2. adım');await shot(p,'oz-adim2-'+th);
  // kart yüklemesi: mevcut FILES.doc → oz_seller_add_document (kartın türü)
  let n0=st.calls.length;
  await p.setInputFiles('#ozSReq li[data-doc=food_registration] input[type=file]',{name:'gida.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,224,0,16])});await p.waitForTimeout(1500);
  let cl=st.calls.slice(n0).find(x=>x[0]==='oz_seller_add_document');
  ok(cl&&cl[1].p_type==='food_registration'&&cl[1].p_name==='gida.jpg','['+th+'] 2. adım: kart yüklemesi mevcut RPC, kartın türüyle: '+JSON.stringify(cl));
  // silme: mevcut onay
  await p.evaluate(()=>document.querySelector('#ozSReq li[data-doc=identity] [data-a=docDel]').click());await p.waitForTimeout(400);
  ok(await p.evaluate(()=>/Belge silinsin mi\?/.test(document.body.innerText)),'['+th+'] 2. adım: Sil → mevcut onay penceresi');
  await p.evaluate(()=>document.querySelectorAll('.ozOv').forEach(x=>x.remove()));
  // adım çubuğundan geri dönüş
  await p.evaluate(()=>document.querySelector('#ozRoot .ozApBar li:first-child button').click());await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>document.querySelector('#ozRoot .ozApL').textContent==='Adım 1 / 4 · Mağaza'),'['+th+'] adım çubuğu: tıklayınca 1. adıma döner');
  // A5: 4. adım
  await go('sellerApply',{tab:'4'});
  r=await p.evaluate(()=>({rows:[...document.querySelectorAll('#ozRoot .ozCk')].map(e=>e.tagName+':'+e.className+':'+e.querySelector('.m').textContent+':'+(e.dataset.tab||'')),dis:document.getElementById('ozSubB').disabled,why:document.getElementById('ozSubWhy').textContent}));
  ok(r.rows.includes('DIV:ozCk ok:Mağaza bilgileri:')&&r.rows.includes('BUTTON:ozCk no:Belgeler:2')&&r.rows.some(x=>/^DIV:ozCk ok:Kargo ücret tablosu/.test(x)),'['+th+'] 4. adım: ✓/! satırları: '+JSON.stringify(r.rows));
  ok(r.dis&&/yükle/.test(r.why),'['+th+'] 4. adım: eksikken Gönder kapalı (mevcut): '+r.why);
  await chk(p,'#ozRoot','['+th+'] 4. adım');await shot(p,'oz-adim4-'+th);
  await p.evaluate(()=>document.querySelector('#ozRoot button.ozCk.no[data-tab="2"]').click());await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{const a=document.activeElement;const li=a&&a.closest&&a.closest('#ozSReq li');return {lab:document.querySelector('#ozRoot .ozApL').textContent,doc:li&&li.dataset.doc,type:a&&a.type}});
  ok(r.doc==='esnaf_exemption'&&r.type==='file','['+th+'] 4. adım → Belgeler: ilk eksik belgenin yükleme alanına odak: '+JSON.stringify(r));
  // Mağaza satırı (eksik TC/vergi no) → 1. adım + o alan işaretli ve odakta
  await p.evaluate(()=>{window.__OZ_FX.T.oz_sellers[0].tax_no=null});await go('sellerApply',{tab:'4'});
  await p.evaluate(()=>document.querySelector('#ozRoot button.ozCk.no[data-tab="1"]').click());await p.waitForTimeout(1500);
  r=await p.evaluate(()=>({lab:document.querySelector('#ozRoot .ozApL').textContent,f:document.activeElement&&document.activeElement.id,inv:document.getElementById('ozS_tax_no').getAttribute('aria-invalid'),m:(document.querySelector('#ozRoot .ozFErr[data-for=tax_no]')||{}).textContent}));
  ok(r.lab==='Adım 1 / 4 · Mağaza'&&r.f==='ozS_tax_no'&&r.inv==='true'&&/TCKN 11/.test(r.m||''),'['+th+'] 4. adım → Mağaza: 1. adım, TC/vergi no işaretli + odakta: '+JSON.stringify(r));
  await p.evaluate(()=>{window.__OZ_FX.T.oz_sellers[0].tax_no='1234567890'});await go('sellerApply',{tab:'2'});
  ok(await p.evaluate(()=>document.querySelector('#ozRoot .ozApL').textContent==='Adım 2 / 4 · Belgeler'),'['+th+'] 4. adım: eksik satır → 2. adım');
  // P31: TCKN/VKN algoritma kontrolü (ozTaxOk) + formda yalnız kayıtlıdan farklı yeni numaraya uygulanır
  r=await p.evaluate(()=>['10000000146','10000000147','1234567890','1234567891','11111111111'].map(x=>OZ.ozTaxOk(x)));
  ok(JSON.stringify(r)==='[true,false,true,false,false]','['+th+'] ozTaxOk örnekleri: '+JSON.stringify(r));
  const taxTry=async v=>{await go('sellerApply',{tab:'1'});await p.evaluate(v=>{const i=document.getElementById('ozS_tax_no');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#ozRoot [data-a=storeSave]').click()},v);await p.waitForTimeout(700);
   return p.evaluate(()=>({m:(document.querySelector('#ozRoot .ozFErr[data-for=tax_no]')||{}).textContent||'',inv:document.getElementById('ozS_tax_no').getAttribute('aria-invalid')}))};
  r=await taxTry('12345678901');ok(/TC kimlik \/ vergi numarası geçersiz; lütfen kontrol et\./.test(r.m)&&r.inv==='true','['+th+'] uydurma numara: tax_no alanında hata: '+JSON.stringify(r));await p.evaluate(()=>{const i=document.getElementById('ozS_tax_no');i.scrollIntoView({block:'center'})});await shot(p,'oz-p31-tax-'+th);
  r=await taxTry('1234567890');ok(!/geçersiz/.test(r.m),'['+th+'] geçerli VKN: tax_no hatası yok: '+JSON.stringify(r));
  await p.evaluate(()=>{window.__OZ_FX.T.oz_sellers[0].tax_no='12345678901'});r=await taxTry('12345678901');
  ok(!/geçersiz/.test(r.m),'['+th+'] kayıtlı numara değişmediyse algoritma kontrolü çalışmaz: '+JSON.stringify(r));
  await p.evaluate(()=>{window.__OZ_FX.T.oz_sellers[0].tax_no='1234567890'});
  // A6: inceleniyor / reddedildi
  await p.evaluate(()=>{window.__OZ_FX.R.oz_seller_dashboard=Object.assign({},window.__OZ_FX.R.oz_seller_dashboard,{status:'pending',status_reason:null})});await go('seller',{});
  r=await p.evaluate(()=>{const c=document.querySelector('#ozRoot .ozStC');return c?{cls:c.className,tl:[...c.querySelectorAll('.ozApTl li')].map(l=>l.className+':'+l.textContent),bd:getComputedStyle(c).borderTopColor}:null});
  ok(r&&/\brev\b/.test(r.cls)&&r.tl.length===3&&/^done/.test(r.tl[0])&&/^cur/.test(r.tl[1]),'['+th+'] inceleniyor: sarı kart + 3 adım: '+JSON.stringify(r));
  await chk(p,'#ozRoot','['+th+'] inceleniyor');await shot(p,'oz-inceleniyor-'+th);
  await p.evaluate(()=>{window.__OZ_FX.R.oz_seller_dashboard=Object.assign({},window.__OZ_FX.R.oz_seller_dashboard,{status:'rejected',status_reason:'Vergi levhası eksik.'})});await go('seller',{});
  r=await p.evaluate(()=>{const c=document.querySelector('#ozRoot .ozStC'),b=document.querySelector('#ozRoot .btnNext[data-k=sellerApply]');return {cls:c&&c.className,why:c&&(c.querySelector('.ozWarn')||{}).textContent,b:b&&b.textContent,h:b&&Math.round(b.getBoundingClientRect().height)}});
  ok(/\brej\b/.test(r.cls)&&/Vergi levhası eksik/.test(r.why)&&r.b==='✎ Düzenle ve yeniden gönder'&&r.h>=56,'['+th+'] reddedildi: kırmızı gerekçe + büyük düğme: '+JSON.stringify(r));
  await chk(p,'#ozRoot','['+th+'] reddedildi');await shot(p,'oz-reddedildi-'+th);
  // A7: onaylı → kurulum rehberi (eksik: fotoğraf + ilk ürün; kargo tablosu var)
  await p.evaluate(()=>{const F=window.__OZ_FX;F.R.oz_seller_dashboard=Object.assign({},F.R.oz_seller_dashboard,{status:'approved',status_reason:null,products:{}});F.T.oz_sellers[0].status='approved'});
  await go('seller',{tab:'ozet'});
  r=await p.evaluate(()=>{const g=document.querySelector('#ozSetup .ozSetup');return g?{rows:[...g.querySelectorAll('.ozCk')].map(e=>e.tagName+':'+e.querySelector('.m').firstChild.textContent+':'+(e.dataset.a||'')+(e.dataset.tab?'/'+e.dataset.tab:'')),n:g.querySelector('.ozDocN').textContent}:null});
  ok(r&&JSON.stringify(r.rows)==='["BUTTON:Mağaza fotoğrafı ekle:sTab/magaza","BUTTON:İlk ürününü ekle:spGo","DIV:Kargo tablonu doldur:"]'&&r.n==='1 / 3','['+th+'] onaylı: kurulum rehberi yalnız okunabilen maddeler: '+JSON.stringify(r));
  await chk(p,'#ozRoot','['+th+'] kurulum rehberi');await shot(p,'oz-kurulum-'+th);
  await p.evaluate(()=>{const b=document.querySelector('#ozSetup button.ozCk[data-a=sTab]');if(b)b.click()});await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>!!document.getElementById('ozS_display_name')),'['+th+'] rehber: fotoğraf maddesi → Mağaza ayarları');
  ok(!st.errors.length,'['+th+'] Özüne Dön sayfa hatası: '+st.errors.join(' | '));
  await ctx.close();
  /* ================= Yemek ================= */
  ({ctx,p,st}=await open(br,{w:390,h:844,visible:true}));
  await p.evaluate(light=>{document.documentElement.setAttribute('data-theme',light?'light':'dark');
   window.__FD={venues:[],venue:{id:'v1',name:'Test Lokanta',phone:'02320000000',address_text:'Bornova Mah. 1. Sk. No:2',district:'Bornova',cuisine_type:'Pide',description:'',is_open:false,is_active:true,working_hours:null,delivery_mode:'self_delivery',delivery_provider:'venue',min_order_amount:0,delivery_fee_kurus:0,prep_time_min:20,delivery_eta_min:30,commission_bps:1000,platform_fee_kurus:0,lat:null,lng:null,cover_url:null,image_url:null,delivery_radius_km:null},items:[]};window.__FDC=[];
   window.supabaseAuthRequest=async function(m,pth,b){window.__FDC.push([m,pth,b]);await new Promise(r=>setTimeout(r,10));const F=window.__FD,cl=x=>JSON.parse(JSON.stringify(x));
    if(m==='POST'&&pth.startsWith('rpc/')){const fn=pth.slice(4);if(fn==='food_whoami')return {venues:cl(F.venues)};if(fn==='food_venue_orders')return {orders:[],counts:{},summary:{}};return []}
    if(pth.startsWith('food_venues?'))return [cl(F.venue)];if(pth.startsWith('food_menu_items?'))return cl(F.items);return []}},light);
  // B1: işletme ekleme formu (işletme yok)
  await p.evaluate(()=>showFoodBusiness());await p.waitForTimeout(1200);
  r=await p.evaluate(()=>{const b=document.querySelector('#fdRoot [onclick^="foodCreateVenue"]');return {g:[...document.querySelectorAll('#fdRoot .fdGrpH')].map(h=>h.textContent),q:(document.querySelector('#fdRoot .fdQuick')||{}).textContent,
   ids:['nvName','nvPhone','nvDist','nvAddr','nvCui','nvMode'].every(i=>!!document.getElementById(i)),h:b&&Math.round(b.getBoundingClientRect().height),bg:b&&getComputedStyle(b).backgroundColor}});
  ok(JSON.stringify(r.g)==='["🏪 İşletme","📍 Konum","🍽️ Mutfak ve sipariş türü"]'&&/3 dakikada hazır/.test(r.q)&&r.ids&&r.h>=56,'['+th+'] Yemek işletme ekle: gruplu, not, 56px: '+JSON.stringify(r));
  await chk(p,'#fdRoot','['+th+'] Yemek işletme ekle');await shot(p,'yemek-isletme-ekle-'+th);
  // B2: panel üstünde başlangıç rehberi
  await p.evaluate(()=>{window.__FD.venues=[{id:'v1',name:'Test Lokanta',role:'owner'}]});
  await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{const g=document.querySelector('#fdGuideB .fdGuide');return g?{rows:[...g.querySelectorAll('.gi')].map(e=>e.tagName+':'+e.querySelector('.m').textContent),sw:!!document.getElementById('fdOpenSw'),first:!!(document.getElementById('fdOpenCard').compareDocumentPosition(document.querySelector('#fdGuideB'))&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(document.querySelector('#fdGuideB').compareDocumentPosition(document.getElementById('fdKpi'))&Node.DOCUMENT_POSITION_FOLLOWING)}:null});
  ok(r&&JSON.stringify(r.rows.map(x=>x.split(':')[1]))===JSON.stringify(['Menüye ürün ekle','Çalışma saatlerini gir','Teslimat bölgesi ve ücreti','Kapak görseli yükle','Sipariş almaya hazırım'])&&r.rows.every(x=>/^BUTTON/.test(x))&&r.sw&&r.first,'['+th+'] Yemek panel: başlangıç rehberi üst bölümde (P21: açık/kapalı kartı ve sayaçların altında), anahtar duruyor: '+JSON.stringify(r));
  await chk(p,'#fdRoot','['+th+'] Yemek panel');await shot(p,'yemek-panel-rehber-'+th);
  n0=await p.evaluate(()=>window.__FDC.length);
  await p.evaluate(()=>[...document.querySelectorAll('#fdGuideB .gi')].find(e=>/hazırım/.test(e.textContent)).click());await p.waitForTimeout(600);
  ok(!(await p.evaluate(n0=>window.__FDC.slice(n0).some(c=>c[0]==='PATCH'),n0))&&(await p.evaluate(()=>!document.getElementById('fdOpenSw').checked)),'['+th+'] "Sipariş almaya hazırım" yalnız anahtara götürür, açmaz');
  // B3: Ayarlar rozetleri, rehber, gelişmiş konum
  await p.evaluate(()=>{window.__FD.venue.working_hours={mon:[['10:00','22:00']]};window.__FD.items=[{id:'i1'}]});
  await p.evaluate(()=>showFoodSettings('v1'));await p.waitForTimeout(1500);
  r=await p.evaluate(()=>({b:[...document.querySelectorAll('#fdRoot details.fdDet[data-sec]')].map(d=>d.dataset.sec+':'+(d.querySelector('summary .fdSt')||{}).textContent),
   adv:(()=>{const a=document.getElementById('sLat');const d=a&&a.closest('details.fdAdv');return !!d&&!d.open&&!!d.querySelector('#sLng')&&/Gelişmiş/.test(d.querySelector('summary').textContent)})(),
   g:[...document.querySelectorAll('#fdGuideS .gi')].map(e=>e.className+':'+e.querySelector('.m').textContent)}));
  ok(JSON.stringify(r.b)===JSON.stringify(['profile:Tamam ✓','images:Eksik','order:Tamam ✓','zone:Eksik','hours:Tamam ✓']),'['+th+'] Ayarlar rozetleri: '+JSON.stringify(r.b));
  ok(r.adv,'['+th+'] Ayarlar: enlem/boylam "Gelişmiş" altında (kapalı, alanlar duruyor)');
  ok(r.g.includes('gi ok:Menüye ürün ekle')&&r.g.includes('gi ok:Çalışma saatlerini gir')&&r.g.includes('gi:Kapak görseli yükle'),'['+th+'] Ayarlar rehberi verilerden: '+JSON.stringify(r.g));
  await chk(p,'#fdRoot','['+th+'] Yemek ayarlar');await shot(p,'yemek-ayarlar-'+th);
  await p.evaluate(()=>[...document.querySelectorAll('#fdGuideS button.gi')].find(e=>/Teslimat bölgesi/.test(e.textContent)).click());await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.querySelector('details.fdDet[data-sec=zone]').open),'['+th+'] rehber maddesi ilgili bölümü açar');
  // hepsi tamamsa rehber gizli
  await p.evaluate(()=>{Object.assign(window.__FD.venue,{lat:38.4,lng:27.1,cover_url:'images/home/market.jpg',is_open:true})});
  await p.evaluate(()=>showFoodSettings('v1'));await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>!document.querySelector('#fdGuideS .fdGuide')),'['+th+'] tüm maddeler tamamsa rehber gizli');
  ok(!st.errors.length,'['+th+'] Yemek sayfa hatası: '+st.errors.join(' | '));
  await ctx.close();
 }
 await br.close();
 if(shots.length)console.log('ekran görüntüleri ('+shots.length+'): '+SHOTS);
 if(fails.length){console.error('p20-basvuru-kurulum BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p20-basvuru-kurulum: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p20-basvuru-kurulum HATA:',e);process.exit(1)});
