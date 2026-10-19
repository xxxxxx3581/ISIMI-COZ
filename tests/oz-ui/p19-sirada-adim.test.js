// Paket 19: renkli "sıradaki adım" düğmeleri (yalnız arayüz) — 390px ve 1280px, krem ve koyu tema, sahte veri, ağa çıkmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p19-sirada-adim.test.js   (P19_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Ekranlar: Yemek müşteri sipariş listesi + takip (new, preparing, on_the_way, delivered), Yemek işletme kartları (new, preparing, ready),
// Özüne Dön satıcı sipariş kartları (new, accepted, packed) ve müşteri sipariş detayı (shipped, awaiting_payment).
// Doğrulanan: durum başına en fazla bir birincil (.btnNext) ve beklenen etiket/renk; tıklama eski işlevi çağırır (aynı onclick / data-a);
// yatay taşma yok; görünür düğmeler ≥44px; nabız yalnız izinli düğmelerde ve prefers-reduced-motion altında animasyon yok.
// P19 düzeltme: Özüne Dön kargoda tek ana düğme "takip et" (birincil .btnNext yok), "Kargom elime ulaştı" sönük, takip et'in altında, ordDeliver onayı aynı;
// iade/cayma sönük bağlantı; Yemek teslimat kodu yalnız platform kuryesinde; restoran kuryesi teslimde kod sorulmaz; kaydırma sonunda alt çubuk ve
// alt menü içerikle/kendi aralarında çakışmaz (390px; görüntü alanı ekran görüntüsü üst/alt).
const {chromium,open,enter,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P19_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const NOW=Date.now(),iso=m=>new Date(NOW+m*60000).toISOString();
/* Yemek sahte verisi: supabaseAuthRequest (Q/RPC) yönlendirici */
function foodFx(){
 const ord=(id,status,min)=>({id,status,total_kurus:25000,created_at:iso(min),delivery_mode:'platform_delivery',venue_id:'v1',food_venues:{name:'Test Lokanta',image_url:''},food_order_items:[{name_snapshot:'Kaşarlı pide',quantity:1}],food_reviews:null});
 const track=(st,mode)=>({order:{id:'f-'+st,no:'A1B2',status:st,delivery_mode:mode||'platform_delivery',created_at:iso(-30),total_kurus:25000,subtotal_kurus:22000,delivery_fee_kurus:3000,platform_fee_kurus:0,discount_kurus:0,payment_method:'cash',address_text:'Bornova, İzmir',phone:'05320000000',estimated_delivery_at:iso(20),estimated_ready_at:iso(10),note:null},
  venue:{name:'Test Lokanta',phone:'02320000000',lat:null,lng:null},
  delivery:st==='on_the_way'&&!mode?{status:'on_the_way',courier:{name:'Kurye Kaan',vehicle:'motorcycle',phone:'05000000000',rating_avg:4.8},location:null}:null,
  items:[{name:'Kaşarlı pide',quantity:1,line_total_kurus:22000,options:[]}],events:[],issues:[],review:null,delivery_code:'4821',
  can:{review:st==='delivered',review_courier:false,report:true,cancel:st==='new'}});
 const biz=(id,status,min,mode)=>({id,no:id.toUpperCase(),status,delivery_mode:mode||'self_delivery',created_at:iso(min),total_kurus:31000,payment_method:'cash',items:[{name:'Lahmacun',quantity:2,options:[]}],address_text:'Bornova',phone:'05320000000',estimated_ready_at:['accepted','preparing'].includes(status)?iso(15):null});
 return {orders:[ord('f-new','new',-2),ord('f-preparing','preparing',-10),ord('f-on_the_way','on_the_way',-25),ord('f-delivered','delivered',-90)],
  track:{new:track('new'),preparing:track('preparing'),on_the_way:track('on_the_way'),delivered:track('delivered'),self:track('near_customer','self_delivery'),pickup:track('ready','pickup')},
  biz:{new:[biz('n2','new',-1),biz('n1','new',-4)],preparing:[biz('p1','preparing',-12)],ready:[biz('r1','ready',-20)],courier_wait:[],active_delivery:[]}};
}
async function foodPage(br,o){
 const r=await open(br,o);const {p}=r;
 await p.evaluate(({fx,light})=>{
  document.documentElement.setAttribute('data-theme',light?'light':'dark');
  window.__FD=fx;window.__FDC=[];
  window.supabaseAuthRequest=async function(m,pth,b){window.__FDC.push([m,pth,b]);await new Promise(r=>setTimeout(r,10));const F=window.__FD,cl=x=>JSON.parse(JSON.stringify(x));
   if(m==='POST'&&pth.startsWith('rpc/')){const fn=pth.slice(4);
    if(fn==='food_order_tracking')return cl(F.track[b.p_order_id.replace(/^f-/,'')]);
    if(fn==='food_whoami')return {venues:[{id:'v1',name:'Test Lokanta',role:'owner'}]};
    if(fn==='food_venue_orders'){const c={};for(const k in F.biz)c[k]=F.biz[k].length;return {orders:cl(F.biz[b.p_section]||[]),counts:c,summary:{today_orders:4,today_revenue_kurus:90000}}}
    return []}
   if(pth.startsWith('food_orders?select=id,status'))return cl(F.orders);
   if(pth.startsWith('food_venues?'))return [{id:'v1',name:'Test Lokanta',is_open:true,is_active:true,working_hours:null,delivery_mode:'self_delivery',delivery_provider:null,prep_time_min:20}];
   return []};
 },{fx:foodFx(),light:o.light});
 return r;
}
/* ölçüm: birincil sayısı/etiketleri, düğme yükseklikleri, nabız animasyonu */
const measure=(p,root)=>p.evaluate(root=>{const R=document.querySelector(root);if(!R)return null;
 const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
 const pri=[...R.querySelectorAll('.btnNext')].filter(vis);
 const small=[...R.querySelectorAll('.btnNext,.btnDanger,.btnSoft')].filter(vis).filter(e=>e.getBoundingClientRect().height<44).map(e=>e.textContent.trim()+':'+Math.round(e.getBoundingClientRect().height));
 return {pri:pri.map(e=>({t:e.textContent.trim(),c:e.className,h:Math.round(e.getBoundingClientRect().height),bg:getComputedStyle(e).backgroundColor,an:getComputedStyle(e).animationName,on:e.getAttribute('onclick')||'',a:e.dataset.a||''})),
  danger:[...R.querySelectorAll('.btnDanger')].filter(vis).map(e=>({t:e.textContent.trim(),col:getComputedStyle(e).color,bd:getComputedStyle(e).borderTopColor})),small,
  pulse:[...R.querySelectorAll('.btnPulse')].filter(vis).map(e=>e.textContent.trim()+'|'+getComputedStyle(e).animationName)}},root);
const PULSE_OK=/Kabul et|Teslim aldım|canlı izle/;
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const shots=[];
 const shot=async(p,name)=>{if(!SHOTS)return;const f=path.join(SHOTS,name+'.png');await p.screenshot({path:f,fullPage:true});shots.push(f)};
 const common=async(p,tag,root,m,rm)=>{
  ok(m,tag+': ekran yok ('+root+')');if(!m)return;
  ok((await overflow(p))<=0,tag+': yatay taşma '+(await overflow(p))+'px');
  ok(!m.small.length,tag+': 44px altı düğme: '+m.small.join(', '));
  ok(m.pri.every(x=>x.h>=56),tag+': birincil 56px altı: '+JSON.stringify(m.pri.map(x=>x.t+':'+x.h)));
  m.pulse.forEach(x=>{ok(PULSE_OK.test(x),tag+': izinsiz nabız: '+x);ok(rm?/\|none$/.test(x):/\|nxPulse$/.test(x),tag+': nabız animasyonu '+(rm?'kapalı olmalı':'açık olmalı')+': '+x)});
 };
 for(const light of [true,false])for(const w of [390,1280]){
  const th=light?'krem':'koyu',K=th+'-'+w;
  for(const rm of [false,true]){
   const tg=K+(rm?'-azhareket':'');
   /* ---------- Yemek müşteri ---------- */
   let {ctx,p,st}=await foodPage(br,{w,h:844,visible:true,light});
   if(rm)await p.emulateMedia({reducedMotion:'reduce'});
   await p.evaluate(()=>showFoodOrders());await p.waitForTimeout(900);
   let m=await measure(p,'#fdOList');await common(p,tg+' Yemek liste (aktif)','#fdOList',m,rm);
   ok(m&&JSON.stringify(m.pri.map(x=>x.t).sort())===JSON.stringify(['📍 Siparişi izle','📍 Siparişi izle','🛵 Siparişi canlı izle'].sort()),tg+' Yemek liste: kart başına bir birincil: '+JSON.stringify(m&&m.pri.map(x=>x.t)));
   ok(await p.evaluate(()=>[...document.querySelectorAll('#fdOList .fdOCard')].every(c=>c.querySelectorAll('.btnNext').length===1)),tg+' Yemek liste: her kartta tam bir birincil');
   ok(m&&m.pri.every(x=>/^showFoodOrderDetail\('f-/.test(x.on)),tg+' Yemek liste: onclick aynı (showFoodOrderDetail)');
   if(!rm)await shot(p,'yemek-liste-aktif-'+K);
   await p.evaluate(()=>foodOrdersTab('past'));await p.waitForTimeout(300);
   m=await measure(p,'#fdOList');await common(p,tg+' Yemek liste (geçmiş)','#fdOList',m,rm);
   ok(m&&m.pri.length===1&&m.pri[0].t==='★ Değerlendir'&&/btnNextStar/.test(m.pri[0].c)&&/^foodReview\('f-delivered'/.test(m.pri[0].on),tg+' Yemek liste teslim: ★ Değerlendir birincil: '+JSON.stringify(m&&m.pri));
   if(!rm)await shot(p,'yemek-liste-gecmis-'+K);
   // tıklama: eski işlev çağrılır (casus)
   if(!rm){await p.evaluate(()=>{window.__spy=[];const f=window.foodReview;window.foodReview=function(){window.__spy.push(['foodReview',...arguments])};window.__unspy=()=>{window.foodReview=f}});
    await p.evaluate(()=>document.querySelector('#fdOList .btnNext').click());
    ok(JSON.stringify(await p.evaluate(()=>window.__spy))==='[["foodReview","f-delivered",true]]',tg+' Yemek liste: Değerlendir → foodReview: '+JSON.stringify(await p.evaluate(()=>window.__spy)));
    await p.evaluate(()=>window.__unspy());}
   const expT={new:null,preparing:null,on_the_way:['🗺 Siparişini izle','foodTrackOpen','btnNextBlue'],delivered:['★ Siparişi değerlendir','foodReview','btnNextStar']};
   for(const s of ['new','preparing','on_the_way','delivered']){
    await p.evaluate(s=>showFoodOrderDetail('f-'+s),s);await p.waitForTimeout(900);
    m=await measure(p,'#fdTrack');await common(p,tg+' Yemek takip '+s,'#fdTrack',m,rm);const e=expT[s];
    ok(m&&m.pri.length===(e?1:0),tg+' Yemek takip '+s+': birincil sayısı '+(e?1:0)+': '+JSON.stringify(m&&m.pri.map(x=>x.t)));
    if(e&&m&&m.pri[0])ok(m.pri[0].t===e[0]&&m.pri[0].on.startsWith(e[1]+"('f-"+s)&&m.pri[0].c.includes(e[2]),tg+' Yemek takip '+s+': '+JSON.stringify(m.pri[0]));
    if(s==='on_the_way')ok(await p.evaluate(()=>!!document.querySelector('#fdNextBar')),tg+' Yemek takip yolda: alt çubuk var');
    if(s==='delivered')ok(m&&m.danger.length===1&&m.danger[0].t==='⚠ Sorun bildir',tg+' Yemek takip teslim: Sorun bildir çerçeveli olumsuz: '+JSON.stringify(m&&m.danger));
    if(['new','preparing'].includes(s))ok(await p.evaluate(()=>{const b=document.querySelector('#fdNextBar a.btnSoft');return !!b&&b.getAttribute('href')==='tel:02320000000'}),tg+' Yemek takip '+s+': hazırlıkta yalnız ikincil "Restoranı ara"');
    if(!rm)await shot(p,'yemek-takip-'+s+'-'+K);
    if(!rm&&e){await p.evaluate(fn=>{window.__spy=[];const f=window[fn];window[fn]=function(){window.__spy.push([fn,...arguments])};window.__unspy=()=>{window[fn]=f}},e[1]);
     await p.evaluate(()=>document.querySelector('#fdTrack .btnNext').click());
     const sp=await p.evaluate(()=>window.__spy);ok(sp.length===1&&sp[0][0]===e[1]&&sp[0][1]==='f-'+s,tg+' Yemek takip '+s+': tıklama → '+e[1]+': '+JSON.stringify(sp));
     await p.evaluate(()=>window.__unspy());}
   }
   // teslimat kodu yalnız platform kuryesinde
   for(const [k,want] of [['on_the_way',1],['self',0],['pickup',0]]){
    await p.evaluate(k=>showFoodOrderDetail('f-'+k),k);await p.waitForTimeout(900);
    const r=await p.evaluate(()=>({code:document.querySelectorAll('#fdTrack .fdCodeBox').length,txt:(document.querySelector('#fdTrack')||{}).innerText||''}));
    ok(r.code===want,tg+' Yemek takip '+k+': teslimat kodu kutusu '+(want?'görünür':'gizli')+': '+r.code);
    if(k==='self')ok(!/Teslimat kodunu hazır tut/.test(r.txt),tg+' Yemek takip self_delivery yaklaştı: "Teslimat kodunu hazır tut" yok');
   }
   // alt çubuk / alt menü / içerik çakışması (yolda): üstte ve kaydırma sonunda
   if(w===390){await p.evaluate(()=>showFoodOrderDetail('f-on_the_way'));await p.waitForTimeout(900);
    for(const pos of ['ust','alt']){
     await p.evaluate(pos=>window.scrollTo(0,pos==='ust'?0:document.scrollingElement.scrollHeight),pos);await p.waitForTimeout(300);
     const g=await p.evaluate(()=>{const b=document.getElementById('fdNextBar').getBoundingClientRect(),n=document.querySelector('.fdwNav').getBoundingClientRect();
      const kids=[...document.querySelectorAll('#fdTrack>*')].filter(e=>e.id!=='fdNextBar'&&e.getBoundingClientRect().height>0);
      const atEnd=innerHeight+scrollY>=document.scrollingElement.scrollHeight-1;
      return {barB:Math.round(b.bottom),barT:Math.round(b.top),navT:Math.round(n.top),hidden:atEnd?kids.filter(e=>e.getBoundingClientRect().bottom>b.top+1).map(e=>e.className||e.tagName):[]}});
     ok(g.barB<=g.navT,tg+' Yemek takip ('+pos+'): çubuk alt menüye binmiyor: '+JSON.stringify(g));
     ok(!g.hidden.length,tg+' Yemek takip ('+pos+'): kaydırma sonunda çubuk içeriği örtmüyor: '+JSON.stringify(g));
     if(!rm&&SHOTS){const f=path.join(SHOTS,'duzeltme-yemek-takip-yolda-'+th+'-390-'+pos+'.png');await p.screenshot({path:f});shots.push(f)}
    }}
   ok(!st.errors.length,tg+' Yemek müşteri sayfa hatası: '+st.errors.join(' | '));
   await ctx.close();
   /* ---------- Yemek işletme ---------- */
   ({ctx,p,st}=await foodPage(br,{w,h:844,visible:true,light}));
   if(rm)await p.emulateMedia({reducedMotion:'reduce'});
   await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1200);
   const expB={new:[2,'✓ Kabul et','btnNextXL','accepted'],prep:[1,'📦 Sipariş hazır',null,'ready'],ready:[1,'🛵 Yola çıktı','btnNextBlue','on_the_way']};
   for(const tab of ['new','prep','ready']){
    if(tab!=='new'){await p.evaluate(t=>foodBizTab(t),tab);await p.waitForTimeout(700)}
    m=await measure(p,'#fdBList');await common(p,tg+' Yemek işletme '+tab,'#fdBList',m,rm);const e=expB[tab];
    ok(await p.evaluate(()=>[...document.querySelectorAll('#fdBList .fdBiz')].every(c=>c.querySelectorAll('.btnNext').length===1)),tg+' Yemek işletme '+tab+': her kartta tam bir birincil');
    ok(m&&m.pri.length===e[0]&&m.pri.every(x=>x.t===e[1]&&(!e[2]||x.c.includes(e[2]))&&new RegExp("^foodVenueAct\\('\\w+','"+e[3]+"',this,").test(x.on)),tg+' Yemek işletme '+tab+': '+JSON.stringify(m&&m.pri));
    if(tab==='new'){
     ok(m&&m.pri.every(x=>x.h>=64),tg+' Yemek işletme: Kabul et 64px: '+JSON.stringify(m&&m.pri.map(x=>x.h)));
     ok(m&&m.danger.length===2&&m.danger.every(x=>x.t==='✕ Reddet'),tg+' Yemek işletme: Reddet çerçeveli olumsuz: '+JSON.stringify(m&&m.danger));
     ok(await p.evaluate(()=>{const f=document.querySelectorAll('#fdBList .fdBiz.nxFirst');return f.length===1&&/#N1/.test(f[0].textContent)&&/SIRADAKİ SİPARİŞ/.test(f[0].textContent)}),tg+' Yemek işletme: en eski yeni sipariş "SIRADAKİ SİPARİŞ"');
     ok(await p.evaluate(()=>{const b=document.querySelector('#fdTabs button.on');return !!b&&b.classList.contains('nxHot')&&!!b.querySelector('em.nxNew')}),tg+' Yemek işletme: Yeni sekmesi dolu + kırmızı sayaç');
    }
    if(!rm)await shot(p,'yemek-isletme-'+tab+'-'+K);
   }
   if(!rm){await p.evaluate(()=>foodBizTab('new'));await p.waitForTimeout(700);
    await p.evaluate(()=>{window.__spy=[];const f=window.foodVenueAct;window.foodVenueAct=function(id,to,b,mode){window.__spy.push([id,to,mode])};window.__unspy=()=>{window.foodVenueAct=f}});
    await p.evaluate(()=>{const c=document.querySelector('#fdBList .fdBiz.nxFirst');c.querySelector('.btnNext').click();c.querySelector('.btnDanger').click()});
    ok(JSON.stringify(await p.evaluate(()=>window.__spy))==='[["n1","accepted","self_delivery"],["n1","rejected","self_delivery"]]',tg+' Yemek işletme: Kabul/Reddet → foodVenueAct: '+JSON.stringify(await p.evaluate(()=>window.__spy)));
    await p.evaluate(()=>window.__unspy());}
   if(!rm){const n0=await p.evaluate(()=>window.__FDC.length);
    await p.evaluate(()=>{foodVenueAct('r1','delivered',null,'self_delivery')});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>({txt:document.body.innerText,code:!!document.getElementById('fdDc')}));
    ok(/Sipariş teslim edildi mi\?/.test(r.txt)&&!r.code,tg+' Yemek işletme self_delivery teslim: kod alanı yok, sade onay');
    ok(!(await p.evaluate(n0=>window.__FDC.slice(n0).some(c=>/food_transition_order/.test(c[1])),n0)),tg+' Yemek işletme: onaysız sunucu çağrısı yok');
    await p.keyboard.press('Escape');await p.waitForTimeout(300);}
   ok(!st.errors.length,tg+' Yemek işletme sayfa hatası: '+st.errors.join(' | '));
   await ctx.close();
   /* ---------- Özüne Dön satıcı ---------- */
   ({ctx,p,st}=await open(br,{w,h:844,visible:true,theme:light?'light':'dark'}));
   if(rm)await p.emulateMedia({reducedMotion:'reduce'});
   await p.evaluate(()=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];
    window.__DB=[['n1','new'],['a1','accepted'],['k1','packed'],['s1','shipped']].map(([id,s],i)=>Object.assign({},base,{id,order_no:'OZ26-'+id,status:s,created_at:'2026-10-1'+i+'T10:00:00Z',return:null,tracking_no:null}));
    const o=window.PF.rpc;
    window.PF.rpc=async function(fn,x){
     if(fn==='oz_seller_orders'){window.__ozLog(fn,x);return JSON.parse(JSON.stringify(window.__DB.filter(y=>!x.p_status||y.status===x.p_status)))}
     if(fn==='oz_seller_dashboard'){const r=await o(fn,x);const c={};window.__DB.forEach(y=>{c[y.status]=(c[y.status]||0)+1});return Object.assign({},r,{orders:c,open_returns:0})}
     if(fn==='oz_transition_order'){window.__ozLog(fn,x);return {ok:true}}
     return o(fn,x)}});
   await enter(p);ok(await p.evaluate(()=>document.body.classList.contains('ozLt'))===light,tg+' Özüne Dön tema');
   await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1600);
   const expS={new:[['✓ Kabul et','soAct:accept','btnNextXL']],prep:[['📦 Hazırlandı','soAct:pack','btnNextAmber'],['🚚 Kargoya ver','soShip','btnNextBlue']]};
   for(const sg of ['new','prep']){
    await p.evaluate(sg=>document.querySelector('#ozSP .ozSoCnt [data-st='+sg+']').click(),sg);await p.waitForTimeout(1300);
    m=await measure(p,'#ozSP');await common(p,tg+' Özüne Dön satıcı '+sg,'#ozSP',m,rm);
    ok(await p.evaluate(()=>[...document.querySelectorAll('#ozSP .ozSoC')].filter(c=>c.querySelector('[data-a=soAct]')).every(c=>c.querySelectorAll('.btnNext').length===1)),tg+' Özüne Dön satıcı '+sg+': her kartta tam bir birincil');
    const got=m?m.pri.map(x=>[x.t,x.a,x.c]):[];const ex=expS[sg];
    ok(ex.every(e=>got.some(g=>g[0]===e[0]&&e[1].startsWith(g[1])&&g[2].includes(e[2])))&&got.length===ex.length,tg+' Özüne Dön satıcı '+sg+': '+JSON.stringify(got));
    ok(await p.evaluate(ex=>ex.every(e=>!!document.querySelector('#ozSP .btnNext'+(e[1]==='soShip'?'[data-a=soShip]':'[data-a=soAct][data-act='+e[1].split(':')[1]+']'))),ex),tg+' Özüne Dön satıcı '+sg+': data-a/data-act aynı');
    if(sg==='new'){ok(m&&m.danger.length>=1&&m.danger.every(x=>x.t==='✕ Reddet'||x.t==='✕ İptal et'),tg+' Özüne Dön satıcı: Reddet çerçeveli: '+JSON.stringify(m&&m.danger));ok(m&&m.pri.every(x=>x.h>=64),tg+' Özüne Dön Kabul et 64px')}
    if(!rm)await shot(p,'oz-satici-'+sg+'-'+K);
   }
   if(!rm){await p.evaluate(()=>document.querySelector('#ozSP .ozSoCnt [data-st=new]').click());await p.waitForTimeout(1300);
    const n0=st.calls.length;await p.evaluate(()=>document.querySelector('#ozSP .btnNext[data-act=accept]').click());await p.waitForTimeout(1200);
    const c=st.calls.slice(n0).find(x=>x[0]==='oz_transition_order');ok(c&&c[1].p_order==='n1'&&c[1].p_action==='accept',tg+' Özüne Dön satıcı: Kabul et → oz_transition_order accept: '+JSON.stringify(c));}
   /* ---------- Özüne Dön müşteri sipariş detayı ---------- */
   for(const os of ['shipped','awaiting_payment']){
    await p.evaluate(os=>{const o=window.__OZ_FX.R.oz_order_detail.order;o.status=os;o.payment_status=os==='awaiting_payment'?'pending':'paid'},os);
    await p.evaluate(()=>OZ.go('order',{id:'o1'}));await p.waitForTimeout(1300);
    await p.evaluate(()=>document.querySelectorAll('#v2Toast,.ozToast').forEach(x=>x.remove()));
    m=await measure(p,'#ozRoot');await common(p,tg+' Özüne Dön sipariş '+os,'#ozRoot',m,rm);
    if(os==='shipped'){
     // tek ana düğme "Kargo firmasının sayfasında takip et"; teslim onayı sönük, onun altında
     ok(m&&m.pri.length===0,tg+' Özüne Dön kargoda: birincil .btnNext yok: '+JSON.stringify(m&&m.pri));
     const r=await p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozTrkC .ozTrkGo'),d=document.querySelector('#ozRoot [data-a=ordDeliver]'),rt=document.querySelector('#ozRoot [data-a=ordReturn]'),nx=document.querySelector('#ozRoot .ozOdN.ozNext');
      const cs=e=>e&&getComputedStyle(e);const filled=[...document.querySelectorAll('#ozRoot .ozOd .ozBtn')].filter(e=>{const c=cs(e).backgroundColor;return c!=='rgba(0, 0, 0, 0)'&&e.getBoundingClientRect().height>0}).map(e=>e.textContent.trim());
      return {cls:d&&d.className,t:d&&d.textContent.trim(),under:!!(g&&d&&g.compareDocumentPosition(d)&Node.DOCUMENT_POSITION_FOLLOWING)&&d.getBoundingClientRect().top>=g.getBoundingClientRect().bottom,
       dBg:d&&cs(d).backgroundColor,dH:d&&Math.round(d.getBoundingClientRect().height),ret:rt?{bg:cs(rt).backgroundColor,u:cs(rt).textDecorationLine}:null,filled,nx:nx&&nx.querySelector('p').innerText.replace(/\s+/g,' ')}});
     ok(r.cls==='ozBtn'&&r.t==='Kargom elime ulaştı'&&r.under&&r.dBg==='rgba(0, 0, 0, 0)'&&r.dH>=44,tg+' Özüne Dön kargoda: "Kargom elime ulaştı" sönük, takip et altında: '+JSON.stringify(r));
     ok(JSON.stringify(r.filled)==='["Kargo firmasının sayfasında takip et"]',tg+' Özüne Dön kargoda: tek dolu ana düğme takip et: '+JSON.stringify(r.filled));
     ok(!r.ret||(r.ret.bg==='rgba(0, 0, 0, 0)'&&/underline/.test(r.ret.u)),tg+' Özüne Dön: iade/cayma sönük bağlantı: '+JSON.stringify(r.ret));
     ok(r.nx==='Sıradaki adım: Kargon yolda. Kargo firmasından takip edebilirsin. Eline ulaşınca aşağıdan onayla.',tg+' Özüne Dön kargoda: sıradaki adım metni: '+r.nx);
     if(w===390)for(const pos of ['ust','alt']){
      await p.evaluate(pos=>window.scrollTo(0,pos==='ust'?0:document.scrollingElement.scrollHeight),pos);await p.waitForTimeout(300);
      const g=await p.evaluate(()=>{const n=document.getElementById('ozNav').getBoundingClientRect();const atEnd=innerHeight+scrollY>=document.scrollingElement.scrollHeight-1;
       const last=[...document.querySelectorAll('#ozRoot .ozOd>*')].filter(e=>e.getBoundingClientRect().height>0).pop();return {navT:Math.round(n.top),lastB:last?Math.round(last.getBoundingClientRect().bottom):0,atEnd}});
      if(pos==='alt')ok(g.atEnd&&g.lastB<=g.navT,tg+' Özüne Dön kargoda: kaydırma sonunda içerik alt menünün altında kalmıyor: '+JSON.stringify(g));
      if(!rm&&SHOTS){const f=path.join(SHOTS,'duzeltme-oz-kargoda-'+th+'-390-'+pos+'.png');await p.screenshot({path:f});shots.push(f)}
     }
    }else{
     ok(m&&m.pri.length===1&&m.pri[0].t==='💳 Ödemeyi tamamla'&&/^(mockPay|iyzPay)$/.test(m.pri[0].a),tg+' Özüne Dön sipariş '+os+': tek birincil '+JSON.stringify(m&&m.pri));
     ok(await p.evaluate(()=>{const n=document.querySelector('#ozRoot .ozOdN.ozNext.nxCard');return !!n&&!!n.querySelector('.btnNext')}),tg+' Özüne Dön sipariş '+os+': birincil "Sıradaki adım" kartında');
    }
    if(!rm)await shot(p,'oz-siparis-'+os+'-'+K);
    if(!rm&&os==='shipped'){await p.evaluate(()=>document.querySelector('#ozRoot [data-a=ordDeliver]').click());await p.waitForTimeout(500);
     ok(await p.evaluate(()=>/Siparişin eline ulaştı mı\?/.test(document.body.innerText)),tg+' Özüne Dön: Elime ulaştı → eski onay (ordDeliver)');
     await p.keyboard.press('Escape');await p.waitForTimeout(300);}
   }
   ok(!st.errors.length,tg+' Özüne Dön sayfa hatası: '+st.errors.join(' | '));
   await ctx.close();
  }
 }
 await br.close();
 if(shots.length)console.log('ekran görüntüleri ('+shots.length+'): '+SHOTS);
 if(fails.length){console.error('p19-sirada-adim BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p19-sirada-adim: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p19-sirada-adim HATA:',e);process.exit(1)});
