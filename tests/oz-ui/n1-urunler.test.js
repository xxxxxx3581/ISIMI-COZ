// N1-2: satıcı Ürünler sekmesi — 390px, sahte veri. Çalıştırma: node tests/oz-ui/n1-urunler.test.js
// Doğrulanan: en üstte "+ Yeni ürün"; her satırda foto, ad, tek seçenekte fiyat / çok seçenekte "N seçenek", durum etiketi
// (Yayında/Gizli…), belirgin ≥44px "Düzenle". Düzenle → mevcut düzenleme ekranı (o ürün); geri → Ürünler sekmesi, satıcı
// menüsü duruyor. "+ Yeni ürün" → boş form; geri → Ürünler.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T;T.oz_products=[{id:'sp1',seller_id:'s1',name:'Zeytinyağı',status:'published',images:[],category_id:'c1'},{id:'sp2',seller_id:'s1',name:'Çam balı',status:'hidden',images:[],category_id:'c2'},{id:'sp3',seller_id:'s1',name:'Reçel',status:'published',images:[],category_id:'c2'}];
  T.oz_variants=[{id:'a1',product_id:'sp1',label:'3kg',price_kurus:120000,stock:20,is_active:true,sort:0},{id:'a2',product_id:'sp1',label:'5kg',price_kurus:180000,stock:20,is_active:true,sort:1},
   {id:'b1',product_id:'sp2',label:'450 g',price_kurus:30000,stock:5,is_active:true,sort:0},{id:'c1',product_id:'sp3',label:'300gr',price_kurus:20000,stock:9,is_active:true,sort:0},{id:'c2',product_id:'sp3',label:'500gr',price_kurus:30000,stock:9,is_active:true,sort:1},{id:'c3',product_id:'sp3',label:'800gr',price_kurus:50000,stock:9,is_active:true,sort:2}]});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('seller',{tab:'urunler'}));await p.waitForTimeout(1500);
 const rows=await p.evaluate(()=>{const sp=document.getElementById('ozSP');const first=sp&&sp.querySelector('button');
  return {first:first?first.innerText.trim():'',firstNew:!!first&&first.classList.contains('ozSpNew'),rows:[...document.querySelectorAll('#ozSP .ozSpRow')].map(r=>{const e=r.querySelector('.ozSpEd');const er=e&&e.getBoundingClientRect();
   return {id:r.dataset.pid,pic:!!r.querySelector('.ozPic'),name:(r.querySelector('.tx b')||{}).textContent,pr:((r.querySelector('.tx .pr')||{}).textContent||'').replace(/\s+/g,' '),tag:(r.querySelector('.ozTag')||{}).textContent,ed:e?e.innerText.trim():'',edH:er?Math.round(er.height):0,edSun:!!e&&e.classList.contains('sun')}})}});
 ok(rows.firstNew&&rows.first==='+ Yeni ürün','en üstte "+ Yeni ürün" olmalı: '+rows.first);
 const R={};rows.rows.forEach(r=>R[r.id]=r);
 ok(R.sp1&&R.sp1.pic&&R.sp1.name==='Zeytinyağı'&&R.sp1.pr==='2 seçenek'&&R.sp1.tag==='Yayında','çok seçenekli satır: '+JSON.stringify(R.sp1));
 ok(R.sp2&&R.sp2.pr==='300,00 ₺'&&R.sp2.tag==='Gizli','tek seçenekli gizli satır fiyat + Gizli: '+JSON.stringify(R.sp2));
 ok(R.sp3&&R.sp3.pr==='3 seçenek','3 seçenekli satır: '+JSON.stringify(R.sp3));
 ok(rows.rows.length===3&&rows.rows.every(r=>r.ed==='Düzenle'&&r.edH>=44&&r.edSun),'her satırda belirgin ≥44px "Düzenle": '+JSON.stringify(rows.rows.map(r=>[r.ed,r.edH,r.edSun])));
 const state=()=>p.evaluate(()=>({h1:(document.querySelector('#ozRoot h1')||{}).textContent||'',name:(document.querySelector('#ozRoot #pfName, #ozRoot input[data-f=name], #ozRoot input')||{}).value||'',
  nav:(document.getElementById('ozNav')||{dataset:{}}).dataset.mode,on:document.body.classList.contains('ozNavOn'),cur:((document.querySelector('#ozNav .ozNavB[aria-current=page]')||{}).dataset||{}).tab,rows:document.querySelectorAll('#ozSP .ozSpRow').length}));
 await click(p,'#ozSP .ozSpRow[data-pid=sp3] .ozSpEd',1500);let s1=await state();
 ok(/Ürünü düzenle/.test(s1.h1)&&s1.nav==='seller'&&s1.on&&s1.cur==='urunler','Düzenle → düzenleme ekranı, satıcı menüsü Ürünler seçili: '+JSON.stringify(s1));
 ok(st.calls.some(c=>c[0]==='GET oz_products'&&/id=eq\.sp3/.test(c[1])),'düzenleme mevcut ürün okumasıyla (sp3) açılmalı');
 await p.goBack();await p.waitForTimeout(1300);s1=await state();
 ok(s1.rows===3&&s1.nav==='seller'&&s1.on&&s1.cur==='urunler','geri → Ürünler sekmesi: '+JSON.stringify(s1));
 await click(p,'#ozSP .ozSpNew',1500);s1=await state();
 ok(/Yeni ürün/.test(s1.h1)&&s1.nav==='seller'&&s1.cur==='urunler','"+ Yeni ürün" → boş form: '+JSON.stringify(s1));
 await p.goBack();await p.waitForTimeout(1300);s1=await state();
 ok(s1.rows===3&&s1.cur==='urunler','yeni üründen geri → Ürünler: '+JSON.stringify(s1));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('n1-urunler BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('n1-urunler: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('n1-urunler HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
