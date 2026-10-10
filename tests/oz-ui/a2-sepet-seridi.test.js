// A2 "Sepeti gör" şeridi — 390px, sahte veri (fotoğraflı ürün dahil). Çalıştırma: node tests/oz-ui/a2-sepet-seridi.test.js
// Doğrulanan: sepet boşken şerit yok; liste kartındaki "+" (fotoğraflı kartta da) görünür ve tıklanabilir; ekleyince
// şerit adet + "Sepeti gör" ile alt menünün üstünde çıkar ve "+" adet kontrolüne döner; ürün paneli şeridi örter, kapanınca
// şerit geri gelir; Üreticiler'de şerit var; Sepet sayfasında şerit yok ve eklenen ürün satırı orada.
// (Eski sürüm F8'de kaldırılan Keşfet ürün satırlarına (.ozPRow) bakıyordu; aynı davranış yeni liste kartıyla test ediliyor.)
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 await p.evaluate(()=>{localStorage.removeItem('isimi_oz_cart')});
 await enter(p);await p.waitForTimeout(900);
 const strip=()=>p.evaluate(()=>{const s=document.getElementById('ozCStrip'),n=document.getElementById('ozNav');if(!s)return null;const r=s.getBoundingClientRect();
  const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {t:s.innerText.replace(/\s+/g,' ').trim(),bottom:Math.round(r.bottom),navTop:Math.round(n.getBoundingClientRect().top),onTop:!!top&&s.contains(top)}});
 ok(await strip()===null,'sepet boşken Keşfet\'te şerit olmamalı');

 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(1300);
 const sel='.ozGc[data-pid=p1]';
 const card=await p.evaluate(s=>{const c=document.querySelector(s);if(!c)return null;const img=c.querySelector('.im img');const b=c.querySelector('.ac .ozPlus');const r=b.getBoundingClientRect();
  const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {photo:!!img&&img.complete&&img.naturalWidth>0,plusOnTop:!!top&&b.contains(top)}},sel);
 ok(card&&card.photo,'p1 kartında fotoğraf yüklenmiş olmalı');
 ok(card&&card.plusOnTop,'fotoğraflı kartta "+" en üstte ve tıklanabilir olmalı');
 // "+" örtülüyse sonraki adımlar tıklayamaz: zaman aşımı yerine açık nedenle hemen düş
 if(fails.length){await br.close();console.error('a2 BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 // sahte oz_product_detail tek kayıt döndürür: tıklanan kartın ürünü olsun
 await p.evaluate(()=>{const D=window.__OZ_FX.R.oz_product_detail;D.id='p1';D.name='Çam balı 1'});
 await p.click(sel+' .ac .ozPlus');await p.waitForTimeout(800);
 if(await p.$('.ozOv .ozOpt'))await p.click('.ozOv .ozOpt:not([disabled])');await p.waitForTimeout(600);
 const s1=await strip();
 ok(s1&&/Sepeti gör/.test(s1.t)&&/^1\b/.test(s1.t),'ekleyince şerit "1 … Sepeti gör" göstermeli: '+JSON.stringify(s1));
 ok(s1&&s1.bottom<=s1.navTop,'şerit alt menünün üstünde olmalı');
 ok(s1&&s1.onTop,'şerit görünür (üstü kapalı değil) olmalı');
 ok(await p.evaluate(s=>{const q=document.querySelector(s+' .ac .ozPStep b');return q&&q.textContent==='1'},sel),'kartta "+" adet kontrolüne (1) dönmeli');

 await p.click(sel+' .im .sc');await p.waitForTimeout(1100);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')),'fotoğrafa dokununca ürün paneli açılmalı');
 const s2=await strip();ok(!s2||!s2.onTop,'ürün paneli açıkken şerit panelin üstünde görünmemeli');
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 const s3=await strip();ok(s3&&s3.onTop,'panel kapanınca şerit yeniden görünmeli');

 await p.click('#ozNav [data-k=producers]');await p.waitForTimeout(900);
 ok(!!(await strip()),'Üreticiler\'de şerit olmalı');
 await p.click('#ozNav [data-k=cart]');await p.waitForTimeout(1100);
 ok(await strip()===null,'Sepet sayfasında şerit olmamalı');
 ok(await p.evaluate(()=>document.querySelectorAll('#ozRoot .ozCoG2 .ozCoL').length>0),'sepette eklenen ürün satırı olmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('a2 BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('a2 sepet şeridi: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('a2 HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
