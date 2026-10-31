// AJ1: krem (varsayılan) / koyu tema — sahte RPC, veri yazmaz. Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj1-tema.test.js
// Doğrulanan: depolama yokken krem (zemin rgb(246,240,227)); Hesabım › Görünüm koyuya (rgb(43,33,24)) ve geri geçirir, seçim kalıcı;
// iki temada AA ≥4.5 (başlık, ikincil metin, ürün adı, fiyat, marka, alt menü etiketleri, sıralama seçici, ödeme düğmesi; etkin zemin
// üst öğe zeminleri karıştırılarak hesaplanır); 320/360/390/430/768/1280 px × iki tema × (Keşfet, liste, sepet, siparişler, sipariş,
// satıcı, hesap): yatay taşma 0 ve alt menü düğmeleri ≥44px. P3: sepet satır tutarı + özet (2.550,00 ₺, kargo Ücretsiz), ≥900px iki sütun,
// ürün detayı "'den başlayan" (seçimden önce .ozPrice yok), teslim düğmesi ikincil, "Öne çıkan ürünler" satıcıların altında.
// P7: sonuçsuz aramada kategoriler + "Öne çıkan ürünler"; "Sıradaki adım"; kargo/iade/satıcı bloğu; adet sınırı açıklaması (50 / stok);
// stok −/+ (kayıt yalnız "Kaydet" ile); sayaç süzme; ürün paneli hatasında "Tekrar dene"; panel odağı; 320px ödeme çubuğu toplamı.
// AJ2-D: ızgara 16/20px aralık, 18px köşeli neredeyse görünmez çerçeve, fotoğraf 7px içeride, yazı sırası ve fiyat hizası, "+" çerçevenin sağ üst köşesinde (24px, 44×44).
// AJ2-B: sipariş detayında takip düğmesi orman yeşili, "İade talebi oluştur" kehribar (.ozRet), iki temada AA; "Ürünleri değerlendir" kartı tam genişlik.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_public_settings=Object.assign({},R.oz_public_settings,{is_admin:false,market_enabled:true,return_days:14});
  localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'v1',product_id:'p0',qty:2,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'500 ml',image:null,price_kurus:65000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:10,nv:3},{variant_id:'v2',product_id:'p0',qty:1,name:'Erken hasat soğuk sıkım zeytinyağı 0',label:'1 L',image:null,price_kurus:125000,seller_id:'s1',seller_name:'Yayla Üreticileri',stock:3,nv:3}]))});
 await enter(p);
 const bg=()=>p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 ok(await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))===null&&await bg()==='rgb(246, 240, 227)','depolama yokken krem tema: '+await bg());
 // Görünüm anahtarı
 await p.evaluate(()=>OZ.go('account',{}));await p.waitForTimeout(1000);
 // Paket 22 (bilinçli değişiklik): "Görünüm" satırı yerine Hesabım altında Açık/Koyu seçici (aynı ozTheme işlevi); seçili olan basılı
 const row=await p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozThSel');const on=g&&g.querySelector('[aria-pressed=true]');return g?g.innerText.replace(/\s+/g,' ')+' | seçili: '+(on&&on.textContent):null});
 ok(row&&/Görünüm/.test(row)&&/seçili: Açık \(krem\)/.test(row),'Hesabım › Görünüm seçici: '+row);
 await p.click('#ozRoot .ozThSel [data-a=ozTheme]').catch(()=>fails.push('Görünüm tıklanamadı'));await p.waitForTimeout(900);
 ok(await bg()==='rgb(43, 33, 24)'&&await p.evaluate(()=>localStorage.getItem('isimi_oz_theme'))==='dark','Görünüm → koyu: '+await bg());
 ok(await p.evaluate(()=>((document.querySelector('#ozRoot .ozThSel [aria-pressed=true]')||{}).textContent||'')==='Koyu'),'seçici koyu temayı gösterir');
 await p.click('#ozRoot .ozThSel [data-a=ozTheme]').catch(()=>fails.push('Görünüm tıklanamadı (2)'));await p.waitForTimeout(900);
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
 // AJ1 P3: alıcı akışı — sepet satır tutarı + özet (oz_quote yanıtından), ürün detayı "'den başlayan", teslim düğmesi ikincil, ana sayfa "Öne çıkan ürünler" satıcıların altında
 await setTheme('light');await p.setViewportSize({width:390,height:844});
 await go('sepet');
 const co=await p.evaluate(()=>({lt:[...document.querySelectorAll('#ozRoot .ozCoL .lt')].map(x=>x.textContent.replace(/\s/g,' ')),
  sum:[...document.querySelectorAll('#ozRoot .ozCoSum>div')].map(d=>d.innerText.replace(/\s+/g,' ').trim()),inMain:!!document.querySelector('#ozRoot .ozCoMain > .ozCoItems + .ozCoSum')}));
 ok(co.lt.join('|')==='1.300,00 ₺|1.250,00 ₺','satır tutarları (.lt): '+JSON.stringify(co.lt));
 ok(co.inMain&&co.sum.join('|')==='Ara toplam 2.550,00 ₺|Kargo Ücretsiz|Genel toplam 2.550,00 ₺','özet (2×650 + 1.250 = 2.550,00 ₺, kargo Ücretsiz): '+JSON.stringify(co.sum));
 await p.setViewportSize({width:1280,height:844});await go('sepet');
 const co2=await p.evaluate(()=>{const it=document.querySelector('#ozRoot .ozCoItems').getBoundingClientRect(),sm=document.querySelector('#ozRoot .ozCoSum').getBoundingClientRect(),fx=document.querySelector('#ozRoot .ozCoFix').getBoundingClientRect();
  return {two:sm.left>it.right-1&&Math.abs(sm.top-it.top)<4,fixUnder:fx.top>=sm.bottom-1&&Math.abs(fx.left-sm.left)<2}});
 ok(co2.two&&co2.fixUnder,'≥900px iki sütun: solda ürünler, sağda özet + altında adres/ödeme: '+JSON.stringify(co2));
 await p.setViewportSize({width:390,height:844});
 await go('liste');await p.click('#ozRoot .ozGrs .ozGr[data-pid=p0] .go').catch(()=>fails.push('ürün paneli açılamadı'));await p.waitForTimeout(1200);
 const pf=await p.evaluate(()=>{const o=document.querySelector('.ozOv.ozPdS');if(!o)return null;const f=o.querySelector('.ozPrFrom');return {txt:f?f.innerText.replace(/\s+/g,' '):null,price:!!o.querySelector('.ozPrice b')}});
 ok(pf&&pf.txt==="650,00 ₺'den başlayan fiyatlarla · seçeneğini seç"&&!pf.price,'ürün detayı: seçimden önce "\'den başlayan", .ozPrice b yok: '+JSON.stringify(pf));
 await p.evaluate(()=>{document.querySelectorAll('.ozOv').forEach(x=>x.remove())});
 await go('siparis');const dl=await p.evaluate(()=>{const b=document.querySelector('#ozRoot [data-a=ordDeliver]');return b?b.className:null});
 ok(dl==='ozBtn','"Siparişim elime ulaştı" birincil değil: '+dl);
 await go('kesfet');await p.waitForTimeout(600);
 const hp=await p.evaluate(()=>{const b=document.getElementById('ozHP'),pr=document.querySelector('#ozRoot .ozPrds3');return {h:b&&b.querySelector('h2')?b.querySelector('h2').textContent:null,n:b?b.querySelectorAll('.ozGr,.ozGc').length:0,after:!!(b&&pr&&(pr.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING))}});
 ok(hp.h==='Öne çıkan ürünler'&&hp.n>0&&hp.after,'ana sayfa "Öne çıkan ürünler" satıcı kartlarının altında: '+JSON.stringify(hp));
 // AJ1 P7: cila — boş arama bağlantıları, "Sıradaki adım", ürün detayında kargo/iade/satıcı bloğu, adet sınırı açıklaması, stok −/+, sayaç süzme,
 // ürün paneli hatasında "Tekrar dene", panel odağı (Kapat'a girer, kapanınca geri döner), 320px ödeme çubuğunda toplam kesilmez
 await setTheme('light');await p.setViewportSize({width:390,height:844});
 const R0=await p.evaluate(()=>JSON.stringify(window.__OZ_FX.R.oz_search_products));
 await p.evaluate(()=>{window.__OZ_FX.R.oz_search_products=[]});await p.evaluate(()=>OZ.go('search',{q:'yokyok'}));await p.waitForTimeout(1400);
 const em=await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozEmptyA');return b?[...b.querySelectorAll('button')].map(x=>x.dataset.a+':'+(x.dataset.sort||'')+':'+x.textContent):null});
 ok(em&&em.join('|')==='catAll::Kategorilere göz at|nav:popular:Öne çıkan ürünler','sonuçsuz arama: kategoriler + "Öne çıkan ürünler" bağlantıları: '+JSON.stringify(em));
 await p.evaluate(R0=>{window.__OZ_FX.R.oz_search_products=JSON.parse(R0)},R0);
 await go('siparis');const nx=await p.evaluate(()=>{const e=document.querySelector('#ozRoot .ozOdN.ozNext');return e?e.innerText.replace(/\s+/g,' '):null});
 // Paket 19 düzeltme (bilinçli değişiklik): kargoda metin kullanıcının verdiği sabit cümle; firma adı hemen alttaki kargo kartında (önceden metinde)
 ok(nx&&/^Sıradaki adım: Kargon yolda\. Kargo firmasından takip edebilirsin\. Eline ulaşınca aşağıdan onayla\./.test(nx),'sipariş detayı "Sıradaki adım" (kargoda): '+nx);
 await p.evaluate(()=>OZ.go('product',{id:'p0'}));await p.waitForTimeout(1400);
 await p.evaluate(()=>{const b=document.querySelector('.ozOv.ozPdS .ozVar');if(b)b.click()});await p.waitForTimeout(300);
 const tr=await p.evaluate(()=>{const b=document.querySelector('.ozOv.ozPdS .ozPdTr');return b?{n:b.querySelectorAll('.ozShipN').length,pr:!!b.querySelector('.ozPdPr [data-a=pdSeller]'),t:b.innerText.replace(/\s+/g,' '),
  foc:document.activeElement&&document.activeElement.classList.contains('ozX')}:null});
 ok(tr&&tr.pr&&/iş günü içinde kargoya verilir/.test(tr.t),'ürün detayı: kargo süresi + satıcı tek blokta: '+JSON.stringify(tr));
 ok(tr&&tr.foc,'ürün paneli açılınca odak panelde (Kapat): '+JSON.stringify(tr&&tr.foc));
 // P7 (bilinçli beklenti değişikliği): metin "… iade isteyebilirsin" → "… cayma hakkın var" (çabuk bozulmayan ürün)
 ok(tr&&tr.n===2&&/Teslimattan sonraki 14 gün içinde cayma hakkın var/.test(tr.t),'iade koşulu (return_days=14) aynı blokta: '+JSON.stringify(tr&&tr.t));
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(300);
 // adet sınırı: stok 3'te 3 adet → "Stoktaki tüm adetler sepetinde"; stok 200'de 50 adet → "en fazla 50 adet"
 const cart0=await p.evaluate(()=>localStorage.getItem('isimi_oz_cart'));
 await p.evaluate(()=>{const R=window.__OZ_FX.R;const c=JSON.parse(localStorage.getItem('isimi_oz_cart'));c[0].qty=50;c[1].qty=2;localStorage.setItem('isimi_oz_cart',JSON.stringify(c));
  R.__vs0=JSON.stringify(R.oz_product_detail.variants);R.oz_product_detail.variants=R.oz_product_detail.variants.map(v=>Object.assign({},v,{stock:v.id==='v1'?200:2}))});
 await go('sepet');const qm=await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozCoL')].map(l=>{const pl=l.querySelector('.q button[data-d="1"]'),m=l.querySelector('.ozQMx');return {dis:pl&&pl.disabled,m:m?m.textContent:null}}));
 ok(qm.length===2&&qm.every(x=>x.dis&&x.m)&&qm.some(x=>x.m==='Bir üründen en fazla 50 adet')&&qm.some(x=>x.m==='Stoktaki tüm adetler sepetinde'),'adet sınırında "+" pasif + kısa açıklama: '+JSON.stringify(qm));
 await p.setViewportSize({width:320,height:700});await go('sepet');
 const bar=await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozCoBar2 .sum b');return b?{sw:b.scrollWidth,cw:b.clientWidth,t:b.innerText.replace(/\s+/g,' ')}:null});
 ok(bar&&bar.sw<=bar.cw+1,'320px ödeme çubuğunda toplam kesilmez: '+JSON.stringify(bar));
 await p.setViewportSize({width:390,height:844});await p.evaluate(c=>{localStorage.setItem('isimi_oz_cart',c);const R=window.__OZ_FX.R;R.oz_product_detail.variants=JSON.parse(R.__vs0)},cart0);
 // satıcı: sayaç süzer; stok −/+ yalnız alanı değiştirir, "Kaydet" mevcut oz_variant_set_stock'u çağırır
 await go('satici');await p.click('#ozRoot .ozSoCnt .c.c4').catch(()=>fails.push('Kargoda sayacı tıklanamadı'));await p.waitForTimeout(1300);
 const fl=await p.evaluate(()=>{const c=document.querySelector('#ozRoot .ozSoCnt .c4'),h=document.querySelector('#ozSP .ozSoCnt ~ .ozSecH h2');return {on:c&&c.classList.contains('on'),h:h?h.textContent:null,top:h?Math.round(h.getBoundingClientRect().top):null}});
 ok(fl.on&&/^Kargoda \(\d+\)$/.test(fl.h||'')&&fl.top>=0&&fl.top<844,'sayaç → ilgili siparişler (süzülür, başlık görünür): '+JSON.stringify(fl));
 await p.evaluate(()=>OZ.go('seller',{tab:'urunler'}));await p.waitForTimeout(1500);
 const sb=await p.evaluate(()=>{const b=document.querySelector('#ozRoot [data-a=stockBox][data-id=p0]');if(b)b.click();return !!b});await p.waitForTimeout(500);
 ok(sb,'Stok düğmesi bulundu');
 if(sb){const n0=st.calls.filter(c=>c[0]==='oz_variant_set_stock').length;
  const v0=await p.evaluate(()=>document.querySelector('.ozOv #ozSt0').value);
  await p.click('.ozOv .ozStQ:first-of-type [data-a=stQ][data-d="1"]').catch(()=>fails.push('stok + tıklanamadı'));await p.click('.ozOv .ozStQ:first-of-type [data-a=stQ][data-d="1"]').catch(()=>{});
  await p.click('.ozOv .ozStQ:first-of-type [data-a=stQ][data-d="-1"]').catch(()=>fails.push('stok − tıklanamadı'));await p.waitForTimeout(200);
  const v1=await p.evaluate(()=>document.querySelector('.ozOv #ozSt0').value);
  ok(+v1===+v0+1&&st.calls.filter(c=>c[0]==='oz_variant_set_stock').length===n0,'stok −/+ yalnız alanı değiştirir (kayıt yok): '+v0+'→'+v1);
  await p.click('.ozOv [data-a=fbOk]').catch(()=>fails.push('Kaydet tıklanamadı'));await p.waitForTimeout(700);
  const sc=st.calls.filter(c=>c[0]==='oz_variant_set_stock');ok(sc.length===n0+1&&sc[sc.length-1][1].p_stock===+v1,'"Kaydet" mevcut oz_variant_set_stock ile: '+JSON.stringify(sc.slice(n0)))}
 // ürün paneli hatası → "Tekrar dene" aynı ürünü yeniden açar; kapanınca odak açan öğeye döner
 await go('liste');await p.evaluate(()=>{window.__OZ_FX.fail=Object.assign({},window.__OZ_FX.fail,{oz_product_detail:'ağ hatası'})});
 await p.focus('#ozRoot .ozGrs .ozGr[data-pid=p0] .go');await p.keyboard.press('Enter');await p.waitForTimeout(900);
 const er=await p.evaluate(()=>{const b=document.querySelector('.ozOv.ozPdS .ozErrBox button');return b?b.dataset.a+':'+b.dataset.k+':'+b.dataset.id+':'+b.textContent:null});
 ok(er==='nav:product:p0:Tekrar dene','ürün paneli hatasında "Tekrar dene": '+er);
 await p.evaluate(()=>{delete window.__OZ_FX.fail.oz_product_detail});
 if(er){await p.click('.ozOv.ozPdS .ozErrBox button');await p.waitForTimeout(1200)}
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS .ozPName')),'"Tekrar dene" ürünü yükler');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('.ozOv')&&!!document.activeElement&&!!document.activeElement.closest('.ozGr[data-pid=p0]')),'Esc ile kapanınca odak ürün kartına döner');
 // AJ2-D: ürün ızgarası (.ozGrs) — sütun arası 16px, satır arası 20px, kart zemini/gölgesi/kenarlığı yok; foto çerçevesi 18px köşe ve
 // neredeyse görünmez 1px çizgi (sayfa zeminine karşı <1.2), fotoğraf 7px içeride 12px köşe; "+" çerçevenin SAĞ ÜST köşesinde (24px krem daire
 // merkezi köşede, yarısı dışarıda, fotoğrafa binmez, 44×44 dokunma, komşu karta değmez, kırpılmaz); yazı sırası ad → miktar → fiyat (yeşil,
 // kesilmez) → ikincil satır; aynı satırdaki kartlarda fiyat aynı y hizasında; iki tema
 for(const th of ['light','dark']){await setTheme(th);await p.setViewportSize({width:390,height:844});await go('liste');
  const g=await p.evaluate(()=>{const G=document.querySelector('#ozRoot .ozGrs');if(!G)return null;const gs=getComputedStyle(G);const all=[...G.querySelectorAll('.ozGr')];
   const Pc=x=>x.match(/[\d.]+/g).map(Number),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)},Lm=c=>.2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);
   const pg=Pc(getComputedStyle(document.body).backgroundColor);
   const cs=all.map(c=>{const s=getComputedStyle(c),go=getComputedStyle(c.querySelector('.go')),ph=c.querySelector('.ph'),P=ph.getBoundingClientRect(),phs=getComputedStyle(ph),pr=c.querySelector('.pr'),pl=c.querySelector('.ac .ozPlus');
    const Q=pl?pl.getBoundingClientRect():null,sv=pl?pl.querySelector('svg'):null,V=sv?sv.getBoundingClientRect():null,im=ph.querySelector('img')||ph.querySelector('i'),I=im.getBoundingClientRect();
    const k=Pc(phs.borderTopColor),a=k.length>3?k[3]:1,mx=[0,1,2].map(i=>k[i]*a+pg[i]*(1-a)),fr=(Math.max(Lm(mx),Lm(pg))+.05)/(Math.min(Lm(mx),Lm(pg))+.05);
    const R=c.getBoundingClientRect(),nx=all.find(x=>x!==c&&Math.abs(x.getBoundingClientRect().top-R.top)<2&&x.getBoundingClientRect().left>R.left);
    const top=e=>e?Math.round(c.querySelector(e).getBoundingClientRect().top):null;
    return {bg:s.backgroundColor+'|'+go.backgroundColor,sh:s.boxShadow+'|'+go.boxShadow,bw:s.borderTopWidth+'|'+go.borderTopWidth,rad:phs.borderTopLeftRadius+','+phs.borderBottomRightRadius,
     frame:phs.borderTopWidth+'|'+fr.toFixed(2),inset:Math.round(I.left-P.left)+','+getComputedStyle(im).borderTopLeftRadius,
     prC:getComputedStyle(pr.querySelector('b,.uf,.nvp')).color,prFull:pr.scrollWidth<=pr.clientWidth+.5,order:[top('.nm'),top('.nt'),top('.pr'),top('.up')],prTop:top('.pr'),rowTop:Math.round(R.top),
     plus:Q?{w:Math.round(Q.width),h:Math.round(Q.height),vis:Math.round(V.width),bg:getComputedStyle(sv).backgroundColor,ink:getComputedStyle(pl).color,dis:pl.disabled,rad:getComputedStyle(sv).borderTopLeftRadius,
      dx:Math.round(Math.abs((V.left+V.right)/2-P.right)),dy:Math.round(Math.abs((V.top+V.bottom)/2-P.top)),off:Math.hypot((V.left+V.right)/2-(I.right-12),(V.top+V.bottom)/2-(I.top+12))>=V.width/2+12-.5,
      free:nx?Q.right<=nx.getBoundingClientRect().left-.5:Q.right<=innerWidth,top:Math.round(Q.top)}:null}});
   return {cg:gs.columnGap,rg:gs.rowGap,cs}});
  const acc2=th==='light'?'rgb(31, 107, 69)':'rgb(79, 182, 127)';
  ok(g&&g.cg==='12px'&&g.rg==='20px','['+th+'] ızgara sütun arası 12px (D2), satır arası 20px: '+JSON.stringify(g&&[g.cg,g.rg]));
  ok(g&&g.cs.length&&g.cs.every(c=>c.bg==='rgba(0, 0, 0, 0)|rgba(0, 0, 0, 0)'&&c.sh==='none|none'&&c.bw==='0px|0px'),'['+th+'] kart zemini/gölgesi/kenarlığı yok: '+JSON.stringify(g&&g.cs[0]));
  ok(g&&g.cs.every(c=>c.rad==='18px,18px'&&/^1px\|1\.[01]\d$/.test(c.frame)&&c.inset==='8,12px'),'['+th+'] çerçeve 18px köşe, 1px neredeyse görünmez çizgi, fotoğraf 7px içeride 12px köşe: '+JSON.stringify(g&&g.cs.map(c=>[c.rad,c.frame,c.inset])));
  ok(g&&g.cs.every(c=>c.prFull)&&g.cs.filter(c=>c.plus).every(c=>c.prC===acc2),'['+th+'] fiyat kesilmez, orman yeşili: '+JSON.stringify(g&&g.cs.map(c=>[c.prFull,c.prC])));
  ok(g&&g.cs.every(c=>c.order.every((v,i,a)=>i===0||v>a[i-1])),'['+th+'] yazı sırası ad → miktar → fiyat → ikincil satır: '+JSON.stringify(g&&g.cs.map(c=>c.order)));
  const rows={};(g?g.cs:[]).forEach(c=>{(rows[c.rowTop]=rows[c.rowTop]||[]).push(c.prTop)});
  ok(Object.values(rows).every(r=>r.every(v=>v===r[0])),'['+th+'] aynı satırda fiyat aynı y hizasında: '+JSON.stringify(rows));
  const pls=g?g.cs.filter(c=>c.plus).map(c=>c.plus):[];
  /* Paket 2 / Adım 2: telefonda 2 sütunda alttaki sıra ekran dışında/alt menünün altında kalabilir → her "+" önce görünür alana (ortaya) kaydırılır, sonra elementFromPoint ile gerçek tıklanabilirlik denetlenir (aj4 ile aynı yöntem); sonra kaydırma eski yerine döner */
  const hits=await p.evaluate(()=>{const y0=window.scrollY;const r=[...document.querySelectorAll('#ozRoot .ozGrs .ozGr')].map(c=>c.querySelector('.ac .ozPlus')).filter(Boolean).map(pl=>{pl.scrollIntoView({block:'center'});const V=pl.querySelector('svg').getBoundingClientRect(),e=document.elementFromPoint((V.left+V.right)/2,(V.top+V.bottom)/2);return !!e&&pl.contains(e)});window.scrollTo(0,y0);return r});
  ok(hits.length===pls.length,'['+th+'] "+" sayısı tutarlı: '+hits.length+'/'+pls.length);pls.forEach((x,i)=>{x.hit=hits[i]===true});
  await p.waitForTimeout(150);const gTop=await p.evaluate(()=>Math.round(document.querySelector('#ozRoot .ozGrs').getBoundingClientRect().top));
  ok(pls.length&&pls.every(x=>x.w>=44&&x.h>=44&&x.vis===26&&(x.dis?x.bg!=='rgb(242, 193, 78)':x.bg==='rgb(242, 193, 78)'&&x.ink==='rgb(31, 22, 14)')&&x.rad==='50%'&&x.dx<=3&&x.dy<=3&&x.off&&x.free&&x.hit&&x.top>=gTop),'['+th+'] "+" çerçevenin sağ üst köşesinde (AJ2-D3: 26px altın sarısı daire, koyu artı; pasifte gri; yarısı dışarıda, fotoğrafa binmez, komşu karta değmez, kırpılmaz), 44×44: '+JSON.stringify(pls[0]));
 }
 // AJ2-B: sipariş detayı — "Kargo firmasının sayfasında takip et" orman yeşili dolgu + beyaz kalın; "İade talebi oluştur" (.ozRet) kehribar;
 // iki temada AA ≥4.5 (etkin zemin), "Kopyala"dan farklı zemin, "Siparişim elime ulaştı" birincil değil
 const od0=await p.evaluate(()=>{const R=window.__OZ_FX.R,d=R.oz_order_detail,k=JSON.stringify({o:d.order,c:d.can_return,r:d.return});
  d.order=Object.assign({},d.order,{status:'delivered',carrier:'Aras Kargo',tracking_no:'578764456'});d.can_return=true;d.return=null;return k});
 for(const th of ['light','dark']){await setTheme(th);await go('siparis');
  const b=await p.evaluate(()=>{const f=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return {cls:e.className,bg:c.backgroundColor,c:c.color,fw:c.fontWeight,bc:c.borderTopColor}};
   return {ret:f('#ozRoot [data-a=ordReturn]'),trk:f('#ozRoot .ozTrkGo'),cp:f('#ozRoot .ozTrkC .cp')}});
  const acc=th==='light'?'rgb(31, 107, 69)':'rgb(40, 128, 79)',sun=th==='light'?'rgb(138, 90, 0)':'rgb(247, 210, 74)';
  ok(b.trk&&b.trk.bg===acc&&b.trk.c==='rgb(255, 255, 255)'&&+b.trk.fw>=700,'['+th+'] takip düğmesi orman yeşili + beyaz kalın: '+JSON.stringify(b.trk));
  // Paket 19 düzeltme (bilinçli değişiklik): iade/cayma artık sarı dolgulu kutu değil, sönük ikincil bağlantı (zeminsiz, altı çizili); önceden kehribar dolgu
  ok(b.ret&&/\bozRet\b/.test(b.ret.cls)&&b.ret.bg==='rgba(0, 0, 0, 0)'&&b.ret.c!==sun&&b.cp&&b.ret.bg!==b.cp.bg,'['+th+'] iade sönük bağlantı (.ozRet, zeminsiz), Kopyala\'dan ayrı: '+JSON.stringify([b.ret,b.cp&&b.cp.bg]));
  const v=await AA([['iade','#ozRoot [data-a=ordReturn]'],['takip','#ozRoot .ozTrkGo']]);ok(!v.length,'['+th+'] sipariş düğmeleri AA: '+v.join(' | '));
  const rw=await p.evaluate(()=>{const a=document.querySelector('#ozRoot #ozRateC'),b=document.querySelector('#ozRoot .ozTrkC');return a&&b?[Math.round(a.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().width)]:null});
  ok(rw&&rw[0]===rw[1],'['+th+'] "Ürünleri değerlendir" kartı tam genişlik (kargo kartıyla aynı): '+JSON.stringify(rw))}
 await p.evaluate(k=>{const d=window.__OZ_FX.R.oz_order_detail,x=JSON.parse(k);d.order=x.o;d.can_return=x.c;d.return=x.r},od0);
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
