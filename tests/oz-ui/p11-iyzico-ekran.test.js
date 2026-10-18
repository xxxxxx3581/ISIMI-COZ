// Paket 11: iyzico siparişleri için ekran/sayaç düzeltmeleri ve "iade gerekli ödeme" görünürlüğü.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p11-iyzico-ekran.test.js
// 1) Veritabanı (geçici yerel PostgreSQL 16; canlıya bağlanmaz): tests/sql/oz-stub.sql + Paket 10 + Paket 11 geri-al (= canlıdaki hali) üzerinde
//    (a) online sipariş yokken satıcı kazanç / admin özet / ödemeye hazır listesi / iade listesi Paket 11 öncesiyle AYNI,
//    (b) sahte online siparişler elle hakediş toplamına GİRMİYOR, yeni alanlar (bekleyen/onaylanan/teslim bekleyen) doğru,
//    (c) kalem payları toplamı = seller_share_kurus (300 rastgele sipariş) ve oz_iyz_prepare'nin iyzico'ya gönderdiğiyle aynı,
//    (d) "iade gerekli" listesi ve "çözüldü" işlemi (yetkisiz kullanıcı, notsuz, uzun not, tekrar reddedilir; denetim kaydı).
//    PostgreSQL yoksa test BAŞARISIZ olur (OZ_SKIP_DB=1 ile bilinçli atlanabilir; atlandığı yazılır).
// 2) Arayüz (390px): mock/online siparişsiz halde yeni bölüm/kart/uyarı yok; tutar varken "Kartla ödenen siparişler", "İade gerekli ödemeler: N"
//    kartı → liste → "Elle iade ettim" (not zorunlu), iade listesinde iyzico onaylı siparişe kırmızı uyarı (engel yok).
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const {chromium,open,enter}=require('./harness.js');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 // ---------------------------------------------------------------- 1) veritabanı
 const BIN=process.env.PG_BIN||'/usr/lib/postgresql/16/bin';
 if(process.env.OZ_SKIP_DB==='1')console.log('UYARI: veritabanı kısmı OZ_SKIP_DB=1 ile ATLANDI');
 else if(!fs.existsSync(path.join(BIN,'initdb')))fails.push('PostgreSQL bulunamadı ('+BIN+'); veritabanı kısmı çalıştırılamadı');
 else{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ozp11-'));const port=String(55600+Math.floor(Math.random()*300));
  const root=process.getuid&&process.getuid()===0;
  const sh=c=>cp.execSync(root?'su postgres -c '+JSON.stringify(c):c,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const psql=f=>cp.execSync([path.join(BIN,'psql'),'-h',dir,'-p',port,'-U','postgres','-X','-q','-At','-F',' => ','-f',f].map(x=>JSON.stringify(x)).join(' ')+' 2>&1',{encoding:'utf8'});
  try{
   if(root)cp.execSync('chown postgres '+JSON.stringify(dir));
   sh(path.join(BIN,'initdb')+' -D '+dir+'/data -A trust -U postgres >/dev/null');
   sh(path.join(BIN,'pg_ctl')+' -D '+dir+'/data -o "-p '+port+' -k '+dir+'" -l '+dir+'/log -w start >/dev/null');
   const setup=['tests/sql/oz-stub.sql','docs/sql/paket-10-uygula.sql','docs/sql/paket-11-geri-al.sql','tests/sql/p11-before.sql','docs/sql/paket-11-uygula.sql','docs/sql/paket-11-uygula.sql'];
   for(const f of setup){const o=psql(path.join(ROOT,f));const err=o.split('\n').filter(l=>/ERROR/.test(l));ok(!err.length,'SQL hatası ('+f+'): '+err.join(' | '))}
   const out=psql(path.join(ROOT,'tests/sql/p11-after.sql'));const R={};
   out.split('\n').forEach(l=>{const i=l.indexOf(' => ');if(i>0)R[l.slice(0,i)]=l.slice(i+4)});
   const err=out.split('\n').filter(l=>/ERROR/.test(l));ok(!err.length,'senaryo hatası: '+err.join(' | '));
   // (a)
   for(const k of ['due','earn_a1','earn_a2','overview','returns'])ok(/^true/.test(R['a) online yokken aynı: '+k]||''),'(a) online yokken '+k+' eskisiyle aynı: '+R['a) online yokken aynı: '+k]);
   ok(/iyzico_pending_kurus=0,iyzico_approved_kurus=0,iyzico_waiting_kurus=0/.test(R['a) online yokken aynı: earn_a1']||'')&&/refund_required_count=0/.test(R['a) online yokken aynı: overview']||''),'(a) yeni alanlar sıfır');
   ok(Number(R['a) due satır sayısı'])>0,'(a) ödemeye hazır listesi boş değil (karşılaştırma anlamlı): '+R['a) due satır sayısı']);
   // (b)
   ok(R['b) elle hakediş değişmedi: earn_a1']==='true'&&R['b) elle hakediş değişmedi: overview']==='true'&&R['b) ödemeye hazır listesi değişmedi']==='true','(b) online siparişler elle hakedişe girmiyor: '+JSON.stringify([R['b) elle hakediş değişmedi: earn_a1'],R['b) elle hakediş değişmedi: overview'],R['b) ödemeye hazır listesi değişmedi']]));
   const got=(R['b) yeni alanlar']||'').split(' / ').map(Number),exp=(R['b) beklenen']||'').match(/\d+/g)||[];
   ok(got.length===3&&got.every(n=>n>0)&&got.join()===exp.map(Number).join(),'(b) yeni alanlar (bekleyen/onaylanan/teslim bekleyen) beklenenle aynı: '+R['b) yeni alanlar']+' ~ '+R['b) beklenen']);
   // (c)
   ok(R['c) toplam = seller_share (300 sipariş)']==='300/300'&&R['c) negatif/sıfır pay']==='0','(c) kalem payları toplamı = seller_share_kurus: '+R['c) toplam = seller_share (300 sipariş)']);
   ok(R['c) oz_iyz_prepare ile aynı (300 sipariş)']==='300/300','(c) kalem payı iyzico\'ya gönderilen subMerchantPrice ile aynı: '+R['c) oz_iyz_prepare ile aynı (300 sipariş)']);
   // (d)
   ok(R['d) liste']==='IYZ-1:29999:["ON2"] | IYZ-2:100:["ON4"]'&&R['d) sayaç']==='2','(d) iade gerekli listesi (yalnız para alınmış + başarısız): '+R['d) liste']+' sayaç='+R['d) sayaç']);
   ok(/PF_AUTH/.test(R['d) yetkisiz liste']||'')&&/PF_AUTH/.test(R['d) yetkisiz çözüm']||''),'(d) yetkisiz kullanıcı reddedilir');
   ok(/Not yaz/.test(R['d) notsuz']||'')&&/300/.test(R['d) uzun not']||'')&&/iade beklenmiyor/.test(R['d) iadesiz kayıt']||'')&&/zaten çözüldü/.test(R['d) tekrar']||''),'(d) not zorunlu/uzunluk/uygun kayıt/tekrar kontrolleri');
   ok(R['d) çözüldü']===''&&R['d) sonra liste/sayaç']==='1 / 1 / tümü=2'&&/oz_refund_resolved:iyzico panelinden iade edildi/.test(R['d) denetim']||''),'(d) çözüldü işareti + sayaç + denetim: '+R['d) sonra liste/sayaç']);
   ok(R['returns iyzico_approved']==='ON3=true/online, ON4=false/online','iade listesinde iyzico onayı alanı: '+R['returns iyzico_approved']);
  }catch(e){fails.push('veritabanı kısmı çalışmadı: '+String(e.message||e).slice(0,300))}
  finally{try{sh(path.join(BIN,'pg_ctl')+' -D '+dir+'/data -m fast stop >/dev/null')}catch(e){}try{fs.rmSync(dir,{recursive:true,force:true})}catch(e){}}
 }
 // ---------------------------------------------------------------- 2) arayüz
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);
 const kaz=async e=>{await p.evaluate(e=>{const F=window.__OZ_FX;F.R.oz_seller_earnings=Object.assign({},F.R.oz_seller_earnings,e);document.querySelectorAll('.ozOv,.pfxOv').forEach(x=>x.remove());OZ.go('seller',{tab:'kazanc'})},e);await p.waitForTimeout(1500);
  return p.evaluate(()=>{const b=document.getElementById('ozSP');const s=document.getElementById('ozIyzE');return {kpis:b?[...b.querySelectorAll('.ozKpi small')].map(x=>x.textContent):[],sec:s?{h:s.querySelector('h3').textContent,v:[...s.querySelectorAll('[data-iyze]')].map(x=>x.dataset.iyze+'='+x.textContent),t:s.querySelector('.ozHint').textContent}:null}})};
 // (e) mock / online sipariş yok: bölüm yok, mevcut ekran aynı
 let k=await kaz({iyzico_pending_kurus:0,iyzico_approved_kurus:0,iyzico_waiting_kurus:0});
 ok(k.sec===null&&k.kpis.includes('Ödemeye hazır')&&k.kpis.includes('Bekleme süresinde'),'(e) online sipariş yokken kazanç ekranı aynı, yeni bölüm yok: '+JSON.stringify(k));
 k=await kaz({iyzico_pending_kurus:undefined,iyzico_approved_kurus:undefined,iyzico_waiting_kurus:undefined});
 ok(k.sec===null,'(e) SQL uygulanmamışken (alan yok) bölüm yok');
 k=await kaz({iyzico_pending_kurus:22991,iyzico_approved_kurus:25502,iyzico_waiting_kurus:77239});
 ok(k.sec&&k.sec.h==='Kartla ödenen siparişler'&&k.sec.v.join('|').replace(/\s/g,' ')===['pending=229,91 ₺','approved=255,02 ₺','waiting=772,39 ₺'].join('|')&&k.sec.t==='Kartla ödenen siparişlerde ödeme iyzico üzerinden yapılır; admin onayından sonra hesabına geçer.'&&!/gün/.test(k.sec.t),'kazanç: "Kartla ödenen siparişler" bölümü (süre yazılmaz): '+JSON.stringify(k.sec));
 // admin özet: iade gerekli kartı
 const ov=async n=>{await p.evaluate(n=>{const F=window.__OZ_FX;F.R.oz_admin_overview={payouts_overdue:0,pending_adjustments_kurus:0,payable_kurus:80000,refund_required_count:n};window.PF.roles={is_admin:true,roles:['super']};
   document.querySelectorAll('.pfxOv').forEach(x=>x.remove());PF.openAdmin('oz_overview')},n);await p.waitForTimeout(1300);
  return p.evaluate(()=>({card:(document.getElementById('ozARefReq')||{}).textContent||null,kpi:[...document.querySelectorAll('[data-kpi]')].map(x=>x.dataset.kpi)}))};
 let o=await ov(0);ok(o.card===null&&!o.kpi.includes('refund_required_count'),'(e) N=0: "İade gerekli ödemeler" kartı yok: '+JSON.stringify(o));
 o=await ov(2);ok(o.card&&/İade gerekli ödemeler: 2/.test(o.card)&&!o.kpi.includes('refund_required_count'),'özet: "İade gerekli ödemeler: 2" kartı, KPI ızgarasında değil: '+JSON.stringify(o));
 await p.evaluate(()=>{window.__OZ_FX.R.oz_admin_refund_required=[{id:'p1',payment_id:'IYZ-1',paid_kurus:29999,amount_kurus:29999,error:'Sipariş ödemeye uygun değildi (iptal/çift ödeme); iade gerekir',created_at:'2026-10-17T10:00:00Z',order_nos:['OZ-1001']}];
  window.__rc=[];const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){window.__rc.push([fn,a]);return orig.apply(this,arguments)}});
 await p.click('[data-a=aRefReq]');await p.waitForTimeout(900);
 const rl=await p.evaluate(()=>[...document.querySelectorAll('[data-refreq]')].map(c=>({t:c.querySelector('b').textContent,pid:c.querySelector('[data-payid]').textContent,err:(c.querySelector('[data-referr]')||{}).textContent,btn:!!c.querySelector('[data-a=aRefRes]'),txt:c.innerText})));
 ok(rl.length===1&&/299,99/.test(rl[0].t)&&rl[0].pid==='IYZ-1'&&/iade gerekir/.test(rl[0].err)&&rl[0].btn&&/OZ-1001/.test(rl[0].txt),'iade gerekli listesi: tutar, iyzico no, hata, sipariş no, düğme: '+JSON.stringify(rl));
 await p.click('[data-a=aRefRes]');await p.waitForTimeout(400);
 const okb=async()=>p.evaluate(()=>{const b=[...document.querySelectorAll('.ozOv button')].find(x=>/^(Onayla|Kaydet|Gönder)$/.test(x.textContent.trim()));if(b)b.click();return !!b});
 await okb();await p.waitForTimeout(400);
 ok(!(await p.evaluate(()=>window.__rc.some(x=>x[0]==='oz_admin_refund_resolve'))),'not boşken çağrı yapılmaz');
 await p.fill('#ozAR','iyzico panelinden 17.10 iade edildi');await okb();await p.waitForTimeout(900);
 const rc=await p.evaluate(()=>window.__rc.filter(x=>x[0]==='oz_admin_refund_resolve').map(x=>x[1]));
 ok(rc.length===1&&rc[0].p_payment==='p1'&&rc[0].p_note==='iyzico panelinden 17.10 iade edildi','"Elle iade ettim" notla kaydedilir: '+JSON.stringify(rc));
 // iade listesi: iyzico onaylı siparişte kırmızı uyarı
 await p.evaluate(()=>{const F=window.__OZ_FX;F.lists.returns=[{id:'rA',order_id:'oA',order_no:'OZ-A',status:'requested',reason:'Hasarlı geldi',created_at:new Date().toISOString(),payment_method:'online',iyzico_approved:true},
   {id:'rB',order_id:'oB',order_no:'OZ-B',status:'requested',reason:'Diğer',created_at:new Date().toISOString(),payment_method:'mock',iyzico_approved:false}];
  document.querySelectorAll('.pfxOv,.ozOv').forEach(x=>x.remove());PF.openAdmin('oz_returns')});await p.waitForTimeout(1300);
 const rw=await p.evaluate(()=>[...document.querySelectorAll('.pfxCard')].filter(c=>/^OZ-[AB]$/.test((c.querySelector('b')||{}).textContent||'')).map(c=>{const w=c.querySelector('[data-iyzwarn]');return {n:c.querySelector('b').textContent,w:w?w.textContent:null,col:w?getComputedStyle(w).color:null,btn:!!c.querySelector('[data-a=aRet][data-ok="1"]')}}));
 const A=rw.find(x=>x.n==='OZ-A')||{},Bx=rw.find(x=>x.n==='OZ-B')||{};
 ok(A.w==='Bu siparişin iyzico onayı verilmiş. Satıcıya aktarılan tutarın geri alınması iyzico ile netleştirilmeden iade onaylama.'&&A.btn&&Bx.w===null,'iade listesi: iyzico onaylıda uyarı, diğerinde yok, düğme duruyor: '+JSON.stringify(rw));
 const red=A.col&&A.col.match(/\d+/g).map(Number);ok(red&&red[0]>150&&red[0]-red[2]>40,'uyarı kırmızı tonda: '+A.col);
 await p.click('.pfxCard [data-a=aRet][data-ok="1"][data-iyz="1"]');await p.waitForTimeout(400);
 const cf=await p.evaluate(()=>(document.querySelector('.ozOv')||{}).innerText||'');
 ok(/iyzico onayı verilmiş/.test(cf)&&/Yine de devam et/.test(cf),'iade onayında uyarı penceresi (engel değil, devam edilebilir): '+JSON.stringify(cf.slice(0,160)));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p11-iyzico-ekran BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p11-iyzico-ekran: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p11-iyzico-ekran HATA:',e);process.exit(1)});
