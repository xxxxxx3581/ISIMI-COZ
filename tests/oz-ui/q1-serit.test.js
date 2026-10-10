// Q1-3: üretici sayfası alt şeritleri — 390px, sahte veri. Çalıştırma: node tests/oz-ui/q1-serit.test.js
// Doğrulanan: "Son baktığın ürünler" yalnız bu üreticinin baktığın ürünleri (en yeni önce, en fazla 10; foto, ad, fiyat ya da
// "N seçenek"); kayıt yalnız localStorage, boşsa şerit yok, localStorage hata verirse sayfa yine açılır. "Müşteri yorumları"
// en yeni önce, en fazla 10; yıldız, ürün adı, tarih, varsa metin; ürün adı ürün panelini açar; yorum yoksa şerit yok.
// İki şerit de kategori ikonlarının altında ve en alta kaydırınca alt menünün üstünde kalır.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 const REV=[{id:'r1',rating:5,comment:'Harika bal.',name:'A. Y.',created_at:'2026-09-01T10:00:00Z',product_name:'Çam balı 1'},{id:'r2',rating:4,comment:null,name:'B. K.',created_at:'2026-10-05T10:00:00Z',product_name:'Çam balı 1'},
  {id:'r3',rating:3,comment:'Geç geldi.',name:'C. D.',created_at:'2026-09-20T10:00:00Z',product_name:'Bilinmeyen ürün'}].concat(Array.from({length:10},(_,i)=>({id:'x'+i,rating:5,comment:'Eski '+i,name:'Z',created_at:'2025-01-0'+((i%9)+1)+'T10:00:00Z',product_name:'Kekik 3'})));
 await p.evaluate(rev=>{localStorage.removeItem('isimi_oz_recent');const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',product_count:6,categories:[{slug:'bal',name:'Bal',count:1}]};R.oz_producer_reviews=[]},REV);
 await enter(p);await p.waitForTimeout(600);
 const goStore=async()=>{await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1500)};
 const S=()=>p.evaluate(()=>{const secs=[...document.querySelectorAll('#ozRoot .ozPP .ozPPx')];const cats=document.querySelector('#ozRoot .ozPPCats');
  const g=t=>secs.find(x=>x.querySelector('h2').textContent===t);const rc=g('Son baktığın ürünler'),rv=g('Müşteri yorumları');
  return {rc:rc?[...rc.querySelectorAll('.ozRcC')].map(c=>c.dataset.id+'|'+c.innerText.replace(/\s+/g,' ').trim()):null,rv:rv?[...rv.querySelectorAll('.ozRvC')].map(c=>c.innerText.replace(/\s+/g,' ').trim()):null,
   rvBtn:rv?rv.querySelectorAll('.pn[data-id]').length:0,below:secs.length?secs.every(x=>cats&&(cats.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_FOLLOWING)):true}});
 await goStore();let s=await S();
 ok(s.rc===null&&s.rv===null,'ilk ziyaret, yorum yok: iki şerit de görünmemeli: '+JSON.stringify(s));
 // ürünlere bak (panel)
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p1';d.name='Çam balı 1'});await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1200);
 await click(p,'.ozGc[data-pid=p1] .sc',1200);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p0';d.name='Erken hasat 0';d.variants=[{id:'k1',label:'1 L',price_kurus:65000,stock:5}]});
 await click(p,'.ozGc[data-pid=p0] .sc',1200);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(rev=>{window.__OZ_FX.R.oz_producer_reviews=rev},REV);
 await goStore();s=await S();
 ok(s.rc&&s.rc.length===2&&/^p0\|(🌿 )?Erken hasat 0 650,00 ₺$/.test(s.rc[0])&&/^p1\|(🌿 )?Çam balı 1 3 seçenek$/.test(s.rc[1]),'son bakılanlar en yeni önce, fiyat ya da N seçenek: '+JSON.stringify(s.rc));
 ok(s.rv&&s.rv.length===10,'yorumlar en fazla 10: '+(s.rv&&s.rv.length));
 ok(s.rv&&/Çam balı 1/.test(s.rv[0])&&/5 Eki 2026|5 Ekim 2026/.test(s.rv[0])&&/Geç geldi\./.test(s.rv[1])&&/Harika bal\./.test(s.rv[2]),'yorumlar en yeni önce, ürün adı, tarih, metin: '+JSON.stringify((s.rv||[]).slice(0,3)));
 ok(s.below,'şeritler kategori ikonlarının altında olmalı');
 const bottom=await p.evaluate(()=>{scrollTo(0,1e6);const nav=document.getElementById('ozNav').getBoundingClientRect();const secs=[...document.querySelectorAll('#ozRoot .ozPP .ozPPx')];if(!secs.length)return {gap:null,none:true};const last=secs[secs.length-1].getBoundingClientRect();return {gap:Math.round(nav.top-last.bottom)}});
 ok(bottom.gap>=8,'en altta şeritler alt menünün üstünde kalmalı: '+JSON.stringify(bottom));
 await p.evaluate(()=>{window.__OZ_FX.R.oz_product_detail.id='p1'});
 await click(p,'#ozRoot .ozRvC .pn[data-id=p1]',1300);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&st.calls.filter(c=>c[0]==='oz_product_detail').pop()[1].p_id==='p1','yorumdaki ürün adı o ürünün panelini açmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // en fazla 10 kayıt
 await p.evaluate(()=>{const l=Array.from({length:12},(_,i)=>({id:'z'+i,name:'Z'+i,image:'',price_kurus:100,nv:1}));localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:l}))});
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1200);await click(p,'.ozGc[data-pid=p1] .sc',1200);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 const n=await p.evaluate(()=>JSON.parse(localStorage.getItem('isimi_oz_recent')).s1.map(x=>x.id));
 ok(n.length===10&&n[0]==='p1','kayıt en fazla 10, en yeni başta: '+JSON.stringify(n));
 // localStorage hata verirse sayfa yine açılır, şerit yok
 await p.evaluate(()=>{Storage.prototype.__g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='isimi_oz_recent')throw new Error('engelli');return this.__g(k)}});
 await goStore();s=await S();ok(s.rc===null&&!!(await p.$('#ozRoot .ozPP .ozPPCats')),'localStorage hatasında sayfa açılmalı, şerit gizli: '+JSON.stringify(s.rc));
 await p.evaluate(()=>{Storage.prototype.getItem=Storage.prototype.__g});
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('q1-serit BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('q1-serit: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('q1-serit HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
