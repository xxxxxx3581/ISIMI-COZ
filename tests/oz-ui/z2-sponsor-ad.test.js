// Z2: Sponsorlu Deneme Çiftliği slaytında satıcı adı — 390px, sahte veri, sahte zamanlayıcı. Çalıştırma: node tests/oz-ui/z2-sponsor-ad.test.js
// Doğrulanan: ad, logo + "Sponsorlu" satırının hemen altında (≈8px); ≥30px, "Özüne Dön" başlığındaki mevcut italik serif ailesi, 700,
// +0.5px harf aralığı, kesilmeden tek satır; altında 48-64px altın çizgi + yaprak SVG; sonra il · ilçe, en altta çipler; fotoğraflar,
// N/4 çipi ve noktalarla çakışma yok; slayt boyu aynı; AA; büyük yazıda binme yok; 390px taşma yok; dokununca satıcı sayfası.
const {chromium,open,enter}=require('./harness.js');
const SID='41876174-05d7-421c-bac1-f2e8272d19e2';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.clock.install();
 await p.evaluate(sid=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:sid,display_name:'Deneme Çiftliği',city:'İzmir',district:'Karabağlar',logo_url:'https://img.test/zeytin-zeytinyagi.jpg',product_count:4,categories:[]};
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve','kuru-yemis'][i%4]+'.jpg'}))},SID);
 await enter(p);await p.clock.runFor(1500);
 for(let i=0;i<14;i++){if(await p.evaluate(()=>document.getElementById('ozHeroN').textContent)==='4/4'){await p.clock.runFor(700);break}await p.clock.runFor(1000)}
 const G=()=>p.evaluate(()=>{const s=document.querySelector('#ozHeroT .ozHs.sp');if(!s)return null;const txb=s.querySelector('.tx').getBoundingClientRect();
  const R=e=>{const r=e.getBoundingClientRect();if(!e.closest('.tx')||e.classList.contains('tx'))return r;return {left:Math.max(r.left,txb.left),right:Math.min(r.right,txb.right),top:Math.max(r.top,txb.top),bottom:Math.min(r.bottom,txb.bottom)}};
  const ov=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
  const nm=s.querySelector('.tx strong'),loc=s.querySelector('.tx small'),mk=s.querySelector('.mk.sp'),tc=s.querySelector('.tc'),gl=s.querySelector('.nmr .gl'),lf=s.querySelector('.nmr svg.lf');const ns=getComputedStyle(nm);
  const brand=document.querySelector('#ozHeroT .ozHs:not(.sp) .mk b');
  const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};
  const lin=(getComputedStyle(s).backgroundImage.match(/linear-gradient\((.*)\)$/)||[])[1]||'';const stops=(lin.match(/rgb\([^)]*\)/g)||[]).map(rgb).sort((a,b)=>lum(b)-lum(a));
  const cr=c=>+((Math.max(lum(c),lum(stops[0]))+.05)/(Math.min(lum(c),lum(stops[0]))+.05)).toFixed(2);
  const ims=[...s.querySelectorAll('.ph img')].map(R),chip=document.getElementById('ozHeroN').getBoundingClientRect(),sl=s.getBoundingClientRect();
  const glc=gl?rgb(getComputedStyle(gl).backgroundImage.match(/rgb[a]?\([^)]*\)/)[0]):null;
  const txt=[nm,loc].map(R);
  return {h:Math.round(sl.height),others:[...document.querySelectorAll('#ozHeroT .ozHs:not(.sp)')].map(x=>Math.round(x.getBoundingClientRect().height)),
   gap:Math.round(nm.getBoundingClientRect().top-mk.getBoundingClientRect().bottom),fs:parseFloat(ns.fontSize),ff:ns.fontFamily,brandFf:brand?getComputedStyle(brand).fontFamily:null,fw:ns.fontWeight,it:ns.fontStyle,ls:ns.letterSpacing,
   whole:nm.scrollWidth<=nm.clientWidth+1,glW:gl?Math.round(gl.getBoundingClientRect().width):0,gold:!!glc&&glc[0]>220&&glc[1]>170&&glc[2]<120,lf:!!lf&&lf.getBoundingClientRect().width>0,
   order:!!gl&&R(nm).bottom<=gl.getBoundingClientRect().top+1&&gl.getBoundingClientRect().bottom<=R(loc).top+1&&R(loc).bottom<=tc.getBoundingClientRect().top+1,
   bind:txt.some(t=>ims.some(i=>ov(t,i))||ov(t,chip)||ov(t,mk.getBoundingClientRect())||ov(t,tc.getBoundingClientRect())),inSl:txt.every(t=>t.right<=sl.right&&t.bottom<=sl.bottom),
   crN:cr(rgb(ns.color)),crL:cr(rgb(getComputedStyle(loc).color)),page:document.documentElement.scrollWidth,dots:document.querySelectorAll('#ozHeroD i').length,chipT:document.getElementById('ozHeroN').textContent}});
 let g=await G();
 ok(g&&g.h===g.others[0],'slayt boyu aynı: '+JSON.stringify(g&&[g.h,g.others]));
 ok(g&&g.gap>=4&&g.gap<=12,'ad logo/Sponsorlu satırının hemen altında (≈8px): '+(g&&g.gap));
 ok(g&&g.fs>=16&&g.fs<=26&&g.ff===g.brandFf&&/Georgia/.test(g.ff)&&g.fw==='700'&&g.it==='italic'&&g.ls==='0.5px','ad 16-26px (AA1: ölçümle sığdırılır), "Özüne Dön" serif ailesi, 700, italik, +0.5px: '+JSON.stringify(g&&[g.fs,g.ff,g.brandFf,g.fw,g.it,g.ls]));
 ok(g&&g.whole,'ad kesilmeden sığmalı');
 ok(g&&g.glW>=48&&g.glW<=64&&g.gold&&g.lf,'altın çizgi (48-64px) ve yaprak SVG: '+JSON.stringify(g&&[g.glW,g.gold,g.lf]));
 ok(g&&g.order,'sıra: ad → çizgi/yaprak → il · ilçe → çipler');
 ok(g&&!g.bind&&g.inSl,'ad/il-ilçe fotoğraf, N/4 çipi, logo satırı ve çiplerle çakışmamalı');
 ok(g&&g.crN>=3&&g.crL>=4.5,'AA (ad büyük metin ≥3, il·ilçe ≥4.5): '+JSON.stringify(g&&[g.crN,g.crL]));
 ok(g&&g.page<=390&&g.dots===4&&g.chipT==='4/4','390px taşma yok, 4 nokta, 4/4');
 await p.addStyleTag({content:'html:root .ozBn.sp .tx small{font-size:17px!important}html:root .ozBn .tc span{font-size:13px!important}html:root .ozBn .mk.sp .spt{font-size:14px!important}'});await p.clock.runFor(100);
 g=await G();ok(g&&!g.bind,'büyük yazıda binme yok');
 const box=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});
 await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(80);await p.mouse.up();await p.clock.runFor(1600);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP')),'dokununca satıcı sayfası açılmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('z2-sponsor-ad BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('z2-sponsor-ad: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('z2-sponsor-ad HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
