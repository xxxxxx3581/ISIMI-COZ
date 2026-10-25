// Paket 43: Yemek Keşfet ilk ekranı — öne çıkan slayt 2 sn otomatik geçiş, "Menüyü gör" yok, sıkı ilk ekran (yalnız arayüz) — 360/390px, krem ve koyu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p43-kesfet-ilk-ekran.test.js
// Doğrulanan: (1) slayt 2 sn'de geçer; dokunurken durur, parmak kalktıktan ~4 sn sonra devam eder; sekme gizliyken geçmez; ekran değişince zamanlayıcı
// temizlenir; azaltılmış hareket tercihinde de döner ama animasyonsuz (behavior:auto). (2) slaytlarda "Menüyü gör"/cta düğmesi yok, slayt tıklanır.
// (3) "Tüm restoranlar" başlığı ve ilk restoran kartının ≥%60'ı alt indirim şeridi ve alt menünün üstünde; adres/arama ≤48px, slayt ≤96px,
// mutfak dairesi ≤48px, çip ≤34px ama dokunma alanı ≥44px (görünmez dolgu), alt indirim şeridi ≤56px; metin kontrastı ≥4.5; yatay taşma yok.
const {chromium,open,overflow}=require('./harness.js');
const SETUP=th=>{document.documentElement.setAttribute('data-theme',th);
 try{localStorage.setItem('isimi-theme',th);sessionStorage.setItem('isimi_food_flash_seen','["fg1"]')}catch(e){}
 window.PF.enabled=true;window.PF.settings=Object.assign({},window.PF.settings||{},{coupons_enabled:true});
 const end=new Date(Date.now()+339*864e5).toISOString();
 const V=(id,n,c,img)=>({id,name:n,district:'Bornova',cuisine_type:c,is_open:true,is_active:true,working_hours:null,min_order_amount:0,delivery_fee_kurus:0,prep_time_min:20,delivery_eta_min:30,delivery_mode:'platform_delivery',image_url:null,cover_url:img,rating_avg:4.6,rating_count:40,lat:38.4,lng:27.1,created_at:'2026-01-01'});
 window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));
  if(pth.startsWith('food_venues?'))return [V('v1','Fero kebap','kebap','images/home/y-doner.jpg'),V('v2','Burger Evi','burger','images/home/y-burger.jpg')];
  if(pth==='rpc/pf_public_settings')return {coupons_enabled:true};
  if(pth==='rpc/food_public_coupons')return [{code:'FL1',kind:'fixed',value:7000,min_subtotal_kurus:30000,flash_group:'fg1',title:'Flash',ends_at:end,venue_id:null},{code:'FL2',kind:'fixed',value:20000,min_subtotal_kurus:80000,flash_group:'fg1',title:'Flash',ends_at:end,venue_id:null}];
  return []}};
const CR=sel=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let z=[255,255,255];ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);const a=b.length>3?b[3]:1;if(a>0)z=[0,1,2].map(i=>b[i]*a+z[i]*(1-a))});return z};
 const bad=[];document.querySelectorAll(sel).forEach(e=>{if(!e.getBoundingClientRect().height||!e.textContent.trim())return;const z=eff(e),t=P(getComputedStyle(e).color),x=L(t),y=L(z),v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)bad.push(e.textContent.trim().slice(0,16)+':'+v.toFixed(2))});return bad};
