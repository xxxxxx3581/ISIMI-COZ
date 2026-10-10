// Q1-4: müşteri alt menüsü ve üst çubuk renkleri — 390px. Çalıştırma: node tests/oz-ui/q1-renk.test.js
// Doğrulanan: alt menü zemini ana zeminden bir ton açık (#352A1F), üstte ince altın çizgi; sekme renkleri Keşfet yeşil,
// Üreticiler altın, Siparişlerim mavi, Sepet mercan, Hesabım mor (gri değil); seçili sekme kendi renginin yarı saydam zemini;
// okunurluk (seçili ≥ 4.5:1, seçili olmayan ≥ 3:1). Üst çubukta başlık altın, arama/bildirim yuvarlak sıcak zeminli.
// Sepet sayacı/rozetler çalışır; satıcı menüsü (N1) değişmez.
const {chromium,open,enter}=require('./harness.js');
const EXP={home:[126,211,154],producers:[239,195,90],orders:[134,184,232],cart:[240,154,132],account:[200,180,240]};
function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
function blend(fg,bg,a){return fg.map((v,i)=>v*a+bg[i]*(1-a))}
const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>localStorage.setItem('isimi_oz_cart',JSON.stringify([{variant_id:'v1',product_id:'p0',name:'X',label:'',price_kurus:1000,seller_id:'s1',seller_name:'Y',qty:2}])));
 await enter(p);await p.waitForTimeout(900);
 const read=()=>p.evaluate(()=>{const n=document.getElementById('ozNav');const cs=getComputedStyle(n);
  return {bg:cs.backgroundColor,bt:cs.borderTopColor,btw:cs.borderTopWidth,tabs:[...n.querySelectorAll('.ozNavB')].map(b=>{const l=b.querySelector('.l');return {k:b.dataset.k,cur:b.getAttribute('aria-current')==='page',color:getComputedStyle(b).color,op:+getComputedStyle(l).opacity,bg:getComputedStyle(b).backgroundColor}}),
   cartN:(document.getElementById('ozCartN')||{}).textContent,cartH:(document.getElementById('ozCartN')||{}).hidden}});
 for(const k of ['home','orders','account']){
  if(k!=='home'){try{await p.click('#ozNav [data-k='+k+']',{timeout:3000})}catch(e){fails.push('sekme tıklanamadı: '+k)}await p.waitForTimeout(900)}
  const r=await read();const nbg=rgb(r.bg);
  ok(r.bg==='rgb(53, 42, 31)','alt menü zemini #352A1F olmalı: '+r.bg);
  ok(r.bt==='rgb(201, 163, 58)'&&r.btw==='1px','üstte ince altın çizgi: '+r.bt+' '+r.btw);
  r.tabs.forEach(t=>{const c=rgb(t.color),e=EXP[t.k];
   ok(e&&c[0]===e[0]&&c[1]===e[1]&&c[2]===e[2],'['+k+'] '+t.k+' rengi beklenen ton olmalı: '+t.color);
   ok(Math.max(...c)-Math.min(...c)>40,'['+k+'] '+t.k+' gri olmamalı');
   if(t.cur){const b=rgb(t.bg);ok(b.length===4&&b[3]>0&&b[3]<0.5&&b[0]===e[0]&&b[1]===e[1]&&b[2]===e[2],'['+k+'] seçili sekme kendi renginin yarı saydam zemini: '+t.bg);
    const under=blend(e,nbg,b[3]);ok(ratio(blend(c,under,t.op),under)>=4.5,'['+k+'] seçili sekme okunur (≥4.5:1)')}
   else ok(ratio(blend(c,nbg,t.op),nbg)>=3,'['+k+'] '+t.k+' seçili olmayan okunur (≥3:1): '+ratio(blend(c,nbg,t.op),nbg).toFixed(2));
  });
  ok(r.tabs.filter(t=>t.cur).length===1&&r.tabs.find(t=>t.cur).k===k,'['+k+'] seçili sekme doğru');
  ok(r.cartN==='2'&&r.cartH===false,'['+k+'] sepet sayacı 2 görünmeli');
 }
 const top=await p.evaluate(()=>{const b=document.querySelector('#ozTop .ozBrand');const s=document.querySelector('#ozTop [data-k=search]'),be=document.querySelector('#ozTop [data-a=bell]');const f=e=>{const c=getComputedStyle(e);return {r:c.borderRadius,bg:c.backgroundColor,w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}};
  return {brand:getComputedStyle(b).color,dön:getComputedStyle(b.querySelector('b')).color,s:f(s),b:f(be),bell:!!document.getElementById('ozBellN')}});
 ok(top.brand==='rgb(242, 193, 78)'&&top.dön==='rgb(242, 193, 78)','üst başlık altın: '+JSON.stringify([top.brand,top.dön]));
 [['arama',top.s],['bildirim',top.b]].forEach(([n,x])=>{const c=rgb(x.bg);ok(x.r==='50%'&&x.w===x.h&&c.length===4&&c[3]>0&&c[0]>c[2],n+' düğmesi yuvarlak sıcak zeminli: '+JSON.stringify(x))});
 ok(top.bell,'bildirim rozeti yerinde');
 // satıcı menüsü değişmez
 await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1500);
 const sel=await p.evaluate(()=>{const n=document.getElementById('ozNav');const c=n.querySelector('.ozNavB[aria-current=page]');return {mode:n.dataset.mode,bg:getComputedStyle(n).backgroundColor,bt:getComputedStyle(n).borderTopColor,cur:getComputedStyle(c).backgroundColor,col:getComputedStyle(n.querySelector('.ozNavB:not([aria-current])')).color}});
 ok(sel.mode==='seller'&&sel.bg==='rgb(36, 27, 19)'&&sel.bt==='rgb(201, 163, 58)'&&sel.cur==='rgb(242, 180, 49)'&&sel.col==='rgb(232, 220, 198)','satıcı menüsü değişmemeli: '+JSON.stringify(sel));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('q1-renk BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('q1-renk: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('q1-renk HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
