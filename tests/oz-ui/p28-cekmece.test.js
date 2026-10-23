// Paket 28: İşimi Çöz ana menü (çekmece) yeniden düzeni (yalnız arayüz) — 390px, krem ve koyu, sahte RPC (ağ), veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p28-cekmece.test.js
// Doğrulanan: sıra (üst satır → Başlat → tek satır kategori şeridi → İşlerim 2x2 → Çalışma alanlarım → [Yönetim] → alt çubuk); tek "Çıkış yap" üst satırda
// (≥44px, ikon+yazı, aynı logoutUser), giriş yapmamışta aynı yerde "Giriş yap" (openAuthModal); tüm eski öğeler ve işlevleri (onclick aynı) erişilebilir;
// kutular ≥88px, rozet yalnız mevcut okumadan; Yönetim kartı yalnız PF.roles.is_admin, rozet PF._admN; alt çubuk 56px, çekmecenin dibinde, içerikle çakışmaz;
// "Ayarlar ve hesap" alt listesi alt çubuğun üstünde açılır; Kapat / dışarı dokun / Esc kapatır; yatay taşma yok (yalnız şerit kayar).
const {chromium,open}=require('./harness.js');
const OLD=[['showMine()','Benim işlerim'],['showFavorites()','Favorilerim'],['showSavedSearches()','Kayıtlı aramalar'],['showProviderEntry()','Gelen talepler'],["openWorkArea('hizmet')",'Usta & Hizmet panelim'],
 ["openWorkArea('resmi')",'Resmî işlemler'],["openWorkArea('gayrimenkul')",'Gayrimenkul işlemleri'],["openWorkArea('arac')",'Araç işlemleri'],['v2StartSheet()','Başlat'],['openA7SmartAI()','Yardım'],
 ["kesfetOpen('all',true)",'Tüm ilanlar'],["kesfetOpen('otomobil',true)",'Araç'],["kesfetOpen('konut',true)",'Konut'],["kesfetOpen('isyeri',true)",'İş yeri'],["kesfetOpen('arsa',true)",'Arsa'],
 ['toggleAppTheme()','Tema'],['shareAppSite()','Siteyi paylaş'],['PF.openLegal()','Yasal metinler'],['PF.openCompany()','Künye'],['PF.openPrivacy()','Gizlilik'],['PF.openSupport()','Destek']];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 await p.route('**/rest/v1/rpc/*',r=>{const fn=r.request().url().split('/rpc/')[1].split('?')[0];return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fn==='pf_my_roles'?{is_admin:true,roles:['super']}:fn==='pf_public_settings'?{}:[])})});
 await p.reload();await p.waitForTimeout(1500);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await p.evaluate(()=>showHome());await p.waitForTimeout(500);
 const openD=async(admin,cnt,admN)=>{await p.evaluate(([a,c,n])=>{window.PF.roles=a?{is_admin:true,roles:['super']}:{is_admin:false,roles:[]};window.PF._admN=n;if(c===null)delete window.__hzCnt;else window.__hzCnt=c;updateAuthArea();openAppDrawer()},[admin,cnt,admN]);await p.waitForTimeout(350)};
 const G=()=>p.evaluate(()=>{const d=document.getElementById('appDrawer');const R=e=>e.getBoundingClientRect();const T=x=>x.innerText.replace(/\s+/g,' ').trim();
  const kids=[...d.children].filter(x=>x.offsetParent&&R(x).height);const kind=x=>x.classList.contains('appDrawerHead')?'head':x.classList.contains('drwStart')?'start':x.classList.contains('drwChipsRow')?'chips':x.classList.contains('drwGrid')?'grid':x.classList.contains('drwW3')?'w3':x.id==='drwAdmin'?'adm':x.classList.contains('drwBar')?'bar':x.classList.contains('appDrawerSec')?'§'+x.textContent:x.classList.contains('drwSub')?'sub':x.classList.contains('appDrawerNav')?'nav':'?';
  const outs=[...d.querySelectorAll('button')].filter(b=>/Çıkış yap/.test(b.textContent)&&R(b).height);const ins=[...d.querySelectorAll('button')].filter(b=>/Giriş yap/.test(b.textContent)&&R(b).height);
  const chips=[...d.querySelectorAll('.drwChipsRow button')];const cr=d.querySelector('.drwChipsRow');const bar=d.querySelector('.drwBar');
  return {seq:kids.map(kind),outs:outs.map(b=>({inHead:!!b.closest('.appDrawerHead'),h:Math.round(R(b).height),svg:!!b.querySelector('svg'),on:b.getAttribute('onclick'),bd:getComputedStyle(b).borderTopColor})),
   ins:ins.map(b=>({inHead:!!b.closest('.appDrawerHead'),h:Math.round(R(b).height),on:b.getAttribute('onclick')})),
   chipsTop:new Set(chips.map(b=>Math.round(R(b).top))).size,chipScroll:cr.scrollWidth>cr.clientWidth,
   tiles:[...d.querySelectorAll('.drwGrid>button')].map(b=>({t:b.querySelector('b').textContent,h:Math.round(R(b).height),bg:getComputedStyle(b).backgroundColor,svg:!!b.querySelector('svg')})),
   bar:bar?{btn:[...bar.children].map(b=>[T(b),Math.round(R(b).height)]),bottom:Math.round(R(bar).bottom),dB:Math.round(R(d).bottom)}:null,
   adm:(()=>{const a=d.querySelector('#drwAdmin button');return a?{t:T(a),n:(document.getElementById('drwAdmN')||{}).hidden===false?document.getElementById('drwAdmN').textContent:null,h:Math.round(R(a).height)}:null})(),
   req:(()=>{const e=document.getElementById('drwReqN');return e.hidden?null:e.textContent})(),sw:d.scrollWidth-d.clientWidth,
   html:d.innerHTML}});
 for(const th of ['light','dark']){const T='['+(th==='light'?'krem':'koyu')+']';
  await p.evaluate(t=>applyAppTheme(t),th);
  // üye (yönetici değil)
  await openD(false,{prov:3,cust:0},null);let g=await G();
  ok(g.seq.join(',')==='head,start,chips,§İşlerim,grid,§Çalışma alanlarım,nav,w3,bar',T+' sıra: '+g.seq.join(','));
  ok(g.outs.length===1&&g.outs[0].inHead&&g.outs[0].h>=44&&g.outs[0].svg&&/logoutUser\(\)/.test(g.outs[0].on)&&!g.ins.length,T+' tek Çıkış üst satırda (≥44px, ikon, logoutUser): '+JSON.stringify(g.outs));
  ok(g.chipsTop===1&&g.chipScroll,T+' kategori çipleri tek satır, yatay kayar: '+JSON.stringify([g.chipsTop,g.chipScroll]));
  ok(JSON.stringify(g.tiles.map(x=>x.t))==='["Benim işlerim","Gelen talepler","Favorilerim","Kayıtlı aramalar"]'&&g.tiles.every(x=>x.h>=88&&x.svg)&&new Set(g.tiles.map(x=>x.bg)).size===4,T+' İşlerim 2x2 renkli kutu ≥88px, ikon+yazı: '+JSON.stringify(g.tiles));
  ok(g.req==='3 yeni',T+' Gelen talepler rozeti mevcut okumadan: '+g.req);
  ok(g.adm===null,T+' yönetici değil: Yönetim kartı yok');
  ok(g.bar&&g.bar.btn.length===2&&/^Ayarlar ve hesap/.test(g.bar.btn[0][0])&&/^Yardım/.test(g.bar.btn[1][0])&&g.bar.btn.every(x=>x[1]>=56)&&Math.abs(g.bar.bottom-g.bar.dB)<=2,T+' alt çubuk 56px, dipte: '+JSON.stringify(g.bar));
  ok(g.sw<=0,T+' yatay taşma: '+g.sw);
  const miss=OLD.filter(([fn])=>!g.html.includes(fn));ok(!miss.length,T+' tüm eski öğeler erişilebilir (aynı işlev): eksik '+JSON.stringify(miss));
  // Ayarlar ve hesap alt listesi: alt çubuğun üstünde, görünür
  await p.click('#drwAcctBtn');await p.waitForTimeout(200);
  let r=await p.evaluate(()=>{const l=document.getElementById('drwAcct'),b=document.querySelector('.drwBar');const lr=l.getBoundingClientRect(),br=b.getBoundingClientRect();return {hid:l.hidden,exp:document.getElementById('drwAcctBtn').getAttribute('aria-expanded'),lb:Math.round(lr.bottom),bt:Math.round(br.top),n:l.querySelectorAll('button').length}});
  ok(!r.hid&&r.exp==='true'&&r.lb<=r.bt+1&&r.n>=7,T+' Ayarlar ve hesap alt listesi alt çubuğun üstünde: '+JSON.stringify(r));
  // içerik sonu alt çubukla çakışmaz
  r=await p.evaluate(()=>{const d=document.getElementById('appDrawer');d.scrollTop=d.scrollHeight;const l=document.getElementById('drwAcct').getBoundingClientRect(),b=document.querySelector('.drwBar').getBoundingClientRect();return [Math.round(l.bottom),Math.round(b.top)]});
  ok(r[0]<=r[1]+1,T+' kaydırma sonunda içerik alt çubuğun üstünde: '+r);
  await p.click('#drwAcctBtn');
  // Çıkış → aynı işlev
  await p.evaluate(()=>{window.__lo=0;window.__lu=window.logoutUser;window.logoutUser=function(){window.__lo++}});await p.evaluate(()=>document.querySelector('#appDrawer .appDrawerHead .drwOut').click());
  ok(await p.evaluate(()=>window.__lo===1&&!document.getElementById('appDrawer').classList.contains('on')),T+' Çıkış → logoutUser (menü kapanır)');await p.evaluate(()=>{window.logoutUser=window.__lu});
  // yönetici: Yönetim kartı + PF._admN rozeti
  await openD(true,{prov:0,cust:0},11);g=await G();
  ok(g.seq.join(',')==='head,start,chips,§İşlerim,grid,§Çalışma alanlarım,nav,w3,adm,bar'&&g.adm&&/^Yönetim paneli/.test(g.adm.t)&&g.adm.n==='11'&&g.adm.h>=44,T+' yönetici: Yönetim kartı (rozet PF._admN): '+JSON.stringify([g.seq,g.adm]));
  await p.evaluate(()=>closeAppDrawer());await openD(true,{prov:0,cust:0},null);g=await G();ok(g.adm&&g.adm.n===null,T+' PF._admN yoksa Yönetim rozeti yok');
  // kapatma: Kapat, dışarı dokun, Esc
  await p.evaluate(()=>document.querySelector('#appDrawer .appDrawerHead .smallBtn').click());ok(await p.evaluate(()=>!document.getElementById('appDrawer').classList.contains('on')),T+' Kapat');
  await openD(false,null,null);await p.mouse.click(380,400);await p.waitForTimeout(200);ok(await p.evaluate(()=>!document.getElementById('appDrawer').classList.contains('on')),T+' dışarı dokununca kapanır');
  await openD(false,null,null);await p.keyboard.press('Escape');ok(await p.evaluate(()=>!document.getElementById('appDrawer').classList.contains('on')&&document.body.style.overflow===''),T+' Esc kapatır, sayfa kaydırması geri gelir');
  // giriş yapmamış
  await p.evaluate(()=>{window.__ses=localStorage.getItem('isimi_coz_auth_session');localStorage.removeItem('isimi_coz_auth_session')});await openD(false,null,null);g=await G();
  ok(!g.outs.length&&g.ins.length===1&&g.ins[0].inHead&&g.ins[0].h>=44&&/openAuthModal\('login'\)/.test(g.ins[0].on),T+' giriş yapmamış: üst satırda Giriş yap, Çıkış yok: '+JSON.stringify([g.outs,g.ins]));
  ok(g.sw<=0,T+' giriş yapmamış taşma yok');
  await p.evaluate(()=>{closeAppDrawer();localStorage.setItem('isimi_coz_auth_session',window.__ses);updateAuthArea()});
 }
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p28-cekmece BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p28-cekmece: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p28-cekmece HATA:',e);process.exit(1)});
