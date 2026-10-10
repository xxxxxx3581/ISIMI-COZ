// L: seçenekli ürün fiyat gösterimi — 390px, sahte veri (canlıdaki Zeytin/Reçel/Bal yapısıyla aynı). Çalıştırma: node tests/oz-ui/l-fiyat.test.js
// Doğrulanan kart metinleri: çok seçenekli → en düşük seçenek "X ₺'den" + "N seçenek · birim"; en ucuz seçeneğin indirimi
// yoksa çizili fiyat yok; tek seçenekli → fiyat (+ indirim çizili) + "≈ X ₺/kg"; miktar okunamazsa birim fiyat yok;
// seçenek verisi gelmezse eski gösterim. Keşfet "Tekrar sipariş ver" kartı da aynı. Panelde her seçenekte fiyat + birim
// fiyat, seçime göre alt çubuk fiyatı değişir.
const {chromium,open,enter}=require('./harness.js');
const V=[{product_id:'p0',label:'3kg',price_kurus:120000,compare_at_kurus:null,stock:20,sort:0},{product_id:'p0',label:'5kg',price_kurus:180000,compare_at_kurus:null,stock:20,sort:1},
 {product_id:'p1',label:'800gr',price_kurus:50000,compare_at_kurus:70000,stock:20,sort:0},{product_id:'p1',label:'500gr',price_kurus:30000,compare_at_kurus:50000,stock:20,sort:1},{product_id:'p1',label:'300gr',price_kurus:20000,compare_at_kurus:null,stock:20,sort:2},
 {product_id:'p2',label:'800gr',price_kurus:100000,compare_at_kurus:120000,stock:21,sort:0},
 {product_id:'p4',label:'Kavanoz',price_kurus:45000,compare_at_kurus:null,stock:5,sort:0}];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{orderStatus:'delivered'}});
 await p.evaluate(V=>{const T=window.__OZ_FX.T;T.oz_variants=V;T.oz_products=[{id:'p0',description:'Zeytinyağı',net_content:'1000gr'},{id:'p1',description:'Reçel',net_content:'800'},{id:'p2',description:'Bal',net_content:'800 gr'},{id:'p4',description:'Kekik',net_content:null}];
  const d=window.__OZ_FX.R.oz_product_detail;d.id='p0';d.net_content='1000gr';d.variants=[{id:'k3',label:'3kg',price_kurus:120000,compare_at_kurus:null,stock:20},{id:'k5',label:'5kg',price_kurus:180000,compare_at_kurus:null,stock:20}]},V);
 await enter(p);await p.waitForTimeout(1200);
 const pr=sel=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():null},sel);
 // Keşfet: Tekrar sipariş ver (p0, iki seçenek)
 const kr=await pr('#ozReo .ozKr[data-pid=p0] .pr');
 ok(kr==="1.200,00 ₺'den 2 seçenek · kg",'Keşfet kartı: '+kr);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 const c={};for(const id of ['p0','p1','p2','p3','p4'])c[id]=await pr('.ozGc[data-pid='+id+'] .pr');
 ok(c.p0==="1.200,00 ₺'den 2 seçenek · kg",'zeytinyağı (3kg/5kg): '+c.p0);
 ok(c.p1==="200,00 ₺'den 3 seçenek · gr",'reçel (en ucuz 300gr, indirimsiz): '+c.p1);
 ok(c.p2==='1.200,00 ₺ 1.000,00 ₺ ≈ 1.250,00 ₺/kg','bal tek seçenek (indirim + birim fiyat): '+c.p2);
 ok(c.p4==='450,00 ₺','miktarı okunamayan tek seçenekte birim fiyat olmamalı: '+c.p4);
 ok(c.p3&&!/den|seçenek|≈/.test(c.p3),'seçenek verisi gelmeyen üründe eski gösterim: '+c.p3);
 // "+" davranışı aynı: çok seçenekte panel
 await p.click('.ozGc[data-pid=p0] .ac .ozPlus');await p.waitForTimeout(800);
 ok(!!(await p.$('.ozOv .ozOpt')),'çok seçenekli üründe "+" seçenek panelini açmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // panel: seçenek fiyatları + birim fiyat, seçime göre alt çubuk
 await p.click('.ozGc[data-pid=p0] .sc');await p.waitForTimeout(1200);
 const vars=await p.evaluate(()=>[...document.querySelectorAll('.ozOv.ozPdS .ozVar')].map(b=>b.innerText.replace(/\s+/g,' ').trim()));
 ok(vars.length===2&&/3kg 1\.200,00 ₺ ≈ 400,00 ₺\/kg/.test(vars[0])&&/5kg 1\.800,00 ₺ ≈ 360,00 ₺\/kg/.test(vars[1]),'panel seçenekleri fiyat + birim fiyat: '+JSON.stringify(vars));
 const bar1=await pr('.ozOv.ozPdS .ozPdBar .pp');
 await p.click('.ozOv.ozPdS .ozVar:nth-child(2)');await p.waitForTimeout(300);
 const bar2=await pr('.ozOv.ozPdS .ozPdBar .pp');
 ok(bar1==='1.200,00 ₺'&&bar2==='1.800,00 ₺','alt çubuk fiyatı seçime göre değişmeli: '+bar1+' → '+bar2);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('l-fiyat BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('l-fiyat: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('l-fiyat HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
