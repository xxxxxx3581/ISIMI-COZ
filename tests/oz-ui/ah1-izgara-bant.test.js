// AH1: ürün ızgarasında bitişik foto bandı — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ah1-izgara-bant.test.js
// Doğrulanan: sütun arası 0 (komşu fotolar arasında boşluk yok), kartta/fotoda kenarlık/gölge/outline yok; 3 sütunda 1. sütun yalnız sol,
// 3. sütun yalnız sağ köşeler 10px, 2. sütun köşesiz; son satırdaki tek ürünün dört köşesi yuvarlak; büyük yazıda (2 sütun) aynı kural;
// yazı blokları foto kenarından 6px içeride (ilk sütun sol 2px, son sütun sağ 2px); "+" ve "− n +" dokunma alanı kendi sütununu geçmez;
// "Tükendi" sol altta 6px içeride; satırda kart yükseklikleri eşit; "+" paneli açmaz, kart gövdesi açar; "Son baktığın ürünler" rafında
// aralık (6px) ve 10px köşeler eskisi gibi.
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;const im=['icecekler','zeytin-zeytinyagi','bal-recel','baharat-bitki-cay','recel','kuru-yemis','konserve'];
  R.oz_search_products=im.map((x,i)=>({id:'q'+i,name:['Cam şişe günlük süt','Naturel sızma zeytinyağı','Çam balı','Kekik','Çilek reçeli','Ceviz içi','Közlenmiş biber'][i],image:'https://img.test/'+x+'.jpg',price_kurus:5000+i*1000,seller_id:'s1',in_stock:i!==4}));
  T.oz_products=R.oz_search_products.map((x,i)=>({id:x.id,description:'',net_content:['1 L','1000 gr','850 g','50 g','400 g','250 g','600 g'][i]}));
  T.oz_variants=R.oz_search_products.map((x,i)=>({product_id:x.id,label:T.oz_products[i].net_content,price_kurus:x.price_kurus,stock:i===4?0:5,sort:0}));
  localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'vq3',product_id:'q3',qty:2,name:'Kekik',label:'50 g',price_kurus:8000,stock:5,nv:1}]));
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:7,categories:[]};R.oz_producer_reviews=[]});
 await enter(p);await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1600);
 const G=()=>p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozGrs');if(!g)return null;const cs=[...g.querySelectorAll('.ozGr')];
  const rad=e=>{const s=getComputedStyle(e);return [s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomRightRadius,s.borderBottomLeftRadius].map(x=>parseFloat(x)).join(',')};
  const deco=e=>{const s=getComputedStyle(e);return (parseFloat(s.borderTopWidth)+parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth))>0||s.boxShadow!=='none'||(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0)};
  const rows={};cs.forEach(c=>{const k=Math.round(c.getBoundingClientRect().top);(rows[k]=rows[k]||[]).push(c)});
  return {cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,cg:getComputedStyle(g).columnGap,
   rows:Object.values(rows).map(r=>r.map(c=>{const R=c.getBoundingClientRect(),P=c.querySelector('.ph').getBoundingClientRect(),ctl=c.querySelector('.ac .ozPlus,.ac .ozPStep').getBoundingClientRect();
    const prw=getComputedStyle(c.querySelector('.prw')),nm=getComputedStyle(c.querySelector('.nm')),so=c.querySelector('.so');
    return {id:c.dataset.pid,rad:rad(c.querySelector('.ph')),L:P.left,Rt:P.right,h:Math.round(R.height),deco:deco(c)||deco(c.querySelector('.go'))||deco(c.querySelector('.ph'))||(c.querySelector('.ph img')&&deco(c.querySelector('.ph img'))),
     ctlIn:ctl.left>=R.left-.01&&ctl.right<=R.right+.01,pl:prw.paddingLeft,nmL:nm.marginLeft,nmR:nm.marginRight,
     so:so?[Math.round(so.getBoundingClientRect().left-P.left),Math.round(P.bottom-so.getBoundingClientRect().bottom)]:null}}))}});
 const chk=(g,n,where)=>{ok(g&&g.cols===n&&g.cg==='0px','['+where+'] '+n+' sütun, sütun arası 0: '+JSON.stringify(g&&[g.cols,g.cg]));if(!g)return;
  g.rows.forEach((r,ri)=>{ok(r.every(c=>c.h===r[0].h),'['+where+'] satır '+ri+' kart yükseklikleri eşit');
   r.forEach((c,i)=>{const first=i===0,last=i===r.length-1;const want=[first?10:0,last?10:0,last?10:0,first?10:0].join(',');
    ok(c.rad===want,'['+where+'] '+c.id+' köşeler '+want+': '+c.rad);ok(!c.deco,'['+where+'] '+c.id+' kenarlık/gölge/outline yok');ok(c.ctlIn,'['+where+'] '+c.id+' "+"/adım alanı kendi sütununda');
    if(i>0)ok(Math.abs(c.L-r[i-1].Rt)<0.01,'['+where+'] '+r[i-1].id+'→'+c.id+' fotolar bitişik: '+(c.L-r[i-1].Rt));
    if(n===3&&r.length===3){ok(c.pl===(first?'2px':'6px')&&c.nmL===(first?'2px':'6px')&&c.nmR===(last?'2px':'6px'),'['+where+'] '+c.id+' yazı iç boşluğu: '+[c.pl,c.nmL,c.nmR])}
    if(c.so)ok(c.so[0]===6&&c.so[1]===6,'['+where+'] "Tükendi" 6px içeride: '+c.so)})})};
 let g=await G();chk(g,3,'390px');
 ok(g&&g.rows.length===3&&g.rows[2].length===1&&g.rows[2][0].rad==='10,10,10,10','son satırdaki tek ürün dört köşe yuvarlak: '+JSON.stringify(g&&g.rows[2]));
 ok(await overflow(p)<=0,'390px taşma yok');
 // tıklama davranışı
 const qty=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').reduce((n,x)=>n+x.qty,0));
 await click(p,'#ozRoot .ozGrs .ozGr[data-pid=q5] .go',1200);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&await qty()===2,'kart gövdesi paneli açar, eklemez');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 // büyük yazı → 2 sütun, aynı kural
 await p.evaluate(()=>{document.documentElement.style.fontSize='24px'});await p.waitForTimeout(500);
 g=await G();chk(g,2,'büyük yazı');
 ok(g&&g.rows[g.rows.length-1].length===1&&g.rows[g.rows.length-1][0].rad==='10,10,10,10','2 sütunda son tek ürün dört köşe yuvarlak');
 await p.evaluate(()=>{document.documentElement.style.fontSize=''});await p.waitForTimeout(400);
 // raf eskisi gibi
 await p.evaluate(()=>{localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[0,1,2].map(i=>({id:'q'+i,name:'Ürün '+i,image:'https://img.test/recel.jpg',price_kurus:9000,nv:1}))}))});
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 const r=await p.evaluate(()=>{const h=document.querySelector('#ozPPRc .ozGrH');if(!h)return null;const cs=[...h.querySelectorAll('.ozGr')];
  return {gap:getComputedStyle(h).columnGap,rad:cs.map(c=>{const s=getComputedStyle(c.querySelector('.ph'));return [s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomRightRadius,s.borderBottomLeftRadius].join(',')}),cls:cs.some(c=>c.classList.contains('cl')||c.classList.contains('cr')),
   dist:cs.length>1?Math.round(cs[1].getBoundingClientRect().left-cs[0].getBoundingClientRect().right):null}});
 ok(r&&r.gap==='6px'&&r.dist===6&&!r.cls&&r.rad.every(x=>x==='10px,10px,10px,10px'),'"Son baktığın ürünler" rafı eskisi gibi (6px aralık, 10px köşeler): '+JSON.stringify(r));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ah1-izgara-bant BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ah1-izgara-bant: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ah1-izgara-bant HATA:',e);process.exit(1)});
