// AA2: satıcı adı kesilmez — 390px, sahte veri. Çalıştırma: node tests/oz-ui/aa2-ad-kesilmez.test.js
// Uzun ad "Karabağlar Doğal Gıda ve Tarım Ürünleri Kooperatifi" ile: Keşfet "Satıcılar" kartı, Satıcılar sekmesi kartı, satıcı sayfası
// başlığı ve Favori satıcılar kartında ad tam görünür ("…"/line-clamp yok, yatay ve dikey taşma yok), en çok 2 satır, kart dışına
// taşmaz; DejaVu Serif gibi daha geniş yazıda da. Dar yerlerde (ürün paneli başlığı ve satıcı satırı, ödeme grubu başlığı, sipariş
// detayı) tek satır kalabilir ama tam ad title'da. 390px yatay taşma yok.
const {chromium,open,enter}=require('./harness.js');
const L='Karabağlar Doğal Gıda ve Tarım Ürünleri Kooperatifi';
const WIDE='html:root .ozPrd2 .pn,html:root .ozPP .nm,html:root .ozFsC .tx b{font-family:"DejaVu Serif",serif!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{orderStatus:'delivered'}});
 await p.evaluate(L=>{const F=window.__OZ_FX,R=F.R,T=F.T;const fix=o=>JSON.parse(JSON.stringify(o).split('Yayla Üreticileri').join(L));
  for(const k of Object.keys(R))if(R[k]&&typeof R[k]==='object')R[k]=fix(R[k]);for(const k of Object.keys(T))T[k]=fix(T[k]);
  R.oz_producer_detail=Object.assign({},R.oz_producer_detail||{},{id:'s1',display_name:L,city:'İzmir',district:'Karabağlar',rating_avg:5,rating_count:6,product_count:2,categories:[]});
  R.oz_my_favorite_sellers=[{id:'s1',display_name:L,city:'İzmir',district:'Karabağlar',rating_avg:5,rating_count:3}];
  const q=F.quote;F.quote=items=>{const r=q(items);r.groups.forEach(g=>g.seller_name=L);return r};
  localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'v1',product_id:'p0',name:'Z',label:'',price_kurus:1000,seller_id:'s1',seller_name:L,qty:1}]));T.oz_addresses=[]},L);
 await enter(p);await p.waitForTimeout(900);
 const full=(sel,card)=>p.evaluate(([sel,card,L])=>{const e=document.querySelector(sel);if(!e)return null;const s=getComputedStyle(e);const lh=parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.2;const r=e.getBoundingClientRect();
  const c=card?e.closest(card):null,cr=c?c.getBoundingClientRect():null;let a=e,anc=[];for(let i=0;i<3&&a;i++,a=a.parentElement){const k=getComputedStyle(a);anc.push(k.textOverflow+'/'+k.webkitLineClamp)}
  return {t:e.textContent,sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,lines:Math.round(r.height/lh),fs:parseFloat(s.fontSize),anc:anc.join(' '),
   inCard:!cr||(r.right<=cr.right+1&&r.bottom<=cr.bottom+1&&[...c.children].every(x=>x.getBoundingClientRect().bottom<=cr.bottom+1)),page:document.documentElement.scrollWidth}},[sel,card,L]);
 const chk=(g,where)=>{ok(g&&g.t===L&&g.sw<=g.cw+1&&g.sh<=g.ch+1&&!/ellipsis|\/[1-9]/.test(g.anc),'['+where+'] ad tam görünmeli: '+JSON.stringify(g));
  ok(g&&g.lines<=2&&g.inCard&&g.page<=390,'['+where+'] en çok 2 satır, kart içinde, 390px: '+JSON.stringify(g))};
 const run=async wide=>{const w=wide?' (DejaVu)':'';
  await p.evaluate(()=>OZ.go('home',{}));await p.waitForTimeout(1200);chk(await full('#ozRoot .ozPrds3 .ozPrd2 .pn','.ozPrd2'),'Keşfet Satıcılar kartı'+w);
  await p.evaluate(()=>OZ.go('producers',{}));await p.waitForTimeout(1300);chk(await full('#ozRoot .ozPrd2 .pn','.ozPrd2'),'Satıcılar sekmesi'+w);
  await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1500);chk(await full('#ozRoot .ozPP .nmr .nm',null),'Satıcı sayfası başlığı'+w);
  await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);chk(await full('#ozFsS .ozFsC .tx b','.ozFsC'),'Favori satıcılar'+w)};
 await run(false);
 // dar yerler: tek satır olabilir, tam ad title'da
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 try{await p.click('.ozGc[data-pid=p0] .sc',{timeout:3000})}catch(e){fails.push('panel açılamadı')}await p.waitForTimeout(1300);
 const pd=await p.evaluate(()=>({h2:(document.querySelector('.ozOv.ozPdS .ozShH h2')||{}).title,row:((document.querySelector('.ozOv.ozPdS .ozPdPr b')||{}).title)}));
 ok(pd.h2===L&&pd.row===L,'ürün paneli başlığı ve satıcı satırında tam ad title: '+JSON.stringify(pd));
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(()=>OZ.go('cart',{}));await p.waitForTimeout(1500);
 ok(await p.evaluate(L=>{const b=document.querySelector('#ozRoot .ozCoG2 .hd b');return !!b&&b.title===L},L),'ödeme/sepet grup başlığında tam ad title');
 await p.evaluate(()=>OZ.go('order',{id:'o1'}));await p.waitForTimeout(1500);
 ok(await p.evaluate(L=>{const e=document.querySelector('#ozRoot .ozOdS');return !!e&&e.title===L},L),'sipariş detayında tam ad title');
 // daha geniş yazı
 await p.addStyleTag({content:WIDE});await p.evaluate(()=>dispatchEvent(new Event('resize')));await p.waitForTimeout(300);
 await run(true);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('aa2-ad-kesilmez BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aa2-ad-kesilmez: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('aa2-ad-kesilmez HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
