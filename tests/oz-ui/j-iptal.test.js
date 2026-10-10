// J: müşteri "Siparişi iptal et" düğmesi — 390px, sahte veri. Çalıştırma: node tests/oz-ui/j-iptal.test.js
// Doğrulanan: iptal edilebilir durumlarda (awaiting_payment, new) kartta ve detayda düğme görünür, mercan tonda ve ≥44px;
// dokununca onay penceresi açılır ("Vazgeç" nötr, "Evet, iptal et" aynı mercan); Vazgeç sunucuya gitmez, onay
// oz_transition_order(cancel) çağırır. İptal edilemez durumlarda (accepted, shipped, delivered) düğme hiç yok.
const {chromium,open,enter}=require('./harness.js');
const CORAL='rgb(232, 104, 93)';
async function run(br,status,fails){
 const ok=(c,m)=>{if(!c)fails.push('['+status+'] '+m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true,fx:{orderStatus:status}});
 await enter(p);await p.waitForTimeout(700);
 await p.click('#ozNav [data-k=orders]');await p.waitForTimeout(900);
 if(status==='delivered'){await p.click('[data-tab=done]');await p.waitForTimeout(500)}
 const can=status==='awaiting_payment'||status==='new';
 const btnInfo=sel=>p.evaluate(s=>{const b=document.querySelector(s);if(!b)return null;const r=b.getBoundingClientRect(),cs=getComputedStyle(b);
  const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return {h:Math.round(r.height),vis:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.5,onTop:!!top&&b.contains(top),color:cs.color,border:cs.borderTopColor,bg:cs.backgroundColor,icon:!!b.querySelector('svg'),txt:b.innerText.trim()}},sel);
 const card=await btnInfo('#ozRoot .ozOrd [data-a=ordCancel]');
 if(!can){ok(card===null,'kartta iptal düğmesi olmamalı')}
 else{
  ok(card&&card.vis&&card.onTop,'kartta iptal düğmesi görünür ve tıklanabilir olmalı');
  ok(card&&card.h>=44,'kart düğmesi en az 44px olmalı: '+(card&&card.h));
  ok(card&&card.color===CORAL&&card.border===CORAL&&/rgba\(220, 80, 70, 0\.15\)/.test(card.bg)&&card.icon,'kart düğmesi mercan tonda ve × ikonlu olmalı: '+JSON.stringify(card));
  // düğme yok/örtülü ise tıklama adımları zaman aşımına düşer: açık nedenle bu durumu burada bitir
  if(!(card&&card.vis&&card.onTop)){await p.context().close();return}
  await p.click('#ozRoot .ozOrd [data-a=ordCancel]');await p.waitForTimeout(500);
  const dlg=await p.evaluate(()=>{const o=document.querySelector('.ozOv');if(!o)return null;const y=o.querySelector('[data-a=fbOk]'),n=o.querySelector('[data-a=fbNo]');
   return {title:(o.querySelector('h2')||{}).textContent,yes:y&&y.textContent.trim(),yesCnl:!!y&&y.classList.contains('ozCnl'),yesColor:y&&getComputedStyle(y).color,no:n&&n.textContent.trim(),noNeutral:!!n&&!/\b(pri|bad|ozCnl)\b/.test(n.className)}});
  ok(dlg&&/iptal/i.test(dlg.title||''),'onay penceresi açılmalı');
  ok(dlg&&dlg.yes==='Evet, iptal et'&&dlg.yesCnl&&dlg.yesColor===CORAL,'"Evet, iptal et" mercan tonda olmalı: '+JSON.stringify(dlg));
  ok(dlg&&dlg.no==='Vazgeç'&&dlg.noNeutral,'"Vazgeç" nötr olmalı');
  await p.click('.ozOv [data-a=fbNo]');await p.waitForTimeout(300);
  ok(!st.calls.some(c=>c[0]==='oz_transition_order'),'Vazgeç sunucuya istek göndermemeli');
 }
 await p.click('#ozRoot .ozOrd .th');await p.waitForTimeout(1200);
 const det=await btnInfo('#ozRoot .ozOd [data-a=ordCancel]');
 if(!can){ok(det===null,'detayda iptal düğmesi olmamalı')}
 else{
  ok(det&&det.vis&&det.h>=44&&det.color===CORAL&&det.icon&&/Siparişi iptal et/.test(det.txt),'detayda mercan "Siparişi iptal et" düğmesi olmalı: '+JSON.stringify(det));
  if(!(det&&det.vis&&det.onTop)){await p.context().close();return}
  await p.click('#ozRoot .ozOd [data-a=ordCancel]');await p.waitForTimeout(500);
  await p.click('.ozOv [data-a=fbOk]');await p.waitForTimeout(800);
  const c=st.calls.find(c=>c[0]==='oz_transition_order');
  ok(c&&c[1].p_action==='cancel','onaylayınca oz_transition_order(cancel) çağrılmalı');
 }
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await p.context().close();
}
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];
 for(const s of ['new','awaiting_payment','accepted','shipped','delivered'])await run(br,s,fails);
 await br.close();
 if(fails.length){console.error('j-iptal BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('j-iptal: tüm kontroller geçti (5 durum)');process.exit(0);
})().catch(e=>{console.error('j-iptal HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
