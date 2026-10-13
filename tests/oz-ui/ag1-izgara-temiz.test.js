// AG1: ızgara kartı — çerçevesiz/zeminsiz, bitişik, TEMİZ fotoğraf; "+" fotoğrafın hemen altında fiyatın sağında. 390px, sahte RPC.
// AH1: yalnız aralık/köşe beklentileri güncellendi — ürün ızgarasında sütun arası 0 (bitişik foto bandı), satır kenarı köşe sınıfları (cl/cr).
// Çalıştırma: node tests/oz-ui/ag1-izgara-temiz.test.js
// Doğrulanan: kartta kenarlık/zemin/köşe/iç boşluk yok, üst şerit yok; ızgara sütun arası 6px, satır arası 12px; foto hücreyi tam doldurur,
// kare, 10px köşe; foto üzerinde düğme/rozet/sayı yok (yalnız stoksuzda sol altta "Tükendi"); "+" fotoğrafın altındaki satırda (≈6px),
// fiyatın sağında, hücrenin sağ kenarında, fiyat bloğuyla dikey ortalı; "+" köşesiz/çerçevesiz/zeminsiz, glif ≤16px; dokunma alanı ≥44×44,
// fotoğrafa, ad satırına ve komşu karta taşmaz; "+" paneli açmaz, kart gövdesi eklemez; seçenekli "+" seçenek penceresi, sayı "+"nın
// solunda (fiyat kesilmez); tek seçenekli "− n +" aynı sağ sütunda, her bölüm ≥32×44, fiyat bloğu taşmaz, kart yüksekliği değişmez, 0'da "+";
// stoksuz: "Tükendi" (kahve zemin, krem yazı) sol altta, "+" soluk/pasif; "Son baktığın ürünler" rafında aynı kart; 3 sütun / büyük yazıda 2; AA.
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
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
  let pg=document.getElementById('ozRoot');const page=getComputedStyle(document.body).backgroundColor;
  const cs=getComputedStyle(c),go=c.querySelector('.go'),gs=getComputedStyle(go);const R0=c.getBoundingClientRect(),ph=c.querySelector('.ph'),P=ph.getBoundingClientRect();
  const prw=c.querySelector('.prw')||c.querySelector('.pr'),W=prw.getBoundingClientRect(),nm=c.querySelector('.nm').getBoundingClientRect();
  const pl=c.querySelector('.ac .ozPlus'),stp=c.querySelector('.ac .ozPStep');const ctl=pl||stp,Q=ctl?ctl.getBoundingClientRect():null;
  const ps=pl?getComputedStyle(pl):null,g=pl?pl.querySelector('svg'):null,G=g?g.getBoundingClientRect():null,bd=pl?pl.querySelector('.bd'):null,B=bd?bd.getBoundingClientRect():null;
  const so=c.querySelector('.so'),S=so?so.getBoundingClientRect():null;const pr=c.querySelector('.pr');
  const col=s=>{const e=c.querySelector(s);return e?getComputedStyle(e).color:null};
  return {box:[cs.borderTopWidth,cs.backgroundColor,cs.borderTopLeftRadius,cs.paddingTop,gs.paddingTop,gs.paddingBottom,gs.paddingLeft,gs.borderTopWidth].join('|'),tp:!!c.querySelector('.tp'),
   h:Math.round(R0.height),phFill:Math.abs(P.width-R0.width)<.6&&Math.abs(P.left-R0.left)<.6&&Math.abs(P.top-R0.top)<.6,sq:Math.abs(P.width-P.height)<1,phRad:getComputedStyle(ph).borderTopLeftRadius,
   onPhoto:[...ph.querySelectorAll('*')].filter(e=>!e.matches('img,i,.so')).length+[...c.querySelectorAll('button,.bd,.ozPStep')].filter(e=>{const r=e.getBoundingClientRect();return r.top<P.bottom-.5&&r.bottom>P.top&&!ph.contains(e)&&e!==go}).length,
   ctl:Q?{w:Math.round(Q.width),h:Math.round(Q.height),gapTop:Math.round(Q.top-P.bottom),right:Math.round(R0.right-Q.right),inCard:Q.left>=R0.left-.5&&Q.right<=R0.right+.5,overName:Q.bottom>nm.top+.5,
    vc:Math.abs((Q.top+Q.bottom)/2-(W.top+W.bottom)/2)<2.5,rightOfPrice:Q.left>=pr.getBoundingClientRect().right-.5}:null,
   plus:pl?{rad:ps.borderTopLeftRadius,bw:ps.borderTopWidth,bg:ps.backgroundColor,gw:G?Math.round(G.width):99,gh:G?Math.round(G.height):99,dis:pl.disabled,op:+ps.opacity,label:pl.getAttribute('aria-label')}:null,
   bd:B?{t:bd.textContent,left:G?B.right<=G.left:false}:null,prFull:pr.scrollWidth<=pr.clientWidth+.5,prOverflowOk:prw.scrollWidth<=prw.clientWidth+.5,
   step:stp?{n:stp.querySelector('b').textContent,bs:[...stp.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})}:null,
   so:S?{t:so.textContent,l:Math.round(S.left-P.left),b:Math.round(P.bottom-S.bottom),bg:getComputedStyle(so).backgroundColor,c:getComputedStyle(so).color}:null,op:ph.querySelector('img')?+getComputedStyle(ph.querySelector('img')).opacity:1,
   aa:[cr(col('.pr b')||col('.pr .uf')||col('.pr .nvp'),page),cr(col('.nm'),page),cr(col('.up'),page),cr(col('.nt'),page),pl?cr(ps.color,page):99]}},[root,id]);
 const L='#ozRoot .ozGrs';
 const gr=await p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozGrs');const s=getComputedStyle(g);return {cols:s.gridTemplateColumns.split(' ').length,cg:s.columnGap,rg:s.rowGap}});
 ok(gr.cols===3&&gr.cg==='0px'&&gr.rg==='12px','390px 3 sütun, sütun arası 0px, satır arası 12px: '+JSON.stringify(gr));
 let m=await M(L,'m1'),z=await M(L,'z1'),b=await M(L,'b1');
 ok(m&&z&&b,'kartlar');
 if(m){
  ok(m.box==='0px|rgba(0, 0, 0, 0)|0px|0px|0px|0px|0px|0px'&&!m.tp,'kartta kenarlık/zemin/köşe/iç boşluk yok, üst şerit yok: '+m.box);
  ok(m.phFill&&m.sq&&m.phRad==='10px','foto hücreyi tam doldurur, kare, 10px köşe');
  ok(m.onPhoto===0&&z.onPhoto===0&&b.onPhoto===0,'foto üzerinde düğme/rozet yok: '+[m.onPhoto,z.onPhoto,b.onPhoto]);
  ok(m.ctl&&m.ctl.gapTop>=4&&m.ctl.gapTop<=8&&m.ctl.right<=1&&m.ctl.inCard&&!m.ctl.overName&&m.ctl.vc&&m.ctl.rightOfPrice,'"+" fotoğrafın altında (~6px), fiyatın sağında, sağ kenarda, dikey ortalı, ada/komşuya taşmaz: '+JSON.stringify(m.ctl));
  ok(m.plus&&m.plus.rad==='0px'&&m.plus.bw==='0px'&&m.plus.bg==='rgba(0, 0, 0, 0)'&&m.plus.gw<=16&&m.plus.gh<=16,'"+" sade glif (köşe/çerçeve/zemin yok, ≤16px): '+JSON.stringify(m.plus));
  ok(m.ctl&&m.ctl.w>=44&&m.ctl.h>=44,'dokunma alanı ≥44×44');
  ok(m.plus&&m.plus.label==='Sepete ekle'&&z.plus&&z.plus.label==='Seçenek seç, 3 gramaj seçeneği','aria aynı');
  ok([m,z].every(x=>x.aa.every(v=>v>=4.5)),'AA (sayfa zemininde): '+JSON.stringify([m.aa,z.aa]));
  ok(m.prFull&&z.prFull,'fiyat kesilmeden görünür (tek "+" iken)');
 }
 if(b)ok(b.so&&b.so.t==='Tükendi'&&b.so.l<=8&&b.so.b<=8&&b.so.bg==='rgb(58, 45, 32)'&&b.so.c==='rgb(246, 236, 220)'&&b.op<.6&&b.plus&&b.plus.dis&&b.plus.op<1,'stoksuz: sol altta kahve/krem "Tükendi", soluk foto, pasif "+": '+JSON.stringify({so:b.so,op:b.op,plus:b.plus}));
 const h0=m&&m.h;
 const qty=()=>p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0)}catch(e){return -1}});
 await click(p,L+' .ozGr[data-pid=k1] .go',1200);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&await qty()===0,'kart gövdesi paneli açar, sepete eklemez');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 await click(p,L+' .ozGr[data-pid=m1] .ac .ozPlus',1100);
 ok(!(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')))&&await qty()===1,'"+" paneli açmaz, sepete ekler');
 m=await M(L,'m1');
 ok(m&&m.step&&m.step.n==='1'&&m.step.bs.every(x=>x[0]>=32&&x[1]>=44)&&m.ctl.right<=1&&m.ctl.gapTop>=4&&m.ctl.gapTop<=8&&m.ctl.inCard,'tek seçenekli: "− n +" aynı sağ sütunda, her bölüm ≥32×44: '+JSON.stringify(m&&{s:m.step,c:m.ctl}));
 ok(m&&m.h===h0&&m.prOverflowOk&&m.onPhoto===0,'kart yüksekliği değişmez, fiyat bloğu taşmaz: '+JSON.stringify(m&&[m.h,h0]));
 await click(p,L+' .ozGr[data-pid=m1] .ozPStep [aria-label="Azalt"]',500);
 m=await M(L,'m1');ok(m&&!m.step&&m.plus&&await qty()===0&&m.prFull,'0 → tek "+" geri, fiyat yeniden tam');
 await click(p,L+' .ozGr[data-pid=z1] .ac .ozPlus',1100);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')),'seçenekli "+" küçük seçenek penceresi');
 await click(p,'.ozOv .ozPkO[data-v=z1a]',300);await click(p,'.ozOv [data-a=pkAdd]',900);
 z=await M(L,'z1');ok(z&&z.bd&&z.bd.t==='1'&&z.bd.left&&z.prFull&&z.h===h0&&z.onPhoto===0,'seçenekli: sayı "+"nın solunda, fiyat kesilmez, yükseklik aynı: '+JSON.stringify(z&&{bd:z.bd,pr:z.prFull,h:z.h}));
 ok(await overflow(p)<=0,'390px taşma yok');
 await p.evaluate(()=>{document.documentElement.style.fontSize='24px'});await p.waitForTimeout(300);
 const g2=await p.evaluate(()=>{const gr=document.querySelector('#ozRoot .ozGrs');const cs=[...gr.querySelectorAll('.ozGr')];const rs=cs.map(c=>c.getBoundingClientRect());let lap=false;
  rs.forEach((a,i)=>rs.forEach((b,j)=>{if(i<j&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)lap=true}));
  return {cols:getComputedStyle(gr).gridTemplateColumns.split(' ').length,lap,sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
 ok(g2.cols===2&&!g2.lap&&g2.sw<=0,'büyük yazıda 2 sütun, çakışma/taşma yok: '+JSON.stringify(g2));
 await p.evaluate(()=>{document.documentElement.style.fontSize=''});
 await p.evaluate(()=>{localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[{id:'m1',name:'Cam şişe günlük süt',image:'https://img.test/icecekler.jpg',price_kurus:9000,nv:1,vs:[{label:'1 L',price_kurus:9000}],net:'1 L'}]}))});
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 const r=await M('#ozPPRc','m1');
 ok(r&&r.box===(m&&m.box)&&r.onPhoto===0&&r.ctl&&r.ctl.gapTop>=4&&r.ctl.gapTop<=8&&r.plus&&r.plus.rad==='0px','"Son baktığın ürünler" rafında aynı kart: '+JSON.stringify(r&&{box:r.box,ctl:r.ctl}));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ag1-izgara-temiz BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ag1-izgara-temiz: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ag1-izgara-temiz HATA:',e);process.exit(1)});
