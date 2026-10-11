// AC2: dikkat rozetleri ve nabız — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ac2-dikkat-rozeti.test.js
// Doğrulanan: müşteri alt menüsü "Siparişlerim" rozeti = kargoda (teslim onayı bekleyen) siparişler (mavi; teslim edilen/onaylanan sayılmaz);
// satıcıysa "Hesabım" ve Hesabım > "Satıcı paneli" satırı = yeni + hazırlanacak (new/accepted/packed; kargoda sayılmaz) (turuncu);
// satıcı menüsü "Siparişler" rozeti aynı sayı, etiket rengi vurgulu; sipariş detayı açılınca / liste görülünce sayı azalır, yeniden
// yüklemede de görülmüş kalır (localStorage); nabız animasyonu (ozAttnP), prefers-reduced-motion'da animasyon yok + sabit halka;
// eski P3/C6 .ozPulse ışığı kalmadı (tek yapı); 390px'te alt menü taşmaz, rozet etiketle çakışmaz; rozet metni ve vurgulu etiket AA.
const {chromium,open,enter,overflow}=require('./harness.js');
const BUY=[['b1','shipped'],['b2','shipped'],['b3','accepted'],['b4','delivered'],['b5','new']];
const SELL={new:['s1','s2'],accepted:['s3'],packed:[],shipped:['s4','s5']};
async function page(br,opt){opt=opt||{};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 if(opt.reduce)await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(([BUY,SELL])=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];
  R.oz_my_orders=BUY.map(([id,s],i)=>({id,order_no:'OZ-'+id,status:s,total_kurus:45000,created_at:'2026-10-0'+(9-i)+'T10:00:00Z',seller_name:'Yayla Üreticileri',items:[{name:'Bal',qty:1}]}));
  R.oz_order_detail=JSON.parse(JSON.stringify(R.oz_order_detail));
  const o=window.PF.rpc;window.PF.rpc=async function(fn,x){
   if(fn==='oz_seller_orders'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,20));const s=x.p_status;const ids=s?SELL[s]||[]:[].concat(...Object.values(SELL));
    return ids.map(id=>Object.assign({},base,{id,order_no:'OZ-'+id,status:s||Object.keys(SELL).find(k=>SELL[k].includes(id)),return:null}))}
   if(fn==='oz_order_detail'){const r=await o(fn,x);const m=R.oz_my_orders.find(y=>y.id===x.p_order);if(m)r.order=Object.assign({},r.order,{id:m.id,status:m.status,order_no:m.order_no});return r}
   return o(fn,x)}},[BUY,SELL]);
 await enter(p);await p.waitForTimeout(900);return {p,st};
}
const B=(p,sel)=>p.evaluate(sel=>{
 function lum(c){const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
 const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const h=document.querySelector(sel);if(!h)return {none:true};const b=h.querySelector('.ozAttnB');const vis=!!b&&!b.hidden&&b.offsetParent!==null;
 const l=h.querySelector('.l');const nav=document.getElementById('ozNav');const bs=b?getComputedStyle(b):null;
 const br=b&&b.getBoundingClientRect(),lr=l&&l.getBoundingClientRect(),hr=h.getBoundingClientRect();
 const hit=vis&&lr?!(br.right<=lr.left||br.left>=lr.right||br.bottom<=lr.top||br.top>=lr.bottom):false;
 return {n:vis?b.textContent:null,bg:bs&&bs.backgroundColor,anim:bs&&bs.animationName,ring:bs&&bs.boxShadow,aa:vis?cr(bs.color,bs.backgroundColor):0,
  lab:l?getComputedStyle(l).color:null,labAA:l&&nav?cr(getComputedStyle(l).color,getComputedStyle(nav).backgroundColor):0,hit,
  inside:vis?br.left>=0&&br.right<=390&&br.top>=hr.top-12:true,pulse:!!document.querySelector('.ozPulse')}},sel);
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const BLUE='rgb(111, 179, 232)',ORANGE='rgb(240, 160, 75)';
 {const {p,st}=await page(br);
  let o=await B(p,'#ozNav .ozNavB[data-k=orders]'),a=await B(p,'#ozNav .ozNavB[data-k=account]');
  ok(o.n==='2'&&o.bg===BLUE,'Siparişlerim rozeti 2 (yalnız kargoda), mavi: '+JSON.stringify(o));
  ok(a.n==='3'&&a.bg===ORANGE,'Hesabım rozeti 3 (yeni 2 + onaylandı 1; kargoda sayılmaz), turuncu: '+JSON.stringify(a));
  ok(o.anim==='ozAttnP'&&a.anim==='ozAttnP','nabız animasyonu (ozAttnP): '+o.anim+' / '+a.anim);
  ok(!o.pulse,'eski .ozPulse ışığı kalmamalı (tek yapı)');
  ok(o.aa>=4.5&&a.aa>=4.5,'rozet metni AA: '+o.aa.toFixed(2)+' / '+a.aa.toFixed(2));
  ok(o.lab==='rgb(159, 208, 245)'&&o.labAA>=4.5,'Siparişlerim etiketi mavi vurgulu ve AA: '+o.lab+' '+o.labAA.toFixed(2));
  ok(!o.hit&&!a.hit&&o.inside&&a.inside,'rozet etiketle çakışmamalı, ekranda kalmalı: '+JSON.stringify({o:o.hit,a:a.hit}));
  ok(await p.evaluate(()=>{const n=document.getElementById('ozNav');return n.scrollWidth<=n.clientWidth})&&await overflow(p)<=0,'390px alt menü taşmamalı');
  // sipariş detayı görülünce azalır
  await p.evaluate(()=>OZ.go('order',{id:'b1'}));await p.waitForTimeout(1200);await p.goBack();await p.waitForTimeout(1200);
  o=await B(p,'#ozNav .ozNavB[data-k=orders]');ok(o.n==='1','detayı açılan kargo siparişi sayılmamalı → 1: '+JSON.stringify(o));
  // liste görülünce azalır
  await click(p,'#ozNav .ozNavB[data-k=orders]',1400);
  o=await B(p,'#ozNav .ozNavB[data-k=orders]');ok(o.n===null,'Siparişlerim listesi görülünce rozet kalkmalı: '+JSON.stringify(o));
  // satıcı: Hesabım > Satıcı paneli satırı
  await click(p,'#ozNav .ozNavB[data-k=account]',1300);
  const r=await p.evaluate(()=>{const h=document.querySelector('#ozRoot .ozRowBtn[data-k=seller]');const b=h&&h.querySelector('.ozAttnB');return b&&!b.hidden?{n:b.textContent,bg:getComputedStyle(b).backgroundColor}:null});
  ok(r&&r.n==='3'&&r.bg===ORANGE,'Hesabım > Satıcı paneli satırında turuncu 3: '+JSON.stringify(r));
  // satıcı menüsü (Ürünler sekmesinden girildi): Siparişler rozeti 3, etiket vurgulu; panel görülünce kalkar
  await p.evaluate(()=>OZ.go('seller',{tab:'urunler'}));await p.waitForTimeout(1500);
  let s=await B(p,'#ozNav .ozNavB[data-tab=ozet]');
  ok(s.n==='3'&&s.bg===ORANGE&&s.anim==='ozAttnP'&&s.lab==='rgb(247, 185, 121)','satıcı menüsü Siparişler rozeti 3 turuncu nabız + etiket vurgusu: '+JSON.stringify(s));
  ok(!s.hit&&s.inside,'satıcı menüsü rozet etiketle çakışmamalı');
  await click(p,'#ozNav [data-tab=ozet]',1500);
  s=await B(p,'#ozNav .ozNavB[data-tab=ozet]');ok(s.n===null,'satıcı paneli siparişleri görülünce Siparişler rozeti kalkmalı: '+JSON.stringify(s));
  // yeniden yüklemede de görülmüş kalır
  await p.reload();await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('isimi_oz_seen_00000000-0000-0000-0000-000000000001')||'{}')).length>=4),'görülen durum haritası kullanıcıya özel localStorage anahtarında');
  ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));await p.context().close()}
 // hareket azaltılmış
 {const {p,st}=await page(br,{reduce:true});
  const o=await B(p,'#ozNav .ozNavB[data-k=orders]');
  ok(o.n==='2'&&o.anim==='none'&&/rgba?\(111, 179, 232/.test(o.ring),'reduced-motion: animasyon yok, sabit parlak halka: '+JSON.stringify({anim:o.anim,ring:o.ring}));
  ok(!st.errors.length,'sayfa hatası (reduce): '+st.errors.join(' | '));await p.context().close()}
 await br.close();
 if(fails.length){console.error('ac2-dikkat-rozeti BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ac2-dikkat-rozeti: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ac2-dikkat-rozeti HATA:',e);process.exit(1)});
