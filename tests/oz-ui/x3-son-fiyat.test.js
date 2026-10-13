// X3: "Son baktığın ürünler" kartında fiyat — 390px, sahte veri. Çalıştırma: node tests/oz-ui/x3-son-fiyat.test.js
// AG1: yalnız konum/ölçü/seçici beklentileri güncellendi — kart çerçevesiz/zeminsiz, "+" fotoğrafın ALTINDA fiyatın sağında (44×44), seçenekli fiyat "≈ X ₺" + "/kg'dan".
// AF1: yalnız beklenti güncellendi — alt satır kısa biçimde ("3 gramaj").
// AD2: raf AD1 ızgara kartını kullanır → yalnız seçiciler (.ozGr/.nm/.pr .uf/.nt/.pr .nvp/.pr b/.go) ve beklenenler (seçenek satırı "3 gramaj seçeneği", kart ≤ 260px) güncellendi.
// Doğrulanan: tek fiyatlı üründe altın fiyat; seçenekli üründe X2'nin satırı ("≈ 360 ₺/kg'dan", aynı unitFrom) + küçük "N seçenek";
// birimi çözülemeyen seçenekli üründe yalnız "N seçenek" (tahmin yok); seçenekleri kaydedilmemiş eski kayıt da bozulmaz.
// Panelden bakılan ürün seçenekleriyle kaydedilir. Kart yüksekliği büyümez (hepsi aynı, ≤ 90px), ad ≤2 satır, AA, 390px taşma yok.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:4,categories:[]};R.oz_producer_reviews=[];
  const I=n=>'https://img.test/'+n+'.jpg';localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[
   {id:'p2',name:'Cam şişe süt (TEST)',image:I('icecekler'),price_kurus:9000,nv:1,vs:[{label:'1 L',price_kurus:9000}],net:'1 L'},
   {id:'p3',name:'Kavanoz seti uzun bir ürün adı iki satırdan uzun olacak kadar',image:I('konserve'),price_kurus:5000,nv:2,vs:[{label:'Kavanoz',price_kurus:5000},{label:'Teneke',price_kurus:9000}],net:null},
   {id:'p4',name:'Eski kayıt',image:I('recel'),price_kurus:20000,nv:3}]}));
  const d=R.oz_product_detail;d.id='p0';d.name='Naturel sızma zeytinyağı';d.net_content='1000 gr';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9},{id:'k5',label:'5kg',price_kurus:180000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 // panelden bak → kayıt seçenekleriyle
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1300);
 try{await p.click('.ozGc[data-pid=p0] .sc',{timeout:3000})}catch(e){fails.push('panel açılamadı')}await p.waitForTimeout(1300);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 const rec=await p.evaluate(()=>JSON.parse(localStorage.getItem('isimi_oz_recent')).s1[0]);
 ok(rec&&rec.id==='p0'&&Array.isArray(rec.vs)&&rec.vs.length===3&&rec.vs[2].label==='5kg'&&rec.net==='1000 gr','panelden bakılan ürün seçenekleriyle kaydedilmeli: '+JSON.stringify(rec));
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 const M=await p.evaluate(()=>{const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};
  const cr=(a,b)=>+((Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)).toFixed(2);const o={};
  [...document.querySelectorAll('#ozRoot .ozGrH .ozGr')].forEach(c=>{const bg=rgb(getComputedStyle(c).backgroundColor);const r=c.getBoundingClientRect();const b=c.querySelector('.nm');const lh=parseFloat(getComputedStyle(b).lineHeight)||parseFloat(getComputedStyle(b).fontSize)*1.3;
   const uf=c.querySelector('.pr .uf'),nv=(c.querySelector('.nt')&&c.querySelector('.nt').textContent?c.querySelector('.nt'):c.querySelector('.pr .nvp')),pr=c.querySelector('.pr b');
   o[c.dataset.pid]={h:Math.round(r.height),lines:Math.round(b.getBoundingClientRect().height/lh),uf:uf?uf.textContent:null,nv:nv?nv.textContent:null,pr:pr?pr.textContent.replace(/\s/g,' '):null,
    gold:pr?(()=>{const k=rgb(getComputedStyle(pr).color);return k[0]>220&&k[1]>170&&k[2]<120})():null,
    ufFs:uf?parseFloat(getComputedStyle(uf).fontSize):0,nvFs:nv?parseFloat(getComputedStyle(nv).fontSize):0,
    crs:[b,uf,nv,pr].filter(Boolean).map(e=>cr(rgb(getComputedStyle(e).color),bg)),
    inside:[...c.querySelectorAll('.go *')].every(e=>e.getBoundingClientRect().right<=r.right+1)}});return {o,page:document.documentElement.scrollWidth}});
 const O=M.o;
 ok(O.p0&&O.p0.uf==="≈ 360 ₺"&&O.p0.nv==='3 gramaj'&&O.p0.pr===null,'seçenekli: "≈ 360 ₺/kg\'dan" + "3 gramaj seçeneği", toplam fiyat yok: '+JSON.stringify(O.p0));
 ok(O.p0&&O.p0.nvFs<O.p0.ufFs&&O.p0.ufFs===13,'"N seçenek" küçük kalmalı: '+JSON.stringify(O.p0));
 ok(O.p2&&O.p2.pr==='90,00 ₺'&&O.p2.gold&&O.p2.uf===null,'tek fiyatlı: altın fiyat: '+JSON.stringify(O.p2));
 ok(O.p3&&O.p3.uf===null&&O.p3.nv==='2 seçenek'&&O.p3.pr===null,'birimi çözülemeyen: yalnız "2 seçenek": '+JSON.stringify(O.p3));
 ok(O.p4&&O.p4.uf===null&&O.p4.nv==='3 seçenek','seçeneksiz eski kayıt bozulmaz: '+JSON.stringify(O.p4));
 const hs=Object.values(O).map(x=>x.h);
 ok(hs.length===4&&Math.max(...hs)===Math.min(...hs)&&Math.max(...hs)<=260,'kart yükseklikleri aynı ve büyümedi: '+JSON.stringify(hs));
 ok(Object.values(O).every(x=>x.lines<=2&&x.inside&&x.crs.every(c=>c>=4.5)),'ad ≤2 satır, taşma yok, AA: '+JSON.stringify(O));
 ok(M.page<=390,'390px taşma yok: '+M.page);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('x3-son-fiyat BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('x3-son-fiyat: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('x3-son-fiyat HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
