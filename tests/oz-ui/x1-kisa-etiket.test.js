// X1 (Z1 ile güncellendi): seçenek etiketi kaldırıldı — 390px, sahte veri. Çalıştırma: node tests/oz-ui/x1-kisa-etiket.test.js
// Doğrulanan: kartta etiket yok; "+" ekran okuyucu etiketi seçenek sayısını söyler ("Seçenek seç, 3 gramaj seçeneği");
// birim fiyat satırı olmayan kartta düz "N seçenek" (13px, AA); "+" tıklaması küçük seçenek penceresini açar, kartı/paneli açmaz;
// "+" yazılarla çakışmaz, büyük yazıda binme yok.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .ft .pr small{font-size:17px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;
  T.oz_products=[{id:'p0',description:'Zeytinyağı',net_content:'1000 gr'},{id:'p1',description:'Süt',net_content:'1 L'},{id:'p4',description:'Kavanoz'}];
  T.oz_variants=[{product_id:'p0',label:'1kg',price_kurus:40000,stock:9,sort:0},{product_id:'p0',label:'3kg',price_kurus:110000,stock:9,sort:1},{product_id:'p0',label:'5kg',price_kurus:180000,stock:9,sort:2},
   {product_id:'p1',label:'500 ml',price_kurus:5000,stock:9,sort:0},{product_id:'p1',label:'1 L',price_kurus:9000,stock:9,sort:1},
   {product_id:'p4',label:'Kavanoz',price_kurus:5000,stock:9,sort:0},{product_id:'p4',label:'Teneke',price_kurus:9000,stock:9,sort:1}];
  const d=R.oz_product_detail;d.id='p0';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 /* Z1: etiket kaldırıldı — aynı bilgi "+"ın ekran okuyucu etiketinde; birim fiyat satırı yoksa düz "N seçenek" */
 const G=()=>p.evaluate(()=>{const o={};[...document.querySelectorAll('#ozRoot .ozGc')].forEach(c=>{const b=c.querySelector('.ac .ozPlus');if(!b)return;const a=b.getBoundingClientRect();const nv=c.querySelector('.ft .pr small.nvp');
  const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};const bg=rgb(getComputedStyle(c).backgroundColor);
  const ov=(x,y)=>x.left<y.right-1&&y.left<x.right-1&&x.top<y.bottom-1&&y.top<x.bottom-1;
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;const box=e.getBoundingClientRect();while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  o[c.dataset.pid]={opt:!!c.querySelector('.ft .opt, .ft .pl'),aria:b.getAttribute('aria-label'),nv:nv?nv.textContent:null,nvFs:nv?parseFloat(getComputedStyle(nv).fontSize):0,
   nvCr:nv?(()=>{const k=rgb(getComputedStyle(nv).color);return +((Math.max(lum(k),lum(bg))+.05)/(Math.min(lum(k),lum(bg))+.05)).toFixed(2)})():null,
   hit:['.nm','.ds','.ft .pr'].flatMap(q=>glyphs(c.querySelector(q))).some(g=>ov(g,a)),inside:a.right<=c.getBoundingClientRect().right+1}});return o});
 let M=await G();
 ok(Object.values(M).every(x=>!x.opt),'kartlarda seçenek etiketi olmamalı (Z1): '+JSON.stringify(M));
 ok(M.p0&&M.p0.aria==='Seçenek seç, 3 gramaj seçeneği'&&M.p1&&M.p1.aria==='Seçenek seç, 2 hacim seçeneği'&&M.p4&&M.p4.aria==='Seçenek seç, 2 seçenek','"+" ekran okuyucu etiketi seçenek sayısını söylemeli: '+JSON.stringify([M.p0&&M.p0.aria,M.p1&&M.p1.aria,M.p4&&M.p4.aria]));
 ok(M.p4&&M.p4.nv==='2 seçenek'&&M.p4.nvFs===13&&M.p4.nvCr>=4.5&&M.p0&&M.p0.nv===null,'birim satırı olmayan kartta düz "2 seçenek" (13px, AA), olanda yok: '+JSON.stringify([M.p4,M.p0&&M.p0.nv]));
 Object.entries(M).forEach(([k,x])=>ok(!x.hit&&x.inside,k+' "+" yazılarla çakışmamalı: '+JSON.stringify(x)));
 // "+" tıklaması → küçük pencere
 try{await p.click('.ozGc[data-pid=p0] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('"+" tıklanamadı')}await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')&&!!document.querySelector('#ozRoot .ozPlH')),'"+" küçük seçenek penceresini açmalı, kartı açmamalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // büyük yazı
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);M=await G();
 Object.entries(M).forEach(([k,x])=>ok(!x.hit&&x.inside,'[büyük yazı] '+k+' binme/taşma yok: '+JSON.stringify(x)));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390px taşma yok');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('x1-kisa-etiket BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('x1-kisa-etiket: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('x1-kisa-etiket HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
