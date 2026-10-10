// S3: Keşfet ilk ekran — sahte veri, müşteri görünümü. Çalıştırma: node tests/oz-ui/s3-kesfet.test.js
// Senaryolar: (a) 390x700 = telefonda tarayıcı adres çubuğu açıkken 390x844 ekranın görünür alanı (ekran görüntüsündeki durum);
// (b) 390x844, aktif sipariş bandı ("Siparişini izle") varken. İkisinde de ilk ekranda, alt menünün üstünde "Üreticiler"
// başlığı tam ve ilk üretici kartının en az 60px'i (logo + ad) görünür. Ayrıca: arama + "Ara" tek ince satır (≤44px),
// hero ≈1/3 kısa (≤150px) ve slider aynı (3 slayt, sayaç), kategori ikonları küçük (≤64px), "Tümünü gör" başlıkla aynı satırda.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];
 for(const [nm,h,band] of [['390x700 (adres çubuğu açık)',700,false],['390x844 + sipariş bandı',844,true]]){
  const ok=(c,m)=>{if(!c)fails.push('['+nm+'] '+m)};
  const {p,st}=await open(br,{w:390,h,visible:true,fx:{orderStatus:'shipped'}});
  await p.evaluate(b=>{const S=window.__OZ_FX.R.oz_public_settings;S.market_enabled=true;S.is_admin=false;if(!b)window.__OZ_FX.R.oz_my_orders=[]},band);
  await enter(p);await p.waitForTimeout(1300);
  const g=await p.evaluate(()=>{const R=s=>{const e=typeof s==='string'?document.querySelector(s):s;if(!e)return null;const r=e.getBoundingClientRect();return {t:Math.round(r.top),b:Math.round(r.bottom),h:Math.round(r.height)}};
   const heads=[...document.querySelectorAll('#ozRoot .ozSecH')];const hd=t=>heads.find(x=>x.querySelector('h2').textContent===t);
   const pr=hd('Üreticiler'),kt=hd('Kategoriler');const kl=kt&&kt.querySelector('.ozLink');
   return {scroll:Math.round(scrollY),nav:R('#ozNav'),band:!!document.querySelector('#ozRoot .ozOBand'),pr:pr?R(pr.querySelector('h2')):null,card:R('#ozRoot .ozPrds3 .ozPrd2'),
    inp:R('#ozRoot .ozSearch .ozIn'),btn:R('#ozRoot .ozSearch .ozBtn'),hero:R('#ozRoot .ozHs'),slides:document.querySelectorAll('#ozHeroT .ozHs').length,chip:(document.getElementById('ozHeroN')||{}).textContent,
    cat:R('#ozRoot .ozCts .ozCt .b'),kt:kt?R(kt.querySelector('h2')):null,kl:kl?R(kl):null}});
  ok(g.scroll===0,'ilk ekran (kaydırma yok)');
  if(h===844)ok(g.band,'sipariş bandı görünmeli');
  ok(g.pr&&g.pr.b<=g.nav.t,'"Üreticiler" başlığı alt menünün üstünde tam görünmeli: '+JSON.stringify({pr:g.pr,nav:g.nav}));
  ok(g.card&&g.nav.t-g.card.t>=60,'ilk üretici kartının en az 60px\'i görünmeli: '+JSON.stringify({card:g.card,nav:g.nav}));
  ok(g.inp&&g.btn&&Math.abs(g.inp.t-g.btn.t)<=2&&g.inp.h<=44&&g.btn.h<=44,'arama + Ara tek ince satır: '+JSON.stringify({inp:g.inp,btn:g.btn}));
  ok(g.hero&&g.hero.h<=150&&g.slides===3&&g.chip==='1/3','hero ≈1/3 kısa, slider aynı: '+JSON.stringify({hero:g.hero,slides:g.slides,chip:g.chip}));
  ok(g.cat&&g.cat.h<=64,'kategori ikonları küçük: '+JSON.stringify(g.cat));
  ok(g.kt&&g.kl&&g.kl.t<g.kt.b&&g.kl.b>g.kt.t,'"Tümünü gör" başlıkla aynı satırda: '+JSON.stringify({kt:g.kt,kl:g.kl}));
  ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
  await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('s3-kesfet BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('s3-kesfet: tüm kontroller geçti (2 senaryo)');process.exit(0);
})().catch(e=>{console.error('s3-kesfet HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
