// T3: ürün liste kartı renkleri — 390px, sahte veri. Çalıştırma: node tests/oz-ui/t3-renk.test.js
// Doğrulanan (Tüm ürünler, arama, favoriler): kart zemini beyaz değil, sayfa zemininden bir ton açık kahve; ince bronz kenar;
// fotoğraf alanı aynı (filtre/karartma yok, köşeler yuvarlak). Tüm kart durumlarında (çok seçenekli, tek fiyatlı + birim fiyat,
// indirimli, stoksuz, yorumlu/yorumsuz, kalp açık/kapalı, sepette adet rozeti) her yazı/zemin çiftinin kontrastı WCAG AA:
// normal metin ≥ 4.5:1, büyük metin (≥24px ya da ≥18.66px kalın) ≥ 3:1; ikonlar (kalp, "+") ≥ 3:1.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const F=window.__OZ_FX,T=F.T,R=F.R;localStorage.removeItem('isimi_oz_cart');
  T.oz_products=[{id:'p0',description:'Zeytinyağı açıklaması',net_content:'1000 gr'},{id:'p1',description:'Bal',net_content:'800 gr'},{id:'p2',description:'Süt',net_content:'1 L'},{id:'p3',description:'Kekik'}];
  T.oz_variants=[{product_id:'p0',label:'1kg',price_kurus:40000,stock:9,sort:0},{product_id:'p0',label:'3kg',price_kurus:110000,stock:9,sort:1},
   {product_id:'p1',label:'800gr',price_kurus:100000,stock:9,sort:0},{product_id:'p1',label:'500',price_kurus:60000,stock:9,sort:1},
   {product_id:'p2',label:'1 L',price_kurus:9000,compare_at_kurus:12000,stock:9,sort:0},{product_id:'p3',label:'250 g',price_kurus:5000,stock:0,sort:0}];
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,i===2?{rating_count:0,rating_avg:0}:{},i===3?{in_stock:false}:{}));
  R.oz_my_favorites=R.oz_search_products.slice(0,4).map(x=>({...x}));R.oz_my_favorites.forEach((x,i)=>{if(i===2){x.rating_count=0}});
  const d=R.oz_product_detail;d.id='p2';d.variants=[{id:'v2',label:'1 L',price_kurus:9000,compare_at_kurus:12000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 const measure=()=>p.evaluate(()=>{
  const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const mix=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  /* öğenin altındaki gerçek zemin: kendisinden yukarı ilk opak/yarı opak arka plan (kart içinde) */
  const bgOf=e=>{let n=e;const stack=[];while(n&&n!==document.documentElement){const cs=getComputedStyle(n);const bc=rgb(cs.backgroundColor);if(bc.a>0&&cs.backgroundImage==='none')stack.push(bc);if(bc.a>=1&&cs.backgroundImage==='none')break;n=n.parentElement}
   let c={r:43,g:33,b:24,a:1};for(let i=stack.length-1;i>=0;i--)c=mix(stack[i],c);return c};
  const page=rgb(getComputedStyle(document.querySelector('.app')).backgroundColor);
  const cards=[...document.querySelectorAll('#ozRoot .ozGc')];
  return {page,cards:cards.map(c=>{const cs=getComputedStyle(c);const bg=rgb(cs.backgroundColor);const out=[];
   const T=(sel,kind)=>c.querySelectorAll(sel).forEach(e=>{if(!e.offsetWidth||!e.textContent.trim())return;const s=getComputedStyle(e);const fs=parseFloat(s.fontSize),fw=parseInt(s.fontWeight)||400;
    const big=fs>=24||(fs>=18.66&&fw>=700);const fg=mix(rgb(s.color),bgOf(e));out.push({sel,kind,txt:e.textContent.trim().slice(0,24),ratio:+cr(fg,bgOf(e)).toFixed(2),need:kind==='icon'?3:big?3:4.5})});
   T('.nm');T('.ds');T('.pr b');T('.pr s');T('.pr small');T('.tr .rt');T('.tr .rt small');T('.ozPlus .bd');T('.ozPStep b');T('.ft .opt:not(:disabled)');T('.ozPlus:not(:disabled)','icon');
   c.querySelectorAll('.tr .ozFav').forEach(e=>{const s=getComputedStyle(e);out.push({sel:'.ozFav'+(e.classList.contains('on')?'.on':''),kind:'icon',ratio:+cr(mix(rgb(s.color),bgOf(e)),bgOf(e)).toFixed(2),need:3})});
   const img=c.querySelector('.im img');const im=c.querySelector('.im');const is=img?getComputedStyle(img):null;
   return {id:c.dataset.pid,bg,border:rgb(cs.borderTopColor),bw:parseFloat(cs.borderTopWidth),rad:parseFloat(cs.borderTopLeftRadius),pairs:out,
    state:{multi:/seçene/.test((c.querySelector('.ft')||{}).textContent||''),strike:!!c.querySelector('.pr s'),unit:!!c.querySelector('.pr small.u:not(.ov)'),so:!!c.querySelector('.so'),dis:!!c.querySelector('.ozPlus:disabled'),rt:!!c.querySelector('.tr .rt'),favOn:!!c.querySelector('.ozFav.on'),favOff:!!c.querySelector('.ozFav:not(.on)'),bd:!!c.querySelector('.ozPlus .bd, .ozPStep b')},
    photo:is?{filter:is.filter,op:is.opacity,imRad:parseFloat(getComputedStyle(im).borderTopLeftRadius),imFilter:getComputedStyle(im).filter,imOp:getComputedStyle(im).opacity}:null}})}});
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
 const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 async function check(where){
  const m=await measure();ok(m.cards.length>=4,'['+where+'] kart sayısı');
  m.cards.forEach(c=>{const t='['+where+' '+c.id+'] ';
   ok(L(c.bg)<0.1&&L(c.bg)>L(m.page)&&CR(c.bg,m.page)<1.6,t+'kart zemini sayfadan bir ton açık kahve olmalı (beyaz değil): '+JSON.stringify(c.bg)+' sayfa '+JSON.stringify(m.page));
   ok(c.bw>=0.5&&c.bw<=2&&c.border.r>c.border.b+30&&L(c.border)>L(c.bg),t+'ince bronz/altın kenar: '+JSON.stringify([c.bw,c.border]));
   ok(c.rad>=12,t+'köşe yuvarlaklığı korunmalı: '+c.rad);
   if(c.photo)ok(c.photo.filter==='none'&&c.photo.imFilter==='none'&&+c.photo.op===1&&+c.photo.imOp===1&&c.photo.imRad>=8,t+'fotoğraf aynı (filtre/karartma yok, köşeler yuvarlak): '+JSON.stringify(c.photo));
   c.pairs.forEach(x=>ok(x.ratio>=x.need,t+'kontrast '+x.sel+' "'+(x.txt||'')+'": '+x.ratio+' < '+x.need));
  });
  return m;
 }
 // Tüm ürünler: sepete tek seçenekli ürün ekle (adet rozeti / sayaç durumu)
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 try{await p.click('.ozGc[data-pid=p2] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('p2 sepete eklenemedi')}await p.waitForTimeout(800);
 const m=await check('Tüm ürünler');
 const S=k=>m.cards.some(c=>c.state[k]);
 ok(S('multi')&&S('strike')&&S('unit')&&S('so')&&S('dis')&&S('rt')&&m.cards.some(c=>!c.state.rt)&&S('favOn')&&S('favOff')&&S('bd'),'tüm kart durumları denenmeli: '+JSON.stringify(m.cards.map(c=>[c.id,c.state])));
 await p.evaluate(()=>OZ.go('search',{q:'a'}));await p.waitForTimeout(1500);await check('Arama');
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);await check('Favoriler');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390px taşma olmamalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('t3-renk BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('t3-renk: tüm kontroller geçti (3 ekran)');process.exit(0);
})().catch(e=>{console.error('t3-renk HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
