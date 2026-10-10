// R4: satıcı "Sorular ve yorumlar" → yorumlar yalnız okunmamışlar (seller_read_at boş) — 390px, sahte veri (RPC sahte).
// Çalıştırma: node tests/oz-ui/r4-okundu.test.js
// Doğrulanan: liste ve "N yanıtsız" yalnız seller_read_at boş yorumlar; "Tümünü okundu say" + altında "Müşteriler yorumları görmeye
// devam eder."; onay penceresi; Vazgeç → RPC yok; onay → oz_reviews_mark_all_read, liste ve sayı boş; sonra gelen yeni yorum görünür.
// Müşteri tarafı (ürün paneli, üretici sayfası yorum şeridi) seller_read_at dolu yorumları aynen gösterir.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||700);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const F=window.__OZ_FX,T=F.T;T.oz_products=[{id:'sp1',seller_id:'s1',name:'Reçel',status:'published',images:[]}];T.oz_questions=[];
  T.oz_reviews=[{id:'r1',product_id:'sp1',rating:4,comment:'Okunmamış yorum.',seller_reply:null,seller_read_at:null,created_at:'2026-10-02T10:00:00Z'},
   {id:'r2',product_id:'sp1',rating:5,comment:'Önceden okunmuş.',seller_reply:null,seller_read_at:'2026-10-03T10:00:00Z',created_at:'2026-10-01T10:00:00Z'},
   {id:'r3',product_id:'sp1',rating:3,comment:'Yanıtlanmış.',seller_reply:'Sağ olun.',seller_read_at:null,created_at:'2026-10-01T09:00:00Z'}];
  F.R.oz_reviews_mark_all_read=2;
  /* sahte sunucu: okundu say → bu satıcının tüm yorumlarına seller_read_at yazılır (yalnız sahte tabloda) */
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){const r=await o(fn,a);if(fn==='oz_reviews_mark_all_read')T.oz_reviews.forEach(x=>{if(x.seller_read_at==null)x.seller_read_at='2026-10-10T10:00:00Z'});return r}});
 await enter(p);await p.waitForTimeout(600);
 const S=()=>p.evaluate(()=>{const sp=document.getElementById('ozSP');const hs=[...sp.querySelectorAll('.ozSecH')];const rh=hs.find(h=>/Yorumlar/.test(h.innerText));
  const after=[];let n=rh&&rh.nextElementSibling;while(n&&!n.classList.contains('ozSecH')){after.push(n);n=n.nextElementSibling}
  const b=document.getElementById('ozSqN');
  return {cnt:rh?rh.innerText.replace(/\s+/g,' ').trim():null,cards:after.flatMap(x=>[...x.querySelectorAll('.ozCard p')].map(q=>q.textContent)),
   btn:(sp.querySelector('[data-a=rvReadAll]')||{}).textContent||null,note:((sp.querySelector('.ozSpClr small')||{}).textContent)||null,empty:after.some(x=>/Değerlendirme yok/.test(x.textContent)),badge:b&&!b.hidden?b.textContent:null,wide:document.documentElement.scrollWidth}});
 const calls=()=>st.calls.filter(c=>c[0]==='oz_reviews_mark_all_read').length;
 const goTab=async()=>{await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(900);await p.evaluate(()=>OZ.go('seller',{tab:'sorular'}));await p.waitForTimeout(1500)};
 await goTab();let s=await S();
 ok(s.cards.join('|')==='Okunmamış yorum.|Yanıtlanmış.','yalnız okunmamış yorumlar listelenmeli: '+JSON.stringify(s.cards));
 ok(s.cnt==='Yorumlar 1 yanıtsız'&&s.badge==='1','"1 yanıtsız" ve rozet 1 (okunmuş yorum sayılmaz): '+JSON.stringify([s.cnt,s.badge]));
 ok(s.btn==='Tümünü okundu say'&&s.note==='Müşteriler yorumları görmeye devam eder.','düğme ve alt not: '+JSON.stringify([s.btn,s.note]));
 ok(st.calls.some(c=>c[0]==='GET oz_reviews'&&/seller_read_at=is\.null/.test(c[1])),'okuma yalnız seller_read_at boş yorumları istemeli');
 ok(s.wide<=390,'390px taşma olmamalı: '+s.wide);
 // müşteri tarafı (önce): ürün paneli metni
 const cust=async()=>{await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1200);await click(p,'.ozGc[data-pid=p0] .sc',1300);
  await click(p,'.ozOv.ozPdS [data-a=pdRev]',900);
  const t=await p.evaluate(()=>{const o=[...document.querySelectorAll('.ozOv')].pop();return o?o.innerText:null});await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla',product_count:1,categories:[]};OZ.go('store',{id:'s1'})});await p.waitForTimeout(1500);
  const v=await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozRvC')].map(c=>c.innerText.replace(/\s+/g,' ').trim()).join('|'));return {t,v}};
 await p.evaluate(()=>{window.__OZ_FX.R.oz_producer_reviews=[{id:'r1',rating:4,comment:'Okunmamış yorum.',name:'A',created_at:'2026-10-02T10:00:00Z',product_name:'Reçel',product_id:'p0',seller_read_at:null}]});
 const c0=await cust();
 // Vazgeç → RPC yok
 await goTab();await click(p,'#ozSP [data-a=rvReadAll]');
 ok(await p.evaluate(()=>{const o=document.querySelector('.ozOv');return !!o&&/Müşteriler yorumları görmeye devam eder\./.test(o.innerText)}),'onay penceresinde not olmalı');
 await click(p,'.ozOv [data-a=cbNo]');ok(calls()===0,'Vazgeç → RPC çağrılmamalı: '+calls());
 s=await S();ok(s.cards.length===2,'Vazgeç → liste aynı kalmalı');
 // Onay → RPC, liste ve sayı boş
 await click(p,'#ozSP [data-a=rvReadAll]');await click(p,'.ozOv [data-a=cbYes]',1500);s=await S();
 ok(calls()===1,'onay → oz_reviews_mark_all_read bir kez: '+calls());
 ok(s.cards.length===0&&s.empty&&s.cnt==='Yorumlar 0 yanıtsız'&&!s.btn,'onaydan sonra liste ve sayı boş, düğme yok: '+JSON.stringify(s));
 ok(s.badge===null,'rozet kalkmalı: '+s.badge);
 // müşteri tarafı (sonra): sunucuda seller_read_at dolu; müşteri görünümü aynı
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_producer_reviews.forEach(x=>x.seller_read_at='2026-10-10T10:00:00Z');R.oz_product_detail.reviews.forEach(x=>x.seller_read_at='2026-10-10T10:00:00Z')});
 const c1=await cust();
 ok(c0.t&&c0.t===c1.t&&/Kargo biraz gecikti\./.test(c1.t),'müşteri ürün paneli değişmemeli: '+JSON.stringify([c0.t,c1.t]));
 ok(c0.v&&c0.v===c1.v&&/Okunmamış yorum\./.test(c1.v),'müşteri üretici yorum şeridi değişmemeli: '+JSON.stringify([c0.v,c1.v]));
 // yeni yorum görünür
 await p.evaluate(()=>{window.__OZ_FX.T.oz_reviews.push({id:'r4',product_id:'sp1',rating:5,comment:'Yeni gelen.',seller_reply:null,seller_read_at:null,created_at:'2026-10-10T12:00:00Z'})});
 await goTab();s=await S();
 ok(s.cards.join('|')==='Yeni gelen.'&&s.cnt==='Yorumlar 1 yanıtsız'&&s.badge==='1','yeni yorum görünmeli: '+JSON.stringify(s));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('r4-okundu BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('r4-okundu: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('r4-okundu HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
