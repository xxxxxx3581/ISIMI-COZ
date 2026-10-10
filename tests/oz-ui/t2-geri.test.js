// T2: üretici sayfası fotoğraf üstü geri oku kaldırıldı — 390px, sahte veri. Çalıştırma: node tests/oz-ui/t2-geri.test.js
// Doğrulanan: üretici sayfasında fotoğraf/slider üstünde geri oku yok (slaytlı ve kapak fotoğraflı durumda); üst çubuktaki "<"
// bir adım geri götürür (Keşfet → üretici → Keşfet; Üreticiler → üretici → Üreticiler); telefon geri tuşu (history.back) aynı.
// Satıcı paneli ana ekranında da fotoğraf üstü geri oku yok.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||1300);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{window.__OZ_FX.R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',cover_url:'https://img.test/bal-recel.jpg',product_count:2,categories:[{slug:'bal',name:'Bal',count:1}]}});
 await enter(p);await p.waitForTimeout(1200);
 const where=()=>p.evaluate(()=>document.querySelector('#ozRoot .ozPP')?'store':document.querySelector('#ozRoot .ozHero')?'home':document.querySelector('#ozRoot .ozPrd2')&&!document.querySelector('#ozRoot .ozHero')?'producers':'?');
 const photoBack=()=>p.evaluate(()=>{const cv=document.querySelector('#ozRoot .ozPP .cv');return {cv:!!cv,bk:!!(cv&&cv.querySelector('button[data-a=back],.bk')),top:!!document.querySelector('#ozTop [data-a=back]')}});
 // Keşfet → üretici kartı
 ok(await where()==='home','başlangıç Keşfet');
 await click(p,'#ozRoot .ozPrd2[data-id=s1]');ok(await where()==='store','Keşfet kartından üretici sayfası açılmalı');
 let b=await photoBack();ok(b.cv&&!b.bk&&b.top,'slaytlı üretici sayfasında fotoğraf üstü ok olmamalı, üst çubukta geri olmalı: '+JSON.stringify(b));
 await click(p,'#ozTop [data-a=back]');ok(await where()==='home','üst çubuk "<" Keşfet\'e dönmeli: '+await where());
 // telefon geri tuşu
 await click(p,'#ozRoot .ozPrd2[data-id=s1]');ok(await where()==='store','tekrar üretici sayfası');
 await p.goBack();await p.waitForTimeout(1300);ok(await where()==='home','telefon geri tuşu Keşfet\'e dönmeli: '+await where());
 // Üreticiler → üretici → geri
 await p.evaluate(()=>OZ.go('producers',{}));await p.waitForTimeout(1300);
 await click(p,'#ozRoot .ozPrd2[data-id=s1]');ok(await where()==='store','Üreticiler\'den üretici sayfası');
 await click(p,'#ozTop [data-a=back]');ok(await where()==='producers','üst çubuk "<" Üreticiler\'e dönmeli: '+await where());
 await click(p,'#ozRoot .ozPrd2[data-id=s1]');await p.goBack();await p.waitForTimeout(1300);ok(await where()==='producers','telefon geri tuşu Üreticiler\'e dönmeli: '+await where());
 // kapak fotoğraflı (ürünsüz) durum
 await p.evaluate(()=>{window.__OZ_FX.R.oz_search_products=[]});await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1500);
 b=await photoBack();ok(b.cv&&!b.bk,'kapak fotoğraflı üretici sayfasında da fotoğraf üstü ok olmamalı: '+JSON.stringify(b));
 // satıcı paneli ana ekranı
 await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1800);
 ok(await p.evaluate(()=>![...document.querySelectorAll('#ozRoot button[data-a=back]')].some(x=>{const pa=x.parentElement;return !!pa.querySelector('img')||/cv|cover|hero/i.test(pa.className)})),'satıcı paneli ana ekranında fotoğraf üstü geri oku olmamalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('t2-geri BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('t2-geri: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('t2-geri HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
