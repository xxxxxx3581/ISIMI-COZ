// U2: ürün liste kartında seçenek etiketi — 390px, sahte veri. Çalıştırma: node tests/oz-ui/u2-etiket.test.js
// Doğrulanan (Tüm ürünler, arama): çok seçenekli kartta "N gramaj/hacim seçeneği / N seçenek" "+"ın HEMEN solunda etiket
// (sağ kenarı "+" düğmesinin sol kenarına ≤12px, aynı satır, ≥32px yükseklik, altın yazı/kenar, AA kontrast); etikete
// dokunma "+" ile aynı küçük seçenek penceresini açar, kartı/paneli açmaz; tek fiyatlı kartta etiket yok, fiyat aynı.
// Büyük yazıda etiket sığmazsa "+"ın hemen üstüne, sağa hizalı geçer; etiket, "+" ve diğer yazılar üst üste binmez.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .pr b{font-size:22px!important}html:root .ozGc .pr small{font-size:16px!important}html:root .ozGc .rt{font-size:17px!important}html:root .ozGc .opt{font-size:20px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;localStorage.removeItem('isimi_oz_cart');
  T.oz_products=[{id:'p0',description:'Zeytinyağı açıklaması',net_content:'1000 gr'},{id:'p1',description:'Süt',net_content:'1 L'},{id:'p2',description:'Tek fiyat'},{id:'p4',description:'Kavanoz'},{id:'p3',description:'Stoksuz'}];
  T.oz_variants=[{product_id:'p0',label:'1kg',price_kurus:40000,stock:9,sort:0},{product_id:'p0',label:'3kg',price_kurus:110000,stock:9,sort:1},{product_id:'p0',label:'5kg',price_kurus:180000,stock:9,sort:2},
   {product_id:'p1',label:'500 ml',price_kurus:5000,stock:9,sort:0},{product_id:'p1',label:'1 L',price_kurus:9000,stock:9,sort:1},
   {product_id:'p2',label:'1 L',price_kurus:9000,compare_at_kurus:12000,stock:9,sort:0},
   {product_id:'p4',label:'Kavanoz',price_kurus:5000,stock:9,sort:0},{product_id:'p4',label:'Teneke',price_kurus:9000,stock:9,sort:1},{product_id:'p3',label:'250 g',price_kurus:5000,stock:0,sort:0},{product_id:'p3',label:'500 g',price_kurus:9000,stock:0,sort:1}];
  const d=R.oz_product_detail;d.id='p0';d.name='Zeytinyağı';d.variants=[{id:'k1',label:'1kg',price_kurus:40000,stock:9},{id:'k3',label:'3kg',price_kurus:110000,stock:9}]});
 await enter(p);await p.waitForTimeout(600);
 const G=()=>p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozGc')].map(c=>{const R=e=>e?e.getBoundingClientRect():null;const o=c.querySelector('.ft .opt'),pl=c.querySelector('.ac .ozPlus, .ac .ozPStep');
  const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};const mix=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const ov=(a,b)=>a&&b&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;const box=e.getBoundingClientRect();while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  const or=R(o),ar=R(pl),cr0=R(c);let ratio=null,col=null,bd=null;
  if(o){const s=getComputedStyle(o);const cbg=rgb(getComputedStyle(c).backgroundColor);const bg=mix(rgb(s.backgroundColor),cbg);col=rgb(s.color);ratio=+cr(mix(col,bg),bg).toFixed(2);bd=rgb(s.borderTopColor)}
  const others=['.nm','.ds','.tr','.ft .pr'].flatMap(q=>glyphs(c.querySelector(q)));
  return {id:c.dataset.pid,opt:o?o.textContent:null,dis:!!o&&o.disabled,pr:(c.querySelector('.ft .pr')||{}).innerText||null,
   gap:or&&ar?Math.round(ar.left-or.right):null,sameRow:!!(or&&ar&&or.top<ar.bottom&&or.bottom>ar.top),above:!!(or&&ar&&or.bottom<=ar.top+1&&Math.abs(or.right-ar.right)<=14),
   h:or?Math.round(or.height):0,ratio,gold:!!col&&col.r>220&&col.g>170&&col.b<120,goldBorder:!!bd&&bd.r>220&&bd.g>170&&bd.b<120,
   hit:!!o&&(ov(or,ar)||others.some(g=>ov(g,or))),inside:!or||(or.left>=cr0.left&&or.right<=cr0.right+1&&or.bottom<=cr0.bottom+1)}}));
 for(const [where,go] of [['Tüm ürünler',()=>OZ.go('plist',{seller:'s1'})],['Arama',()=>OZ.go('search',{q:'a'})]]){
  await p.evaluate(go);await p.waitForTimeout(1500);
  const L=await G();const M={};L.forEach(x=>M[x.id]=x);const t='['+where+'] ';
  ok(M.p0&&M.p0.opt==='3 gramaj seçeneği'&&M.p1&&M.p1.opt==='2 hacim seçeneği'&&M.p4&&M.p4.opt==='2 seçenek','etiket metinleri: '+JSON.stringify([M.p0&&M.p0.opt,M.p1&&M.p1.opt,M.p4&&M.p4.opt]));
  ok(M.p3&&M.p3.opt==='2 gramaj seçeneği'&&M.p3.dis&&M.p3.ratio>=4.5,t+'stoksuz üründe etiket pasif ve okunur: '+JSON.stringify(M.p3));
  ['p0','p1','p4'].forEach(k=>{const x=M[k];if(!x){fails.push(t+k+' yok');return}
   ok(x.sameRow&&x.gap>=0&&x.gap<=12,t+k+' etiket "+"ın hemen solunda, aynı satırda (≤12px): '+JSON.stringify(x));
   ok(x.h>=32&&x.gold&&x.goldBorder&&x.ratio>=4.5,t+k+' etiket ≥32px, altın yazı/kenar, AA: '+JSON.stringify(x));
   ok(!x.hit&&x.inside,t+k+' etiket çakışmamalı/taşmamalı: '+JSON.stringify(x));
   ok(x.pr===null,t+k+' çok seçenekte ayrı fiyat/seçenek yazısı olmamalı: '+x.pr)});
  ok(M.p2&&M.p2.opt===null&&/90,00\s₺/.test(M.p2.pr||''),t+'tek fiyatlı üründe etiket yok, fiyat aynı: '+JSON.stringify(M.p2));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),t+'390px taşma olmamalı');
 }
 // etikete dokunma → küçük seçenek penceresi, kart/panel değil
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 try{await p.click('.ozGc[data-pid=p0] .ft .opt',{timeout:3000})}catch(e){fails.push('etiket tıklanamadı')}await p.waitForTimeout(900);
 const s=await p.evaluate(()=>({pk:!!document.querySelector('.ozOv.ozPkS'),full:!!document.querySelector('.ozOv.ozPdS'),rows:document.querySelectorAll('.ozOv.ozPkS .ozPkO').length,list:!!document.querySelector('#ozRoot .ozPlH')}));
 ok(s.pk&&!s.full&&s.rows===2&&s.list,'etiket "+" ile aynı küçük seçenek penceresini açmalı, kartı açmamalı: '+JSON.stringify(s));
 ok(st.calls.filter(c=>c[0]==='oz_product_detail').length===1,'etiket ppPlus ile tek ürün okuması yapmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // "+" davranışı aynı
 try{await p.click('.ozGc[data-pid=p0] .ac .ozPlus',{timeout:3000})}catch(e){fails.push('"+" tıklanamadı')}await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPkS')&&!document.querySelector('.ozOv.ozPdS')),'"+" yine küçük pencereyi açmalı');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // büyük yazı
 await p.addStyleTag({content:BIG});await p.waitForTimeout(300);
 const L=await G();
 L.filter(x=>x.opt).forEach(x=>{ok(!x.hit&&x.inside,'[büyük yazı] '+x.id+' çakışma/taşma olmamalı: '+JSON.stringify(x));ok((x.sameRow&&x.gap>=0&&x.gap<=12)||x.above,'[büyük yazı] '+x.id+' etiket "+"ın solunda ya da hemen üstünde sağa hizalı: '+JSON.stringify(x))});
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('u2-etiket BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('u2-etiket: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('u2-etiket HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
