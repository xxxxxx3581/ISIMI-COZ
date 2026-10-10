// G2-3: sepette bedava kargo ilerlemesi — 390px, sahte veri. Çalıştırma: node tests/oz-ui/g2-kargo.test.js
// Doğrulanan: eşik altında "Bedava kargo için X ₺ daha ekle" + doğru oranlı ince çubuk; eşiğe ulaşınca "Kargo bedava ✓";
// eşik sabit değil üretici kaydından okunur (farklı eşikte farklı tutar); eşik yoksa hiçbir şey görünmez.
const {chromium,open,enter}=require('./harness.js');
const LINE={variant_id:'v1',product_id:'p0',name:'Zeytinyağı',label:'500 ml',price_kurus:65000,seller_id:'s1',seller_name:'Yayla',qty:1,stock:10,nv:1};
async function scen(br,fo,qty){
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(([l,fo])=>{localStorage.setItem('isimi_oz_cart',JSON.stringify([l]));window.__OZ_FX.T.oz_addresses=[];window.__OZ_FX.R.oz_producer_detail={id:'s1',free_ship_over_kurus:fo}},[Object.assign({},LINE,{qty}),fo]);
 await enter(p);await p.waitForTimeout(600);await p.click('#ozNav [data-k=cart]');await p.waitForTimeout(1300);
 const r=await p.evaluate(()=>{const g=document.querySelector('#ozRoot .ozCoG2');const s=g&&g.querySelector('.ozShipP');if(!s)return {none:true};const i=s.querySelector('.bar i');
  return {t:s.innerText.replace(/\s+/g,' ').trim(),ok:s.classList.contains('ok'),w:i?Math.round(i.getBoundingClientRect().width/i.parentNode.getBoundingClientRect().width*100):null}});
 r.err=st.errors;await p.context().close();return r;
}
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 let r=await scen(br,100000,1);ok(r.t==='Bedava kargo için 350,00 ₺ daha ekle'&&!r.ok&&r.w>=63&&r.w<=67,'1.000 ₺ eşik, 650 ₺ sepet: 350 ₺ + %65 çubuk: '+JSON.stringify(r));
 r=await scen(br,200000,1);ok(r.t==='Bedava kargo için 1.350,00 ₺ daha ekle'&&r.w>=31&&r.w<=34,'eşik üretici kaydından okunmalı (2.000 ₺): '+JSON.stringify(r));
 r=await scen(br,100000,2);ok(r.ok&&/Kargo bedava ✓/.test(r.t)&&r.w===null,'eşik aşılınca "Kargo bedava ✓": '+JSON.stringify(r));
 r=await scen(br,null,1);ok(r.none,'eşik yoksa çubuk görünmemeli: '+JSON.stringify(r));
 r=await scen(br,0,1);ok(r.none,'eşik 0 ise çubuk görünmemeli: '+JSON.stringify(r));
 await br.close();
 if(fails.length){console.error('g2-kargo BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('g2-kargo: tüm kontroller geçti (5 senaryo)');process.exit(0);
})().catch(e=>{console.error('g2-kargo HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
