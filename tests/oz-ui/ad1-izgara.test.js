// AD1: ürün listesi "Izgara / Liste" görünümü — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ad1-izgara.test.js
// Doğrulanan: varsayılan Izgara (satıcı ürün listesi, arama, favoriler); 390px'te 3 sütun, 10px boşluk; kare foto (cover, ortalı);
// "+" fotoğrafın sağ üstünde, dokunma alanı ≥44px, görsel ~31px, kart dışına taşmaz; kartta kalp/yıldız/açıklama/nokta yok;
// "+" tıklaması paneli açmaz, karta dokunuş "+" eklemez (panel açılır); seçenekli üründe "+" küçük seçenek penceresi; tek fiyatlıda
// adet artar (rozet 1 → 2); stoksuzda "Tükendi" + soluk foto + "+" pasif ama görünür; aria (kart "ad, fiyat"; "+" "Sepete ekle" /
// "Seçenek seç, …"); Izgara/Liste düğmeleri 44px, seçili altın; Liste'ye geçiş mevcut kartı (.ozGc) gösterir ve yenilemede korunur;
// büyük yazıda (kök 24px) 2 sütun, taşma/üst üste binme yok; AA kontrast (fiyat, ad, soluk satırlar); aynı satırda kart yükseklikleri eşit.
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:['https://img.test/recel.jpg','https://img.test/bal-recel.jpg',null,'https://img.test/kuru-yemis.jpg','https://img.test/zeytin-zeytinyagi.jpg','https://img.test/recel.jpg'][i],in_stock:i!==3}));
  T.oz_products=R.oz_search_products.map(x=>({id:x.id,description:'Uzun açıklama metni',net_content:x.id==='p2'?'500 g':x.id==='p0'?'1 L':null}));
  T.oz_variants=[{product_id:'p0',label:'500 ml',price_kurus:65000,stock:5,sort:0},{product_id:'p0',label:'1 L',price_kurus:125000,stock:5,sort:1},{product_id:'p2',label:'500 g',price_kurus:89990,stock:9,sort:0}];
  const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_product_detail'&&x.p_id==='p2'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));
    return Object.assign({},R.oz_product_detail,{id:'p2',name:'Ezine peyniri 2',variants:[{id:'v9',label:'500 g',price_kurus:89990,stock:9,weight_g:600}]})}return o(fn,x)}});
 await enter(p);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla Üreticileri'}));await p.waitForTimeout(1500);
 const G=()=>p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozGrs');if(!g)return {none:true,list:!!document.querySelector('#ozRoot .ozGcs')};
  const cs=getComputedStyle(g);const cols=cs.gridTemplateColumns.split(' ').length;const cards=[...g.querySelectorAll('.ozGr')];
  const rs=cards.map(c=>c.getBoundingClientRect());let lap=false;rs.forEach((a,i)=>rs.forEach((b,j)=>{if(i<j&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)lap=true}));
  const row0=rs.filter(r=>Math.abs(r.top-rs[0].top)<2).map(r=>Math.round(r.height));
  return {cols,gap:cs.columnGap,n:cards.length,lap,row0,extra:cards.some(c=>c.querySelector('.ozFav,.rt,.ds,.dt')),
   sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
 let g=await G();
 ok(!g.none&&g.cols===3&&g.gap==='10px'&&g.n===6,'varsayılan Izgara, 390px 3 sütun, 10px: '+JSON.stringify(g));
 ok(!g.extra,'ızgara kartında kalp/yıldız/açıklama/nokta olmamalı');ok(!g.lap&&g.sw<=0,'üst üste binme/taşma yok');
 ok(g.row0&&g.row0.every(h=>h===g.row0[0]),'aynı satırda kart yükseklikleri eşit: '+JSON.stringify(g.row0));
 const C=id=>p.evaluate(id=>{const c=document.querySelector('#ozRoot .ozGr[data-pid="'+id+'"]');if(!c)return null;
  function lum(x){const m=x.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const bg=getComputedStyle(c).backgroundColor;
  const ph=c.querySelector('.ph'),im=ph.querySelector('img'),pl=c.querySelector('.ac .ozPlus')||c.querySelector('.ac .ozPStep [data-d="1"]');const pr=ph.getBoundingClientRect(),br=pl.getBoundingClientRect(),cr0=c.getBoundingClientRect();
  const q=s=>c.querySelector(s);const t=s=>(q(s)||{}).textContent||'';const col=s=>q(s)?getComputedStyle(q(s)).color:bg;
  return {go:q('.go').getAttribute('aria-label'),plus:pl.getAttribute('aria-label'),dis:pl.disabled,pw:Math.round(br.width),ph:Math.round(br.height),vis:getComputedStyle(pl,'::before').width,
   tr:Math.round(pr.right-br.right),tt:Math.round(br.top-pr.top),inCard:br.right<=cr0.right+.5&&br.top>=cr0.top-.5,sq:Math.abs(pr.width-pr.height)<1.5,
   fit:im?getComputedStyle(im).objectFit+' '+getComputedStyle(im).objectPosition:'',op:im?getComputedStyle(im).opacity:'',so:t('.so'),
   pr:t('.pr'),up:t('.up'),nm:t('.nm'),nt:t('.nt'),bd:t('.ac .bd'),
   aa:[cr(q('.pr b')?col('.pr b'):q('.pr .uf')?col('.pr .uf'):col('.pr .nvp'),bg),cr(col('.nm'),bg),cr(col('.up'),bg),cr(col('.nt'),bg)].map(x=>+x.toFixed(2)),
   border:getComputedStyle(c).borderTopColor,rad:getComputedStyle(c).borderTopLeftRadius,ph0:!!ph.querySelector('i')}},id);
 let c0=await C('p0'),c2=await C('p2'),c3=await C('p3');
 ok(c0&&c2&&c3,'kartlar bulunmalı');
 if(c0&&c2&&c3){
  ok(c2.pw>=44&&c2.ph>=44&&c2.vis==='31px'&&c2.tr<=1&&c2.tt<=1&&c2.inCard,'"+" foto sağ üstte, ≥44px dokunma, ~31px görsel, kart içinde: '+JSON.stringify(c2));
  ok(c2.sq&&c0.sq&&c0.fit==='cover 50% 50%','kare foto, cover, ortalı: '+c0.fit);
  ok(/^Ezine peyniri 2, 899,90\s₺$/.test(c2.go)&&c2.plus==='Sepete ekle','aria: kart "ad, fiyat", "+" "Sepete ekle": '+c2.go+' / '+c2.plus);
  ok(/899,90/.test(c2.pr)&&/₺\/kg/.test(c2.up)&&c2.nt==='500 g','tek fiyatlı: fiyat + ≈ birim + net miktar: '+JSON.stringify([c2.pr,c2.up,c2.nt]));
  ok(/^≈ .+ ₺\/L'd[ae]n$/.test(c0.pr)&&/^Seçenek seç, 2 hacim seçeneği$/.test(c0.plus)&&c0.nt==='2 hacim seçeneği','seçenekli: "≈ X ₺/L\'dan" + seçenek bilgisi, "+" aria: '+JSON.stringify([c0.pr,c0.plus,c0.nt]));
  ok(c3.dis&&c3.so==='Tükendi'&&+c3.op<.6&&c3.pw>=44,'stoksuz: "+" pasif ama görünür, "Tükendi", soluk foto: '+JSON.stringify(c3));
  ok(c2.aa.every(x=>x>=4.5)&&c0.aa.every(x=>x>=4.5),'AA kontrast (fiyat, ad, soluk satırlar): '+JSON.stringify([c2.aa,c0.aa]));
  ok(c2.border==='rgb(138, 107, 62)'&&parseFloat(c2.rad)>=14&&parseFloat(c2.rad)<=16,'bronz kenar, 14-16px köşe: '+c2.border+' '+c2.rad);
 }
 const ph2=await p.evaluate(()=>{const c=document.querySelector('#ozRoot .ozGr[data-pid="p2"] .ph');return !!c&&!c.querySelector('img')&&c.querySelector('i').textContent});
 ok(ph2==='E','foto yoksa baş harf yer tutucu: '+ph2);
 // seçenekli "+" → küçük pencere, panel değil
 await click(p,'#ozRoot .ozGr[data-pid="p0"] .ac .ozPlus',1000);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')),'seçenekli "+" küçük seçenek penceresini açmalı, paneli değil');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 // tek fiyatlı "+" → adet artar, panel açılmaz
 const cartN=()=>p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0)}catch(e){return -1}});
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ac .ozPlus',1100);
 ok(await cartN()===1&&!(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))),'tek fiyatlı "+" sepete 1 ekler, panel açmaz');
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ac .ozPStep [data-d="1"]',1100);
 /* AE2: tek fiyatlı ürün eklenince "+" yerine "− n +" hapı; ikinci ekleme hapın "Artır"ı (yalnız beklenti güncellendi) */
 c2=await C('p2');ok(await cartN()===2&&c2&&c2.plus==='Artır'&&(await p.evaluate(()=>(document.querySelector('#ozRoot .ozGr[data-pid="p2"] .ozPStep b')||{}).textContent))==='2','ikinci ekleme adet 2, hapta 2: '+JSON.stringify(c2&&[c2.bd,c2.plus]));
 // karta dokunuş → panel, "+" eklemez
 await click(p,'#ozRoot .ozGr[data-pid="p4"] .go',1300);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&await cartN()===2,'karta dokunuş paneli açmalı, sepete eklememeli');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(500);
 // görünüm anahtarı
 const sw=await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozVw button')].map(b=>{const r=b.getBoundingClientRect();return {v:b.dataset.v,on:b.getAttribute('aria-pressed'),l:b.getAttribute('aria-label'),w:Math.round(r.width),h:Math.round(r.height),bg:getComputedStyle(b).backgroundColor}}));
 ok(sw.length===2&&sw[0].v==='grid'&&sw[0].on==='true'&&sw[0].bg==='rgb(242, 180, 49)'&&sw.every(b=>b.w>=44&&b.h>=44&&/görünümü/.test(b.l)),'Izgara/Liste düğmeleri 44px, aria, seçili altın: '+JSON.stringify(sw));
 await click(p,'#ozRoot .ozVw [data-v=list]',600);
 g=await G();ok(g.none&&g.list&&await p.evaluate(()=>!!document.querySelector('#ozRoot .ozGcs .ozGc')),'Liste düğmesi mevcut liste kartını göstermeli');
 ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_view_00000000-0000-0000-0000-000000000001')==='list'),'seçim kullanıcıya özel localStorage anahtarında');
 await click(p,'#ozRoot .ozVw [data-v=grid]',600);
 ok(!(await G()).none,'Izgara düğmesi ızgaraya döndürmeli');
 // arama ve favoriler de ızgara + anahtar
 await p.evaluate(()=>OZ.go('search',{q:'bal'}));await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozSrtR .ozVw')&&!!document.querySelector('#ozRoot .ozGrs .ozGr')),'arama sonuçları: anahtar + ızgara');
 ok(await overflow(p)<=0,'arama 390px taşma');
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozVw')&&!!document.querySelector('#ozRoot .ozGrs .ozGr')),'favori ürünler: anahtar + ızgara');
 // büyük yazı → 2 sütun
 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla Üreticileri'}));await p.waitForTimeout(1500);
 await p.evaluate(()=>{document.documentElement.style.fontSize='24px'});await p.waitForTimeout(300);
 g=await G();ok(g.cols===2&&!g.lap&&g.sw<=0,'büyük yazıda 2 sütun, taşma/üst üste binme yok: '+JSON.stringify(g));
 await p.evaluate(()=>{document.documentElement.style.fontSize=''});
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 // yenileme: Liste seç → sayfayı yenile → (sahte veri olmadan) liste sayfasında anahtar "Liste" seçili gelir
 await click(p,'#ozRoot .ozVw [data-v=list]',500);
 await p.reload();await p.waitForTimeout(1200);await enter(p);await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla Üreticileri'}));await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozVw [data-v=list]');return !!b&&b.getAttribute('aria-pressed')==='true'}),'yenilemede Liste seçimi korunmalı');
 await br.close();
 if(fails.length){console.error('ad1-izgara BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ad1-izgara: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ad1-izgara HATA:',e);process.exit(1)});
