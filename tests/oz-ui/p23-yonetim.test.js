// Paket 23: yönetim ana görünümü Bugün / Kuyruklar / Para / Sistem (yalnız arayüz) — 390px, krem (açık) ve koyu tema, sahte RPC.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p23-yonetim.test.js   (P23_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: 4 alt menü öğesi (≥62px, ikon+yazı, seçili dolu sarı) sheet içinde yapışkan; Bugün: "N iş seni bekliyor" kırmızı kutu (hepsi 0 → yeşil
// "Her şey yolunda ✓"), bekleyen satırlar renk şeridi + sayı, Özüne Dön durum etiketleri, 3 kısayol; Kuyruklar: arama + çip süzgeci (istemci), Özüne Dön
// kartı (Satıcılar/Siparişler/İadeler), 2 sütun kutu (sayısı >0 olan renkli çerçeve ve en üstte, başlık rozetin altına girmez); Para / Sistem listeleri;
// "← Bölümler" aynı bölmeye döner; yetkisiz sekme hiçbir yerde yok, boş bölme menüde yok; tüm yetkili bölümlere ulaşılır; kontrast ≥4.5, ≥44px, taşma yok.
const {chromium,open}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P23_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SAMPLE={pf_public_settings:{},pf_my_roles:{is_admin:true,roles:['super']},pf_admin_reports:[{id:'r1'},{id:'r2'}],pf_admin_listing_queue:[{id:'l1',created_at:new Date(Date.now()-86400000*3.2).toISOString()},{id:'l2'},{id:'l3'},{id:'l4'},{id:'l5'}],
 pf_admin_venue_queue:[{venue_id:'v1',stage:'in_review'}],pf_admin_data_requests:[],pf_admin_tickets:[],oz_admin_overview:{orders_open:3,returns_open:1,sellers_pending:1},oz_admin_settings:{oz_market_enabled:false,oz_orders_enabled:false,oz_payment_mock_enabled:true}};
