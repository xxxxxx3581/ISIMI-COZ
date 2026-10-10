// Q1-1: üretici sayfası üst vitrin — 390px, sahte veri, sahte zamanlayıcı. Çalıştırma: node tests/oz-ui/q1-vitrin.test.js
// Doğrulanan: kapak yerine yayındaki ürünlerin kapak fotoğrafları kayan şerit; 2 sn'de bir akar, basılı tutunca durur,
// sağ altta "1/2" çipi ve noktalar güncellenir; slayta dokununca o ürünün paneli açılır. Geri düğmesi ve logo yerinde.
// Tek ürün: akış, nokta, çip yok. Ürün yok: eski kapak fotoğrafı.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 async function page(prods){
  const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.clock.install();
  await p.evaluate(pr=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',cover_url:'https://img.test/bal-recel.jpg',logo_url:null,product_count:pr.length,categories:[{slug:'bal',name:'Bal',count:1}]};
   if(pr!==null)R.oz_search_products=pr},prods);
  await enter(p);await p.clock.runFor(1500);
  await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.clock.runFor(1500);
  return {p,st};
 }
 const S=p=>p.evaluate(()=>{const tr=document.getElementById('ozPPS');const cv=document.querySelector('#ozRoot .ozPP .cv');
  return {slides:tr?tr.children.length:0,i:tr&&tr.__oz?tr.__oz.state().i:null,chip:(document.getElementById('ozPPN')||{}).textContent||null,dots:document.querySelectorAll('#ozPPD i').length,
   on:[...document.querySelectorAll('#ozPPD i')].findIndex(x=>x.classList.contains('on')),coverImg:!!(cv&&cv.querySelector(':scope > img')),back:!!(cv&&cv.querySelector('.bk')),logo:!!document.querySelector('#ozRoot .ozPP .hd .lg'),
   pids:tr?[...tr.children].map(x=>x.dataset.pid).join(','):''}});
 const P=(id,img)=>({id,name:'Ürün '+id,image:img,images:img?[img]:[],price_kurus:10000,in_stock:true});
 // çok ürün
 let {p,st}=await page([P('a1','https://img.test/bal-recel.jpg'),P('a2','https://img.test/recel.jpg'),P('a3',null),P('a4','https://img.test/kuru-yemis.jpg')]);
 let s=await S(p);
 ok(s.slides===3&&s.pids==='a1,a2,a4','fotoğraflı yayındaki ürünler slayt olmalı: '+JSON.stringify(s));
 ok(s.chip==='1/3'&&s.dots===3&&s.on===0&&!s.coverImg,'çip 1/3, 3 nokta, kapak yerine şerit: '+JSON.stringify(s));
 ok(s.back&&s.logo,'geri düğmesi ve logo yerinde olmalı');
 await p.clock.runFor(2000+700);s=await S(p);ok(s.i===1&&s.chip==='2/3'&&s.on===1,'2 sn sonra 2. slayt: '+JSON.stringify(s));
 const box=await p.$eval('#ozPPS',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}).catch(()=>null);
 if(!box){fails.push('vitrin şeridi (#ozPPS) yok');await br.close();console.error('q1-vitrin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(6000);s=await S(p);ok(s.i===1,'basılı tutunca durmalı: '+JSON.stringify(s));
 await p.mouse.up();await p.clock.runFor(2000+700);s=await S(p);ok(s.i===2&&s.chip==='3/3','bırakınca akış sürmeli: '+JSON.stringify(s));
 await p.evaluate(()=>{window.__OZ_FX.R.oz_product_detail.id='a4'});
 await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(100);await p.mouse.up();await p.clock.runFor(1500);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')),'slayta dokununca ürün paneli açılmalı');
 ok(st.calls.some(c=>c[0]==='oz_product_detail'&&c[1].p_id==='a4'),'dokunulan slaytın ürünü (a4) açılmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 // tek ürün
 ({p,st}=await page([P('b1','https://img.test/recel.jpg')]));s=await S(p);
 ok(s.slides===1&&s.chip===null&&s.dots===0,'tek üründe çip/nokta yok: '+JSON.stringify(s));
 await p.clock.runFor(6000);s=await S(p);ok(s.i===0,'tek üründe akış yok');await p.context().close();
 // ürün yok
 ({p,st}=await page([]));s=await S(p);ok(s.slides===0&&s.coverImg,'ürün yoksa kapak fotoğrafı kalmalı: '+JSON.stringify(s));await p.context().close();
 await br.close();
 if(fails.length){console.error('q1-vitrin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('q1-vitrin: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('q1-vitrin HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
