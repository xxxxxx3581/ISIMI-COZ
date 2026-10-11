// X2: seçenekli liste kartında en düşük birim fiyat satırı — 390px, sahte veri. Çalıştırma: node tests/oz-ui/x2-birim-satiri.test.js
// Doğrulanan: zeytinyağı (1kg 400, 3kg 1.100, 5kg 1.800) → "≈ 360 ₺/kg'dan"; bal (800gr 1.000, 500gr 600) → "≈ 1.200 ₺/kg'dan";
// hacim → "₺/L'den"; birimi çözülemeyen seçenek hesaba girmez (800gr 1.000 + "500" 600 → "≈ 1.250 ₺/kg'dan"); hiçbiri çözülemiyorsa ya da
// kg/L karışıksa satır yok; seçenekli kartta toplam fiyat yok; tek fiyatlı süt aynı ("90,00 ₺" + "≈ 90,00 ₺/L"); soluk krem, 13px, AA.
const {chromium,open,enter}=require('./harness.js');
const VV=(pid,l)=>l.map(([label,tl],i)=>({product_id:pid,label,price_kurus:tl*100,stock:9,sort:i}));
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(V=>{const T=window.__OZ_FX.T,R=window.__OZ_FX.R;
  T.oz_products=[{id:'p0',description:'Zeytinyağı',net_content:'1000 gr'},{id:'p1',description:'Bal',net_content:'800 gr'},{id:'p2',description:'Süt',net_content:'1 L'},{id:'p3',description:'Bal 2',net_content:'800 gr'},{id:'p4',description:'Kavanoz'},{id:'p5',description:'Karışık'}];
  T.oz_variants=V;R.oz_search_products=R.oz_search_products.map(x=>Object.assign({},x,{in_stock:true}))},
  [].concat(VV('p0',[['1kg',400],['3kg',1100],['5kg',1800]]),VV('p1',[['800gr',1000],['500gr',600]]),VV('p2',[['1 L',90]]),VV('p3',[['800gr',1000],['500',600]]),VV('p4',[['Kavanoz',50],['Teneke',90]]),VV('p5',[['1kg',50],['1 L',90]])));
 await enter(p);await p.waitForTimeout(600);
 for(const [where,go] of [['Tüm ürünler',()=>OZ.go('plist',{seller:'s1'})],['Arama',()=>OZ.go('search',{q:'a'})]]){
  await p.evaluate(go);await p.waitForTimeout(1500);
  const M=await p.evaluate(()=>{const o={};[...document.querySelectorAll('#ozRoot .ozGc')].forEach(c=>{const u=c.querySelector('.ft .pr small.ufrom');const pr=c.querySelector('.ft .pr');
   const rgb=x=>x.match(/[\d.]+/g).map(Number);const lum=k=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2])};
   const s=u?getComputedStyle(u):null;const col=s?rgb(s.color):null,bg=rgb(getComputedStyle(c).backgroundColor);
   o[c.dataset.pid]={u:u?u.textContent:null,pr:pr?pr.innerText.replace(/\s+/g,' ').trim():null,opt:!!c.querySelector('.ft .opt'),fs:s?parseFloat(s.fontSize):0,fw:s?parseInt(s.fontWeight):0,
    gold:!!col&&col[0]>220&&col[1]>170&&col[2]<120,cr:col?+((Math.max(lum(col),lum(bg))+.05)/(Math.min(lum(col),lum(bg))+.05)).toFixed(2):0,one:u?u.getClientRects().length===1:true,in:u?u.getBoundingClientRect().right<=c.getBoundingClientRect().right:true}});return o});
  const t='['+where+'] ';
  ok(M.p0&&M.p0.u==="≈ 360 ₺/kg'dan",t+'zeytinyağı en düşük birim fiyat 360: '+JSON.stringify(M.p0));
  ok(M.p1&&M.p1.u==="≈ 1.200 ₺/kg'dan",t+'bal 1.200 (binlik ayırıcı): '+JSON.stringify(M.p1));
  ok(M.p3&&M.p3.u==="≈ 1.250 ₺/kg'dan",t+'birimi çözülemeyen "500" hesaba girmez: '+JSON.stringify(M.p3));
  ok(M.p4&&M.p4.u===null&&M.p4.pr===null&&M.p4.opt,t+'hiçbiri çözülemiyorsa satır yok: '+JSON.stringify(M.p4));
  ok(M.p5&&M.p5.u===null&&M.p5.opt,t+'kg/L karışıksa satır yok: '+JSON.stringify(M.p5));
  ['p0','p1','p3'].forEach(k=>{const x=M[k]||{};ok(x.pr===x.u&&!/\d,\d\d/.test(x.pr||''),t+k+' seçenekli kartta toplam fiyat yok, kuruş yok: '+JSON.stringify(x));
   ok(x.fs===13&&!x.gold&&x.cr>=4.5&&x.one&&x.in,t+k+' soluk krem 13px, vurgusuz, AA, tek satır: '+JSON.stringify(x))});
  ok(M.p2&&/^90,00\s₺ ≈ 90,00\s₺\/L$/.test(M.p2.pr||'')&&!M.p2.opt&&M.p2.u===null,t+'tek fiyatlı süt aynı: '+JSON.stringify(M.p2));
 }
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390px taşma yok');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('x2-birim-satiri BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('x2-birim-satiri: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('x2-birim-satiri HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
