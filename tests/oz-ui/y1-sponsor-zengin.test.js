// Y1: Keşfet "Sponsorlu" Deneme Çiftliği slaytı zengin görünüm — 390px, sahte veri, sahte zamanlayıcı. Çalıştırma: node tests/oz-ui/y1-sponsor-zengin.test.js
// Doğrulanan: slayt boyu diğer slaytlarla aynı (±1px); ad italik serif ve ≥1,4 × 15px; logo ≥1,3 × 30px, ince çerçeve; 2 özgün dal SVG'si
// (%25-40 opaklık); ürün fotoğrafları ≥1,25 × 50px, ±4-6° dönük, slayt içinde, N/4 çipiyle çakışmaz; ad/il-ilçe AA (gradyanın en açık
// tonuna karşı); "Sponsorlu", "Onaylı satıcı", "Ürünlerini keşfet ›", 4 nokta, "4/4"; dokununca satıcı sayfası; büyük yazıda binme yok;
// AB1: koddaki not "sponsorlu slayt veritabanından gelir" (TEST yorumu kalktı).
const fs=require('fs'),path=require('path');
const {chromium,open,enter}=require('./harness.js');
const SID='41876174-05d7-421c-bac1-f2e8272d19e2';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 {const src=fs.readFileSync(path.join(__dirname,'..','..','oz-market-v1.js'),'utf8');ok(/sponsorlu slayt veritabanından gelir/.test(src)&&!/TEST slaytı: canlıdan önce kaldır/.test(src),'AB1: "TEST slaytı" yorumu kalkmış, "sponsorlu slayt veritabanından gelir" notu olmalı')}
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.clock.install();
 await p.evaluate(sid=>{const R=window.__OZ_FX.R;R.oz_home_slides_active=[{id:'h1',producer_id:sid,sponsored:true,sort_order:1}];/* AB1: satıcı slaytı veritabanından (sahte) */R.oz_producer_detail={id:sid,display_name:'Deneme Çiftliği',city:'İzmir',district:'Karabağlar',logo_url:'https://img.test/zeytin-zeytinyagi.jpg',product_count:4,categories:[]};
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve','kuru-yemis'][i%4]+'.jpg'}))},SID);
 await enter(p);await p.clock.runFor(1500);
 const seen=new Set();for(let i=0;i<14;i++){const c=await p.evaluate(()=>document.getElementById('ozHeroN').textContent);seen.add(c);if(c==='4/4'){await p.clock.runFor(700);break}await p.clock.runFor(1000)}
 const G=()=>p.evaluate(()=>{const s=document.querySelector('#ozHeroT .ozHs.sp');if(!s)return null;const txb=s.querySelector('.tx').getBoundingClientRect();
  /* .tx taşanı gizler (overflow:hidden): ad ve il·ilçe için görünen kutu = .tx ile kesişim */
  const R=e=>{const r=e.getBoundingClientRect();if(!e.closest||!e.closest('.tx')||e.classList.contains('tx'))return r;return {left:Math.max(r.left,txb.left),right:Math.min(r.right,txb.right),top:Math.max(r.top,txb.top),bottom:Math.min(r.bottom,txb.bottom),width:r.width,height:r.height}};
  const ov=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;const sl=R(s),chip=R(document.getElementById('ozHeroN'));
  const nm=s.querySelector('.tx strong'),loc=s.querySelector('.tx small'),lg=s.querySelector('.slg'),tc=s.querySelector('.tc');const ns=getComputedStyle(nm);
  const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};
  const lin=(getComputedStyle(s).backgroundImage.match(/linear-gradient\((.*)\)$/)||[])[1]||'';const stops=(lin.match(/rgb\([^)]*\)/g)||[]).map(rgb);const lightest=stops.sort((a,b)=>lum(b)-lum(a))[0];
  const cr=(c)=>+((Math.max(lum(c),lum(lightest))+.05)/(Math.min(lum(c),lum(lightest))+.05)).toFixed(2);
  const others=[...document.querySelectorAll('#ozHeroT .ozHs:not(.sp)')].map(x=>Math.round(R(x).height));
  const ims=[...s.querySelectorAll('.ph img')];
  return {h:Math.round(sl.height),others,fs:parseFloat(ns.fontSize),ff:ns.fontFamily,it:ns.fontStyle,lg:Math.round(R(lg).width),lgB:getComputedStyle(lg).borderTopWidth,
   yb:[...s.querySelectorAll('svg.yb')].map(x=>+getComputedStyle(x).opacity),
   ph:ims.map(i=>({w:Math.round(i.offsetWidth),tf:getComputedStyle(i).transform,inS:R(i).left>=sl.left&&R(i).right<=sl.right&&R(i).top>=sl.top&&R(i).bottom<=sl.bottom,chip:ov(R(i),chip)})),
   crN:cr(rgb(ns.color)),crL:cr(rgb(getComputedStyle(loc).color)),stops:stops.length,
   bind:[[lg,nm],[nm,loc],[loc,tc],[lg,loc]].some(([a,b])=>ov(R(a),R(b)))||[nm,loc].some(e=>ims.some(i=>ov(R(e),R(i)))),
   sp:(s.querySelector('.spt')||{}).textContent,tcT:[...tc.querySelectorAll('span')].map(x=>x.textContent).join('|'),
   chipT:document.getElementById('ozHeroN').textContent,dots:document.querySelectorAll('#ozHeroD i').length,page:document.documentElement.scrollWidth}});
 let g=await G();
 ok(g&&Math.abs(g.h-g.others[0])<=1&&g.others.every(x=>x===g.others[0]),'slayt boyu aynı: '+JSON.stringify(g&&[g.h,g.others]));
 ok(g&&g.fs>=21&&/Georgia/.test(g.ff)&&g.it==='italic','ad ≥1,4× (21px), italik serif: '+JSON.stringify(g&&[g.fs,g.ff,g.it]));
 ok(g&&g.lg>=39&&parseFloat(g.lgB)>=1,'logo ≥1,3× (39px), çerçeveli: '+JSON.stringify(g&&[g.lg,g.lgB]));
 ok(g&&g.yb.length===2&&g.yb.every(o=>o>=.25&&o<=.4),'2 dal SVG, %25-40 opaklık: '+JSON.stringify(g&&g.yb));
 ok(g&&g.ph.length===3&&g.ph.every(x=>x.w>=62&&x.inS&&!x.chip&&/matrix/.test(x.tf)),'fotoğraflar ≥62px, dönük, slayt içinde, çiple çakışmaz: '+JSON.stringify(g&&g.ph));
 ok(g&&g.ph.every(x=>{const m=x.tf.match(/matrix\(([^,]+), ([^,]+)/);const a=m?Math.abs(Math.atan2(+m[2],+m[1])*180/Math.PI):0;return a>=3.9&&a<=6.1}),'dönme ±4-6°: '+JSON.stringify(g&&g.ph.map(x=>x.tf)));
 ok(g&&g.stops>=2&&g.crN>=3&&g.crL>=4.5,'ad (büyük metin) ≥3, il·ilçe ≥4.5 kontrast (en açık tona karşı): '+JSON.stringify(g&&[g.crN,g.crL]));
 ok(g&&!g.bind,'ad/il-ilçe/logo/çipler/fotoğraflar üst üste binmemeli');
 ok(g&&g.sp==='Sponsorlu'&&g.tcT==='✓ Onaylı satıcı|Ürünlerini keşfet ›'&&g.chipT==='4/4'&&g.dots===4&&['1/4','2/4','3/4','4/4'].every(x=>seen.has(x)),'etiketler, 4 nokta, N/4 sayımı: '+JSON.stringify(g&&[g.sp,g.tcT,g.chipT,g.dots,[...seen]]));
 ok(g&&g.page<=390,'390px taşma yok');
 // büyük yazı
 await p.addStyleTag({content:'html:root .ozBn.sp .tx strong{font-size:30px!important}html:root .ozBn.sp .tx small{font-size:17px!important}html:root .ozBn .tc span{font-size:13px!important}'});await p.clock.runFor(100);
 g=await G();ok(g&&!g.bind,'büyük yazıda binme yok');
 // dokunuş → satıcı sayfası
 const box=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});
 await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(80);await p.mouse.up();await p.clock.runFor(1600);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP')),'dokununca satıcı sayfası açılmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('y1-sponsor-zengin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('y1-sponsor-zengin: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('y1-sponsor-zengin HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
