// U1: ürün liste kartında dolu kalp kırmızı, boş kalp krem — 390px, sahte veri. Çalıştırma: node tests/oz-ui/u1-kalp.test.js
// Doğrulanan (Tüm ürünler, arama, favoriler): favorideki üründe kalp dolu ve kırmızı; favoride olmayanda krem çizgi (aynı);
// kalp/kart zemini kontrastı ≥ 3:1 (ikon, AA); kalbe dokununca boş→dolu kırmızı olur, kart/panel açılmaz.
// Not: üretici sayfası kalbi eklenmedi — oz_favorites yalnız product_id tutuyor, oz_toggle_favorite yalnız p_product alıyor
// (üretici favorisi için veritabanı desteği yok). Bu test üretici sayfasında kalp OLMADIĞINI da doğrular.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_my_favorites=R.oz_search_products.slice(0,2).map(x=>({...x}));R.oz_toggle_favorite=true;
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:2,categories:[]}});
 await enter(p);await p.waitForTimeout(600);
 const H=()=>p.evaluate(()=>{const rgb=s=>s.match(/[\d.]+/g).map(Number);const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  return [...document.querySelectorAll('#ozRoot .ozGc')].map(c=>{const h=c.querySelector('.tr .ozFav');if(!h)return {id:c.dataset.pid,none:true};const col=rgb(getComputedStyle(h).color);const bg=rgb(getComputedStyle(c).backgroundColor);
   const svg=h.querySelector('svg');return {id:c.dataset.pid,on:h.classList.contains('on'),col,red:col[0]>=200&&col[0]-col[1]>=60&&col[0]-col[2]>=60,cream:col[0]>230&&col[1]>220&&col[2]>200,filled:!!svg&&getComputedStyle(svg).fill!=='none',ratio:+cr(col,bg).toFixed(2)}})});
 async function check(where){
  const l=await H();ok(l.length>=2&&l.every(x=>!x.none),'['+where+'] her kartta kalp');
  l.filter(x=>x.on).forEach(x=>ok(x.red&&x.filled&&x.ratio>=3,'['+where+' '+x.id+'] dolu kalp kırmızı ve ≥3:1: '+JSON.stringify(x)));
  l.filter(x=>!x.on).forEach(x=>ok(x.cream&&x.ratio>=3,'['+where+' '+x.id+'] boş kalp krem kalmalı: '+JSON.stringify(x)));
  ok(l.some(x=>x.on)&&(where==='Favoriler'||l.some(x=>!x.on)),'['+where+'] dolu ve boş durum birlikte denenmeli: '+JSON.stringify(l.map(x=>[x.id,x.on])));
 }
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);await check('Tüm ürünler');
 try{await p.click('.ozGc[data-pid=p3] .tr [data-a=fav]',{timeout:3000})}catch(e){fails.push('p3 kalbi tıklanamadı')}await p.waitForTimeout(800);
 const t=(await H()).find(x=>x.id==='p3');ok(t&&t.on&&t.red,'kalbe dokununca dolu kırmızı olmalı: '+JSON.stringify(t));
 ok(!(await p.$('.ozOv.ozPdS'))&&!st.calls.some(c=>c[0]==='oz_product_detail'),'kalp kartı/paneli açmamalı');
 await p.evaluate(()=>OZ.go('search',{q:'a'}));await p.waitForTimeout(1500);await check('Arama');
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);await check('Favoriler');
 // üretici sayfası: DB desteği yok → kalp yok
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1500);
 ok(!(await p.$('#ozRoot .ozPP .cv [data-a=fav], #ozRoot .ozPP .cv .ozFav')),'üretici sayfasında kalp olmamalı (DB desteği yok)');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('u1-kalp BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('u1-kalp: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('u1-kalp HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
