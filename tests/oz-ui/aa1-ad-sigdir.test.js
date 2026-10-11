// AA1: Keşfet Sponsorlu slaytında satıcı adı asla kesilmez — 390px, sahte veri. Çalıştırma: node tests/oz-ui/aa1-ad-sigdir.test.js
// 3 ad (kısa / orta / uzun) × 2 yazı tipi genişliği (mevcut Georgia yığını ve daha geniş DejaVu Serif): ad tam görünür
// (scrollWidth ≤ clientWidth, "…" yok, text-overflow ellipsis değil), en çok 2 satır, metin sütunu taşmaz, fotoğraflar / N/4 çipi /
// alt çipler / logo satırıyla çakışmaz, slayt 142±1px, 390px taşma yok; büyük yazı boyutunda da. Dokununca satıcı sayfası açılır.
const {chromium,open,enter}=require('./harness.js');
const SID='41876174-05d7-421c-bac1-f2e8272d19e2';
const NAMES=['Deneme Çiftliği','Anadolu Köy Ürünleri','Karabağlar Doğal Gıda ve Tarım Ürünleri Kooperatifi'];
const WIDE='html:root .ozBn.sp .tx strong{font-family:"DejaVu Serif",serif!important}';
const BIG='html:root .ozBn.sp .tx small{font-size:17px!important}html:root .ozBn .tc span{font-size:13px!important}html:root .ozBn .mk.sp .spt{font-size:14px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const G=p=>p.evaluate(()=>{const s=document.querySelector('#ozHeroT .ozHs.sp');if(!s)return null;const tx=s.querySelector('.tx'),nm=s.querySelector('.tx strong'),txb=tx.getBoundingClientRect();
  const ov=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;const ns=getComputedStyle(nm);const lh=parseFloat(ns.lineHeight)||parseFloat(ns.fontSize);
  const nr=nm.getBoundingClientRect();const lc=s.querySelector('.tx small').getBoundingClientRect();
  const others=[...s.querySelectorAll('.ph img')].map(i=>i.getBoundingClientRect()).concat([document.getElementById('ozHeroN').getBoundingClientRect(),s.querySelector('.tc').getBoundingClientRect(),s.querySelector('.mk.sp').getBoundingClientRect()]);
  return {t:nm.textContent,sw:nm.scrollWidth,cw:nm.clientWidth,vclip:nm.scrollHeight>nm.clientHeight+1,to:ns.textOverflow,clamp:ns.webkitLineClamp,fs:parseFloat(ns.fontSize),ff:ns.fontFamily,lines:Math.round((nr.height-2)/lh),
   txOv:tx.scrollHeight>tx.clientHeight+1,inTx:nr.bottom<=txb.bottom+1&&lc.bottom<=txb.bottom+1,bind:[nr,lc].some(r=>others.some(o=>ov(r,o))),h:Math.round(s.getBoundingClientRect().height),page:document.documentElement.scrollWidth,two:s.classList.contains('two')}});
 const check=(g,name,tag)=>{ok(g&&g.t===name&&!/…/.test(g.t)&&g.sw<=g.cw+1&&!g.vclip&&g.to!=='ellipsis','['+tag+'] ad tam görünmeli: '+JSON.stringify(g));
  ok(g&&g.lines<=2&&!g.txOv&&g.inTx&&!g.bind,'['+tag+'] en çok 2 satır, taşma/çakışma yok: '+JSON.stringify(g));
  ok(g&&Math.abs(g.h-142)<=1&&g.page<=390,'['+tag+'] slayt 142±1, 390px taşma yok: '+JSON.stringify(g&&[g.h,g.page]))};
 let tapped=false;
 for(const name of NAMES){
  const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(([sid,name])=>{const R=window.__OZ_FX.R;R.oz_home_slides_active=[{id:'h1',producer_id:sid,sponsored:true,sort_order:1}];/* AB1: satıcı slaytı veritabanından (sahte) */R.oz_producer_detail={id:sid,display_name:name,city:'İzmir',district:'Karabağlar',logo_url:'https://img.test/zeytin-zeytinyagi.jpg',product_count:4,categories:[]};
   R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve','kuru-yemis'][i%4]+'.jpg'}))},[SID,name]);
  await enter(p);await p.waitForTimeout(1500);
  for(const [fn,css] of [['Georgia yığını',''],['DejaVu Serif',WIDE]]){
   if(css){await p.addStyleTag({content:css});await p.evaluate(()=>dispatchEvent(new Event('resize')));await p.waitForTimeout(300)}
   check(await G(p),name,name+' / '+fn);
   await p.addStyleTag({content:BIG});await p.waitForTimeout(400);
   check(await G(p),name,name+' / '+fn+' / büyük yazı');
  }
  if(!tapped){tapped=true;
   await p.evaluate(()=>{const tr=document.getElementById('ozHeroT');const s=tr.querySelector('.ozHs.sp');tr.scrollLeft=s.offsetLeft});await p.waitForTimeout(800);
   const box=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});
   await p.mouse.click(box.x,box.y);await p.waitForTimeout(1500);
   ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP')),'dokununca satıcı sayfası açılmalı')}
  ok(!st.errors.length,'['+name+'] sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('aa1-ad-sigdir BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aa1-ad-sigdir: tüm kontroller geçti (3 ad × 2 yazı tipi × normal/büyük yazı)');process.exit(0);
})().catch(e=>{console.error('aa1-ad-sigdir HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
