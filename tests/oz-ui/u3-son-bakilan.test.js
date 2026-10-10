// U3: üretici sayfası "Son baktığın ürünler" rafı yatay kahve kart — 390px, sahte veri. Çalıştırma: node tests/oz-ui/u3-son-bakilan.test.js
// Doğrulanan: kart ≈280px genişlik, liste kartından belirgin kısa; solda kare foto (filtre/karartma yok), sağda ad (≤2 satır)
// ve fiyat / "N seçenek"; kahve zemin (beyaz değil), ince bronz kenar; ad/fiyat/seçenek yazıları AA (≥4.5:1). Raf yatay kayar,
// sayfa taşmaz; karta dokununca o ürünün paneli açılır; kayıt yoksa raf görünmez. Müşteri yorumları şeridi değişmez.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{localStorage.removeItem('isimi_oz_recent');const R=window.__OZ_FX.R;R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:4,categories:[{slug:'bal',name:'Bal',count:1}]};
  R.oz_producer_reviews=[{id:'r1',rating:5,comment:'Güzel',name:'A',created_at:'2026-10-05T10:00:00Z',product_name:'Bal',product_id:'p1'}]});
 await enter(p);await p.waitForTimeout(600);
 const goStore=async()=>{await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600)};
 await goStore();
 ok(!(await p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozPPx h2')].some(h=>h.textContent==='Son baktığın ürünler'))),'kayıt yokken raf görünmemeli');
 const rvBefore=await p.evaluate(()=>{const e=document.querySelector('#ozRoot .ozRvC');return e?e.outerHTML:null});
 await p.evaluate(()=>{const I=n=>'https://img.test/'+n+'.jpg';localStorage.setItem('isimi_oz_recent',JSON.stringify({s1:[
  {id:'p1',name:'Erzincan kara kovan balı uzun ürün adı iki satırı aşacak kadar uzun',image:I('bal-recel'),price_kurus:60000,nv:2},
  {id:'p2',name:'Cam şişe süt (TEST)',image:I('icecekler'),price_kurus:9000,nv:1},{id:'p3',name:'Çilek reçeli',image:I('recel'),price_kurus:20000,nv:3},{id:'p4',name:'Kekik',image:'',price_kurus:5000,nv:1}]}))});
 await goStore();
 const g=await p.evaluate(()=>{const sec=[...document.querySelectorAll('#ozRoot .ozPPx')].find(s=>s.querySelector('h2').textContent==='Son baktığın ürünler');if(!sec)return null;
  const row=sec.querySelector('.ozRcs');const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2]}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
  return {sw:row.scrollWidth,cw:row.clientWidth,ox:getComputedStyle(row).overflowX,page:document.documentElement.scrollWidth,cards:[...row.querySelectorAll('.ozRcC')].map(c=>{const r=c.getBoundingClientRect(),pi=c.querySelector('.ozPic'),pr=pi.getBoundingClientRect(),b=c.querySelector('b'),sm=c.querySelector('small');
   const img=pi.querySelector('img');const bg=rgb(getComputedStyle(c).backgroundColor);const bd=rgb(getComputedStyle(c).borderTopColor);const lh=parseFloat(getComputedStyle(b).lineHeight)||parseFloat(getComputedStyle(b).fontSize)*1.3;
   return {id:c.dataset.id,w:Math.round(r.width),h:Math.round(r.height),txt:c.innerText.replace(/\s+/g,' ').trim(),photoLeft:Math.round(pr.left-r.left),sq:Math.abs(pr.width-pr.height)<2&&pr.width>=48,textRight:Math.round(b.getBoundingClientRect().left-pr.right),
    under:Math.round(sm.getBoundingClientRect().top-b.getBoundingClientRect().bottom),lines:Math.round(b.getBoundingClientRect().height/lh),bgL:+lum(bg).toFixed(3),bd,bw:parseFloat(getComputedStyle(c).borderTopWidth),
    nameCr:cr(rgb(getComputedStyle(b).color),bg),smCr:cr(rgb(getComputedStyle(sm).color),bg),filt:img?getComputedStyle(img).filter+'|'+getComputedStyle(img).opacity+'|'+getComputedStyle(pi).filter+'|'+getComputedStyle(pi).opacity:'none|1|none|1'}})}});
 ok(g&&g.cards.length===4,'raf 4 kart göstermeli: '+JSON.stringify(g&&g.cards.length));
 if(g){
  const lc=134;/* liste kartı en az 136px yüksek */
  g.cards.forEach(c=>{const t='['+c.id+'] ';
   ok(c.w>=270&&c.w<=290,t+'genişlik ≈280px: '+c.w);ok(c.h<=lc*0.75,t+'yükseklik liste kartından belirgin kısa: '+c.h);
   ok(c.photoLeft<=10&&c.sq&&c.textRight>=6,t+'solda kare foto, yazı sağda: '+JSON.stringify(c));ok(c.under>=-1&&c.lines<=2,t+'ad ≤2 satır, altında fiyat/seçenek: '+JSON.stringify([c.lines,c.under]));
   ok(c.bgL<0.1&&c.bw>=0.5&&c.bw<=2&&c.bd.r>c.bd.b+30,t+'kahve zemin, ince bronz kenar: '+JSON.stringify([c.bgL,c.bd,c.bw]));
   ok(c.nameCr>=4.5&&c.smCr>=4.5,t+'AA kontrast: '+JSON.stringify([c.nameCr,c.smCr]));ok(c.filt==='none|1|none|1',t+'foto filtresiz: '+c.filt)});
  ok(/3 seçenek$/.test(g.cards[2].txt)&&/90,00\s₺$/.test(g.cards[1].txt),'fiyat ya da N seçenek: '+JSON.stringify(g.cards.map(c=>c.txt)));
  ok(g.ox==='auto'&&g.sw>g.cw+100&&g.page<=390,'raf yatay kaymalı, sayfa taşmamalı: '+JSON.stringify({sw:g.sw,cw:g.cw,ox:g.ox,page:g.page}));
 }
 const sl=await p.evaluate(()=>{const r=document.querySelector('#ozRoot .ozRcs');r.scrollLeft=200;return r.scrollLeft});ok(sl>0,'raf kaydırılabilmeli: '+sl);
 ok(rvBefore&&rvBefore===await p.evaluate(()=>{const e=document.querySelector('#ozRoot .ozRvC');return e?e.outerHTML:null}),'müşteri yorumları şeridi değişmemeli');
 await p.evaluate(()=>{window.__OZ_FX.R.oz_product_detail.id='p3';document.querySelector('#ozRoot .ozRcs').scrollLeft=0});
 try{await p.click('#ozRoot .ozRcC[data-id=p3]',{timeout:3000})}catch(e){fails.push('kart tıklanamadı')}await p.waitForTimeout(1300);
 const last=st.calls.filter(c=>c[0]==='oz_product_detail').pop();
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS'))&&last&&last[1].p_id==='p3','karta dokununca p3 paneli açılmalı: '+JSON.stringify(last&&last[1]));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('u3-son-bakilan BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('u3-son-bakilan: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('u3-son-bakilan HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
