// W3: sepette satıcı grubu başına "Ücretsiz kargoya X ₺ kaldı" çubuğu — 390px, sahte veri (oz_quote sahte, sunucu kuralıyla:
// grup ara toplamı ≥ satıcı eşiği ise kargo 0, değilse 49,90 ₺). Çalıştırma: node tests/oz-ui/w3-kargo-cubuk.test.js
// Doğrulanan: eşik altı (kalan tutar kuruşuyla doğru, altın ilerleme oranı), tam eşikte ve üstünde "✓ Kargo ücretsiz", eşik yok / 0 → çubuk
// yok, iki satıcıda her grubun ÜSTÜNDE kendi çubuğu, adet artır/azalt ile güncellenir, ödeme toplamı oz_quote toplamıyla aynı,
// misafir sepetinde de var; kahve zemin, altın kenar, AA kontrast, 390px taşma yok.
const {chromium,open,enter}=require('./harness.js');
const V={v1:{seller_id:'s1',seller_name:'Yayla',name:'Zeytinyağı',price:65049},v2:{seller_id:'s1',seller_name:'Yayla',name:'Bal',price:50000},v3:{seller_id:'s2',seller_name:'Ege',name:'Reçel',price:30000}};
async function scen(br,{fo,cart,logged=true,after}){
 const {p,st}=await open(br,{w:390,h:844,visible:true,logged});
 await p.evaluate(([V,fo,cart])=>{const F=window.__OZ_FX;F.T.oz_addresses=[];
  localStorage.setItem('isimi_oz_cart',JSON.stringify(cart.map(([v,q])=>({variant_id:v,product_id:'p'+v,name:V[v].name,label:'',price_kurus:V[v].price,seller_id:V[v].seller_id,seller_name:V[v].seller_name,qty:q,stock:20,nv:1}))));
  F.quote=function(items){const gs={};(items||[]).forEach(x=>{const v=V[x.variant_id];if(!v)return;const g=gs[v.seller_id]=gs[v.seller_id]||{seller_id:v.seller_id,seller_name:v.seller_name,handling_days:2,items:[],subtotal_kurus:0};
    g.items.push({variant_id:x.variant_id,product_id:'p'+x.variant_id,name:v.name,label:'',image:null,unit_price_kurus:v.price,qty:x.qty,line_total_kurus:v.price*x.qty,stock:20,issue:null});g.subtotal_kurus+=v.price*x.qty});
   const groups=Object.values(gs).map(g=>{const t=fo[g.seller_id];g.shipping_kurus=(t!=null&&g.subtotal_kurus>=t)?0:4990;g.total_kurus=g.subtotal_kurus+g.shipping_kurus;return g});
   const sub=groups.reduce((n,g)=>n+g.subtotal_kurus,0),sh=groups.reduce((n,g)=>n+g.shipping_kurus,0);return {groups,subtotal_kurus:sub,shipping_kurus:sh,total_kurus:sub+sh,issues:[]}};
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){if(fn==='oz_producer_detail'){window.__ozLog(fn,a);await new Promise(r=>setTimeout(r,20));return {id:a.p_id,display_name:a.p_id,free_ship_over_kurus:fo[a.p_id]==null?null:fo[a.p_id]}}return o(fn,a)}},[V,fo,cart]);
 await enter(p);await p.waitForTimeout(600);
 try{await p.click('#ozNav [data-k=cart]',{timeout:3000})}catch(e){}await p.waitForTimeout(1400);
 return {p,st};
}
const G=p=>p.evaluate(()=>{const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2]}};const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const cr=(a,b)=>+((Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)).toFixed(2);
  const gs=[...document.querySelectorAll('#ozRoot .ozCoG2, #ozRoot .ozCard')].filter(g=>g.querySelector('[data-a=cQty], [data-a=cDel], .ozShipP, [data-a=cartQty]')||g.querySelector('.ozCoL, .ozCartL'));
  const tot=((document.getElementById('ozRoot').innerText.match(/Toplam\s*([\d.]+,\d\d\s₺)/)||[])[1]||'').replace(/\s/g,' ')||null;
  return {page:document.documentElement.scrollWidth,tot,groups:gs.map(g=>{const s=g.querySelector('.ozShipP');const name=(g.querySelector('.hd b, .ozRow2 b')||{}).textContent;if(!s)return {name,none:true};
   const i=s.querySelector('.bar i');const bg=rgb(getComputedStyle(s).backgroundColor);const sp=s.querySelector('span');const b=s.querySelector('b');
   return {name,t:s.innerText.replace(/\s+/g,' ').trim(),ok:s.classList.contains('ok'),w:i?Math.round(i.getBoundingClientRect().width/i.parentNode.getBoundingClientRect().width*100):null,
    first:g.firstElementChild===s,bar:i?getComputedStyle(i).backgroundColor:null,bd:rgb(getComputedStyle(s).borderTopColor),bgL:+lum(bg).toFixed(3),
    cr:cr(rgb(getComputedStyle(sp).color),bg),crB:b?cr(rgb(getComputedStyle(b).color),bg):null,inside:s.getBoundingClientRect().right<=391}})}});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const gold=c=>/rgb\(242, 193, 78\)/.test(c||'');
 // 1) eşik altı (kuruş): 1.000 ₺ eşik, 650,49 ₺ → 349,51 ₺ kaldı, %65
 let {p,st}=await scen(br,{fo:{s1:100000},cart:[['v1',1]]});let g=await G(p);let x=g.groups[0]||{};
 ok(x.t==='Ücretsiz kargoya 349,51 ₺ kaldı'&&!x.ok&&x.w>=64&&x.w<=66&&gold(x.bar),'eşik altı: kalan tutar kuruşuyla + altın çubuk: '+JSON.stringify(x));
 ok(x.first,'çubuk satıcı grubunun üstünde olmalı');
 ok(x.bgL<0.1&&x.bd.r>x.bd.b+30&&x.cr>=4.5&&x.crB>=4.5&&x.inside&&g.page<=390,'kahve zemin, altın kenar, AA, taşma yok: '+JSON.stringify(x)+' '+g.page);
 ok(g.tot==='700,39 ₺','ödeme toplamı oz_quote toplamı (650,49 + 49,90): '+g.tot);
 // adet artır → eşik üstü, sonra azalt → tekrar eşik altı
 try{await p.click('#ozRoot [data-a=cQty][data-id=v1][data-d="1"]',{timeout:3000})}catch(e){fails.push('adet artırılamadı')}await p.waitForTimeout(1300);
 g=await G(p);x=g.groups[0]||{};ok(x.ok&&x.t==='✓ Kargo ücretsiz'&&x.w===null&&g.tot==='1.300,98 ₺','artırınca "Kargo ücretsiz", toplam kargosuz: '+JSON.stringify(x)+' '+g.tot);
 try{await p.click('#ozRoot [data-a=cQty][data-id=v1][data-d="-1"]',{timeout:3000})}catch(e){fails.push('adet azaltılamadı')}await p.waitForTimeout(1300);
 g=await G(p);x=g.groups[0]||{};ok(x.t==='Ücretsiz kargoya 349,51 ₺ kaldı','azaltınca tekrar kalan tutar: '+JSON.stringify(x));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 // 2) tam eşikte: 2 × 500 = 1.000 ₺
 ({p,st}=await scen(br,{fo:{s1:100000},cart:[['v2',2]]}));g=await G(p);x=g.groups[0]||{};
 ok(x.ok&&x.t==='✓ Kargo ücretsiz'&&x.cr>=4.5&&g.tot==='1.000,00 ₺','tam eşikte "Kargo ücretsiz" (AA), toplam aynı: '+JSON.stringify(x)+' '+g.tot);await p.context().close();
 // 3) eşik üstü
 ({p,st}=await scen(br,{fo:{s1:100000},cart:[['v2',3]]}));g=await G(p);x=g.groups[0]||{};ok(x.ok&&x.t==='✓ Kargo ücretsiz','eşik üstü: '+JSON.stringify(x));await p.context().close();
 // 4) eşik yok / 0
 for(const fo of [null,0]){({p,st}=await scen(br,{fo:{s1:fo},cart:[['v1',1]]}));g=await G(p);ok(g.groups.length&&g.groups.every(y=>y.none),'eşik '+fo+' → çubuk yok: '+JSON.stringify(g.groups));await p.context().close()}
 // 5) iki satıcı: her grubun üstünde kendi çubuğu
 ({p,st}=await scen(br,{fo:{s1:100000,s2:50000},cart:[['v1',1],['v3',2]]}));g=await G(p);
 const a=g.groups.find(y=>y.name==='Yayla')||{},b=g.groups.find(y=>y.name==='Ege')||{};
 ok(g.groups.length===2&&a.t==='Ücretsiz kargoya 349,51 ₺ kaldı'&&a.first&&b.ok&&b.first,'iki satıcı: her grupta kendi çubuğu üstte: '+JSON.stringify(g.groups));
 ok(g.tot==='1.300,39 ₺','iki satıcıda toplam oz_quote ile aynı (650,49+49,90+600,00): '+g.tot);await p.context().close();
 // 6) misafir sepeti
 ({p,st}=await scen(br,{fo:{s1:100000},cart:[['v1',1]],logged:false}));g=await G(p);x=g.groups[0]||{};
 ok(x.t==='Ücretsiz kargoya 349,51 ₺ kaldı'&&x.first&&g.tot==='700,39 ₺','misafir sepetinde de çubuk, toplam aynı: '+JSON.stringify(x)+' '+g.tot);
 ok(!st.errors.length,'[misafir] sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('w3-kargo-cubuk BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('w3-kargo-cubuk: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('w3-kargo-cubuk HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
