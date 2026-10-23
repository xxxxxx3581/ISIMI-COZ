// Paket 25: Yemek işletme "Bugün" sipariş kartları, sayaç kutuları ve geniş ekranda 3 sütun (yalnız arayüz) — 390px + 1280px, krem / koyu / Mutfak modu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p25-siparis-kart.test.js   (P25_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: sayaçlar dolu durum renginde, seçili olana koyu çerçeve, sayı büyük, yazı kontrastı ≥4.5, dokununca mevcut foodBizTab; kart üst şeridi durum tonunda
// (Yeni/Hazırlanıyor/Yolda farklı), #no + yaş etiketi, kabul süresi ayarı varsa "Kabul süresi N dk" (timersTick), yoksa yok; ürün özeti, teslimat · ödeme, toplam;
// yeni sipariş kırmızı 2px çerçeve; Reddet dar çerçeveli solda, Kabul et geniş yeşil ≥56px; diğer durumlarda tek birincil; ≥900px'te 3 sütun (başlık = sayaç,
// boş sütunda "Sipariş yok"), <900px'te sekmeler; metin kontrastı ≥4.5, düğmeler ≥44px, yatay taşma yok, içerik alt menünün üstünde biter, sayfa hatası yok.
const {chromium,open,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P25_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const LUM=c=>{let m=c.match(/[\d.]+/g).map(Number);if(/^color\(srgb/.test(c))m=m.map(v=>v*255);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
const CR=(a,b)=>{const x=LUM(a),y=LUM(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const iso=m=>new Date(Date.now()+m*60000).toISOString();
const biz=(id,status,min)=>({id,no:id.toUpperCase(),status,delivery_mode:status==='ready'?'self_delivery':'platform_delivery',created_at:iso(min),total_kurus:41500,payment_method:'cash_on_delivery',
 items:[{name:'Adana dürüm',quantity:2,options:[{kind:'remove',option:'Soğan'}]},{name:'Ayran',quantity:1,options:[]}],address_text:'Bornova',phone:'05320000000'});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const page=async(w,mode,o)=>{o=o||{};const r=await open(br,{w,h:w>900?900:844,visible:true});const light=mode==='krem';
  await r.p.evaluate(([light,km,fx,acc])=>{document.documentElement.setAttribute('data-theme',light?'light':'dark');try{localStorage.setItem('isimi-theme',light?'light':'dark');localStorage.setItem('isimi_food_kitchen',km?'1':'0')}catch(e){}
   window.__FD=fx;
   window.supabaseAuthRequest=async function(m,pth,b){await new Promise(r=>setTimeout(r,10));const F=window.__FD,cl=x=>JSON.parse(JSON.stringify(x));
    if(m==='POST'&&pth.startsWith('rpc/')){const fn=pth.slice(4);if(fn==='food_whoami')return {venues:[{id:'v1',name:'Test Lokanta',role:'owner'}]};
     if(fn==='food_venue_orders'){const c={};for(const k in F)c[k]=F[k].length;return {orders:cl(F[b.p_section]||[]),counts:c,summary:{today_orders:4,today_revenue_kurus:90000}}}return []}
    if(pth.startsWith('food_settings?'))return acc?[{key:'accept_timeout_min',value:acc}]:[];
    if(pth.startsWith('food_venues?'))return [{id:'v1',name:'Test Lokanta',is_open:true,is_active:true,working_hours:null,delivery_mode:'platform_delivery',delivery_provider:null,prep_time_min:20}];
    return []}},[light,mode==='mutfak',o.fx||{new:[biz('n1','new',-2),biz('n2','new',-5)],preparing:[biz('p1','preparing',-12)],ready:[biz('r1','ready',-20)],courier_wait:[],active_delivery:[]},o.acc===undefined?10:o.acc]);
  await r.p.evaluate(()=>showFoodBusiness('v1'));await r.p.waitForTimeout(1500);return r};
 const shot=async(p,n)=>{if(!SHOTS)return;await p.evaluate(()=>document.querySelectorAll('#v2Toast').forEach(x=>x.remove()));await p.screenshot({path:path.join(SHOTS,n+'.png'),fullPage:true})};
 const cnt=(p,sel)=>p.evaluate(sel=>[...document.querySelectorAll(sel)].map(b=>{const cs=getComputedStyle(b);return {k:[...b.classList].find(c=>/^[nps]$/.test(c)),on:b.classList.contains('on'),n:b.querySelector('b').textContent,l:b.querySelector('span').textContent,
   bg:cs.backgroundColor,bd:cs.borderTopColor,bw:cs.borderTopWidth,col:getComputedStyle(b.querySelector('b')).color,lc:getComputedStyle(b.querySelector('span')).color,fs:parseFloat(getComputedStyle(b.querySelector('b')).fontSize),h:Math.round(b.getBoundingClientRect().height)}}),sel);
 const cards=p=>p.evaluate(()=>{const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255, 255, 255)'};
  return [...document.querySelectorAll('#fdBList .fdBiz')].map(c=>{const hd=c.querySelector('.nxHd'),ag=c.querySelector('.nxAge'),ft=c.querySelector('.ft');const bt=ft?[...ft.children].filter(x=>x.tagName==='BUTTON'):[];
   return {g:[...c.classList].find(x=>/^g[nps]$/.test(x))||'',col:(c.closest('.fdCol')||{}).dataset&&c.closest('.fdCol').dataset.k,no:(hd.querySelector('.id b')||{}).textContent,age:ag.textContent,acc:!!c.querySelector('.nxAcc'),
    hdBg:getComputedStyle(hd).backgroundColor,cardBg:bgOf(c),noCol:getComputedStyle(hd.querySelector('.id b')).color,agCol:getComputedStyle(ag).color,agBg:bgOf(ag),
    sum:c.querySelector('.sum').textContent,mp:c.querySelector('.mp').textContent,mpCol:getComputedStyle(c.querySelector('.mp')).color,tot:c.querySelector('.nxTot b').textContent,
    bw:getComputedStyle(c).borderTopWidth,bc:getComputedStyle(c).borderTopColor,
    bt:bt.map(b=>({t:b.textContent.trim(),c:b.className,h:Math.round(b.getBoundingClientRect().height),w:Math.round(b.getBoundingClientRect().width),on:b.getAttribute('onclick')||''}))}})});
 for(const mode of ['krem','koyu','mutfak']){
  /* ---------- 390px: sekmeler ---------- */
  let {p,st}=await page(390,mode);const T='['+mode+' 390]';
  ok(await p.evaluate(()=>!document.querySelector('#fdBList .fdCols')&&!!document.querySelector('#fdTabs button.on')),T+' telefonda sütun yok, sekme davranışı');
  if(mode==='mutfak')ok(await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='dark'),T+' Mutfak modu koyu');
  let c=await cnt(p,'#fdCnt3 .fdCntB');
  ok(JSON.stringify(c.map(x=>x.l+':'+x.n))==='["Yeni:2","Hazırlanıyor:1","Yolda:1"]','T sayaç metin/sayı: '+JSON.stringify(c));
  ok(new Set(c.map(x=>x.bg)).size===3&&c.every(x=>x.fs>=30&&x.h>=44&&CR(x.col,x.bg)>=4.5&&CR(x.lc,x.bg)>=4.5),T+' sayaçlar dolu renkli, sayı büyük, kontrast ≥4.5: '+JSON.stringify(c.map(x=>[x.bg,x.col,x.fs,CR(x.col,x.bg).toFixed(2)])));
  const on=c.find(x=>x.on),off=c.filter(x=>!x.on);
  ok(on&&on.k==='n'&&on.bw==='2px'&&off.every(x=>x.bd===x.bg)&&on.bd!==on.bg&&CR(on.bd,on.bg)>=3,T+' seçili sayaçta koyu/zıt 2px çerçeve, diğerleri normal: '+JSON.stringify(c.map(x=>[x.on,x.bd,x.bg,x.bw])));
  let k=await cards(p);
  ok(k.length===2&&k.every(x=>x.g==='gn'&&/^#N\d$/.test(x.no)&&/dk önce/.test(x.age)&&x.acc&&/Kabul süresi \d+ dk/.test(x.age)),T+' Yeni kart: #no, yaş + kabul süresi: '+JSON.stringify(k.map(x=>[x.no,x.age])));
  ok(k.every(x=>x.sum==='2 × Adana dürüm, 1 × Ayran'&&x.mp==='Kurye ile teslimat · Kapıda nakit'&&/415/.test(x.tot)),T+' ürün özeti, teslimat · ödeme, toplam: '+JSON.stringify(k[0]&&[k[0].sum,k[0].mp,k[0].tot]));
  const stNew=await p.evaluate(()=>{const d=document.createElement('i');d.style.color='var(--st-new)';document.querySelector('#fdRoot').appendChild(d);const c=getComputedStyle(d).color;d.remove();return c});
  ok(k.every(x=>x.bw==='2px'&&x.bc===stNew&&x.hdBg!==x.cardBg),T+' yeni sipariş 2px çerçeve + tonlu şerit: '+JSON.stringify(k.map(x=>[x.bw,x.bc,x.hdBg,x.cardBg])));
  ok(k.every(x=>CR(x.noCol,x.hdBg)>=4.5&&CR(x.agCol,x.agBg)>=4.5&&CR(x.mpCol,x.cardBg)>=4.5),T+' şerit/etiket/alt satır kontrast ≥4.5: '+JSON.stringify(k.map(x=>[CR(x.noCol,x.hdBg).toFixed(2),CR(x.agCol,x.agBg).toFixed(2),CR(x.mpCol,x.cardBg).toFixed(2)])));
  ok(k.every(x=>x.bt.length===2&&/btnDanger/.test(x.bt[0].c)&&x.bt[0].t==='✕ Reddet'&&/btnNext/.test(x.bt[1].c)&&x.bt[1].t==='✓ Kabul et'&&x.bt.every(b=>b.h>=56)&&x.bt[0].w<x.bt[1].w&&/'rejected'/.test(x.bt[0].on)&&/'accepted'/.test(x.bt[1].on)),
   T+' Reddet dar solda, Kabul et geniş sağda ≥56px: '+JSON.stringify(k.map(x=>x.bt)));
  ok((await overflow(p))<=0,T+' yatay taşma (Yeni)');
  await p.evaluate(()=>window.scrollTo(0,0));await shot(p,'p25-'+mode+'-390-yeni');
  // dokununca mevcut foodBizTab → Hazırlanıyor / Yolda
  const grp={};grp.n=k[0].hdBg;
  for(const [i,g,lab] of [[1,'gp','📦 Sipariş hazır'],[2,'gs','🛵 Yola çıktı']]){
   await p.evaluate(i=>[...document.querySelectorAll('#fdCnt3 .fdCntB')][i].click(),i);await p.waitForTimeout(900);
   c=await cnt(p,'#fdCnt3 .fdCntB');ok(c[i].on&&c.filter(x=>x.on).length===1,T+' sayaç '+i+' seçili');
   k=await cards(p);grp[g]=k[0]&&k[0].hdBg;
   ok(k.length===1&&k[0].g===g&&!k[0].acc&&/dk önce/.test(k[0].age)&&k[0].bt.filter(b=>/btnNext/.test(b.c)).length===1&&k[0].bt[0].t===lab&&k[0].bt[0].h>=56,T+' '+g+' kart: tek birincil aynı yerde: '+JSON.stringify(k[0]));
   ok(k.every(x=>CR(x.noCol,x.hdBg)>=4.5&&CR(x.agCol,x.agBg)>=4.5),T+' '+g+' şerit kontrast');
   ok((await overflow(p))<=0,T+' yatay taşma ('+g+')');await shot(p,'p25-'+mode+'-390-'+g);
  }
  ok(new Set(Object.values(grp)).size===3,T+' 3 durum şeridi farklı ton: '+JSON.stringify(grp));
  const e=await p.evaluate(()=>{window.scrollTo(0,document.scrollingElement.scrollHeight);const n=document.querySelector('#fdRoot .fdPNav').getBoundingClientRect();const m=document.querySelector('#fdRoot .fdMoreSec').getBoundingClientRect();return [Math.round(m.bottom),Math.round(n.top)]});
  ok(e[0]<=e[1],T+' içerik alt menünün üstünde biter: '+e);
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));
  await p.context().close();
  /* ---------- 1280px: 3 sütun ---------- */
  ({p,st}=await page(1280,mode,{fx:{new:[biz('n1','new',-2)],preparing:[biz('p1','preparing',-12),biz('p2','preparing',-8)],ready:[],courier_wait:[],active_delivery:[]}}));const W='['+mode+' 1280]';
  let r=await p.evaluate(()=>({cnt3:getComputedStyle(document.getElementById('fdCnt3')).display,cols:[...document.querySelectorAll('#fdBList .fdCol')].map(s=>({k:s.dataset.k,h:s.querySelector('.fdCntB span').textContent+':'+s.querySelector('.fdCntB b').textContent,n:s.querySelectorAll('.fdBiz').length,empty:(s.querySelector('.fdColE')||{}).textContent||'',x:Math.round(s.getBoundingClientRect().left),w:Math.round(s.getBoundingClientRect().width)}))}));
  ok(r.cnt3==='none'&&JSON.stringify(r.cols.map(x=>x.k))==='["new","prep","ready"]'&&r.cols[0].x<r.cols[1].x&&r.cols[1].x<r.cols[2].x&&r.cols.every(x=>x.w>=280),W+' 3 sütun yan yana, üstteki sayaç satırı yok: '+JSON.stringify(r));
  ok(JSON.stringify(r.cols.map(x=>x.h))==='["Yeni:1","Hazırlanıyor:2","Yolda:0"]'&&JSON.stringify(r.cols.map(x=>x.n))==='[1,2,0]'&&r.cols[2].empty==='Sipariş yok',W+' başlık renkli+sayılı, kartlar sütunlarında, boş sütun "Sipariş yok": '+JSON.stringify(r.cols));
  c=await cnt(p,'#fdBList .fdCol .fdCntB');ok(c.every(x=>CR(x.col,x.bg)>=4.5&&x.fs>=30)&&c[0].on,W+' sütun başlığı kontrast + Yeni seçili: '+JSON.stringify(c.map(x=>[x.on,CR(x.col,x.bg).toFixed(2)])));
  k=await cards(p);ok(k.every(x=>(x.col==='new'&&x.g==='gn')||(x.col==='prep'&&x.g==='gp'))&&k.every(x=>x.bt.every(b=>b.h>=44)),W+' kart şeridi sütun durumunda: '+JSON.stringify(k.map(x=>[x.col,x.g])));
  ok(k.find(x=>x.col==='new').bt.map(b=>b.t).join('|')==='✕ Reddet|✓ Kabul et',W+' Yeni sütunda Reddet | Kabul et');
  ok((await overflow(p))<=0,W+' yatay taşma');await shot(p,'p25-'+mode+'-1280');
  // başlığa dokunma = foodBizTab (seçili değişir), sütunlar kalır
  await p.evaluate(()=>document.querySelector('#fdBList .fdCol[data-k=prep] .fdCntB').click());await p.waitForTimeout(900);
  r=await p.evaluate(()=>({cols:document.querySelectorAll('#fdBList .fdCol').length,on:(document.querySelector('#fdBList .fdCntB.on')||{}).textContent,tab:(document.querySelector('#fdTabs button.on')||{}).textContent}));
  ok(r.cols===3&&/Hazırlanıyor/.test(r.on)&&/Mutfakta/.test(r.tab),W+' başlık → foodBizTab: '+JSON.stringify(r));
  // Geçmiş sekmesi geniş ekranda da mevcut liste
  await p.evaluate(()=>foodBizTab('past'));await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!document.querySelector('#fdBList .fdCols')&&getComputedStyle(document.getElementById('fdCnt3')).display!=='none'),W+' Geçmiş: sütun yok, sayaçlar üstte');
  // daraltınca (<900) sekme davranışı
  await p.evaluate(()=>foodBizTab('new'));await p.waitForTimeout(700);await p.setViewportSize({width:820,height:900});await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!document.querySelector('#fdBList .fdCols')&&document.querySelectorAll('#fdCnt3 .fdCntB').length===3&&document.querySelectorAll('#fdBList .fdBiz').length===1),W+' 820px: sekme davranışına döndü');
  ok(!st.errors.length,W+' sayfa hatası: '+st.errors.join(' | '));
  await p.context().close();
 }
 /* ---------- kabul süresi ayarı yoksa etiket yok ---------- */
 {const {p,st}=await page(390,'krem',{acc:null});const k=await cards(p);
  ok(k.length===2&&k.every(x=>!x.acc&&/^\d+ dk önce$|^az önce$/.test(x.age.trim())),'[kabul süresi yok] yalnız yaş etiketi: '+JSON.stringify(k.map(x=>x.age)));
  ok(!st.errors.length,'[kabul süresi yok] sayfa hatası: '+st.errors.join(' | '));await p.context().close();}
 await br.close();
 if(fails.length){console.error('p25-siparis-kart BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p25-siparis-kart: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p25-siparis-kart HATA:',e);process.exit(1)});
