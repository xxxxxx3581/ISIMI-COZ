// Paket 21: panel alt menü, Bugün, kazanç ve mutfak modu (yalnız arayüz) — 390px (+1280 masaüstü kontrolü), krem / koyu / mutfak modu, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p21-panel.test.js   (P21_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Yemek işletme: telefonda alt menü (Bugün/Menü/Raporlar/Ayarlar, ≥62px, seçili dolu sarı, Bugün'de yeni sipariş rozeti), masaüstünde üst sekmeler;
// personelde menü yok (rol kısıtı aynı); Bugün: büyük açık/kapalı kartı en üstte, 3 renkli sayaç (dokununca sekme), "Daha fazla" altta, eski
// bağlantılar erişilebilir; mutfak modu yalnız işletme ekranlarında koyu, müşteri tarafına geçince kayıtlı tema geri gelir; raporlar seçili çip + büyük hakediş.
// Özüne Dön satıcı: alt menü ortak sınıf, ≥62px, seçili dolu sarı, 5 öğe sığar; sayaçlar renkli (koyu temada kart zeminine ≥3); ürün ekle büyük +
// durum rozeti/kenarı; kazanç 3 renkli kart (aynı değerler); mağaza ayarları bölüm rozeti + altta sabit kaydet (alt menünün üstünde).
// Her ekranda: yatay taşma yok, içerik sonu/sabit çubuk alt menüyle çakışmaz, sayfa hatası yok.
const {chromium,open,enter,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P21_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const LUM=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
const CR=(a,b)=>{const x=LUM(a),y=LUM(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};const shots=[];
 const shot=async(p,n,full)=>{if(!SHOTS)return;const f=path.join(SHOTS,n+'.png');await p.evaluate(()=>document.querySelectorAll('#v2Toast,.ozToast').forEach(x=>x.remove()));await p.screenshot({path:f,fullPage:!!full});shots.push(f)};
 const iso=m=>new Date(Date.now()+m*60000).toISOString();
 const biz=(id,status,min)=>({id,no:id.toUpperCase(),status,delivery_mode:'self_delivery',created_at:iso(min),total_kurus:31000,payment_method:'cash',items:[{name:'Lahmacun',quantity:2,options:[]}],address_text:'Bornova',phone:'05320000000'});
 const foodPage=async(o,light,role)=>{const r=await open(br,o);await r.p.evaluate(([light,role,fx])=>{document.documentElement.setAttribute('data-theme',light?'light':'dark');try{localStorage.setItem('isimi-theme',light?'light':'dark');localStorage.removeItem('isimi_food_kitchen')}catch(e){}
   window.__FD=fx;window.__FD.role=role;window.__FDC=[];
   window.supabaseAuthRequest=async function(m,pth,b){window.__FDC.push([m,pth,b]);await new Promise(r=>setTimeout(r,10));const F=window.__FD,cl=x=>JSON.parse(JSON.stringify(x));
    if(m==='POST'&&pth.startsWith('rpc/')){const fn=pth.slice(4);if(fn==='food_whoami')return {venues:[{id:'v1',name:'Test Lokanta',role:F.role}]};
     if(fn==='food_venue_orders'){const c={};for(const k in F.biz)c[k]=F.biz[k].length;c.done=3;return {orders:cl(F.biz[b.p_section]||[]),counts:c,summary:{today_orders:5,today_revenue_kurus:120000}}}return []}
    if(pth.startsWith('food_venues?'))return [cl(F.venue)];if(pth.startsWith('food_menu_items?'))return [{id:'i1'}];
    if(pth.startsWith('food_orders?select=status,created_at,subtotal_kurus'))return [{status:'delivered',created_at:new Date().toISOString(),subtotal_kurus:20000,restaurant_share_kurus:17000,payment_method:'cash'},{status:'delivered',created_at:new Date().toISOString(),subtotal_kurus:10000,restaurant_share_kurus:8500,payment_method:'cash'}];
    return []}},[light,role,{biz:{new:[biz('n1','new',-4),biz('n2','new',-1)],preparing:[biz('p1','preparing',-12)],ready:[biz('r1','ready',-20)],courier_wait:[],active_delivery:[]},
    venue:{id:'v1',name:'Test Lokanta',phone:'02320000000',address_text:'Bornova Mah. 1. Sk. No:2',district:'Bornova',cuisine_type:'Pide',is_open:true,is_active:true,working_hours:{mon:[['10:00','22:00']]},delivery_mode:'self_delivery',delivery_provider:'venue',min_order_amount:0,delivery_fee_kurus:0,prep_time_min:20,delivery_eta_min:30,commission_bps:1000,platform_fee_kurus:0,lat:38.4,lng:27.1,cover_url:'images/home/market.jpg',delivery_radius_km:null}}]);return r};
 const navGeo=p=>p.evaluate(()=>{const n=document.querySelector('#fdRoot .fdPNav');if(!n)return null;const cs=getComputedStyle(n);const nb=n.getBoundingClientRect();
   const items=[...n.querySelectorAll('.pnItem')].map(b=>({t:b.querySelector('.l').textContent,on:b.classList.contains('on'),h:Math.round(b.getBoundingClientRect().height),bg:getComputedStyle(b).backgroundColor,trunc:b.querySelector('.l').scrollWidth>b.querySelector('.l').clientWidth}));
   const bd=document.getElementById('fdPNavN');return {disp:cs.display,pos:cs.position,top:Math.round(nb.top),bottom:Math.round(nb.bottom),vh:innerHeight,items,badge:bd&&!bd.hidden?{t:bd.textContent,bg:getComputedStyle(bd).backgroundColor}:null,sub:getComputedStyle(document.querySelector('#fdRoot .fdSub')).display}});
 const endClear=(p,root,navSel,skip)=>p.evaluate(([root,navSel,skip])=>{window.scrollTo(0,document.scrollingElement.scrollHeight);const n=document.querySelector(navSel).getBoundingClientRect();
   const kids=[...document.querySelector(root).children].filter(e=>!e.matches(skip)&&e.getBoundingClientRect().height>0&&getComputedStyle(e).position!=='fixed');const last=kids[kids.length-1];
   return {navT:Math.round(n.top),lastB:last?Math.round(last.getBoundingClientRect().bottom):0,cls:last&&last.className}},[root,navSel,skip]);
 for(const mode of ['krem','koyu','mutfak']){const light=mode!=='koyu';
  /* ================= Yemek işletme ================= */
  let {ctx,p,st}=await foodPage({w:390,h:844,visible:true},light,'owner');
  if(mode==='mutfak')await p.evaluate(()=>{try{localStorage.setItem('isimi_food_kitchen','1')}catch(e){}});
  await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1500);
  let g=await navGeo(p);
  ok(g&&g.disp==='grid'&&g.pos==='fixed'&&g.bottom===g.vh&&g.sub==='none','['+mode+'] Yemek: telefonda alt menü sabit, üst sekmeler gizli: '+JSON.stringify(g&&{d:g.disp,p:g.pos,b:g.bottom,s:g.sub}));
  ok(g&&JSON.stringify(g.items.map(x=>x.t))==='["Bugün","Menü","Raporlar","Ayarlar"]'&&g.items.every(x=>x.h>=62&&!x.trunc)&&g.items[0].on&&g.items[0].bg==='rgb(242, 193, 78)','['+mode+'] Yemek: 4 öğe ≥62px, Bugün seçili dolu sarı: '+JSON.stringify(g&&g.items));
  ok(g&&g.badge&&g.badge.t==='2','['+mode+'] Yemek: Bugün rozeti yeni sipariş sayısı: '+JSON.stringify(g&&g.badge));
  let r=await p.evaluate(()=>{const R=document.getElementById('fdRoot');const o=document.getElementById('fdOpenCard'),c=document.getElementById('fdCnt3');const card=getComputedStyle(document.querySelector('#fdCnt3 button')).backgroundColor;
   return {openFirst:!!o&&!!c&&!!(o.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(o.compareDocumentPosition(document.getElementById('fdKpi'))&Node.DOCUMENT_POSITION_FOLLOWING),openH:o&&Math.round(o.getBoundingClientRect().height),
    title:o&&o.querySelector('b').textContent,sw:!!document.getElementById('fdOpenSw'),
    cnt:[...document.querySelectorAll('#fdCnt3 button')].map(b=>({t:b.querySelector('span').textContent,n:b.querySelector('b').textContent,col:getComputedStyle(b.querySelector('b')).color,bt:getComputedStyle(b).borderTopColor,card})),
    more:(()=>{const m=document.querySelector('#fdRoot .fdMoreSec');return m?{h:m.querySelector('h3').textContent,nv:!!m.querySelector('[onclick^="foodNewVenue"]'),last:![...R.children].slice([...R.children].indexOf(m)+1).some(e=>!e.matches('.fdPNav'))}:null})(),
    keep:{sw:!!document.querySelector('[onclick^="foodVenueSwitch"]'),bell:!!document.getElementById('fdBell'),push:!!document.querySelector('#fdRoot .fdPushSlot'),alarm:!!document.getElementById('fdAlarmBox'),iss:!!document.getElementById('fdIssB'),tabs:!!document.getElementById('fdTabs'),km:!!document.getElementById('fdKmSw')}}});
  ok(r.openFirst&&r.openH>=70&&r.title==='Sipariş alıyorum'&&r.sw,'['+mode+'] Bugün: büyük açık/kapalı kartı en üstte: '+JSON.stringify(r));
  ok(JSON.stringify(r.cnt.map(x=>x.t+':'+x.n))==='["Yeni:2","Hazırlanıyor:1","Yolda:1"]'&&new Set(r.cnt.map(x=>x.bt)).size===3,'['+mode+'] Bugün: 3 renkli sayaç: '+JSON.stringify(r.cnt));
  ok(r.cnt.every(x=>CR(x.col,x.card)>=3),'['+mode+'] Bugün: sayaç rengi kart zeminine ≥3: '+JSON.stringify(r.cnt.map(x=>x.col+'/'+x.card+'='+CR(x.col,x.card).toFixed(2))));
  ok(r.more&&r.more.h==='Daha fazla'&&r.more.nv&&r.more.last,'['+mode+'] Bugün: "Yeni restoran ekle" sayfa sonunda "Daha fazla"da: '+JSON.stringify(r.more));
  ok(Object.values(r.keep).every(Boolean),'['+mode+'] Bugün: mevcut işlevler yerinde: '+JSON.stringify(r.keep));
  let e=await endClear(p,'#fdRoot','#fdRoot .fdPNav','.fdPNav');ok(e.lastB<=e.navT,'['+mode+'] Bugün: içerik sonu alt menünün üstünde: '+JSON.stringify(e));
  ok((await overflow(p))<=0,'['+mode+'] Bugün: yatay taşma');
  if(mode==='mutfak')ok(await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='dark'&&document.getElementById('fdKmSw').checked),'[mutfak] işletme paneli koyu');
  await p.evaluate(()=>window.scrollTo(0,0));await shot(p,'yemek-bugun-'+mode,true);
  await p.evaluate(()=>[...document.querySelectorAll('#fdCnt3 button')][1].click());await p.waitForTimeout(900);
  ok(await p.evaluate(()=>/Mutfakta/.test((document.querySelector('#fdTabs button.on')||{}).textContent||'')),'['+mode+'] sayaç → Mutfakta sekmesi');
  // Raporlar
  await p.evaluate(()=>[...document.querySelectorAll('#fdRoot .fdPNav .pnItem')].find(b=>/Raporlar/.test(b.textContent)).click());await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{const h=document.querySelector('#fdRoot .fdRepHero');const on=document.querySelector('#fdRoot .fdRepCh .fdChip.on'),off=document.querySelector('#fdRoot .fdRepCh .fdChip:not(.on)');
   return {hero:h?{b:h.querySelector('b').textContent,fs:parseFloat(getComputedStyle(h.querySelector('b')).fontSize)}:null,on:on&&getComputedStyle(on).backgroundColor,off:off&&getComputedStyle(off).backgroundColor,cur:(document.querySelector('#fdRoot .fdPNav .pnItem.on .l')||{}).textContent,theme:document.documentElement.getAttribute('data-theme')}});
  ok(r.hero&&r.hero.b==='255 TL'&&r.hero.fs>=30&&(r.on==='rgb(40, 128, 79)'||r.on==='rgb(31, 107, 69)'),'['+mode+'] Raporlar: büyük hakediş (aynı hesap) + seçili çip yeşil: '+JSON.stringify(r));
  ok(r.cur==='Raporlar'&&r.on!==r.off,'['+mode+'] Raporlar: alt menü seçili: '+JSON.stringify(r));
  if(mode==='mutfak')ok(r.theme==='dark','[mutfak] Raporlar da koyu');
  await shot(p,'yemek-raporlar-'+mode,false);
  // Ayarlar: sabit kaydet çubuğu alt menünün üstünde
  await p.evaluate(()=>[...document.querySelectorAll('#fdRoot .fdPNav .pnItem')].find(b=>/Ayarlar/.test(b.textContent)).click());await p.waitForTimeout(1500);
  r=await p.evaluate(()=>{window.scrollTo(0,200);const s=document.querySelector('#fdRoot .fdSticky');const n=document.querySelector('#fdRoot .fdPNav');return s&&n?{sb:Math.round(s.getBoundingClientRect().bottom),nt:Math.round(n.getBoundingClientRect().top),cur:n.querySelector('.pnItem.on .l').textContent}:null});
  ok(r&&r.sb<=r.nt&&r.cur==='Ayarlar','['+mode+'] Ayarlar: kaydet çubuğu alt menünün üstünde: '+JSON.stringify(r));
  await shot(p,'yemek-ayarlar-'+mode,false);
  // Mutfak modu müşteri tarafını etkilemez
  if(mode==='mutfak'){
   await p.evaluate(()=>showFoodHome());await p.waitForTimeout(1200);
   ok(await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='light'),'[mutfak] müşteri ana sayfasında kayıtlı tema (krem/açık) geri geldi');
   await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1300);
   ok(await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='dark'),'[mutfak] panele dönünce yine koyu');
   await p.evaluate(()=>{const i=document.getElementById('fdKmSw');i.checked=false;i.dispatchEvent(new Event('change'))});await p.waitForTimeout(200);
   ok(await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='light'&&localStorage.getItem('isimi_food_kitchen')==='0'),'[mutfak] kapatınca kayıtlı tema');
  }
  ok(!st.errors.length,'['+mode+'] Yemek sayfa hatası: '+st.errors.join(' | '));
  await ctx.close();
  if(mode==='krem'){
   // masaüstü: üst sekmeler, alt menü yok
   ({ctx,p,st}=await foodPage({w:1280,h:900,visible:true},true,'owner'));await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1500);
   r=await p.evaluate(()=>({sub:getComputedStyle(document.querySelector('#fdRoot .fdSub')).display,nav:getComputedStyle(document.querySelector('#fdRoot .fdPNav')).display}));
   ok(r.sub!=='none'&&r.nav==='none','[1280] masaüstünde üst sekmeler, alt menü yok: '+JSON.stringify(r));await ctx.close();
   // personel: menü yok (rol kısıtı aynı)
   ({ctx,p,st}=await foodPage({w:390,h:844,visible:true},true,'staff'));await p.evaluate(()=>showFoodBusiness('v1'));await p.waitForTimeout(1500);
   ok(await p.evaluate(()=>!document.querySelector('#fdRoot .fdPNav')&&!document.querySelector('#fdRoot .fdSub')&&!!document.getElementById('fdOpenCard')),'[personel] alt/üst menü yok, Bugün kartı var');await ctx.close();
  }
  if(mode==='mutfak')continue;
  /* ================= Özüne Dön satıcı ================= */
  ({ctx,p,st}=await open(br,{w:390,h:844,visible:true,theme:light?'light':'dark'}));await enter(p);
  const go=async(tab)=>{await p.evaluate(t=>{document.querySelectorAll('.ozOv').forEach(x=>x.remove());OZ.go('seller',{tab:t})},tab);await p.waitForTimeout(1600)};
  await go('ozet');
  r=await p.evaluate(()=>{const n=document.getElementById('ozNav');const b=[...n.querySelectorAll('.ozNavB')];const cur=n.querySelector('[aria-current=page]');const off=n.querySelector('.ozNavB:not([aria-current])');
   return {pn:n.classList.contains('pnNav'),cls:b.every(x=>x.classList.contains('pnItem')),h:b.map(x=>Math.round(x.getBoundingClientRect().height)),cur:cur&&getComputedStyle(cur).backgroundColor,off:off&&getComputedStyle(off).backgroundColor,
    trunc:b.filter(x=>{const l=x.querySelector('.l');return l.scrollWidth>l.clientWidth}).map(x=>x.textContent),w:Math.round(n.getBoundingClientRect().width),
    cnt:[...document.querySelectorAll('#ozSP .ozSoCnt .c')].map(c=>({t:c.querySelector('small').textContent,bg:getComputedStyle(c).backgroundColor,col:getComputedStyle(c).color})),bg:getComputedStyle(document.body).backgroundColor}});
  ok(r.pn&&r.cls&&r.h.length===5&&r.h.every(x=>x>=62)&&!r.trunc.length&&r.w<=390,'['+mode+'] Özüne Dön: alt menü ortak sınıf, 5 öğe ≥62px sığar: '+JSON.stringify(r));
  ok(/^rgb\(242, (180|193)/.test(r.cur||'')&&r.cur!==r.off,'['+mode+'] Özüne Dön: seçili dolu sarı: '+r.cur);
  ok(r.cnt.length>=3&&r.cnt.slice(0,3).map(x=>x.t).join(',')==='Yeni,Hazırlanıyor,Kargoda'&&new Set(r.cnt.map(x=>x.bg)).size===r.cnt.length,'['+mode+'] Özüne Dön: renkli sayaçlar (Yeni/Hazırlanıyor/Kargoda): '+JSON.stringify(r.cnt));
  ok(r.cnt.every(x=>CR(x.bg,r.bg)>=3&&CR(x.col,x.bg)>=4.5),'['+mode+'] Özüne Dön: sayaç zemini ≥3, yazı ≥4.5: '+JSON.stringify(r.cnt.map(x=>CR(x.bg,r.bg).toFixed(2)+'/'+CR(x.col,x.bg).toFixed(2))));
  e=await endClear(p,'#ozSP','#ozNav','.x-none');ok(e.lastB<=e.navT,'['+mode+'] Siparişler: içerik sonu alt menünün üstünde: '+JSON.stringify(e));
  await p.evaluate(()=>window.scrollTo(0,0));await shot(p,'oz-siparisler-'+mode,false);
  // Ürünler
  await go('urunler');
  r=await p.evaluate(()=>{const b=document.querySelector('#ozSP .ozSpNew');return {t:b&&b.textContent,h:b&&Math.round(b.getBoundingClientRect().height),rows:[...document.querySelectorAll('#ozSP .ozSpRow')].map(x=>x.dataset.pst+':'+x.querySelector('.ozPSt .ozTag').textContent+':'+getComputedStyle(x).borderLeftColor)}});
  ok(r.t==='＋ Ürün ekle'&&r.h>=56&&r.rows.length&&r.rows.every(x=>/^(ok|warn|bad|x):/.test(x)),'['+mode+'] Ürünler: büyük "＋ Ürün ekle" + durum rozeti/kenarı: '+JSON.stringify(r));
  await shot(p,'oz-urunler-'+mode,false);
  // Kazanç
  await go('kazanc');
  r=await p.evaluate(()=>[...document.querySelectorAll('#ozSP .ozErn3 .ozErn')].map(x=>x.querySelector('em').textContent+'='+x.querySelector('b').textContent+':'+getComputedStyle(x).borderTopColor));
  ok(r.length===3&&/^Bekleyen=1\.200,00/.test(r[0])&&/^Hakedişe hazır=800,00/.test(r[1])&&/^Ödenen=5\.000,00/.test(r[2])&&new Set(r.map(x=>x.split(':').pop())).size===3,'['+mode+'] Kazanç: 3 renkli kart, aynı değerler: '+JSON.stringify(r));
  await shot(p,'oz-kazanc-'+mode,false);
  // Mağaza ayarları
  await go('magaza');
  r=await p.evaluate(()=>{window.scrollTo(0,600);const b=document.querySelector('#ozSP [data-a=storeSave]');const n=document.getElementById('ozNav').getBoundingClientRect();const bb=b.getBoundingClientRect();
   return {st:[...document.querySelectorAll('#ozSP .ozSecSt')].map(x=>x.textContent),bb:Math.round(bb.bottom),bt:Math.round(bb.top),nt:Math.round(n.top),h:Math.round(bb.height),bg:getComputedStyle(b).backgroundColor}});
  ok(r.st.length===5&&r.st.every(x=>x==='Tamam ✓'||x==='Eksik'),'['+mode+'] Mağaza: bölüm rozetleri: '+JSON.stringify(r.st));
  ok(r.h>=56&&r.bb<=r.nt&&r.bt>0&&r.bb>r.nt-140,'['+mode+'] Mağaza: kaydet altta sabit, alt menünün üstünde: '+JSON.stringify(r));
  await shot(p,'oz-magaza-'+mode,false);
  ok((await overflow(p))<=0,'['+mode+'] Özüne Dön: yatay taşma');
  ok(!st.errors.length,'['+mode+'] Özüne Dön sayfa hatası: '+st.errors.join(' | '));
  await ctx.close();
 }
 await br.close();
 if(shots.length)console.log('ekran görüntüleri ('+shots.length+'): '+SHOTS);
 if(fails.length){console.error('p21-panel BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p21-panel: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p21-panel HATA:',e);process.exit(1)});