const idxOf=p=>p.evaluate(()=>{const t=document.getElementById('fdwHeroTr');return t?Math.round(t.scrollLeft/(t.clientWidth||1)):-1});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 /* ---------- (3) yerleşim: 2 tema x 2 genişlik ---------- */
 for(const th of ['dark','light'])for(const w of [390,360]){const T='['+(th==='light'?'krem':'koyu')+' '+w+']';
  const {ctx,p,st}=await open(br,{w,h:844,visible:true});
  await p.evaluate(SETUP,th);await p.evaluate(()=>showFoodHome());await p.waitForTimeout(1600);
  const r=await p.evaluate(()=>{const R=document.getElementById('fdRoot');const H=e=>e?Math.round(e.getBoundingClientRect().height):null;
   const head=[...R.querySelectorAll('#fdList .fdSecT h2')].find(x=>/Tüm restoranlar/.test(x.textContent));const card=document.querySelector('#fdList .fdGrid > *');
   const fl=document.querySelector('#fdwFlash .fdwFlash.min'),nav=document.querySelector('.fdwNav');const lim=Math.min(fl?fl.getBoundingClientRect().top:1e9,nav?nav.getBoundingClientRect().top:1e9);
   const cb=card&&card.getBoundingClientRect();
   /* dokunma alanı: düğmenin ortasından dikey taramayla isabet eden aralık (görünmez dolgu dahil) ≥44px */
   const hit=b=>{const q=b.getBoundingClientRect(),x=q.left+q.width/2;let n=0;for(let y=Math.floor(q.top)-14;y<=q.bottom+14;y++){const e=document.elementFromPoint(x,y);if(e&&(e===b||b.contains(e)))n++}return n>=44};
   const chip=document.querySelector('#fdwChips .fdwChip'),x=document.querySelector('#fdwFlash .fdwFlash.min .x');
   return {headTop:head?Math.round(head.getBoundingClientRect().top):null,headOk:!!head&&head.getBoundingClientRect().bottom<=lim,vis:cb?+((Math.min(cb.bottom,lim)-cb.top)/cb.height).toFixed(2):0,
    addr:H(document.getElementById('fdAddrBar')),search:H(document.querySelector('.fdSearchBtn')),hero:H(document.querySelector('#fdwHero .fdwHero')),
    cuis:H(document.querySelector('#fdCuis button span')),cuisBtn:[...R.querySelectorAll('#fdCuis button')].every(b=>b.getBoundingClientRect().height>=44&&b.getBoundingClientRect().width>=44),
    chip:H(chip),chipHit:!!chip&&hit(chip),flash:H(fl),xHit:!!x&&(()=>{const q=x.getBoundingClientRect(),cx=q.left+q.width/2,cy=q.top+q.height/2;return [[cx,q.top-3],[cx,q.bottom+3],[q.left-3,cy],[q.right+3,cy]].every(([a,b])=>{const e=document.elementFromPoint(a,b);return e&&(e===x||x.contains(e))})})(),
    cta:document.querySelectorAll('#fdwHero .fdwSl .ov i').length,menu:/Menüyü gör/.test(document.getElementById('fdwHero').textContent),sl:[...document.querySelectorAll('#fdwHero .fdwSl')].every(b=>b.tagName==='BUTTON'&&!!b.getAttribute('onclick')),
    pad:(()=>{const s=document.querySelector('#fdwHero .fdwSl .ov');return s?parseFloat(getComputedStyle(s).paddingRight):null})()}});
  ok(r.headOk&&r.vis>=0.6,T+' "Tüm restoranlar" + ilk kartın ≥%60\'ı şerit/menü üstünde: '+JSON.stringify({h:r.headTop,vis:r.vis}));
  ok(r.addr<=48&&r.search<=48&&r.hero<=96&&r.cuis<=48&&r.chip<=34&&r.flash<=56,T+' sıkı boyutlar (adres/arama ≤48, slayt ≤96, daire ≤48, çip ≤34, şerit ≤56): '+JSON.stringify(r));
  ok(r.cuisBtn&&r.chipHit&&r.xHit,T+' dokunma alanları ≥44px (mutfak, çip ve X görünmez dolguyla): '+JSON.stringify([r.cuisBtn,r.chipHit,r.xHit]));
  ok(!r.cta&&!r.menu&&r.sl&&r.pad<=20,T+' slaytta "Menüyü gör"/cta yok, sağda boşluk yok, slayt tıklanır: '+JSON.stringify([r.cta,r.menu,r.sl,r.pad]));
  const bad=await p.evaluate(CR,'#fdAddrBar b,#fdAddrBar small,.fdSearchBtn .f,#fdCuis em,#fdwChips .fdwChip,#fdList .fdSecT h2,#fdwFlash .fdwFlash.min .tx b,#fdwFlash .fdwFlash.min .tx small');
  ok(!bad.length,T+' metin kontrastı ≥4.5: '+bad.join(', '));
  ok((await overflow(p))<=0,T+' yatay taşma');
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));await ctx.close();
 }
 /* ---------- (1) otomatik geçiş ---------- */
 {const {ctx,p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(()=>{window.__iv=[];window.__clr=[];const si=window.setInterval,ci=window.clearInterval;
   window.setInterval=function(f,ms){const id=si.apply(this,arguments);if(ms===2000)window.__iv.push(id);return id};window.clearInterval=function(id){window.__clr.push(id);return ci.apply(this,arguments)}});
  await p.evaluate(SETUP,'dark');await p.evaluate(()=>showFoodHome());await p.waitForTimeout(1300);
  const i0=await idxOf(p);await p.waitForTimeout(2600);const i1=await idxOf(p);
  ok(i0===0&&i1===1,'2 sn içinde sonraki slayta geçer: '+JSON.stringify([i0,i1]));
  // dokunma: basılıyken durur
  await p.evaluate(()=>document.getElementById('fdwHeroTr').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
  const h0=await idxOf(p);await p.waitForTimeout(4500);const h1=await idxOf(p);
  ok(h0===h1,'parmak basılıyken geçmez: '+JSON.stringify([h0,h1]));
  await p.evaluate(()=>document.getElementById('fdwHeroTr').dispatchEvent(new PointerEvent('pointerup',{bubbles:true})));
  await p.waitForTimeout(2500);const u1=await idxOf(p);await p.waitForTimeout(4200);const u2=await idxOf(p);
  ok(u1===h1&&u2!==h1,'parmak kalkınca ~4 sn bekler, sonra devam eder (kalıcı durmaz): '+JSON.stringify([h1,u1,u2]));
  // sekme gizli
  await p.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  const g0=await idxOf(p);await p.waitForTimeout(4500);const g1=await idxOf(p);
  ok(g0===g1,'sekme gizliyken geçmez: '+JSON.stringify([g0,g1]));
  await p.evaluate(()=>{delete document.hidden});
  // ekran değişince zamanlayıcı temizlenir
  await p.evaluate(()=>showFoodAccount());await p.waitForTimeout(500);
  const c=await p.evaluate(()=>({iv:window.__iv,cl:window.__iv.every(id=>window.__clr.includes(id))}));
  ok(c.iv.length===1&&c.cl,'ekran değişince 2 sn zamanlayıcısı temizlenir: '+JSON.stringify(c));
  ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));await ctx.close();}
 /* ---------- azaltılmış hareket: yine döner, animasyonsuz ---------- */
 {const {ctx,p,st}=await open(br,{w:390,h:844,visible:true});await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(()=>{window.__beh=[];const o=Element.prototype.scrollTo;Element.prototype.scrollTo=function(a){if(this.id==='fdwHeroTr')window.__beh.push(a&&a.behavior);return o.apply(this,arguments)}});
  await p.evaluate(SETUP,'light');await p.evaluate(()=>showFoodHome());await p.waitForTimeout(1300);
  const i0=await idxOf(p);await p.waitForTimeout(2600);const i1=await idxOf(p);const b=await p.evaluate(()=>window.__beh);
  ok(i0===0&&i1===1&&b.length>=1&&b.every(x=>x==='auto'),'azaltılmış hareket: yine döner, behavior:auto: '+JSON.stringify([i0,i1,b]));
  ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));await ctx.close();}
 await br.close();
 if(fails.length){console.error('p43-kesfet-ilk-ekran BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p43-kesfet-ilk-ekran: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p43-kesfet-ilk-ekran HATA:',e);process.exit(1)});
