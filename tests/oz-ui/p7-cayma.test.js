// Paket 7: cayma hakkı ve "çabuk bozulur" ürün kuralları — yalnız arayüz, 390px, sahte veri, veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p7-cayma.test.js
// Doğrulanan: ürün sayfası iade satırı (no_withdrawal false → "cayma hakkın var", true → "cayma hakkı yoktur…", SQL yokken kategori değeri);
// sipariş detayı düğmesi "İade / cayma talebi oluştur"; iade formu return_mode 'cayma' → 6 neden, 'ayip_only' → yalnız 5 ayıp nedeni + açıklama;
// satıcı ürün formu "Çabuk bozulur / soğuk zincir gerektirir" kutusu (kategori çabuk bozulursa işaretli ve kilitli) + yardım metni + kayıtta perishable;
// yönetici iade listesi "Bedel iadesi son günü" (talep + 14 gün), ücret iadesi yapılmamış ve geçmişse kırmızı "Gecikti"; ürün onay listesinde "Çabuk bozulur" rozeti.
const {chromium,open,enter}=require('./harness.js');
const ALL=['Hasarlı geldi','Yanlış ürün gönderildi','Eksik ürün','Ürün açıklamayla uyuşmuyor','Bozuk / tarihi geçmiş','Diğer'];
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);
 const shut=()=>p.evaluate(()=>{document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove())});
 // 1) ürün sayfası iade satırı
 const pdRet=async nw=>{await shut();await p.evaluate(nw=>{const d=window.__OZ_FX.R.oz_product_detail;if(nw===undefined)delete d.no_withdrawal;else d.no_withdrawal=nw},nw);
  await p.evaluate(()=>OZ.go('product',{id:'p0'}));await p.waitForTimeout(1300);
  return p.evaluate(()=>{const e=document.querySelector('.ozOv.ozPdS .ozPdTr [data-ret]');return e?{m:e.dataset.ret,t:e.innerText.replace(/\s+/g,' ').trim()}:null})};
 let r=await pdRet(false);
 ok(r&&r.m==='cayma'&&r.t==='Teslimattan sonraki 14 gün içinde cayma hakkın var','ürün sayfası (no_withdrawal false): '+JSON.stringify(r));
 r=await pdRet(true);
 ok(r&&r.m==='ayip'&&r.t==='Çabuk bozulabilen ürün: cayma hakkı yoktur. Hasarlı, yanlış veya eksik ürün için 14 gün içinde iade isteyebilirsin.','ürün sayfası (no_withdrawal true): '+JSON.stringify(r));
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.__cat=d.category;d.category={id:'c3',slug:'peynir',name:'Peynir',perishable:true}});
 r=await pdRet(undefined);
 ok(r&&r.m==='ayip','ürün sayfası (SQL yok, kategori çabuk bozulur): '+JSON.stringify(r));
 await p.evaluate(()=>{const d=window.__OZ_FX.R.oz_product_detail;d.category=d.__cat;delete d.__cat;d.no_withdrawal=false});
 // 2) sipariş detayı + iade formu (iki mod)
 const retForm=async mode=>{await shut();await p.evaluate(m=>{const d=window.__OZ_FX.R.oz_order_detail;d.order=Object.assign({},d.order,{status:'delivered'});d.can_return=true;d.return=null;if(m)d.return_mode=m;else delete d.return_mode},mode);
  await p.evaluate(()=>OZ.go('order',{id:'o1'}));await p.waitForTimeout(1300);
  const btn=await p.evaluate(()=>{const b=document.querySelector('#ozRoot [data-a=ordReturn]');return b?{t:b.textContent.trim(),m:b.dataset.m}:null});
  await p.click('#ozRoot [data-a=ordReturn]');await p.waitForTimeout(500);
  const f=await p.evaluate(()=>{const s=document.getElementById('ozRtR');return s?{opts:[...s.options].map(o=>o.value),ayip:(document.querySelector('[data-ayip]')||{}).textContent||null}:null});
  return {btn,f}};
 let o=await retForm('cayma');
 ok(o.btn&&o.btn.t==='İade / cayma talebi oluştur'&&o.btn.m==='cayma','düğme metni/modu (cayma): '+JSON.stringify(o.btn));
 ok(o.f&&JSON.stringify(o.f.opts)===JSON.stringify(ALL)&&o.f.ayip===null,'iade formu (cayma): 6 neden, açıklama yok: '+JSON.stringify(o.f));
 o=await retForm('ayip_only');
 ok(o.btn&&o.btn.t==='İade / cayma talebi oluştur'&&o.btn.m==='ayip_only','düğme metni/modu (ayip_only): '+JSON.stringify(o.btn));
 ok(o.f&&JSON.stringify(o.f.opts)===JSON.stringify(ALL.slice(0,5))&&/cayma hakkı yoktur/.test(o.f.ayip||''),'iade formu (ayip_only): yalnız 5 ayıp nedeni + açıklama: '+JSON.stringify(o.f));
 o=await retForm(null);
 ok(o.btn&&o.btn.m==='cayma'&&o.f&&o.f.opts.length===6,'return_mode yokken (SQL uygulanmadı) eski liste: '+JSON.stringify(o));
 // 3) satıcı ürün formu
 await shut();
 await p.evaluate(()=>{window.__p7save=null;const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){if(fn==='oz_product_save')window.__p7save=a&&a.p;return orig.apply(this,arguments)}});
 await p.evaluate(()=>OZ.go('sellerProduct',{id:'p0'}));await p.waitForTimeout(1500);
 const pf=async()=>p.evaluate(()=>{const c=document.getElementById('ozP_perishable');const l=c&&c.closest('label');return c?{on:c.checked,dis:c.disabled,lab:l.textContent.trim(),help:(document.getElementById('ozPPerH')||{}).textContent||null,lock:!!document.getElementById('ozPPerL')}:null});
 let s=await pf();
 ok(s&&!s.on&&!s.dis&&s.lab==='Çabuk bozulur / soğuk zincir gerektirir'&&s.help==='İşaretlenirse alıcı sebepsiz cayma hakkı kullanamaz, yalnız ayıplı ürün iadesi isteyebilir.','satıcı formu: kutu + yardım metni (kategori normal): '+JSON.stringify(s));
 await p.selectOption('#ozP_category_id','c3');await p.waitForTimeout(200);
 s=await pf();ok(s&&s.on&&s.dis&&s.lock,'satıcı formu: çabuk bozulan kategoride işaretli ve kilitli: '+JSON.stringify(s));
 await p.selectOption('#ozP_category_id','c1');await p.waitForTimeout(200);
 s=await pf();ok(s&&!s.on&&!s.dis,'satıcı formu: normal kategoriye dönünce kilit kalkar: '+JSON.stringify(s));
 await p.check('#ozP_perishable');await p.selectOption('#ozP_category_id','c2');await p.waitForTimeout(200);
 s=await pf();ok(s&&s.on&&!s.dis,'satıcı formu: kategori değişince satıcı işareti korunur: '+JSON.stringify(s));
 await p.click('#ozRoot [data-a=prodSave]:not([data-sub])');await p.waitForTimeout(1200);
 const sv=await p.evaluate(()=>window.__p7save);
 ok(sv&&sv.perishable===true,'satıcı formu: kayıtta perishable true gönderilir: '+JSON.stringify(sv&&{perishable:sv.perishable,cat:sv.category_id}));
 // 4) yönetici iade listesi: bedel iadesi son günü / Gecikti
 await shut();
 const old=new Date(Date.now()-20*864e5).toISOString(),fresh=new Date(Date.now()-2*864e5).toISOString();
 await p.evaluate(([old,fresh])=>{const F=window.__OZ_FX;
  F.lists.returns=[{id:'rA',order_id:'oA',order_no:'OZ-A',status:'approved',reason:'Hasarlı geldi',created_at:old},{id:'rB',order_id:'oB',order_no:'OZ-B',status:'requested',reason:'Diğer',created_at:fresh},
   {id:'rC',order_id:'oC',order_no:'OZ-C',status:'approved',reason:'Eksik ürün',created_at:old},{id:'rD',order_id:'oD',order_no:'OZ-D',status:'rejected',reason:'Diğer',created_at:old}];
  const og=window.PF.get;window.PF.get=async function(path){if(/^oz_orders\?select=id,payment_status/.test(path)){if(window.__p7noOrd)throw new Error('izin yok');return [{id:'oA',payment_status:'refund_pending'},{id:'oB',payment_status:'paid'},{id:'oC',payment_status:'refunded'},{id:'oD',payment_status:'paid'}]}
   if(/^oz_products\?select=id,perishable/.test(path))return [{id:'p0',perishable:null,category:{perishable:true}}];return og.apply(this,arguments)};
  window.PF.roles={is_admin:true,roles:['super']}},[old,fresh]);
 const rl=async()=>{await shut();await p.evaluate(()=>PF.openAdmin('oz_returns'));await p.waitForTimeout(1300);
  return p.evaluate(()=>[...document.querySelectorAll('.pfxCard')].filter(c=>/^OZ-[A-D]$/.test((c.querySelector('b')||{}).textContent||'')).map(c=>{const l=c.querySelector('[data-late]');return {n:c.querySelector('b').textContent,due:(c.querySelector('[data-rdue]')||{}).textContent||null,late:!!l,col:l?getComputedStyle(l).color:null}}))};
 let rs=await rl();
 const dd=new Date(Date.parse(old)+14*864e5).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
 const by=n=>rs.find(x=>x.n===n)||{};
 ok(rs.length===4&&by('OZ-A').due==='Bedel iadesi son günü: '+dd,'iade listesi: son gün = talep + 14 gün: '+JSON.stringify(rs));
 ok(by('OZ-A').late&&!by('OZ-B').late&&!by('OZ-C').late&&!by('OZ-D').late,'iade listesi: yalnız iadesi yapılmamış ve süresi geçen "Gecikti" (reddedilen/iade edilen/süresi dolmayan hariç): '+JSON.stringify(rs));
 const red=by('OZ-A').col&&by('OZ-A').col.match(/\d+/g).map(Number);ok(red&&red[0]>150&&red[0]-red[1]>60,'"Gecikti" kırmızı: '+by('OZ-A').col);
 await p.evaluate(()=>{window.__p7noOrd=true});rs=await rl();
 ok(rs.length===4&&rs.every(x=>/^Bedel iadesi son günü: /.test(x.due||'')&&!x.late),'sipariş durumu okunamazsa tarih var, "Gecikti" yok: '+JSON.stringify(rs));
 // 5) yönetici ürün onay listesi rozeti + inceleme
 await shut();await p.evaluate(()=>PF.openAdmin('oz_products'));await p.waitForTimeout(1300);
 const pb=await p.evaluate(()=>{const c=[...document.querySelectorAll('.pfxCard')].find(c=>c.querySelector('[data-a=aPView][data-id=p0]'));const t=c&&c.querySelector('[data-per]');return t?t.textContent:null});
 ok(pb==='Çabuk bozulur','ürün onay listesi: etkin "Çabuk bozulur" rozeti: '+JSON.stringify(pb));
 await p.evaluate(()=>{window.__OZ_FX.R.oz_product_detail.no_withdrawal=true});
 await p.click('[data-a=aPView][data-id=p0]');await p.waitForTimeout(800);
 const pv=await p.evaluate(()=>{const t=document.querySelector('.ozOv .ozKV [data-per]');return t?t.textContent:null});
 ok(pv==='Evet · cayma yok','ürün inceleme: çabuk bozulur satırı: '+JSON.stringify(pv));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p7-cayma BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p7-cayma: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p7-cayma HATA:',e);process.exit(1)});
