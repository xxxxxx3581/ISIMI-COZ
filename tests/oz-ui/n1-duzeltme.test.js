// N1-5: küçük düzeltmeler — 390px, sahte veri. Çalıştırma: node tests/oz-ui/n1-duzeltme.test.js
// Doğrulanan: (1) Sorular ekranı başlığı üst çubuğun altında tam görünür, "Sorular" başlığı boşlukla gelir; uzun Mağaza
// sekmesinde aşağı kaydırıp Sorular'a geçince de. (2) Yorum kartında yorum metni gösterilir. (3) Ürün formunda net miktar
// birimsiz ("800") kaydedilemez, birim seçilince "800 gr" olarak mevcut kaydetme çağrısına gider.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||1000);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T;const S=window.__OZ_FX.R.oz_public_settings;S.market_enabled=true;S.is_admin=false;
  T.oz_products=[{id:'sp1',seller_id:'s1',name:'Reçel',status:'published',images:['https://img.test/recel.jpg'],category_id:'c2',description:'Ev yapımı',net_content:'800',allergens:[]}];
  T.oz_variants=[{id:'v1',product_id:'sp1',label:'800gr',price_kurus:50000,compare_at_kurus:null,stock:20,weight_g:900,sku:null,is_active:true,sort:0}];
  T.oz_questions=[];T.oz_reviews=[{id:'r1',product_id:'sp1',rating:4,comment:'Tadı çok güzel, kavanoz sağlam geldi.',seller_reply:null,created_at:'2026-10-01T10:00:00Z'},{id:'r2',product_id:'sp1',rating:5,comment:null,seller_reply:null,created_at:'2026-10-02T10:00:00Z'}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('seller',{tab:'magaza'}));await p.waitForTimeout(1500);
 await p.evaluate(()=>scrollTo(0,99999));await p.waitForTimeout(300);
 await click(p,'#ozNav [data-tab=sorular]',1500);
 const q=await p.evaluate(()=>{const top=document.getElementById('ozTop').getBoundingClientRect().bottom;const h1=document.querySelector('#ozRoot h1');const sq=document.querySelector('#ozSP .ozSecH h2');const r1=h1.getBoundingClientRect(),r2=sq.getBoundingClientRect();
  return {y:Math.round(scrollY),gap:Math.round(r1.top-top),h1:h1.textContent,sq:sq.textContent,secGap:Math.round(r2.top-r1.bottom),noQ:/Soru yok\./.test(document.getElementById('ozSP').innerText),rev:document.getElementById('ozSP').innerText}});
 ok(q.y===0&&q.gap>=8&&q.h1==='Sorular ve yorumlar','başlık üst çubuğun altında tam görünmeli (kaydırma sıfırlanır): '+JSON.stringify({y:q.y,gap:q.gap,h1:q.h1}));
 ok(q.sq==='Sorular'&&q.secGap>=24&&q.noQ,'"Sorular" başlığı boşlukla, altında "Soru yok.": '+JSON.stringify({sq:q.sq,secGap:q.secGap}));
 ok(/Tadı çok güzel, kavanoz sağlam geldi\./.test(q.rev),'yorum kartında yorum metni görünmeli');
 // ürün formu: birimsiz miktar
 await click(p,'#ozNav [data-tab=urunler]',1300);await click(p,'#ozSP .ozSpRow[data-pid=sp1] .ozSpEd',1800);
 const f0=await p.evaluate(()=>({n:(document.getElementById('ozP_net_n')||{}).value,u:(document.getElementById('ozP_net_u')||{}).value,opts:[...((document.getElementById('ozP_net_u')||{}).options||[])].map(o=>o.value).join(',')}));
 ok(f0.n==='800'&&f0.u===''&&f0.opts===',gr,kg,ml,lt,adet','net miktar sayı + birim seçimi (gr, kg, ml, lt, adet) yan yana: '+JSON.stringify(f0));
 await click(p,'#ozRoot [data-a=prodSave]:not([data-sub])',900);
 const e1=await p.evaluate(()=>{const e=document.getElementById('ozPErr');return e&&!e.hidden?e.textContent:''});
 ok(/birim seç/.test(e1)&&!st.calls.some(c=>c[0]==='oz_product_save'),'birimsiz kayıt engellenmeli: '+e1);
 try{await p.selectOption('#ozP_net_u','gr',{timeout:3000})}catch(e){fails.push('birim seçilemedi (#ozP_net_u yok)')}await click(p,'#ozRoot [data-a=prodSave]:not([data-sub])',1200);
 const sv=st.calls.find(c=>c[0]==='oz_product_save');
 ok(sv&&sv[1].p&&sv[1].p.net_content==='800 gr','birim seçilince "800 gr" kaydedilmeli: '+JSON.stringify(sv&&sv[1].p&&sv[1].p.net_content));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('n1-duzeltme BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('n1-duzeltme: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('n1-duzeltme HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
