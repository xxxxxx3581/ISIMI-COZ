// AJ2-E: yan menü + yönetim paneli ana listesi — 390px (taşma 320/768/1280), iki tema, sahte RPC (ağ), veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj3-menu.test.js
// Doğrulanan: menü sırası (Başlat → kategori kısayolları → İşlerim → Hizmet verenler için → Diğer çalışma alanları → [Yönetim] → Hesap → Çıkış);
// rozetler yalnız mevcut okumalardan (window.__hzCnt: hzPing/hzCustAlerts; PF._admN: panel sayıları) ve sayı + yazı ("2 yeni"); bilinmiyorsa rozet yok,
// 0 ise gri "0"; yeni talep varsa satır vurgulu; "Yönetim" yalnız PF.roles.is_admin iken; "Ayarlar ve hesap" aynı yerde açılan alt liste
// (tema, dil, gizlilik, destek, yasal, künye, paylaş — hiçbiri silinmedi), aria-expanded; Yardım satırı adı korunur; tema geçişi; iki temada
// AA ≥4.5 ve dokunma ≥44; Esc menüyü kapatır. Yönetim paneli: "Şimdi bakılacaklar" yalnız sayısı >0 olanlar (Şikâyetler en üstte, büyük sayı),
// hepsi 0 → "Her şey yolunda ✓"; gruplar; yetkili her sekmeye (Özüne Dön alt ekranları dahil) bir düğmeden ulaşılır; yalnız mevcut okuma RPC'leri.
const {chromium,open}=require('./harness.js');
const SAMPLE={pf_public_settings:{},pf_my_roles:{is_admin:true,roles:['super']},pf_admin_reports:[{id:'r1'},{id:'r2'}],pf_admin_listing_queue:[{id:'l1',created_at:new Date(Date.now()-86400000*1.5).toISOString()},{id:'l2'},{id:'l3'},{id:'l4'}],
 pf_admin_venue_queue:[{venue_id:'v1',stage:'in_review'},{venue_id:'v2',stage:'active'}],pf_admin_data_requests:[{id:'d',status:'completed'}],pf_admin_tickets:[{id:'t1',status:'open'},{id:'t2',status:'resolved'}],oz_admin_overview:{orders_open:3,returns_open:1}};
