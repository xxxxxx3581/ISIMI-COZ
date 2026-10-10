// S2: ortak ürün liste kartı yatay — 390px, sahte veri. Çalıştırma: node tests/oz-ui/s2-kart.test.js
// Doğrulanan (Tüm ürünler ve arama): tek sütun, kart tam satır genişliğinde; solda kare foto, sağda ad/açıklama/fiyat;
// "+" kartın sağ alt köşesinde; açıklama en çok 2 satır. Büyük yazı boyutunda (≈1.4x) yazılar "+" ile ve birbiriyle üst üste
// binmez, kart dışına taşmaz. (Panel, küçük pencere, rozet davranışları o1/a2/g2 testlerinde.)
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .pr b{font-size:22px!important}html:root .ozGc .pr small{font-size:16px!important}html:root .ozGc .rt{font-size:17px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T;T.oz_products=[{id:'p0',description:'Ayvalık zeytinlerinden soğuk sıkım, ilk hasat; uzun bir açıklama metni burada devam ediyor ve üçüncü satıra taşmak istiyor.',net_content:'1 L'},{id:'p1',description:'Reçel'}];
  T.oz_variants=[{product_id:'p1',label:'800gr',price_kurus:50000,compare_at_kurus:70000,stock:20,sort:0},{product_id:'p1',label:'500gr',price_kurus:30000,stock:20,sort:1},{product_id:'p0',label:'1 L',price_kurus:9000,stock:3,sort:0}]});
 await enter(p);await p.waitForTimeout(600);
 const geo=()=>p.evaluate(()=>{const R=e=>e?e.getBoundingClientRect():null;const list=document.querySelector('#ozRoot .ozGcs');const cs=[...list.querySelectorAll('.ozGc')];
  const ov=(a,b)=>a&&b&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
  /* gerçek yazı satırlarının kutuları (dolgu değil): Range.getClientRects */
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);const box=e.getBoundingClientRect();
   /* satır kırpmasıyla (line-clamp) gizlenen satırlar görünmez: öğenin kutusu dışındaki satırlar sayılmaz */
   out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.height>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  return {lw:Math.round(R(list).width),cards:cs.map(c=>{const r=R(c),im=R(c.querySelector('.im')),nm=R(c.querySelector('.nm')),ds=R(c.querySelector('.ds')),ft=R(c.querySelector('.ft')),rt=R(c.querySelector('.rt')),ac=R(c.querySelector('.ac'));
   const texts=[nm,ds,ft,rt].filter(Boolean);const dsEl=c.querySelector('.ds');const gl=['.nm','.ds','.ft .pr','.rt'].flatMap(q=>glyphs(c.querySelector(q)));
   const hit=gl.filter(t=>ov(t,ac)).map(t=>[Math.round(t.left),Math.round(t.top),Math.round(t.right),Math.round(t.bottom)]);
   return {hit:hit.length?JSON.stringify(hit)+' ac '+JSON.stringify([Math.round(ac.left),Math.round(ac.top),Math.round(ac.right),Math.round(ac.bottom)]):'',w:Math.round(r.width),top:Math.round(r.top),bot:Math.round(r.bottom),photoLeft:Math.round(im.left-r.left),square:Math.abs(im.width-im.height)<2,textRight:Math.round(nm.left-im.right),
    plusR:Math.round(r.right-ac.right),plusB:Math.round(r.bottom-ac.bottom),plusHitsText:gl.some(t=>ov(t,ac)),textsOverlap:texts.some((a,i)=>texts.some((b,j)=>j>i&&ov(a,b))),
    inside:texts.every(t=>t.right<=r.right+1&&t.bottom<=r.bottom+1)&&im.bottom<=r.bottom+1,dsLines:dsEl?Math.round(ds.height/parseFloat(getComputedStyle(dsEl).lineHeight)):0}})}});
 async function check(where,big){
  const g=await geo();const tag='['+where+(big?' büyük yazı':'')+'] ';
  ok(g.cards.length>=3,tag+'kart sayısı');
  g.cards.forEach((c,i)=>{
   ok(Math.abs(c.w-g.lw)<=2,tag+'kart '+i+' tam satır genişliği olmalı: '+c.w+' / '+g.lw);
   ok(c.photoLeft<=12&&c.square&&c.textRight>=6,tag+'kart '+i+' foto solda kare, metin sağda: '+JSON.stringify(c));
   ok(c.plusR<=12&&c.plusB<=12,tag+'kart '+i+' "+" sağ alt köşede: '+JSON.stringify({r:c.plusR,b:c.plusB}));
   ok(!c.plusHitsText&&!c.textsOverlap&&c.inside,tag+'kart '+i+' yazılar üst üste binmemeli / taşmamalı: '+JSON.stringify(c));
   ok(c.dsLines<=2,tag+'kart '+i+' açıklama en çok 2 satır: '+c.dsLines);
  });
  for(let i=1;i<g.cards.length;i++)ok(g.cards[i].top>=g.cards[i-1].bot,tag+'tek sütun: kart '+i+' bir öncekinin altında olmalı');
 }
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);await check('Tüm ürünler',false);
 await p.evaluate(()=>OZ.go('search',{q:'a'}));await p.waitForTimeout(1300);await check('Arama',false);
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);await check('Arama',true);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('s2-kart BAŞARISIZ:\n - '+fails.slice(0,12).join('\n - ')+(fails.length>12?'\n … +'+(fails.length-12):''));process.exit(1)}
 console.log('s2-kart: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('s2-kart HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
