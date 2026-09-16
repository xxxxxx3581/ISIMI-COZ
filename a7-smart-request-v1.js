/* A7 — Smart Request Handoff V1
   AI only pre-fills the existing request form. It never submits a request. */
(()=>{
  if(window.__A7_SMART_REQUEST_HANDOFF_V1__) return;
  window.__A7_SMART_REQUEST_HANDOFF_V1__=1;
  const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
  const has=(t,arr)=>arr.some(x=>t.includes(x));
  const categoryRules=[
    {keys:['tesisat','musluk','lavabo','gider','klozet','su kaç','su kac','kaçak','kacak'],names:['tesisat']},
    {keys:['elektrik','priz','sigorta','kablo','aydınlatma','aydinlatma'],names:['elektrik']},
    {keys:['klima','klima'],names:['klima']},
    {keys:['kombi','petek','ısıtma','isitma'],names:['kombi']},
    {keys:['buzdolabı','buzdolabi','bulaşık','bulasik','çamaşır','camasir','fırın','firin','beyaz eşya','beyaz esya'],names:['beyaz']},
    {keys:['temizlik','temizle'],names:['temizlik']},
    {keys:['nakliye','taşıma','tasima','eşya taşı','esya tasi'],names:['nakliye']},
    {keys:['çilingir','cilingir','anahtar','kilit'],names:['cilingir']},
    {keys:['boya','badana'],names:['boya']},
    {keys:['marangoz','ahşap','ahsap'],names:['marangoz']},
    {keys:['mobilya','montaj','kurulum'],names:['montaj']},
    {keys:['tadilat','duvar','alçı','alci'],names:['tadilat']},
    {keys:['kamera','güvenlik','guvenlik'],names:['kamera']},
    {keys:['oto','araba','otomobil','lastik','motor'],names:['oto']}
  ];
  function pickCategory(text,select){
    const t=norm(text);let key='';
    for(const r of categoryRules){if(has(t,r.keys)){key=r.names[0];break;}}
    if(!select||!key)return false;
    const opts=[...select.options];
    let opt=opts.find(o=>norm(o.value)===key);
    if(!opt)opt=opts.find(o=>norm(o.textContent).includes(key));
    if(!opt)return false;
    select.value=opt.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function pickDistrict(text,select){
    if(!select)return false;
    const t=norm(text);const opts=[...select.options];
    const opt=opts.find(o=>o.value&&t.includes(norm(o.textContent)));
    if(!opt)return false;
    select.value=opt.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function pickUrgency(text,select){
    if(!select)return false;
    const t=norm(text);
    let wanted='';
    if(has(t,['acil','hemen','derhal','çok acil','cok acil'])) wanted='Acil';
    else if(has(t,['bugun','bugün','yarin','yarın'])) wanted='Bugün';
    else if(has(t,['bu hafta','hafta icinde','hafta içinde','uygun zamanda','musait zamanda','müsait zamanda'])) wanted='Uygun zamanda';
    if(!wanted)return false;
    const opt=[...select.options].find(o=>norm(o.value)===norm(wanted));
    if(!opt)return false;
    select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  function apply(){
    const raw=localStorage.getItem('a7_ai_last_text')||'';
    const ts=Number(localStorage.getItem('a7_ai_request_handoff_at')||0);
    if(!raw||!ts||Date.now()-ts>60000)return false;
    const ta=document.getElementById('reqDescription');
    const service=document.getElementById('reqService');
    if(!ta||!service)return false;
    if(!String(ta.value||'').trim()){
      ta.value=raw;
      ta.dispatchEvent(new Event('input',{bubbles:true}));
    }
    pickCategory(raw,service);
    pickDistrict(raw,document.getElementById('reqDistrict'));
    pickUrgency(raw,document.getElementById('reqUrgency'));
    const note=document.createElement('div');
    note.id='a7SmartRequestNote';
    note.style.cssText='margin:0 0 12px;padding:10px 12px;border:1px solid rgba(20,184,122,.28);border-radius:12px;background:rgba(20,184,122,.06);color:var(--muted,#94a8bd);font-size:11px;line-height:1.45';
    note.innerHTML='<strong style="color:var(--text,#f1f5f9)">🤖 AI taslağı forma aktardı.</strong><br>Bilgileri kontrol et; ad, telefon ve eksik alanları tamamladıktan sonra talebi sen gönder.';
    const desc=ta.closest('.formCard')||ta.parentElement;
    if(desc&&!document.getElementById('a7SmartRequestNote'))desc.insertBefore(note,ta);
    localStorage.removeItem('a7_ai_request_handoff_at');
    return true;
  }
  function hook(){
    if(typeof window.showRequest!=='function')return false;
    if(window.showRequest.__a7SmartWrapped)return true;
    const original=window.showRequest;
    const wrapped=function(){const out=original.apply(this,arguments);setTimeout(apply,0);setTimeout(apply,250);return out;};
    wrapped.__a7SmartWrapped=true;window.showRequest=wrapped;
    return true;
  }
  const timer=setInterval(()=>{if(hook())clearInterval(timer)},250);
  setTimeout(()=>clearInterval(timer),20000);
  const ob=new MutationObserver(()=>apply());
  ob.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(apply,300);setTimeout(apply,1000);
})();
