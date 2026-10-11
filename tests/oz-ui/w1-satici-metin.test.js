// W1: "Üretici" → "Satıcı" (görünen metinler) — 390px, sahte veri. Çalıştırma: node tests/oz-ui/w1-satici-metin.test.js
// Doğrulanan: Keşfet, Satıcılar sekmesi, satıcı sayfası, ürün paneli, Favoriler ve alt menüde görünen metinlerde ve
// aria-label'larda "üretici" geçmez (izinli istisna: hero pazarlama sloganı "Üreticiden doğrudan kapına."; sahte verideki
// satıcı adı "Yayla Üreticileri" veri olduğu için çıkarılır). Yeni metinler: alt menü "Satıcılar", Keşfet "Satıcılar",
// "Onaylı satıcı" (hero çipi, satıcı sayfası, panel), "Satıcıyı gör ›", "Favori satıcılar", "Henüz favori satıcın yok.".
const {chromium,open,enter}=require('./harness.js');
const ALLOW=['Üreticiden doğrudan kapına.','Yayla Üreticileri'];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',product_count:2,categories:[{slug:'bal',name:'Bal',count:1}]};
  R.oz_my_favorites=R.oz_search_products.slice(0,1);R.oz_my_favorite_sellers=[]});
 await enter(p);await p.waitForTimeout(800);
 const T=()=>p.evaluate(()=>{const els=['ozRoot','ozNav','ozTop'].map(i=>document.getElementById(i)).filter(Boolean).concat([...document.querySelectorAll('.ozOv')]);
  const txt=els.map(e=>e.innerText).join('\n');const aria=els.flatMap(e=>[...e.querySelectorAll('[aria-label]')].map(x=>x.getAttribute('aria-label'))).join('\n');return {txt,aria}});
 const bad=(t,allow)=>{let x=t;(allow||ALLOW).forEach(a=>{x=x.split(a).join('')});return (x.match(/[^\n]{0,30}[Üü]retici[^\n]{0,30}/g)||[])};
 const check=async where=>{const t=await T();const b=bad(t.txt+'\n'+t.aria);ok(!b.length,'['+where+'] görünen metinde "üretici" kalmamalı: '+JSON.stringify(b));return t};
 // Keşfet + alt menü
 let t=await check('Keşfet');
 ok(/Satıcılar/.test(await p.evaluate(()=>(document.querySelector('#ozNav [data-k=producers]')||{innerText:''}).innerText)),'alt menü "Satıcılar"');
 ok(await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozSecH h2')].some(h=>h.textContent==='Satıcılar')),'Keşfet bölüm başlığı "Satıcılar"');
 ok(await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozHero .tc span, #ozRoot .tc span')].some(x=>x.textContent==='✓ Onaylı satıcı')),'hero çipi "Onaylı satıcı"');
 // Satıcılar sekmesi
 await p.evaluate(()=>OZ.go('producers',{}));await p.waitForTimeout(1300);t=await check('Satıcılar');
 ok(await p.evaluate(()=>(document.querySelector('#ozRoot h1')||{}).textContent==='Satıcılar'),'Satıcılar sayfa başlığı');
 // satıcı sayfası
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1500);t=await check('Satıcı sayfası');
 ok(/✓ Onaylı satıcı/.test(t.txt),'satıcı sayfası rozeti "Onaylı satıcı"');
 // ürün paneli
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 try{await p.click('.ozGc[data-pid=p0] .sc',{timeout:3000})}catch(e){fails.push('panel açılamadı')}await p.waitForTimeout(1300);
 t=await check('Ürün paneli');ok(/Onaylı satıcı/.test(t.txt)&&/Satıcıyı gör ›/.test(t.txt),'panel: "Onaylı satıcı" + "Satıcıyı gör ›"');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // Favoriler (boş satıcı listesi)
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);t=await check('Favoriler');
 ok(/Favori satıcılar/.test(t.txt)&&/Henüz favori satıcın yok\./.test(t.txt),'Favoriler: "Favori satıcılar" + boş metin');
 // Favoriler (dolu): kalp aria-label
 await p.evaluate(()=>{window.__OZ_FX.R.oz_my_favorite_sellers=[{id:'s1',display_name:'Ege Kooperatifi',city:'Muğla',rating_avg:4,rating_count:2}];OZ.go('home',{})});await p.waitForTimeout(800);
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);t=await check('Favoriler dolu');
 ok(/Satıcıyı favorilerden çıkar/.test(t.aria)&&/satıcı sayfası/.test(t.aria),'favori satıcı kartı aria metinleri: '+t.aria.split('\n').filter(x=>/at[ıi]c/.test(x)).join(' | '));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('w1-satici-metin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('w1-satici-metin: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('w1-satici-metin HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
