// AE2: ızgara kartında tek seçenekli ürün için "− n +" hapı — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ae2-izgara-adet.test.js
// Doğrulanan: tek seçenekli ürün "+" ile eklenince fotoğrafın üst kenarında tek hap (− n +), foto genişliğini aşmaz, her bölüm ≥32×44px;
// "Artır" adet 2, "Azalt" 1, ikinci "Azalt" 0 → ürün sepetten çıkar, hap kalkar, "+" geri gelir; aria "Azalt"/"Artır", adet okunur;
// seçenekli üründe hap yok: "+" seçenek penceresi, eklenince "+" ve adet rozeti (eski davranış); 390px 3 sütun, taşma/çakışma yok; AA;
// "Son baktığın ürünler" rafındaki aynı kartta da aynı hap; karta dokunuş yine paneli açar.
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','kuru-yemis'][i%3]+'.jpg',in_stock:true}));
  T.oz_products=R.oz_search_products.map(x=>({id:x.id,description:'',net_content:x.id==='p2'?'500 g':null}));
  T.oz_variants=[{product_id:'p0',label:'500 ml',price_kurus:65000,stock:5,sort:0},{product_id:'p0',label:'1 L',price_kurus:125000,stock:5,sort:1},{product_id:'p2',label:'500 g',price_kurus:89990,stock:9,sort:0}];
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:6,categories:[]};R.oz_producer_reviews=[];
  const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_product_detail'&&x.p_id==='p2'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));
    return Object.assign({},R.oz_product_detail,{id:'p2',name:'Ezine peyniri 2',seller:{id:'s1',display_name:'Yayla'},variants:[{id:'v9',label:'500 g',price_kurus:89990,stock:9,weight_g:600}]})}return o(fn,x)}});
 await enter(p);
 const qty=()=>p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0)}catch(e){return -1}});
 const H=(root,id)=>p.evaluate(([root,id])=>{const c=document.querySelector(root+' .ozGr[data-pid="'+id+'"]');if(!c)return null;const s=c.querySelector('.ac .ozPStep');const pl=c.querySelector('.ac .ozPlus');
  function lum(x){const m=x.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
  if(!s)return {hap:false,plus:!!pl,bd:pl&&pl.querySelector('.bd')?pl.querySelector('.bd').textContent:null};
  const ph=c.querySelector('.ph').getBoundingClientRect(),r=s.getBoundingClientRect(),bs=[...s.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),l:b.getAttribute('aria-label')}});
  const n=s.querySelector('b');const pill='rgb(31, 22, 14)';
  return {hap:true,plus:!!pl,n:n.textContent,nl:n.getAttribute('aria-label'),live:n.getAttribute('aria-live'),bs,inPh:r.left>=ph.left-.5&&r.right<=ph.right+.5&&r.top>=ph.top-.5&&r.bottom<=ph.bottom,
   aa:[cr(getComputedStyle(n).color,pill),cr(getComputedStyle(s.querySelector('button')).color,pill)],border:getComputedStyle(s,'::before').borderTopColor}},[root,id]);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(1500);
 ok((await H('#ozRoot .ozGrs','p2')).hap===false,'eklemeden önce hap yok, "+" var');
 await click(p,'#ozRoot .ozGrs .ozGr[data-pid="p2"] .ac .ozPlus',1100);
 let h=await H('#ozRoot .ozGrs','p2');
 ok(h&&h.hap&&!h.plus&&h.n==='1'&&await qty()===1,'eklenince hap görünür (1), "+" yok: '+JSON.stringify(h));
 if(h&&h.hap){
  ok(h.inPh,'hap fotoğrafın içinde, genişliği aşmaz');
  ok(h.bs.length===2&&h.bs.every(b=>b.w>=32&&b.h>=44),'her bölüm ≥32×44: '+JSON.stringify(h.bs));
  ok(h.bs[0].l==='Azalt'&&h.bs[1].l==='Artır'&&h.nl==='1 adet'&&h.live==='polite','aria Azalt/Artır, adet okunur: '+JSON.stringify([h.bs.map(b=>b.l),h.nl]));
  ok(h.aa.every(x=>x>=4.5)&&h.border==='rgb(242, 193, 78)','AA kontrast + altın kenar: '+JSON.stringify([h.aa,h.border]));
 }
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ozPStep [aria-label="Artır"]',500);
 h=await H('#ozRoot .ozGrs','p2');ok(h&&h.n==='2'&&await qty()===2,'Artır → 2: '+JSON.stringify(h&&h.n));
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ozPStep [aria-label="Azalt"]',500);
 h=await H('#ozRoot .ozGrs','p2');ok(h&&h.n==='1'&&await qty()===1,'Azalt → 1');
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ozPStep [aria-label="Azalt"]',500);
 h=await H('#ozRoot .ozGrs','p2');ok(h&&!h.hap&&h.plus&&await qty()===0,'0 → sepetten çıkar, hap kalkar, "+" geri gelir: '+JSON.stringify(h));
 // seçenekli: eski davranış
 await click(p,'#ozRoot .ozGr[data-pid="p0"] .ac .ozPlus',1100);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')),'seçenekli "+" seçenek penceresi açar');
 await click(p,'.ozOv .ozPkO[data-v=v1]',300);await click(p,'.ozOv [data-a=pkAdd]',900);
 h=await H('#ozRoot .ozGrs','p0');ok(h&&!h.hap&&h.plus&&h.bd==='1','seçenekli üründe hap yok, "+" ve rozet 1: '+JSON.stringify(h));
 // 3 sütun, taşma yok (hap açıkken)
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .ac .ozPlus',1100);
 const g=await p.evaluate(()=>{const gr=document.querySelector('#ozRoot .ozGrs');const cs=[...gr.querySelectorAll('.ozGr')];
  const he=document.querySelector('#ozRoot .ozGr[data-pid="p2"] .ozPStep');if(!he)return {cols:getComputedStyle(gr).gridTemplateColumns.split(' ').length,inCard:false};const hap=he.getBoundingClientRect(),own=document.querySelector('#ozRoot .ozGr[data-pid="p2"]').getBoundingClientRect();
  return {cols:getComputedStyle(gr).gridTemplateColumns.split(' ').length,inCard:hap.left>=own.left&&hap.right<=own.right}});
 ok(g.cols===3&&g.inCard&&await overflow(p)<=0,'390px 3 sütun, hap kart içinde, taşma yok: '+JSON.stringify(g));
 // karta dokunuş paneli açar
 await click(p,'#ozRoot .ozGr[data-pid="p2"] .go',1300);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')),'karta dokunuş paneli açmalı');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 // Son baktığın ürünler rafında aynı
 await p.evaluate(()=>{localStorage.setItem('isimi_oz_cart','[]');localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[{id:'p2',name:'Ezine peyniri 2',image:'https://img.test/recel.jpg',price_kurus:89990,nv:1,vs:[{label:'500 g',price_kurus:89990}],net:'500 g'}]}))});
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 await click(p,'#ozPPRc .ozGr[data-pid="p2"] .ac .ozPlus',1100);
 h=await H('#ozPPRc','p2');ok(h&&h.hap&&h.n==='1'&&h.inPh,'rafta da hap: '+JSON.stringify(h));
 await click(p,'#ozPPRc .ozGr[data-pid="p2"] .ozPStep [aria-label="Azalt"]',500);
 h=await H('#ozPPRc','p2');ok(h&&!h.hap&&h.plus&&await qty()===0,'rafta 0 → "+" geri');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ae2-izgara-adet BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ae2-izgara-adet: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ae2-izgara-adet HATA:',e);process.exit(1)});
