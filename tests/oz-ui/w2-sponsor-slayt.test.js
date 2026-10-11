// W2: Keşfet hero slider'ına TEST "Sponsorlu" satıcı slaytı (Deneme Çiftliği) — 390px, sahte veri, sahte zamanlayıcı.
// Çalıştırma: node tests/oz-ui/w2-sponsor-slayt.test.js
// Doğrulanan: 4 slayt; noktalar 4 ve "1/4" çip, akışla "4/4"e kadar doğru sayar; ilk 3 slayt aynı (başlık, metin, foto, bağlantısız);
// 4. slayt: satıcı logosu, ad, "İzmir · Karabağlar", "✓ Onaylı satıcı", "Ürünlerini keşfet", ürün fotoğrafları, okunur "Sponsorlu";
// kısa dokunuş satıcı sayfasını (oz_producer_detail, Deneme Çiftliği kimliği) açar.
const {chromium,open,enter}=require('./harness.js');
const SID='41876174-05d7-421c-bac1-f2e8272d19e2';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.clock.install();
 await p.evaluate(sid=>{const R=window.__OZ_FX.R;R.oz_home_slides_active=[{id:'h1',producer_id:sid,sponsored:true,sort_order:1}];/* AB1: satıcı slaytı veritabanından (sahte) */R.oz_producer_detail={id:sid,display_name:'Deneme Çiftliği',city:'İzmir',district:'Karabağlar',logo_url:'https://img.test/zeytin-zeytinyagi.jpg',product_count:4,categories:[]};
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve','kuru-yemis','icecekler','tursu-konserve'][i%6]+'.jpg'}))},SID);
 await enter(p);await p.clock.runFor(1500);
 const S=()=>p.evaluate(()=>{const tr=document.getElementById('ozHeroT');const sl=tr?[...tr.children]:[];
  return {n:sl.length,chip:(document.getElementById('ozHeroN')||{}).textContent,dots:document.querySelectorAll('#ozHeroD i').length,on:[...document.querySelectorAll('#ozHeroD i')].findIndex(x=>x.classList.contains('on')),
   slides:sl.map(s=>({pid:s.dataset.pid||null,t:(s.querySelector('.tx strong')||{}).textContent,s:(s.querySelector('.tx small')||{}).textContent,imgs:[...s.querySelectorAll('.ph img')].map(i=>i.getAttribute('src').split('/').pop()),
    tc:[...s.querySelectorAll('.tc span')].map(x=>x.textContent),sp:(s.querySelector('.spt')||{}).textContent||null,spFs:s.querySelector('.spt')?parseFloat(getComputedStyle(s.querySelector('.spt')).fontSize):0,
    spW:s.querySelector('.spt')?s.querySelector('.spt').getBoundingClientRect().width:0,logo:!!s.querySelector('.slg img'),cls:s.className}))}});
 let s=await S();
 ok(s.n===4&&s.dots===4&&s.chip==='1/4'&&s.on===0,'4 slayt, 4 nokta, "1/4": '+JSON.stringify({n:s.n,dots:s.dots,chip:s.chip,on:s.on}));
 const OLD=[['Doğadan sofranıza','Üreticiden doğrudan kapına.','bal-recel.jpg,kuruyemis-meyve.jpg,recel.jpg'],['Her kavanozda bir hikâye','Anadolu\'nun köylerinden el emeği ürünler.','recel.jpg,tursu-konserve.jpg,el-emegi.jpg'],['Güvenilir satıcılar','Başvurusu incelenen, onaylı satıcılardan.','kuru-yemis.jpg,baharat-bitki-cay.jpg,bitki-cayi.jpg']];
 OLD.forEach((o,i)=>{const x=s.slides[i]||{};ok(x.t===o[0]&&x.s===o[1]&&x.imgs.join(',')===o[2]&&!x.pid&&!x.sp&&x.tc.join('|')==='✓ Onaylı satıcı|🚚 Kapına kargo|🔒 Güvenli ödeme','slayt '+(i+1)+' aynı kalmalı: '+JSON.stringify(x))});
 const z=s.slides[3]||{};
 ok(z.pid===SID&&z.t==='Deneme Çiftliği'&&z.s==='İzmir · Karabağlar'&&z.logo,'4. slayt satıcı kimliği, ad, il · ilçe, logo: '+JSON.stringify(z));
 ok(z.tc&&z.tc.join('|')==='✓ Onaylı satıcı|Ürünlerini keşfet ›','4. slayt "Onaylı satıcı" + "Ürünlerini keşfet": '+JSON.stringify(z.tc));
 ok(z.imgs&&z.imgs.length>=2&&z.imgs.length<=3&&z.imgs.join(',')==='recel.jpg,bal-recel.jpg,konserve.jpg','4. slayt 2-3 ürün fotoğrafı: '+JSON.stringify(z.imgs));
 ok(z.sp==='Sponsorlu'&&z.spFs>=10&&z.spW>20,'"Sponsorlu" etiketi görünür: '+JSON.stringify([z.sp,z.spFs,z.spW]));
 ok(st.calls.some(c=>c[0]==='oz_producer_detail'&&c[1].p_id===SID),'satıcı bilgisi mevcut okumayla (oz_producer_detail) gelmeli');
 // akış: 4/4'e kadar sayım
 const seen=new Set([s.chip]);for(let i=0;i<14&&!seen.has('4/4');i++){await p.clock.runFor(1000);seen.add((await S()).chip)}
 s=await S();ok(['2/4','3/4','4/4'].every(x=>seen.has(x))&&s.chip==='4/4'&&s.on===3,'akış 4/4\'e kadar doğru saymalı: '+JSON.stringify([...seen])+' on='+s.on);
 await p.clock.runFor(700);
 // kısa dokunuş → satıcı sayfası
 const box=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});
 await p.mouse.move(box.x,box.y);await p.mouse.down();await p.clock.runFor(80);await p.mouse.up();await p.clock.runFor(1600);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP')),'Sponsorlu slayta dokununca satıcı sayfası açılmalı');
 ok(st.calls.filter(c=>c[0]==='oz_producer_detail'&&c[1].p_id===SID).length>=2,'satıcı sayfası Deneme Çiftliği kimliğiyle açılmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('w2-sponsor-slayt BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('w2-sponsor-slayt: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('w2-sponsor-slayt HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
