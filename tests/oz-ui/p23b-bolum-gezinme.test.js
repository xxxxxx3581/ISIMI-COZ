// Paket 23b: yönetim bölüm içi gezinme (yalnız arayüz) — 390px, krem (açık) ve koyu tema, sahte RPC.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p23b-bolum-gezinme.test.js   (P23B_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: üstte ← (44px) + "Yönetim › bölme" + büyük başlık + Kapat; kardeş bölüm şeridi (Özüne Dön'ün 10 bölümü tek şeritte), aktif çip sarı dolu ve
// görünür, rozetler yalnız mevcut sayılardan; başlık + şerit kayarken yapışkan; alt menü (Kuyruklar aktif) en altta, içerikle çakışmaz; çip geçişleri
// geçmişe kayıt eklemez, 3 geçişten sonra Android geri → bölme listesi, bir geri daha → panel kapanır; ← → bölme listesi; Kapat → panel kapanır;
// alt menü → o bölmenin ana görünümü; Özüne Dön Özet "Siparişler" kutusu küçük renkli etiketler (yazı + sayı); yetkisiz bölüm şeritte/menüde yok;
// kontrast ≥4.5, düğmeler ≥44px, yatay taşma yok (şerit kendi içinde kayar).
const {chromium,open}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P23B_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SAMPLE={pf_public_settings:{},pf_my_roles:{is_admin:true,roles:['super']},pf_admin_reports:[{id:'r1'},{id:'r2'}],pf_admin_listing_queue:[{id:'l1'},{id:'l2'}],
 pf_admin_venue_queue:[{venue_id:'v1',stage:'in_review'}],pf_admin_data_requests:[],pf_admin_tickets:[],
 oz_admin_overview:{orders_open:3,returns_open:1,sellers_pending:1,orders:{returned:1,delivered:2}},oz_admin_settings:{oz_market_enabled:false,oz_orders_enabled:false,oz_payment_mock_enabled:true}};
