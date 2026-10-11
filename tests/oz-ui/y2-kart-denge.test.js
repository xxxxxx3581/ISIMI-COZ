// Y2: liste kartı alt blok iki sütun + fotoğraf/yazı dengesi — 390px, sahte veri. Çalıştırma: node tests/oz-ui/y2-kart-denge.test.js
// Doğrulanan (zeytinyağı, çilek, bal (yorumlu), süt (tek fiyatlı)): Z1 ile etiket kalktı — "+" sağ alt köşede, ekran okuyucu seçenek
// sayısını söyler; "+" dört kartta aynı x; sol sütunda fiyat / "≈ X ₺/kg'dan"; "+" küçük seçenek penceresini açar, kartı açmaz;
// fotoğraf alanı yüksekliği ile yazı bloğu farkı ≤ 8px (boş bant yok), fotoğraf ≥120px; iç boşluk 12px, foto-metin arası 12px;
// seçenekli kart yüksekliği eskisinden büyük değil (eski: 171 / 162 / 186), süt ≤ 146 (foto en az 120 + 12px boşluk);
// kalp sağ üstte; büyük yazıda binme yok; AA; 390px taşma yok.
const {chromium,open,enter}=require('./harness.js');
const OLD={p0:171,p1:162,p2:186,p3:146};
const BIG='html:root .ozGc .nm{font-size:20px!important}html:root .ozGc .ds{font-size:16px!important}html:root .ozGc .pr b{font-size:20px!important}html:root .ozGc .pr small{font-size:15px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;
  T.oz_products=[{id:'p0',description:'Soğuk sıkım naturel sızma zeytinyağı. Yumuşak içimli, meyvemsi aromalı.',net_content:'1000 gr'},{id:'p1',description:"Muğla Milas'ta yetişen çileklerden, evde yavaş pişirilerek hazırlanan reçel.",net_content:'800 gr'},
   {id:'p2',description:"Erzincan'ın yaylalarında, doğal ortamda üretilen kara kovan balı.",net_content:'800 gr'},{id:'p3',description:'Cam şişede test ürünüdür, canlıya geçmeden önce silinecek.',net_content:'1 lt'}];
  T.oz_variants=[['p0','1kg',40000],['p0','3kg',110000],['p0','5kg',180000],['p1','800gr',50000],['p1','500gr',30000],['p1','300gr',20000],['p2','800gr',100000],['p2','500gr',60000],['p3','1 lt',9000]].map(([a,b,c],i)=>({product_id:a,label:b,price_kurus:c,stock:9,sort:i}));
  const N=['Naturel sızma zeytinyağı','Çilek reçeli','Erzincan kara kovan balı','Cam şişe süt (TEST)'],I=['zeytin-zeytinyagi','recel','bal-recel','icecekler'];
  R.oz_search_products=R.oz_search_products.slice(0,4).map((x,i)=>Object.assign({},x,{name:N[i],in_stock:true,rating_count:i===2?6:0,rating_avg:i===2?5:0,image:'https://img.test/'+I[i]+'.jpg',images:['https://img.test/'+I[i]+'.jpg']}));
  const d=R.oz_product_detail;d.id='p0';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 const G=()=>p.evaluate(()=>{const o={};[...document.querySelectorAll('#ozRoot .ozGc')].forEach(c=>{const R=e=>e?e.getBoundingClientRect():null;const r=R(c),im=R(c.querySelector('.im'));
  const kids=[...c.children].filter(x=>!x.classList.contains('im'));const tt=Math.min(...kids.map(x=>R(x).top)),tb=Math.max(...kids.map(x=>R(x).bottom)),tl=Math.min(...kids.map(x=>R(x).left));
  const ob=c.querySelector('.ft .opt'),pl=c.querySelector('.ft .opt .pl'),plus=c.querySelector('.ac .ozPlus, .ac .ozPStep');const pr=c.querySelector('.ft .pr');const a=R(plus),v=R(pl),b=R(ob),fv=R(c.querySelector('.tr .ozFav'));
  const ov=(x,y)=>x&&y&&x.left<y.right-1&&y.left<x.right-1&&x.top<y.bottom-1&&y.top<x.bottom-1;
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;const box=e.getBoundingClientRect();while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  const txt=['.nm','.ds','.tr','.ft .pr'].flatMap(q=>glyphs(c.querySelector(q)));
  const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};const bg=rgb(getComputedStyle(c).backgroundColor);
  const crs=[...c.querySelectorAll('.ft .pr b, .ft .pr small, .ft .pr s')].map(e=>{const k=rgb(getComputedStyle(e).color);return +((Math.max(lum(k),lum(bg))+.05)/(Math.min(lum(k),lum(bg))+.05)).toFixed(2)});
  o[c.dataset.pid]={h:Math.round(r.height),imH:Math.round(im.height),txH:Math.round(tb-tt),padL:Math.round(im.left-r.left),padT:Math.round(im.top-r.top),gapX:Math.round(tl-im.right),
   plusCx:a?Math.round((a.left+a.right)/2-r.left):null,pill:!!pl,above:!!(v&&a&&v.bottom<=a.top+1&&Math.abs((v.left+v.right)/2-(a.left+a.right)/2)<=2),noCover:!(b&&a&&ov(b,a)),
   prLeft:!!(pr&&a&&Math.max(...glyphs(pr).map(g=>g.right))<=a.left),aria:plus?plus.getAttribute('aria-label'):null,pr:pr?pr.innerText.replace(/\s+/g,' ').trim():null,favTR:!!fv&&r.right-fv.right<=16&&fv.top-r.top<=16,
   bind:!!v&&(txt.some(g=>ov(g,v))||ov(v,a))||txt.some(g=>ov(g,a)),inside:[...c.querySelectorAll('*')].every(e=>{const q=e.getBoundingClientRect();return !q.width||q.right<=r.right+1}),crs}});
  return {o,page:document.documentElement.scrollWidth}});
 let {o:M,page}=await G();
 ['p0','p1','p2','p3'].forEach(k=>{const x=M[k];if(!x){fails.push(k+' kartı yok');return}
  ok(Math.abs(x.imH-x.txH)<=8&&x.imH>=120,k+' fotoğraf alanı yazı bloğunu izlemeli (fark ≤8, ≥120): '+JSON.stringify([x.imH,x.txH]));
  ok(Math.abs(x.padL-13)<=1&&Math.abs(x.padT-13)<=1&&Math.abs(x.gapX-12)<=1,k+' iç boşluk 12px, foto-metin 12px: '+JSON.stringify([x.padL,x.padT,x.gapX]));
  ok(x.h<=OLD[k],k+' kart yüksekliği ≤ '+OLD[k]+': '+x.h);
  ok(x.favTR&&!x.bind&&x.inside&&x.crs.every(c=>c>=4.5),k+' kalp sağ üstte, binme/taşma yok, AA: '+JSON.stringify(x))});
 ['p0','p1','p2'].forEach(k=>{const x=M[k]||{};ok(!x.pill&&x.prLeft&&/^Seçenek seç, \d+ gramaj seçeneği$/.test(x.aria||'')&&/^≈ [\d.]+ ₺\/kg'dan$/.test(x.pr||''),k+' Z1: etiket yok, "+" seçenek sayısını söyler; solda birim fiyat: '+JSON.stringify(x))});
 ok(M.p3&&!M.p3.pill&&M.p3.prLeft&&/^90,00\s₺ ≈ 90,00\s₺\/L$/.test(M.p3.pr||''),'süt: etiket yok, solda fiyat + birim fiyat: '+JSON.stringify(M.p3));
 const xs=['p0','p1','p2','p3'].map(k=>M[k]&&M[k].plusCx);ok(xs.every(x=>x!=null&&Math.abs(x-xs[0])<=1),'"+" dört kartta aynı x: '+JSON.stringify(xs));
 ok(page<=390,'390px taşma yok: '+page);
 // etiket → küçük pencere
 try{await p.click('.ozGc[data-pid=p0] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('"+" tıklanamadı')}await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')&&!!document.querySelector('#ozRoot .ozPlH')),'"+" küçük seçenek penceresini açmalı, kartı açmamalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // büyük yazı
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);({o:M}=await G());
 Object.entries(M).forEach(([k,x])=>ok(!x.bind&&x.inside&&Math.abs(x.imH-x.txH)<=8,'[büyük yazı] '+k+' binme/taşma yok, foto yazıyı izler: '+JSON.stringify(x)));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('y2-kart-denge BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('y2-kart-denge: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('y2-kart-denge HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
