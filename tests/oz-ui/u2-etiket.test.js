// U2 (Z1 ile güncellendi): seçenek etiketi kaldırıldı — 390px, sahte veri. Çalıştırma: node tests/oz-ui/u2-etiket.test.js
// Doğrulanan (Tüm ürünler, arama): kartta etiket yok; seçenekli üründe "+" ekran okuyucuya "Seçenek seç, N … seçeneği" der ve küçük
// seçenek penceresini açar (kart/panel değil); stoksuzda "+" pasif; toplam fiyat yok (birim fiyat satırı ya da "N seçenek");
// tek fiyatlı kart aynı; "+" yazılarla çakışmaz, büyük yazıda da.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .pr b{font-size:22px!important}html:root .ozGc .pr small{font-size:16px!important}html:root .ozGc .rt{font-size:17px!important}html:root .ozGc .ft .pr small{font-size:17px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;localStorage.removeItem('isimi_oz_cart');
  T.oz_products=[{id:'p0',description:'Zeytinyağı açıklaması',net_content:'1000 gr'},{id:'p1',description:'Süt',net_content:'1 L'},{id:'p2',description:'Tek fiyat'},{id:'p4',description:'Kavanoz'},{id:'p3',description:'Stoksuz'}];
  T.oz_variants=[{product_id:'p0',label:'1kg',price_kurus:40000,stock:9,sort:0},{product_id:'p0',label:'3kg',price_kurus:110000,stock:9,sort:1},{product_id:'p0',label:'5kg',price_kurus:180000,stock:9,sort:2},
   {product_id:'p1',label:'500 ml',price_kurus:5000,stock:9,sort:0},{product_id:'p1',label:'1 L',price_kurus:9000,stock:9,sort:1},
   {product_id:'p2',label:'1 L',price_kurus:9000,compare_at_kurus:12000,stock:9,sort:0},
   {product_id:'p4',label:'Kavanoz',price_kurus:5000,stock:9,sort:0},{product_id:'p4',label:'Teneke',price_kurus:9000,stock:9,sort:1},{product_id:'p3',label:'250 g',price_kurus:5000,stock:0,sort:0},{product_id:'p3',label:'500 g',price_kurus:9000,stock:0,sort:1}];
  const d=R.oz_product_detail;d.id='p0';d.name='Zeytinyağı';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 /* Z1: etiket kaldırıldı — seçenek bilgisi "+"ın ekran okuyucu etiketinde; birim fiyat satırı yoksa düz "N seçenek" */
 const G=()=>p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozGc')].map(c=>{const pl=c.querySelector('.ac .ozPlus, .ac .ozPStep');const ar=pl.getBoundingClientRect(),cr0=c.getBoundingClientRect();
  const ov=(a,b)=>a&&b&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;const box=e.getBoundingClientRect();while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  const others=['.nm','.ds','.tr','.ft .pr'].flatMap(q=>glyphs(c.querySelector(q)));
  return {id:c.dataset.pid,opt:!!c.querySelector('.ft .opt'),aria:pl.getAttribute('aria-label'),dis:!!pl.disabled,pr:((c.querySelector('.ft .pr')||{}).innerText||'').replace(/\s+/g,' ').trim()||null,
   hit:others.some(g=>ov(g,ar)),inside:ar.right<=cr0.right+1&&ar.bottom<=cr0.bottom+1}}));
 for(const [where,go] of [['Tüm ürünler',()=>OZ.go('plist',{seller:'s1'})],['Arama',()=>OZ.go('search',{q:'a'})]]){
  await p.evaluate(go);await p.waitForTimeout(1500);
  const L=await G();const M={};L.forEach(x=>M[x.id]=x);const t='['+where+'] ';
  ok(L.every(x=>!x.opt),t+'kartlarda seçenek etiketi olmamalı (Z1)');
  ok(M.p0&&M.p0.aria==='Seçenek seç, 3 gramaj seçeneği'&&M.p1&&M.p1.aria==='Seçenek seç, 2 hacim seçeneği'&&M.p4&&M.p4.aria==='Seçenek seç, 2 seçenek',t+'"+" ekran okuyucu etiketi seçenek sayısı: '+JSON.stringify([M.p0&&M.p0.aria,M.p1&&M.p1.aria,M.p4&&M.p4.aria]));
  ok(M.p3&&M.p3.dis&&M.p3.aria==='Tükendi'&&/^≈ [\d.]+ ₺\/kg'dan$/.test(M.p3.pr||''),t+'stoksuz üründe "+" pasif, birim fiyat okunur: '+JSON.stringify(M.p3));
  ['p0','p1','p4'].forEach(k=>{const x=M[k];if(!x){fails.push(t+k+' yok');return}
   ok(!x.hit&&x.inside,t+k+' "+" yazılarla çakışmamalı/taşmamalı: '+JSON.stringify(x));
   ok(/^≈ [\d.]+ ₺\/(kg'dan|L'den)$/.test(x.pr||'')||x.pr==='2 seçenek',t+k+' çok seçenekte toplam fiyat yok (birim fiyat satırı ya da "N seçenek"): '+x.pr)});
  ok(M.p2&&!M.p2.opt&&/90,00\s₺/.test(M.p2.pr||'')&&M.p2.aria==='Sepete ekle',t+'tek fiyatlı üründe fiyat aynı, "+" Sepete ekle: '+JSON.stringify(M.p2));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),t+'390px taşma olmamalı');
 }
 // "+" → küçük seçenek penceresi, kart/panel değil
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 try{await p.click('.ozGc[data-pid=p0] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('"+" tıklanamadı')}await p.waitForTimeout(900);
 const s=await p.evaluate(()=>({pk:!!document.querySelector('.ozOv.ozPkS'),full:!!document.querySelector('.ozOv.ozPdS'),rows:document.querySelectorAll('.ozOv.ozPkS .ozPkO').length,list:!!document.querySelector('#ozRoot .ozPlH')}));
 ok(s.pk&&!s.full&&s.rows===2&&s.list,'"+" küçük seçenek penceresini açmalı, kartı açmamalı: '+JSON.stringify(s));
 ok(st.calls.filter(c=>c[0]==='oz_product_detail').length===1,'"+" ppPlus ile tek ürün okuması yapmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // büyük yazı
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);
 const L=await G();
 L.forEach(x=>ok(!x.hit&&x.inside,'[büyük yazı] '+x.id+' çakışma/taşma olmamalı: '+JSON.stringify(x)));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('u2-etiket BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('u2-etiket: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('u2-etiket HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