const OZ=['Özet','Ayarlar','Satıcılar','Ürünler','Siparişler','İadeler','Ödemeler','Kategoriler','Moderasyon','Slaytlar'];
/* sayfa içi: ön plan/zemin kontrastı (yarı saydam zeminler üst üste karıştırılır) */
const CONTRAST=(sel)=>{const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};const mix=(f,b)=>{const a=f.length>3?f[3]:1;return [0,1,2].map(i=>f[i]*a+b[i]*(1-a))};
 const eff=e=>{const st=[];for(;e;e=e.parentElement){const c=P(getComputedStyle(e).backgroundColor);if(c.length<4||c[3]>0){st.push(c);if(c.length<4||c[3]>=1)break}}let b=[255,255,255];st.reverse().forEach(c=>{b=mix(c,b)});return b};
 const bad=[],small=[];document.querySelectorAll(sel).forEach(R=>R.querySelectorAll('b,small,span,button,h2').forEach(e=>{const r=e.getBoundingClientRect();if(!r.height||!(e.textContent||'').trim())return;
  if(e.tagName==='BUTTON'&&r.height<44-.5)small.push((e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,18)+':'+Math.round(r.height));
  if([...e.children].some(c=>c.textContent.trim()===e.textContent.trim()))return;const z=eff(e),fg=mix(P(getComputedStyle(e).color),z);const x=L(fg),y=L(z);const v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)bad.push((e.textContent||'').trim().slice(0,20)+':'+v.toFixed(2))}));
 return {bad,small}};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 let DATA=SAMPLE;
 await p.route('**/rest/v1/rpc/*',r=>{const fn=r.request().url().split('/rpc/')[1].split('?')[0];return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fn in DATA?DATA[fn]:[])})});
 await p.reload();await p.waitForTimeout(1500);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await p.evaluate(()=>showHome());await p.waitForTimeout(500);
 const W=t=>p.waitForTimeout(t||900);
 const openA=async(roles)=>{await p.evaluate(r=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());window.PF.roles={is_admin:true,roles:r};PF._admCnt=null;PF.openAdmin()},roles||['super']);await W(1400)};
 const S=()=>p.evaluate(()=>{const sh=document.querySelector('.pfxOv .pfxSh');if(!sh)return {open:false};const hd=sh.querySelector('.pfxHd'),bk=hd.querySelector('.pfxBack'),x=hd.querySelector('.pfxX');/* P34: kardeş bölümler gövdede hep açık ızgara (#pfxAdm'nin hemen üstünde) */const s=sh.querySelector('.pfxBody > .pfxSecG');
  const home=document.getElementById('pfxAdmHome');const nav=sh.querySelector('.pfxPN');const sr=s&&s.getBoundingClientRect();const on=s&&s.querySelector('.pfxSC.on');const orr=on&&on.getBoundingClientRect();
  return {open:true,home:!!home,pane:home?(home.querySelector('.pfxPane:not([hidden])')||{}).dataset.pane:null,inner:!!document.getElementById('pfxAdm'),
   path:(hd.querySelector('.pfxAdmP')||{}).textContent||'',title:(hd.querySelector('.pfxAdmT')||{}).textContent||'',
   back:bk?[Math.round(bk.getBoundingClientRect().width),Math.round(bk.getBoundingClientRect().height)]:null,kapat:x?Math.round(x.getBoundingClientRect().height):0,
   chips:s?[...s.querySelectorAll('.pfxSC')].map(b=>({t:b.childNodes[0].textContent,n:(b.querySelector('.pfxCnt')||{}).textContent||'',on:b.classList.contains('on'),bg:getComputedStyle(b).backgroundColor,h:Math.round(b.getBoundingClientRect().height)})):[],
   onVis:!!(on&&orr.left>=sr.left-1&&orr.right<=sr.right+1&&orr.top>=sr.top-1&&orr.bottom<=sr.bottom+1),selX:s?s.scrollWidth>s.clientWidth:false,cols:s?new Set([...s.querySelectorAll('.pfxSC')].map(b=>Math.round(b.getBoundingClientRect().left))).size:0,rows:s?new Set([...s.querySelectorAll('.pfxSC')].map(b=>Math.round(b.getBoundingClientRect().top))).size:0,
   gridPos:s?{next:s.nextElementSibling&&s.nextElementSibling.id,inHd:!!s.closest('.pfxHd'),pos:getComputedStyle(s).position}:null,
   nav:nav?{items:[...nav.querySelectorAll('.pnItem')].map(b=>b.dataset.pane),on:(nav.querySelector('.pnItem.on')||{}).dataset&&nav.querySelector('.pnItem.on').dataset.pane,bottom:Math.round(nav.getBoundingClientRect().bottom),shB:Math.round(sh.getBoundingClientRect().bottom)}:null,
   ovf:Math.max(document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth,sh.scrollWidth-sh.clientWidth)}});
 const shot=async n=>{if(!SHOTS)return;const el=await p.$('.pfxOv .pfxSh');if(el)await el.screenshot({path:path.join(SHOTS,n+'.png')})};
 for(const th of ['light','dark']){const T=th==='light'?'krem':'koyu';const ON=th==='light'?'rgb(242, 193, 78)':'rgb(247, 210, 74)';
  /* gerçek akış gibi: Ana sayfa → Hesabım (uygulama geçmişinde önceki kayıt var) → Yönetim paneli */
  await p.evaluate(t=>{applyAppTheme(t);showHome()},th);await W(400);await p.evaluate(()=>showAccount());await W(600);DATA=SAMPLE;await openA();
  await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxPN [data-pane=queues]').click());await W(300);
  await p.evaluate(()=>document.querySelector('#pfxAdmHome [data-tab=oz_sellers]').click());await W(1300);
  let r=await S();
  ok(r.inner&&r.path==='Yönetim › Özüne Dön'&&r.title==='Satıcılar'&&r.back&&r.back[0]>=44&&r.back[1]>=44&&r.kapat>=44,'['+T+'] üst: ← 44px + yol + başlık + Kapat: '+JSON.stringify({p:r.path,t:r.title,b:r.back,k:r.kapat}));
  ok(JSON.stringify(r.chips.map(c=>c.t))===JSON.stringify(OZ)&&r.cols===3&&r.rows<=4,'['+T+'] P34: Özüne Dön 10 bölüm hep açık ızgarada, 3 sütun, ≤4 satır: '+JSON.stringify(r.chips.map(c=>c.t)));
  ok(r.chips.filter(c=>c.on).length===1&&r.chips.find(c=>c.on).t==='Satıcılar'&&r.chips.find(c=>c.on).bg===ON&&r.chips.filter(c=>!c.on).every(c=>c.bg!==ON)&&r.chips.every(c=>c.h>=44),'['+T+'] aktif çip sarı dolu, diğerleri normal, ≥44px: '+JSON.stringify(r.chips.map(c=>[c.t,c.on,c.bg,c.h])));
  ok(JSON.stringify(r.chips.filter(c=>c.n).map(c=>c.t+':'+c.n))==='["Satıcılar:1","Siparişler:3","İadeler:1"]','['+T+'] rozetler yalnız mevcut sayılardan: '+JSON.stringify(r.chips.filter(c=>c.n)));
  ok(r.nav&&JSON.stringify(r.nav.items)==='["today","queues","money","system"]'&&r.nav.on==='queues'&&Math.abs(r.nav.bottom-r.nav.shB)<=2,'['+T+'] alt menü sabit, Kuyruklar aktif: '+JSON.stringify(r.nav));
  ok(r.ovf<=0&&!r.selX&&r.onVis&&r.chips.every(c=>c.h>=44),'['+T+'] P34: tüm kardeşler hep görünür (açmaya gerek yok), yatay kaydırma yok, ≥44px: '+JSON.stringify([r.ovf,r.selX,r.onVis]));
  ok(r.gridPos&&r.gridPos.next==='pfxAdm'&&!r.gridPos.inHd&&r.gridPos.pos!=='sticky','['+T+'] P34: ızgara #pfxAdm\'nin hemen üstünde, başlıkta değil, yapışkan değil: '+JSON.stringify(r.gridPos));
  let a=await p.evaluate(CONTRAST,'.pfxOv .pfxHd');ok(!a.bad.length&&!a.small.length,'['+T+'] üst alan kontrast/boyut: '+JSON.stringify(a));
  // yapışkan: içerik uzunken kaydır, başlık + şerit üstte kalır; içerik sonu alt menünün üstünde
  r=await p.evaluate(()=>{const el=document.getElementById('pfxAdm');const f=document.createElement('div');f.id='t23bF';f.style.height='1600px';el.appendChild(f);const sh=document.querySelector('.pfxOv .pfxSh');sh.scrollTop=700;
   const hd=sh.querySelector('.pfxHd').getBoundingClientRect(),s=sh.querySelector('.pfxSecG').getBoundingClientRect(),st=sh.getBoundingClientRect();const top=Math.round(hd.top-st.top);
   sh.scrollTop=sh.scrollHeight;const nb=sh.querySelector('.pfxPN').getBoundingClientRect(),lb=el.getBoundingClientRect();f.remove();const hb=sh.querySelector('.pfxHd').getBoundingClientRect();return {top,gAway:s.bottom<=hb.bottom+1,lastB:Math.round(lb.bottom),navT:Math.round(nb.top)}});
  ok(r.top<=2&&r.gAway&&r.lastB<=r.navT+1,'['+T+'] P34: başlık yapışkan, ızgara içerikle birlikte kayar, içerik alt menünün üstünde biter: '+JSON.stringify(r));
  await p.evaluate(()=>{document.querySelector('.pfxOv .pfxSh').scrollTop=0});await shot('p23b-'+T+'-saticilar');
  // 3 çip geçişi: geçmişe kayıt yok; aktif çip görünür
  const h0=await p.evaluate(()=>({n:history.length,i:window.V2_NAV&&V2_NAV.idx,u:location.href}));
  for(const k of ['Siparişler','Slaytlar','İadeler']){await p.evaluate(k=>{[...document.querySelectorAll('.pfxSecG .pfxSC')].find(b=>b.childNodes[0].textContent===k).click()},k);await W(1100);
   r=await S();ok(r.title===k&&r.chips.find(c=>c.on).t===k&&r.onVis,'['+T+'] çip → '+k+', aktif görünür: '+JSON.stringify({t:r.title,v:r.onVis}))}
  const h1=await p.evaluate(()=>({n:history.length,i:window.V2_NAV&&V2_NAV.idx,u:location.href}));
  ok(JSON.stringify(h0)===JSON.stringify(h1),'['+T+'] çip geçişleri geçmişe kayıt eklemedi: '+JSON.stringify([h0,h1]));
  await p.goBack();await W(900);r=await S();
  ok(r.open&&r.home&&r.pane==='queues','['+T+'] 3 geçişten sonra Android geri → bölme listesi (Kuyruklar): '+JSON.stringify({o:r.open,h:r.home,p:r.pane}));
  await p.goBack();await W(900);r=await S();ok(!r.open,'['+T+'] ikinci geri → panel kapandı');
  ok(await p.evaluate(()=>!!document.querySelector('#app .hmAcc')),'['+T+'] panelden çıkış sonrası girilen ekranda (Hesabım)');
  // ← → bölme listesi; alt menü → o bölme; Kapat → çıkış
  await openA();await p.evaluate(()=>PF.openAdmin('reports'));await W(1000);r=await S();
  ok(r.path==='Yönetim › Kuyruklar'&&r.title==='Şikâyetler'&&!r.chips.some(c=>OZ.includes(c.t)&&/^(Özet|Slaytlar)$/.test(c.t))&&r.chips.find(c=>c.on).t==='Şikâyetler'&&r.chips.find(c=>c.t==='Şikâyetler').n==='2','['+T+'] Kuyruklar bölümü: yol, kardeşler, rozet: '+JSON.stringify({p:r.path,c:r.chips.map(c=>c.t+':'+c.n)}));
  await p.evaluate(()=>document.querySelector('.pfxOv .pfxBack').click());await W(900);r=await S();ok(r.home&&r.pane==='queues','['+T+'] ← → Kuyruklar listesi');
  await p.evaluate(()=>PF.openAdmin('finance'));await W(1000);r=await S();ok(r.path==='Yönetim › Para'&&r.nav&&r.nav.on==='money','['+T+'] Finans: bölme Para aktif: '+JSON.stringify({p:r.path,n:r.nav}));
  await p.evaluate(()=>document.querySelector('.pfxOv .pfxPN [data-pane=system]').click());await W(900);r=await S();ok(r.home&&r.pane==='system','['+T+'] alt menü → Sistem ana görünümü');
  await p.evaluate(()=>PF.openAdmin('audit'));await W(900);
  await p.evaluate(()=>document.querySelector('.pfxOv [data-pfx-close]').click());await W(500);r=await S();ok(!r.open,'['+T+'] Kapat → panelden çıkış');
  // P23c: Hesabım'dan DOĞRUDAN bölüme açılış → ← ve ilk geri paneli kapatır, Hesabım'a (kaydırma konumuyla) döner; çip geçişi bu durumu korur
  for(const how of ['geri','ok']){
   await p.evaluate(()=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());window.scrollTo(0,250)});await W(300);const y0=await p.evaluate(()=>Math.round(scrollY));
   await p.evaluate(()=>{window.PF.roles={is_admin:true,roles:['super']};PF.openAdmin('oz_overview')});await W(1400);
   await p.evaluate(()=>{[...document.querySelectorAll('.pfxSecG .pfxSC')].find(b=>b.childNodes[0].textContent==='Siparişler').click()});await W(1100);
   r=await S();ok(r.title==='Siparişler','['+T+'] doğrudan giriş + çip geçişi');
   if(how==='geri'){await p.goBack();await W(1000)}else{await p.evaluate(()=>document.querySelector('.pfxOv .pfxBack').click());await W(600)}
   r=await S();const y1=await p.evaluate(()=>Math.round(scrollY));
   ok(!r.open&&await p.evaluate(()=>!!document.querySelector('#app .hmAcc'))&&Math.abs(y1-y0)<=2,'['+T+'] doğrudan giriş → '+(how==='geri'?'Android geri':'←')+' paneli kapatır, Hesabım aynı konumda: '+JSON.stringify({o:r.open,y0,y1}));
  }
  // listeden giriş + alt menüden listeye geçiş korunur
  await openA();await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxPN [data-pane=queues]').click());await W(300);await p.evaluate(()=>document.querySelector('#pfxAdmHome [data-tab=oz_orders]').click());await W(1200);
  await p.evaluate(()=>document.querySelector('.pfxOv .pfxBack').click());await W(800);r=await S();ok(r.open&&r.home&&r.pane==='queues','['+T+'] listeden giriş → ← bölme listesi (eski davranış)');
  await p.evaluate(()=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());PF.openAdmin('oz_overview')});await W(1300);
  await p.evaluate(()=>document.querySelector('.pfxOv .pfxPN [data-pane=queues]').click());await W(900);r=await S();ok(r.open&&r.home&&r.pane==='queues','['+T+'] doğrudan girişte alt menüden bölme listesine geçilebilir');
  await p.evaluate(()=>document.querySelector('#pfxAdmHome [data-tab=oz_sellers]').click());await W(1200);await p.goBack();await W(900);r=await S();ok(r.open&&r.home,'['+T+'] alt menüyle listeye geçtikten sonra bölümden geri → liste');
  await p.evaluate(()=>document.querySelectorAll('.pfxOv').forEach(x=>x.remove()));
  // P32: Yemek bölümü — sayı = pending_couriers + open_issues (mevcut food_admin_overview), 5 kısayol, kısayol paneli kapatıp mevcut Yemek ekranını açar
  DATA=Object.assign({},SAMPLE,{/* P32b: 1 bekleyen + 1 reddedilen + 1 askıdaki kurye → yalnız 1 sayılır */food_admin_overview:{pending_couriers:[{id:'c1',status:'pending'},{id:'c2',status:'rejected'},{id:'c3',status:'suspended'}],open_issues:[{id:'i1'}],searching_deliveries:3,orders_by_status:{new:4,delivered:10}}});await openA();
  r=await p.evaluate(()=>{const H=document.getElementById('pfxAdmHome');const now=H.querySelector('[data-pane=today] .pfxNowC[data-tab=food]');const q=H.querySelector('[data-pane=queues] .pfxQB[data-tab=food]');
   return {now:now?{n:now.querySelector('.pfxNum').textContent,sub:(now.querySelector('small')||{}).textContent||''}:null,q:q?(q.querySelector('.pfxCnt')||{}).textContent:null}});
  ok(r.now&&r.now.n==='2'&&r.now.sub==='1 kurye başvurusu · 1 açık sorun'&&r.q==='2','['+T+'] P32b: Yemek Bugün + Kuyruklar, sayı yalnız bekleyen kurye 1 + sorun 1 = 2: '+JSON.stringify(r));
  await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxNowC[data-tab=food]').click());await W(1200);
  r=await p.evaluate(()=>({t:(document.querySelector('.pfxOv .pfxAdmT')||{}).textContent,path:(document.querySelector('.pfxOv .pfxAdmP')||{}).textContent,
   go:[...document.querySelectorAll('#pfxAdm .pfxFoodGo .pfxBtn')].map(b=>b.dataset.food),sumRow:document.querySelectorAll('#pfxAdm .pfxStrip').length===1,goCols:new Set([...document.querySelectorAll('#pfxAdm .pfxFoodGo .pfxBtn')].map(b=>Math.round(b.getBoundingClientRect().left))).size,pills:[...document.querySelectorAll('#pfxAdm .pfxSt')].map(x=>x.textContent),h:[...document.querySelectorAll('#pfxAdm .pfxFoodGo .pfxBtn')].map(b=>Math.round(b.getBoundingClientRect().height))}));
  ok(r.t==='Yemek'&&r.path==='Yönetim › Kuyruklar'&&JSON.stringify(r.go)==='["showFoodOpsCenter","showFoodOnboarding","showFoodAdminPromos","showFoodAdminReviews","showFoodAdmin"]'&&r.h.every(h=>h>=44)&&r.goCols===2,'['+T+'] P32/P33: Yemek bölümü 5 kısayol 2 sütun kart: '+JSON.stringify(r));
  ok(JSON.stringify(r.pills.slice(0,3))==='["Kurye arayan sipariş: 3","Kurye başvurusu: 1","Açık sorun: 1"]'&&r.pills.includes('Son 7 gün · Yeni: 4')&&r.pills.includes('Teslim: 10')&&r.sumRow,'['+T+'] P32: Yemek özeti: '+JSON.stringify(r.pills));
  a=await p.evaluate(CONTRAST,'#pfxAdm');ok(!a.bad.length&&!a.small.length,'['+T+'] P32: Yemek bölümü kontrast/boyut: '+JSON.stringify(a));
  ok((await S()).ovf<=0,'['+T+'] P32: Yemek bölümü yatay taşma');await shot('p34-'+T+'-yemek');
  await p.evaluate(()=>{window.__fc=[];const k=['showFoodAdmin','showFoodOpsCenter'];window.__fo={};k.forEach(n=>{window.__fo[n]=window[n];window[n]=function(){window.__fc.push(n)}})});
  await p.evaluate(()=>document.querySelector('#pfxAdm .pfxFoodGo [data-food=showFoodOpsCenter]').click());await W(300);
  r=await p.evaluate(()=>({c:window.__fc,ov:document.querySelectorAll('.pfxOv').length}));
  ok(JSON.stringify(r.c)==='["showFoodAdmin","showFoodOpsCenter"]'&&r.ov===0,'['+T+'] P32: kısayol paneli kapatır, showFoodAdmin → showFoodOpsCenter: '+JSON.stringify(r));
  await p.evaluate(()=>{for(const n in window.__fo)window[n]=window.__fo[n]});
  // P37: özet etiketleri düğme — doğru showFood… çağrısı (Kurye başvurusu → Başvurular, Kuryeler süzgeci)
  for(const [fn,arg] of [['showFoodOnboarding','courier'],['showFoodOpsCenter',null],['showFoodAdmin',null]]){
   await p.evaluate(()=>PF.openAdmin('food'));await W(1200);
   r=await p.evaluate(([fn])=>{const b=document.querySelector('#pfxAdm .pfxStB[data-food='+fn+']');if(!b)return null;const R=b.getBoundingClientRect();
    window.__fc=[];window.__fo={};['showFoodAdmin','showFoodOnboarding','showFoodOpsCenter'].forEach(n=>{window.__fo[n]=window[n];window[n]=function(a){window.__fc.push(n+(a?':'+a:''))}});
    const tag=b.tagName,al=b.getAttribute('aria-label'),h=Math.round(R.height);b.click();return {tag,al,h,c:window.__fc,ov:document.querySelectorAll('.pfxOv').length}},[fn]);
   await p.evaluate(()=>{for(const n in window.__fo)window[n]=window.__fo[n]});
   const exp=fn==='showFoodAdmin'?['showFoodAdmin']:['showFoodAdmin',fn+(arg?':'+arg:'')];
   ok(r&&r.tag==='BUTTON'&&/: \d+, aç$/.test(r.al)&&r.h>=44&&JSON.stringify(r.c)===JSON.stringify(exp)&&r.ov===0,'['+T+'] P37: etiket düğme → '+exp.join(' → ')+': '+JSON.stringify(r));
  }
  await openA();await p.evaluate(()=>PF.openAdmin('food'));await W(1200);
  a=await p.evaluate(CONTRAST,'#pfxAdm .pfxFoodSum');ok(!a.bad.length&&!a.small.length,'['+T+'] P37: etiket kontrastı ≥4.5 ve ≥44px: '+JSON.stringify(a));
  await shot('p37-'+T+'-yemek');DATA=SAMPLE;
  // Özüne Dön Özet: Siparişler kutusu küçük renkli etiketler
  await openA();await p.evaluate(()=>PF.openAdmin('oz_overview'));await W(1600);
  r=await p.evaluate(()=>{const k=document.querySelector('[data-kpi=orders]');if(!k)return null;const t=[...k.querySelectorAll('.ozKT')];return {tags:t.map(x=>x.textContent.trim()),fs:t.map(x=>parseFloat(getComputedStyle(x).fontSize)),cls:t.map(x=>x.className)}});
  ok(r&&JSON.stringify(r.tags)==='["İade edildi 1","Teslim edildi 2"]'&&r.fs.every(v=>v<=13)&&r.cls[0]!==r.cls[1],'['+T+'] Özet Siparişler etiketleri (yazı + sayı, küçük, renkli): '+JSON.stringify(r));
  a=await p.evaluate(CONTRAST,'[data-kpi=orders]');ok(!a.bad.length,'['+T+'] Özet etiket kontrastı: '+JSON.stringify(a.bad));
  await shot('p23b-'+T+'-ozet');
  ok((await S()).ovf<=0,'['+T+'] Özet yatay taşma');
 }
 // yetkisiz: finans rolü yalnız Para bölümleri; Özüne Dön yok
 await openA(['finance']);await p.evaluate(()=>PF.openAdmin('campaigns'));await W(1000);let r=await S();
 ok(JSON.stringify(r.chips.map(c=>c.t))==='["Finans","Kampanyalar","Gelir"]'&&r.nav&&JSON.stringify(r.nav.items)==='["today","money"]','[yetki] finans: yalnız yetkili kardeşler ve bölmeler: '+JSON.stringify({c:r.chips.map(c=>c.t),n:r.nav&&r.nav.items}));
 await openA(['moderator']);await p.evaluate(()=>PF.openAdmin('reports'));await W(1000);r=await S();
 ok(r.chips.length&&r.chips.every(c=>!/Destek|KVKK|Özet|Finans/.test(c.t)),'[yetki] moderatör: destek/KVKK/Özüne Dön/finans çipi yok: '+JSON.stringify(r.chips.map(c=>c.t)));
 ok(await p.evaluate(()=>{PF.openAdmin('oz_overview');return true})&&!(await S()).chips.some(c=>c.t==='Özet'),'[yetki] moderatör Özüne Dön bölümüne giremez');
 // P32: Yemek rolü (ops/super) yoksa bölüm hiçbir yerde yok
 DATA=Object.assign({},SAMPLE,{food_admin_overview:{pending_couriers:[{id:'c1',status:'pending'}],open_issues:[]}});await openA(['moderator']);
 ok(await p.evaluate(()=>!document.querySelector('#pfxAdmHome [data-tab=food]')),'[yetki] moderatör: Yemek bölümü görünmez');
 await p.evaluate(()=>PF.openAdmin('food'));await W(900);ok(await p.evaluate(()=>(document.querySelector('.pfxOv .pfxAdmT')||{}).textContent!=='Yemek'),'[yetki] moderatör Yemek bölümüne giremez');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 // P37: gerçek dokunmatik bağlam (hasTouch + isMobile), 390px krem + koyu: Yemek bölümündeki her düğmenin merkezinde kendisi var; tap çalışır
 for(const th of ['light','dark']){const T='[dokunmatik '+(th==='light'?'krem':'koyu')+']';
  const t=await open(br,{w:390,h:844,visible:true,view:'',theme:'',touch:true});const tp=t.p;
  const TD=Object.assign({},SAMPLE,{food_admin_overview:{pending_couriers:[{id:'c1',status:'pending'}],open_issues:[{id:'i1'}],searching_deliveries:2,orders_by_status:{delivered:1}}});
  await tp.route('**/rest/v1/rpc/*',q=>{const fn=q.request().url().split('/rpc/')[1].split('?')[0];return q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fn in TD?TD[fn]:[])})});
  await tp.reload();await tp.waitForTimeout(1500);
  await tp.evaluate(t=>{applyAppTheme(t);showHome()},th);await tp.waitForTimeout(400);await tp.evaluate(()=>showAccount());await tp.waitForTimeout(700);
  await tp.evaluate(()=>{window.PF.roles={is_admin:true,roles:['super']};PF._admCnt=null;PF.openAdmin('food')});await tp.waitForTimeout(1400);
  let q=await tp.evaluate(()=>[...document.querySelectorAll('.pfxOv .pfxSh button')].map(b=>{b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {t:(b.getAttribute('aria-label')||b.textContent).trim().slice(0,24),ok:!!e&&(e===b||b.contains(e)),hit:e&&!(e===b||b.contains(e))?String(e.className||e.tagName):''}}));
  ok(q.length>=20&&q.every(x=>x.ok),T+' P37: tüm düğmelerde elementFromPoint(merkez) = düğme ('+q.length+'): '+JSON.stringify(q.filter(x=>!x.ok)));
  for(const sel of ['.pfxFoodGo [data-food=showFoodOnboarding]','.pfxStB[data-food=showFoodOnboarding]']){
   await tp.evaluate(()=>PF.openAdmin('food'));await tp.waitForTimeout(1100);
   const c=await tp.evaluate(s=>{window.__fc=[];window.__fo={};['showFoodAdmin','showFoodOnboarding'].forEach(n=>{window.__fo[n]=window[n];window[n]=function(a){window.__fc.push(n+(a?':'+a:''))}});
    const b=document.querySelector('#pfxAdm '+s);b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]},sel);
   await tp.touchscreen.tap(c[0],c[1]);await tp.waitForTimeout(400);
   q=await tp.evaluate(()=>{const r={c:window.__fc,ov:document.querySelectorAll('.pfxOv').length};for(const n in window.__fo)window[n]=window.__fo[n];return r});
   ok(q.c[0]==='showFoodAdmin'&&/^showFoodOnboarding/.test(q.c[1]||'')&&(sel.indexOf('pfxStB')<0||q.c[1]==='showFoodOnboarding:courier')&&q.ov===0,T+' P37: touchscreen.tap '+sel+': '+JSON.stringify(q));
  }
  ok(!t.st.errors.length,T+' sayfa hatası: '+t.st.errors.join(' | '));await t.p.context().close();
 }
 await br.close();
 if(fails.length){console.error('p23b-bolum-gezinme BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p23b-bolum-gezinme: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p23b-bolum-gezinme HATA:',e);process.exit(1)});
