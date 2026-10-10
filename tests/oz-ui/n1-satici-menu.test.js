// N1-1: satıcı alt menüsü — 390px, sahte veri (onaylı satıcı). Çalıştırma: node tests/oz-ui/n1-satici-menu.test.js
// Doğrulanan: satıcı panelinin tüm ekranlarında (Siparişler, Ürünler, ürün düzenle, yeni ürün, geçmiş siparişler, Sorular,
// Kazanç, Mağaza, Belgelerim) alt menü SATICI menüsü kalır ve ilgili sekme seçilidir; müşteri menüsüne dönmez.
// Görünüm: altın üst çizgi, seçili sekme dolu altın, 56px; üstte "Satıcı paneli" etiketi; rozetler (Siparişler, Sorular).
// "Müşteri görünümüne geç" alıcı menüsüne döner, etiket kalkar.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);await p.waitForTimeout(600);
 const nav=()=>p.evaluate(()=>{const n=document.getElementById('ozNav');const on=document.body.classList.contains('ozNavOn');const cur=n&&n.querySelector('.ozNavB[aria-current=page]');const tg=document.getElementById('ozSellTag');
  const cs=n?getComputedStyle(n):null;const cc=cur?getComputedStyle(cur):null;
  return {mode:n&&n.dataset.mode,on,tabs:n?[...n.querySelectorAll('.ozNavB .l')].map(x=>x.textContent).join(','):'',cur:cur?(cur.dataset.tab||cur.dataset.k):null,
   tag:!!tg&&!tg.hidden&&tg.offsetParent!==null,border:cs&&cs.borderTopColor,curBg:cc&&cc.backgroundColor,h:cur?Math.round(cur.getBoundingClientRect().height):0,
   so:(document.getElementById('ozSoN')||{}).hidden===false?document.getElementById('ozSoN').textContent:null,sq:(document.getElementById('ozSqN')||{}).hidden===false?document.getElementById('ozSqN').textContent:null}});
 const sellerOk=(n,tab,where)=>{ok(n.mode==='seller'&&n.on&&n.tabs==='Siparişler,Ürünler,Sorular,Kazanç,Mağaza','['+where+'] satıcı menüsü görünür olmalı: '+JSON.stringify(n));
  ok(n.cur===tab,'['+where+'] seçili sekme '+tab+' olmalı: '+n.cur);ok(n.tag,'['+where+'] üstte "Satıcı paneli" etiketi olmalı')};
 await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
 let n=await nav();sellerOk(n,'ozet','Siparişler');
 ok(n.border==='rgb(201, 163, 58)'&&n.curBg==='rgb(242, 180, 49)'&&n.h>=56,'satıcı menüsü görünümü (altın çizgi, dolu altın seçili, 56px): '+JSON.stringify(n));
 ok(n.so==='3'&&n.sq==='2','rozetler: Siparişler yeni+bekleyen 3, Sorular yanıtsız 2: '+JSON.stringify({so:n.so,sq:n.sq}));
 await click(p,'#ozRoot [data-a=soTab][data-st=past]');sellerOk(await nav(),'ozet','Geçmiş siparişler');
 await click(p,'#ozNav [data-tab=urunler]');sellerOk(await nav(),'urunler','Ürünler');
 await click(p,'#ozRoot .ozSpEd',1500);n=await nav();sellerOk(n,'urunler','Ürün düzenle');
 ok(await p.evaluate(()=>/Ürünü düzenle/.test(document.querySelector('#ozRoot h1').textContent)),'ürün düzenle ekranı açılmalı');
 await p.goBack();await p.waitForTimeout(1300);sellerOk(await nav(),'urunler','Düzenleden geri');
 await click(p,'#ozRoot .ozSpNew',1500);sellerOk(await nav(),'urunler','Yeni ürün');
 await click(p,'#ozNav [data-tab=sorular]');sellerOk(await nav(),'sorular','Sorular');
 await click(p,'#ozNav [data-tab=kazanc]');sellerOk(await nav(),'kazanc','Kazanç');
 await click(p,'#ozNav [data-tab=magaza]');sellerOk(await nav(),'magaza','Mağaza');
 await click(p,'#ozRoot [data-k=sellerApply][data-tab="2"]',1500);sellerOk(await nav(),'magaza','Belgelerim');
 await click(p,'#ozNav [data-tab=ozet]');
 await click(p,'#ozRoot .ozCustV',1200);n=await nav();
 ok(n.mode==='buyer'&&n.cur==='home'&&!n.tag,'"Müşteri görünümüne geç" alıcı menüsüne dönmeli: '+JSON.stringify(n));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('n1-satici-menu BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('n1-satici-menu: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('n1-satici-menu HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
