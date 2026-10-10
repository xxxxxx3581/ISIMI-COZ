// V2: Favoriler ekranı "Favori üreticiler" — 390px, sahte veri (RPC sahte). Çalıştırma: node tests/oz-ui/v2-fav-uretici.test.js
// Doğrulanan: ürün favorilerinin üstünde "Favori üreticiler" (oz_my_favorite_sellers): kart başına logo ya da baş harf, ad,
// "il · ilçe", yıldız + yorum sayısı, dolu kırmızı kalp; kahve zemin, ince bronz kenar, AA kontrast. Karta dokunma üretici
// sayfasını açar; kalp onaysız çıkarır, liste anında güncellenir (oz_toggle_favorite_seller), hata olursa geri gelir.
// Boşsa "Henüz favori üreticin yok."; ürün favorileri bölümü (kartlar, ürün boş durumu) aynı; 390px ve büyük yazıda taşma yok.
const {chromium,open,enter}=require('./harness.js');
const SL=[{id:'s1',display_name:'Deneme Çiftliği',slug:'deneme',city:'İzmir',district:'Karabağlar',logo_url:'https://img.test/zeytin-zeytinyagi.jpg',rating_avg:5,rating_count:6,favorited_at:'2026-10-10T10:00:00Z'},
 {id:'s2',display_name:'Ege Kooperatifi Çok Uzun Bir Üretici Adı Örneği Burada',slug:'ege',city:'Muğla',district:null,logo_url:null,rating_avg:0,rating_count:0,favorited_at:'2026-10-09T10:00:00Z'}];
