// Paket 26: Özüne Dön satıcı Siparişler — Paket 25 kart/sütun düzeni (yalnız arayüz) — 390px + 1280px, krem ve koyu, sahte RPC.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p26-satici-siparis.test.js   (P26_SHOTS=<klasör> verilirse ekran görüntüsü yazar)
// Doğrulanan: sayaçlar dolu renkli, seçili olana 2px zıt çerçeve, sayı büyük, dokununca mevcut süzgeç; kart üst şeridi durum tonunda (Yeni/Hazırlanıyor/Kargoda
// farklı), #no + alıcı kısa adı (yalnız veri varsa) + "N dk/saat/gün önce"; durum etiketi, ödeme · gönderim satırı, büyük toplam; yeni siparişe kırmızı 2px çerçeve;
// Reddet dar solda, Kabul et geniş sağda ≥56px (data-a aynı); Hazırlandı / Kargoya ver yerinde; ≥900px'te 3 sütun (başlık sayaç, boşsa "Sipariş yok"),
// sipariş okuma çağrısı sayısı dar ekranla aynı; kontrast ≥4.5, ≥44px, yatay taşma yok, içerik alt menünün üstünde biter.
const {chromium,open,enter,overflow}=require('./harness.js');
const fs=require('fs'),path=require('path');
const SHOTS=process.env.P26_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const CR=(a,b)=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return /^color\(srgb/.test(c)?m.map((v,i)=>i<3?v*255:v):m};const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};c=P(c);return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const page=async(w,light,noShip)=>{const r=await open(br,{w,h:w>900?900:844,visible:true,theme:light?'light':'dark'});
  await r.p.evaluate(noShip=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];const ago=m=>new Date(Date.now()-m*60000).toISOString();
   const L=[['n1','new',3,'Ayşe Kaya'],['n2','new',90,''],['a1','accepted',60*26,'Mehmet Yılmaz'],['k1','packed',200,'Zeynep'],['s1','shipped',60*24*3,'Ali Demir'],['r1','return_requested',60*24*5,'Can Er']].filter(x=>!(noShip&&x[1]==='shipped'));
   window.__DB=L.map(([id,s,m,n])=>Object.assign({},base,{id,order_no:'OZ26-'+id.toUpperCase(),status:s,created_at:ago(m),payment_method:'cod',total_kurus:129990,buyer_name:null,
    ship_to:{recipient:n||null,district:'Ula',city:'Muğla',phone:'05000000000',line1:'Mah. 1'},return:s==='return_requested'?{id:'rt1',status:'requested',reason:'Hasarlı'}:null,tracking_no:s==='shipped'?'TR123':null,carrier:s==='shipped'?'Yurtiçi':null}));
   const o=window.PF.rpc;window.PF.rpc=async function(fn,x){
    if(fn==='oz_seller_orders'){window.__ozLog(fn,x);return JSON.parse(JSON.stringify(window.__DB.filter(y=>!x.p_status||y.status===x.p_status)))}
    if(fn==='oz_seller_dashboard'){const r=await o(fn,x);const c={};window.__DB.forEach(y=>{c[y.status]=(c[y.status]||0)+1});return Object.assign({},r,{orders:c,open_returns:0})}
    if(fn==='oz_transition_order'){window.__ozLog(fn,x);return {ok:true}}
    return o(fn,x)}},!!noShip);
  await enter(r.p);await r.p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await r.p.waitForTimeout(1700);return r};
 const tab=async(p,sg)=>{await p.evaluate(sg=>document.querySelector('#ozSP .ozSoCnt [data-st='+sg+']').click(),sg);await p.waitForTimeout(1300)};
 const cnt=p=>p.evaluate(()=>[...document.querySelectorAll('#ozSP .ozSoCnt .c')].map(b=>{const cs=getComputedStyle(b);return {st:b.dataset.st,on:b.classList.contains('on'),n:b.querySelector('b').textContent,bg:cs.backgroundColor,bd:cs.borderTopColor,bw:cs.borderTopWidth,
   col:getComputedStyle(b.querySelector('b')).color,lc:getComputedStyle(b.querySelector('small')).color,fs:parseFloat(getComputedStyle(b.querySelector('b')).fontSize),h:Math.round(b.getBoundingClientRect().height)}}));
 const cards=p=>p.evaluate(()=>{const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255, 255, 255)'};
  const nw=(()=>{const d=document.createElement('i');d.style.color='var(--st-new)';document.getElementById('ozSP').appendChild(d);const c=getComputedStyle(d).color;d.remove();return c})();
  return [...document.querySelectorAll('#ozSP .ozSoC')].map(c=>{const hd=c.querySelector('.nxHd'),ag=c.querySelector('.nxAge'),bn=c.querySelector('.nxHd .bn'),mp=c.querySelector('.nxMp');const bt=[...c.querySelectorAll('.ozSoActs>button')];
   return {st:c.dataset.st,g:[...c.classList].find(x=>/^g[nps]$/.test(x))||'',col:c.closest('.fdCol')?c.closest('.fdCol').dataset.k:null,no:hd&&hd.querySelector('.id b').textContent,bn:bn?bn.textContent:null,age:ag?ag.textContent:'',
    hdBg:hd&&getComputedStyle(hd).backgroundColor,cardBg:bgOf(c),noCol:hd&&getComputedStyle(hd.querySelector('.id b')).color,agCol:ag&&getComputedStyle(ag).color,mp:mp?mp.textContent:'',mpCol:mp?getComputedStyle(mp).color:'',
    tot:(c.querySelector('.nxTot b')||{}).textContent||'',badge:!!c.querySelector('.nxSt .ozStB'),bw:getComputedStyle(c).borderTopWidth,bc:getComputedStyle(c).borderTopColor,nw,
    bt:bt.map(b=>({t:b.textContent.trim(),a:b.dataset.a,act:b.dataset.act||'',c:b.className,h:Math.round(b.getBoundingClientRect().height),w:Math.round(b.getBoundingClientRect().width)}))}})});
 const shot=async(p,n)=>{if(!SHOTS)return;await p.evaluate(()=>document.querySelectorAll('#v2Toast,.ozToast').forEach(x=>x.remove()));await p.screenshot({path:path.join(SHOTS,n+'.png'),fullPage:true})};
 for(const light of [true,false]){const th=light?'krem':'koyu';
  /* ---------- 390px ---------- */
  let {ctx,p,st}=await page(390,light);const T='['+th+' 390]';
  ok(await p.evaluate(()=>!document.querySelector('#ozSP .fdCols')),T+' telefonda sütun yok (mevcut liste/süzgeç)');
  await tab(p,'new');let c=await cnt(p);
  ok(JSON.stringify(c.map(x=>x.st+':'+x.n))==='["new:2","prep:2","ship:1","issue:1"]',T+' sayaçlar: '+JSON.stringify(c.map(x=>x.st+':'+x.n)));
  const pg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);const on=c.find(x=>x.on);ok(on&&on.st==='new'&&on.bw==='2px'&&Math.max(CR(on.bd,pg),CR(on.bd,on.bg))>=3&&c.filter(x=>!x.on).every(x=>x.bd!==on.bd),T+' seçili sayaçta 2px zıt çerçeve: '+JSON.stringify(c.map(x=>[x.st,x.on,x.bd,x.bg])));
  ok(c.every(x=>x.fs>=24&&x.h>=44&&CR(x.col,x.bg)>=4.5&&CR(x.lc,x.bg)>=4.5),T+' sayı büyük, kontrast ≥4.5: '+JSON.stringify(c.map(x=>[x.fs,x.h,CR(x.col,x.bg).toFixed(2)])));
  let k=await cards(p);
  ok(k.length===2&&k.every(x=>x.g==='gn'&&/^#OZ26-N\d$/.test(x.no)&&/önce$/.test(x.age)&&x.badge&&x.mp==='Ödeme: Kapıda ödeme · Ula, Muğla'&&/1\.299,90/.test(x.tot)),T+' Yeni kart: şerit, yaş, durum, ödeme · gönderim, toplam: '+JSON.stringify(k.map(x=>[x.no,x.age,x.mp,x.tot])));
  const n1=k.find(x=>x.no==='#OZ26-N1'),n2=k.find(x=>x.no==='#OZ26-N2');
  ok(n1&&n1.bn==='Ayşe K.'&&n1.age==='3 dk önce'&&n2&&n2.bn===null&&n2.age==='1 saat önce',T+' alıcı kısa adı yalnız veri varsa; yaş biçimi: '+JSON.stringify([n1&&[n1.bn,n1.age],n2&&[n2.bn,n2.age]]));
  ok(k.every(x=>x.bw==='2px'&&x.bc===x.nw&&x.hdBg!==x.cardBg),T+' yeni sipariş kırmızı 2px çerçeve + tonlu şerit: '+JSON.stringify(k.map(x=>[x.bw,x.bc,x.nw,x.hdBg])));
  ok(k.every(x=>CR(x.noCol,x.hdBg)>=4.5&&CR(x.agCol,x.hdBg)>=4.5&&CR(x.mpCol,x.cardBg)>=4.5),T+' şerit/alt satır kontrast ≥4.5: '+JSON.stringify(k.map(x=>[CR(x.noCol,x.hdBg).toFixed(2),CR(x.agCol,x.hdBg).toFixed(2),CR(x.mpCol,x.cardBg).toFixed(2)])));
  ok(k.every(x=>x.bt.length===2&&x.bt[0].a==='soCancel'&&x.bt[0].t==='✕ Reddet'&&x.bt[1].a==='soAct'&&x.bt[1].act==='accept'&&/btnNext/.test(x.bt[1].c)&&x.bt.every(b=>b.h>=56)&&x.bt[0].w<x.bt[1].w),T+' Reddet dar solda, Kabul et geniş sağda ≥56px: '+JSON.stringify(k.map(x=>x.bt)));
  ok((await overflow(p))<=0,T+' yatay taşma (Yeni)');await shot(p,'p26-'+th+'-390-yeni');
  const grp={n:k[0].hdBg};
  await tab(p,'prep');k=await cards(p);grp.p=k[0]&&k[0].hdBg;
  ok(k.length===2&&k.every(x=>x.g==='gp')&&JSON.stringify(k.map(x=>x.bt[0]&&x.bt[0].t).sort())==='["📦 Hazırlandı","🚚 Kargoya ver"]'&&k.every(x=>x.bt[0].h>=56&&/btnNext/.test(x.bt[0].c)&&x.bt.filter(b=>/btnNext/.test(b.c)).length===1),T+' Hazırlanıyor: Hazırlandı/Kargoya ver yerinde: '+JSON.stringify(k.map(x=>[x.g,x.bt.map(b=>b.t)])));
  ok(k.every(x=>CR(x.noCol,x.hdBg)>=4.5),T+' Hazırlanıyor şerit kontrast');
  await tab(p,'ship');k=await cards(p);grp.s=k[0]&&k[0].hdBg;
  ok(k.length===1&&k[0].g==='gs'&&/gün önce/.test(k[0].age)&&CR(k[0].noCol,k[0].hdBg)>=4.5,T+' Kargoda kartı: '+JSON.stringify(k[0]&&[k[0].g,k[0].age]));
  ok(await p.evaluate(()=>!!document.querySelector('#ozSP .ozSoC .ozSoTrk [data-a=copyTrk]')),T+' kargo takip satırı aynen');
  ok(new Set(Object.values(grp)).size===3,T+' 3 durum şeridi farklı ton: '+JSON.stringify(grp));
  ok((await overflow(p))<=0,T+' yatay taşma (Kargoda)');await shot(p,'p26-'+th+'-390-kargoda');
  const e=await p.evaluate(()=>{window.scrollTo(0,document.scrollingElement.scrollHeight);const n=document.getElementById('ozNav');const k=[...document.querySelectorAll('#ozSP > *')].filter(e=>e.getBoundingClientRect().height).pop();return n&&k?[Math.round(k.getBoundingClientRect().bottom),Math.round(n.getBoundingClientRect().top)]:null});
  ok(!e||e[0]<=e[1]+1,T+' içerik alt menünün üstünde: '+e);
  // süzgeçsiz görünüm: kaç okuma çağrısı (1280 ile karşılaştırılır)
  await tab(p,'ship');const n0=st.calls.length;await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
  const reads390=st.calls.slice(n0).filter(x=>x[0]==='oz_seller_orders').length;
  ok(!st.errors.length,T+' sayfa hatası: '+st.errors.join(' | '));await ctx.close();
  /* ---------- 1280px: 3 sütun ---------- */
  ({ctx,p,st}=await page(1280,light,true));const W='['+th+' 1280]';
  const n1280=st.calls.length;await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
  ok(st.calls.slice(n1280).filter(x=>x[0]==='oz_seller_orders').length===reads390,W+' sipariş okuma çağrısı dar ekranla aynı ('+reads390+')');
  let r=await p.evaluate(()=>({cols:[...document.querySelectorAll('#ozSP .fdCol')].map(s=>({k:s.dataset.k,h:s.querySelector('.c small').textContent+':'+s.querySelector('.c b').textContent,n:s.querySelectorAll('.ozSoC').length,e:(s.querySelector('.fdColE')||{}).textContent||'',x:Math.round(s.getBoundingClientRect().left),w:Math.round(s.getBoundingClientRect().width)})),
   top:[...document.querySelectorAll('#ozSP > .ozSoCnt .c')].map(b=>b.dataset.st),issue:document.querySelectorAll('#ozSP > .ozList .ozSoC[data-st=return_requested]').length}));
  ok(JSON.stringify(r.cols.map(x=>x.k))==='["new","prep","ship"]'&&r.cols[0].x<r.cols[1].x&&r.cols[1].x<r.cols[2].x&&r.cols.every(x=>x.w>=240),W+' 3 sütun yan yana: '+JSON.stringify(r.cols));
  ok(JSON.stringify(r.cols.map(x=>x.h))==='["Yeni:2","Hazırlanıyor:2","Kargoda:0"]'&&JSON.stringify(r.cols.map(x=>x.n))==='[2,2,0]'&&r.cols[2].e==='Sipariş yok',W+' başlık renkli+sayılı, kartlar sütununda, boş sütun "Sipariş yok": '+JSON.stringify(r.cols));
  ok(JSON.stringify(r.top)==='["issue"]'&&r.issue===1,W+' Sorunlu sayaç + listesi sütunların dışında korunur: '+JSON.stringify([r.top,r.issue]));
  k=await cards(p);ok(k.filter(x=>x.col).every(x=>(x.col==='new'&&x.g==='gn')||(x.col==='prep'&&x.g==='gp')),W+' kart tonu sütun durumunda');
  ok(k.filter(x=>x.col==='new').every(x=>x.bt.map(b=>b.t).join('|')==='✕ Reddet|✓ Kabul et'),W+' Yeni sütunda Reddet | Kabul et');
  c=await p.evaluate(()=>[...document.querySelectorAll('#ozSP .fdCol .c')].map(b=>{const cs=getComputedStyle(b);return [cs.backgroundColor,getComputedStyle(b.querySelector('b')).color,Math.round(b.getBoundingClientRect().height)]}));
  ok(c.every(x=>CR(x[1],x[0])>=4.5&&x[2]>=44),W+' sütun başlığı kontrast/boyut: '+JSON.stringify(c));
  ok((await overflow(p))<=0,W+' yatay taşma');await shot(p,'p26-'+th+'-1280');
  await p.evaluate(()=>document.querySelector('#ozSP .fdCol[data-k=prep] .c').click());await p.waitForTimeout(1300);
  r=await p.evaluate(()=>({cols:document.querySelectorAll('#ozSP .fdCol').length,on:(document.querySelector('#ozSP .fdCol .c.on')||{}).dataset}));
  ok(r.cols===3&&r.on&&r.on.st==='prep','['+th+' 1280] başlık → mevcut süzgeç, sütunlar kalır: '+JSON.stringify(r));
  await p.evaluate(()=>document.querySelector('#ozSP .ozSoCnt [data-st=issue]').click());await p.waitForTimeout(1300);
  ok(await p.evaluate(()=>!document.querySelector('#ozSP .fdCols')&&!!document.querySelector('#ozSP .ozSoC[data-st=return_requested]')),W+' Sorunlu süzgeci: mevcut liste');
  ok(!st.errors.length,W+' sayfa hatası: '+st.errors.join(' | '));await ctx.close();
 }
 await br.close();
 if(fails.length){console.error('p26-satici-siparis BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p26-satici-siparis: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p26-satici-siparis HATA:',e);process.exit(1)});
