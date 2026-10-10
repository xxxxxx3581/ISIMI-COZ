// T1: ortak ürün liste kartı — 390px, sahte veri (RPC sahte). Çalıştırma: node tests/oz-ui/t1-kart.test.js
// Doğrulanan: sağ üstte kalp (mevcut oz_toggle_favorite akışı; dolu/boş; tıklama kartı/paneli AÇMAZ); kalbin altında yıldız
// (yorum yoksa yok); yıldıza dokununca o ürünün paneli değerlendirmeler görünümüyle açılır, "‹ Ürüne dön" panele döner.
// Ad, kalp+yıldız bloğuyla çakışmaz (390px ve büyük yazı); "+" seçenek metniyle aynı satırda, ayrı yıldız satırı yok.
// Seçenek metni: ağırlık → "N gramaj seçeneği" (birimsiz "500" etiketi dahil: canlıdaki bal), hacim → "N hacim seçeneği", diğer → "N seçenek".
// Kart ve düğmelerde metin seçilmez (user-select:none); ürün paneli metni seçilebilir kalır.
const {chromium,open,enter}=require('./harness.js');
const BIG='html:root .ozGc .nm{font-size:22px!important}html:root .ozGc .ds{font-size:18px!important}html:root .ozGc .pr b{font-size:22px!important}html:root .ozGc .pr small{font-size:16px!important}html:root .ozGc .rt{font-size:17px!important}';
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||700);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const F=window.__OZ_FX,T=F.T,R=F.R;
  T.oz_products=[{id:'p0',description:'Zeytinyağı açıklaması',net_content:'1000 gr'},{id:'p1',description:'Erzincan Karakovan Balı doğal ortamda',net_content:'800 gr'},{id:'p2',description:'Süt'},{id:'p3',description:'Kavanoz'}];
  T.oz_variants=[{product_id:'p0',label:'1kg',price_kurus:40000,stock:9,sort:0},{product_id:'p0',label:'3kg',price_kurus:110000,stock:9,sort:1},
   {product_id:'p1',label:'800gr',price_kurus:100000,stock:9,sort:0},{product_id:'p1',label:'500',price_kurus:60000,stock:9,sort:1},
   {product_id:'p2',label:'500 ml',price_kurus:5000,stock:9,sort:0},{product_id:'p2',label:'1 L',price_kurus:9000,stock:9,sort:1},
   {product_id:'p3',label:'Kavanoz',price_kurus:5000,stock:9,sort:0},{product_id:'p3',label:'Teneke',price_kurus:9000,stock:9,sort:1}];
  R.oz_search_products=R.oz_search_products.map((x,i)=>Object.assign({},x,i===1?{name:'Erzincan kara kovan balı uzun ürün adı deneme',rating_avg:5,rating_count:6}:i===2?{rating_count:0,rating_avg:0}:{}));
  R.oz_my_favorites=[{id:'p1'}];R.oz_toggle_favorite=true});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('plist',{seller:'s1'}));await p.waitForTimeout(1500);
 const C=()=>p.evaluate(()=>[...document.querySelectorAll('#ozRoot .ozGc')].map(c=>{const R=e=>e?e.getBoundingClientRect():null;const nm=c.querySelector('.nm'),tr=c.querySelector('.tr'),fv=c.querySelector('.tr [data-a=fav]'),rt=c.querySelector('.tr .rt'),pr=c.querySelector('.ft .pr'),ac=c.querySelector('.ac');
  const ov=(a,b)=>a&&b&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
  const glyphs=e=>{if(!e)return [];const out=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;const box=e.getBoundingClientRect();while((t=w.nextNode())){if(!t.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);out.push(...[...rg.getClientRects()].filter(x=>x.width>0&&x.top<box.bottom-1&&x.bottom>box.top+1))}return out};
  const cr=R(c),fr=R(fv),rr=R(rt),ar=R(ac),pg=glyphs(pr),ng=glyphs(nm);
  return {id:c.dataset.pid,fav:!!fv,on:!!fv&&fv.classList.contains('on'),rt:rt?rt.innerText.replace(/\s+/g,' ').trim():null,topRight:!!fr&&cr.right-fr.right<=14&&fr.top-cr.top<=14,rtUnder:!rr||(rr.top>=fr.bottom-2&&Math.abs(rr.right-fr.right)<=10),
   nmHit:ng.some(g=>ov(g,fr)||ov(g,rr)),pr:pr?pr.innerText.replace(/\s+/g,' ').trim():'',sameRow:!!ar&&pg.length>0&&pg.some(g=>g.top<ar.bottom&&g.bottom>ar.top),
   oldRow:!!c.querySelector(':scope > .rt'),sel:getComputedStyle(c).userSelect,nmSel:getComputedStyle(nm).userSelect,plusSel:ac&&ac.querySelector('button')?getComputedStyle(ac.querySelector('button')).userSelect:''}}));
 const by=l=>{const m={};l.forEach(x=>m[x.id]=x);return m};
 for(const big of [false,true]){
  if(big)await p.addStyleTag({content:BIG});await p.waitForTimeout(300);
  const tag=big?'[büyük yazı] ':'';const L=await C();const M=by(L);
  ok(L.length>=4&&L.every(c=>c.fav&&c.topRight),tag+'her kartta sağ üstte kalp: '+JSON.stringify(L.map(c=>[c.id,c.fav,c.topRight])));
  ok(L.every(c=>!c.nmHit),tag+'ad kalp/yıldızla çakışmamalı: '+JSON.stringify(L.filter(c=>c.nmHit).map(c=>c.id)));
  ok(L.every(c=>c.rtUnder&&!c.oldRow),tag+'yıldız kalbin altında, ayrı yıldız satırı yok: '+JSON.stringify(L.map(c=>[c.id,c.rtUnder,c.oldRow])));
  ok(['p0','p1','p2','p3'].every(k=>M[k]&&M[k].sameRow),tag+'"+" seçenek metniyle aynı satırda: '+JSON.stringify(['p0','p1','p2','p3'].map(k=>M[k]&&[k,M[k].sameRow])));
  if(!big){
   ok(M.p1&&M.p1.on&&M.p0&&!M.p0.on,'favori dolu/boş durumu: '+JSON.stringify([M.p1&&M.p1.on,M.p0&&M.p0.on]));
   ok(M.p1&&M.p1.rt==='★ 5,0 (6)'&&M.p2&&M.p2.rt===null,'yıldız: yorumluda var, yorumsuzda yok: '+JSON.stringify([M.p1&&M.p1.rt,M.p2&&M.p2.rt]));
   ok(M.p1&&M.p1.pr==='2 gramaj seçeneği','bal (800gr + birimsiz 500) → "2 gramaj seçeneği": '+(M.p1&&M.p1.pr));
   ok(M.p0&&M.p0.pr==='2 gramaj seçeneği'&&M.p2&&M.p2.pr==='2 hacim seçeneği'&&M.p3&&M.p3.pr==='2 seçenek','seçenek metinleri: '+JSON.stringify([M.p0&&M.p0.pr,M.p2&&M.p2.pr,M.p3&&M.p3.pr]));
   ok(L.every(c=>c.sel==='none'&&c.nmSel==='none'&&c.plusSel==='none'),'kart ve düğmelerde metin seçilmemeli: '+JSON.stringify(L.map(c=>[c.sel,c.nmSel,c.plusSel])));
   ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390px yatay taşma olmamalı');
  }
 }
 // kalp: kartı/paneli açmaz, favori değişir
 const y0=await p.evaluate(()=>scrollY);
 await click(p,'.ozGc[data-pid=p0] .tr [data-a=fav]',900);
 ok(st.calls.some(c=>c[0]==='oz_toggle_favorite'&&c[1].p_product==='p0'),'kalp oz_toggle_favorite(p0) çağırmalı');
 ok(!(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')))&&!st.calls.some(c=>c[0]==='oz_product_detail'),'kalp kartı/paneli açmamalı');
 ok(await p.evaluate(()=>{const b=document.querySelector('.ozGc[data-pid=p0] .tr [data-a=fav]');return !!b&&b.classList.contains('on')&&b.getAttribute('aria-pressed')==='true'})&&await p.evaluate(()=>!!document.querySelector('#ozRoot .ozPlH')),'kalp dolmalı, sayfa aynı kalmalı');
 // yıldız: panel değerlendirmelerle açılır
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.id='p1';d.name='Erzincan kara kovan balı';d.rating_count=2});
 await click(p,'.ozGc[data-pid=p1] .tr .rt',1500);
 const rv=await p.evaluate(()=>{const o=document.querySelector('.ozOv');return o?{t:(o.querySelector('.ozShH h2')||{}).textContent,back:!!o.querySelector('[data-a=pdBack]'),n:o.querySelectorAll('.ozRev').length}:null});
 const last=st.calls.filter(c=>c[0]==='oz_product_detail').pop();
 ok(rv&&/^Değerlendirmeler/.test(rv.t)&&rv.back&&rv.n===2&&last&&last[1].p_id==='p1','yıldız → p1 paneli değerlendirmelerle açılmalı: '+JSON.stringify(rv)+' '+JSON.stringify(last&&last[1]));
 await click(p,'.ozOv [data-a=pdBack]',600);
 const pd=await p.evaluate(()=>{const o=document.querySelector('.ozOv.ozPdS');if(!o)return null;const h=o.querySelector('.ozPName');return {nm:h&&h.textContent,sel:h?getComputedStyle(h).userSelect:''}});
 ok(pd&&pd.nm==='Erzincan kara kovan balı','"‹ Ürüne dön" ürün paneline dönmeli: '+JSON.stringify(pd));
 ok(pd&&pd.sel!=='none','panel metni seçilebilir kalmalı: '+JSON.stringify(pd));
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 // ada dokunma eskisi gibi paneli açar (değerlendirme görünümü değil)
 await click(p,'.ozGc[data-pid=p1] .nm',1300);
 ok(await p.evaluate(()=>!!document.querySelector('.ozOv.ozPdS')),'ada dokunma paneli açmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('t1-kart BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('t1-kart: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('t1-kart HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
