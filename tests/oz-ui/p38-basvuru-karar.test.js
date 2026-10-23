// Paket 38: Yemek › Başvurular satırları karar ekranına gider (yalnız arayüz) — gerçek dokunmatik bağlam (hasTouch + isMobile), 390px, krem ve koyu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p38-basvuru-karar.test.js   (P38_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: satırlar düğme (≥56px, "›", "Karar vermek için dokun", aria-label "…, aç"); kurye satırına tap → Yemek yönetimi açılır ve "Kurye başvuruları"
// başlığı görünür alana kaydırılır (Onayla/Reddet orada, foodAdmCourier aynı); restoran satırına tap → PF.openAdmin('venues'); üst "yönetim paneli" bandı aynı;
// metin kontrastı ≥4.5, yatay taşma yok.
const {chromium,open,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P38_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const ago=m=>new Date(Date.now()-m*60000).toISOString();
const AUDIT=sel=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let z=[255,255,255];ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);const a=b.length>3?b[3]:1;if(a>0)z=[0,1,2].map(i=>b[i]*a+z[i]*(1-a))});return z};
 const bad=[];document.querySelectorAll(sel).forEach(R=>R.querySelectorAll('b,small,span').forEach(e=>{if(!e.getBoundingClientRect().height||!e.textContent.trim()||[...e.children].some(c=>c.textContent.trim()===e.textContent.trim()))return;
  const z=eff(e),t=P(getComputedStyle(e).color),x=L(t),y=L(z),v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)bad.push(e.textContent.trim().slice(0,20)+':'+v.toFixed(2))}));return bad};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 for(const th of ['light','dark']){const T='['+(th==='light'?'krem':'koyu')+']';
  const {p,st}=await open(br,{w:390,h:844,visible:true,touch:true});
  await p.evaluate(([th,ago])=>{document.documentElement.setAttribute('data-theme',th);try{localStorage.setItem('isimi-theme',th)}catch(e){}
   const rows=[{kind:'courier',name:'Kaan Yılmaz',stage:'in_review',stage_label:'İnceleme',docs_total:2,docs_pending:1,since:ago[0]},{kind:'venue',name:'Lezzet Durağı',stage:'documents',stage_label:'Belgeler',docs_total:1,required_missing:1,since:ago[1]}];
   const venues=Array.from({length:8},(_,i)=>({id:'v'+i,name:'Restoran '+i,is_active:true,is_open:true,commission_bps:1000,platform_fee_kurus:0}));
   window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));
    if(pth==='rpc/pf_admin_onboarding_queue')return JSON.parse(JSON.stringify(rows));
    if(pth==='rpc/food_whoami')return {venues:[],courier:null,is_admin:true};
    if(pth==='rpc/food_admin_overview')return {orders_by_status:{delivered:3},searching_deliveries:0,pending_couriers:[{user_id:'u1',name:'Kaan Yılmaz',phone:'0500',vehicle:'motorbike',status:'pending',created_at:ago[0]}],couriers:[],venues,open_issues:[]};
    return []}},[th,[ago(30),ago(120)]]);
  const toObs=async()=>{await p.evaluate(()=>showFoodOnboarding());await p.waitForTimeout(1200)};
  await toObs();
  let r=await p.evaluate(()=>{const b=[...document.querySelectorAll('#fdRoot .fdwAdmGo')];return {band:!!document.querySelector('#fdRoot .fb.soft[onclick="PF.openAdmin()"]'),
   rows:b.map(x=>({tag:x.tagName,k:x.dataset.kind,al:x.getAttribute('aria-label'),h:Math.round(x.getBoundingClientRect().height),ch:!!x.querySelector('.ch'),hint:(x.querySelector('small.go')||{}).textContent}))}});
  ok(r.band,T+' üstteki yönetim paneli bandı aynı');
  ok(r.rows.length===2&&r.rows.every(x=>x.tag==='BUTTON'&&x.h>=56&&x.ch&&x.hint==='Karar vermek için dokun'&&/, aç$/.test(x.al))&&r.rows[0].k==='courier'&&r.rows[1].k==='venue',T+' satırlar tıklanır (≥56px, ›, ipucu): '+JSON.stringify(r.rows));
  const bad=await p.evaluate(AUDIT,'#fdRoot .fdwAdmL');ok(!bad.length,T+' satır metin kontrastı ≥4.5: '+bad.join(', '));
  ok((await overflow(p))<=0,T+' yatay taşma');
  if(SHOTS)await p.screenshot({path:path.join(SHOTS,'p38-'+th+'-basvurular.png')});
  // kurye satırı → Yemek yönetimi, "Kurye başvuruları" görünür
  const tapOn=async sel=>{const c=await p.evaluate(s=>{const b=document.querySelector(s);b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]},sel);await p.touchscreen.tap(c[0],c[1])};
  await tapOn('#fdRoot .fdwAdmGo[data-kind=courier]');await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{const h=document.getElementById('fdAdmCour');const R=h&&h.getBoundingClientRect();const ap=document.querySelector('#fdRoot [onclick^="foodAdmCourier"]');
   return {t:(document.querySelector('#fdRoot h1,#fdRoot .fdBar b,#fdRoot .fdBarT')||{}).textContent,h:!!h,top:R&&Math.round(R.top),vh:innerHeight,sy:Math.round(scrollY),act:!!ap}});
  ok(r.h&&r.top>=0&&r.top<r.vh*0.5&&r.sy>0&&r.act,T+' kurye satırı → Yemek yönetimi, "Kurye başvuruları" görünür alanda (Onayla/Reddet var): '+JSON.stringify(r));
  // restoran satırı → PF.openAdmin('venues')
  await toObs();await p.evaluate(()=>{window.__oa=[];window.__o=PF.openAdmin;PF.openAdmin=function(k){window.__oa.push(k)}});
  await tapOn('#fdRoot .fdwAdmGo[data-kind=venue]');await p.waitForTimeout(400);
  r=await p.evaluate(()=>{const x=window.__oa;PF.openAdmin=window.__o;return x});
  ok(JSON.stringify(r)==='["venues"]',T+' restoran satırı → PF.openAdmin(venues): '+JSON.stringify(r));
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('p38-basvuru-karar BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p38-basvuru-karar: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p38-basvuru-karar HATA:',e);process.exit(1)});