const ZERO={pf_public_settings:{},pf_my_roles:{is_admin:true,roles:['super']},oz_admin_overview:{orders_open:0,returns_open:0}};
const READS=['pf_admin_reports','pf_admin_listing_queue','pf_admin_venue_queue','pf_admin_data_requests','pf_admin_tickets','oz_admin_overview'];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 let DATA=SAMPLE;const net=[];
 await p.route('**/rest/v1/rpc/*',r=>{const fn=r.request().url().split('/rpc/')[1].split('?')[0];net.push(fn);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fn in DATA?DATA[fn]:[])})});
 await p.reload();await p.waitForTimeout(1500);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await p.evaluate(()=>showHome());await p.waitForTimeout(600);
 const setTheme=t=>p.evaluate(t=>applyAppTheme(t),t);
 const openD=async(admin,cnt)=>{await p.evaluate(([a,c])=>{window.PF.roles=a?{is_admin:true,roles:['super']}:{is_admin:false,roles:[]};if(c===null)delete window.__hzCnt;else window.__hzCnt=c;updateAuthArea();openAppDrawer()},[admin,cnt]);await p.waitForTimeout(300)};
 const closeD=()=>p.evaluate(()=>closeAppDrawer());
 const D=()=>p.evaluate(()=>{const d=document.getElementById('appDrawer');const kids=[...d.children].filter(x=>x.offsetParent||x.id==='drwAdmin');
  const seq=kids.map(x=>x.classList.contains('appDrawerSec')?'§'+x.textContent:x.classList.contains('drwStart')?'Başlat':x.classList.contains('drwChips')?'chips:'+x.querySelectorAll('button').length:x.id==='drwAdmin'?(x.textContent?'§'+x.querySelector('.appDrawerSec').textContent+'|'+x.querySelector('button').innerText.replace(/\s+/g,' ').trim():''):x.id==='drawerAuth'?'auth:'+x.innerText.replace(/\s+/g,' ').trim():x.classList.contains('appDrawerHead')?'head':x.classList.contains('appDrawerNav')?'nav:'+[...x.children].filter(b=>b.tagName==='BUTTON').map(b=>b.innerText.replace(/\s+/g,' ').trim()).join(' / '):'?').filter(Boolean);
  const b=i=>{const e=document.getElementById(i);return e?{hid:e.hidden,t:e.textContent,c:e.className,al:e.getAttribute('aria-label')}:null};
  return {seq,mine:b('drwMineN'),req:b('drwReqN'),reqHot:document.getElementById('drwReq').classList.contains('hot'),adm:b('drwAdmN'),
   chips:[...d.querySelectorAll('.drwChips')[0].querySelectorAll('button')].map(x=>x.textContent.trim()),aria:d.getAttribute('aria-hidden')}});
 // üye (yönetici değil), sayılar: 3 yeni talep, 2 yeni teklif
 await openD(false,{prov:3,cust:2});let d=await D();
 ok(d.seq.join(' | ')==='head | Başlat | chips:5 | §İşlerim | nav:📂 Benim işlerim 2 yeni / ♡ Favorilerim / 🔖 Kayıtlı aramalar | §Hizmet verenler için | nav:📋 Gelen talepler 3 yeni / 🔧 Usta & Hizmet panelim › | §Diğer çalışma alanları | chips:3 | §Hesap | nav:⚙️ Ayarlar ve hesap Tema · Dil · Yasal › / ❓ Yardım — ne yapmak istiyorsun? › | auth:Çıkış yap',
  'menü sırası (üye): '+JSON.stringify(d.seq));
 ok(d.chips.join('|')==='🔎 Tüm ilanlar|🚗 Araç|🏠 Konut|🏢 İş yeri|🌳 Arsa','kategori kısayolları: '+d.chips.join('|'));
 ok(d.mine&&!d.mine.hid&&d.mine.t==='2 yeni'&&/\bok\b/.test(d.mine.c)&&d.mine.al==='2 yeni teklif','Benim işlerim yeşil "2 yeni": '+JSON.stringify(d.mine));
 ok(d.req&&d.req.t==='3 yeni'&&/\bwarn\b/.test(d.req.c)&&d.reqHot&&d.req.al==='3 yeni talep','Gelen talepler sarı "3 yeni" + vurgulu satır: '+JSON.stringify([d.req,d.reqHot]));
 ok(d.aria==='false','menü açık (aria-hidden=false)');
 await closeD();await openD(false,{prov:0,cust:0});d=await D();
 ok(d.mine.hid&&!d.req.hid&&d.req.t==='0'&&!/warn/.test(d.req.c)&&!d.reqHot,'sayı 0: Benim işlerim rozetsiz, Gelen talepler gri "0": '+JSON.stringify([d.mine,d.req]));
 await closeD();await openD(false,null);d=await D();ok(d.req.hid&&d.mine.hid,'sayı bilinmiyorsa rozet yok: '+JSON.stringify([d.mine,d.req]));
 // Ayarlar ve hesap alt listesi
 const acct=()=>p.evaluate(()=>{const b=document.getElementById('drwAcctBtn'),l=document.getElementById('drwAcct');return {exp:b.getAttribute('aria-expanded'),hid:l.hidden,items:[...l.querySelectorAll('button')].map(x=>x.innerText.replace(/\s+/g,' ').trim())}});
 let a=await acct();ok(a.exp==='false'&&a.hid,'alt liste kapalı başlar: '+JSON.stringify(a));
 await p.click('#drwAcctBtn');a=await acct();
 ok(a.exp==='true'&&!a.hid&&a.items.join(' / ')==='🌓 Açık temaya geç / 🌐 Dil: Türkçe yakında: diğer diller / 🔐 Gizlilik ve verilerim / 🎧 Destek ve uyuşmazlık / 📜 Yasal metinler / 🏢 Künye ve iletişim / ↗ Siteyi paylaş',
  'Ayarlar ve hesap: tüm eski öğeler aynı yerde: '+JSON.stringify(a));
 // tema geçişi + iki temada AA ve dokunma
 const AT=()=>p.evaluate(()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
  const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const mix=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
  const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let c={r:255,g:255,b:255,a:1};ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);if(b.a>0)c=mix(b,c)});return c};
  const d=document.getElementById('appDrawer'),bad=[],small=[];
  d.querySelectorAll('button,.appDrawerSec,.drwBdg,.dv,small,b').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden'||!e.textContent.trim())return;
   if(e.tagName==='BUTTON'&&!e.disabled&&(r.height<44-.5||r.width<44-.5))small.push(e.textContent.trim().slice(0,20)+' '+Math.round(r.width)+'x'+Math.round(r.height));
   if(e.disabled)return;const z=eff(e),t=mix(P(getComputedStyle(e).color),z),x=L(t),y=L(z),v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)bad.push(e.textContent.trim().slice(0,24)+' '+v.toFixed(2))});
  return {bad,small,theme:document.documentElement.getAttribute('data-theme')}});
 let t=await AT();ok(t.theme==='dark'&&!t.bad.length&&!t.small.length,'[koyu] menü AA ve dokunma ≥44: '+JSON.stringify(t));
 await p.click('#drwAcct button:first-child');await p.waitForTimeout(200);t=await AT();a=await acct();
 ok(t.theme==='light'&&/Koyu temaya geç/.test(a.items[0])&&!t.bad.length&&!t.small.length,'[açık] tema geçişi, AA ve dokunma ≥44: '+JSON.stringify([t,a.items[0]]));
 await setTheme('dark');await p.click('#drwAcctBtn');
 // yönetici: Yönetim satırı ve panel sayıları
 await closeD();await p.evaluate(()=>{window.PF.roles={is_admin:true,roles:['super']};PF._admCnt=null;PF.openAdmin()});await p.waitForTimeout(1500);
 const H=()=>p.evaluate(()=>{const h=document.getElementById('pfxAdmHome');if(!h)return null;return {now:[...h.querySelectorAll('.pfxNowC')].map(b=>({tab:b.dataset.tab,n:b.querySelector('.pfxNum').textContent,cls:b.querySelector('.pfxNum').className,t:b.querySelector('.tx b').textContent,al:b.getAttribute('aria-label'),h:Math.round(b.getBoundingClientRect().height)})),
  ok:!!h.querySelector('.pfxAllOk'),heads:[...h.querySelectorAll('.pfxMenuH')].map(x=>x.textContent),tabs:[...h.querySelectorAll('[data-tab]')].map(b=>b.dataset.tab),
  oz:[...h.querySelectorAll('.pfxOzC [data-tab]')].map(b=>b.getAttribute('aria-label')),small:[...h.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height<44-.5).map(b=>b.textContent.trim()),
  tk:(h.querySelector('[data-tab=tickets] .pfxCnt')||{}).textContent||null,sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
 let h=await H();
 ok(h&&h.now.map(x=>x.t+':'+x.n).join('|')==='Şikâyetler:2|Onay bekleyen ilanlar:4|İşletme başvuruları:1|Özüne Dön siparişleri:4','Şimdi bakılacaklar (yalnız >0, Şikâyetler en üstte): '+JSON.stringify(h&&h.now));
 ok(h&&/\bbad\b/.test(h.now[0].cls)&&h.now.slice(1).every(x=>/\bwarn\b/.test(x.cls))&&h.now.every(x=>x.h>=60&&/bekleyen/.test(x.al)),'Şikâyetler kırmızı, diğerleri sarı, büyük kart, sayı + yazı: '+JSON.stringify(h&&h.now));
 ok(h&&h.now[3].tab==='oz_orders'&&/3 açık sipariş · 1 iade/.test(h.now[3].al),'Özüne Dön kartı siparişlere gider: '+JSON.stringify(h&&h.now[3]));
 ok(h&&h.heads.join('|')==='Şimdi bakılacaklar|İçerik ve kullanıcılar|Özüne Dön|Destek, yasal, sistem|Finans ve operasyon','gruplar: '+JSON.stringify(h&&h.heads));
 const all=await p.evaluate(()=>['docs','venues','lreview','reports','listings','providers','susp','tickets','kvkk','legal','company','finance','campaigns','revenue','settings','dispatch','hero','words','audit','oz_overview','oz_settings','oz_sellers','oz_products','oz_orders','oz_returns','oz_payouts','oz_categories','oz_moderation','oz_slides']);
 ok(h&&all.every(k=>h.tabs.indexOf(k)>=0||(k==='oz_returns'&&h.tabs.indexOf('oz_orders')>=0)),'her yetkili sekmeye bir düğmeden ulaşılır: eksik '+JSON.stringify(h&&all.filter(k=>h.tabs.indexOf(k)<0)));
 ok(h&&h.oz.join('|')==='Özüne Dön · Özet|Özüne Dön · Ayarlar|Özüne Dön · Satıcılar|Özüne Dön · Ürünler|Özüne Dön · Siparişler|Özüne Dön · İadeler|Özüne Dön · Ödemeler|Özüne Dön · Kategoriler|Özüne Dön · Moderasyon|Özüne Dön · Slaytlar','Özüne Dön kartı tüm alt ekranlar: '+JSON.stringify(h&&h.oz));
 ok(h&&h.tk==='1 açık'&&!h.small.length&&h.sw<=0,'Destek "1 açık", dokunma ≥44, taşma yok: '+JSON.stringify(h&&[h.tk,h.small,h.sw]));
 ok(net.filter(f=>/^(pf_admin|oz_admin)/.test(f)).every(f=>READS.indexOf(f)>=0),'yalnız mevcut okuma çağrıları: '+JSON.stringify([...new Set(net)]));
 await p.click('#pfxAdmHome [data-tab=reports]').catch(()=>fails.push('Şikâyetler kartı tıklanamadı'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/Şikâyetler/.test((document.querySelector('.pfxAdmT')||{}).textContent||'')),'Şikâyetler kartı ilgili ekranı açar');
 await p.evaluate(()=>document.querySelectorAll('.pfxOv').forEach(x=>x.remove()));
 await openD(true,{prov:0,cust:0});d=await D();
 ok(d.seq.indexOf('§Yönetim|🛡️ Yönetim paneli 11')===d.seq.indexOf('chips:3')+1&&d.adm&&d.adm.t==='11'&&/\bbad\b/.test(d.adm.c)&&d.adm.al==='11 bekleyen iş','yönetici: Hesap\'tan önce "Yönetim paneli" + kırmızı toplam (11): '+JSON.stringify([d.seq,d.adm]));
 await p.keyboard.press('Escape');await p.waitForTimeout(200);ok(await p.evaluate(()=>document.getElementById('appDrawer').getAttribute('aria-hidden'))==='true','Esc menüyü kapatır');
 // hepsi 0 → Her şey yolunda
 DATA=ZERO;await p.evaluate(()=>{PF._admCnt=null;PF.openAdmin()});await p.waitForTimeout(1500);h=await H();
 ok(h&&h.ok&&!h.now.length&&h.tabs.indexOf('reports')>=0&&h.tabs.indexOf('lreview')>=0,'hepsi 0: "Her şey yolunda ✓", sekmeler gruplarda: '+JSON.stringify(h&&{ok:h.ok,now:h.now.length}));
 await p.evaluate(()=>document.querySelectorAll('.pfxOv').forEach(x=>x.remove()));
 // taşma: menü ve panel, 320/768/1280, iki tema
 for(const th of ['dark','light'])for(const w of [320,390,768,1280]){await setTheme(th);await p.setViewportSize({width:w,height:844});
  await openD(true,{prov:3,cust:2});await p.click('#drwAcctBtn');const o=await p.evaluate(()=>{const d=document.getElementById('appDrawer'),r=d.getBoundingClientRect();return {sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth,dw:d.scrollWidth-d.clientWidth,r:Math.round(r.right),vw:innerWidth}});
  await p.click('#drwAcctBtn');await closeD();
  await p.evaluate(()=>PF.openAdmin());await p.waitForTimeout(500);const q=await p.evaluate(()=>{const b=document.querySelector('.pfxOv .pfxBody');return {sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth,bw:b?b.scrollWidth-b.clientWidth:-1}});
  await p.evaluate(()=>document.querySelectorAll('.pfxOv').forEach(x=>x.remove()));
  ok(o.sw<=0&&o.dw<=0&&o.r<=o.vw&&q.sw<=0&&q.bw<=0,'['+th+' '+w+'px] taşma yok (menü/panel): '+JSON.stringify([o,q]))}
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('aj3-menu BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aj3-menu: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('aj3-menu HATA:',e);process.exit(1)});
