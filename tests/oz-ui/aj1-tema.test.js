// AJ1: krem (varsayılan) / koyu tema — sahte RPC, veri yazmaz. Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj1-tema.test.js
// Doğrulanan: depolama yokken krem (zemin rgb(246,240,227)); Hesabım › Görünüm koyuya (rgb(43,33,24)) ve geri geçirir, seçim kalıcı;
// iki temada AA ≥4.5 (başlık, ikincil metin, ürün adı, fiyat, marka, alt menü etiketleri, sıralama seçici, ödeme düğmesi; etkin zemin
// üst öğe zeminleri karıştırılarak hesaplanır); 320/360/390/430/768/1280 px × iki tema × (Keşfet, liste, sepet, siparişler, sipariş,
// satıcı, hesap): yatay taşma 0 ve alt menü düğmeleri ≥44px.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_public_settings=Object.assign({},R.oz_public_settings,{is_admin:false,market_enabled:true});
  localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'v1',product_id:'p0',qty:2,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'500 ml',image:null,price_kurus:65000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:10,nv:3},{variant_id:'v2',product_id:'p0',qty:1,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'1 L',image:null,price_kurus:125000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:3,nv:3}]))});
 await enter(p);
 const bg=()=>p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))===null&&await bg()==='rgb(246, 240, 227)','depolama yokken krem tema: '+await bg());
 // Görünüm anahtarı
 await p.evaluate(()=>OZ.go('account',{}));await p.waitForTimeout(1000);
 const row=await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozRowBtn[data-a=ozTheme]');return b?b.innerText.replace(/\s+/g,' '):null});
 ok(row&&/Görünüm/.test(row)&&/Açık tema \(krem\)/.test(row),'Hesabım › Görünüm satırı: '+row);
 await p.click('#ozRoot .ozRowBtn[data-a=ozTheme]').catch(()=>fails.push('Görünüm tıklanamadı'));await p.waitForTimeout(900);
 ok(await bg()==='rgb(43, 33, 24)'&&await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))==='dark','Görünüm → koyu: '+await bg());
 ok(await p.evaluate(()=>/Koyu tema/.test((document.querySelector('#ozRoot .ozRowBtn[data-a=ozTheme]')||{}).innerText||'')),'satır koyu temayı söyler');
 await p.click('#ozRoot .ozRowBtn[data-a=ozTheme]').catch(()=>fails.push('Görünüm tıklanamadı (2)'));await p.waitForTimeout(900);
 ok(await bg()==='rgb(246, 240, 227)','Görünüm → krem geri: '+await bg());
 // AA: etkin zemin (üst öğe zeminleri karıştırılarak)
 const AA=sels=>p.evaluate(sels=>{
  const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
  const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const mix=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
  const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let c={r:255,g:255,b:255,a:1},img=false;
   ch.forEach(x=>{const s=getComputedStyle(x);if(s.backgroundImage!=='none'&&x!==document.documentElement&&x!==document.body)img=true;const b=P(s.backgroundColor);if(b.a>0)c=mix(b,c)});return {c,img}};
  const out=[];sels.forEach(([lab,sel])=>{document.querySelectorAll(sel).forEach((e,i)=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
   const s=getComputedStyle(e);const z=eff(e);if(z.img)return;const t=mix(P(s.color),z.c);const x=L(t),y=L(z.c);const v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
   if(v<4.5)out.push(lab+'['+i+'] '+v.toFixed(2)+' '+s.color+' / '+JSON.stringify(z.c))})});return out},sels);
 const scr={kesfet:()=>OZ.go('home',{}),liste:()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}),sepet:()=>OZ.go('cart',{}),siparisler:()=>OZ.go('orders',{}),siparis:()=>OZ.go('order',{id:'o1'}),satici:()=>OZ.go('seller',{tab:'ozet'}),hesap:()=>OZ.go('account',{})};
 const go=async k=>{await p.evaluate(scr[k]);await p.waitForTimeout(1300)};
 const setTheme=async t=>{await p.evaluate(t=>{localStorage.setItem('isimi_oz_theme',t);document.body.classList.toggle('ozLt',t==='light')},t)};
 for(const th of ['light','dark']){await setTheme(th);
  await go('liste');let v=await AA([['başlık','#ozRoot .ozPlH h1'],['ikincil','#ozRoot .ozPlH small'],['ürün adı','#ozRoot .ozGr .nm'],['fiyat','#ozRoot .ozGr .pr b'],['marka','#ozTop .ozBrand'],['alt menü','#ozNav .ozNavB .l'],['sıralama','#ozRoot .ozSortSel select'],['sıralama etiketi','#ozRoot .ozSortSel span']]);
  ok(!v.length,'['+th+'] liste AA: '+v.join(' | '));
  await go('sepet');v=await AA([['başlık','#ozRoot .ozHead h1'],['ödeme düğmesi','#ozPlace'],['ikincil','#ozRoot .ozHead p']]);ok(!v.length,'['+th+'] sepet AA: '+v.join(' | '));
  await go('hesap');v=await AA([['başlık','#ozRoot .ozHead h1'],['satır','#ozRoot .ozRowBtn b'],['satır alt','#ozRoot .ozRowBtn small'],['alt menü','#ozNav .ozNavB .l']]);ok(!v.length,'['+th+'] hesap AA: '+v.join(' | '));
  await go('satici');v=await AA([['satıcı menü','#ozNav .ozNavB .l'],['başlık','#ozRoot h2']]);ok(!v.length,'['+th+'] satıcı AA: '+v.join(' | '));
 }
 // genişlik × tema × ekran: taşma 0, alt menü düğmeleri ≥44px
 let n=0;
 for(const th of ['light','dark']){await setTheme(th);
  for(const w of [320,360,390,430,768,1280]){await p.setViewportSize({width:w,height:844});
   for(const k of Object.keys(scr)){await go(k);n++;
    const r=await p.evaluate(()=>{const se=document.scrollingElement;const nb=[...document.querySelectorAll('#ozNav .ozNavB')].filter(b=>b.offsetParent).map(b=>{const q=b.getBoundingClientRect();return Math.min(q.width,q.height)});
     return {sw:se.scrollWidth-se.clientWidth,nb:nb.length?Math.min(...nb):99}});
    ok(r.sw<=0,'['+th+' '+w+'px '+k+'] yatay taşma: '+r.sw);ok(r.nb>=44,'['+th+' '+w+'px '+k+'] alt menü düğmesi <44px: '+r.nb)}}}
 ok(n===84,'84 ekran denetlendi: '+n);
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('aj1-tema BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aj1-tema: tüm kontroller geçti ('+n+' ekran)');process.exit(0);
})().catch(e=>{console.error('aj1-tema HATA:',e);process.exit(1)});
