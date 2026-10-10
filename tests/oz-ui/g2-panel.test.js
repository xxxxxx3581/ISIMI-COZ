// G2-2: ürün paneli — 390px, sahte veri. Çalıştırma: node tests/oz-ui/g2-panel.test.js
// Doğrulanan: her zaman görünür fotoğraf, ad, fiyat, üretici satırı ("Onaylı üretici" + "Üreticiyi gör ›"), açıklama;
// "Ürün bilgileri" kapalı başlar, açınca menşe/içindekiler/raf ömrü/saklama + satıcı beyanı; bilgi yoksa başlık yok.
// Alt çubuk: solda fiyat, sağda "Sepete ekle" → aynı yerde "− 1 +" (stokta + pasif, 1'de − çıkarır); çubuk kaydırınca
// görünür kalır ve en altta içeriği örtmez; "Üreticiyi gör" paneli kapatıp üretici sayfasını açar.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,i)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(i||400);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>localStorage.removeItem('isimi_oz_cart'));
 await enter(p);await p.waitForTimeout(700);
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p1';d.variants=[{id:'v1',label:'500 ml',price_kurus:65000,compare_at_kurus:80000,stock:2,weight_g:600},{id:'v2',label:'1 L',price_kurus:125000,stock:3}]});
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1200);
 await click(p,'.ozGc[data-pid=p1] .sc',1200);
 const S='.ozOv.ozPdS';
 const base=await p.evaluate(S=>{const o=document.querySelector(S);if(!o)return null;const q=s=>o.querySelector(s);const inf=q('.ozPdInf');
  return {gal:!!q('#ozGal'),name:(q('.ozPName')||{}).textContent,price:!!q('.ozPrice b'),prod:q('.ozPdPr')?q('.ozPdPr').innerText.replace(/\s+/g,' '):'',desc:!!q('.ozDesc'),
   inf:!!inf,infOpen:inf?inf.open:null,infTitle:inf?inf.querySelector('summary').innerText.trim():'',bar:q('.ozPdBar')?q('.ozPdBar').innerText.replace(/\s+/g,' '):''}},S);
 ok(base,'ürün paneli açılmalı');
 if(base){
  ok(base.gal&&base.name&&base.price&&base.desc,'foto, ad, fiyat, açıklama görünür olmalı: '+JSON.stringify(base));
  ok(/Onaylı üretici/.test(base.prod)&&/Üreticiyi gör ›/.test(base.prod),'üretici satırı olmalı: '+base.prod);
  ok(base.inf&&base.infOpen===false&&/Ürün bilgileri/.test(base.infTitle),'"Ürün bilgileri" kapalı başlamalı');
  ok(/650,00/.test(base.bar)&&/Sepete ekle/.test(base.bar),'alt çubuk: fiyat + Sepete ekle: '+base.bar);
  await click(p,S+' .ozPdInf summary',300);
  const inf=await p.evaluate(S=>{const d=document.querySelector(S+' .ozPdInf');return d&&d.open?d.innerText.replace(/\s+/g,' '):null},S);
  ok(inf&&/Menşe/.test(inf)&&/İçindekiler/.test(inf)&&/Raf ömrü/.test(inf)&&/Saklama/.test(inf)&&/Satıcı beyanı – platform tarafından doğrulanmadı/.test(inf),'bilgiler + beyan notu açılmalı: '+inf);
  // çubuk: üstte ve en altta görünür; en altta içerik çubuğun üstünde biter
  const geo=async()=>p.evaluate(S=>{const o=document.querySelector(S);if(!o||!o.querySelector('.ozPdBar'))return {missing:true};const b=o.querySelector('.ozPdBar').getBoundingClientRect(),sh=o.querySelector('.ozSh').getBoundingClientRect();
   const els=[...o.querySelectorAll('.ozShB > *')].filter(e=>!e.classList.contains('ozPdBar'));const last=els[els.length-1].getBoundingClientRect();
   return {barTop:Math.round(b.top),barBot:Math.round(b.bottom),shBot:Math.round(sh.bottom),vh:innerHeight,lastBot:Math.round(last.bottom)}},S);
  const g1=await geo();ok(g1.barBot<=g1.vh&&g1.barBot<=g1.shBot+1,'çubuk panelin altında görünür olmalı: '+JSON.stringify(g1));
  await p.evaluate(S=>{const b=document.querySelector(S+' .ozShB');b.scrollTop=1e5},S);await p.waitForTimeout(200);
  const g2=await geo();ok(g2.barBot<=g2.vh&&g2.lastBot<=g2.barTop+1,'en altta çubuk içeriği örtmemeli: '+JSON.stringify(g2));
  // sepete ekle → sayaç
  const bar=()=>p.evaluate(S=>{const b=document.querySelector(S+' .ozPdBar');if(!b)return {open:!!document.querySelector(S),missing:true};const s=b.querySelector('.ozPStep');const sp=document.getElementById('ozCStrip');
   return {step:s?s.querySelector('b').textContent:null,plusDis:s?s.querySelectorAll('button')[1].disabled:null,add:!!b.querySelector('[data-a=addCart]'),cart:JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0),open:!!document.querySelector(S)}},S);
  await click(p,S+' .ozPdBar [data-a=addCart]');let b=await bar();
  ok(b.open&&b.step==='1'&&!b.add&&b.cart===1,'eklenince panel açık kalmalı ve çubukta "− 1 +" olmalı: '+JSON.stringify(b));
  await click(p,S+' .ozPdBar .ozPStep button:last-child');b=await bar();ok(b.step==='2'&&b.plusDis===true&&b.cart===2,'stok 2\'de "+" pasif: '+JSON.stringify(b));
  await click(p,S+' .ozPdBar .ozPStep button:first-child');await click(p,S+' .ozPdBar .ozPStep button:first-child');b=await bar();
  ok(b.add&&!b.step&&b.cart===0,'1\'de "−" çıkarmalı, "Sepete ekle" dönmeli: '+JSON.stringify(b));
  await p.evaluate(()=>{window.__OZ_FX.R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',product_count:6,categories:[{slug:'zeytinyagi',name:'Zeytinyağı',count:6}]}});
  await click(p,S+' .ozPdPr [data-a=pdSeller]',1200);
  ok(await p.evaluate(()=>!document.querySelector('.ozOv.ozPdS')&&!!document.querySelector('#ozRoot .ozPP')),'"Üreticiyi gör" üretici sayfasını açmalı');
 }
 // bilgi yoksa başlık gizli
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;['origin_city','origin_note','ingredients','shelf_life_days','storage_info','net_content','organic_cert'].forEach(k=>d[k]=null);d.allergens=[]});
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1200);
 await click(p,'.ozGc[data-pid=p1] .sc',1200);
 ok(await p.evaluate(S=>!!document.querySelector(S)&&!document.querySelector(S+' .ozPdInf'),S),'bilgi yoksa "Ürün bilgileri" gizli olmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('g2-panel BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('g2-panel: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('g2-panel HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
