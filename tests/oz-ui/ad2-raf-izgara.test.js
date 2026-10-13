// AD2: "Son baktığın ürünler" rafı AD1 ızgara kartıyla — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ad2-raf-izgara.test.js
// AF1: yalnız beklenti güncellendi — kart alt satırı kısa biçimde ("2 hacim").
// Doğrulanan: raf kartları AD1'in ürün listesi kartıyla AYNI bileşen (aynı sınıf/iç yapı: .ozGr > .go(.ph,.pr,.up,.nm,.nt) + .ac "+"),
// 118px kare, yatay kaydırma (sayfa taşmaz); sıra ve kayıtlar aynı (localStorage); karta dokunuş o ürünün panelini açar, "+" paneli
// açmaz (seçenek penceresi); seçenek bilgisi olmayan eski kayıt "N seçenek" (tahmin yok); kayıt yoksa raf görünmez; AA kontrast;
// müşteri yorumları şeridi ve satıcı kapak vitrini (büyük slayt) değişmedi; ana ekranda ayrı "Yeni ürünler" rafı yok.
const {chromium,open,enter,overflow}=require('./harness.js');
const REC={s1:[
 {id:'p2',name:'Ezine peyniri',image:'https://img.test/recel.jpg',price_kurus:89990,nv:1,vs:[{label:'500 g',price_kurus:89990}],net:'500 g'},
 {id:'p0',name:'Erken hasat zeytinyağı',image:'https://img.test/zeytin-zeytinyagi.jpg',price_kurus:65000,nv:2,vs:[{label:'500 ml',price_kurus:65000},{label:'1 L',price_kurus:125000}],net:'1 L'},
 {id:'p1',name:'Çam balı',image:'https://img.test/bal-recel.jpg',price_kurus:45000,nv:3},
 {id:'p4',name:'Kekik',image:'',price_kurus:12000,nv:1},
 {id:'p5',name:'Tarhana',image:'https://img.test/kuru-yemis.jpg',price_kurus:15000,nv:1},
 {id:'p3',name:'Pekmez',image:'https://img.test/recel.jpg',price_kurus:22000,nv:1}]};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:''});
 await p.evaluate(REC=>{localStorage.setItem('isimi_oz_recent',JSON.stringify(REC));const R=window.__OZ_FX.R;
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:6,categories:[{slug:'bal',name:'Bal',count:1}]};
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','kuru-yemis'][i%3]+'.jpg'}));
  R.oz_producer_reviews=[{id:'r1',rating:5,comment:'Güzel',name:'A',created_at:'2026-10-05T10:00:00Z',product_name:'Bal',product_id:'p1'}]},REC);
 await enter(p);
 ok(await p.evaluate(()=>!/Yeni ürünler/.test(document.getElementById('ozRoot').innerText)),'ana ekranda ayrı "Yeni ürünler" rafı yok (G1)');
 // ürün listesindeki ızgara kartının iç yapısı (referans)
 await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(1500);
 const sig=sel=>p.evaluate(sel=>{const c=document.querySelector(sel);if(!c)return null;const k=e=>e.tagName.toLowerCase()+'.'+[...e.classList].join('.');
  return k(c)+'>'+[...c.children].map(x=>k(x)+'('+[...x.children].map(k).join(',')+')').join('|')},sel);
 const ref=await sig('#ozRoot .ozGrs .ozGr[data-pid="p2"]');
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1800);
 const R=await p.evaluate(()=>{function lum(x){const m=x.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const s=document.querySelector('#ozPPRc section');if(!s)return null;const h=s.querySelector('.ozGrH');const cs=[...s.querySelectorAll('.ozGr')];
  return {title:s.querySelector('h2').textContent,ids:cs.map(c=>c.dataset.pid).join(),w:cs.map(c=>Math.round(c.getBoundingClientRect().width)),
   sq:cs.every(c=>{const r=c.querySelector('.ph').getBoundingClientRect();return Math.abs(r.width-r.height)<1.5}),scroll:h?h.scrollWidth>h.clientWidth&&getComputedStyle(h).overflowX==='auto':false,
   txt:cs.map(c=>(c.querySelector('.pr').textContent+'|'+c.querySelector('.nt').textContent)),
   aa:cs.slice(0,2).map(c=>{const bg=getComputedStyle(c).backgroundColor;const pe=c.querySelector('.pr b,.pr .uf,.pr .nvp');return [cr(getComputedStyle(pe).color,bg),cr(getComputedStyle(c.querySelector('.nm')).color,bg),cr(getComputedStyle(c.querySelector('.nt')).color,bg)].map(x=>+x.toFixed(2))}),
   rv:!!document.querySelector('#ozPPRv .ozRvs'),cover:document.querySelectorAll('#ozRoot .ozPP .cv .ppS .sl').length}});
 ok(R&&R.title==='Son baktığın ürünler'&&R.ids==='p2,p0,p1,p4,p5,p3','raf görünür, kayıt sırası aynı: '+JSON.stringify(R&&R.ids));
 if(R){
  ok(R.w.every(x=>x===118)&&R.sq,'118px kare kartlar: '+JSON.stringify(R.w));
  ok(R.scroll,'raf yatay kayar');
  ok(/899,90/.test(R.txt[0])&&/500 g$/.test(R.txt[0])&&/^≈ .+ ₺\/L'd[ae]n\|2 hacim$/.test(R.txt[1])&&R.txt[2]==='3 seçenek|','fiyat/seçenek satırları (eski kayıt "3 seçenek", tahmin yok): '+JSON.stringify(R.txt.slice(0,3)));
  ok(R.aa.every(a=>a.every(x=>x>=4.5)),'AA kontrast: '+JSON.stringify(R.aa));
  ok(R.rv,'müşteri yorumları şeridi aynen');ok(R.cover>=2,'satıcı kapak vitrini (büyük slayt) aynen: '+R.cover);
 }
 const rs=await sig('#ozPPRc .ozGr[data-pid="p2"]');
 ok(ref&&rs&&ref===rs,'raf kartı ürün listesi ızgara kartıyla aynı bileşen:\n   liste '+ref+'\n   raf   '+rs);
 ok(await overflow(p)<=0,'390px sayfa taşmaz');
 // dokununca panel
 const n0=st.calls.filter(c=>c[0]==='oz_product_detail'&&c[1].p_id==='p1').length;
 await click(p,'#ozPPRc .ozGr[data-pid="p1"] .go',1300);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&st.calls.filter(c=>c[0]==='oz_product_detail'&&c[1].p_id==='p1').length>n0,'karta dokunuş o ürünün panelini açmalı');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(500);
 // "+" paneli açmaz (fikstür ürünü seçenekli → küçük seçenek penceresi)
 await click(p,'#ozPPRc .ozGr[data-pid="p0"] .ac .ozPlus',1100);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')),'"+" seçenek penceresini açmalı, paneli değil');
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 // boş raf görünmez
 await p.evaluate(()=>localStorage.removeItem('isimi_oz_recent'));await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 ok(await p.evaluate(()=>{const b=document.getElementById('ozPPRc');return !!b&&!b.querySelector('section')&&!/Son baktığın/.test(document.getElementById('ozRoot').innerText)}),'kayıt yoksa raf görünmemeli');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ad2-raf-izgara BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ad2-raf-izgara: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ad2-raf-izgara HATA:',e);process.exit(1)});
