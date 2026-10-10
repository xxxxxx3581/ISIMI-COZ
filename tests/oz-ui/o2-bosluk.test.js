// O2: kesilme düzeltmeleri — 390x700, sahte veri. Çalıştırma: node tests/oz-ui/o2-bosluk.test.js
// Telefonda büyük yazı tipiyle alt menü/şerit/panel çubuğu sabit varsayılan yükseklikten uzun olabiliyor; bu test hem normal
// hem "uzun çubuk" (menü 90px, panel düğmesi 80px) durumunu üretir.
// Doğrulanan: (1) liste sayfalarında (Tüm ürünler, kategori, arama; sepet şeridi varken ve yokken) en alta kaydırınca son
// kartın "+"sı alt menü/şeridin en az 8px üstünde; sayfa alt boşluğu menü (+ şerit) + 16px. (2) Tam panelde en alta
// kaydırınca son seçenek ve son içerik alt çubuğun üstünde tam görünür.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozNavB{min-height:90px!important;height:90px!important} html:root .ozPdBar .ozBtn,html:root .ozPdBar .ozPStep{min-height:80px!important;height:80px!important}';
async function run(br,big,cart,fails){
 const tag=(big?'uzun':'normal')+(cart?'+şerit':'');const ok=(c,m)=>{if(!c)fails.push('['+tag+'] '+m)};
 const {p,st}=await open(br,{w:390,h:700,visible:true});
 if(big)await p.addStyleTag({content:BIG});
 await p.evaluate(c=>{localStorage.removeItem('isimi_oz_cart');if(c)localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'zz',product_id:'p9',name:'X',label:'',price_kurus:1000,seller_id:'s1',seller_name:'Y',qty:1}]));
  const d=window.__OZ_FX.R.oz_product_detail;d.id='p1';d.description='';['origin_city','origin_note','ingredients','storage_info','net_content','organic_cert'].forEach(k=>d[k]=null);d.shelf_life_days=null;d.allergens=[];
  d.variants=[1,2,3,4,5,6].map(i=>({id:'x'+i,label:(i*250)+' g',price_kurus:10000*i,compare_at_kurus:12000*i,stock:9}))},cart);
 await enter(p);await p.waitForTimeout(600);
 const list=()=>p.evaluate(()=>{scrollTo(0,1e6);const nav=document.getElementById('ozNav').getBoundingClientRect();const s=document.getElementById('ozCStrip');const ob=s?Math.min(s.getBoundingClientRect().top,nav.top):nav.top;
  const pl=[...document.querySelectorAll('#ozRoot .ozGc .ac')].map(x=>x.getBoundingClientRect());const last=pl[pl.length-1];
  const pad=parseFloat(getComputedStyle(document.querySelector('.app')).paddingBottom);const need=(innerHeight-nav.top)+(s?(nav.top-s.getBoundingClientRect().top)+0:0)+16;
  return {gap:Math.round(ob-last.bottom),pad:Math.round(pad),need:Math.round(need)}});
 for(const [nm,go] of [['Tüm ürünler',()=>OZ.go('plist',{seller:'s1'})],['Kategori',()=>OZ.go('plist',{seller:'s1',cat:'bal'})],['Arama',()=>OZ.go('search',{q:'a'})]]){
  await p.evaluate(go);await p.waitForTimeout(1300);await p.evaluate(()=>scrollTo(0,1e6));await p.waitForTimeout(300);
  const r=await list();ok(r.gap>=8,nm+': son kartın "+"sı alt menü/şeridin üstünde olmalı: '+JSON.stringify(r));ok(r.pad>=r.need-1,nm+': alt boşluk menü (+ şerit) + 16px olmalı: '+JSON.stringify(r));
 }
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 try{await p.click('.ozGc[data-pid=p1] .sc',{timeout:3000})}catch(e){fails.push('['+tag+'] panel açılamadı')}await p.waitForTimeout(1200);
 await p.evaluate(()=>{const B=document.querySelector('.ozOv.ozPdS .ozShB');if(B)B.scrollTop=1e5});await p.waitForTimeout(300);
 const pn=await p.evaluate(()=>{const o=document.querySelector('.ozOv.ozPdS');if(!o)return null;const bar=o.querySelector('.ozPdBar').getBoundingClientRect();const B=o.querySelector('.ozShB');
  const vs=[...o.querySelectorAll('.ozVar')];const lv=vs[vs.length-1].getBoundingClientRect();const els=[...B.children].filter(e=>!e.classList.contains('ozPdBar'));const le=els[els.length-1].getBoundingClientRect();
  return {barTop:Math.round(bar.top),lastVar:Math.round(lv.bottom),lastEl:Math.round(le.bottom),barBot:Math.round(bar.bottom),vh:innerHeight}});
 ok(pn&&pn.lastVar<=pn.barTop&&pn.lastEl<=pn.barTop&&pn.barBot<=pn.vh,'panel: en altta son seçenek/içerik alt çubuğun üstünde: '+JSON.stringify(pn));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await p.context().close();
}
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];for(const big of [false,true])for(const cart of [false,true])await run(br,big,cart,fails);await br.close();
 if(fails.length){console.error('o2-bosluk BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('o2-bosluk: tüm kontroller geçti (4 durum)');process.exit(0);
})().catch(e=>{console.error('o2-bosluk HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
