// O3: satıcı "Sorular ve yorumlar" — 390px, sahte veri. Çalıştırma: node tests/oz-ui/o3-sorular.test.js
// (1) Telefondaki durum: sabit üst çubuk büyük yazı tipiyle uzun (140px) + yönetici önizleme şeridi + sayfa kaydırılmış.
//     Başlık "Sorular ve yorumlar" her durumda üst çubuk/şeridin altında tam görünür.
// (2) Metni olmayan (yalnız yıldız) yorumda "Yanıtla" yok, metinli yanıtsız yorumda var. "N yanıtsız" yalnız metinli yanıtsız
//     yorumları sayar; alt menü "Sorular" rozeti = cevapsız soru + yanıtlanabilir yorum (Siparişler sekmesindeyken de aynı).
const {chromium,open,enter}=require('./harness.js');
const TALL='html:root .ozTop{min-height:140px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 for(const tall of [false,true]){
  const tag=tall?'uzun üst çubuk':'normal';
  const {p,st}=await open(br,{w:390,h:844,visible:true});
  if(tall)await p.addStyleTag({content:TALL});
  // sunucu sayacı (oz_seller_dashboard) metinsiz olanlar dahil tüm yanıtsız yorumları sayar: 3
  await p.evaluate(()=>{const T=window.__OZ_FX.T;Object.assign(window.__OZ_FX.R.oz_seller_dashboard,{open_questions:1,unreplied_reviews:3});T.oz_products=[{id:'sp1',seller_id:'s1',name:'Reçel',status:'published',images:[]}];
   T.oz_questions=[{id:'q1',product_id:'sp1',question:'Şekerli mi?',answer:null,created_at:'2026-10-01T10:00:00Z'},{id:'q2',product_id:'sp1',question:'Cam mı?',answer:'Evet',created_at:'2026-10-01T09:00:00Z'}];
   T.oz_reviews=[{id:'r1',product_id:'sp1',rating:4,comment:'Tadı çok güzel.',seller_reply:null,created_at:'2026-10-02T10:00:00Z'},{id:'r2',product_id:'sp1',rating:5,comment:null,seller_reply:null,created_at:'2026-10-03T10:00:00Z'},
    {id:'r3',product_id:'sp1',rating:5,comment:'   ',seller_reply:null,created_at:'2026-10-03T11:00:00Z'},{id:'r4',product_id:'sp1',rating:3,comment:'Geç geldi.',seller_reply:'Özür dileriz.',created_at:'2026-10-04T10:00:00Z'}]});
  await enter(p);await p.waitForTimeout(600);
  await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1800);
  const bd=()=>p.evaluate(()=>{const b=document.getElementById('ozSqN');return b&&!b.hidden?b.textContent:null});
  ok(await bd()==='2','['+tag+'] Siparişler sekmesinde Sorular rozeti 2 olmalı (1 cevapsız soru + 1 yanıtlanabilir yorum): '+await bd());
  // kaydırılmış konum: uzun sekmeden geçiş + içerikte aşağı kaydırma
  await p.evaluate(()=>scrollTo(0,400));await p.waitForTimeout(200);
  try{await p.click('#ozNav [data-tab=sorular]',{timeout:3000})}catch(e){fails.push('['+tag+'] Sorular sekmesine geçilemedi')}await p.waitForTimeout(1500);
  const g=await p.evaluate(()=>{const top=document.getElementById('ozTop').getBoundingClientRect().bottom;const s=document.getElementById('ozStrip');const sb=s&&!s.hidden?s.getBoundingClientRect().bottom:0;
   const h1=document.querySelector('#ozRoot h1');const r=h1.getBoundingClientRect();const under=document.elementFromPoint(r.left+10,r.top+r.height/2);
   return {cover:Math.round(Math.max(top,sb)),h1Top:Math.round(r.top),visible:!!under&&h1.contains(under),txt:h1.textContent,y:scrollY}});
  ok(g.txt==='Sorular ve yorumlar'&&g.h1Top>=g.cover&&g.visible,'['+tag+'] başlık üst çubuğun altında tam görünmeli: '+JSON.stringify(g));
  const rv=await p.evaluate(()=>{const sp=document.getElementById('ozSP');const cards=[...sp.querySelectorAll('.ozList')].pop();
   const secs=[...sp.querySelectorAll('.ozSecH')].map(x=>x.innerText.replace(/\s+/g,' ').trim());
   return {secs,cards:[...cards.querySelectorAll('.ozCard')].map(c=>({t:c.innerText.replace(/\s+/g,' ').trim(),reply:!!c.querySelector('[data-a=rReply]')}))}});
  const byTxt=k=>rv.cards.find(c=>c.t.indexOf(k)>=0);
  ok(rv.secs.some(x=>/^Yorumlar 1 yanıtsız$/.test(x)),'['+tag+'] "1 yanıtsız" (yalnız metinli yanıtsız yorum): '+JSON.stringify(rv.secs));
  ok(byTxt('Tadı çok güzel.')&&byTxt('Tadı çok güzel.').reply,'['+tag+'] metinli yanıtsız yorumda "Yanıtla" olmalı');
  ok(rv.cards.filter(c=>c.reply).length===1,'['+tag+'] metinsiz yorumlarda "Yanıtla" olmamalı: '+JSON.stringify(rv.cards));
  ok(await bd()==='2','['+tag+'] Sorular sekmesinde rozet aynı (2): '+await bd());
  ok(!st.errors.length,'['+tag+'] sayfa hatası olmamalı: '+st.errors.join(' | '));
  await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('o3-sorular BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('o3-sorular: tüm kontroller geçti (2 durum)');process.exit(0);
})().catch(e=>{console.error('o3-sorular HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
