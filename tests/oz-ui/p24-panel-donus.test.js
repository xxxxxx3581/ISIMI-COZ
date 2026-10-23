// Paket 24-A/B: çalışma panelinden çıkış — Kapat / ekrandaki ← / Android geri, kullanıcıyı panele girdiği ekrana ve kaydırma konumuna döndürür.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p24-panel-donus.test.js — 390px, sahte veri, ağa çıkmaz.
// Yollar: İşimi Çöz Hesabım/menü → Yönetim paneli; Özüne Dön Hesabım → Satıcı paneli, Özüne Dön yönetimi; Yemek Hesabım → İşletmem, Kurye,
// Yemek yönetimi. Kök neden (düzeltilen): (1) platform geri işleyicisi PF pencerelerini (.pfxOv) açık pencere saymıyordu → geri, pencere açıkken
// alttaki sayfayı geri sarıyordu; (2) Yemek panel ekranları müşteri ekranının geçmiş kaydını eziyordu → geri, Yemek Hesabım'ı atlayıp önceki
// platform kaydına (ör. İşimi Çöz Hesabım'ın alt kaydırma konumu) düşüyordu; panel ← düğmesi de Yemek ana sayfasına gidiyordu.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{window.PF.roles={is_admin:true,roles:['super']};
  const W={venues:[{id:'v1',name:'Lezzet Durağı',role:'owner'}],courier:{status:'approved',display_name:'Kurye K'},is_admin:true};
  window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));if(pth==='rpc/food_whoami')return JSON.parse(JSON.stringify(W));
   if(pth==='rpc/food_venue_orders')return {orders:[],counts:{},summary:{}};if(pth.startsWith('food_venues?'))return [{id:'v1',name:'Lezzet Durağı',is_open:true,is_active:true,working_hours:{mon:[['10:00','22:00']]},delivery_mode:'pickup'}];return []}});
 const W=ms=>p.waitForTimeout(ms||900);
 const where=()=>p.evaluate(()=>({ov:document.querySelectorAll('.pfxOv,.ozOv:not(.ozOvH),.v2Sheet').length,acc:!!document.querySelector('#app .hmAcc'),oz:document.body.classList.contains('ozWorld'),food:document.body.classList.contains('fdWorld'),
  ozT:(document.querySelector('#ozRoot h1')||{}).textContent||'',fdAcc:!!document.querySelector('#fdRoot .fdwAcc'),y:Math.round(scrollY)}));
 const same=(a,b,tag)=>ok(a.ov===0&&a.acc===b.acc&&a.oz===b.oz&&a.food===b.food&&a.ozT===b.ozT&&a.fdAcc===b.fdAcc&&Math.abs(a.y-b.y)<=4,tag+': giriş ekranı ve kaydırma: önce '+JSON.stringify(b)+' sonra '+JSON.stringify(a));
 // ---- A1: İşimi Çöz Hesabım → (Diğer ayarlar menüsü) → Yönetim paneli
 await p.evaluate(()=>showHome());await W();await p.evaluate(()=>showAccount());await W();
 await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await W(300);let b0=await where();
 const openAdm=async()=>{await p.evaluate(()=>{hmAcc('more')});await W(400);await p.evaluate(()=>{const b=document.querySelector('#drwAdmin button');if(b)b.click();else{closeAppDrawer();PF.openAdmin()}});await W(1400)};
 await openAdm();ok((await where()).ov===1,'A1: Yönetim paneli açıldı');
 await p.evaluate(()=>document.querySelector('.pfxOv [data-pfx-close]').click());await W(500);same(await where(),b0,'A1 Kapat');
 await openAdm();await p.goBack();await W();same(await where(),b0,'A1 Android geri');
 // P23b: bölüm içinden geri → önce bölme listesi (pencere açık), ikinci geri → pencere kapanır, sayfa yerinde kalır
 await openAdm();await p.evaluate(()=>PF.openAdmin('reports'));await W(900);await p.goBack();await W();
 ok(await p.evaluate(()=>!!document.getElementById('pfxAdmHome')&&!document.getElementById('pfxAdm')),'A1 bölüm içinden Android geri → bölme listesi');
 await p.goBack();await W();same(await where(),b0,'A1 bölüm içinden 2. Android geri');
 // ---- A2: Özüne Dön Hesabım → Satıcı paneli / Yönetim
 await p.evaluate(()=>showHome());await W();await enter(p);await p.evaluate(()=>OZ.go('account',{}));await W(1300);
 await p.evaluate(()=>window.scrollTo(0,300));await W(300);b0=await where();
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.sl').click());await W(1500);ok((await where()).ozT!==b0.ozT,'A2: satıcı paneli açıldı');
 await p.goBack();await W(1300);same(await where(),b0,'A2 satıcı paneli → Android geri');
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.sl').click());await W(1500);
 await p.evaluate(()=>document.querySelector('[data-a=back]').click());await W(1300);same(await where(),b0,'A2 satıcı paneli → ekrandaki ←');
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.ad').click());await W(1500);ok((await where()).ov===1,'A2: Özüne Dön yönetimi açıldı');
 await p.evaluate(()=>document.querySelector('.pfxOv [data-pfx-close]').click());await W(500);same(await where(),b0,'A2 yönetim → Kapat');
 /* P23b: Özüne Dön yönetimi Özet bölümünü açar → ilk geri bölme listesi, ikinci geri girilen ekran */
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.ad').click());await W(1500);await p.goBack();await W(1200);ok(await p.evaluate(()=>!!document.getElementById('pfxAdmHome')),'A2 yönetim → Android geri → bölme listesi');await p.goBack();await W(1200);same(await where(),b0,'A2 yönetim → 2. Android geri');
 // ---- A3: Yemek Hesabım → İşletmem / Kurye / Yemek yönetimi
 await p.evaluate(()=>showHome());await W();await p.evaluate(()=>showFoodAccount());await W(1500);
 await p.evaluate(()=>window.scrollTo(0,250));await W(300);b0=await where();
 for(const [cls,name] of [['b','İşletmem'],['c','Kurye'],['a','Yemek yönetimi']]){
  await p.evaluate(c=>document.querySelector('#fdRoot .fdwWs.'+c).click(),cls);await W(1500);ok(!(await where()).fdAcc,'A3: '+name+' açıldı');
  await p.goBack();await W(1500);same(await where(),b0,'A3 '+name+' → Android geri');
  await p.evaluate(c=>document.querySelector('#fdRoot .fdwWs.'+c).click(),cls);await W(1500);
  await p.evaluate(()=>document.getElementById('fdwBack').click());await W(1500);same(await where(),b0,'A3 '+name+' → ekrandaki ←');
 }
 // panel içi geçiş (Bugün → Menü) yeni kayıt açmaz; geri yine Yemek Hesabım
 await p.evaluate(()=>document.querySelector('#fdRoot .fdwWs.b').click());await W(1500);
 await p.evaluate(()=>showFoodMenu('v1'));await W(1200);await p.goBack();await W(1500);same(await where(),b0,'A3 İşletmem → Menü → Android geri');
 // ================= 24-B: İşimi Çöz Hesabım ortak şablon (önbellek: Özüne Dön ayarları + Yemek whoami yukarıda okundu) =================
 const AUD=()=>p.evaluate(()=>{const L=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
  const bgOf=e=>{for(;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;const m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.5))return c}return 'rgb(0,0,0)'};
  const R=document.querySelector('#app .hmAcc');const bad=[],small=[];
  R.querySelectorAll('b,small,span,button').forEach(e=>{const r=e.getBoundingClientRect();if(!r.height||!e.textContent.trim())return;if(e.tagName==='BUTTON'&&r.height<44-.5)small.push(e.textContent.trim().slice(0,16)+':'+Math.round(r.height));
   if([...e.children].some(c=>c.textContent.trim()===e.textContent.trim()))return;const a=L(getComputedStyle(e).color),b=L(bgOf(e));const v=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(v<4.5)bad.push(e.textContent.trim().slice(0,18)+':'+v.toFixed(2))});
  return {bad,small,sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
 for(const pref of ['light','dark']){
  await p.evaluate(t=>{try{localStorage.setItem('isimi_oz_theme',t)}catch(e){}},pref);
  await p.evaluate(()=>showHome());await W();await p.evaluate(()=>showAccount());await W();
  let r=await p.evaluate(()=>{const R=document.querySelector('#app .hmAcc');const pos=s=>{const e=R.querySelector(s);return e?[...R.querySelectorAll('*')].indexOf(e):-1};
   return {order:[pos('.hmAccMe'),pos('.hmAccQ'),pos('.hmAccWs'),pos('.hmAccL'),pos('.hmAccTh'),pos('.hmAccOut2')],tags:[...R.querySelectorAll('.hmRoleT')].map(x=>x.textContent),
    q:[...R.querySelectorAll('.hmAccQ button')].map(b=>b.dataset.k+':'+Math.round(b.getBoundingClientRect().height)),
    ws:[...R.querySelectorAll('.hmAccWs')].map(b=>({k:b.dataset.k,t:b.querySelector('b').textContent,h:Math.round(b.getBoundingClientRect().height),bg:getComputedStyle(b).backgroundColor,bd:getComputedStyle(b).borderTopColor})),
    rows:[...R.querySelectorAll('.hmAccL .hmAccR')].map(b=>b.dataset.k+(b.querySelector('.hmAccSoon')?'(Yakında)':'')),th:(R.querySelector('.hmAccTh [aria-pressed=true]')||{}).textContent,
    out:(()=>{const o=R.querySelector('.hmAccOut2');return o&&{k:o.dataset.k,bd:getComputedStyle(o).borderTopColor,bg:getComputedStyle(o).backgroundColor}})()}});
  ok(r.order.every((x,i)=>x>=0&&(i===0||x>r.order[i-1])),'['+pref+'] B: sıra profil → kutular → çalışma alanları → hesap → tema → çıkış: '+JSON.stringify(r.order));
  ok(JSON.stringify(r.tags)==='["Satıcı · Onaylı","İşletme sahibi","Kurye","Yönetici"]','['+pref+'] B: yalnız bilinen roller: '+JSON.stringify(r.tags));
  ok(JSON.stringify(r.q.map(x=>x.split(':')[0]))==='["orders","favs"]'&&r.q.every(x=>+x.split(':')[1]>=76),'['+pref+'] B: Siparişlerim/Favorilerim ≥76px: '+JSON.stringify(r.q));
  ok(JSON.stringify(r.ws.map(x=>x.k))==='["ws_seller","ws_biz","ws_courier","ws_admin"]'&&r.ws[0].bg==='rgb(31, 107, 69)'&&r.ws[1].bg==='rgb(154, 100, 16)'&&r.ws[2].bg==='rgb(47, 111, 168)'&&r.ws[3].bd==='rgb(111, 143, 208)'&&r.ws.every(x=>x.h>=64),'['+pref+'] B: çalışma alanları (yeşil/amber/mavi/lacivert, ≥64px): '+JSON.stringify(r.ws));
  ok(JSON.stringify(r.rows)==='["msgs","mylist(Yakında)","addr","bell","help","privacy","terms","more"]','['+pref+'] B: hesap listesi tek kartta (Yakında etiketi korunur): '+JSON.stringify(r.rows));
  ok(r.th===(pref==='dark'?'Koyu':'Açık (krem)')&&r.out&&r.out.k==='out'&&r.out.bg==='rgba(0, 0, 0, 0)','['+pref+'] B: tema seçici + küçük kırmızı çerçeveli çıkış: '+JSON.stringify([r.th,r.out]));
  const a=await AUD();ok(!a.bad.length&&!a.small.length&&a.sw<=0,'['+pref+'] B: kontrast ≥4.5, ≥44px, taşma yok: '+JSON.stringify(a));
 }
 await p.evaluate(()=>{try{localStorage.setItem('isimi_oz_theme','light')}catch(e){}});
 // giriş yapmamış görünüm aynı (Giriş yap / Kaydol, Neler var?)
 // A + B: İşimi Çöz Hesabım kartlarından panele gir → çık → aynı ekran + kaydırma
 await p.evaluate(()=>showHome());await W();await p.evaluate(()=>showAccount());await W();
 await p.evaluate(()=>window.scrollTo(0,200));await W(300);b0=await where();
 await p.evaluate(()=>hmAcc('ws_seller'));await W(1600);ok((await where()).oz,'B→A: Satıcı paneli açıldı');
 await p.goBack();await W(1300);same(await where(),b0,'B→A İşimi Çöz Hesabım → Satıcı paneli → Android geri');
 await p.evaluate(()=>window.scrollTo(0,200));await W(300);await p.evaluate(()=>hmAcc('ws_biz'));await W(1500);ok((await where()).food,'B→A: İşletmem açıldı');
 await p.evaluate(()=>document.getElementById('fdwBack').click());await W(1500);same(await where(),b0,'B→A İşimi Çöz Hesabım → İşletmem → ekrandaki ←');
 await p.evaluate(()=>window.scrollTo(0,200));await W(300);await p.evaluate(()=>hmAcc('ws_courier'));await W(1500);await p.goBack();await W(1500);same(await where(),b0,'B→A İşimi Çöz Hesabım → Kurye → Android geri');
 await p.evaluate(()=>window.scrollTo(0,200));await W(300);await p.evaluate(()=>hmAcc('ws_admin'));await W(1400);ok((await where()).ov===1,'B→A: Yönetim açıldı');
 await p.evaluate(()=>document.querySelector('.pfxOv [data-pfx-close]').click());await W(500);same(await where(),b0,'B→A İşimi Çöz Hesabım → Yönetim → Kapat');
 await p.evaluate(()=>window.scrollTo(0,200));await W(300);await p.evaluate(()=>hmAcc('ws_admin'));await W(1400);await p.goBack();await W();same(await where(),b0,'B→A İşimi Çöz Hesabım → Yönetim → Android geri');
 if(process.env.P24_SHOTS){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:process.env.P24_SHOTS+'/isimi-hesabim.png',fullPage:true})}
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 // giriş yapmamış görünüm değişmedi
 await p.evaluate(()=>{localStorage.removeItem('isimi_coz_auth_session');showAccount()});await W(600);
 const g=await p.evaluate(()=>({hi:!!document.querySelector('#app .hmAccHi'),btn:[...document.querySelectorAll('#app .hmAccBtn')].map(b=>b.dataset.k).join(','),ws:document.querySelectorAll('#app .hmAccWs').length,th:!!document.querySelector('#app .hmAccR[data-k=theme]')}));
 ok(g.hi&&g.btn==='login,signup'&&!g.ws&&g.th,'B: giriş yapmamış görünüm aynı: '+JSON.stringify(g));
 await br.close();
 if(fails.length){console.error('p24-panel-donus BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p24-panel-donus: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p24-panel-donus HATA:',e);process.exit(1)});