const ZERO={pf_public_settings:{},pf_my_roles:{is_admin:true,roles:['super']},oz_admin_overview:{orders_open:0,returns_open:0}};
const AUDIT=()=>{const L=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const P=c=>c.match(/[\d.]+/g).map(Number);const mix=(f,b)=>{const a=f.length>3?f[3]:1;return 'rgb('+[0,1,2].map(i=>f[i]*a+b[i]*(1-a)).join(',')+')'};
 const eff=e=>{const st=[];for(;e;e=e.parentElement){const c=P(getComputedStyle(e).backgroundColor);if(c.length<4||c[3]>0){st.push(c);if(c.length<4||c[3]>=1)break}}let b=[255,255,255];st.reverse().forEach(c=>{b=P(mix(c,b))});return b};
 const R=document.getElementById('pfxAdmHome');const bad=[],small=[];
 R.querySelectorAll('b,small,span,button,input').forEach(e=>{const r=e.getBoundingClientRect();if(!r.height||!(e.textContent||e.placeholder||'').trim())return;if(e.tagName==='BUTTON'&&r.height<44-.5)small.push((e.textContent||'').trim().slice(0,18)+':'+Math.round(r.height));
  if([...e.children].some(c=>c.textContent.trim()===e.textContent.trim()))return;const z=eff(e),fg=P(mix(P(getComputedStyle(e).color),z));const x=L('rgb('+fg.join(',')+')'),y=L('rgb('+z.join(',')+')');const v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)bad.push((e.textContent||'').trim().slice(0,20)+':'+v.toFixed(2))});
 return {bad,small}};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const shots=[];
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 let DATA=SAMPLE;
 await p.route('**/rest/v1/rpc/*',r=>{const fn=r.request().url().split('/rpc/')[1].split('?')[0];return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fn in DATA?DATA[fn]:[])})});
 await p.reload();await p.waitForTimeout(1500);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await p.evaluate(()=>showHome());await p.waitForTimeout(500);
 const openA=async()=>{await p.evaluate(()=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());window.PF.roles={is_admin:true,roles:['super']};PF._admCnt=null;PF.openAdmin()});await p.waitForTimeout(1400)};
 const pane=async k=>{await p.evaluate(k=>document.querySelector('#pfxAdmHome .pfxPN [data-pane='+k+']').click(),k);await p.waitForTimeout(250)};
 const shot=async n=>{if(!SHOTS)return;const f=path.join(SHOTS,n+'.png');const el=await p.$('.pfxOv .pfxSh');await el.screenshot({path:f});shots.push(f)};
 for(const th of ['light','dark']){const T=th==='light'?'krem':'koyu';
  await p.evaluate(t=>applyAppTheme(t),th);DATA=SAMPLE;await openA();
  // alt menü
  let r=await p.evaluate(()=>{const n=document.querySelector('#pfxAdmHome .pfxPN');const sh=document.querySelector('.pfxOv .pfxSh').getBoundingClientRect();const nb=n.getBoundingClientRect();
   return {items:[...n.querySelectorAll('.pnItem')].map(b=>({t:b.querySelector('.l').textContent,h:Math.round(b.getBoundingClientRect().height),svg:!!b.querySelector('svg'),on:b.classList.contains('on'),bg:getComputedStyle(b).backgroundColor})),pos:getComputedStyle(n).position,atBottom:Math.abs(nb.bottom-sh.bottom)<=2,badge:(n.querySelector('.pnBdg')||{}).textContent}});
  ok(JSON.stringify(r.items.map(x=>x.t))==='["Bugün","Kuyruklar","Para","Sistem"]'&&r.items.every(x=>x.h>=62&&x.svg)&&r.items[0].on&&r.pos==='sticky'&&r.atBottom,'['+T+'] alt menü 4 öğe ≥62px, ikon+yazı, yapışkan altta: '+JSON.stringify(r));
  ok(r.items[0].bg===(th==='light'?'rgb(242, 193, 78)':'rgb(247, 210, 74)')&&r.badge==='12','['+T+'] seçili dolu sarı + Bugün rozeti (toplam): '+JSON.stringify([r.items[0].bg,r.badge]));
  // Bugün
  r=await p.evaluate(()=>{const s=document.querySelector('#pfxAdmHome [data-pane=today]');const b=s.querySelector('.pfxBig');
   return {big:b&&{n:b.querySelector('.n').textContent,t:b.querySelector('.tx b').textContent,sm:(b.querySelector('small')||{}).textContent,bg:getComputedStyle(b).backgroundColor},
    rows:[...s.querySelectorAll('.pfxNowC')].map(x=>x.querySelector('.tx b').textContent+':'+x.querySelector('.pfxNum').textContent+':'+getComputedStyle(x,'::before').backgroundColor+':'+!!x.querySelector('svg')),
    pills:[...s.querySelectorAll('.pfxStrip .pfxSt')].map(x=>x.textContent),sc:[...s.querySelectorAll('.pfxScB')].map(x=>x.dataset.tab+':'+x.textContent)}});
  ok(r.big&&r.big.n==='12'&&r.big.t==='iş seni bekliyor'&&/En eski bekleyen: 3 gün önce/.test(r.big.sm||'')&&r.big.bg==='rgb(196, 73, 47)','['+T+'] Bugün: kırmızı "12 iş seni bekliyor": '+JSON.stringify(r.big));
  ok(r.rows.length===4&&/^Şikâyetler:2:/.test(r.rows[0])&&/^Özüne Dön siparişleri:4:/.test(r.rows[3])&&new Set(r.rows.map(x=>x.split(':')[2])).size===3&&r.rows.every(x=>/:true$/.test(x)),'['+T+'] Bugün satırları: şerit renkleri (kırmızı/amber/mavi), ikon, sayı: '+JSON.stringify(r.rows));
  ok(r.pills.join('|')==='Pazar KAPALI|Sipariş KAPALI|Ödeme DENEME'&&r.sc.join('|')==='finance:Finans|tickets:Destek|settings:Ayarlar','['+T+'] durum etiketleri + kısayollar: '+JSON.stringify([r.pills,r.sc]));
  let a=await p.evaluate(AUDIT);ok(!a.bad.length&&!a.small.length,'['+T+'] Bugün kontrast ≥4.5 ve ≥44px: '+JSON.stringify(a));
  r=await p.evaluate(()=>{const b=document.querySelector('.pfxOv .pfxBody');return {sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth,bw:b.scrollWidth-b.clientWidth}});ok(r.sw<=0&&r.bw<=0,'['+T+'] taşma yok: '+JSON.stringify(r));
  await shot('yonetim-bugun-'+T);
  // Kuyruklar
  await pane('queues');
  r=await p.evaluate(()=>{const s=document.querySelector('#pfxAdmHome [data-pane=queues]');
   return {vis:!s.hidden,today:document.querySelector('#pfxAdmHome [data-pane=today]').hidden,oz:[...s.querySelectorAll('.pfxOzBig')].map(b=>b.firstChild.textContent+':'+(b.querySelector('.pfxCnt')||{}).textContent),
    grid:[...s.querySelectorAll('.pfxQG .pfxQB')].map(b=>{const t=b.querySelector('b').getBoundingClientRect(),c=b.querySelector('.pfxCnt');const cr=c&&c.getBoundingClientRect();return {k:b.dataset.tab,on:b.classList.contains('on'),n:c?c.textContent:null,bd:getComputedStyle(b).borderTopColor,clear:!cr||t.right<=cr.left+1}})}});
  ok(r.vis&&r.today,'['+T+'] Kuyruklar bölmesi açıldı');
  ok(r.oz.join('|')==='Satıcılar :1|Siparişler :3|İadeler :1','['+T+'] Özüne Dön kartı: '+JSON.stringify(r.oz));
  const g=r.grid;ok(g.slice(0,3).map(x=>x.k).join(',')==='lreview,reports,venues'&&g.slice(0,3).every(x=>x.on)&&g.slice(3).filter(x=>['docs','listings','providers','susp'].includes(x.k)).every(x=>!x.on&&x.n===null)&&g.every(x=>x.clear),'['+T+'] ızgara: >0 olanlar renkli ve üstte, sayısı okunmayan sönük/rozetsiz, başlık rozetle çakışmaz: '+JSON.stringify(g));
  a=await p.evaluate(AUDIT);ok(!a.bad.length&&!a.small.length,'['+T+'] Kuyruklar kontrast ≥4.5 ve ≥44px: '+JSON.stringify(a));
  await shot('yonetim-kuyruklar-'+T);
  // arama + çip
  await p.fill('#pfxAdmHome .pfxQS input','şikâ');await p.waitForTimeout(150);
  r=await p.evaluate(()=>[...document.querySelectorAll('#pfxAdmHome [data-pane=queues] [data-qn]')].filter(b=>!b.hidden).map(b=>b.dataset.tab));
  ok(JSON.stringify(r)==='["reports"]','['+T+'] bölüm ara (istemci): '+JSON.stringify(r));
  await p.fill('#pfxAdmHome .pfxQS input','');await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxQF [data-f=wait]').click());await p.waitForTimeout(150);
  r=await p.evaluate(()=>[...document.querySelectorAll('#pfxAdmHome [data-pane=queues] [data-qn]')].filter(b=>!b.hidden).map(b=>b.dataset.tab).sort());
  ok(JSON.stringify(r)===JSON.stringify(['lreview','oz_orders','oz_returns','oz_sellers','reports','venues']),'['+T+'] "Bekleyen" süzgeci: '+JSON.stringify(r));
  await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxQF [data-f=all]').click());
  // bölüme gir, "← Bölümler" aynı bölmeye döner
  await p.evaluate(()=>document.querySelector('#pfxAdmHome .pfxQB[data-tab=reports]').click());await p.waitForTimeout(800);
  ok(await p.evaluate(()=>/Şikâyetler/.test((document.querySelector('.pfxAdmT')||{}).textContent||'')),'['+T+'] kutu bölümü açar');
  await p.evaluate(()=>document.querySelector('.pfxBack').click());await p.waitForTimeout(800);
  ok(await p.evaluate(()=>!document.querySelector('#pfxAdmHome [data-pane=queues]').hidden&&document.querySelector('#pfxAdmHome .pfxPN .on').dataset.pane==='queues'),'['+T+'] "← Bölümler" Kuyruklar\'a döner');
  // Para / Sistem
  await pane('money');r=await p.evaluate(()=>[...document.querySelectorAll('#pfxAdmHome [data-pane=money] [data-tab]')].map(b=>b.dataset.tab+':'+getComputedStyle(b,'::before').backgroundColor));
  ok(r.length===3&&r.every(x=>/^(finance|campaigns|revenue):rgb\(212, 167, 44\)$/.test(x)),'['+T+'] Para: altın şerit: '+JSON.stringify(r));await shot('yonetim-para-'+T);
  await pane('system');r=await p.evaluate(()=>({t:[...document.querySelectorAll('#pfxAdmHome [data-pane=system] [data-tab]')].map(b=>b.dataset.tab),dk:!!document.querySelector('#pfxAdmHome [data-pane=system] [data-tab=settings] .pfxDk')}));
  ok(r.t.join(',')==='settings,dispatch,hero,words,legal,company,audit'&&r.dk,'['+T+'] Sistem listesi + dikkat etiketi: '+JSON.stringify(r));
  a=await p.evaluate(AUDIT);ok(!a.bad.length&&!a.small.length,'['+T+'] Sistem kontrast ≥4.5 ve ≥44px: '+JSON.stringify(a));
  // tüm yetkili bölümlere ulaşılır
  r=await p.evaluate(()=>{const h=document.getElementById('pfxAdmHome');const all=['docs','venues','lreview','reports','listings','providers','susp','tickets','kvkk','legal','company','finance','campaigns','revenue','settings','dispatch','hero','words','audit'];return all.filter(k=>!h.querySelector('[data-tab='+k+']'))});
  ok(!r.length,'['+T+'] 19 bölüm erişilebilir; eksik: '+JSON.stringify(r));
  await pane('today');
  // hepsi 0 → yeşil
  DATA=ZERO;await openA();
  r=await p.evaluate(()=>{const b=document.querySelector('#pfxAdmHome [data-pane=today] .pfxBig');return b?{c:b.className,t:b.textContent,bg:getComputedStyle(b).backgroundColor}:null});
  ok(r&&/\bok\b/.test(r.c)&&/Her şey yolunda ✓/.test(r.t)&&r.bg==='rgb(31, 107, 69)','['+T+'] hepsi 0: yeşil "Her şey yolunda ✓": '+JSON.stringify(r));
  await shot('yonetim-bugun-bos-'+T);
 }
 // yetkisiz sekme yok, boş bölme menüde yok (yalnız finans rolü)
 DATA=SAMPLE;await p.evaluate(()=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());window.PF.roles={is_admin:true,roles:['finance']};PF._admCnt=null;PF.openAdmin()});await p.waitForTimeout(1400);
 let r=await p.evaluate(()=>({nav:[...document.querySelectorAll('#pfxAdmHome .pfxPN [data-pane]')].map(b=>b.dataset.pane),tabs:[...document.querySelectorAll('#pfxAdmHome [data-tab]')].map(b=>b.dataset.tab)}));
 ok(JSON.stringify(r.nav)==='["today","money"]'&&r.tabs.every(t=>['finance','campaigns','revenue'].includes(t)),'yalnız finans rolü: boş bölme yok, yetkisiz sekme yok: '+JSON.stringify(r));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(shots.length)console.log('ekran görüntüleri ('+shots.length+'): '+SHOTS);
 if(fails.length){console.error('p23-yonetim BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p23-yonetim: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p23-yonetim HATA:',e);process.exit(1)});
