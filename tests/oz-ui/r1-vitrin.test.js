// R1: satıcı Ürünler sekmesi vitrini — 390px, sahte veri (oz_showcase_set sahte). Çalıştırma: node tests/oz-ui/r1-vitrin.test.js
// Doğrulanan: yayındaki her ürün satırında "Vitrine koy / Vitrinden çıkar"; yayında olmayanda düğme yok. Vitrindekiler listenin
// üstünde "Vitrin" başlığı altında sırayla, ↑/↓ ile yer değişir. Her değişiklik oz_showcase_set'i güncel TAM sırayla çağırır.
// 6 ürün dolunca "Vitrine koy" pasif + "En fazla 6"; 7. ürün eklenemez (çağrı yok). RPC hata verirse eski sıra geri gelir + kısa uyarı.
const {chromium,open,enter}=require('./harness.js');
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const click=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel);return false}await p.waitForTimeout(w||500);return true};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(()=>{const T=window.__OZ_FX.T;const P=(id,name,status,so)=>({id,seller_id:'s1',name,status,images:[],category_id:'c1',showcase_order:so});
  T.oz_products=[P('u1','Bal 1','published',2),P('u2','Bal 2','published',1),P('u3','Bal 3','published',null),P('u4','Bal 4','published',null),P('u5','Bal 5','published',null),
   P('u6','Bal 6','published',null),P('u7','Bal 7','published',null),P('u8','Taslak','draft',null),P('u9','Gizli','hidden',null),P('u10','Bekleyen','pending',null)];
  T.oz_variants=[];window.__OZ_FX.R.oz_showcase_set=null});
 await enter(p);await p.waitForTimeout(600);
 await p.evaluate(()=>OZ.go('seller',{tab:'urunler'}));await p.waitForTimeout(1500);
 const S=()=>p.evaluate(()=>{const v=document.querySelector('#ozSP .ozSpVit');const new_=document.querySelector('#ozSP .ozSpNew');
  const btn={};[...document.querySelectorAll('#ozSP .ozSpRow')].forEach(r=>{const b=r.querySelector('.ozSpVB button');const sm=r.querySelector('.ozSpVB small');btn[r.dataset.pid]=b?(b.innerText.trim()+(b.disabled?'[pasif]':'')+(sm?'|'+sm.textContent:'')):null});
  return {h:v?(v.querySelector('h2')||{}).textContent:null,vit:v?[...v.querySelectorAll('.ozSpV')].map(x=>x.dataset.pid).join(','):'',
   top:!!(v&&new_&&(new_.compareDocumentPosition(v)&Node.DOCUMENT_POSITION_FOLLOWING)&&[...document.querySelectorAll('#ozSP .ozSpRow')].every(r=>v.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)),btn,
   wide:document.documentElement.scrollWidth}});
 const calls=()=>st.calls.filter(c=>c[0]==='oz_showcase_set').map(c=>(c[1].p_ids||[]).join(','));
 let s=await S();
 ok(s.h==='Vitrin'&&s.vit==='u2,u1'&&s.top,'Vitrin başlığı listenin üstünde, sıra showcase_order (u2,u1): '+JSON.stringify(s));
 ok(s.btn.u1==='Vitrinden çıkar'&&s.btn.u3==='Vitrine koy','yayındakilerde vitrin düğmesi: '+JSON.stringify(s.btn));
 ok(s.btn.u8===null&&s.btn.u9===null&&s.btn.u10===null,'yayında olmayanlarda vitrin düğmesi olmamalı: '+JSON.stringify(s.btn));
 ok(s.wide<=390,'390px yatay taşma olmamalı: '+s.wide);
 // ekle
 await click(p,'#ozSP .ozSpRow[data-pid=u3] .ozSpVB button');s=await S();
 ok(s.vit==='u2,u1,u3'&&calls().pop()==='u2,u1,u3','ekle → sona eklenir, RPC tam sıra: '+s.vit+' / '+calls().pop());
 // yukarı / aşağı
 await click(p,'#ozSP .ozSpV[data-pid=u3] [data-op=up]');s=await S();
 ok(s.vit==='u2,u3,u1'&&calls().pop()==='u2,u3,u1','↑ → yer değişir: '+s.vit+' / '+calls().pop());
 await click(p,'#ozSP .ozSpV[data-pid=u2] [data-op=down]');s=await S();
 ok(s.vit==='u3,u2,u1'&&calls().pop()==='u3,u2,u1','↓ → yer değişir: '+s.vit+' / '+calls().pop());
 ok(await p.evaluate(()=>{const a=document.querySelector('#ozSP .ozSpV[data-pid=u3] [data-op=up]'),b=document.querySelector('#ozSP .ozSpV[data-pid=u1] [data-op=down]');return !!(a&&b&&a.disabled&&b.disabled)}),'ilk ↑ ve son ↓ pasif olmalı');
 // çıkar (vitrin listesinden)
 await click(p,'#ozSP .ozSpV[data-pid=u2] [data-op=rm]');s=await S();
 ok(s.vit==='u3,u1'&&calls().pop()==='u3,u1'&&s.btn.u2==='Vitrine koy','çıkar → listeden düşer, RPC tam sıra: '+s.vit+' / '+calls().pop());
 // 6'ya doldur
 for(const id of ['u2','u4','u5','u6'])await click(p,'#ozSP .ozSpRow[data-pid='+id+'] .ozSpVB button');
 s=await S();
 ok(s.vit==='u3,u1,u2,u4,u5,u6'&&calls().pop()==='u3,u1,u2,u4,u5,u6','6 ürün: '+s.vit);
 ok(s.btn.u7==='Vitrine koy[pasif]|En fazla 6','7. ürün pasif + "En fazla 6": '+s.btn.u7);
 const n0=calls().length;
 await p.evaluate(()=>{const b=document.querySelector('#ozSP .ozSpRow[data-pid=u7] .ozSpVB button');if(b){b.disabled=false;b.click()}});await p.waitForTimeout(500);s=await S();
 ok(s.vit==='u3,u1,u2,u4,u5,u6'&&calls().length===n0,'7. ürün eklenmemeli, RPC çağrılmamalı: '+s.vit+' / '+(calls().length-n0));
 // RPC hatası → geri dön + uyarı
 await p.evaluate(()=>{window.__OZ_FX.fail={oz_showcase_set:'ağ hatası'}});
 await click(p,'#ozSP .ozSpV[data-pid=u1] [data-op=up]',900);s=await S();
 const tx=await p.evaluate(()=>document.body.innerText);
 ok(s.vit==='u3,u1,u2,u4,u5,u6'&&calls().pop()==='u1,u3,u2,u4,u5,u6','RPC hatasında eski sıra geri gelmeli: '+s.vit);
 ok(/Vitrin kaydedilemedi/.test(tx),'RPC hatasında kısa uyarı');
 await click(p,'#ozSP .ozSpV[data-pid=u6] [data-op=rm]',900);s=await S();
 ok(s.vit==='u3,u1,u2,u4,u5,u6'&&s.btn.u6==='Vitrinden çıkar','çıkarma hatasında da geri gelmeli: '+s.vit);
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('r1-vitrin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('r1-vitrin: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('r1-vitrin HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
