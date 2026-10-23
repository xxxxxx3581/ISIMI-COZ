// Paket 27: üç Hesabım'da (İşimi Çöz, Özüne Dön, Yemek) "Çıkış yap" profil satırının sağında, tek adet (yalnız arayüz) — 390px, krem ve koyu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p27-cikis-ustte.test.js
// Doğrulanan: düğme profil satırında ve metnin sağında, sayfada tek "Çıkış yap", ≥44px, ikon + yazı, kırmızı çerçeveli/saydam, yazı kontrastı ≥4.5;
// tıklanınca mevcut çıkış işlevi (hmAcc('out') / Özüne Dön ozLogout onayı / foodLogout) çağrılır; uzun e-posta kısalır, düğme kartın içinde kalır, yatay taşma yok.
const {chromium,open,enter,overflow}=require('./harness.js');
const LONG='cok.uzun.bir.eposta.adresi.ornegi.icin.yazildi@uzun-alan-adi-ornek.com.tr';
/* sayfa içi ölçüm: profil satırı + çıkış düğmesi */
const M=([row,btn,root])=>{const L=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const bgOf=e=>{for(;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;const m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.5))return c}return 'rgb(255,255,255)'};
 const R=document.querySelector(root),r=R&&R.querySelector(row);if(!r)return null;const b=r.querySelector(btn),tx=r.querySelector('.tx'),sm=tx&&tx.querySelector('small');
 const all=[...R.querySelectorAll('button')].filter(x=>/Çıkış yap/.test(x.textContent)&&x.getBoundingClientRect().height);
 if(!b)return {n:all.length,b:null};const br=b.getBoundingClientRect(),rr=r.getBoundingClientRect(),tr=tx.getBoundingClientRect();const cs=getComputedStyle(b);const a=L(cs.color),z=L(bgOf(b));
 return {n:all.length,b:{t:b.textContent.trim(),svg:!!b.querySelector('svg'),h:Math.round(br.height),w:Math.round(br.width),right:br.left>=tr.right-1,inRow:br.top>=rr.top-1&&br.bottom<=rr.bottom+1&&br.right<=rr.right+1,
  bd:cs.borderTopColor,bw:cs.borderTopWidth,bg:cs.backgroundColor,cr:+((Math.max(a,z)+.05)/(Math.min(a,z)+.05)).toFixed(2)},ell:sm?sm.scrollWidth>sm.clientWidth:false,email:sm&&sm.textContent}};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const chk=(T,m,longMail)=>{ok(m&&m.n===1&&m.b,T+' tek "Çıkış yap" ve profil satırında: '+JSON.stringify(m));if(!m||!m.b)return;
  ok(m.b.t==='Çıkış yap'&&m.b.svg&&m.b.h>=44&&m.b.right&&m.b.inRow,T+' sağda, ≥44px, ikon+yazı: '+JSON.stringify(m.b));
  ok(m.b.bw==='2px'&&!/rgba\(0, 0, 0, 0\)/.test(m.b.bd)&&m.b.bg==='rgba(0, 0, 0, 0)'&&m.b.cr>=4.5,T+' kırmızı çerçeve, saydam zemin, kontrast ≥4.5: '+JSON.stringify(m.b));
  if(longMail)ok(m.ell&&m.b.w<=140,T+' uzun e-posta kısalır, düğme dar kalır: '+JSON.stringify({e:m.ell,w:m.b.w}))};
 for(const light of [true,false]){const th=light?'krem':'koyu';
  /* ---------- İşimi Çöz ---------- */
  let {ctx,p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(t=>{try{localStorage.setItem('isimi_oz_theme',t)}catch(e){}},light?'light':'dark');
  for(const longMail of [false,true]){
   if(longMail)await p.evaluate(L=>{const s=JSON.parse(localStorage.getItem('isimi_coz_auth_session'));s.user.email=L;s.user.user_metadata=Object.assign({},s.user.user_metadata,{full_name:'Çok Uzun Adlı Bir Kullanıcı Örneği Soyadı'});localStorage.setItem('isimi_coz_auth_session',JSON.stringify(s))},LONG);
   await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(900);
   /* P27b: İşimi Çöz kartında e-posta artık kırpılmaz (ikinci katman); düğmeler üst katmanda (.r1) */
   const m=await p.evaluate(M,['.hmAccMe .r1','.hmAccOut2','#app .hmAcc']);chk('['+th+'] İşimi Çöz'+(longMail?' (uzun e-posta)':''),m,false);
   ok((await overflow(p))<=0,'['+th+'] İşimi Çöz yatay taşma');
  }
  /* P27b: 360 ve 390px'te uzun e-posta + rol etiketleri: kesik yok, taşma yok, düğmeler ≥44px */
  await p.evaluate(()=>{const o=window.supabaseAuthRequest;window.supabaseAuthRequest=async function(m,pth){if(pth==='rpc/food_whoami')return {venues:[{id:'v1',name:'Lezzet Durağı',role:'owner'}],courier:{status:'approved'},is_admin:false};return o.apply(this,arguments)};HM_ROLES.uid=null;HM_ROLES.state=null});
  for(const w of [360,390]){await p.setViewportSize({width:w,height:844});await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(1700);
   const k=await p.evaluate(()=>{const C=document.querySelector('#app .hmAccMe');const cr=C.getBoundingClientRect();const em=C.querySelector('.r2 .em');const tg=[...C.querySelectorAll('.hmRoleT')];const rl=C.querySelector('#hmRoles');
    return {em:em&&em.textContent,emClip:!em||em.scrollWidth>em.clientWidth+1||getComputedStyle(em).textOverflow==='ellipsis'&&em.scrollWidth>em.clientWidth,
     tags:tg.map(t=>{const r=t.getBoundingClientRect();return {t:t.textContent,clip:t.scrollWidth>t.clientWidth+1||r.right>cr.right-1||r.left<cr.left}}),rlClip:rl.scrollWidth>rl.clientWidth+1,
     btn:[...C.querySelectorAll('.r1 button')].map(b=>Math.round(b.getBoundingClientRect().height)),order:!!C.querySelector('.r1 .hmAccOut2')&&C.querySelector('.r1').compareDocumentPosition(C.querySelector('.r2'))&Node.DOCUMENT_POSITION_FOLLOWING}});
   ok(k.em===LONG&&!k.emClip,'['+th+' '+w+'] İşimi Çöz: uzun e-posta tam görünür (kırpma yok): '+JSON.stringify([k.em,k.emClip]));
   ok(k.tags.length>=3&&k.tags.every(x=>!x.clip)&&!k.rlClip,'['+th+' '+w+'] İşimi Çöz: rol etiketleri kesilmez ('+k.tags.length+'): '+JSON.stringify(k.tags));
   ok(k.btn.length===2&&k.btn.every(h=>h>=44)&&k.order,'['+th+' '+w+'] İşimi Çöz: Çıkış/Düzenle üst katmanda ≥44px, e-posta+roller altında: '+JSON.stringify(k.btn));
   ok((await overflow(p))<=0,'['+th+' '+w+'] İşimi Çöz yatay taşma');}
  await p.setViewportSize({width:390,height:844});
  ok(await p.evaluate(()=>{const e=document.querySelector('#app .hmAccEnd');return !!e&&!e.querySelector('[data-k=out]')&&!!e.querySelector('.hmAccTh')}),'['+th+'] İşimi Çöz: altta çıkış yok, tema seçici duruyor');
  ok(await p.evaluate(()=>{const R=document.querySelector('#app .hmAcc');const me=R.querySelector('.hmAccMe .ed');return !!me&&me.getBoundingClientRect().height>=44}),'['+th+'] İşimi Çöz: Düzenle duruyor, ≥44px');
  await p.evaluate(()=>{window.__out=[];const f=window.hmAcc;window.hmAcc=function(k){window.__out.push(k);if(k!=='out')return f.apply(this,arguments)}});
  await p.evaluate(()=>document.querySelector('#app .hmAccMe .hmAccOut2').click());
  ok(JSON.stringify(await p.evaluate(()=>window.__out))==='["out"]','['+th+'] İşimi Çöz: tıklama mevcut çıkış işlevini (hmAcc out) çağırır');
  ok(!st.errors.length,'['+th+'] İşimi Çöz sayfa hatası: '+st.errors.join(' | '));await ctx.close();
  /* ---------- Özüne Dön ---------- */
  ({ctx,p,st}=await open(br,{w:390,h:844,visible:true,theme:light?'light':'dark'}));await enter(p);
  await p.evaluate(()=>OZ.go('account',{}));await p.waitForTimeout(1200);
  let m=await p.evaluate(M,['.ozMe','.ozOut','#ozRoot']);chk('['+th+'] Özüne Dön',m,false);
  ok(await p.evaluate(()=>{const e=document.querySelector('#ozRoot .ozAccEnd');return !!e&&!e.querySelector('.ozOut')&&!!e.querySelector('.ozThSel')}),'['+th+'] Özüne Dön: altta çıkış yok, tema seçici duruyor');
  ok((await overflow(p))<=0,'['+th+'] Özüne Dön yatay taşma');
  await p.evaluate(()=>document.querySelector('#ozRoot .ozMe .ozOut').click());await p.waitForTimeout(500);
  ok(await p.evaluate(()=>/Çıkış yapılsın mı\?/.test(document.body.innerText)),'['+th+'] Özüne Dön: tıklama mevcut çıkış onayını (ozLogout) açar');
  ok(!st.errors.length,'['+th+'] Özüne Dön sayfa hatası: '+st.errors.join(' | '));await ctx.close();
  /* ---------- Yemek ---------- */
  ({ctx,p,st}=await open(br,{w:390,h:844,visible:true}));
  await p.evaluate(([light,L])=>{document.documentElement.setAttribute('data-theme',light?'light':'dark');try{localStorage.setItem('isimi-theme',light?'light':'dark')}catch(e){}
   const s=JSON.parse(localStorage.getItem('isimi_coz_auth_session'));s.user.email=L;localStorage.setItem('isimi_coz_auth_session',JSON.stringify(s));
   window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));if(pth==='rpc/food_whoami')return {venues:[{id:'v1',name:'Lezzet Durağı',role:'owner'}],courier:null,is_admin:false};return []}},[light,LONG]);
  await p.evaluate(()=>showFoodAccount());await p.waitForTimeout(1300);
  m=await p.evaluate(M,['.fdwMe','.fdwOut2','#fdRoot']);chk('['+th+'] Yemek (uzun e-posta)',m,true);
  ok(await p.evaluate(()=>{const e=document.querySelector('#fdRoot .fdwAccEnd');return !!e&&!e.querySelector('.fdwOut2')&&!!e.querySelector('.fdwThSel')}),'['+th+'] Yemek: altta çıkış yok, tema seçici duruyor');
  ok((await overflow(p))<=0,'['+th+'] Yemek yatay taşma');
  await p.evaluate(()=>{window.__fo=0;window.foodLogout=function(){window.__fo++}});await p.evaluate(()=>document.querySelector('#fdRoot .fdwMe .fdwOut2').click());
  ok(await p.evaluate(()=>window.__fo)===1,'['+th+'] Yemek: tıklama foodLogout() çağırır');
  ok(!st.errors.length,'['+th+'] Yemek sayfa hatası: '+st.errors.join(' | '));await ctx.close();
 }
 await br.close();
 if(fails.length){console.error('p27-cikis-ustte BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p27-cikis-ustte: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p27-cikis-ustte HATA:',e);process.exit(1)});
