// Paket 12: iyzico (SANDBOX) iade — Ödemeler ▸ "iyzico onayı" kalem kartında "Onayı geri al" / "iyzico iade" — 390px, sahte veri.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p12-iyzico-iade.test.js
// iyzico'ya istek ATILMAZ: Edge Function (oz-iyzico) çağrıları sahte route ile yanıtlanır; kalem listesi bellekte güncellenir.
// Doğrulanan: (a) refund_pending + approved → yalnız "Onayı geri al"; (b) disapproved → yalnız "iyzico iade"; (c) refunded → düğme yok, "İade edildi";
// (d) sipariş paid → iade düğmesi yok, mevcut "iyzico onayı" aynen; (e) provider mock → düğmeler pasif; (f) son kalem iade olunca
// oz_admin_mark_refunded bir kez; (g) iyzico hatası / sonuç bilinmiyor → mark çağrılmaz, mesaj aynen; (h) mark hatasında "Tekrar dene" yalnız
// mark'ı yeniden çağırır, iade iyzico'ya yeniden gitmez; (i) payment_status alanı yoksa (SQL uygulanmadı) eski görünüm.
const {chromium,open,enter}=require('./harness.js');
const it=(o,kind,id,st,pay,extra)=>Object.assign({kind,id,order_id:o,order_no:'OZ-'+o,seller_name:'Yayla',name:kind==='ship'?'Kargo':'Ürün '+id,price_kurus:kind==='ship'?4990:35554,approve_status:st,status:pay==='refund_pending'?'returned':'delivered',payment_status:pay,due_by:new Date(Date.now()+864e5).toISOString(),block_reason:pay==='refund_pending'?'Açık iade/ayıp talebi var':null},extra||{});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);
 const edge=[];let edgeMode='ok';
 await p.route('**/functions/v1/oz-iyzico**',async r=>{const body=JSON.parse(r.request().postData()||'{}');edge.push(body);
  if(edgeMode==='fail')return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({ok:false,error:'iyzico işlemi reddetti: Kırılım iade edilemez'})});
  if(edgeMode==='net')return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({ok:false,error:"iyzico'ya ulaşılamadı; sonuç bilinmiyor, panelden kontrol et."})});
  await p.evaluate(b=>{const x=window.__items.find(y=>y.kind===b.kind&&y.id===b.id);if(x)x.approve_status=b.op==='refund'?'refunded':b.op==='disapprove'?'disapproved':'approved'},body);
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:body.op==='refund'?'refunded':'disapproved'})})});
 await p.evaluate(()=>{window.__marks=[];window.__markFail=false;const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){
   if(fn==='oz_admin_iyzico_items')return JSON.parse(JSON.stringify(window.__items));
   if(fn==='oz_admin_mark_refunded'){window.__marks.push(a);if(window.__markFail){const e=new Error('PF_STATE: Bu sipariş iade bekleyen durumda değil');throw e}
     window.__items.forEach(x=>{if(x.order_id===a.p_order)x.payment_status='refunded'});return null}
   return orig.apply(this,arguments)}});
 const show=async(items,prov)=>{await p.evaluate(([items,prov])=>{window.__items=items;const F=window.__OZ_FX;F.R.oz_public_settings=Object.assign({},F.R.oz_public_settings,{payment_provider:prov});
   window.PF.roles={is_admin:true,roles:['super']};document.querySelectorAll('.pfxOv,.ozOv,.ozToast').forEach(x=>x.remove());PF.openAdmin('oz_payouts')},[items,prov]);await p.waitForTimeout(1400)};
 const cards=()=>p.evaluate(()=>[...document.querySelectorAll('[data-iyz]')].map(c=>({k:c.dataset.iyz,tag:c.querySelector('[data-iyzst]').textContent,
   btns:[...c.querySelectorAll('button')].map(b=>b.textContent+(b.disabled?'(pasif)':'')),retry:!!c.querySelector('[data-markretry]')})));
 const by=(l,k)=>l.find(x=>x.k===k)||{};
 const confirm=async label=>{await p.waitForTimeout(300);return p.evaluate(l=>{const ov=[...document.querySelectorAll('.ozOv')].pop();if(!ov)return null;const t=ov.innerText;const b=[...ov.querySelectorAll('button')].find(x=>x.textContent.trim()===l);if(b)b.click();return t},label)};
 const toast=()=>p.evaluate(()=>[...document.querySelectorAll('.ozToast')].map(x=>x.textContent).join(' || '));
 // (a)(b)(c)(d)
 await show([it('A','item','a1','approved','refund_pending'),it('A','ship','A','approved','refund_pending'),it('B','item','b1','disapproved','refund_pending'),it('C','item','c1','refunded','refund_pending'),it('C','ship','C','pending','refund_pending'),
   it('D','item','d1','pending','paid',{block_reason:null,status:'delivered'}),it('E','item','e1','approved','paid',{block_reason:null})],'iyzico_sandbox');
 let l=await cards();
 ok(JSON.stringify(by(l,'item:a1').btns)==='["Onayı geri al"]'&&JSON.stringify(by(l,'ship:A').btns)==='["Onayı geri al"]','(a) refund_pending + approved → yalnız "Onayı geri al": '+JSON.stringify([by(l,'item:a1'),by(l,'ship:A')]));
 ok(JSON.stringify(by(l,'item:b1').btns)==='["iyzico iade"]'&&JSON.stringify(by(l,'ship:C').btns)==='["iyzico iade"]','(b) disapproved/pending → yalnız "iyzico iade": '+JSON.stringify([by(l,'item:b1'),by(l,'ship:C')]));
 ok(by(l,'item:c1').btns.length===0&&by(l,'item:c1').tag==='İade edildi','(c) refunded → düğme yok, "İade edildi": '+JSON.stringify(by(l,'item:c1')));
 ok(JSON.stringify(by(l,'item:d1').btns)==='["iyzico onayı"]'&&by(l,'item:e1').btns.length===0&&by(l,'item:e1').tag==='Onaylandı','(d) paid sipariş → iade düğmesi yok, onay davranışı aynen: '+JSON.stringify([by(l,'item:d1'),by(l,'item:e1')]));
 // (a) onayı geri al: onay metni ve çağrı
 await p.click('[data-iyz="item:a1"] [data-a=aIyzR]');let t=await confirm('Onayı geri al');await p.waitForTimeout(1200);
 ok(/Bu kalemin iyzico onayı geri alınır\. Ardından iade edebilirsin\./.test(t||'')&&edge.length===1&&JSON.stringify(edge[0])==='{"kind":"item","id":"a1","op":"disapprove"}','onayı geri al: onay metni + op disapprove: '+JSON.stringify([t,edge]));
 l=await cards();ok(JSON.stringify(by(l,'item:a1').btns)==='["iyzico iade"]'&&!(await p.evaluate(()=>window.__marks.length)),'geri alınan kalemde artık "iyzico iade"; mark çağrılmadı: '+JSON.stringify(by(l,'item:a1')));
 // (e) mock → pasif
 await show([it('A','item','a1','approved','refund_pending'),it('B','item','b1','disapproved','refund_pending')],'mock');
 l=await cards();ok(JSON.stringify(by(l,'item:a1').btns)==='["Onayı geri al(pasif)"]'&&JSON.stringify(by(l,'item:b1').btns)==='["iyzico iade(pasif)"]','(e) mock modunda düğmeler pasif: '+JSON.stringify(l));
 // (f) son kalem iade → mark bir kez
 edge.length=0;await show([it('F','item','f1','disapproved','refund_pending'),it('F','ship','F','refunded','refund_pending')],'iyzico_sandbox');
 await p.click('[data-iyz="item:f1"] [data-a=aIyzR]');t=await confirm('İade et');await p.waitForTimeout(1500);
 let marks=await p.evaluate(()=>window.__marks);
 ok(/355,54/.test(t||'')&&/Tutar müşteri kartına iade edilir \(test ortamı\)/.test(t||''),'iade onayında tutar ve metin: '+JSON.stringify(t));
 ok(edge.length===1&&edge[0].op==='refund'&&marks.length===1&&marks[0].p_order==='F'&&marks[0].p_reference==='iyzico iade (test)','(f) son kalem iade olunca mark_refunded bir kez: '+JSON.stringify([edge,marks]));
 l=await cards();ok(l.every(x=>x.btns.length===0&&!x.retry),'(f) sonrası düğme/tekrar yok: '+JSON.stringify(l));
 // (f2) ilk kalem iade (diğeri hâlâ bekliyor) → mark çağrılmaz
 edge.length=0;await p.evaluate(()=>{window.__marks=[]});await show([it('G','item','g1','pending','refund_pending'),it('G','ship','G','approved','refund_pending')],'iyzico_sandbox');
 await p.click('[data-iyz="item:g1"] [data-a=aIyzR]');await confirm('İade et');await p.waitForTimeout(1500);
 ok(edge.length===1&&(await p.evaluate(()=>window.__marks.length))===0,'diğer kalem iade edilmeden mark çağrılmaz');
 // (g) iyzico hatası ve sonuç bilinmiyor → mark yok, mesaj aynen
 for(const [mode,msg] of [['fail','iyzico işlemi reddetti: Kırılım iade edilemez'],['net',"iyzico'ya ulaşılamadı; sonuç bilinmiyor, panelden kontrol et."]]){
  edgeMode=mode;edge.length=0;await p.evaluate(()=>{window.__marks=[]});await show([it('H','item','h1','pending','refund_pending')],'iyzico_sandbox');
  await p.click('[data-iyz="item:h1"] [data-a=aIyzR]');await confirm('İade et');await p.waitForTimeout(1300);
  const tt=await toast();const m=await p.evaluate(()=>window.__marks.length);l=await cards();
  ok(edge.length===1&&m===0&&tt.includes(msg)&&JSON.stringify(by(l,'item:h1').btns)==='["iyzico iade"]','(g) '+mode+': mark çağrılmaz, mesaj aynen, durum aynı: '+JSON.stringify([tt,m,by(l,'item:h1')]))}
 edgeMode='ok';
 // (h) mark hatası → "Tekrar dene" yalnız mark; iade yeniden iyzico'ya gitmez
 edge.length=0;await p.evaluate(()=>{window.__marks=[];window.__markFail=true});await show([it('K','item','k1','pending','refund_pending')],'iyzico_sandbox');
 await p.click('[data-iyz="item:k1"] [data-a=aIyzR]');await confirm('İade et');await p.waitForTimeout(1500);
 const tt=await toast();l=await cards();
 ok(edge.length===1&&(await p.evaluate(()=>window.__marks.length))===1&&/sipariş durumu güncellenemedi/.test(tt)&&by(l,'item:k1').retry&&JSON.stringify(by(l,'item:k1').btns)==='["Tekrar dene"]','(h) mark hatası: net mesaj + "Tekrar dene": '+JSON.stringify([tt,by(l,'item:k1')]));
 await p.evaluate(()=>{window.__markFail=false});await p.click('[data-iyz="item:k1"] [data-a=aIyzMark]');await p.waitForTimeout(1300);
 marks=await p.evaluate(()=>window.__marks);l=await cards();
 ok(edge.length===1&&marks.length===2&&marks[1].p_order==='K'&&by(l,'item:k1').btns.length===0,'(h) "Tekrar dene" yalnız mark_refunded; iyzico\'ya ikinci iade yok: '+JSON.stringify([edge.length,marks,by(l,'item:k1')]));
 // (i) payment_status alanı yok (SQL uygulanmadı) → eski görünüm
 const old=it('Z','item','z1','pending','refund_pending');delete old.payment_status;
 await show([old],'iyzico_sandbox');l=await cards();
 ok(JSON.stringify(by(l,'item:z1').btns)==='["iyzico onayı(pasif)"]','(i) payment_status yokken eski "iyzico onayı" görünümü: '+JSON.stringify(l));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p12-iyzico-iade BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p12-iyzico-iade: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p12-iyzico-iade HATA:',e);process.exit(1)});
