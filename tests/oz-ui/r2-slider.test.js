// R2: üretici sayfası üst şeridi satıcının vitrin sırasıyla — 390px, sahte veri, sahte zamanlayıcı. Çalıştırma: node tests/oz-ui/r2-slider.test.js
// Doğrulanan: oz_producer_detail.showcase_ids doluysa şeritte yalnız o ürünler, o sırayla (son 12 üründe olmayan vitrin ürünü
// oz_products okumasıyla tamamlanır; bulunamayan / null / boş id atlanır). Boş ya da alan yoksa eski davranış (son ürünler).
// Tek vitrin ürünü: akış, nokta, çip yok. Keşfet üretici kartı ve Üreticiler sekmesi sunucu sırasını korur (ek süzme yok).
const {chromium,open,enter}=require('./harness.js');
const IMG=n=>'https://img.test/'+n+'.jpg';
const P=(id,img)=>({id,name:'Ürün '+id,image:IMG(img),images:[IMG(img)],price_kurus:10000,in_stock:true});
const LAST=[P('b1','recel'),P('b2','bal-recel'),P('b3','kuru-yemis'),P('b4','konserve')];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 async function page(ids,extra){
  const {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.clock.install();
  await p.evaluate(([ids,last,extra])=>{const R=window.__OZ_FX.R;const d={id:'s1',display_name:'Yayla Üreticileri',city:'Muğla',cover_url:'https://img.test/bal-recel.jpg',product_count:6,categories:[{slug:'bal',name:'Bal',count:1}]};
   if(ids!==undefined)d.showcase_ids=ids;R.oz_producer_detail=d;R.oz_search_products=last;window.__OZ_FX.T.oz_products=extra||[]},[ids,LAST,extra]);
  await enter(p);await p.clock.runFor(1500);
  await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.clock.runFor(1500);
  return {p,st};
 }
 const S=p=>p.evaluate(()=>{const tr=document.getElementById('ozPPS');return {pids:tr?[...tr.children].map(x=>x.dataset.pid).join(','):'',i:tr&&tr.__oz?tr.__oz.state().i:null,
  chip:(document.getElementById('ozPPN')||{}).textContent||null,dots:document.querySelectorAll('#ozPPD i').length}});
 const getP=st=>st.calls.filter(c=>c[0]==='GET oz_products');
 // vitrin dolu: son ürünlerde olan + olmayan (b9) + bulunamayan + null + boş
 let {p,st}=await page(['b3','yok-1','b9',null,'','b1'],[{id:'b9',name:'Ürün b9',status:'published',images:[IMG('tahin-pekmez')]}]);
 let s=await S(p);
 ok(s.pids==='b3,b9,b1','vitrin dolu: yalnız vitrin ürünleri, vitrin sırasıyla (b3,b9,b1): '+JSON.stringify(s));
 ok(s.chip==='1/3'&&s.dots===3,'vitrin dolu: çip 1/3, 3 nokta: '+JSON.stringify(s));
 ok(getP(st).length===1&&/id=in\.\(yok-1,b9\)/.test(getP(st)[0][1]),'eksik vitrin ürünleri tek okumayla: '+JSON.stringify(getP(st).map(c=>c[1])));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 // vitrin dolu, hepsi son ürünlerde: ek okuma yok, sıra vitrinin
 ({p,st}=await page(['b4','b2']));s=await S(p);
 ok(s.pids==='b4,b2'&&getP(st).length===0,'vitrin son ürünlerdeyse ek okuma yok, sıra b4,b2: '+JSON.stringify(s)+' / '+getP(st).length);await p.context().close();
 // vitrin boş / alan yok: eski davranış
 for(const [nm,ids] of [['boş',[]],['alan yok',undefined],['yalnız bulunamayan id',['yok-2']]]){
  ({p,st}=await page(ids));s=await S(p);
  ok(s.pids==='b1,b2,b3,b4'&&s.chip==='1/4','vitrin '+nm+': son ürünler (eski davranış): '+JSON.stringify(s));
  ok(!st.errors.length,'['+nm+'] sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 }
 // tek vitrin ürünü: akış/nokta/çip yok
 ({p,st}=await page(['b2']));s=await S(p);
 ok(s.pids==='b2'&&s.chip===null&&s.dots===0,'tek vitrin ürünü: çip/nokta yok: '+JSON.stringify(s));
 await p.clock.runFor(6000);s=await S(p);ok(s.i===0,'tek vitrin ürününde akış yok: '+JSON.stringify(s));await p.context().close();
 // Keşfet üretici kartı + Üreticiler: sunucu sırası korunur (vitrin süzmesi sunucuda)
 ({p,st}=await page([]));
 await p.evaluate(prods=>{const R=window.__OZ_FX.R;R.oz_producers=R.oz_producers.map((x,i)=>i?x:Object.assign({},x,{products:prods}))},[P('c3','kuru-yemis'),P('c1','recel'),P('c2','konserve')]);
 const order=()=>p.evaluate(()=>{const c=document.querySelector('#ozRoot .ozPrd2[data-id=s1]');return c?[...c.querySelectorAll('.ozPrdF .fi')].map(i=>i.getAttribute('src').split('/').pop()).join(','):null});
 await p.evaluate(()=>OZ.go('home',{}));await p.clock.runFor(1500);
 let o=await order();ok(o==='kuru-yemis.jpg,recel.jpg,konserve.jpg','Keşfet üretici kartı sunucu sırası: '+o);
 await p.evaluate(()=>OZ.go('producers',{}));await p.clock.runFor(1500);
 o=await order();ok(o==='kuru-yemis.jpg,recel.jpg,konserve.jpg','Üreticiler sekmesi sunucu sırası: '+o);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('r2-slider BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('r2-slider: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('r2-slider HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
