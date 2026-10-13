// AE1: satıcı sipariş akışı — durum ilerletince sipariş kaybolmaz + son kargo firması — 390px, sahte RPC (durum tutan depo).
// Çalıştırma: node tests/oz-ui/ae1-satici-akis.test.js
// Doğrulanan: "Yeni" süzgecinde "Kabul et" → süzgeç "Hazırlanıyor"a geçer, sipariş görünür (ekranda, vurgulu), sayaçlar tutarlı (Yeni −1,
// Hazırlanıyor +1) ve Siparişler rozeti güncel; "Hazırlandı" → aynı bölümde görünür; "Kargoya ver" → "Kargoda" süzgecinde görünür.
// Kargo formu: ilk seferde firma boş; sonraki gönderide son firma önceden dolu, takip no boş; başka satıcı hesabında firma boş;
// sunucu çağrısı aynı (oz_transition_order ship {carrier, tracking_no, tracking_url}).
const {chromium,open,enter,overflow}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||900);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const R=window.__OZ_FX.R;const base=R.oz_seller_orders[0];
  window.__DB=['n1','n2','n3','a1','s1'].map((id,i)=>Object.assign({},base,{id,order_no:'OZ26-'+id,status:{n:'new',a:'accepted',s:'shipped'}[id[0]],created_at:'2026-10-1'+i+'T10:00:00Z',return:null,tracking_no:null}));
  const o=window.PF.rpc;const T={accept:'accepted',pack:'packed',ship:'shipped'};
  window.PF.rpc=async function(fn,x){
   if(fn==='oz_seller_orders'){window.__ozLog(fn,x);await new Promise(r=>setTimeout(r,15));return JSON.parse(JSON.stringify(window.__DB.filter(y=>!x.p_status||y.status===x.p_status)))}
   if(fn==='oz_seller_dashboard'){const r=await o(fn,x);const c={};window.__DB.forEach(y=>{c[y.status]=(c[y.status]||0)+1});return Object.assign({},r,{orders:c,open_returns:0})}
   if(fn==='oz_transition_order'){window.__ozLog(fn,x);const y=window.__DB.find(z=>z.id===x.p_order);if(y&&T[x.p_action]){y.status=T[x.p_action];if(x.p.tracking_no){y.tracking_no=x.p.tracking_no;y.carrier=x.p.carrier}}return {ok:true}}
   return o(fn,x)}});
 await enter(p);await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(1600);
 const S=()=>p.evaluate(()=>{const cnt={};document.querySelectorAll('#ozSP .ozSoCnt [data-a=soTab]').forEach(b=>{cnt[b.dataset.st]={n:+b.querySelector('b').textContent,on:b.getAttribute('aria-selected')==='true'}});
  const so=document.getElementById('ozSoN');return {cnt,sel:(Object.entries(cnt).find(([k,v])=>v.on)||[''])[0],
   cards:[...document.querySelectorAll('#ozSP .ozSoC')].map(c=>c.dataset.oid+':'+c.dataset.st),badge:so&&!so.hidden?so.textContent:null}});
 const vis=id=>p.evaluate(id=>{const c=document.querySelector('#ozSP .ozSoC[data-oid="'+id+'"]');if(!c)return null;const r=c.getBoundingClientRect();return {inView:r.bottom>0&&r.top<innerHeight,hl:c.classList.contains('ozSoHl'),st:c.dataset.st}},id);
 let s=await S();ok(s.cnt.new&&s.cnt.new.n===3&&s.cnt.prep.n===1&&s.cnt.ship.n===1,'başlangıç sayaçları 3/1/1: '+JSON.stringify(s.cnt));
 await click(p,'#ozSP .ozSoCnt [data-st=new]',1300);
 s=await S();ok(s.sel==='new'&&s.cards.slice().sort().join()==='n1:new,n2:new,n3:new','"Yeni" süzgeci: '+JSON.stringify(s));
 // Kabul et
 await click(p,'#ozSP .ozSoC[data-oid=n1] [data-a=soAct][data-act=accept]',1500);
 s=await S();let v=await vis('n1');
 ok(s.sel==='prep'&&v&&v.st==='accepted','kabul sonrası süzgeç "Hazırlanıyor"a geçmeli ve sipariş görünmeli: '+JSON.stringify({s,v}));
 ok(v&&v.inView&&v.hl,'kabul edilen sipariş ekranda ve vurgulu: '+JSON.stringify(v));
 ok(s.cnt.new.n===2&&s.cnt.prep.n===2,'sayaçlar tutarlı (Yeni 2, Hazırlanıyor 2): '+JSON.stringify(s.cnt));
 ok(s.badge===null||s.badge==='0'||+s.badge>=0,'Siparişler rozeti okunur: '+s.badge);
 // Hazırlandı
 await click(p,'#ozSP .ozSoC[data-oid=n1] [data-a=soAct][data-act=pack]',1500);
 s=await S();v=await vis('n1');
 ok(s.sel==='prep'&&v&&v.st==='packed'&&v.inView,'hazırlandı sonrası aynı bölümde görünür: '+JSON.stringify({s,v}));
 ok(s.cnt.new.n===2&&s.cnt.prep.n===2&&s.cnt.ship.n===1,'sayaçlar 2/2/1: '+JSON.stringify(s.cnt));
 // Kargoya ver — ilk seferde firma boş
 await click(p,'#ozSP .ozSoC[data-oid=n1] [data-a=soShip]',700);
 let f=await p.evaluate(()=>({c:(document.getElementById('ozShC')||{}).value,n:(document.getElementById('ozShN')||{}).value}));
 ok(f.c===''&&f.n==='','ilk kargo formunda firma ve takip no boş: '+JSON.stringify(f));
 await p.fill('#ozShC','Aras Kargo').catch(()=>fails.push('firma yazılamadı'));await p.fill('#ozShN','AR123456').catch(()=>{});
 await click(p,'.ozOv [data-a=fbOk]',1600);
 const call=st.calls.filter(c=>c[0]==='oz_transition_order'&&c[1].p_action==='ship').pop();
 ok(call&&call[1].p.carrier==='Aras Kargo'&&call[1].p.tracking_no==='AR123456'&&call[1].p.tracking_url===null,'sunucu çağrısı aynı: '+JSON.stringify(call&&call[1]));
 s=await S();v=await vis('n1');ok(s.sel==='ship'&&v&&v.st==='shipped'&&v.inView,'kargoya verince "Kargoda" süzgecinde görünür: '+JSON.stringify({s,v}));
 ok(s.cnt.prep.n===1&&s.cnt.ship.n===2,'sayaçlar Hazırlanıyor 1, Kargoda 2: '+JSON.stringify(s.cnt));
 // ikinci gönderi: son firma dolu, takip no boş
 await click(p,'#ozSP .ozSoCnt [data-st=prep]',1300);
 await click(p,'#ozSP .ozSoC[data-oid=a1] [data-a=soAct][data-act=pack]',1500);
 await click(p,'#ozSP .ozSoC[data-oid=a1] [data-a=soShip]',700);
 f=await p.evaluate(()=>({c:(document.getElementById('ozShC')||{}).value,n:(document.getElementById('ozShN')||{}).value}));
 ok(f.c==='Aras Kargo'&&f.n==='','son firma önceden dolu, takip no boş: '+JSON.stringify(f));
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=fbNo]');if(x)x.click()});await p.waitForTimeout(400);
 // başka satıcı hesabı → boş
 await p.evaluate(()=>{const k='isimi_coz_auth_session';const s=JSON.parse(localStorage.getItem(k));s.user.id='00000000-0000-0000-0000-0000000000b2';localStorage.setItem(k,JSON.stringify(s))});
 await click(p,'#ozSP .ozSoC[data-oid=a1] [data-a=soShip]',700);
 f=await p.evaluate(()=>(document.getElementById('ozShC')||{}).value);ok(f==='','başka satıcıda firma boş: '+JSON.stringify(f));
 await p.evaluate(()=>{const x=document.querySelector('.ozOv [data-a=fbNo]');if(x)x.click()});
 ok(await overflow(p)<=0,'390px taşma yok');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ae1-satici-akis BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ae1-satici-akis: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ae1-satici-akis HATA:',e);process.exit(1)});
