// Paket 40: giriş/kayıt/şifremi unuttum pencereleri (#authModal) krem temada okunur — 390px, krem + koyu.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p40-giris-kontrast.test.js   (P40_SHOTS=<klasör> verilirse ekran görüntüsü yazar; P40_DUMP=1 koyu tema renklerini yazar)
// Doğrulanan: pencerelerdeki tüm görünen metin (başlık, etiket, yardımcı yazı, Şifremi unuttum?, Kapat, hata kutusu, alan içi yazı ve yer tutucu) ≥4.5:1
// (krem ve koyu); koyu temada renkler önceki (Paket 39) değerlerle aynı.
const {chromium,open}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P40_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
/* Paket 39 (0f15137) koyu tema renkleri — P40_DUMP=1 ile o sürümde alındı; koyu tema değişmemeli */
const DARK_REF=require('./p40-koyu-ref.json');
const MEASURE=()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let z=[255,255,255];ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);const a=b.length>3?b[3]:1;if(a>0)z=[0,1,2].map(i=>b[i]*a+z[i]*(1-a))});return z};
 const cr=(fg,z)=>{const t=P(fg),a=t.length>3?t[3]:1;const c=[0,1,2].map(i=>t[i]*a+z[i]*(1-a));const x=L(c),y=L(z);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const M=document.getElementById('authModal');const out=[];
 M.querySelectorAll('h2,label,p,button,.authError,.notice,input,small,span').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden')return;
  if(e.tagName==='INPUT'){const z=eff(e);out.push({k:'input#'+e.id,c:getComputedStyle(e).color,v:+cr(getComputedStyle(e).color,z).toFixed(2)});out.push({k:'placeholder#'+e.id,c:getComputedStyle(e,'::placeholder').color,v:+cr(getComputedStyle(e,'::placeholder').color,z).toFixed(2)});return}
  const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;const z=eff(e);out.push({k:e.tagName.toLowerCase()+':'+e.textContent.trim().slice(0,22),c:getComputedStyle(e).color,v:+cr(getComputedStyle(e).color,z).toFixed(2)})});
 return out};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const dump={};
 const {p,st}=await open(br,{w:390,h:844,visible:true,logged:false});
 const views=[['giris',()=>openAuthModal('login')],['kayit',()=>openAuthModal('signup')],['unuttum',()=>openForgotPassword()]];
 for(const th of ['light','dark']){const T='['+(th==='light'?'krem':'koyu')+']';
  for(const [n,fn] of views){
   await p.evaluate(([th,n])=>{applyAppTheme(th);closeAuthModal();showHome();({giris:()=>openAuthModal('login'),kayit:()=>openAuthModal('signup'),unuttum:()=>openForgotPassword()})[n]()},[th,n]);await p.waitForTimeout(400);
   // hata kutusu da görünsün
   await p.evaluate(n=>{if(n==='unuttum')sendPasswordReset();else submitAuth(n==='kayit'?'signup':'login')},n);await p.waitForTimeout(200);
   const m=await p.evaluate(MEASURE);dump[th+':'+n]=m;
   const bad=m.filter(x=>x.v<4.5);ok(m.length>=6&&!bad.length,T+' '+n+': tüm metin ≥4.5:1 ('+m.length+' öğe): '+JSON.stringify(bad));
   if(th==='dark'&&DARK_REF[th+':'+n]){const ref=DARK_REF[th+':'+n];const diff=m.filter(x=>{const r=ref.find(y=>y.k===x.k);return !r||r.c!==x.c});ok(!diff.length&&ref.length===m.length,T+' '+n+': koyu tema renkleri aynı: '+JSON.stringify(diff))}
   if(SHOTS)await p.screenshot({path:path.join(SHOTS,'p40-'+th+'-'+n+'.png')});
  }
 }
 if(process.env.P40_DUMP)console.log(JSON.stringify(Object.fromEntries(Object.entries(dump).filter(([k])=>k.startsWith('dark:')))));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p40-giris-kontrast BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p40-giris-kontrast: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p40-giris-kontrast HATA:',e);process.exit(1)});
