// N1-4: satıcı Siparişler ekranı kısayolları — 390px, sahte veri. Çalıştırma: node tests/oz-ui/n1-kisayol.test.js
// Doğrulanan: sayaç kartlarının hemen altında altın çerçeveli, tam genişlik "Ürünlerimi düzenle" kartı ve "N ürün · M yayında";
// dokununca Ürünler sekmesi. Yanında "+ Yeni ürün ekle" doğrudan yeni ürün formunu açar, geri → Ürünler. "Bekleyen iş yok"
// boş durumunda da görünür.
const {chromium,open,enter}=require('./harness.js');
async function run(br,empty,fails){
 const ok=(c,m)=>{if(!c)fails.push('['+(empty?'boş':'siparişli')+'] '+m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||1000);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(e=>{const T=window.__OZ_FX.T;T.oz_products=[{id:'sp1',seller_id:'s1',name:'Zeytinyağı',status:'published',images:[]},{id:'sp2',seller_id:'s1',name:'Bal',status:'hidden',images:[]},{id:'sp3',seller_id:'s1',name:'Reçel',status:'published',images:[]}];
  if(e){window.__OZ_FX.R.oz_seller_orders=[];window.__OZ_FX.R.oz_seller_dashboard.orders={}}},empty);
 await enter(p);await p.waitForTimeout(600);await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{const sp=document.getElementById('ozSP');const cnt=sp.querySelector('.ozSoCnt');const ed=sp.querySelector('.ozSpEdit');const add=sp.querySelector('.ozSpAdd');
  const er=ed&&ed.getBoundingClientRect(),sr=sp.getBoundingClientRect();
  return {after:!!cnt&&!!ed&&cnt.nextElementSibling===ed.parentNode,txt:ed?ed.innerText.replace(/\s+/g,' ').trim():'',full:er?Math.abs(er.width-sr.width)<2:false,border:ed?getComputedStyle(ed).borderTopColor:'',
   add:add?add.innerText.trim():'',empty:/Bekleyen iş yok/.test(sp.innerText)}});
 ok(r.after,'kısayol sayaç kartlarının hemen altında olmalı');
 ok(r.txt==='Ürünlerimi düzenle 3 ürün · 2 yayında ›','kart metni: '+r.txt);
 ok(r.full&&r.border==='rgb(201, 163, 58)','tam genişlik ve altın çerçeve: '+JSON.stringify(r));
 ok(r.add==='+ Yeni ürün ekle','"+ Yeni ürün ekle" kısayolu olmalı: '+r.add);
 if(empty)ok(r.empty,'boş durumda "Bekleyen iş yok" ile birlikte görünmeli');
 const where=()=>p.evaluate(()=>({h1:(document.querySelector('#ozRoot h1')||{}).textContent||'',cur:((document.querySelector('#ozNav .ozNavB[aria-current=page]')||{}).dataset||{}).tab,rows:document.querySelectorAll('#ozSP .ozSpRow').length}));
 await click(p,'#ozSP .ozSpEdit',1300);let w=await where();ok(w.cur==='urunler'&&w.rows===3,'"Ürünlerimi düzenle" Ürünler sekmesini açmalı: '+JSON.stringify(w));
 await click(p,'#ozNav [data-tab=ozet]',1300);
 await click(p,'#ozSP .ozSpAdd',1500);w=await where();ok(/Yeni ürün/.test(w.h1)&&w.cur==='urunler','"+ Yeni ürün ekle" yeni ürün formunu açmalı: '+JSON.stringify(w));
 await p.goBack();await p.waitForTimeout(1300);w=await where();ok(w.cur==='urunler'&&w.rows===3,'yeni üründen geri → Ürünler: '+JSON.stringify(w));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await p.context().close();
}
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];await run(br,false,fails);await run(br,true,fails);await br.close();
 if(fails.length){console.error('n1-kisayol BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('n1-kisayol: tüm kontroller geçti (2 durum)');process.exit(0);
})().catch(e=>{console.error('n1-kisayol HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
