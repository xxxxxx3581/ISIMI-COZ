// AJ2-C: platform ana ekranı krem / koyu — sahte RPC, veri yazmaz. Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj2-anasayfa.test.js
// Doğrulanan: Özüne Dön Görünüm tercihi yokken ana ekran krem (zemin rgb(246,240,227), alt menü hapı #FFFDF8, etkin sekme orman yeşili);
// isimi_oz_theme='dark' iken bugünkü koyu kahve görünüm (zemin #2B2118, hap #3A2D20); düz zemindeki metinler AA ≥4.5; afiş ve karolardaki
// fotoğraf üstü metinler, metnin altındaki EN AÇIK piksele karşı AA ≥4.5 (metin saydam yapılıp o bölge ölçülür; büyük kalın başlık için ≥3) —
// krem tercihte zorunlu; koyu tercih bugünkü görünümle aynı tutulduğu için orada yalnız ölçülüp yazdırılır;
// dokunma hedefleri ≥44 (logo düğmesi görünmez genişletmeyle); 320/390/768/1280 px × iki tercih taşma 0; Hesabım › "Görünüm" satırı aynı
// anahtarı çevirir (ana ekran koyu/krem olur) ve Hesabım'ın kendi zemini değişmez; Yemek/İlanlar/İşini Hallet gövde ve alt menü renkleri
// tercihten bağımsız (kapsam yalnız ana ekran).
// AJ2-G (krem): karo/afiş fotoğrafı tamamen beyaz ve tamamen siyahken de (yazı gölgesi hariç) yazılar AA — 390 ve 320 px. AJ2-C3 (krem): afiş dört köşe 22px, sayfa zemini renginde 6px iç çerçeve (tıklamayı geçirir,
// noktaları örtmez), afiş ve karolar aynı sol/sağ kenar, karolar 22px, seçili sekme yeşil kapsül, başlıklarda kehribar çubuk; koyuda yok.
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
 const W=[];const photoAA=async(sel,where)=>{const els=await p.$$(sel);const bad=[];
  for(const [i,e] of els.entries()){const r=await e.boundingBox();if(!r||r.width<2||r.height<2||r.x<0||r.x+r.width>p.viewportSize().width)continue;
   const col=await e.evaluate(x=>{const c=getComputedStyle(x).color;x.dataset.c0=x.getAttribute('style')||'';x.style.setProperty('color','transparent','important');x.style.setProperty('text-shadow','none','important');
    x.querySelectorAll('*').forEach(k=>{k.dataset.c0=k.getAttribute('style')||'';k.style.setProperty('color','transparent','important')});x.classList.add('ozMeasure');return {c:c,big:parseFloat(getComputedStyle(x).fontSize)>=18.66&&+getComputedStyle(x).fontWeight>=700}});
   const buf=await p.screenshot({clip:{x:r.x,y:r.y,width:r.width,height:r.height}});
   await e.evaluate(x=>{x.classList.remove('ozMeasure');x.setAttribute('style',x.dataset.c0);x.querySelectorAll('*').forEach(k=>k.setAttribute('style',k.dataset.c0))});
   const ratio=await p.evaluate(async([b64,c])=>{const im=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+b64});const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const t=cv.getContext('2d');t.drawImage(im,0,0);const d=t.getImageData(0,0,im.width,im.height).data;const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
    const m=c.match(/[\d.]+/g).map(Number);const Lt=.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]);let worst=99;
    for(let k=0;k<d.length;k+=4){const Lb=.2126*f(d[k])+.7152*f(d[k+1])+.0722*f(d[k+2]);const cr=(Math.max(Lt,Lb)+.05)/(Math.min(Lt,Lb)+.05);if(cr<worst)worst=cr}return worst},[buf.toString('base64'),col.c]);
   W.push({w:where,sel,i,r:ratio,big:col.big});if(ratio<(col.big?3:4.5))bad.push(where+' '+sel+'['+i+'] '+ratio.toFixed(2))}
  return bad};
 const tiles=async th=>[...await photoAA('#app .hmTile .tx b',th+' karo'),...await photoAA('#app .hmTile .tx small',th+' karo')];
 const hero=async th=>{const bad=[];for(let k=0;k<4;k++){await p.evaluate(k=>{const t=document.querySelector('#app .hmTrack');t.style.transform='translateX(-'+(k*20)+'%)'},k);await p.waitForTimeout(250);
   const sl='#app .hmSl:nth-child('+(k+1)+')';bad.push(...await photoAA(sl+' .h',th+' afiş'+k),...await photoAA(sl+' .s',th+' afiş'+k))}
  await p.evaluate(()=>{const t=document.querySelector('#app .hmTrack');t.style.transform='translateX(0)'});return bad};
 v=[...await tiles('krem'),...await hero('krem')];ok(!v.length,'[krem] fotoğraf üstü metinler en açık bölgeye karşı AA: '+v.join(' | '));
 // AJ2-G: en kötü durum — karo ve afiş kapağı fotoğrafı TAMAMEN BEYAZ / TAMAMEN SİYAH iken (yazı gölgesi ölçüme katılmaz) krem tercihte AA, 390 ve 320 px
 for(const vw of [390,320])for(const [nm,col] of [['beyaz','#fff'],['siyah','#000']]){
  await p.setViewportSize({width:vw,height:844});await home();
  await p.evaluate(c=>{const cv=document.createElement('canvas');cv.width=cv.height=8;const t=cv.getContext('2d');t.fillStyle=c;t.fillRect(0,0,8,8);const u=cv.toDataURL();
   document.querySelectorAll('#app .hmTile img,#app .hmSl:not(.food) img.bg').forEach(i=>{i.removeAttribute('loading');i.src=u})},col);await p.waitForTimeout(300);
  // afiş0 = Yemek mozaiği (fotoğrafları değiştirilmez, kapsam dışı) ölçüme alınmaz
  W.length=0;v=[...await tiles('krem '+nm+' '+vw),...await hero('krem '+nm+' '+vw)].filter(x=>!/ afiş0 /.test(x));W.splice(0,W.length,...W.filter(x=>!/afiş0$/.test(x.w)));
  const mn=(f)=>{const x=W.filter(f);return x.length?Math.min(...x.map(y=>y.r)).toFixed(2):'-'};
  console.log('bilgi — [krem, '+nm+' fotoğraf, '+vw+'px] en düşük kontrast: karo başlık '+mn(x=>/karo/.test(x.w)&&/ b$/.test(x.sel))+' · karo alt yazı '+mn(x=>/karo/.test(x.w)&&/small$/.test(x.sel))+
   ' · afiş başlık '+mn(x=>/afiş/.test(x.w)&&/\.h$/.test(x.sel))+' · afiş alt yazı '+mn(x=>/afiş/.test(x.w)&&/\.s$/.test(x.sel)));
  ok(!v.length&&W.length>=8,'[krem] '+nm+' fotoğrafta ('+vw+'px) karo/afiş yazısı AA: '+v.join(' | '))}
 await p.setViewportSize({width:390,height:844});await home();
 // dokunma hedefleri
 const touch=()=>p.evaluate(()=>{const out=[];document.querySelectorAll('#app .hmTile,#app .hmSc button,nav.bottom .navBtn,#qrFab').forEach(b=>{const r=b.getBoundingClientRect();if(r.width&&r.height&&(r.width<44||r.height<44))out.push((b.className||b.id)+' '+Math.round(r.width)+'x'+Math.round(r.height))});
  const lg=document.querySelector('#app .hmBrandW .hmBrand');if(lg){const r=lg.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const hit=(x,y)=>{const e=document.elementFromPoint(x,y);return !!e&&(e===lg||lg.contains(e))};
   if(!(hit(cx,r.top-5.5)&&hit(cx,r.bottom+5.5)&&(r.height+12)>=44))out.push('logo dokunma '+Math.round(r.width)+'x'+Math.round(r.height+12))}return out});
 v=await touch();ok(!v.length,'[krem] dokunma ≥44: '+v.join(' | '));
 // AJ2-C3 (krem): afiş dört köşe 22px, sayfa zemini renginde 6px iç çerçeve (tıklamayı geçirir, noktaları örtmez), afiş ve karolar aynı sol/sağ
 // kenarda, karolar 22px köşe; seçili sekme yeşil kapsül; başlıklarda kehribar çubuk
 const C3=()=>p.evaluate(()=>{const sl=document.querySelector('#app .hmSlider'),S=sl.getBoundingClientRect(),cs=getComputedStyle(sl),b4=getComputedStyle(sl,'::before');
  const tiles=[...document.querySelectorAll('#app .hmTile')].map(t=>t.getBoundingClientRect()),dots=document.querySelector('#app .hmDots').getBoundingClientRect();
  const hit=document.elementFromPoint(S.left+3,S.top+S.height/2),act=document.querySelector('nav.bottom .navBtn.active');
  return {rad:[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius].join(','),
   frame:b4.content!=='none'?b4.boxShadow:'none',pe:b4.pointerEvents,page:getComputedStyle(document.body).backgroundColor,
   hitSl:!!(hit&&hit.closest('.hmSl')),dotsIn:dots.bottom<=S.bottom-6&&dots.top>=S.top+6,
   left:[Math.round(S.left),Math.round(Math.min(...tiles.map(r=>r.left)))],right:[Math.round(S.right),Math.round(Math.max(...tiles.map(r=>r.right)))],
   trad:[...document.querySelectorAll('#app .hmTile')].map(t=>getComputedStyle(t).borderTopLeftRadius),
   cap:act?getComputedStyle(act,'::before').backgroundColor+'|'+getComputedStyle(act,'::before').borderTopLeftRadius:null,
   bar:[...document.querySelectorAll('#app .hmH,#app .v2Recent h3')].map(h=>{const s=getComputedStyle(h,'::before');return s.content!=='none'?s.width+'x'+s.height:null})}});
 let c3=await C3();
 ok(c3.rad==='22px,22px,22px,22px','[krem] afiş dört köşe 22px: '+c3.rad);
 ok(c3.frame.indexOf(c3.page)>=0&&/inset/.test(c3.frame)&&/ 6px/.test(c3.frame)&&c3.pe==='none','[krem] afiş çerçevesi sayfa zemini renginde, 6px iç, tıklamayı geçirir: '+JSON.stringify([c3.frame,c3.page,c3.pe]));
 ok(c3.hitSl&&c3.dotsIn,'[krem] çerçeve kenarına dokunuş slayta gider, noktalar çerçevenin içinde: '+JSON.stringify([c3.hitSl,c3.dotsIn]));
 ok(c3.left[0]===c3.left[1]&&c3.right[0]===c3.right[1],'[krem] afiş ve karolar aynı sol/sağ kenar: '+JSON.stringify([c3.left,c3.right]));
 ok(c3.trad.length===4&&c3.trad.every(r=>r==='22px'),'[krem] karolar 22px köşe: '+c3.trad);
 ok(c3.cap==='rgba(31, 107, 69, 0.12)|18px','[krem] seçili sekme yeşil kapsül: '+c3.cap);
 ok(c3.bar.length===2&&c3.bar.every(x=>x==='4px x18px'.replace(' ','')),'[krem] başlıklarda 4×18 kehribar çubuk: '+JSON.stringify(c3.bar));
 // koyu tercih: bugünkü görünüm
 await setPref('dark');await home();L=await look();
 ok(L.attr==='dark'&&L.bg==='rgb(43, 33, 24)'&&L.nav==='rgb(58, 45, 32)','isimi_oz_theme=dark iken koyu kahve ana ekran: '+JSON.stringify(L));
 c3=await C3();ok(c3.frame==='none'&&c3.bar.every(x=>x===null),'[koyu] C3 çerçeve/çubuk yok (bugünkü görünüm): '+JSON.stringify([c3.frame,c3.bar]));
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
