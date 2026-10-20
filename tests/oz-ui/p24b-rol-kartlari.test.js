// Paket 24b: İşimi Çöz Hesabım rol kartları her zaman — yalnız mevcut okuma çağrılarıyla arka planda (pf_my_roles, food_whoami, oz_public_settings).
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p24b-rol-kartlari.test.js — 390px, sahte veri, ağa çıkmaz.
// Doğrulanan: taze oturum → sayfa hemen açılır (yer tutucu), kartlar sonradan gelir, üstteki öğeler kaymaz, yükseklik yumuşak geçişle; aynı oturumda tekrar
// açılış yeni çağrı yapmaz; okuma hatası → sessizce kart yok, hata mesajı yok, "Diğer ayarlar" duruyor; yetkisiz kullanıcı → hiç kart yok (yönetim yalnız
// PF.roles.is_admin); çıkış/başka kullanıcıyla giriş → önbellek temizlenir, yeni kullanıcının rolleri okunur; yeni RPC adı yok.
const {chromium,open}=require('./harness.js');
const READS=['pf_my_roles','oz_public_settings'];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const page=async(o)=>{const r=await open(br,Object.assign({w:390,h:844,visible:true},o.fx?{fx:o.fx}:{}));
  await r.p.evaluate(([who,fail,admin])=>{window.__WC=0;window.PF.roles=null;
   window.supabaseAuthRequest=async function(m,pth){if(pth==='rpc/food_whoami'){window.__WC++;await new Promise(r=>setTimeout(r,500));if(fail)throw new Error('ağ hatası');return JSON.parse(JSON.stringify(window.__WHO||who))}await new Promise(r=>setTimeout(r,10));return []};
   const o=window.PF.rpc;window.PF.rpc=async function(fn,a,opt){if(fn==='pf_my_roles'||fn==='oz_public_settings'){await new Promise(r=>setTimeout(r,500));if(fail){window.__ozLog(fn,a||{});throw new Error('ağ hatası')}}
    if(fn==='pf_my_roles'){window.__ozLog(fn,{});return JSON.parse(JSON.stringify(window.__ROLES||{is_admin:admin,roles:admin?['super']:[]}))}return o.apply(this,arguments)}},[o.who,!!o.fail,!!o.admin]);
  return r};
 const S=p=>p.evaluate(()=>{const R=document.querySelector('#app .hmAcc');const top=s=>{const e=R.querySelector(s);return e?Math.round(e.getBoundingClientRect().top):null};
  return {ws:[...R.querySelectorAll('.hmAccWs')].map(x=>x.dataset.k),ph:!!R.querySelector('.hmAccWsPh'),head:/ÇALIŞMA ALANLARIM/.test(R.textContent),tags:(R.querySelector('#hmRoles')||{}).textContent||'',
   qTop:top('.hmAccQ'),meTop:top('.hmAccMe'),more:!!R.querySelector('.hmAccR[data-k=more]'),toast:!!document.querySelector('#v2Toast,.v2Toast'),err:/hata|açılamadı/i.test(R.textContent)}});
 // 1) taze oturum: anında açılış + yer tutucu → kartlar yerinde, üstteki öğeler kaymaz, yumuşak geçiş
 let {p,st}=await page({who:{venues:[{id:'v1',name:'Lezzet Durağı',role:'owner'}],courier:{status:'approved'},is_admin:false},admin:true});
 await p.evaluate(()=>{window.__TR=[];new MutationObserver(r=>r.forEach(x=>{if(x.target.id==='hmAccWs'&&/height/.test(x.target.style.transition||''))window.__TR.push(x.target.style.height)})).observe(document.body,{subtree:true,attributes:true,attributeFilter:['style']})});
 await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(60);
 let a=await S(p);ok(a.ph&&a.head&&!a.ws.length,'taze oturum: sayfa hemen açılır, yer tutucu var, kart yok (henüz): '+JSON.stringify(a));
 await p.waitForTimeout(1500);let b=await S(p);
 ok(JSON.stringify(b.ws)==='["ws_seller","ws_biz","ws_courier","ws_admin"]'&&!b.ph,'taze oturum: kartlar sonradan geldi: '+JSON.stringify(b.ws));
 ok(b.tags==='Satıcı · Onaylıİşletme sahibiKuryeYönetici','rol etiketleri geldi: '+b.tags);
 ok(a.qTop===b.qTop&&a.meTop===b.meTop,'üstteki öğeler kaymadı (zıplama yok): '+JSON.stringify([a.qTop,b.qTop,a.meTop,b.meTop]));
 ok((await p.evaluate(()=>window.__TR.length))>0,'çalışma alanları yüksekliği yumuşak geçişle açıldı');
 // aynı oturumda tekrar açılış: yeni çağrı yok
 const c0=await p.evaluate(()=>window.__WC),n0=st.calls.filter(x=>READS.includes(x[0])).length;
 await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(40);b=await S(p);
 ok(b.ws.length===4&&!b.ph,'tekrar açılış: kartlar hemen (önbellek): '+JSON.stringify(b));
 await p.waitForTimeout(900);ok(await p.evaluate(()=>window.__WC)===c0&&st.calls.filter(x=>READS.includes(x[0])).length===n0,'tekrar açılışta yeni çağrı yok');
 ok(st.calls.filter(x=>READS.includes(x[0])).length>=1&&st.calls.every(x=>!/^pf_my_roles|^oz_public_settings/.test(x[0])||READS.includes(x[0])),'yalnız mevcut okuma çağrıları (pf_my_roles, oz_public_settings, food_whoami)');
 // 4) çıkış → başka kullanıcıyla giriş: önbellek temizlenir, yeni kullanıcının (yetkisiz) rolleri okunur
 await p.evaluate(()=>{localStorage.removeItem('isimi_coz_auth_session');showAccount()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.querySelector('#app .hmAccHi')&&!document.querySelector('#app .hmAccWs')),'çıkış: giriş yapmamış görünüm, kart yok');
 await p.evaluate(()=>{window.__WHO={venues:[],courier:null,is_admin:false};window.__ROLES={is_admin:false,roles:[]};window.PF.roles=null;
  window.__OZ_FX.R.oz_public_settings=Object.assign({},window.__OZ_FX.R.oz_public_settings,{my_seller:null,is_admin:false});
  const n=Math.floor(Date.now()/1000);localStorage.setItem('isimi_coz_auth_session',JSON.stringify({access_token:'t2',refresh_token:'r',expires_at:n+3600,user:{id:'00000000-0000-0000-0000-000000000002',email:'baska@ornek.com'}}));showAccount()});
 await p.waitForTimeout(1500);b=await S(p);
 ok(!b.ws.length&&!b.head&&!b.tags&&b.more,'başka (yetkisiz) kullanıcı: önceki kullanıcının kartları yok, Diğer ayarlar duruyor: '+JSON.stringify(b));
 ok(await p.evaluate(()=>window.__WC)===c0+1,'yeni kullanıcı için whoami yeniden okundu');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await p.context().close();
 // 2) okuma hatası: sessizce kart yok, hata mesajı yok
 ({p,st}=await page({who:{venues:[{id:'v1',role:'owner'}]},fail:true,admin:false}));
 await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(1500);b=await S(p);
 ok(!b.ws.length&&!b.ph&&!b.head&&!b.toast&&!b.err&&b.more,'okuma hatası: sessizce eski görünüm (kart yok, mesaj yok, Diğer ayarlar var): '+JSON.stringify(b));
 ok(!st.errors.length,'okuma hatası: sayfa hatası yok: '+st.errors.join(' | '));
 await p.context().close();
 // 3) yetkisiz kullanıcı: hiç kart yok; yönetim yalnız is_admin
 ({p,st}=await page({who:{venues:[],courier:null,is_admin:true},admin:false,fx:{set:{my_seller:null,is_admin:false}}}));
 await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(1500);b=await S(p);
 ok(!b.ws.length&&!b.head&&!b.tags,'yetkisiz: hiç panel kartı yok (Yemek is_admin true olsa da PF.roles.is_admin false → Yönetim yok): '+JSON.stringify(b));
 await p.context().close();
 await br.close();
 if(fails.length){console.error('p24b-rol-kartlari BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p24b-rol-kartlari: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p24b-rol-kartlari HATA:',e);process.exit(1)});
