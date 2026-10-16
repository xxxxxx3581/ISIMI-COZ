// AJ2-C: platform ana ekranı krem / koyu — sahte RPC, veri yazmaz. Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj2-anasayfa.test.js
// Doğrulanan: Özüne Dön Görünüm tercihi yokken ana ekran krem (zemin rgb(246,240,227), alt menü hapı #FFFDF8, etkin sekme orman yeşili);
// isimi_oz_theme='dark' iken bugünkü koyu kahve görünüm (zemin #2B2118, hap #3A2D20); düz zemindeki metinler AA ≥4.5; afiş ve karolardaki
// fotoğraf üstü metinler, metnin altındaki EN AÇIK piksele karşı AA ≥4.5 (metin saydam yapılıp o bölge ölçülür; büyük kalın başlık için ≥3) —
// krem tercihte zorunlu; koyu tercih bugünkü görünümle aynı tutulduğu için orada yalnız ölçülüp yazdırılır;
// dokunma hedefleri ≥44 (logo düğmesi görünmez genişletmeyle); 320/390/768/1280 px × iki tercih taşma 0; Hesabım › "Görünüm" satırı aynı
// anahtarı çevirir (ana ekran koyu/krem olur) ve Hesabım'ın kendi zemini değişmez; Yemek/İlanlar/İşini Hallet gövde ve alt menü renkleri
// tercihten bağımsız (kapsam yalnız ana ekran).
const {chromium,open}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 // ölçüm sırasında yazının süs öğeleri (ör. pazar afişindeki 🌿 satırı) gizlenir; yalnız yazının altındaki fotoğraf/geçiş ölçülür
 await p.addStyleTag({content:'.ozMeasure::before,.ozMeasure::after,.ozMeasure *::before,.ozMeasure *::after{visibility:hidden!important}'});
 const home=async()=>{await p.evaluate(()=>showHome());await p.waitForTimeout(900)};
 const setPref=async v=>{await p.evaluate(v=>{if(v)localStorage.setItem('isimi_oz_theme',v);else localStorage.removeItem('isimi_oz_theme')},v)};
 const look=()=>p.evaluate(()=>{const nav=document.querySelector('nav.bottom'),act=document.querySelector('nav.bottom .navBtn.active');
  return {attr:document.documentElement.getAttribute('data-hm-theme'),bg:getComputedStyle(document.body).backgroundColor,nav:getComputedStyle(nav).backgroundColor,act:act?getComputedStyle(act).color:null}});
 // varsayılan: krem
 await setPref(null);await home();
 let L=await look();
 ok(L.attr==='light'&&L.bg==='rgb(246, 240, 227)'&&L.nav==='rgb(255, 253, 248)'&&L.act==='rgb(31, 107, 69)','tercih yokken krem ana ekran: '+JSON.stringify(L));
 // düz zemindeki metinler AA (etkin zemin üst öğeler karıştırılarak; fotoğraf zeminli öğeler ayrı ölçülür)
 const AA=()=>p.evaluate(()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
  const Lm=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const mix=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
  const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let c={r:255,g:255,b:255,a:1};ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);if(b.a>0)c=mix(b,c)});return c};
  const out=[];[['başlık','#app .hmH'],['kısayol','#app .hmSc button'],['son gezdiklerim','#app .v2Recent h3'],['kutu','#app .v2RecentBox b'],['kutu alt','#app .v2RecentBox small'],
   ['alt menü','nav.bottom .navBtn'],['Yakında','#app .hmSoon']].forEach(([l,s])=>document.querySelectorAll(s).forEach((e,i)=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
   const z=eff(e),t=mix(P(getComputedStyle(e).color),z);const x=Lm(t),y=Lm(z);const v=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(v<4.5)out.push(l+'['+i+'] '+v.toFixed(2))}));return out});
 let v=await AA();ok(!v.length,'[krem] düz zemin metinleri AA: '+v.join(' | '));
 // fotoğraf üstü metinler: metnin altındaki en açık piksele karşı
 const photoAA=async(sel,where)=>{const els=await p.$$(sel);const bad=[];
  for(const [i,e] of els.entries()){const r=await e.boundingBox();if(!r||r.width<2||r.height<2||r.x<0||r.x+r.width>p.viewportSize().width)continue;
   const col=await e.evaluate(x=>{const c=getComputedStyle(x).color;x.dataset.c0=x.getAttribute('style')||'';x.style.setProperty('color','transparent','important');x.style.setProperty('text-shadow','none','important');
    x.querySelectorAll('*').forEach(k=>{k.dataset.c0=k.getAttribute('style')||'';k.style.setProperty('color','transparent','important')});x.classList.add('ozMeasure');return {c:c,big:parseFloat(getComputedStyle(x).fontSize)>=18.66&&+getComputedStyle(x).fontWeight>=700}});
   const buf=await p.screenshot({clip:{x:r.x,y:r.y,width:r.width,height:r.height}});
   await e.evaluate(x=>{x.classList.remove('ozMeasure');x.setAttribute('style',x.dataset.c0);x.querySelectorAll('*').forEach(k=>k.setAttribute('style',k.dataset.c0))});
   const ratio=await p.evaluate(async([b64,c])=>{const im=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+b64});const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const t=cv.getContext('2d');t.drawImage(im,0,0);const d=t.getImageData(0,0,im.width,im.height).data;const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
    const m=c.match(/[\d.]+/g).map(Number);const Lt=.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]);let worst=99;
    for(let k=0;k<d.length;k+=4){const Lb=.2126*f(d[k])+.7152*f(d[k+1])+.0722*f(d[k+2]);const cr=(Math.max(Lt,Lb)+.05)/(Math.min(Lt,Lb)+.05);if(cr<worst)worst=cr}return worst},[buf.toString('base64'),col.c]);
   if(ratio<(col.big?3:4.5))bad.push(where+' '+sel+'['+i+'] '+ratio.toFixed(2))}
  return bad};
 const tiles=async th=>[...await photoAA('#app .hmTile .tx b',th+' karo'),...await photoAA('#app .hmTile .tx small',th+' karo')];
 const hero=async th=>{const bad=[];for(let k=0;k<4;k++){await p.evaluate(k=>{const t=document.querySelector('#app .hmTrack');t.style.transform='translateX(-'+(k*20)+'%)'},k);await p.waitForTimeout(250);
   const sl='#app .hmSl:nth-child('+(k+1)+')';bad.push(...await photoAA(sl+' .h',th+' afiş'+k),...await photoAA(sl+' .s',th+' afiş'+k))}
  await p.evaluate(()=>{const t=document.querySelector('#app .hmTrack');t.style.transform='translateX(0)'});return bad};
 v=[...await tiles('krem'),...await hero('krem')];ok(!v.length,'[krem] fotoğraf üstü metinler en açık bölgeye karşı AA: '+v.join(' | '));
 // dokunma hedefleri
 const touch=()=>p.evaluate(()=>{const out=[];document.querySelectorAll('#app .hmTile,#app .hmSc button,nav.bottom .navBtn,#qrFab').forEach(b=>{const r=b.getBoundingClientRect();if(r.width&&r.height&&(r.width<44||r.height<44))out.push((b.className||b.id)+' '+Math.round(r.width)+'x'+Math.round(r.height))});
  const lg=document.querySelector('#app .hmBrandW .hmBrand');if(lg){const r=lg.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const hit=(x,y)=>{const e=document.elementFromPoint(x,y);return !!e&&(e===lg||lg.contains(e))};
   if(!(hit(cx,r.top-5.5)&&hit(cx,r.bottom+5.5)&&(r.height+12)>=44))out.push('logo dokunma '+Math.round(r.width)+'x'+Math.round(r.height+12))}return out});
 v=await touch();ok(!v.length,'[krem] dokunma ≥44: '+v.join(' | '));
 // koyu tercih: bugünkü görünüm
 await setPref('dark');await home();L=await look();
 ok(L.attr==='dark'&&L.bg==='rgb(43, 33, 24)'&&L.nav==='rgb(58, 45, 32)','isimi_oz_theme=dark iken koyu kahve ana ekran: '+JSON.stringify(L));
 v=await AA();ok(!v.length,'[koyu] düz zemin metinleri AA: '+v.join(' | '));
 // koyu tercih bilinçli olarak bugünkü görünümle piksel düzeyinde aynı tutulur (AJ2-C şartı); fotoğraf üstü ölçüm bilgi olarak yazdırılır
 v=[...await tiles('koyu'),...await hero('koyu')];console.log('bilgi — [koyu, bugünkü görünüm değişmedi] fotoğraf üstü en açık bölge kontrastı <4.5: '+(v.join(' | ')||'yok'));
 v=await touch();ok(!v.length,'[koyu] dokunma ≥44: '+v.join(' | '));
 // taşma
 for(const pref of [null,'dark'])for(const w of [320,390,768,1280]){await setPref(pref);await p.setViewportSize({width:w,height:844});await home();
  const sw=await p.evaluate(()=>document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth);ok(sw<=0,'['+(pref||'krem')+' '+w+'px] ana ekran taşma: '+sw)}
 await p.setViewportSize({width:390,height:844});
 // kapsam: diğer platform ekranları tercihten bağımsız
 const mod=async k=>{await p.evaluate(k=>{showHome();try{hmGo(k)}catch(e){}},k);await p.waitForTimeout(1200);
  return p.evaluate(()=>{const n=document.querySelector('nav.bottom');return [[...document.body.classList].sort().join(' '),getComputedStyle(document.body).backgroundColor,getComputedStyle(document.documentElement).backgroundColor,n?getComputedStyle(n).backgroundColor:'',n?getComputedStyle(n).borderRadius:''].join('|')})};
 const acc=async()=>{await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(900);
  return p.evaluate(()=>{const l=document.querySelector('#app .hmAccL');return [getComputedStyle(document.body).backgroundColor,l?getComputedStyle(l).backgroundColor:'',getComputedStyle(document.querySelector('nav.bottom')).backgroundColor].join('|')})};
 const S={};for(const pref of [null,'dark']){await setPref(pref);S[pref||'krem']={food:await mod('food'),listings:await mod('listings'),services:await mod('services'),acc:await acc()}}
 ['food','listings','services','acc'].forEach(k=>ok(S.krem[k]===S.dark[k],'kapsam: '+k+' tercihten bağımsız: '+S.krem[k]+' / '+S.dark[k]));
 // Hesabım › Görünüm satırı aynı anahtarı çevirir
 await setPref(null);await p.evaluate(()=>{showHome();showAccount()});await p.waitForTimeout(700);
 const row=()=>p.evaluate(()=>{const b=document.querySelector('#app .hmAccR[data-k=theme]');return b?b.innerText.replace(/\s+/g,' ').trim():null});
 ok(/Görünüm: Açık \(krem\)/.test(await row()||''),'Hesabım › "Görünüm: Açık (krem)" satırı: '+await row());
 await p.click('#app .hmAccR[data-k=theme]').catch(()=>fails.push('Görünüm satırı tıklanamadı'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))==='dark'&&/Görünüm: Koyu/.test(await row()||''),'Görünüm → koyu (isimi_oz_theme=dark): '+await row());
 await home();L=await look();ok(L.attr==='dark'&&L.bg==='rgb(43, 33, 24)','koyu seçimden sonra ana ekran koyu: '+JSON.stringify(L));
 await p.evaluate(()=>showAccount());await p.waitForTimeout(500);await p.click('#app .hmAccR[data-k=theme]').catch(()=>fails.push('Görünüm satırı tıklanamadı (2)'));await p.waitForTimeout(600);
 await home();L=await look();ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))==='light'&&L.attr==='light'&&L.bg==='rgb(246, 240, 227)','Görünüm → krem geri: '+JSON.stringify(L));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('aj2-anasayfa BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aj2-anasayfa: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('aj2-anasayfa HATA:',e);process.exit(1)});