const BIG='html:root .ozFsC .tx b{font-size:22px!important}html:root .ozFsC .tx small,html:root .ozFsC .rt{font-size:18px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const clk=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel)}await p.waitForTimeout(w||600)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(sl=>{const F=window.__OZ_FX;F.R.oz_my_favorites=F.R.oz_search_products.slice(0,2);F.R.oz_my_favorite_sellers=sl;F.R.oz_toggle_favorite_seller=false;
  F.R.oz_producer_detail={id:'s1',display_name:'Deneme Çiftliği',city:'İzmir',product_count:2,categories:[]}},SL);
 await enter(p);await p.waitForTimeout(600);
 const S=()=>p.evaluate(()=>{const sec=document.getElementById('ozFsS');const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2]}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
  const hs=[...document.querySelectorAll('#ozRoot .ozSecH h2')].map(h=>h.textContent);const gc=document.querySelector('#ozRoot .ozGcs');
  return {heads:hs,order:!!sec&&!!gc&&!!(sec.compareDocumentPosition(gc)&Node.DOCUMENT_POSITION_FOLLOWING),empty:sec?((sec.querySelector('.ozFsE')||{}).textContent||null):null,prods:[...document.querySelectorAll('#ozRoot .ozGc')].map(x=>x.dataset.pid).join(','),
   prodEmpty:!!document.querySelector('#ozRoot .ozEmpty, #ozRoot .ozEm')&&/Favorin yok/.test(document.getElementById('ozRoot').innerText),page:document.documentElement.scrollWidth,
   cards:sec?[...sec.querySelectorAll('.ozFsC')].map(c=>{const bg=rgb(getComputedStyle(c).backgroundColor);const r=c.getBoundingClientRect();const h=c.querySelector('[data-a=sFav]');const hr=h&&h.getBoundingClientRect();
    const txt=[...c.querySelectorAll('.tx b,.tx small,.rt,.rt span,.lg i')].filter(e=>e.offsetWidth);const tr=c.querySelector('.tx').getBoundingClientRect();
    return {id:c.dataset.sid,t:c.innerText.replace(/\s+/g,' ').trim(),logo:!!c.querySelector('.lg img'),ini:(c.querySelector('.lg i')||{}).textContent,round:getComputedStyle(c.querySelector('.lg')).borderRadius,
     on:!!h&&h.classList.contains('on'),red:!!h&&(()=>{const k=rgb(getComputedStyle(h).color);return k.r>200&&k.r-k.g>60})(),hw:hr?Math.round(hr.width):0,
     bgL:+lum(bg).toFixed(3),bd:rgb(getComputedStyle(c).borderTopColor),min:Math.min(...txt.map(e=>cr(rgb(getComputedStyle(e).color),bg))),
     inside:r.right<=391&&tr.right<=(hr?hr.left+1:r.right)&&[...c.querySelectorAll('.tx *')].every(e=>e.getBoundingClientRect().right<=tr.right+1)}}):[]}});
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1600);
 let s=await S();
 ok(s.heads[0]==='Favori üreticiler'&&s.order,'"Favori üreticiler" ürün favorilerinin üstünde: '+JSON.stringify(s.heads));
 ok(s.cards.length===2&&s.cards[0].id==='s1'&&s.cards[1].id==='s2','iki üretici kartı, sunucu sırası: '+JSON.stringify(s.cards.map(c=>c.id)));
 const c1=s.cards[0],c2=s.cards[1];
 ok(c1&&c1.logo&&/Deneme Çiftliği/.test(c1.t)&&/İzmir · Karabağlar/.test(c1.t)&&/★ 5,0 \(6 yorum\)/.test(c1.t),'kart 1: logo, ad, il · ilçe, yıldız + yorum: '+JSON.stringify(c1));
 ok(c2&&!c2.logo&&c2.ini==='EK'&&/Muğla/.test(c2.t)&&!/·/.test(c2.t)&&/Henüz yorum yok/.test(c2.t),'kart 2: logo yoksa baş harf, ilçesiz il: '+JSON.stringify(c2));
 ok(s.cards.every(c=>c.round==='50%'&&c.on&&c.red&&c.hw>=44&&c.bgL<0.1&&c.bd.r>c.bd.b+30&&c.min>=4.5&&c.inside),'yuvarlak logo, dolu kırmızı kalp ≥44px, kahve zemin, bronz kenar, AA, taşma yok: '+JSON.stringify(s.cards));
 ok(s.prods==='p0,p1','ürün favorileri aynı (gcCard listesi): '+s.prods);ok(s.page<=390,'390px taşma olmamalı');
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);s=await S();
 ok(s.cards.every(c=>c.inside)&&s.page<=390,'büyük yazıda taşma olmamalı: '+JSON.stringify(s.cards.map(c=>c.inside))+' '+s.page);
 // karta dokunma → üretici sayfası
 await clk(p,'#ozFsS .ozFsC[data-sid=s1] .m',1500);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP'))&&st.calls.some(c=>c[0]==='oz_producer_detail'&&c[1].p_id==='s1'),'karta dokununca s1 üretici sayfası açılmalı');
 ok(await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozPP .cv [data-a=sFav]');return !!b&&b.classList.contains('on')}),'üretici sayfasında kalp dolu (liste önbelleği)');
 await p.goBack();await p.waitForTimeout(1500);
 // kalp ile çıkarma: onaysız, anında
 await p.evaluate(()=>{window.__OZ_FX.R.oz_toggle_favorite_seller=false});
 await clk(p,'#ozFsS .ozFsC[data-sid=s2] [data-a=sFav]',100);
 s=await S();ok(s.cards.length===1&&s.cards[0].id==='s1'&&!(await p.$('.ozOv')),'kalp onaysız çıkarır, liste anında güncellenir: '+JSON.stringify(s.cards.map(c=>c.id)));
 await p.waitForTimeout(500);
 ok(st.calls.some(c=>c[0]==='oz_toggle_favorite_seller'&&c[1].p_seller==='s2'),'oz_toggle_favorite_seller(s2) çağrılmalı');
 // hata → geri gelir
 await p.evaluate(()=>{window.__OZ_FX.fail={oz_toggle_favorite_seller:'ağ hatası'}});
 await clk(p,'#ozFsS .ozFsC[data-sid=s1] [data-a=sFav]',700);s=await S();
 ok(s.cards.length===1&&s.cards[0].id==='s1'&&/Favori güncellenemedi/.test(await p.evaluate(()=>document.body.innerText)),'hata olursa kart geri gelmeli + uyarı: '+JSON.stringify(s.cards.map(c=>c.id)));
 await p.evaluate(()=>{window.__OZ_FX.fail={}});
 await clk(p,'#ozFsS .ozFsC[data-sid=s1] [data-a=sFav]',700);s=await S();
 ok(s.cards.length===0&&s.empty==='Henüz favori üreticin yok.'&&s.prods==='p0,p1','son üretici çıkınca boş metin, ürünler aynı: '+JSON.stringify(s));
 // boş liste + ürün boş durumu aynı
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_my_favorite_sellers=[];R.oz_my_favorites=[];OZ.go('home',{})});await p.waitForTimeout(800);
 await p.evaluate(()=>OZ.go('favs',{}));await p.waitForTimeout(1500);s=await S();
 ok(s.empty==='Henüz favori üreticin yok.'&&s.prodEmpty&&s.prods==='','boş durum: üretici metni + ürün boş durumu aynı: '+JSON.stringify(s));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('v2-fav-uretici BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('v2-fav-uretici: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('v2-fav-uretici HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
