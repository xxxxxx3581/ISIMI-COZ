// R5: satıcı "Sorular ve yorumlar" → sorular yalnız satıcının listesinden kaldırılmamışlar (seller_hidden false) — 390px, sahte veri (RPC sahte).
// Çalıştırma: node tests/oz-ui/r5-sorukaldir.test.js
// Doğrulanan: liste ve "N cevapsız" seller_hidden=true soruları göstermez; "Listemden kaldır" + altında "Sorular müşterilere görünmeye devam
// eder."; onay penceresinde aynı not; Vazgeç → RPC yok, liste aynı; onay → oz_questions_hide_all, liste boş; sonra gelen yeni soru görünür.
// Arayüzde "sil" kelimesi geçmez.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||700);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const F=window.__OZ_FX,T=F.T;T.oz_products=[{id:'sp1',seller_id:'s1',name:'Reçel',status:'published',images:[]}];T.oz_reviews=[];
  T.oz_questions=[{id:'q1',product_id:'sp1',question:'Şekerli mi?',answer:null,seller_hidden:false,created_at:'2026-10-02T10:00:00Z'},
   {id:'q2',product_id:'sp1',question:'Önceden kaldırılan?',answer:null,seller_hidden:true,created_at:'2026-10-01T10:00:00Z'},
   {id:'q3',product_id:'sp1',question:'Cam mı?',answer:'Evet',seller_hidden:false,created_at:'2026-10-01T09:00:00Z'}];
  F.R.oz_questions_hide_all=2;
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){const r=await o(fn,a);if(fn==='oz_questions_hide_all')T.oz_questions.forEach(x=>{x.seller_hidden=true});return r}});
 await enter(p);await p.waitForTimeout(600);
 const S=()=>p.evaluate(()=>{const sp=document.getElementById('ozSP');const hs=[...sp.querySelectorAll('.ozSecH')];const qh=hs.find(h=>/Sorular/.test(h.innerText));
  const after=[];let n=qh&&qh.nextElementSibling;while(n&&!n.classList.contains('ozSecH')){after.push(n);n=n.nextElementSibling}
  const b=document.getElementById('ozSqN');
  return {cnt:qh?qh.innerText.replace(/\s+/g,' ').trim():null,cards:after.flatMap(x=>[...x.querySelectorAll('.ozCard p b')].map(q=>q.textContent)),
   btn:(sp.querySelector('[data-a=qHideAll]')||{}).textContent||null,note:((after.map(x=>x.querySelector&&x.querySelector('.ozSpClr small')||(x.matches&&x.matches('.ozSpClr')&&x.querySelector('small'))).find(Boolean))||{}).textContent||null,
   empty:after.some(x=>/Soru yok/.test(x.textContent)),badge:b&&!b.hidden?b.textContent:null,wide:document.documentElement.scrollWidth}});
 const calls=()=>st.calls.filter(c=>c[0]==='oz_questions_hide_all').length;
 const goTab=async()=>{await p.evaluate(()=>OZ.go('seller',{tab:'ozet'}));await p.waitForTimeout(900);await p.evaluate(()=>OZ.go('seller',{tab:'sorular'}));await p.waitForTimeout(1500)};
 await goTab();let s=await S();
 ok(s.cards.join('|')==='Şekerli mi?|Cam mı?','yalnız kaldırılmamış sorular listelenmeli: '+JSON.stringify(s.cards));
 ok(s.cnt==='Sorular 1 cevapsız'&&s.badge==='1','"1 cevapsız" ve rozet 1: '+JSON.stringify([s.cnt,s.badge]));
 ok(s.btn==='Listemden kaldır'&&s.note==='Sorular müşterilere görünmeye devam eder.','düğme ve alt not: '+JSON.stringify([s.btn,s.note]));
 ok(st.calls.some(c=>c[0]==='GET oz_questions'&&/seller_hidden=not\.is\.true/.test(c[1])),'okuma yalnız kaldırılmamış soruları istemeli');
 ok(s.wide<=390,'390px taşma olmamalı: '+s.wide);
 // Vazgeç → RPC yok
 await click(p,'#ozSP [data-a=qHideAll]');
 const dlg=await p.evaluate(()=>{const o=document.querySelector('.ozOv');return o?o.innerText:''});
 ok(/Sorular müşterilere görünmeye devam eder\./.test(dlg)&&!/sil/i.test(dlg),'onay penceresi: not var, "sil" yok: '+JSON.stringify(dlg));
 await click(p,'.ozOv [data-a=cbNo]');s=await S();
 ok(calls()===0&&s.cards.length===2,'Vazgeç → RPC yok, liste aynı: '+calls()+' / '+s.cards.length);
 // Onay → RPC, liste boş
 await click(p,'#ozSP [data-a=qHideAll]');await click(p,'.ozOv [data-a=cbYes]',1500);s=await S();
 ok(calls()===1,'onay → oz_questions_hide_all bir kez: '+calls());
 ok(s.cards.length===0&&s.empty&&s.cnt==='Sorular 0 cevapsız'&&!s.btn&&s.badge===null,'onaydan sonra liste boş, düğme ve rozet yok: '+JSON.stringify(s));
 // yeni soru görünür
 await p.evaluate(()=>{window.__OZ_FX.T.oz_questions.push({id:'q4',product_id:'sp1',question:'Yeni soru?',answer:null,seller_hidden:false,created_at:'2026-10-10T12:00:00Z'})});
 await goTab();s=await S();
 ok(s.cards.join('|')==='Yeni soru?'&&s.cnt==='Sorular 1 cevapsız'&&s.badge==='1','yeni soru görünmeli: '+JSON.stringify(s));
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('r5-sorukaldir BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('r5-sorukaldir: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('r5-sorukaldir HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
