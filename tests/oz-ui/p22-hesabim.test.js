// Paket 22: ortak Hesabım şablonu (yalnız arayüz) — 390px, krem/açık ve koyu tema, sahte veri, ağa çıkmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p22-hesabim.test.js   (P22_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Sıra: profil (avatar harfi, ad, e-posta, yalnız mevcut rol etiketleri) → Siparişlerim/Favorilerim (≥52px; P42 öncesi ≥76) → Çalışma alanlarım (yalnız mevcut
// paneller; Satıcı yeşil, İşletme amber, Kurye mavi, Yönetim lacivert çerçeve; ≥52px (P42 öncesi ≥64); renk + yazı) → Hesap listesi → Açık/Koyu seçici + küçük
// kırmızı çerçeveli "Çıkış yap". Mevcut bağlantılar erişilebilir (satıcı ol, işletme ekle, kurye ol, yönetim, İşimi Çöz'e dön). Metin kontrastı ≥4.5,
// dokunma ≥44px, yatay taşma yok, içerik sonu alt menünün üstünde.
const {chromium,open,enter,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P22_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
// metin kontrastı: etkin zemin (saydam zeminlerde üst öğelere çıkılır)
const AUDIT=root=>{const L=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const bgOf=e=>{for(;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;const m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.5))return c}return 'rgb(255,255,255)'};
 const R=document.querySelector(root);const bad=[],small=[];
 R.querySelectorAll('b,small,span.l,button>span,.ozRoleT,.fdwRoleT,h2,button').forEach(e=>{if(!e.textContent.trim()||!e.getBoundingClientRect().height)return;if([...e.children].some(c=>c.textContent.trim()===e.textContent.trim()))return;
  const fg=getComputedStyle(e).color,bg=bgOf(e);const a=L(fg),b=L(bg);const cr=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(cr<4.5)bad.push(e.textContent.trim().slice(0,22)+':'+cr.toFixed(2))});
 R.querySelectorAll('button').forEach(b=>{const h=b.getBoundingClientRect().height;if(h&&h<44)small.push(b.textContent.trim().slice(0,20)+':'+Math.round(h))});
 return {bad,small}};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const shots=[];
 const shot=async(p,n)=>{if(!SHOTS)return;const f=path.join(SHOTS,n+'.png');await p.evaluate(()=>document.querySelectorAll('#v2Toast,.ozToast').forEach(x=>x.remove()));await p.screenshot({path:f,fullPage:true});shots.push(f)};
 for(const light of [true,false]){const th=light?'krem':'koyu';
  /* ================= Özüne Dön ================= */
  let {ctx,p,st}=await open(br,{w:390,h:844,visible:true,theme:light?'light':'dark'});await enter(p);
  await p.evaluate(()=>OZ.go('account',{}));await p.waitForTimeout(1200);
  let r=await p.evaluate(()=>{const R=document.getElementById('ozRoot');const pos=s=>{const e=R.querySelector(s);return e?[...R.querySelectorAll('*')].indexOf(e):-1};
   const q=[...R.querySelectorAll('.ozQuick2 button')];const ws=[...R.querySelectorAll('.ozWs')];
   return {/* P27: çıkış profil satırında (tek adet) */order:[pos('.ozMe'),pos('.ozMe .ozOut'),pos('.ozQuick2'),pos('.ozWs'),pos('[data-k=addresses]'),pos('.ozThSel')],outN:R.querySelectorAll('.ozOut').length,av:(R.querySelector('.ozMe .av')||{}).textContent,email:(R.querySelector('.ozMe small')||{}).textContent,
    tags:[...R.querySelectorAll('.ozRoleT')].map(x=>x.textContent),q:q.map(b=>b.textContent+':'+Math.round(b.getBoundingClientRect().height)),
    ws:ws.map(b=>({t:b.querySelector('b').textContent,s:b.querySelector('small').textContent,h:Math.round(b.getBoundingClientRect().height),bg:getComputedStyle(b).backgroundColor,bd:getComputedStyle(b).borderTopColor,a:b.dataset.a})),
    acc:[...R.querySelectorAll('.ozAccL .ozRowBtn b')].map(x=>x.textContent),th:(R.querySelector('.ozThSel [aria-pressed=true]')||{}).textContent,
    out:(()=>{const o=R.querySelector('.ozOut');return o?{t:o.textContent,bd:getComputedStyle(o).borderTopColor,bg:getComputedStyle(o).backgroundColor,h:Math.round(o.getBoundingClientRect().height)}:null})(),home:!!R.querySelector('[data-a=exit]')}});
  ok(r.order.every((x,i)=>x>=0&&(i===0||x>r.order[i-1]))&&r.outN===1,'['+th+'] Özüne Dön Hesabım sırası (çıkış profil satırında, tek): '+JSON.stringify([r.order,r.outN]));
  ok(r.av==='T'&&r.email==='test@ornek.com'&&JSON.stringify(r.tags)==='["Satıcı · Onaylı","Yönetici"]','['+th+'] profil + yalnız mevcut roller: '+JSON.stringify([r.av,r.email,r.tags]));
  ok(r.q.length===2&&/^Siparişlerim:/.test(r.q[0])&&/^Favorilerim:/.test(r.q[1])&&r.q.every(x=>+x.split(':')[1]>=52),'['+th+'] iki kutu ≥52px (P42 sıkı): '+JSON.stringify(r.q));
  ok(r.ws.length===2&&r.ws[0].t==='Satıcı paneli'&&/^rgb\((31, 107, 69|40, 128, 79)\)$/.test(r.ws[0].bg)&&r.ws[1].t==='Özüne Dön yönetimi'&&r.ws[1].a==='admin'&&r.ws[1].bd!=='rgba(0, 0, 0, 0)'&&r.ws.every(x=>x.h>=52&&x.s),'['+th+'] çalışma alanları (satıcı yeşil, yönetim çerçeveli, ≥52px, alt yazı): '+JSON.stringify(r.ws));
  ok(JSON.stringify(r.acc)==='["Adreslerim","Bildirimler"]'&&r.th===(light?'Açık (krem)':'Koyu')&&r.out&&r.out.t==='Çıkış yap'&&r.out.bg==='rgba(0, 0, 0, 0)'&&r.out.h>=44&&r.home,'['+th+'] hesap listesi, tema seçici, küçük çıkış, İşimi Çöz bağlantısı: '+JSON.stringify([r.acc,r.th,r.out,r.home]));
  let a=await p.evaluate(AUDIT,'#ozRoot');ok(!a.bad.length,'['+th+'] Özüne Dön kontrast ≥4.5: '+a.bad.join(', '));ok(!a.small.length,'['+th+'] Özüne Dön ≥44px: '+a.small.join(', '));
  ok((await overflow(p))<=0,'['+th+'] Özüne Dön yatay taşma');
  r=await p.evaluate(()=>{window.scrollTo(0,document.scrollingElement.scrollHeight);const n=document.getElementById('ozNav').getBoundingClientRect();const k=[...document.querySelectorAll('#ozRoot > *')].filter(e=>e.getBoundingClientRect().height).pop();return {nt:Math.round(n.top),lb:Math.round(k.getBoundingClientRect().bottom)}});
  ok(r.lb<=r.nt,'['+th+'] Özüne Dön içerik sonu alt menünün üstünde: '+JSON.stringify(r));
  await p.evaluate(()=>window.scrollTo(0,0));await shot(p,'oz-hesabim-'+th);
  // satıcı olmayan: "Satıcı ol" erişilebilir, satıcı kartı yok
  ok(!st.errors.length,'['+th+'] Özüne Dön sayfa hatası: '+st.errors.join(' | '));await ctx.close();
  ({ctx,p,st}=await open(br,{w:390,h:844,visible:true,theme:light?'light':'dark',fx:{set:{my_seller:null,is_admin:false}}}));await enter(p);
  await p.evaluate(()=>OZ.go('account',{}));await p.waitForTimeout(1200);
  r=await p.evaluate(()=>({ws:document.querySelectorAll('#ozRoot .ozWs').length,tags:document.querySelectorAll('#ozRoot .ozRoleT').length,ol:[...document.querySelectorAll('#ozRoot .ozRowBtn b')].map(x=>x.textContent)}));
  ok(r.tags===0&&r.ws===0&&r.ol.includes('Satıcı ol'),'['+th+'] satıcı/yönetici değil: kart yok, "Satıcı ol" erişilebilir: '+JSON.stringify(r));
  ok(!st.errors.length,'['+th+'] Özüne Dön sayfa hatası: '+st.errors.join(' | '));
  await ctx.close();
  /* ================= Yemek ================= */
  for(const who of ['hepsi','hicbiri']){
   ({ctx,p,st}=await open(br,{w:390,h:844,visible:true}));
   await p.evaluate(([light,who])=>{document.documentElement.setAttribute('data-theme',light?'light':'dark');try{localStorage.setItem('isimi-theme',light?'light':'dark')}catch(e){}
    const W=who==='hepsi'?{venues:[{id:'v1',name:'Lezzet Durağı',role:'owner'}],courier:{status:'approved',display_name:'K'},is_admin:true}:{venues:[],courier:null,is_admin:false};
    window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));if(pth==='rpc/food_whoami')return JSON.parse(JSON.stringify(W));return []}},[light,who]);
   await p.evaluate(()=>showFoodAccount());await p.waitForTimeout(1300);
   r=await p.evaluate(()=>{const R=document.getElementById('fdRoot');
    return {tags:[...R.querySelectorAll('.fdwRoleT')].map(x=>x.textContent),q:[...R.querySelectorAll('.fdwQuick button')].map(b=>b.textContent+':'+Math.round(b.getBoundingClientRect().height)),
     ws:[...R.querySelectorAll('.fdwWs')].map(b=>({t:b.querySelector('b').textContent,h:Math.round(b.getBoundingClientRect().height),bg:getComputedStyle(b).backgroundColor,bd:getComputedStyle(b).borderTopColor,on:b.getAttribute('onclick')})),
     rows:[...R.querySelectorAll('.fdwList .fdwRow b')].map(x=>x.textContent),th:(R.querySelector('.fdwThSel [aria-pressed=true]')||{}).textContent,out:!!R.querySelector('.fdwOut2[onclick="foodLogout()"]')}});
   if(who==='hepsi'){
    ok(JSON.stringify(r.tags)==='["İşletme sahibi","Kurye","Yönetici"]','['+th+'] Yemek roller: '+JSON.stringify(r.tags));
    ok(JSON.stringify(r.ws.map(x=>x.t))==='["İşletmem","Kurye","Yemek yönetimi"]'&&r.ws[0].bg==='rgb(154, 100, 16)'&&r.ws[1].bg==='rgb(47, 111, 168)'&&r.ws[2].bd!=='rgba(0, 0, 0, 0)'&&r.ws.every(x=>x.h>=52),'['+th+'] Yemek çalışma alanları (amber/mavi/lacivert): '+JSON.stringify(r.ws));
    ok(r.ws[0].on==='showFoodBusiness()'&&r.ws[1].on==='showFoodCourier()'&&r.ws[2].on==='showFoodAdmin()','['+th+'] Yemek çalışma alanları aynı işlevler');
   }else{
    ok(!r.tags.length&&!r.ws.length&&r.rows.includes('İşletme ekle')&&r.rows.includes('Kurye ol'),'['+th+'] Yemek: panel yoksa kart yok, işletme ekle / kurye ol "Daha fazla"da: '+JSON.stringify(r));
   }
   ok(r.q.length===2&&r.q.every(x=>+x.split(':')[1]>=52),'['+th+'] Yemek iki kutu ≥52px (P42 sıkı): '+JSON.stringify(r.q));
   ok(['Adreslerim','Kuponlarım','Bildirimler','Yardım ve destek','Hesap ve güvenlik'].every(x=>r.rows.includes(x))&&r.rows.includes('İşimi Çöz’e dön')&&r.out&&r.th===(light?'Açık':'Koyu'),'['+th+'] Yemek hesap listesi, tema, çıkış: '+JSON.stringify([r.rows,r.th,r.out]));
   a=await p.evaluate(AUDIT,'#fdRoot');ok(!a.bad.length,'['+th+'/'+who+'] Yemek kontrast ≥4.5: '+a.bad.join(', '));ok(!a.small.length,'['+th+'/'+who+'] Yemek ≥44px: '+a.small.join(', '));
   ok((await overflow(p))<=0,'['+th+'] Yemek yatay taşma');
   r=await p.evaluate(()=>{window.scrollTo(0,document.scrollingElement.scrollHeight);const n=document.querySelector('.fdwNav');const k=document.querySelector('#fdRoot .fdwAccEnd');return n&&k?{nt:Math.round(n.getBoundingClientRect().top),lb:Math.round(k.getBoundingClientRect().bottom)}:null});
   ok(!r||r.lb<=r.nt,'['+th+'] Yemek içerik sonu alt menünün üstünde: '+JSON.stringify(r));
   await p.evaluate(()=>window.scrollTo(0,0));if(who==='hepsi')await shot(p,'yemek-hesabim-'+th);
   // tema seçici mevcut applyAppTheme'i çağırır
   await p.evaluate(light=>{[...document.querySelectorAll('#fdRoot .fdwThSel button')].find(b=>b.textContent===(light?'Koyu':'Açık')).click()},light);await p.waitForTimeout(900);
   ok(await p.evaluate(light=>document.documentElement.getAttribute('data-theme')===(light?'dark':'light')&&localStorage.getItem('isimi-theme')===(light?'dark':'light'),light),'['+th+'] Yemek tema seçici çalışır');
   ok(!st.errors.length,'['+th+'] Yemek sayfa hatası: '+st.errors.join(' | '));
   await ctx.close();
  }
 }
 await br.close();
 if(shots.length)console.log('ekran görüntüleri ('+shots.length+'): '+SHOTS);
 if(fails.length){console.error('p22-hesabim BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p22-hesabim: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p22-hesabim HATA:',e);process.exit(1)});
