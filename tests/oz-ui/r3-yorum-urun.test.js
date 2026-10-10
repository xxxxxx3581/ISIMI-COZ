// R3: üretici sayfası "Müşteri yorumları" şeridinde ürün adı yorumun product_id'siyle açılır — 390px, sahte veri.
// Çalıştırma: node tests/oz-ui/r3-yorum-urun.test.js
// Doğrulanan: aynı adlı iki üründe (p1, p5) her yorum KENDİ ürününün panelini açar (ad eşleştirme yok); product_id null (eski veri)
// ise ad dokunulamaz; ürün son ürünler listesinde olmasa da product_id varsa açılır.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',product_count:3,categories:[{slug:'bal',name:'Bal',count:3}]};
  const P=(id,name)=>({id,name,image:null,images:[],price_kurus:10000,in_stock:true});
  R.oz_search_products=[P('p1','Çam balı'),P('p5','Çam balı')];
  R.oz_producer_reviews=[{id:'r1',rating:5,comment:'Birinci',name:'A',created_at:'2026-10-05T10:00:00Z',product_name:'Çam balı',product_id:'p1'},
   {id:'r2',rating:4,comment:'İkinci',name:'B',created_at:'2026-10-04T10:00:00Z',product_name:'Çam balı',product_id:'p5'},
   {id:'r3',rating:3,comment:'Eski veri',name:'C',created_at:'2026-10-03T10:00:00Z',product_name:'Çam balı',product_id:null},
   {id:'r4',rating:5,comment:'Listede yok',name:'D',created_at:'2026-10-02T10:00:00Z',product_name:'Kekik',product_id:'p9'}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 const cards=await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozRvC')].map(c=>{const b=c.querySelector('.pn');return {t:(c.querySelector('p')||{}).textContent,tag:b?b.tagName:null,id:b?b.dataset.id||null:null}}));
 const C={};cards.forEach(c=>C[c.t]=c);
 ok(C['Birinci']&&C['Birinci'].tag==='BUTTON'&&C['Birinci'].id==='p1','1. yorum p1 bağlantılı olmalı: '+JSON.stringify(C['Birinci']));
 ok(C['İkinci']&&C['İkinci'].tag==='BUTTON'&&C['İkinci'].id==='p5','2. yorum p5 bağlantılı olmalı: '+JSON.stringify(C['İkinci']));
 ok(C['Eski veri']&&C['Eski veri'].tag==='SPAN'&&!C['Eski veri'].id,'product_id yoksa ad dokunulamaz olmalı: '+JSON.stringify(C['Eski veri']));
 ok(C['Listede yok']&&C['Listede yok'].tag==='BUTTON'&&C['Listede yok'].id==='p9','listede olmayan ürün de product_id ile açılmalı: '+JSON.stringify(C['Listede yok']));
 const openRev=async(txt,pid)=>{await p.evaluate(id=>{window.__OZ_FX.R.oz_product_detail.id=id},pid);
  const ok1=await p.evaluate(t=>{const c=[...document.querySelectorAll('#ozRoot .ozRvC')].find(x=>(x.querySelector('p')||{}).textContent===t);const b=c&&c.querySelector('button.pn');if(!b)return false;b.click();return true},txt);
  if(!ok1){fails.push('"'+txt+'" yorumunda dokunulacak ürün adı yok');return}
  await p.waitForTimeout(1300);const last=st.calls.filter(c=>c[0]==='oz_product_detail').pop();
  ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&last&&last[1].p_id===pid,'"'+txt+'" → '+pid+' paneli açılmalı: '+JSON.stringify(last&&last[1]));
  await p.keyboard.press('Escape');await p.waitForTimeout(400)};
 await openRev('Birinci','p1');await openRev('İkinci','p5');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('r3-yorum-urun BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('r3-yorum-urun: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('r3-yorum-urun HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
