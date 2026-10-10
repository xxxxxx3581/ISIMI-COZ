// L/M: seçenekli ürün fiyat gösterimi — 390px, sahte veri (canlıdaki Zeytin/Reçel/Bal yapısıyla aynı). Çalıştırma: node tests/oz-ui/l-fiyat.test.js
// Doğrulanan kart metinleri: çok seçenekli → kartta HİÇ fiyat yok (M), yalnız "N gramaj/hacim seçeneği" (T1-d); tek seçenekli → fiyat (+ indirim çizili) + "≈ X ₺/kg"; miktar okunamazsa birim fiyat yok;
// seçenek verisi gelmezse eski gösterim. Keşfet "Tekrar sipariş ver" kartı da aynı. Panel (M): çok seçenekte başta seçim
// yok, alt çubukta "Seçenek seç" + pasif buton; seçenek satırında fiyat, çizili eski fiyat, birim fiyat; seçince fiyat ve
// aktif "Sepete ekle", eklenince sayaç ve sepete seçilen seçeneğin id'si; seçeneksiz üründe panel eskisi gibi.
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
  const d=window.__OZ_FX.R.oz_product_detail;d.id='p0';d.net_content='1000gr';d.variants=[{id:'k3',label:'3kg',price_kurus:120000,compare_at_kurus:null,stock:20},{id:'k5',label:'5kg',price_kurus:180000,compare_at_kurus:200000,stock:20}]},V);
 await enter(p);await p.waitForTimeout(1200);
 const clk=async(sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||300);return true};
 const pr=sel=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():null},sel);
 // Keşfet: Tekrar sipariş ver (p0, iki seçenek)
 const kr=await pr('#ozReo .ozKr[data-pid=p0] .pr');
 ok(kr==='2 gramaj seçeneği'&&!/₺/.test(kr),'Keşfet kartında seçenekli üründe fiyat olmamalı: '+kr);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 const c={};for(const id of ['p0','p1','p2','p3','p4'])c[id]=await pr('.ozGc[data-pid='+id+'] .pr');
 ok(c.p0==='2 gramaj seçeneği'&&!/₺/.test(c.p0),'zeytinyağı (3kg/5kg) kartında fiyat olmamalı: '+c.p0);
 ok(c.p1==='3 gramaj seçeneği'&&!/₺/.test(c.p1),'reçel kartında fiyat/eski fiyat olmamalı: '+c.p1);
 ok(c.p2==='1.200,00 ₺ 1.000,00 ₺ ≈ 1.250,00 ₺/kg','bal tek seçenek (indirim + birim fiyat): '+c.p2);
 ok(c.p4==='450,00 ₺','miktarı okunamayan tek seçenekte birim fiyat olmamalı: '+c.p4);
 ok(c.p3&&!/den|seçenek|≈/.test(c.p3),'seçenek verisi gelmeyen üründe eski gösterim: '+c.p3);
 // "+" davranışı aynı: çok seçenekte panel
 await clk('.ozGc[data-pid=p0] .ac .ozPlus',800);
 ok(!!(await p.$('.ozOv.ozPkS .ozPkO'))&&!(await p.$('.ozOv.ozPdS')),'çok seçenekli üründe "+" küçük seçenek penceresini açmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // kart/fotoğraf dokunuşu paneli açar; çok seçenekte başta seçim yok
 await clk('.ozGc[data-pid=p0] .sc',1200);
 const S='.ozOv.ozPdS';
 const st0=await p.evaluate(S=>{const o=document.querySelector(S);if(!o)return null;const b=o.querySelector('.ozPdBar');const btn=b&&b.querySelector('button');
  return {on:o.querySelectorAll('.ozVar.on').length,bar:b?b.querySelector('.pp').innerText.trim():'',btn:btn?btn.innerText.trim():'',dis:btn?btn.disabled:null,add:!!o.querySelector('[data-a=addCart]'),price:!!o.querySelector('.ozPrice')}},S);
 ok(st0,'karta dokununca ürün paneli açılmalı');
 if(st0){ok(st0.on===0&&!st0.price,'çok seçenekte başta seçim ve üst fiyat olmamalı: '+JSON.stringify(st0));
  ok(st0.bar==='Seçenek seç'&&st0.btn==='Sepete ekle'&&st0.dis===true&&!st0.add,'seçim yokken "Seçenek seç" + pasif buton: '+JSON.stringify(st0));
  const vars=await p.evaluate(S=>[...document.querySelectorAll(S+' .ozVar')].map(b=>b.innerText.replace(/\s+/g,' ').trim()),S);
  ok(vars.length===2&&/3kg 1\.200,00 ₺ ≈ 400,00 ₺\/kg/.test(vars[0])&&/5kg 1\.800,00 ₺ 2\.000,00 ₺ ≈ 360,00 ₺\/kg/.test(vars[1]),'seçenek satırları: etiket, fiyat, çizili eski fiyat, birim fiyat: '+JSON.stringify(vars));
  await clk(S+' .ozVar:nth-child(1)',300);
  const st1=await p.evaluate(S=>{const b=document.querySelector(S+' .ozPdBar');const a=b.querySelector('[data-a=addCart]');return {bar:b.querySelector('.pp').innerText.replace(/\s+/g,' ').trim(),add:!!a&&!a.disabled}},S);
  ok(st1.bar==='1.200,00 ₺'&&st1.add,'seçince fiyat ve aktif "Sepete ekle": '+JSON.stringify(st1));
  await clk(S+' .ozPdBar [data-a=addCart]',400);
  const st2=await p.evaluate(S=>{const s=document.querySelector(S+' .ozPdBar .ozPStep b');return {step:s?s.textContent:null,cart:JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').map(x=>x.variant_id+':'+x.qty).join(',')}},S);
  ok(st2.step==='1'&&st2.cart==='k3:1','eklenince sayaç ve sepette seçilen seçenek (k3): '+JSON.stringify(st2));
  await clk(S+' .ozVar:nth-child(2)',300);
  const bar2=await p.evaluate(S=>document.querySelector(S+' .ozPdBar .pp').innerText.replace(/\s+/g,' ').trim(),S);
  ok(bar2==='1.800,00 ₺ 2.000,00 ₺','başka seçenekte fiyat güncellenmeli: '+bar2);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);}
 // seçeneksiz (tek seçenekli) ürün paneli eskisi gibi: seçim hazır, fiyat ve aktif buton
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p2';d.variants=[{id:'b8',label:'800gr',price_kurus:100000,compare_at_kurus:120000,stock:21}]});
 await clk('.ozGc[data-pid=p2] .sc',1200);
 const one=await p.evaluate(S=>{const o=document.querySelector(S);if(!o)return null;const a=o.querySelector('[data-a=addCart]');return {vars:o.querySelectorAll('.ozVar').length,bar:o.querySelector('.ozPdBar .pp').innerText.replace(/\s+/g,' ').trim(),add:!!a&&!a.disabled,price:!!o.querySelector('.ozPrice b')}},S);
 ok(one&&one.vars===0&&one.price&&one.add&&one.bar==='1.000,00 ₺ 1.200,00 ₺','seçeneksiz üründe panel değişmemeli: '+JSON.stringify(one));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('l-fiyat BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('l-fiyat: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('l-fiyat HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
