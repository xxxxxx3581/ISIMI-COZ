// Paket 36: Yemek ince rötuşlar (yalnız arayüz) — 390px, krem ve koyu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p36-ince-rotus.test.js   (P36_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: (1) işletme paneli "Yeni restoran ekle" düğmesi koyu temada metin/zemin ≥4.5:1 (krem aynı, ≥4.5);
// (2) kurye başvurusu sözleşme kutusu "Oku" bağlantısından önce pasif + "Önce metni oku", bağlantıdan sonra aktif; zorunlu onay kontrolü aynı;
// (3) restoran sipariş kartında durum notu (Kurye aranıyor / siparişi aldı / Yolda / yaklaştı) varken aynı durum etiketi tekrarlanmaz (tek kez).
const {chromium,open,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P36_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const iso=m=>new Date(Date.now()+m*60000).toISOString();
const ord=(id,st,extra)=>Object.assign({id,no:id.toUpperCase(),status:st,delivery_mode:'platform_delivery',created_at:iso(-25),total_kurus:41500,payment_method:'cash_on_delivery',items:[{name:'Adana dürüm',quantity:2,options:[]}],address_text:'Bornova',phone:'05320000000'},extra||{});
const CONTRAST=sel=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const e=document.querySelector(sel);if(!e)return null;const ch=[];for(let x=e;x;x=x.parentElement)ch.unshift(x);let z=[255,255,255];ch.forEach(x=>{const b=P(getComputedStyle(x).backgroundColor);const a=b.length>3?b[3]:1;if(a>0)z=[0,1,2].map(i=>b[i]*a+z[i]*(1-a))});
 const t=P(getComputedStyle(e).color),x=L(t),y=L(z);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const shot=async(p,n)=>{if(!SHOTS)return;await p.evaluate(()=>document.querySelectorAll('#v2Toast').forEach(x=>x.remove()));await p.screenshot({path:path.join(SHOTS,n+'.png'),fullPage:true})};
 for(const th of ['light','dark']){const T='['+(th==='light'?'krem':'koyu')+']';
  /* ---------- 1 + 3: işletme paneli ---------- */
  let {p,st}=await open(br,{w:390,h:844,visible:true});
  await p.evaluate(([th,fx])=>{document.documentElement.setAttribute('data-theme',th);try{localStorage.setItem('isimi-theme',th);localStorage.removeItem('isimi_food_kitchen')}catch(e){}
   window.supabaseAuthRequest=async function(m,pth,b){await new Promise(r=>setTimeout(r,10));
    if(pth==='rpc/food_whoami')return {venues:[{id:'v1',name:'Test Lokanta',role:'owner'}]};
    if(pth==='rpc/food_venue_orders'){const c={};for(const k in fx)c[k]=fx[k].length;return {orders:JSON.parse(JSON.stringify(fx[b.p_section]||[])),counts:c,summary:{}}}
    if(pth.startsWith('food_venues?'))return [{id:'v1',name:'Test Lokanta',is_open:true,is_active:true,delivery_mode:'platform_delivery',prep_time_min:20}];return []}},
   [th,{new:[],preparing:[ord('p1','preparing',{estimated_ready_at:iso(20)})],ready:[],courier_wait:[ord('k1','courier_search')],active_delivery:[ord('d1','on_the_way',{courier:{name:'Kaan',vehicle:'motorbike',phone:'0500'}}),ord('n1','near_customer',{courier:{name:'Ece',vehicle:'car',phone:'0501'}})]}]);
  await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1300);
  const cr=await p.evaluate(CONTRAST,'#fdRoot .fdMoreSec .fb.soft');
  ok(cr!=null&&cr>=4.5,T+' (1) "Yeni restoran ekle" metin/zemin kontrastı ≥4.5: '+cr);
  await p.evaluate(()=>foodBizTab('ready'));await p.waitForTimeout(1100);
  let r=await p.evaluate(()=>[...document.querySelectorAll('#fdBList .fdBiz')].map(c=>{const tx=c.innerText;return {no:c.querySelector('.nxHd .id b').textContent,
    badges:[...c.querySelectorAll('.bd .fdBadge')].map(b=>b.textContent),note:(c.querySelector('.fdNote.info')||{}).textContent||'',
    yolda:(tx.match(/Yolda/g)||[]).length,arar:(tx.match(/Kurye aranıyor/g)||[]).length,yak:(tx.match(/yaklaştı/g)||[]).length}}));
  const by=Object.fromEntries(r.map(x=>[x.no,x]));
  ok(by['#K1']&&by['#K1'].arar===1&&!by['#K1'].badges.length,T+' (3) Kurye aranıyor tek kez: '+JSON.stringify(by['#K1']));
  ok(by['#D1']&&/kuryede, müşteriye gidiyor/.test(by['#D1'].note)&&by['#D1'].yolda===0&&!by['#D1'].badges.length,T+' (3) Yolda durumu tek yerde (not): '+JSON.stringify(by['#D1']));
  ok(by['#N1']&&by['#N1'].yak===1&&!by['#N1'].badges.length,T+' (3) Kurye yaklaştı tek kez: '+JSON.stringify(by['#N1']));
  ok((await overflow(p))<=0,T+' işletme paneli yatay taşma');await shot(p,'p36-'+th+'-siparis');
  await p.evaluate(()=>foodBizTab('prep'));await p.waitForTimeout(1100);
  r=await p.evaluate(()=>{const c=document.querySelector('#fdBList .fdBiz');return {b:[...c.querySelectorAll('.bd .fdBadge')].map(x=>x.textContent),t:(c.innerText.match(/dk kaldı/g)||[]).length}});
  ok(r.b.join()==='Hazırlanıyor'&&r.t===1,T+' (3) notsuz durumda etiket aynen, süre tek kez: '+JSON.stringify(r));
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));await p.context().close();
  /* ---------- 2: kurye başvurusu sözleşme kutusu ---------- */
  ({p,st}=await open(br,{w:390,h:844,visible:true}));
  await p.evaluate(th=>{document.documentElement.setAttribute('data-theme',th);try{localStorage.setItem('isimi-theme',th)}catch(e){}
   window.PF.enabled=true;window.PF.legalList=async()=>[{doc_type:'kurye_sozlesmesi',title:'Kurye Sözleşmesi',audience:['courier'],consent_kind:'required'}];
   window.__ol=[];window.PF.openLegal=function(d){window.__ol.push(d)};
   window.supabaseAuthRequest=async function(m,pth){await new Promise(r=>setTimeout(r,10));if(pth==='rpc/food_whoami')return {venues:[],courier:null,is_admin:false};return []}},th);
  await p.evaluate(()=>showFoodCourier());await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{const i=document.querySelector('#crCons input[data-doc]');const h=document.querySelector('#crCons .fdChkHint');return i?{dis:i.disabled,hint:h&&h.textContent,cr:null}:null});
  ok(r&&r.dis&&r.hint==='Önce metni oku',T+' (2) "Oku"dan önce kutu pasif + ipucu: '+JSON.stringify(r));
  const hc=await p.evaluate(CONTRAST,'#crCons .fdChkHint');ok(hc>=4.5,T+' (2) ipucu kontrastı ≥4.5: '+hc);
  await p.evaluate(()=>{const i=document.querySelector('#crCons input[data-doc]');i.click()});
  ok(await p.evaluate(()=>!document.querySelector('#crCons input[data-doc]').checked),T+' (2) pasifken işaretlenemez');
  await shot(p,'p36-'+th+'-kurye-pasif');
  await p.evaluate(()=>document.querySelector('#crCons label.pfxChk a').click());
  r=await p.evaluate(()=>{const i=document.querySelector('#crCons input[data-doc]');return {dis:i.disabled,hint:!!document.querySelector('#crCons .fdChkHint'),ol:window.__ol}});
  ok(!r.dis&&!r.hint&&JSON.stringify(r.ol)==='["kurye_sozlesmesi"]',T+' (2) "Oku" metni açar, kutu aktifleşir: '+JSON.stringify(r));
  await p.evaluate(()=>document.querySelector('#crCons input[data-doc]').click());
  r=await p.evaluate(()=>{const c=PF.readChecklist(document.getElementById('crCons'));return {ch:document.querySelector('#crCons input[data-doc]').checked,miss:c.missing}});
  ok(r.ch&&!r.miss.length,T+' (2) aktifleşince işaretlenir, zorunlu onay okuması aynı: '+JSON.stringify(r));
  ok((await overflow(p))<=0,T+' kurye formu yatay taşma');await shot(p,'p36-'+th+'-kurye-aktif');
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));await p.context().close();
 }
 await br.close();
 if(fails.length){console.error('p36-ince-rotus BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p36-ince-rotus: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p36-ince-rotus HATA:',e);process.exit(1)});
