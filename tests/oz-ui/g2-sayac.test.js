// G2-1: kart "+" sayacı — 390px, sahte veri. Çalıştırma: node tests/oz-ui/g2-sayac.test.js
// Doğrulanan: tek seçenekli üründe "+" → "− 1 +"; "+" stok sınırında pasif; "−" 1'de sepetten çıkarır ve "+" geri gelir;
// "Sepeti gör" şeridi her adımda adetle aynı. Çok seçenekli üründe "+" paneli açar, sonra sayaç değil "+" üstünde adet rozeti.
// Keşfet "Tekrar sipariş ver" kartında da aynı sayaç.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{orderStatus:'delivered'}});
 await p.evaluate(()=>localStorage.removeItem('isimi_oz_cart'));
 await enter(p);await p.waitForTimeout(900);
 const D=(o)=>p.evaluate(o=>{const d=window.__OZ_FX.R.oz_product_detail;Object.assign(d,o.p);d.variants=o.v},o);
 const ctl=sel=>p.evaluate(s=>{const c=document.querySelector(s);if(!c)return null;const a=c.querySelector('.ac');const st=a.querySelector('.ozPStep');const pl=a.querySelector('.ozPlus');
  const s2=document.getElementById('ozCStrip');
  return {step:st?st.querySelector('b').textContent:null,plusDis:st?st.querySelectorAll('button')[1].disabled:null,plus:!!pl,badge:pl&&pl.querySelector('.bd')?pl.querySelector('.bd').textContent:null,strip:s2?(s2.innerText.match(/^\s*(\d+)/)||[])[1]||'?':null}},sel);
 // tıklanamayan öğe zaman aşımı yerine açık nedenle kaydedilir
 const click=async(sel,i)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(i||450);return true};

 // Keşfet "Tekrar sipariş ver" kartı (p0, tek seçenek)
 await D({p:{id:'p0'},v:[{id:'v1',label:'500 ml',price_kurus:65000,compare_at_kurus:null,stock:5,weight_g:600}]});
 const kr='#ozReo .ozKr[data-pid=p0]';
 ok(!!(await p.$(kr)),'Keşfet\'te tekrar sipariş kartı olmalı');
 if(await p.$(kr)){await click(kr+' .ozPlus',900);const k=await ctl(kr);ok(k&&k.step==='1'&&k.strip==='1','Keşfet kartında "− 1 +" ve şerit 1 olmalı: '+JSON.stringify(k));
  await click(kr+' .ozPStep button:first-child');const k2=await ctl(kr);ok(k2&&k2.plus&&!k2.step&&k2.strip===null,'"−" 1\'de çıkarmalı, "+" dönmeli, şerit kalkmalı: '+JSON.stringify(k2))}

 // liste: tek seçenekli ürün, stok 2
 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(1300);
 await D({p:{id:'p1',name:'Çam balı 1'},v:[{id:'v9',label:'450 g',price_kurus:30000,compare_at_kurus:null,stock:2,weight_g:500}]});
 const g1='.ozGc[data-pid=p1]';
 let c=await ctl(g1);ok(c&&c.plus&&!c.step,'başta "+" olmalı');
 await click(g1+' .ac .ozPlus',900);c=await ctl(g1);
 ok(c&&c.step==='1'&&c.plusDis===false&&c.strip==='1','ekleyince "− 1 +" ve şerit 1: '+JSON.stringify(c));
 await click(g1+' .ozPStep button:last-child');c=await ctl(g1);
 ok(c&&c.step==='2'&&c.plusDis===true&&c.strip==='2','stok 2\'de "+" pasif, şerit 2: '+JSON.stringify(c));
 await p.$eval(g1+' .ozPStep button:last-child',b=>b.click());await p.waitForTimeout(300);c=await ctl(g1);
 ok(c&&c.step==='2','pasif "+" stoğu aşmamalı: '+JSON.stringify(c));
 await click(g1+' .ozPStep button:first-child');c=await ctl(g1);ok(c&&c.step==='1'&&c.strip==='1','"−" azaltmalı: '+JSON.stringify(c));
 await click(g1+' .ozPStep button:first-child');c=await ctl(g1);ok(c&&c.plus&&!c.step&&c.strip===null,'1\'de "−" çıkarmalı, "+" geri gelmeli: '+JSON.stringify(c));

 // liste: çok seçenekli ürün
 await D({p:{id:'p2',name:'Ezine peyniri 2'},v:[{id:'va',label:'250 g',price_kurus:20000,stock:5},{id:'vb',label:'500 g',price_kurus:38000,stock:5}]});
 const g2='.ozGc[data-pid=p2]';
 await click(g2+' .ac .ozPlus',900);ok(!!(await p.$('.ozOv .ozOpt')),'çok seçenekte "+" panel açmalı');
 if(await p.$('.ozOv .ozOpt'))await click('.ozOv .ozOpt:not([disabled])',600);
 c=await ctl(g2);ok(c&&c.plus&&!c.step&&c.badge==='1'&&c.strip==='1','çok seçenekte sayaç değil "+" + rozet 1: '+JSON.stringify(c));
 await click(g2+' .ac .ozPlus',900);ok(!!(await p.$('.ozOv .ozOpt')),'rozetli "+" yine panel açmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('g2-sayac BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('g2-sayac: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('g2-sayac HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
