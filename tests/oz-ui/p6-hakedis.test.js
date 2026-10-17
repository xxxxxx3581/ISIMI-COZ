// Paket 6: hakediş süresi (5 iş günü) + iade mahsubu — yalnız arayüz, 390px, sahte veri, veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p6-hakedis.test.js
// Doğrulanan: satıcı Kazanç ekranı yeni bekleme açıklaması ("teslimden N gün sonra … sonraki ödemenizden düşülür"), mahsup > 0 iken
// "Mahsup edilecek: TL" satırı (0 iken yok); yönetici özetinde "Süresi geçen ödeme" (>0 iken vurgulu) ve "Mahsup bekleyen";
// ödeme listesinde payouts_due satırı: "Son ödeme günü", geçmişse kırmızı "Gecikti", mahsup ve bekleme tutarı; payouts_due okunamazsa
// liste yine açılır; Ayarlar'da "Ödeme bekletme süresi (gün)" etiketi aynı + "En çok 5 iş günü içinde ödeme yapılmalıdır."
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await enter(p);
 // 1) satıcı kazanç: mahsup yok → satır yok
 const kaz=async adj=>{await p.evaluate(a=>{window.__OZ_FX.R.oz_seller_earnings=Object.assign({},window.__OZ_FX.R.oz_seller_earnings,{hold_days:3,pending_adjustments_kurus:a})},adj);
  await p.evaluate(()=>OZ.go('seller',{tab:'kazanc'}));await p.waitForTimeout(1500);
  return p.evaluate(()=>{const b=document.getElementById('ozSP');if(!b)return null;const ps=[...b.querySelectorAll('p.ozMuted')].map(x=>x.textContent.trim());return {ps,adj:(b.querySelector('[data-adj]')||{}).textContent||null}})};
 let k=await kaz(0);
 ok(k&&k.ps.some(t=>t==='Teslim edilen siparişlerin tutarı teslimden 3 gün sonra ödemeye hazır olur. İade olursa tutar sonraki ödemenizden düşülür.')&&!k.ps.some(t=>/iade süresi için/.test(t)),'kazanç: yeni bekleme açıklaması: '+JSON.stringify(k));
 ok(k&&k.adj===null,'kazanç: mahsup 0 iken satır yok: '+JSON.stringify(k&&k.adj));
 k=await kaz(12550);
 ok(k&&/^Mahsup edilecek: 125,50\s₺$/.test(k.adj||''),'kazanç: "Mahsup edilecek: 125,50 ₺": '+JSON.stringify(k&&k.adj));
 // 2) yönetici özeti
 await p.evaluate(()=>{window.__OZ_FX.R.oz_admin_overview={payouts_overdue:2,pending_adjustments_kurus:12550,payable_kurus:80000};window.PF.roles={is_admin:true,roles:['super']}});
 await p.evaluate(()=>PF.openAdmin('oz_overview'));await p.waitForTimeout(1500);
 const ov=await p.evaluate(()=>{const g=k=>{const e=document.querySelector('[data-kpi='+k+']');return e?{t:e.querySelector('small').textContent,v:e.querySelector('b').textContent,hot:e.classList.contains('hot')}:null};return {od:g('payouts_overdue'),adj:g('pending_adjustments_kurus')}});
 ok(ov.od&&ov.od.t==='Süresi geçen ödeme'&&ov.od.v==='2'&&ov.od.hot,'özet: "Süresi geçen ödeme" 2, vurgulu: '+JSON.stringify(ov.od));
 ok(ov.adj&&ov.adj.t==='Mahsup bekleyen'&&/125,50/.test(ov.adj.v),'özet: "Mahsup bekleyen" 125,50: '+JSON.stringify(ov.adj));
 // 3) ödeme listesi: payouts_due
 const past=new Date(Date.now()-2*864e5).toISOString(),fut=new Date(Date.now()+5*864e5).toISOString();
 await p.evaluate(([past,fut])=>{const F=window.__OZ_FX;const base=F.lists.payouts||[];F.lists.payouts=base;
  const orig=window.PF.rpc;window.PF.rpc=async function(fn,a){if(fn==='oz_admin_list'&&a&&a.p_kind==='payouts_due'){if(window.__noDue){const e=new Error('PF_INPUT: Bilinmeyen liste');throw e}
    return [{seller_id:'s1',seller_name:'Yayla',available_kurus:80000,unpaid_kurus:95000,pending_adjustments_kurus:12550,due_by:past},{seller_id:'s2',seller_name:'Ova',available_kurus:30000,unpaid_kurus:30000,pending_adjustments_kurus:0,due_by:fut}]}
   return orig.apply(this,arguments)}},[past,fut]);
 await p.evaluate(()=>PF.openAdmin('oz_payouts'));await p.waitForTimeout(1500);
 const pl=await p.evaluate(()=>[...document.querySelectorAll('.pfxCard')].filter(c=>c.querySelector('[data-a=aPayNew]')&&/^(Yayla|Ova)$/.test((c.querySelector('b')||{}).textContent||'')).map(c=>({n:c.querySelector('b').textContent,due:(c.querySelector('[data-due]')||{}).textContent||null,late:!!c.querySelector('[data-late]'),lateCol:c.querySelector('[data-late]')?getComputedStyle(c.querySelector('[data-late]')).color:null,txt:c.innerText.replace(/\s+/g,' ')})));
 ok(pl.length===2&&/^Son ödeme günü: /.test(pl[0].due||'')&&pl[0].late&&!pl[1].late&&/^Son ödeme günü: /.test(pl[1].due||''),'ödeme listesi: son ödeme günü, geçmişte "Gecikti": '+JSON.stringify(pl));
 ok(pl[0]&&/Mahsup: −125,50/.test(pl[0].txt)&&/Bekleme süresinde: 150,00/.test(pl[0].txt)&&!/Mahsup/.test(pl[1].txt),'ödeme listesi: mahsup ve bekleme tutarı: '+JSON.stringify(pl.map(x=>x.txt)));
 const red=pl[0]&&pl[0].lateCol&&pl[0].lateCol.match(/\d+/g).map(Number);ok(red&&red[0]>150&&red[0]-red[1]>60,'"Gecikti" kırmızı: '+(pl[0]&&pl[0].lateCol));
 // payouts_due okunamazsa (SQL uygulanmadı) liste yine açılır
 await p.evaluate(()=>{window.__noDue=true;document.querySelectorAll('.pfxOv').forEach(x=>x.remove())});await p.evaluate(()=>PF.openAdmin('oz_payouts'));await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>/Ödeme kayıtları/.test(document.body.innerText)&&!document.querySelector('[data-due]')),'payouts_due yokken ödeme listesi yine açılır');
 // 4) ayarlar yardım metni
 await p.evaluate(()=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove())});await p.evaluate(()=>PF.openAdmin('oz_settings'));await p.waitForTimeout(1200);
 const se=await p.evaluate(()=>{const l=document.querySelector('label[for=ozAS_oz_payout_hold_days]'),h=document.getElementById('ozASh_oz_payout_hold_days');return {l:l&&l.textContent,h:h&&h.textContent}});
 ok(se.l==='Ödeme bekletme süresi (gün)'&&se.h==='En çok 5 iş günü içinde ödeme yapılmalıdır.','ayarlar: etiket aynı + yardım metni: '+JSON.stringify(se));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p6-hakedis BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p6-hakedis: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p6-hakedis HATA:',e);process.exit(1)});
