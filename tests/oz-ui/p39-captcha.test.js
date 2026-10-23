// Paket 39: CAPTCHA hazırlığı (Cloudflare Turnstile) — yalnız auth; ağ sahte (auth uçları + Turnstile betiği), 390px, krem ve koyu.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p39-captcha.test.js   (P39_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: (a) anahtar BOŞ (ürün varsayılanı): #authCaptcha yok, Turnstile betiği istenmez, giriş/kayıt/şifre sıfırlama/doğrulama e-postası gövdelerinde
// gotrue_meta_security YOK; (b) anahtar = Cloudflare test anahtarı: kutu çizilir, token yokken istek gitmez ("Güvenlik doğrulamasını tamamla"), token stub'dan
// gelir ve dört çağrıda gotrue_meta_security.captcha_token var, her istekten sonra kutu sıfırlanır; (c) yanıtta captcha hatası → Türkçe mesaj + sıfırlama;
// betik yüklenemezse "Doğrulama kutusu yüklenemedi, sayfayı yenile" ve istek gitmez; kutu kırpılmaz, 390px taşma yok.
const {chromium,open,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P39_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const KEY='1x00000000000000000000AA';
const STUB=`window.turnstile={__n:0,__resets:0,__cb:null,render:function(el,o){el.innerHTML='<div class="cfStub" style="width:'+(o.size==='compact'?150:300)+'px;height:65px;border:1px solid #888;border-radius:6px;display:flex;align-items:center;justify-content:center;font:12px sans-serif">Turnstile ('+o.theme+')</div>';window.__capOpts=o;window.turnstile.__cb=o.callback;return 'w'+(++window.turnstile.__n)},reset:function(){window.turnstile.__resets++},__give:function(){window.turnstile.__cb('TOK'+(++window.__tk))}};window.__tk=0;`;
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const page=async(th,key,mode)=>{const r=await open(br,{w:390,h:844,visible:true,logged:false});const {p}=r;r.req=[];r.script=0;r.mode=mode||{};
  p.on('dialog',d=>d.accept());
  await p.route('https://challenges.cloudflare.com/**',q=>{r.script++;if(r.mode.scriptFail)return q.abort();return q.fulfill({status:200,contentType:'text/javascript',body:STUB})});
  await p.route('**/auth/v1/**',q=>{const u=q.request().url();const path=u.split('/auth/v1/')[1].split('?')[0]+(u.includes('grant_type=password')?':password':'');let b={};try{b=JSON.parse(q.request().postData()||'{}')}catch(e){}
   r.req.push({path,b});
   if(r.mode.captchaErr)return q.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'captcha_failed',msg:'captcha protection: request disallowed (captcha-verification-process-failed)'})});
   if(path==='token:password')return q.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'email_not_confirmed',msg:'Email not confirmed'})});
   if(path==='signup')return q.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'u9',email:b.email})});
   return q.fulfill({status:200,contentType:'application/json',body:'{}'})});
  await p.evaluate(([th,key])=>{applyAppTheme(th);window.PF_TURNSTILE_SITEKEY=key;if(window.PF)window.PF.legal=[]},[th,key]);return r};
 const fill=(p,e,pw)=>p.evaluate(([e,pw])=>{document.getElementById('authEmail').value=e;const x=document.getElementById('authPassword');if(x)x.value=pw},[e,pw]);
 const hasSec=b=>!!(b&&b.gotrue_meta_security);
 for(const th of ['light','dark']){const T='['+(th==='light'?'krem':'koyu')+']';
  /* ---------- (a) anahtar BOŞ: bugünkü davranış ---------- */
  let r=await page(th,'');let {p,st}=r;
  ok(await p.evaluate(()=>window.PF_TURNSTILE_SITEKEY===''&&typeof capOn==='function'&&!capOn()),T+' (a) ürün varsayılanı: anahtar boş');
  await p.evaluate(()=>openAuthModal('login'));await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.getElementById('authCaptcha')),T+' (a) #authCaptcha yok');
  await fill(p,'a@ornek.com','123456');await p.evaluate(()=>submitAuth('login'));await p.waitForTimeout(500);
  await p.evaluate(()=>document.querySelector('#authError button').click());await p.waitForTimeout(500);
  await p.evaluate(()=>openAuthModal('signup'));await p.waitForTimeout(300);await fill(p,'b@ornek.com','123456');await p.evaluate(()=>submitAuth('signup'));await p.waitForTimeout(500);
  await p.evaluate(()=>openForgotPassword());await p.waitForTimeout(200);await fill(p,'c@ornek.com');await p.evaluate(()=>sendPasswordReset());await p.waitForTimeout(500);
  ok(JSON.stringify(r.req.map(x=>x.path))==='["token:password","resend","signup","recover"]'&&r.req.every(x=>!hasSec(x.b)),T+' (a) dört çağrı gövdesinde gotrue_meta_security yok: '+JSON.stringify(r.req));
  ok(r.script===0&&await p.evaluate(()=>!document.getElementById('authCaptcha')&&!window.turnstile),T+' (a) Turnstile betiği istenmedi, kutu yok');
  ok(!st.errors.length,T+' (a) sayfa hatası: '+st.errors.join(' | '));await p.context().close();
  /* ---------- (b) anahtar dolu (test anahtarı) ---------- */
  r=await page(th,KEY);({p,st}=r);
  await p.evaluate(()=>openAuthModal('login'));await p.waitForTimeout(500);
  let k=await p.evaluate(()=>{const b=document.getElementById('authCaptcha'),s=document.getElementById('authSubmit'),m=document.querySelector('#authModal .modalCard');const R=e=>e.getBoundingClientRect();
   return {box:!!b&&!!b.querySelector('.cfStub'),theme:window.__capOpts&&window.__capOpts.theme,key:window.__capOpts&&window.__capOpts.sitekey,clip:b?R(b.querySelector('.cfStub')).right>R(m).right+1||R(b.querySelector('.cfStub')).left<R(m).left-1:true,btnVis:R(s).bottom<=innerHeight&&R(s).height>=40,order:b&&b.nextElementSibling===s}});
  ok(k.box&&k.key===KEY&&k.theme===(th==='light'?'light':'dark')&&!k.clip&&k.btnVis,T+' (b) kutu çizildi, tema uyumlu, kırpılmıyor, düğme görünür: '+JSON.stringify(k));
  ok(r.script===1,T+' (b) betik bir kez yüklendi: '+r.script);
  ok((await overflow(p))<=0,T+' (b) 390px yatay taşma');
  if(SHOTS)await p.screenshot({path:path.join(SHOTS,'p39-'+th+'-giris.png')});
  await fill(p,'a@ornek.com','123456');await p.evaluate(()=>submitAuth('login'));await p.waitForTimeout(300);
  ok(r.req.length===0&&await p.evaluate(()=>(document.getElementById('authCapMsg')||{}).textContent==='Güvenlik doğrulamasını tamamla'),T+' (b) token yokken istek gitmez + uyarı');
  const give=()=>p.evaluate(()=>window.turnstile.__give());
  await give();await p.evaluate(()=>submitAuth('login'));await p.waitForTimeout(500);
  let res0=await p.evaluate(()=>window.turnstile.__resets);
  await p.evaluate(()=>document.querySelector('#authError button').click());await p.waitForTimeout(300);
  const nResendBlocked=r.req.length;
  await give();await p.evaluate(()=>document.querySelector('#authError button').click());await p.waitForTimeout(500);
  await p.evaluate(()=>openAuthModal('signup'));await p.waitForTimeout(400);await fill(p,'b@ornek.com','123456');await give();await p.evaluate(()=>submitAuth('signup'));await p.waitForTimeout(500);
  await p.evaluate(()=>openForgotPassword());await p.waitForTimeout(400);ok(await p.evaluate(()=>!!document.querySelector('#authCaptcha .cfStub')),T+' (b) şifremi unuttum penceresinde kutu');
  await fill(p,'c@ornek.com');await give();await p.evaluate(()=>sendPasswordReset());await p.waitForTimeout(500);
  ok(JSON.stringify(r.req.map(x=>x.path))==='["token:password","resend","signup","recover"]'&&r.req.every(x=>hasSec(x.b)&&/^TOK\d+$/.test(x.b.gotrue_meta_security.captcha_token)),T+' (b) dört çağrıda captcha_token: '+JSON.stringify(r.req));
  ok(nResendBlocked===1,T+' (b) kullanılmış token ile ikinci istek (doğrulama e-postası) gitmez: '+nResendBlocked);
  ok(res0>=1&&new Set(r.req.map(x=>x.b.gotrue_meta_security.captcha_token)).size===4,T+' (b) her istekten sonra sıfırlama, her istekte yeni token');
  ok(!st.errors.length,T+' (b) sayfa hatası: '+st.errors.join(' | '));await p.context().close();
  /* ---------- (c) captcha hatası → Türkçe mesaj + sıfırlama ---------- */
  r=await page(th,KEY,{captchaErr:true});({p,st}=r);
  await p.evaluate(()=>openAuthModal('login'));await p.waitForTimeout(500);await fill(p,'a@ornek.com','123456');
  await p.evaluate(()=>window.turnstile.__give());await p.evaluate(()=>submitAuth('login'));await p.waitForTimeout(500);
  k=await p.evaluate(()=>({m:(document.querySelector('#authError .authError')||{}).textContent,res:window.turnstile.__resets,tok:CAP.tok}));
  ok(k.m==='Güvenlik doğrulaması başarısız; kutuyu yenileyip tekrar dene.'&&k.res>=1&&k.tok===null,T+' (c) giriş captcha hatası: '+JSON.stringify(k));
  await p.evaluate(()=>openForgotPassword());await p.waitForTimeout(400);await fill(p,'c@ornek.com');await p.evaluate(()=>window.turnstile.__give());await p.evaluate(()=>sendPasswordReset());await p.waitForTimeout(500);
  ok(await p.evaluate(()=>(document.querySelector('#authError .authError')||{}).textContent)==='Güvenlik doğrulaması başarısız; kutuyu yenileyip tekrar dene.',T+' (c) şifre sıfırlama captcha hatası');
  ok(!st.errors.length,T+' (c) sayfa hatası: '+st.errors.join(' | '));await p.context().close();
  /* ---------- betik yüklenemezse ---------- */
  r=await page(th,KEY,{scriptFail:true});({p,st}=r);
  await p.evaluate(()=>openAuthModal('login'));await p.waitForTimeout(600);await fill(p,'a@ornek.com','123456');await p.evaluate(()=>submitAuth('login'));await p.waitForTimeout(300);
  k=await p.evaluate(()=>({m:(document.getElementById('authCapMsg')||{}).textContent,btn:!!document.getElementById('authSubmit')}));
  ok(k.m==='Doğrulama kutusu yüklenemedi, sayfayı yenile'&&k.btn&&r.req.length===0,T+' betik yüklenemedi: uyarı, istek yok: '+JSON.stringify([k,r.req.length]));
  await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('p39-captcha BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p39-captcha: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p39-captcha HATA:',e);process.exit(1)});
