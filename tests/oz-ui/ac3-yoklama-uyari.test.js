// AC3: uygulama açıkken yeni durum uyarısı (yoklama, bant, ses, titreşim) — 390px, sahte saat (page.clock) + sahte RPC.
// Çalıştırma: node tests/oz-ui/ac3-yoklama-uyari.test.js
// Doğrulanan: ilk açılışta eski siparişler için uyarı yok; satıcıya yeni sipariş → 20 sn'lik turda bant ("Yeni sipariş · no · tutar", turuncu)
// + iki notalı zil (WebAudio, 2 osilatör) + titreşim [120,60,120] BİR kez; aynı sipariş sonraki turda tekrar uyarmaz; müşteri durum değişikliği
// (kargoda) → "Siparişin kargoda 🚚" bant (mavi), dokununca sipariş detayı; birden fazla gelişme → "N yeni gelişme" tek bant; bant 8 sn sonra kapanır;
// gizli sekmede yoklama durur, görünür olunca hemen bir kez çeker; art arda hatada aralık 60 sn olur, düzelince 20 sn; ses anahtarı (satıcı
// panelinde) kapalıyken ses yok ama bant + titreşim var; çıkışta yoklama durur; bant 390px'te taşmaz.
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.clock.install();
 await p.evaluate(()=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];
  window.__vis='visible';Object.defineProperty(document,'visibilityState',{get:()=>window.__vis,configurable:true});
  window.__aud={ctx:0,osc:0};window.AudioContext=function(){this.state='running';this.currentTime=0;this.destination={};window.__aud.ctx++};
  window.AudioContext.prototype.createOscillator=function(){return {type:'',frequency:{value:0},connect(){},start(){window.__aud.osc++},stop(){}}};
  window.AudioContext.prototype.createGain=function(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}};
  window.__vib=[];Object.defineProperty(navigator,'vibrate',{value:x=>{window.__vib.push(x);return true},configurable:true});
  window.__SELL={new:[{id:'s1',order_no:'OZ26-0001',total_kurus:30000}],accepted:[],packed:[]};
  R.oz_my_orders=[{id:'b1',order_no:'OZ26-0101',status:'accepted',total_kurus:45000,created_at:'2026-10-09T10:00:00Z',seller_name:'Yayla',items:[]},{id:'b2',order_no:'OZ26-0102',status:'shipped',total_kurus:45000,created_at:'2026-10-08T10:00:00Z',seller_name:'Yayla',items:[]}];
  const o=window.PF.rpc;window.PF.rpc=async function(fn,x){
   if(fn==='oz_seller_orders'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));if(window.__OZ_FX.fail&&window.__OZ_FX.fail.oz_seller_orders)throw new Error('ağ');
    return (window.__SELL[x.p_status]||[]).map(y=>Object.assign({},base,y,{status:x.p_status,return:null}))}
   if(fn==='oz_order_detail'){const r=await o(fn,x);r.order=Object.assign({},r.order,{id:x.p_order});return r}
   return o(fn,x)}});
 const band=()=>p.evaluate(()=>{const b=document.getElementById('ozAlert');if(!b)return null;const r=b.getBoundingClientRect();
  return {t:b.querySelector('.tx b').textContent,s:(b.querySelector('.tx small')||{}).textContent||'',c:b.className,bd:getComputedStyle(b).borderLeftColor,l:Math.round(r.left),r:Math.round(r.right),top:Math.round(r.top)}});
 const fx=()=>p.evaluate(()=>({osc:window.__aud.osc,vib:JSON.stringify(window.__vib)}));
 const calls=fn=>st.calls.filter(c=>c[0]===fn).length;
 /* yoklama turu: saati 1 sn adımlarla ilerlet, oz_my_orders çağrısı gelince yanıtı bekle (8 sn'lik bant zamanlayıcısını atlamadan) */
 const tick=async(ms)=>{ms=ms||20000;const n=calls('oz_my_orders');for(let t=0;t<ms+2000&&calls('oz_my_orders')===n;t+=1000){await p.clock.runFor(1000);await p.waitForTimeout(30)}
  for(let i=0;i<4;i++){await p.clock.runFor(30);await p.waitForTimeout(60)}};
 await enter(p);await p.waitForTimeout(600);await p.clock.runFor(1500);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!(window.OZ&&OZ.__poll&&OZ.__poll.on)),'girişli + Özüne Dön açık → yoklama çalışmalı');
 // ilk açılış: eski siparişler (s1 yeni, b2 kargoda) için uyarı yok
 await tick();ok(!(await band()),'ilk açılışta eski siparişler için bant olmamalı: '+JSON.stringify(await band()));
 ok((await fx()).osc===0,'ilk açılışta ses olmamalı');
 // satıcıya yeni sipariş
 await p.evaluate(()=>{window.__SELL.new.unshift({id:'s9',order_no:'OZ26-0009',total_kurus:45000})});
 await tick();let b=await band();let f=await fx();
 ok(b&&/Yeni sipariş · OZ26-0009 · 450/.test(b.t)&&/ozT-n/.test(b.c)&&b.bd==='rgb(240, 160, 75)','yeni sipariş bandı (turuncu): '+JSON.stringify(b));
 ok(f.osc===2&&f.vib==='[[120,60,120]]','iki notalı zil + titreşim bir kez: '+JSON.stringify(f));
 ok(b&&b.l>=0&&b.r<=390&&b.top>=0,'bant 390px içinde: '+JSON.stringify(b));ok(await overflow(p)<=0,'390px yatay taşma');
 // 8 sn sonra kapanır
 await p.clock.runFor(8200);await p.waitForTimeout(100);ok(!(await band()),'bant 8 sn sonra kapanmalı');
 // aynı sipariş tekrar uyarmaz
 await tick();f=await fx();ok(!(await band())&&f.osc===2,'aynı sipariş ikinci turda uyarmamalı: '+JSON.stringify(f));
 // müşteri: b1 kargoya verildi → mavi bant, dokununca sipariş
 await p.evaluate(()=>{window.__OZ_FX.R.oz_my_orders[0].status='shipped'});
 await tick();b=await band();
 ok(b&&b.t==='Siparişin kargoda 🚚'&&b.s==='OZ26-0101'&&/ozT-s/.test(b.c),'müşteri kargoda bandı (mavi): '+JSON.stringify(b));
 await p.click('#ozAlert',{timeout:3000}).catch(()=>fails.push('bant tıklanamadı'));await p.waitForTimeout(400);await p.clock.runFor(1500);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.getElementById('ozAlert')&&!!document.querySelector('#ozRoot .ozOd')),'banda dokununca sipariş detayı açılmalı, bant kapanmalı');
 // birden fazla gelişme → tek bant
 await p.evaluate(()=>{window.__SELL.new.unshift({id:'s10',order_no:'OZ26-0010',total_kurus:10000});window.__OZ_FX.R.oz_my_orders[1].status='delivered'});
 await tick();b=await band();ok(b&&b.t==='2 yeni gelişme'&&(await p.evaluate(()=>document.querySelectorAll('#ozAlert').length))===1,'birden fazla gelişme tek bantta: '+JSON.stringify(b));
 await p.clock.runFor(8200);
 // gizli sekme: yoklama durur, görünür olunca hemen çeker
 await p.evaluate(()=>{window.__vis='hidden';document.dispatchEvent(new Event('visibilitychange'))});
 let n0=calls('oz_my_orders');await p.clock.runFor(65000);await p.waitForTimeout(300);
 ok(calls('oz_my_orders')===n0,'gizli sekmede yoklama durmalı: '+(calls('oz_my_orders')-n0)+' çağrı');
 await p.evaluate(()=>{window.__vis='visible';document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(300);await p.clock.runFor(200);await p.waitForTimeout(200);
 ok(calls('oz_my_orders')===n0+1,'görünür olunca hemen bir kez çekmeli: '+(calls('oz_my_orders')-n0));
 // hata: art arda → 60 sn; düzelince 20 sn
 await p.evaluate(()=>{window.__OZ_FX.fail={oz_my_orders:'Failed to fetch',oz_seller_orders:'ağ'}});
 await tick();await tick();
 const iv=await p.evaluate(()=>(OZ.__poll||{}).iv);ok(iv===60000,'art arda hata sonrası aralık 60 sn: '+iv);
 ok(!(await band())&&!(await p.evaluate(()=>!!document.querySelector('.ozToast'))),'ağ hatasında sessiz kalmalı (bant/toast yok)');
 n0=calls('oz_my_orders');await p.clock.runFor(30000);await p.waitForTimeout(200);ok(calls('oz_my_orders')===n0,'60 sn dolmadan yeni çağrı olmamalı');
 await p.evaluate(()=>{window.__OZ_FX.fail={}});await tick(31000);
 ok(await p.evaluate(()=>(OZ.__poll||{}).iv)===20000,'başarılı turdan sonra aralık 20 sn');
 // ses anahtarı: satıcı panelinde kapat → yeni sipariş: bant + titreşim var, ses yok
 await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(300);await p.clock.runFor(1500);await p.waitForTimeout(400);
 const sw=await p.$eval('#ozSP .ozSndT',e=>e.textContent).catch(()=>null);ok(sw==='🔔 Ses: açık','satıcı panelinde "Ses: açık" anahtarı: '+sw);
 await p.click('#ozSP .ozSndT',{timeout:3000}).catch(()=>fails.push('ses anahtarı tıklanamadı'));await p.waitForTimeout(200);
 ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_sound')==='0'&&document.querySelector('#ozSP .ozSndT').textContent==='🔕 Ses: kapalı'),'anahtar kapalı + localStorage');
 f=await fx();await p.evaluate(()=>{window.__SELL.new.unshift({id:'s11',order_no:'OZ26-0011',total_kurus:20000})});
 await tick();b=await band();const f2=await fx();
 ok(b&&/OZ26-0011/.test(b.t)&&f2.osc===f.osc&&JSON.parse(f2.vib).length===JSON.parse(f.vib).length+1,'ses kapalı: bant + titreşim var, ses yok: '+JSON.stringify({b,f,f2}));
 // çıkış: yoklama durur
 await p.evaluate(()=>saveAuthSession(null));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!(OZ.__poll||{}).on),'çıkışta yoklama durmalı');
 n0=calls('oz_my_orders');await p.clock.runFor(70000);await p.waitForTimeout(300);ok(calls('oz_my_orders')===n0,'çıkıştan sonra çağrı olmamalı');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ac3-yoklama-uyari BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ac3-yoklama-uyari: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ac3-yoklama-uyari HATA:',e);process.exit(1)});
