// X1: liste kartındaki seçenek etiketi küçük — 390px, sahte veri. Çalıştırma: node tests/oz-ui/x1-kisa-etiket.test.js
// Doğrulanan: metin kısa ("3 gramaj" / "2 hacim" / "2 seçenek"), ekran okuyucu etiketi tam ifade ("3 gramaj seçeneği");
// görsel hap ≤28px yükseklik, 13px yazı, altın kenar/yazı, AA; dokunma alanı ≥44px yükseklik ve görselden küçük değil;
// "+"ın hemen solunda (≤12px) ve aynı satırda; tıklama küçük seçenek penceresini açar, kartı/paneli açmaz; büyük yazıda binme yok.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .opt .pl{font-size:20px!important}';
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
 const G=()=>p.evaluate(()=>{const o={};[...document.querySelectorAll('#ozRoot .ozGc')].forEach(c=>{const b=c.querySelector('.ft .opt');if(!b)return;const pl=b.querySelector('.pl')||b;const r=b.getBoundingClientRect(),v=pl.getBoundingClientRect(),a=c.querySelector('.ac .ozPlus').getBoundingClientRect();
  const s=getComputedStyle(pl);const rgb=x=>{const m=x.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};const mix=(f,k)=>({r:f.r*f.a+k.r*(1-f.a),g:f.g*f.a+k.g*(1-f.a),b:f.b*f.a+k.b*(1-f.a),a:1});
  const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k.r)+.7152*f(k.g)+.0722*f(k.b)};const bg=mix(rgb(s.backgroundColor),rgb(getComputedStyle(c).backgroundColor));const col=rgb(s.color);
  const ov=(x,y)=>x.left<y.right-1&&y.left<x.right-1&&x.top<y.bottom-1&&y.top<x.bottom-1;const nm=c.querySelector('.nm').getBoundingClientRect(),ds=c.querySelector('.ds');
  o[c.dataset.pid]={t:pl.textContent,aria:b.getAttribute('aria-label'),vh:Math.round(v.height),hh:Math.round(r.height),hw:Math.round(r.width),vw:Math.round(v.width),fs:parseFloat(s.fontSize),
   gold:col.r>220&&col.g>170&&col.b<120,bd:s.borderTopColor,cr:+((lum(col)+.05)/(lum(bg)+.05)).toFixed(2),gap:Math.round(a.left-r.right),row:v.top<a.bottom&&v.bottom>a.top,
   hit:ov(v,a)||ov(v,nm)||(ds&&ov(v,ds.getBoundingClientRect())),inside:r.right<=c.getBoundingClientRect().right+1}});return o});
 let M=await G();
 ok(M.p0&&M.p0.t==='3 gramaj'&&M.p1&&M.p1.t==='2 hacim'&&M.p4&&M.p4.t==='2 seçenek','kısa metinler: '+JSON.stringify([M.p0&&M.p0.t,M.p1&&M.p1.t,M.p4&&M.p4.t]));
 ok(M.p0&&M.p0.aria==='3 gramaj seçeneği'&&M.p1.aria==='2 hacim seçeneği'&&M.p4.aria==='2 seçenek','ekran okuyucu etiketi tam ifade: '+JSON.stringify([M.p0&&M.p0.aria,M.p1&&M.p1.aria,M.p4&&M.p4.aria]));
 ['p0','p1','p4'].forEach(k=>{const x=M[k];if(!x)return;
  ok(x.vh>=22&&x.vh<=28&&x.fs===13,k+' görsel ≤28px, 13px yazı: '+JSON.stringify(x));
  ok(x.hh>=44&&x.hh>=x.vh&&x.hw>=x.vw,k+' dokunma alanı ≥44px, görselden küçük değil: '+JSON.stringify(x));
  ok(x.gold&&/242, 193, 78/.test(x.bd)&&x.cr>=4.5,k+' altın yazı/kenar, AA: '+JSON.stringify(x));
  ok(x.row&&x.gap>=0&&x.gap<=12&&!x.hit&&x.inside,k+' "+"ın hemen solunda, aynı satır, binme yok: '+JSON.stringify(x))});
 // tıklama → küçük pencere
 try{await p.click('.ozGc[data-pid=p0] .ft .opt',{timeout:3000})}catch(e){fails.push('etiket tıklanamadı')}await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')&&!!document.querySelector('#ozRoot .ozPlH')),'etiket küçük seçenek penceresini açmalı, kartı açmamalı');
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
