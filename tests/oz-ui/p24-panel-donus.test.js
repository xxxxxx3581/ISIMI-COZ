// Paket 24-A: çalışma panelinden çıkış — Kapat / ekrandaki ← / Android geri, kullanıcıyı panele girdiği ekrana ve kaydırma konumuna döndürür.
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
 // bölüm içinden geri: önce pencere kapanır, sayfa yerinde kalır
 await openAdm();await p.evaluate(()=>PF.openAdmin('reports'));await W(900);await p.goBack();await W();same(await where(),b0,'A1 bölüm içinden Android geri');
 // ---- A2: Özüne Dön Hesabım → Satıcı paneli / Yönetim
 await p.evaluate(()=>showHome());await W();await enter(p);await p.evaluate(()=>OZ.go('account',{}));await W(1300);
 await p.evaluate(()=>window.scrollTo(0,300));await W(300);b0=await where();
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.sl').click());await W(1500);ok((await where()).ozT!==b0.ozT,'A2: satıcı paneli açıldı');
 await p.goBack();await W(1300);same(await where(),b0,'A2 satıcı paneli → Android geri');
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.sl').click());await W(1500);
 await p.evaluate(()=>document.querySelector('[data-a=back]').click());await W(1300);same(await where(),b0,'A2 satıcı paneli → ekrandaki ←');
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.ad').click());await W(1500);ok((await where()).ov===1,'A2: Özüne Dön yönetimi açıldı');
 await p.evaluate(()=>document.querySelector('.pfxOv [data-pfx-close]').click());await W(500);same(await where(),b0,'A2 yönetim → Kapat');
 await p.evaluate(()=>document.querySelector('#ozRoot .ozWs.ad').click());await W(1500);await p.goBack();await W(1200);same(await where(),b0,'A2 yönetim → Android geri');
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
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p24-panel-donus BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p24-panel-donus: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p24-panel-donus HATA:',e);process.exit(1)});
