// Z1: liste kartında seçenek etiketi yok — 390px, sahte veri. Çalıştırma: node tests/oz-ui/z1-etiketsiz.test.js
// Doğrulanan: kartta etiket yok; "+" sağ alt köşede ve tüm kart türlerinde aynı x; seçenekli üründe "+" küçük seçenek penceresini
// açar ve ekran okuyucu etiketi seçenek sayısını söyler; birimi çözülemeyen seçenekli kartta düz "N seçenek" (13px, kenarlıksız, AA);
// "≈ 1.200 ₺/kg'dan" tek satır ve harf aralığı daraltılmadan; kart yüksekliği ≤ Y2 (171/162/186/146); foto-yazı farkı ≤ 8px; 390px taşma yok.
const {chromium,open,enter}=require('./harness.js');
const MAX={p0:171,p1:162,p2:186,p3:146,p4:146};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;
  T.oz_products=[{id:'p0',description:'Soğuk sıkım naturel sızma zeytinyağı. Yumuşak içimli, meyvemsi aromalı.',net_content:'1000 gr'},{id:'p1',description:"Muğla Milas'ta yetişen çileklerden, evde yavaş pişirilerek hazırlanan reçel.",net_content:'800 gr'},
   {id:'p2',description:"Erzincan'ın yaylalarında, doğal ortamda üretilen kara kovan balı.",net_content:'800 gr'},{id:'p3',description:'Cam şişede test ürünüdür, canlıya geçmeden önce silinecek.',net_content:'1 lt'},{id:'p4',description:'Kavanoz ya da teneke.'}];
  T.oz_variants=[['p0','1kg',40000],['p0','3kg',110000],['p0','5kg',180000],['p1','800gr',50000],['p1','500gr',30000],['p1','300gr',20000],['p2','800gr',100000],['p2','500gr',60000],['p3','1 lt',9000],['p4','Kavanoz',5000],['p4','Teneke',9000]].map(([a,b,c],i)=>({product_id:a,label:b,price_kurus:c,stock:9,sort:i}));
  const N=['Naturel sızma zeytinyağı','Çilek reçeli','Erzincan kara kovan balı','Cam şişe süt (TEST)','Kekik'],I=['zeytin-zeytinyagi','recel','bal-recel','icecekler','baharat-bitki-cay'];
  R.oz_search_products=R.oz_search_products.slice(0,5).map((x,i)=>Object.assign({},x,{name:N[i],in_stock:true,rating_count:i===2?6:0,rating_avg:i===2?5:0,image:'https://img.test/'+I[i]+'.jpg',images:['https://img.test/'+I[i]+'.jpg']}));
  const d=R.oz_product_detail;d.id='p0';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 const M=await p.evaluate(()=>{const o={};[...document.querySelectorAll('#ozRoot .ozGc')].forEach(c=>{const R=e=>e.getBoundingClientRect();const r=R(c),im=R(c.querySelector('.im'));const kids=[...c.children].filter(x=>!x.classList.contains('im'));
  const tt=Math.min(...kids.map(x=>R(x).top)),tb=Math.max(...kids.map(x=>R(x).bottom));const b=c.querySelector('.ac .ozPlus');const a=R(b);const nv=c.querySelector('.ft .pr small.nvp'),uf=c.querySelector('.ft .pr small.ufrom');
  const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};const bg=rgb(getComputedStyle(c).backgroundColor);
  const cr=e=>{const k=rgb(getComputedStyle(e).color);return +((Math.max(lum(k),lum(bg))+.05)/(Math.min(lum(k),lum(bg))+.05)).toFixed(2)};
  o[c.dataset.pid]={pill:!!c.querySelector('.opt, .pl, .oa'),h:Math.round(r.height),diff:Math.abs(Math.round(im.height)-Math.round(tb-tt)),cx:Math.round(r.right-(a.left+a.right)/2),cy:Math.round(r.bottom-(a.top+a.bottom)/2),aria:b.getAttribute('aria-label'),
   nv:nv?{t:nv.textContent,fs:parseFloat(getComputedStyle(nv).fontSize),bw:getComputedStyle(nv).borderTopWidth,cr:cr(nv)}:null,
   uf:uf?{t:uf.textContent,lines:uf.getClientRects().length,ls:getComputedStyle(uf).letterSpacing,cr:cr(uf)}:null,inside:a.right<=r.right+1}});return {o,page:document.documentElement.scrollWidth}});
 const O=M.o;
 ok(Object.keys(O).length===5&&Object.values(O).every(x=>!x.pill),'kartlarda etiket olmamalı: '+JSON.stringify(Object.values(O).map(x=>x.pill)));
 ok(O.p0&&O.p0.aria==='Seçenek seç, 3 gramaj seçeneği'&&O.p1.aria==='Seçenek seç, 3 gramaj seçeneği'&&O.p2.aria==='Seçenek seç, 2 gramaj seçeneği'&&O.p4.aria==='Seçenek seç, 2 seçenek'&&O.p3.aria==='Sepete ekle','"+" ekran okuyucu etiketi seçenek sayısını içermeli: '+JSON.stringify(Object.values(O).map(x=>x.aria)));
 ok(O.p4&&O.p4.nv&&O.p4.nv.t==='2 seçenek'&&O.p4.nv.fs===13&&O.p4.nv.bw==='0px'&&O.p4.nv.cr>=4.5&&!O.p4.uf,'birimi çözülemeyen kartta düz "2 seçenek": '+JSON.stringify(O.p4));
 ok(['p0','p1','p2'].every(k=>O[k].uf&&!O[k].nv&&O[k].uf.lines===1&&O[k].uf.ls==='normal'&&O[k].uf.cr>=4.5),'birim fiyat satırı tek satır, harf aralığı normal, AA: '+JSON.stringify(['p0','p1','p2'].map(k=>O[k].uf)));
 ok(O.p2.uf&&O.p2.uf.t==="≈ 1.200 ₺/kg'dan",'bal satırı: '+JSON.stringify(O.p2.uf));
 Object.entries(O).forEach(([k,x])=>{ok(x.h<=MAX[k],k+' kart yüksekliği ≤ '+MAX[k]+': '+x.h);ok(x.diff<=8,k+' foto-yazı farkı ≤8: '+x.diff);ok(x.inside,k+' "+" kart içinde')});
 const cx=Object.values(O).map(x=>x.cx),cy=Object.values(O).map(x=>x.cy);
 ok(cx.every(v=>Math.abs(v-cx[0])<=1)&&cx[0]<=27&&cy.every(v=>v<=30),'"+" tüm kartlarda aynı x ve sağ alt köşede: '+JSON.stringify([cx,cy]));
 ok(M.page<=390,'390px taşma yok');
 try{await p.click('.ozGc[data-pid=p0] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('"+" tıklanamadı')}await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')&&!!document.querySelector('#ozRoot .ozPlH')),'"+" küçük seçenek penceresini açmalı, kartı açmamalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('z1-etiketsiz BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('z1-etiketsiz: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('z1-etiketsiz HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
