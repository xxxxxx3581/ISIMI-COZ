// AF1: ızgara kartı yerleşimi — "+" fotoğrafın DIŞINDA, kartın sağ üstündeki ince şeritte sade altın glif. 390px, sahte RPC.
// Çalıştırma: node tests/oz-ui/af1-izgara-serit.test.js
// Doğrulanan: "+" border-radius 0, border yok, zemin yok, glif ≤16px; "+" kartın sağ üstünde ve fotoğrafın üstünde (fotoğraf kutusunun
// dışında; fotoğraf üzerinde hiçbir düğme yok); dokunma alanı ≥44×36 ve kart içinde; "+" paneli açmaz, kart gövdesi "+" eklemez;
// seçenekli "+" seçenek penceresi, eklenince adet sayısı (≥16px) "+"nın solunda aynı şeritte; tek seçenekli üründe "− n +" aynı şeritte,
// her bölüm ≥32×36, şerit/kart yüksekliği ve foto konumu değişmez, 0'da "+" geri; stoksuzda foto sol altında "Tükendi", "+" soluk ve pasif;
// iç boşluk 8px, foto kare 10px köşe; "Son baktığın ürünler" rafında aynı kart; 390px 3 sütun, büyük yazıda 2 sütun; AA.
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;
  R.oz_search_products=[{id:'m1',name:'Cam şişe günlük süt',image:'https://img.test/icecekler.jpg',price_kurus:9000,seller_id:'s1',in_stock:true},
   {id:'z1',name:'Naturel sızma zeytinyağı',image:'https://img.test/zeytin-zeytinyagi.jpg',price_kurus:40000,seller_id:'s1',in_stock:true},
   {id:'b1',name:'Çam balı',image:'https://img.test/bal-recel.jpg',price_kurus:30000,seller_id:'s1',in_stock:false},
   {id:'k1',name:'Kekik',image:'https://img.test/baharat-bitki-cay.jpg',price_kurus:5000,seller_id:'s1',in_stock:true}];
  T.oz_products=[{id:'m1',description:'',net_content:'1 L'},{id:'z1',description:'',net_content:'1000 gr'},{id:'b1',description:'',net_content:'850 g'},{id:'k1',description:'',net_content:'50 g'}];
  T.oz_variants=[{product_id:'m1',label:'1 L',price_kurus:9000,stock:5,sort:0},{product_id:'z1',label:'1kg',price_kurus:40000,stock:5,sort:0},{product_id:'z1',label:'3kg',price_kurus:110000,stock:5,sort:1},{product_id:'z1',label:'5kg',price_kurus:180000,stock:5,sort:2},{product_id:'b1',label:'850 g',price_kurus:30000,stock:0,sort:0},{product_id:'k1',label:'50 g',price_kurus:5000,stock:5,sort:0}];
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:4,categories:[]};R.oz_producer_reviews=[];
  const D=R.oz_product_detail;const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_product_detail'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));
   if(x.p_id==='m1')return Object.assign({},D,{id:'m1',name:'Cam şişe günlük süt',seller:{id:'s1',display_name:'Yayla'},variants:[{id:'vm',label:'1 L',price_kurus:9000,stock:5}]});
   if(x.p_id==='z1')return Object.assign({},D,{id:'z1',name:'Naturel sızma zeytinyağı',seller:{id:'s1',display_name:'Yayla'},variants:[{id:'z1a',label:'1kg',price_kurus:40000,stock:5},{id:'z1b',label:'3kg',price_kurus:110000,stock:5},{id:'z1c',label:'5kg',price_kurus:180000,stock:5}]})}
   return o(fn,x)}});
 await enter(p);await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 const M=(root,id)=>p.evaluate(([root,id])=>{const c=document.querySelector(root+' .ozGr[data-pid="'+id+'"]');if(!c)return null;
  function lum(x){const m=x.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};const bg=getComputedStyle(c).backgroundColor;
  const R0=c.getBoundingClientRect(),ph=c.querySelector('.ph'),P=ph.getBoundingClientRect(),go=c.querySelector('.go');
  const pl=c.querySelector('.ac .ozPlus'),stp=c.querySelector('.ac .ozPStep');const ctl=pl||stp;const Q=ctl?ctl.getBoundingClientRect():null;
  const cs=pl?getComputedStyle(pl):null,g=pl?pl.querySelector('svg'):null,G=g?g.getBoundingClientRect():null,bd=pl?pl.querySelector('.bd'):null,B=bd?bd.getBoundingClientRect():null;
  const so=c.querySelector('.so'),S=so?so.getBoundingClientRect():null;
  const col=s=>{const e=c.querySelector(s);return e?getComputedStyle(e).color:bg};
  return {h:Math.round(R0.height),phTop:Math.round(P.top-R0.top),phW:Math.round(P.width),phH:Math.round(P.height),phRad:getComputedStyle(ph).borderTopLeftRadius,pad:getComputedStyle(go).paddingTop+'/'+getComputedStyle(go).paddingLeft,
   btnOnPhoto:[...ph.querySelectorAll('button,[data-a]')].length,
   ctl:Q?{w:Math.round(Q.width),h:Math.round(Q.height),right:Math.round(R0.right-Q.right),top:Math.round(Q.top-R0.top),below:Math.round(P.top-Q.bottom),inCard:Q.left>=R0.left-.5&&Q.right<=R0.right+.5}:null,
   plus:pl?{rad:cs.borderTopLeftRadius,bw:cs.borderTopWidth,bg:cs.backgroundColor,shadow:cs.boxShadow,gw:G?Math.round(G.width):99,gh:G?Math.round(G.height):99,dis:pl.disabled,op:+cs.opacity,label:pl.getAttribute('aria-label'),color:cs.color}:null,
   bd:B?{t:bd.textContent,w:Math.round(B.width),h:Math.round(B.height),leftOfGlyph:G?B.right<=G.left:false,aboveP:B.bottom<=P.top+.5}:null,
   step:stp?{n:stp.querySelector('b').textContent,bs:[...stp.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),l:b.getAttribute('aria-label'),below:Math.round(P.top-r.bottom)}})}:null,
   so:S?{t:so.textContent,l:Math.round(S.left-P.left),b:Math.round(P.bottom-S.bottom)}:null,op:(ph.querySelector('img')?+getComputedStyle(ph.querySelector('img')).opacity:1),
   aa:[cr(col('.pr b')!==bg?col('.pr b'):col('.pr .uf'),bg),cr(col('.nm'),bg),cr(col('.up'),bg),cr(col('.nt'),bg),pl?cr(getComputedStyle(pl).color,bg):99]}},[root,id]);
 const L='#ozRoot .ozGrs';
 let m=await M(L,'m1'),z=await M(L,'z1'),b=await M(L,'b1');
 ok(m&&z&&b,'kartlar');
 if(m){
  ok(m.plus&&m.plus.rad==='0px'&&m.plus.bw==='0px'&&/rgba\(0, 0, 0, 0\)|transparent/.test(m.plus.bg)&&m.plus.shadow==='none','"+" çerçevesiz, köşesiz, zeminsiz: '+JSON.stringify(m.plus));
  ok(m.plus&&m.plus.gw<=16&&m.plus.gh<=16&&m.plus.gw>=12,'glif 12-16px: '+JSON.stringify(m.plus&&[m.plus.gw,m.plus.gh]));
  ok(m.ctl&&m.ctl.right<=1&&m.ctl.top<=1&&m.ctl.below>=0&&m.ctl.inCard,'"+" kartın sağ üstünde, fotoğrafın DIŞINDA (üstünde): '+JSON.stringify(m.ctl));
  ok(m.ctl&&m.ctl.w>=44&&m.ctl.h>=36,'dokunma alanı ≥44×36: '+JSON.stringify(m.ctl));
  ok(m.btnOnPhoto===0,'fotoğraf üzerinde düğme yok');
  ok(m.pad==='8px/8px'&&m.phRad==='10px'&&Math.abs(m.phW-m.phH)<=1,'iç boşluk 8px, kare foto 10px köşe: '+JSON.stringify([m.pad,m.phRad,m.phW,m.phH]));
  ok(m.plus&&m.plus.label==='Sepete ekle'&&z.plus&&/^Seçenek seç, 3 gramaj seçeneği$/.test(z.plus.label),'aria aynı: '+JSON.stringify([m.plus&&m.plus.label,z.plus&&z.plus.label]));
  ok([m,z].every(x=>x.aa.every(v=>v>=4.5)),'AA (fiyat, ad, birim, alt satır, "+"): '+JSON.stringify([m.aa,z.aa]));
 }
 if(b)ok(b.so&&b.so.t==='Tükendi'&&b.so.l<=8&&b.so.b<=8&&b.op<.6&&b.plus&&b.plus.dis&&b.plus.op<1&&b.btnOnPhoto===0,'stoksuz: foto sol altta "Tükendi", soluk foto, "+" soluk/pasif: '+JSON.stringify({so:b.so,op:b.op,plus:b.plus}));
 const h0=m&&m.h,p0=m&&m.phTop;
 // "+" paneli açmaz; kart gövdesi eklemez
 const qty=()=>p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0)}catch(e){return -1}});
 await click(p,L+' .ozGr[data-pid=k1] .go',1200);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&await qty()===0,'kart gövdesi paneli açar, sepete eklemez');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 await click(p,L+' .ozGr[data-pid=m1] .ac .ozPlus',1100);
 ok(!(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')))&&await qty()===1,'"+" paneli açmaz, sepete ekler');
 m=await M(L,'m1');
 ok(m&&m.step&&m.step.n==='1'&&m.step.bs.length===2&&m.step.bs.every(x=>x.w>=32&&x.h>=36&&x.below>=0),'tek seçenekli: "− n +" aynı şeritte, her bölüm ≥32×36: '+JSON.stringify(m&&m.step));
 ok(m&&m.h===h0&&m.phTop===p0&&m.ctl&&m.ctl.right<=3&&m.ctl.inCard,'şerit/kart yüksekliği ve foto konumu değişmez, sağa hizalı: '+JSON.stringify(m&&{h:m.h,h0,ph:m.phTop,p0,ctl:m.ctl}));
 await click(p,L+' .ozGr[data-pid=m1] .ozPStep [aria-label="Azalt"]',500);
 m=await M(L,'m1');ok(m&&!m.step&&m.plus&&!m.plus.dis&&await qty()===0,'0 → sepetten çıkar, tek "+" geri');
 // seçenekli
 await click(p,L+' .ozGr[data-pid=z1] .ac .ozPlus',1100);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')),'seçenekli "+" küçük seçenek penceresi');
 await click(p,'.ozOv .ozPkO[data-v=z1a]',300);await click(p,'.ozOv [data-a=pkAdd]',900);
 z=await M(L,'z1');ok(z&&z.bd&&z.bd.t==='1'&&z.bd.w>=16&&z.bd.h>=16&&z.bd.leftOfGlyph&&z.bd.aboveP&&z.h===h0&&!z.step,'seçenekli: sayı "+"nın solunda aynı şeritte (≥16px), foto örtülmez, yükseklik aynı: '+JSON.stringify(z&&{bd:z.bd,h:z.h}));
 // ızgara + taşma + büyük yazı
 let g=await p.evaluate(()=>{const gr=document.querySelector('#ozRoot .ozGrs');const rs=[...gr.querySelectorAll('.ozGr')].map(c=>c.getBoundingClientRect());let lap=false;
  rs.forEach((a,i)=>rs.forEach((b,j)=>{if(i<j&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)lap=true}));
  return {cols:getComputedStyle(gr).gridTemplateColumns.split(' ').length,lap,eq:rs.slice(0,3).every(r=>Math.round(r.height)===Math.round(rs[0].height))}});
 ok(g.cols===3&&!g.lap&&g.eq&&await overflow(p)<=0,'390px 3 sütun, eşit yükseklik, taşma yok: '+JSON.stringify(g));
 await p.evaluate(()=>{document.documentElement.style.fontSize='24px'});await p.waitForTimeout(300);
 g=await p.evaluate(()=>{const gr=document.querySelector('#ozRoot .ozGrs');const cs=[...gr.querySelectorAll('.ozGr')];const rs=cs.map(c=>c.getBoundingClientRect());let lap=false;
  rs.forEach((a,i)=>rs.forEach((b,j)=>{if(i<j&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)lap=true}));
  const inside=cs.every(c=>{const r=c.getBoundingClientRect(),a=c.querySelector('.ac').getBoundingClientRect();return a.right<=r.right+.5&&a.left>=r.left-.5});
  return {cols:getComputedStyle(gr).gridTemplateColumns.split(' ').length,lap,inside,sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
 ok(g.cols===2&&!g.lap&&g.inside&&g.sw<=0,'büyük yazıda 2 sütun, çakışma/taşma yok: '+JSON.stringify(g));
 await p.evaluate(()=>{document.documentElement.style.fontSize=''});
 // Son baktığın ürünler rafında aynı kart
 await p.evaluate(()=>{localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[{id:'m1',name:'Cam şişe günlük süt',image:'https://img.test/icecekler.jpg',price_kurus:9000,nv:1,vs:[{label:'1 L',price_kurus:9000}],net:'1 L'}]}))});
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 const r=await M('#ozPPRc','m1');
 ok(r&&r.plus&&r.plus.rad==='0px'&&r.ctl&&r.ctl.below>=0&&r.btnOnPhoto===0&&r.pad==='8px/8px','"Son baktığın ürünler" rafında aynı kart ve "+" yerleşimi: '+JSON.stringify(r&&{plus:r.plus,ctl:r.ctl}));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('af1-izgara-serit BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('af1-izgara-serit: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('af1-izgara-serit HATA:',e);process.exit(1)});
