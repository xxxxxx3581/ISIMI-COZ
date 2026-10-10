// Q1-2: Keşfet üretici kartı fotoğraf geçişi — 390px, sahte veri, sahte zamanlayıcı. Çalıştırma: node tests/oz-ui/q1-kart.test.js
// Doğrulanan: sağdaki fotoğraf üreticinin ÜRÜN fotoğrafları arasında (kapak değil) 2 sn'de bir değişir; kart basılı
// tutulurken durur, bırakınca sürer; karta dokunma üretici sayfasını açar; krem alan düzeni (foto kutusu eşit boşluk) aynı.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.clock.install();
 await p.evaluate(()=>{const P=window.__OZ_FX.R.oz_producers;P.length=1;P[0].cover_url='https://img.test/bal-recel.jpg';P[0].products=[{id:'p0',name:'A',image:'https://img.test/recel.jpg'},{id:'p1',name:'B',image:'https://img.test/kuru-yemis.jpg'},{id:'p2',name:'C',image:null}];
  window.__OZ_FX.R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',categories:[]}});
 await enter(p);await p.clock.runFor(1500);
 // saati durdur, Keşfet'i yeniden çiz: geçiş bilinen anda başlar (0..100 ms), ölçüm deterministik olur
 await p.clock.pauseAt(Date.now()+5000);await p.evaluate(()=>OZ.go('home'));await p.clock.runFor(100);
 const S=()=>p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozPrds3 .ozPrdF');if(!b)return null;const im=[...b.querySelectorAll('img.fi')];const c=b.closest('.ozPrd2').getBoundingClientRect(),r=b.getBoundingClientRect();
  return {srcs:im.map(x=>x.src.split('/').pop()).join(','),on:im.findIndex(x=>x.classList.contains('on')),right:Math.round(c.right-r.right),top:Math.round(r.top-c.top),bot:Math.round(c.bottom-r.bottom)}});
 let s=await S();
 ok(s&&s.srcs==='recel.jpg,kuru-yemis.jpg','yalnız ürün fotoğrafları akmalı (kapak değil): '+JSON.stringify(s));
 ok(s&&s.on===0&&Math.abs(s.right-s.top)<=2&&Math.abs(s.top-s.bot)<=2,'başta ilk foto, kutu krem alanda eşit boşlukla: '+JSON.stringify(s));
 await p.clock.runFor(2500);s=await S();ok(s&&s.on===1,'2 sn sonra sonraki fotoğraf: '+JSON.stringify(s));
 const box=await p.$eval('#ozRoot .ozPrds3 .ozPrd2',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width*0.8,y:r.y+r.height/2}}).catch(()=>null);
 if(box){await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(6000);s=await S();ok(s&&s.on===1,'basılı tutunca durmalı: '+JSON.stringify(s));
  await p.mouse.move(5,5);await p.mouse.up();await p.clock.runFor(2000);s=await S();ok(s&&s.on===0,'bırakınca sürmeli: '+JSON.stringify(s));
  await p.mouse.click(box.x,box.y);await p.clock.runFor(1500);
  ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP')),'karta dokunma üretici sayfasını açmalı')}
 else fails.push('üretici kartı yok');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('q1-kart BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('q1-kart: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('q1-kart HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
