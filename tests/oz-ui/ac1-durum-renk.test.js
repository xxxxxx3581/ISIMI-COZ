// AC1: sipariş durum görünürlüğü ve renk dili (müşteri + satıcı) — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ac1-durum-renk.test.js
// Doğrulanan: (hata) müşteri — ilk sayfa (30) tamamen aktif, teslim edilen 2. sayfada → "Teslim edilen" sekmesinde görünür ("yok" demez);
// (hata) satıcı — 50'den fazla açık sipariş varken "Geçmiş siparişler"de teslim edilen görünür, "Teslim edilen" bölümünde yeşil rozetle;
// renk eşlemesi yeni=turuncu, hazırlanıyor=sarı, kargoda=mavi, teslim=yeşil, iptal/iade=gri-kırmızı (sol şerit + rozet, iki tarafta aynı);
// rozet ikonu; AA kontrast (rozet metni ≥4.5, şerit kahve kart zeminine ≥3); "Siparişim elime ulaştı" → "Teslim edildi ✓" onayı +
// "Değerlendir", Teslim edilen sekmesi seçili, Değerlendir → değerlendirme kartı; 390px'te yatay taşma yok.
const {chromium,open,enter,overflow}=require('./harness.js');
const TONE={n:'rgb(240, 160, 75)',p:'rgb(242, 201, 76)',s:'rgb(111, 179, 232)',d:'rgb(95, 203, 138)',x:'rgb(201, 141, 132)'};
const ORD=(id,status,day)=>({id,order_no:'OZ-'+id,status,total_kurus:45000,created_at:'2026-10-'+String(day).padStart(2,'0')+'T10:00:00Z',seller_name:'Yayla Üreticileri',items:[{name:'Bal',label:'500 g',qty:1,image:null}]});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const cards=(p,sel)=>p.evaluate(sel=>{
  function lum(c){const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  return [...document.querySelectorAll(sel)].map(c=>{const cs=getComputedStyle(c);const t=c.querySelector('.ozTag');const ts=t?getComputedStyle(t):null;const ic=t?getComputedStyle(t,'::before').content:'';
   return {st:c.dataset.st||'',stripe:cs.borderLeftColor,sw:cs.borderLeftWidth,tag:t?t.textContent:'',tagBg:ts&&ts.backgroundColor,ic,
    aa:ts?cr(ts.color,ts.backgroundColor):0,sc:cr(cs.borderLeftColor,cs.backgroundColor)}})},sel);
 const want={new:'n',awaiting_payment:'n',accepted:'p',packed:'p',shipped:'s',delivered:'d',cancelled:'x',returned:'x',return_requested:'x'};
 const ICON={n:'"●"',p:'"⏳"',s:'"🚚"',d:'"✓"',x:'"✕"'};
 const chk=(l,where)=>{ok(l.length>0,'['+where+'] kart yok');l.forEach(c=>{const k=want[c.st];
  ok(k&&c.stripe===TONE[k]&&c.sw==='5px','['+where+'] '+c.st+' sol şerit rengi '+TONE[k]+' olmalı: '+c.stripe+' '+c.sw);
  ok(k&&c.tagBg===TONE[k],'['+where+'] '+c.st+' rozet rengi '+TONE[k]+' olmalı: '+c.tagBg);
  ok(k&&String(c.ic).indexOf(ICON[k].slice(1,-1))>=0,'['+where+'] '+c.st+' rozet ikonu '+ICON[k]+' olmalı: '+c.ic);
  ok(c.aa>=4.5,'['+where+'] '+c.st+' rozet metni AA (≥4.5): '+c.aa.toFixed(2));
  ok(c.sc>=3,'['+where+'] '+c.st+' şerit kart zeminine ≥3: '+c.sc.toFixed(2))})};

 // 1) müşteri: ilk sayfa 30 aktif, teslim edilen 2. sayfada (hata kanıtı) + renkler
 {const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(([a,b])=>{const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_my_orders'){window.__ozLog(fn,x);return x.p_offset?b:a}return o(fn,x)}},
   [Array.from({length:30},(_,i)=>ORD('a'+i,['new','accepted','packed','shipped','awaiting_payment'][i%5],20-(i%9))),[ORD('d1','delivered',3),ORD('c1','cancelled',2),ORD('r1','returned',1)]]);
  await enter(p);await p.evaluate(()=>OZ.go('orders',{}));await p.waitForTimeout(1300);
  chk(await cards(p,'#ozRoot .ozOrd'),'müşteri Aktif');
  await click(p,'#ozRoot [data-a=ordTab][data-tab=done]',1300);
  const d=await p.evaluate(()=>({ids:[...document.querySelectorAll('#ozRoot .ozOrd')].map(x=>x.dataset.oid),empty:/Teslim edilen sipariş yok/.test(document.getElementById('ozRoot').innerText),
   sel:(document.querySelector('#ozRoot [data-a=ordTab][aria-selected=true]')||{}).textContent}));
  ok(d.ids.join()==='d1'&&!d.empty&&d.sel==='Teslim edilen','HATA: 2. sayfadaki teslim edilen sipariş "Teslim edilen" sekmesinde görünmeli ("yok" dememeli): '+JSON.stringify(d));
  chk(await cards(p,'#ozRoot .ozOrd'),'müşteri Teslim edilen');
  await click(p,'#ozRoot [data-a=ordTab][data-tab=ret]',900);chk(await cards(p,'#ozRoot .ozOrd'),'müşteri İade/İptal');
  ok(await overflow(p)<=0,'müşteri listesi 390px yatay taşma');
  ok(!st.errors.length,'müşteri sayfa hatası: '+st.errors.join(' | '));await p.context().close()}

 // 2) teslim onayı → "Teslim edildi ✓" + Değerlendir, Teslim edilen sekmesi
 {const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(()=>{const R=window.__OZ_FX.R;const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_transition_order'){const r=await o(fn,x);R.oz_my_orders=R.oz_my_orders.map(y=>Object.assign({},y,{status:'delivered'}));R.oz_order_detail.order.status='delivered';return r}return o(fn,x)}});
  await enter(p);await p.evaluate(()=>OZ.go('order',{id:'o1'}));await p.waitForTimeout(1200);
  const hd=await cards(p,'#ozRoot .ozOdH');ok(hd.length&&hd[0].tagBg===TONE.s,'sipariş detayı başlık rozeti kargoda=mavi: '+JSON.stringify(hd[0]||{}));
  await click(p,'#ozRoot [data-a=ordDeliver]',500);await click(p,'.ozOv [data-a=cbYes]',1500);
  const s=await p.evaluate(()=>{const o=document.querySelector('.ozOv .ozDlv');const b=o&&o.querySelector('[data-a=dlvRate]');const k=o&&o.querySelector('.ok');const r=o&&o.closest('.ozSh').getBoundingClientRect();
   return {on:!!o,txt:o?o.innerText:'',btn:b?b.textContent:'',tick:k?getComputedStyle(k).backgroundColor:'',w:r?Math.round(r.right):0,
    sel:(document.querySelector('#ozRoot [data-a=ordTab][aria-selected=true]')||{}).textContent,ids:[...document.querySelectorAll('#ozRoot .ozOrd')].map(x=>x.dataset.st).join()}});
  ok(s.on&&/Teslim edildi ✓/.test(s.txt)&&s.btn==='Değerlendir'&&s.tick===TONE.d,'onay ekranı: yeşil tik + "Teslim edildi ✓" + Değerlendir: '+JSON.stringify(s));
  ok(s.sel==='Teslim edilen'&&s.ids==='delivered','Teslim edilen sekmesine geçilmeli ve sipariş orada olmalı: '+JSON.stringify(s));
  ok(s.w<=390,'onay ekranı 390px içinde: '+s.w);
  await click(p,'.ozOv [data-a=dlvRate]',1300);
  ok(await p.evaluate(()=>!document.querySelector('.ozOv')&&!!document.getElementById('ozRateC')),'Değerlendir → sipariş detayında değerlendirme kartı');
  ok(!st.errors.length,'teslim sayfa hatası: '+st.errors.join(' | '));await p.context().close()}

 // 3) satıcı: 50+ açık sipariş varken geçmişte teslim edilen görünür (hata kanıtı) + renkler
 {const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(([ORD0])=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];const mk=(id,s,d)=>Object.assign({},base,{id,order_no:'OZ-'+id,status:s,created_at:'2026-10-'+d+'T10:00:00Z',return:null});
   const all=Array.from({length:50},(_,i)=>mk('n'+i,['new','accepted','packed','shipped'][i%4],'20'));
   const by={delivered:[mk('d1','delivered','05')],cancelled:[mk('c1','cancelled','04')],returned:[mk('r1','returned','03')],return_requested:[mk('q1','return_requested','06')]};
   R.oz_seller_dashboard=Object.assign({},R.oz_seller_dashboard,{orders:{new:13,accepted:13,packed:12,shipped:12,delivered:1,cancelled:1,returned:1,return_requested:1}});
   const o=window.PF.rpc;window.PF.rpc=async function(fn,x){if(fn==='oz_seller_orders'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));const s=x.p_status;return s==null?all:by[s]||all.filter(y=>y.status===s)}return o(fn,x)}},[0]);
  await enter(p);await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
  chk(await cards(p,'#ozSP .ozSoC'),'satıcı açık siparişler');
  const pr=await p.evaluate(()=>(document.querySelector('#ozSP .ozPastR')||{}).innerText||'');ok(/1 teslim edilen/.test(pr),'"Geçmiş siparişler" satırında teslim edilen sayısı: '+pr);
  await click(p,'#ozSP [data-a=soTab][data-st=past]',1500);
  const g=await p.evaluate(()=>({h:[...document.querySelectorAll('#ozSP .ozPastH h2')].map(x=>x.textContent).join('|'),d:[...document.querySelectorAll('#ozSP .ozPastD .ozSoC')].map(x=>x.dataset.oid).join(),
   x:[...document.querySelectorAll('#ozSP .ozPastX .ozSoC')].map(x=>x.dataset.oid).join(),hc:(document.querySelector('#ozSP .ozPastH.d h2')||{}).style&&getComputedStyle(document.querySelector('#ozSP .ozPastH.d h2')).color}));
  ok(g.d==='d1'&&/Teslim edilen \(1\)/.test(g.h),'HATA: 50 açık sipariş varken "Teslim edilen" bölümünde teslim edilen sipariş görünmeli: '+JSON.stringify(g));
  ok(g.x==='c1,r1'&&/İptal \/ İade \(2\)/.test(g.h),'İptal / İade bölümü: '+JSON.stringify(g));
  ok(g.hc===TONE.d,'"Teslim edilen" başlığı yeşil: '+g.hc);
  chk(await cards(p,'#ozSP .ozSoC'),'satıcı geçmiş');
  ok(await overflow(p)<=0,'satıcı 390px yatay taşma');
  ok(!st.errors.length,'satıcı sayfa hatası: '+st.errors.join(' | '));await p.context().close()}

 await br.close();
 if(fails.length){console.error('ac1-durum-renk BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ac1-durum-renk: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ac1-durum-renk HATA:',e);process.exit(1)});
