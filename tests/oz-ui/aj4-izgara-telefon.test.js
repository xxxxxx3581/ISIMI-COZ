// AJ2-D2: telefonda ürün ızgarası — sabit 3 sütun, sabit yazı satırları, puan/yorum. Sahte RPC, veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj4-izgara-telefon.test.js
// Doğrulanan: 320/360/390/412/600px × kök yazı 16/18/20px → 3 sütun (300px → 2), yatay taşma yok, ad en fazla 2 satır, fiyat ve eski fiyat
// kesilmez, sağ sütundaki "+" ekran kenarında kırpılmaz ve komşu karta değmez; aynı satırdaki kartlarda ad/puan/fiyat/ikincil satır aynı y'de;
// puanlı kartta "★ 4,9 (23)" (Türkçe virgül, erişilebilirlik etiketi "5 üzerinden 4,9 puan, 23 değerlendirme", dokunma ≥44px) → dokununca
// ürün paneli yorumlar görünümüyle açılır; yorumsuz kartta "Yeni" etiketi (satır hizası aynı); seçenekli üründe en düşük seçenek fiyatı
// "X ₺'den" tek satırda; indirimli üründe ikincil satır "eski fiyat (üstü çizili) + birim fiyat"; iki tema.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:''});
 await p.evaluate(()=>{const F=window.__OZ_FX,R=F.R,T=F.T;const im=['icecekler','zeytin-zeytinyagi','bal-recel','baharat-bitki-cay','recel','kuru-yemis'];
  R.oz_public_settings=Object.assign({},R.oz_public_settings,{is_admin:false,market_enabled:true});
  R.oz_search_products=im.map((x,i)=>({id:'q'+i,name:['Sızma Zeytinyağı Erken Hasat Soğuk Sıkım Ayvalık','Süzme Bal','Soğuk Sıkım Zeytinyağı','Tarhana','Köy Peyniri, Tam Yağlı','Ceviz İçi'][i],image:'https://img.test/'+x+'.jpg',
   price_kurus:[36000,28000,9000,14500,21000,135000][i],seller_id:'s1',in_stock:true,rating_avg:[4.9,4.8,0,4.6,5,4.7][i],rating_count:[23,12,0,8,3,41][i],nv:i===0?2:1}));
  T.oz_products=R.oz_search_products.map((x,i)=>({id:x.id,description:'',net_content:['1 L','500 g','250 ml','500 g','400 g','1000 gr'][i]}));
  T.oz_variants=[{product_id:'q0',label:'1 L',price_kurus:36000,stock:5,sort:0},{product_id:'q0',label:'5 L',price_kurus:165000,stock:5,sort:1}].concat(R.oz_search_products.slice(1).map((x,i)=>({product_id:x.id,label:T.oz_products[i+1].net_content,price_kurus:x.price_kurus,compare_at_kurus:x.id==='q1'?35000:x.id==='q5'?149900:null,stock:5,sort:0})));
  R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',product_count:6,categories:[]};R.oz_producer_reviews=[];R.oz_product_reviews=[]});
 await enter(p);await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 const G=()=>p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozGrs');if(!g)return null;const cs=[...g.querySelectorAll('.ozGr')];
  const top=(c,s)=>{const e=c.querySelector(s);return e?Math.round(e.getBoundingClientRect().top):null};
  return {cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,sw:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth,vw:innerWidth,
   cards:cs.map(c=>{const R=c.getBoundingClientRect(),nm=c.querySelector('.nm'),pr=c.querySelector('.pr'),b=pr.querySelector('b,.nvp'),op=c.querySelector('.up .op'),pl=c.querySelector('.ac .ozPlus'),Q=pl?pl.getBoundingClientRect():null;
    const lh=parseFloat(getComputedStyle(nm).lineHeight),nx=cs.find(x=>x!==c&&Math.abs(x.getBoundingClientRect().top-R.top)<2&&x.getBoundingClientRect().left>R.left);
    return {id:c.dataset.pid,row:Math.round(R.top),nmLines:Math.round(nm.getBoundingClientRect().height/lh),t:[top(c,'.nm'),top(c,'.mr'),top(c,'.pr'),top(c,'.up')],
     prCut:pr.scrollWidth>pr.clientWidth+.5||(b&&b.getBoundingClientRect().right>pr.getBoundingClientRect().right+.5),
     opCut:op?op.scrollWidth>op.clientWidth+.5||op.getBoundingClientRect().right>c.querySelector('.up').getBoundingClientRect().right+.5:false,
     plus:Q?{right:Math.round(Q.right),top:Math.round(Q.top),free:nx?Q.right<=nx.getBoundingClientRect().left-.5:Q.right<=innerWidth,hit:(()=>{const s=pl.querySelector('svg').getBoundingClientRect();const e=document.elementFromPoint((s.left+s.right)/2,(s.top+s.bottom)/2);return !e||pl.contains(e)})()}:null}})}});
 // genişlik × kök yazı
 for(const fs of [16,18,20])for(const w of [300,320,360,390,412,600]){await p.setViewportSize({width:w,height:900});await p.evaluate(fs=>{document.documentElement.style.fontSize=fs+'px'},fs);
  await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(900);await p.evaluate(()=>window.scrollTo(0,0));
  const g=await G();const want=w<320?2:3;const tag='['+w+'px/'+fs+'px]';
  if(!g){fails.push(tag+' ızgara yok');continue}
  ok(g.cols===want,tag+' '+want+' sütun: '+g.cols);ok(g.sw<=0,tag+' yatay taşma yok: '+g.sw);
  ok(g.cards.every(c=>c.nmLines<=2),tag+' ad en fazla 2 satır: '+JSON.stringify(g.cards.map(c=>c.nmLines)));
  ok(g.cards.every(c=>!c.prCut&&!c.opCut),tag+' fiyat/eski fiyat kesilmez: '+JSON.stringify(g.cards.filter(c=>c.prCut||c.opCut).map(c=>c.id)));
  ok(g.cards.every(c=>!c.plus||(c.plus.right<=g.vw&&c.plus.free&&c.plus.hit)),tag+' "+" kırpılmaz, komşu karta değmez: '+JSON.stringify(g.cards.map(c=>c.plus)));
  const rows={};g.cards.forEach(c=>{(rows[c.row]=rows[c.row]||[]).push(c.t.join(','))});
  ok(Object.values(rows).every(r=>r.every(x=>x.split(',').every((v,i)=>Math.abs(v-r[0].split(',')[i])<=1))),tag+' aynı satırda ad/puan/fiyat/ikincil satır hizalı (alt piksel yuvarlama ≤1px): '+JSON.stringify(rows))}
 await p.evaluate(()=>{document.documentElement.style.fontSize=''});await p.setViewportSize({width:390,height:844});
 // içerik: puan, Yeni, fiyat biçimleri — iki tema
 for(const th of ['light','dark']){await p.evaluate(t=>{localStorage.setItem('isimi_oz_theme',t);document.body.classList.toggle('ozLt',t==='light')},th);
  await p.evaluate(()=>OZ.go('plist',{seller:'s1',sname:'Yayla'}));await p.waitForTimeout(900);
  const c=await p.evaluate(()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
   const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
   const mix=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
   const eff=e=>{const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let c={r:255,g:255,b:255,a:1};ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);if(b.a>0)c=mix(b,c)});return c};
   const cr=e=>{const z=eff(e),t=mix(P(getComputedStyle(e).color),z),x=L(t),y=L(z);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
   const o={};document.querySelectorAll('#ozRoot .ozGrs .ozGr').forEach(c=>{const q=s=>c.querySelector(s),t=s=>q(s)?q(s).textContent.replace(/\s/g,' ').trim():null,rv=q('.rvb');
    o[c.dataset.pid]={pr:t('.pr'),up:t('.up'),op:t('.up .op'),rt:t('.rt'),nw:t('.nw'),nt:t('.nt'),rv:rv?{al:rv.getAttribute('aria-label'),h:Math.round(rv.getBoundingClientRect().height),rev:rv.dataset.rev,
     over:(()=>{const a=rv.getBoundingClientRect(),m=q('.rt').getBoundingClientRect();return a.top<=m.top&&a.bottom>=m.bottom&&a.right>=m.right-1})()}:null,
     aa:[...c.querySelectorAll('.nm,.nt,.rt b,.rt small,.nw,.pr b,.up .ue,.up .op')].map(e=>[e.className||e.tagName,cr(e)]).filter(x=>x[1]<4.5)}});return o});
  ok(c.q0&&/^360,00\s₺'den$/.test(c.q0.pr)&&/^≈ 330 ₺\/L'den$/.test(c.q0.up),'['+th+'] seçenekli: en düşük seçenek fiyatı "360,00 ₺\'den" tek satır + en düşük birim fiyat (5 L → ≈ 330 ₺/L\'den): '+JSON.stringify(c.q0&&[c.q0.pr,c.q0.up]));
  ok(c.q1&&c.q1.pr==='280,00 ₺'&&c.q1.op==='350 ₺'&&/^350 ₺ 560 ₺\/kg$/.test(c.q1.up),'['+th+'] indirimli: "280,00 ₺" + "350 ₺ (üstü çizili) 560 ₺/kg": '+JSON.stringify(c.q1&&[c.q1.pr,c.q1.up]));
  ok(c.q3&&c.q3.pr==='145,00 ₺'&&c.q3.up==='≈ 290 ₺/kg','['+th+'] tek fiyatlı: "145,00 ₺" + "≈ 290 ₺/kg" (parantezsiz): '+JSON.stringify(c.q3&&[c.q3.pr,c.q3.up]));
  ok(c.q0.rt==='★ 4,9 (23)'&&c.q0.rv&&c.q0.rv.al==='5 üzerinden 4,9 puan, 23 değerlendirme'&&c.q0.rv.h>=44&&c.q0.rv.rev==='1'&&c.q0.rv.over,'['+th+'] puan "★ 4,9 (23)", etiket, 44px dokunma alanı puanın üstünde: '+JSON.stringify([c.q0.rt,c.q0.rv]));
  ok(c.q2&&c.q2.nw==='Yeni'&&!c.q2.rt&&!c.q2.rv,'['+th+'] yorumsuz üründe "Yeni", puan düğmesi yok: '+JSON.stringify(c.q2));
  ok(Object.values(c).every(x=>!x.aa.length),'['+th+'] AA ≥4.5: '+JSON.stringify(Object.entries(c).filter(e=>e[1].aa.length).map(e=>[e[0],e[1].aa])))}
 // yıldıza dokununca ürün paneli yorumlar görünümüyle açılır
 const n0=st.calls.filter(x=>x[0]==='oz_product_detail').length;
 await p.click('#ozRoot .ozGr[data-pid=q0] .rvb').catch(()=>fails.push('puan düğmesi tıklanamadı'));await p.waitForTimeout(1500);
 const rv=await p.evaluate(()=>{const h=document.querySelector('.ozOv .ozShH h2');return h?h.textContent:null});
 ok(st.calls.filter(x=>x[0]==='oz_product_detail').length>n0&&/^Değerlendirmeler/.test(rv||''),'yıldıza dokununca yorumlar görünümü açılır: '+rv);
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=sheetClose]');if(x)x.click()});await p.waitForTimeout(400);
 // kart gövdesi hâlâ normal paneli açar
 await p.click('#ozRoot .ozGr[data-pid=q3] .go .ph').catch(()=>fails.push('kart tıklanamadı'));await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS .ozPName')),'kart gövdesi ürün panelini açar');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('aj4-izgara-telefon BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aj4-izgara-telefon: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('aj4-izgara-telefon HATA:',e);process.exit(1)});
