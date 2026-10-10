// V1: üretici sayfası favori kalbi — 390px, sahte veri (oz_toggle_favorite_seller sahte). Çalıştırma: node tests/oz-ui/v1-uretici-kalp.test.js
// Doğrulanan: slider'ın sağ üstünde ≥44px kalp; açılışta durum oz_favorite_sellers okumasından (boş / dolu kırmızı);
// dokunma slider'ı/slayt panelini açmaz; iyimser güncelleme + oz_toggle_favorite_seller(p_seller); RPC hatası ya da farklı
// dönüşte eski durum + kısa uyarı; çağrı sürerken art arda dokunmada tek çağrı; girişsizde RPC yok, giriş yönlendirmesi;
// 390px'te çip ve noktalarla çakışma yok. Ürün kalbi (oz_toggle_favorite) aynı.
const {chromium,open,enter}=require('./harness.js');
async function setup(br,opt){
 const {p,st}=await open(br,Object.assign({w:390,h:844,visible:true},opt));
 await p.evaluate(fav=>{const F=window.__OZ_FX;F.R.oz_producer_detail={id:'s1',display_name:'Yayla',city:'Muğla',cover_url:'https://img.test/bal-recel.jpg',product_count:4,categories:[{slug:'bal',name:'Bal',count:1}]};
  F.R.oz_search_products=F.R.oz_search_products.slice(0,4).map((x,i)=>Object.assign({},x,{image:'https://img.test/'+['recel','bal-recel','konserve','kuru-yemis'][i]+'.jpg'}));
  F.T.oz_favorite_sellers=fav?[{seller_id:'s9'},{seller_id:'s1'}]:[{seller_id:'s9'}];
  /* sahte sunucu durumu: toggle yeni durumu döndürür; gecikme ile çift dokunma denenir */
  window.__srv={on:!!fav,delay:20,wrong:false};F.R.oz_toggle_favorite_seller=true;
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){if(fn==='oz_toggle_favorite_seller'){await new Promise(r=>setTimeout(r,window.__srv.delay));await o(fn,a);window.__srv.on=!window.__srv.on;return window.__srv.wrong?!window.__srv.on:window.__srv.on}return o(fn,a)}},opt.fav);
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('store',{id:'s1'}));await p.waitForTimeout(1600);
 return {p,st};
}
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const H=p=>p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozPP .cv [data-a=sFav]');if(!b)return null;const r=b.getBoundingClientRect(),cv=document.querySelector('#ozRoot .ozPP .cv').getBoundingClientRect();
  const ov=(a,c)=>a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom;const n=document.getElementById('ozPPN'),d=document.getElementById('ozPPD');
  const col=getComputedStyle(b).color.match(/\d+/g).map(Number);const svg=b.querySelector('svg');
  return {on:b.classList.contains('on'),pressed:b.getAttribute('aria-pressed'),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top-cv.top),right:Math.round(cv.right-r.right),
   red:col[0]>200&&col[0]-col[1]>60,filled:!!svg&&getComputedStyle(svg).fill!=='none',bg:getComputedStyle(b).backgroundColor,dis:b.disabled,
   hitChip:!!n&&ov(r,n.getBoundingClientRect()),hitDots:!!d&&[...d.children].some(i=>ov(r,i.getBoundingClientRect())),chip:!!n,dots:!!d}});
 const clk=async(p,sel)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel)}};
 const calls=st=>st.calls.filter(c=>c[0]==='oz_toggle_favorite_seller');
 // 1) favoride değil → boş; dokun → dolu kırmızı, slider/panel açılmaz
 let {p,st}=await setup(br,{fav:false});
 let h=await H(p);
 ok(h&&!h.on&&h.pressed==='false'&&h.w>=44&&h.h>=44&&h.top<=12&&h.right<=12&&/rgba\(/.test(h.bg),'boş kalp sağ üstte, ≥44px, yarı saydam zemin: '+JSON.stringify(h));
 ok(h&&h.chip&&h.dots&&!h.hitChip&&!h.hitDots,'çip ve noktalarla çakışma olmamalı: '+JSON.stringify(h));
 ok(st.calls.some(c=>c[0]==='GET oz_favorite_sellers'&&/seller_id=eq\.s1/.test(c[1])),'açılışta oz_favorite_sellers (seller_id=eq.s1) okunmalı');
 const i0=await p.evaluate(()=>(document.getElementById('ozPPS')||{__oz:{state:()=>({i:-1})}}).__oz.state().i);
 await clk(p,'#ozRoot .ozPP .cv [data-a=sFav]');await p.waitForTimeout(500);h=await H(p);
 ok(h&&h.on&&h.red&&h.filled,'dokununca dolu kırmızı: '+JSON.stringify(h));
 ok(calls(st).length===1&&calls(st)[0][1].p_seller==='s1','oz_toggle_favorite_seller(p_seller:s1) bir kez: '+JSON.stringify(calls(st)));
 ok(!(await p.$('.ozOv.ozPdS'))&&!st.calls.some(c=>c[0]==='oz_product_detail')&&(await p.evaluate(()=>(document.getElementById('ozPPS')||{__oz:{state:()=>({i:-1})}}).__oz.state().i))===i0,'kalp slider/slayt panelini açmamalı');
 // 2) çift dokunma: çağrı sürerken kilitli → tek çağrı
 await p.evaluate(()=>{window.__srv.delay=600});const n0=calls(st).length;
 await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozPP .cv [data-a=sFav]');if(b){b.click();b.click();b.click()}});await p.waitForTimeout(150);
 h=await H(p);ok(h&&h.dis&&!h.on,'çağrı sürerken kilitli ve iyimser boş: '+JSON.stringify(h));
 await p.waitForTimeout(900);h=await H(p);
 ok(calls(st).length===n0+1&&h&&!h.on&&!h.dis,'art arda dokunmada tek çağrı, sonra kilit açılır: '+(calls(st).length-n0)+' '+JSON.stringify(h));
 // 3) RPC hatası → eski durum + uyarı
 await p.evaluate(()=>{window.__srv.delay=20;window.__OZ_FX.fail={oz_toggle_favorite_seller:'ağ hatası'}});
 await clk(p,'#ozRoot .ozPP .cv [data-a=sFav]');await p.waitForTimeout(500);h=await H(p);
 ok(h&&!h.on&&/Favori güncellenemedi/.test(await p.evaluate(()=>document.body.innerText)),'RPC hatasında eski (boş) durum + uyarı: '+JSON.stringify(h));
 // 4) farklı dönüş → eski durum
 await p.evaluate(()=>{window.__OZ_FX.fail={};window.__srv.wrong=true});
 await clk(p,'#ozRoot .ozPP .cv [data-a=sFav]');await p.waitForTimeout(500);h=await H(p);
 ok(h&&!h.on,'dönen değer farklıysa eski duruma dönmeli: '+JSON.stringify(h));
 // 5) ürün kalbi aynı akış
 await p.evaluate(()=>{window.__OZ_FX.R.oz_toggle_favorite=true;OZ.go('plist',{seller:'s1'})});await p.waitForTimeout(1300);
 await clk(p,'.ozGc[data-pid=p0] .tr [data-a=fav]');await p.waitForTimeout(500);
 ok(st.calls.some(c=>c[0]==='oz_toggle_favorite'&&c[1].p_product==='p0')&&calls(st).length===n0+3,'ürün kalbi oz_toggle_favorite ile aynı çalışmalı');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 // 6) favorideyse dolu açılır
 ({p,st}=await setup(br,{fav:true}));h=await H(p);ok(h&&h.on&&h.red&&h.filled&&h.pressed==='true','favorideki üretici dolu kırmızı açılmalı: '+JSON.stringify(h));await p.context().close();
 // 7) girişsiz: boş, okuma yok, dokununca giriş yönlendirmesi, RPC yok
 ({p,st}=await setup(br,{fav:false,logged:false}));h=await H(p);
 ok(h&&!h.on&&!st.calls.some(c=>c[0]==='GET oz_favorite_sellers'),'girişsiz: boş kalp, okuma yok: '+JSON.stringify(h));
 await clk(p,'#ozRoot .ozPP .cv [data-a=sFav]');await p.waitForTimeout(500);
 ok(calls(st).length===0&&/Devam etmek için giriş yap/.test(await p.evaluate(()=>document.body.innerText)),'girişsiz dokunuş giriş yönlendirmesi, RPC yok');
 ok(!st.errors.length,'[girişsiz] sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('v1-uretici-kalp BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('v1-uretici-kalp: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('v1-uretici-kalp HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
