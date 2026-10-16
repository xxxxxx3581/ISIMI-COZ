// AI2: seçenekli üründe seçenek penceresinde seçenek başına "− n +" — 390px, sahte RPC (veritabanına yazmaz). Çalıştırma: node tests/oz-ui/pk-adet.test.js
// Doğrulanan: sepette olan seçilmiş seçenekte alt çubukta "Sepete ekle" yerine "− n +" (her bölüm ≥44×44); "+" stokta durur (pasif) ve
// toast verir; "−" yalnız o seçeneğin adedini düşürür, 0'da yalnız o seçenek sepetten çıkar (diğer seçenek ve adedi korunur), pencere açık kalır,
// satırdaki "Sepette N" ve alt çubuk güncellenir; sepette olmayan seçenekte "Sepete ekle" aynen; karttaki toplam adet rozeti doğru; son seçenek
// çıkınca kart sade "+" gösterir; fiyat gösterimi aynı; sepet geri kalan seçeneklerle kalır; tek fiyatlı ürünün "− n +" kontrolü değişmez.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;
  const V=[{id:'r8',label:'800gr',price_kurus:50000,stock:20},{id:'r5',label:'500gr',price_kurus:30000,stock:3},{id:'r3',label:'300gr',price_kurus:20000,stock:20}];
  const d=R.oz_product_detail;d.id='p0';d.name='Reçel';d.images=['https://img.test/recel.jpg'];d.net_content='800';d.variants=V;
  R.oz_search_products=[{id:'p0',name:'Reçel',image:'https://img.test/recel.jpg',price_kurus:20000,seller_id:'s1',in_stock:true,nv:3},
   {id:'p1',name:'Bal',image:'https://img.test/bal-recel.jpg',price_kurus:9000,seller_id:'s1',in_stock:true,nv:1}];
  T.oz_products=[{id:'p0',description:'',net_content:'800'},{id:'p1',description:'',net_content:'850 g'}];
  T.oz_variants=[{product_id:'p1',label:'850 g',price_kurus:9000,stock:9,sort:0}];
  localStorage.removeItem('isimi_oz_cart');
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:2,categories:[]};R.oz_producer_reviews=[]});
 await enter(p);await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 const cart=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').filter(x=>x.product_id==='p0').map(x=>x.variant_id+':'+x.qty).sort().join(','));
 const sheet=()=>p.evaluate(()=>{const pk=document.querySelector('.ozOv.ozPkS');if(!pk)return null;const st=pk.querySelector('.ozPkBar .ozPStep');const add=pk.querySelector('[data-a=pkAdd]');
  const bs=st?[...st.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),b.disabled]}):null;
  return {rows:[...pk.querySelectorAll('.ozPkO')].map(x=>x.innerText.replace(/\s+/g,' ').trim()),sel:[...pk.querySelectorAll('.ozPkO.on')].map(x=>x.dataset.v).join(),
   step:st?{n:st.querySelector('b').textContent,bs}:null,add:!!add,addDis:add?add.disabled:null,price:pk.querySelector('.ozPkBar .pp').innerText.replace(/\s+/g,' ').trim()}});
 const badge=()=>p.evaluate(()=>{const c=document.querySelector('.ozGr[data-pid=p0] .ac');const b=c&&c.querySelector('.bd');return {badge:b?b.textContent:null,plus:!!(c&&c.querySelector('.ozPlus')),step:!!(c&&c.querySelector('.ozPStep'))}});
 const click=async(sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||500);return true};
 const openPk=async()=>{await click('.ozGr[data-pid=p0] .ac button',900);return sheet()};
 // 1) ilk ekleme: sepette yok → "Sepete ekle"
 let s=await openPk();ok(s&&s.rows.length===3,'pencere 3 seçenekle açılmalı: '+JSON.stringify(s));
 await click('.ozOv.ozPkS .ozPkO[data-v=r5]',300);s=await sheet();
 ok(s.add&&!s.step&&s.addDis===false&&s.price==='300,00 ₺','sepette olmayan seçenekte "Sepete ekle" + fiyat: '+JSON.stringify(s));
 await click('.ozOv.ozPkS [data-a=pkAdd]',700);
 ok(await cart()==='r5:1','r5 sepete 1 adet eklenmeli: '+await cart());
 let b=await badge();ok(b.badge==='1'&&b.plus&&!b.step,'kart rozeti 1: '+JSON.stringify(b));
 // 2) sepetteki seçenek: "− n +"
 s=await openPk();await click('.ozOv.ozPkS .ozPkO[data-v=r5]',300);s=await sheet();
 ok(s.step&&!s.add&&s.step.n==='1'&&s.step.bs.every(x=>x[0]>=44&&x[1]>=44),'sepetteki seçenekte "− n +" (≥44×44), "Sepete ekle" yok: '+JSON.stringify(s));
 ok(/Sepette 1/.test(s.rows[1])&&!/Sepette/.test(s.rows[0]+s.rows[2]),'yalnız r5 satırında "Sepette 1": '+JSON.stringify(s.rows));
 // "+" stok sınırına kadar (r5 stok 3)
 await click('.ozOv.ozPkS [data-a=pkQty][data-d="1"]',300);await click('.ozOv.ozPkS [data-a=pkQty][data-d="1"]',300);s=await sheet();
 ok(await cart()==='r5:3'&&s&&s.step.n==='3'&&s.step.bs[1][2]===true,'"+" stokta (3) durur, "+" pasif: '+await cart()+' '+JSON.stringify(s&&s.step));
 ok(s&&/Sepette 3/.test(s.rows[1]),'satır "Sepette 3" güncellenmeli: '+JSON.stringify(s&&s.rows));
 b=await badge();ok(b.badge==='3','pencere açıkken karttaki rozet 3: '+JSON.stringify(b));
 // 3) başka seçenek: bağımsız
 await click('.ozOv.ozPkS .ozPkO[data-v=r3]',300);s=await sheet();
 ok(s.add&&!s.step&&s.price==='200,00 ₺','sepette olmayan r3: "Sepete ekle" + fiyat: '+JSON.stringify(s));
 await click('.ozOv.ozPkS [data-a=pkAdd]',700);
 ok(await cart()==='r3:1,r5:3','r3 eklenince r5 adedi korunmalı: '+await cart());
 b=await badge();ok(b.badge==='4','toplam rozet 4: '+JSON.stringify(b));
 // 4) r5'i sıfıra indir: yalnız r5 çıkar, r3 korunur, pencere açık
 s=await openPk();await click('.ozOv.ozPkS .ozPkO[data-v=r5]',300);
 await click('.ozOv.ozPkS [data-a=pkQty][data-d="-1"]',300);await click('.ozOv.ozPkS [data-a=pkQty][data-d="-1"]',300);s=await sheet();
 ok(await cart()==='r3:1,r5:1'&&s.step.n==='1','r5 3→1, r3 değişmedi: '+await cart());
 await click('.ozOv.ozPkS [data-a=pkQty][data-d="-1"]',300);s=await sheet();
 ok(await cart()==='r3:1','r5 0 olunca yalnız r5 çıkmalı, r3:1 kalmalı: '+await cart());
 ok(s&&s.add&&!s.step&&s.addDis===false,'pencere açık kalmalı, r5 için "Sepete ekle" geri gelmeli: '+JSON.stringify(s));
 ok(s&&!/Sepette/.test(s.rows[1])&&/Sepette 1/.test(s.rows[2]),'r5 satırında "Sepette" yok, r3 "Sepette 1": '+JSON.stringify(s&&s.rows));
 b=await badge();ok(b.badge==='1','rozet 1: '+JSON.stringify(b));
 // 5) son seçenek: kart sade "+"
 await click('.ozOv.ozPkS .ozPkO[data-v=r3]',300);await click('.ozOv.ozPkS [data-a=pkQty][data-d="-1"]',300);
 ok(await cart()==='','son seçenek de çıkınca sepet boş: '+await cart());
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(500);
 b=await badge();ok(b.badge===null&&b.plus&&!b.step,'kartta rozet yok, sade "+": '+JSON.stringify(b));
 // 6) tek fiyatlı ürün: "− n +" aynen (sahte ayrıntı p1'in tek seçeneğine çevrilir)
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p1';d.name='Bal';d.net_content='850 g';d.variants=[{id:'v1',label:'850 g',price_kurus:9000,stock:9}]});
 await click('.ozGr[data-pid=p1] .ac button',900);
 const one=await p.evaluate(()=>{const c=document.querySelector('.ozGr[data-pid=p1] .ac');return {step:!!c.querySelector('.ozPStep'),n:c.querySelector('.ozPStep b')&&c.querySelector('.ozPStep b').textContent,sheet:!!document.querySelector('.ozOv.ozPkS')}});
 ok(one.step&&one.n==='1'&&!one.sheet,'tek fiyatlı ürün doğrudan eklenir, kartta "− n +": '+JSON.stringify(one));
 await click('.ozGr[data-pid=p1] .ac [data-a=ppQty][data-d="-1"]',400);
 ok(await p.evaluate(()=>!document.querySelector('.ozGr[data-pid=p1] .ac .ozPStep')&&!JSON.parse(localStorage.getItem('isimi_oz_cart')||'[]').length),'tek fiyatlı ürün "−" ile çıkar, sepet boş');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('pk-adet BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('pk-adet: tüm kontroller geçti');process.exit(0);
})();
