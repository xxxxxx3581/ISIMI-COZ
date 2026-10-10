// O1: seçenekli üründe karttaki "+" — 390px, sahte veri. Çalıştırma: node tests/oz-ui/o1-secenek.test.js
// Doğrulanan (Tüm ürünler, arama, favoriler, Keşfet): "+" tam ürün panelini AÇMAZ; yarım ekrandan kısa küçük pencere açar
// (ad + küçük foto, seçenek satırları: etiket, fiyat, çizili eski fiyat, ≈ birim fiyat). Başta seçim yok: "Seçenek seç" +
// pasif düğme; seçince fiyat + aktif "Sepete ekle"; eklenince pencere kapanır, kartta adet rozeti, sayfa değişmez.
// Seçeneksiz üründe "+" doğrudan ekler; karta/fotoğrafa dokunma tam paneli açar.
const {chromium,open,enter}=require('./harness.js');
const MULTI=[{id:'r8',label:'800gr',price_kurus:50000,compare_at_kurus:70000,stock:20},{id:'r5',label:'500gr',price_kurus:30000,compare_at_kurus:50000,stock:20},{id:'r3',label:'300gr',price_kurus:20000,compare_at_kurus:null,stock:20}];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||500);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{orderStatus:'delivered'}});
 const setD=(id,vs)=>p.evaluate(([id,vs])=>{const d=window.__OZ_FX.R.oz_product_detail;d.id=id;d.name='Reçel';d.images=['https://img.test/recel.jpg'];d.net_content='800';d.variants=vs},[id,vs]);
 await p.evaluate(()=>{localStorage.removeItem('isimi_oz_cart');window.__OZ_FX.R.oz_my_favorites=window.__OZ_FX.R.oz_search_products.slice(0,3)});
 await setD('p0',MULTI);
 await enter(p);await p.waitForTimeout(1200);
 const state=()=>p.evaluate(()=>{const ov=document.querySelector('.ozOv');const pk=document.querySelector('.ozOv.ozPkS');let r={full:!!document.querySelector('.ozOv.ozPdS'),pk:!!pk,view:(window.OZ&&OZ.cur?OZ.cur().k:'')};
  if(pk){const sh=pk.querySelector('.ozSh').getBoundingClientRect();const b=pk.querySelector('[data-a=pkAdd]');
   r.hRatio=+(sh.height/innerHeight).toFixed(2);r.head=!!pk.querySelector('.ozPkHd .ozPic')&&pk.querySelector('.ozPkHd b').textContent;r.rows=[...pk.querySelectorAll('.ozPkO')].map(x=>x.innerText.replace(/\s+/g,' ').trim());
   r.on=pk.querySelectorAll('.ozPkO.on').length;r.bar=pk.querySelector('.ozPkBar .pp').innerText.replace(/\s+/g,' ').trim();r.dis=b?b.disabled:null}
  r.cart=JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').map(x=>x.variant_id+':'+x.qty).join(',');return r});
 async function flow(where,cardSel){
  if(!await click(p,cardSel+' .ac .ozPlus',900))return;
  const y0=await p.evaluate(()=>scrollY);  /* tıklama öncesi otomatik kaydırma sayılmaz; pencere açıkken konum */
  let s=await state();
  ok(s.pk&&!s.full,'['+where+'] "+" küçük pencere açmalı, tam panel değil: '+JSON.stringify(s));
  if(!s.pk)return;
  ok(s.hRatio<0.5,'['+where+'] pencere yarım ekrandan kısa olmalı: '+s.hRatio);
  ok(s.head==='Reçel'&&s.rows.length===3,'['+where+'] ad + küçük foto ve 3 seçenek: '+JSON.stringify({head:s.head,n:s.rows.length}));
  ok(/^800gr 500,00 ₺ 700,00 ₺ ≈ 625,00 ₺\/kg$/.test(s.rows[0])&&/^300gr 200,00 ₺ ≈ 666,67 ₺\/kg$/.test(s.rows[2]),'['+where+'] satır: etiket, fiyat, çizili eski fiyat, birim fiyat: '+JSON.stringify(s.rows));
  ok(s.on===0&&s.bar==='Seçenek seç'&&s.dis===true,'['+where+'] başta seçim yok, "Seçenek seç" + pasif: '+JSON.stringify({on:s.on,bar:s.bar,dis:s.dis}));
  await click(p,'.ozOv.ozPkS .ozPkO:nth-child(2)',300);s=await state();
  ok(s.on===1&&s.bar==='300,00 ₺'&&s.dis===false,'['+where+'] seçince fiyat + aktif düğme: '+JSON.stringify({on:s.on,bar:s.bar,dis:s.dis}));
  const before=s.cart;
  await click(p,'.ozOv.ozPkS [data-a=pkAdd]',700);s=await state();
  ok(!s.pk&&!s.full,'['+where+'] eklenince pencere kapanmalı');
  ok(s.cart.indexOf('r5:')>=0&&s.cart!==before,'['+where+'] sepete seçilen seçenek (r5) eklenmeli: '+s.cart);
  const badge=await p.evaluate(sel=>{const b=document.querySelector(sel+' .ac .ozPlus .bd');return b?b.textContent:null},cardSel);
  ok(!!badge,'['+where+'] kartta adet rozeti olmalı');
  ok(Math.abs((await p.evaluate(()=>scrollY))-y0)<2,'['+where+'] sayfa kaymamalı / değişmemeli');
 }
 // Keşfet (Tekrar sipariş ver kartı p0)
 await flow('Keşfet','#ozReo .ozKr[data-pid=p0]');
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozHero')),'[Keşfet] eklemeden sonra Keşfet\'te kalınmalı');
 // Tüm ürünler
 await setD('p1',MULTI);await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 await flow('Tüm ürünler','.ozGc[data-pid=p1]');
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPlH')),'[Tüm ürünler] listede kalınmalı');
 // arama
 await setD('p2',MULTI);await p.evaluate(()=>OZ.go('search',{q:'re'}));await p.waitForTimeout(1300);
 await flow('Arama','.ozGc[data-pid=p2]');
 // favoriler
 await setD('p1',MULTI);await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1300);
 ok(!!(await p.$('#ozRoot .ozGc[data-pid=p1] .ac .ozPlus')),'[Favoriler] kartta "+" olmalı');
 await flow('Favoriler','#ozRoot .ozGc[data-pid=p1]');
 // seçeneksiz: doğrudan ekler; karta dokunma tam paneli açar
 await setD('p0',[{id:'s1v',label:'1 L',price_kurus:65000,compare_at_kurus:null,stock:9}]);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 await click(p,'.ozGc[data-pid=p0] .ac .ozPlus',900);let s=await state();
 ok(!s.pk&&!s.full&&s.cart.indexOf('s1v:1')>=0,'seçeneksiz üründe "+" doğrudan eklemeli: '+JSON.stringify(s));
 await click(p,'.ozGc[data-pid=p1] .sc',1200);s=await state();
 ok(s.full&&!s.pk,'karta/fotoğrafa dokunma tam paneli açmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('o1-secenek BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('o1-secenek: tüm kontroller geçti (4 liste)');process.exit(0);
})().catch(e=>{console.error('o1-secenek HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
