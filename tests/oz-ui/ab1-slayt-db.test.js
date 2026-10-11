// AB1: Keşfet slider'ı satıcı slaytlarını veritabanından okur (oz_home_slides_active, sahte) — 390px. Çalıştırma: node tests/oz-ui/ab1-slayt-db.test.js
// Doğrulanan: 0 kayıt → 3 marka slaytı (sabit test slaytı yok); 1 kayıt → 4 slayt, 4 nokta, "N/4", "Sponsorlu" etiketi; 2 kayıt (biri
// sponsored=false) → etiket yalnız birinde; satıcı okuması hatalı kayıt eklenmez; oz_home_slides_active hatası → 3 slayt, hata mesajı yok;
// sıralama sort_order'a göre; marka slaytları başta ve aynı; dokununca doğru satıcı sayfası; ekleme sırasında görünen slayt değişmez.
const {chromium,open,enter}=require('./harness.js');
const S={a:{id:'sa',display_name:'Ayvalık Zeytin Evi',city:'Balıkesir',district:'Ayvalık'},b:{id:'sb',display_name:'Deneme Çiftliği',city:'İzmir',district:'Karabağlar'},bad:{id:'sx'}};
async function page(br,slides,opt){opt=opt||{};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(([S,slides,opt])=>{const F=window.__OZ_FX,R=F.R;R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve'][i%3]+'.jpg'}));
  if(slides!==null)R.oz_home_slides_active=slides;else F.fail={oz_home_slides_active:'sunucu hatası'};
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){
   if(fn==='oz_home_slides_active'&&opt.delay){await new Promise(r=>setTimeout(r,opt.delay))}
   if(fn==='oz_producer_detail'){window.__ozLog(fn,a);await new Promise(r=>setTimeout(r,20));if(a.p_id==='sx')throw new Error('okunamadı');const d=Object.values(S).find(x=>x.id===a.p_id);return d?Object.assign({logo_url:'https://img.test/zeytin-zeytinyagi.jpg',categories:[]},d):null}
   if(fn==='oz_search_products'&&a.p&&a.p.seller_id){window.__ozLog(fn,a);return R.oz_search_products}
   return o(fn,a)}},[S,slides,opt]);
 await enter(p);await p.waitForTimeout(400);
 /* akışı durdur: bağlantısız marka slaytına kısa dokunuş = duraklat (mevcut davranış) */
 const b=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});await p.mouse.click(b.x,b.y);
 await p.waitForTimeout(opt.wait||1100);return {p,st};
}
const G=p=>p.evaluate(()=>{const tr=document.getElementById('ozHeroT');const sl=tr?[...tr.children]:[];return {n:sl.length,dots:document.querySelectorAll('#ozHeroD i').length,chip:(document.getElementById('ozHeroN')||{}).textContent,
 pids:sl.map(x=>x.dataset.pid||'-').join(','),sp:sl.map(x=>!!x.querySelector('.spt')).join(','),names:sl.map(x=>(x.querySelector('.tx strong')||{}).textContent).join('|'),
 aria:sl.map(x=>x.getAttribute('aria-label')).join(','),err:/hata|Hata/.test((document.querySelector('#ozRoot .ozHero')||{}).innerText||'')||!!document.querySelector('.ozToast.err')}});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const BR='Doğadan sofranıza|Her kavanozda bir hikâye|Güvenilir satıcılar';
 // 0 kayıt
 let {p,st}=await page(br,[]);let g=await G(p);
 ok(g.n===3&&g.dots===3&&g.chip==='1/3'&&g.names===BR&&g.pids==='-,-,-','0 kayıt → yalnız 3 marka slaytı: '+JSON.stringify(g));await p.context().close();
 // 1 kayıt
 ({p,st}=await page(br,[{id:'h1',producer_id:'sb',sponsored:true,sort_order:1}]));g=await G(p);
 ok(g.n===4&&g.dots===4&&g.chip==='1/4'&&g.pids==='-,-,-,sb'&&g.sp==='false,false,false,true'&&g.names===BR+'|Deneme Çiftliği','1 kayıt → 4 slayt, Sponsorlu: '+JSON.stringify(g));
 ok(/4 \/ 4 · Sponsorlu$/.test(g.aria),'slayt etiketleri gerçek sayıya göre: '+g.aria);
 // dokunuş → satıcı sayfası
 await p.evaluate(()=>{const tr=document.getElementById('ozHeroT');tr.style.scrollBehavior='auto';tr.scrollLeft=tr.clientWidth*3});await p.waitForTimeout(300);
 g=await G(p);ok(g.chip==='4/4','kaydırınca 4/4: '+g.chip);
 const box=await p.$eval('#ozHeroT',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/3,y:r.y+r.height/2}});await p.mouse.click(box.x,box.y);await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPP'))&&st.calls.filter(c=>c[0]==='oz_producer_detail').pop()[1].p_id==='sb','dokununca sb satıcı sayfası');
 await p.context().close();
 // 2 kayıt, sıralama, biri sponsored=false
 ({p,st}=await page(br,[{id:'h2',producer_id:'sb',sponsored:true,sort_order:5},{id:'h1',producer_id:'sa',sponsored:false,sort_order:2}]));g=await G(p);
 ok(g.n===5&&g.dots===5&&g.chip==='1/5'&&g.pids==='-,-,-,sa,sb'&&g.sp==='false,false,false,false,true','2 kayıt: sort_order sırası, etiket yalnız sponsorluda: '+JSON.stringify(g));
 ok(st.calls.filter(c=>c[0]==='oz_producer_detail').length===2,'satıcı başına bir okuma');await p.context().close();
 // satıcı okuması hatalı → eklenmez
 ({p,st}=await page(br,[{id:'h1',producer_id:'sx',sponsored:true,sort_order:1},{id:'h2',producer_id:'sa',sponsored:true,sort_order:2}]));g=await G(p);
 ok(g.n===4&&g.pids==='-,-,-,sa'&&!g.err,'okuması hatalı satıcı eklenmez: '+JSON.stringify(g));await p.context().close();
 // liste hatası → 3 slayt, hata yok
 ({p,st}=await page(br,null));g=await G(p);
 ok(g.n===3&&g.chip==='1/3'&&!g.err,'oz_home_slides_active hatası → 3 slayt, hata mesajı yok: '+JSON.stringify(g));ok(!st.errors.length,'sayfa hatası olmamalı');await p.context().close();
 // geç gelen liste: önce 3 slayt, görünen slayt değişmez
 ({p,st}=await page(br,[{id:'h1',producer_id:'sb',sponsored:true,sort_order:1}],{delay:3000,wait:300}));
 g=await G(p);ok(g.n===3,'liste gelmeden 3 marka slaytı çizilmeli: '+g.n);
 await p.evaluate(()=>{const tr=document.getElementById('ozHeroT');tr.style.scrollBehavior='auto';tr.scrollLeft=tr.clientWidth*1});await p.waitForTimeout(100);
 const before=await p.evaluate(()=>document.getElementById('ozHeroT').scrollLeft);await p.waitForTimeout(3200);
 const after=await p.evaluate(()=>({sl:document.getElementById('ozHeroT').scrollLeft,n:document.getElementById('ozHeroT').children.length,chip:document.getElementById('ozHeroN').textContent}));
 ok(after.n===4&&Math.abs(after.sl-before)<2&&/\/4$/.test(after.chip),'slayt sona eklenince görünen slayt değişmemeli: '+JSON.stringify([before,after]));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390px taşma yok');await p.context().close();
 await br.close();
 if(fails.length){console.error('ab1-slayt-db BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ab1-slayt-db: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ab1-slayt-db HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
