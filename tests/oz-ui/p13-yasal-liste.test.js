// Paket 13: "Yasal metinler" listesi (PF.openLegal()) Özüne Dön metinlerini de gösterir — 390px, sahte veri, ağa çıkmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/p13-yasal-liste.test.js
// Doğrulanan: (a) yayındaki oz_* metinleri LEGAL_ORDER sırasıyla (mevcut türlerden sonra) listede; (b) LEGAL_ORDER dışında kalan yayındaki tür
// listenin SONUNA başlığıyla eklenir; (c) hiç yayın yoksa boş durum mesajı "Bu metin yayına hazırlanıyor." aynen; tek metin ekranı değişmedi.
const {chromium,open}=require('./harness.js');
const doc=(t,i)=>({doc_type:t,title:'Başlık '+t,version:i+1,summary:null,consent_kind:'info',audience:['all']});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 // PF.legalList önbelleği (PF.legal) doğrudan verilir: ağ çağrısı yok
 const list=async l=>{await p.evaluate(l=>{document.querySelectorAll('.pfxOv').forEach(x=>x.remove());window.PF.legal=l;return window.PF.openLegal()},l);await p.waitForTimeout(500);
  return p.evaluate(()=>{const ov=[...document.querySelectorAll('.pfxOv')].pop();if(!ov)return null;
   return {rows:[...ov.querySelectorAll('.pfxCard.pfxRow')].map(r=>({t:r.querySelector('b').textContent,k:((r.querySelector('button[onclick]')||{}).getAttribute&&r.querySelector('button[onclick]').getAttribute('onclick')||'').replace(/^PF\.openLegal\('|'\)$/g,'')})),
    pend:(ov.querySelector('.pfxPend b')||{}).textContent||null,company:!!ov.querySelector('button[onclick="PF.openCompany()"]')}})};
 // (a) karışık sırada gelen yayın: Yemek türleri + oz_* türleri
 const OZ=['oz_kvkk_eki','oz_on_bilgilendirme','oz_mesafeli_satis','oz_iade_cayma','oz_satici_sozlesmesi','oz_urun_kurallari'];
 const incoming=['oz_urun_kurallari','kvkk_aydinlatma','oz_iade_cayma','oz_kvkk_eki','kullanici_sozlesmesi','oz_mesafeli_satis','oz_satici_sozlesmesi','oz_on_bilgilendirme'].map(doc);
 let r=await list(incoming);
 ok(r&&JSON.stringify(r.rows.map(x=>x.k))===JSON.stringify(['kullanici_sozlesmesi','kvkk_aydinlatma'].concat(OZ)),'(a) oz_* metinleri mevcut türlerden sonra, istenen sırayla: '+JSON.stringify(r&&r.rows.map(x=>x.k)));
 ok(r&&r.rows.every(x=>x.t==='Başlık '+x.k)&&r.company&&!r.pend,'(a) başlıklar ve "Künye ve iletişim" duruyor: '+JSON.stringify(r));
 // (b) LEGAL_ORDER dışı tür sona eklenir
 r=await list([doc('yeni_tur_x',0),doc('oz_kvkk_eki',1),doc('kullanici_sozlesmesi',2),doc('baska_yeni',3)]);
 ok(r&&JSON.stringify(r.rows.map(x=>x.k))===JSON.stringify(['kullanici_sozlesmesi','oz_kvkk_eki','yeni_tur_x','baska_yeni'])&&r.rows[2].t==='Başlık yeni_tur_x','(b) bilinmeyen türler sona, başlığıyla: '+JSON.stringify(r&&r.rows));
 // (c) hiç yayın yok → boş durum mesajı aynen
 r=await list([]);
 ok(r&&!r.rows.length&&r.pend==='Bu metin yayına hazırlanıyor.'&&r.company,'(c) boş durum mesajı aynen: '+JSON.stringify(r));
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('p13-yasal-liste BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('p13-yasal-liste: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('p13-yasal-liste HATA:',e);process.exit(1)});
