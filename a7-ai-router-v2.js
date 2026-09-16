/* A7 — General AI Router V2 companion
   Multi-need decomposition stays inside the AI modal; it does not inject UI into the home or property screens. */
(()=>{
  if(window.__A7_GENERAL_AI_ROUTER_V2__) return;
  window.__A7_GENERAL_AI_ROUTER_V2__=1;
  const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
  const has=(t,arr)=>arr.some(x=>t.includes(x));
  const escText=v=>typeof esc==='function'?esc(v):String(v||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  const RULES=[
    {key:'property',label:'Gayrimenkul / Tapu',icon:'🏠',words:['ev almak','ev satmak','konut almak','konut satmak','daire almak','daire satmak','gayrimenkul','tasinmaz','tapu','arsa almak','arsa satmak','isyeri almak','iş yeri almak','isyeri satmak','iş yeri satmak','ev kiralamak','kiraya vermek']},
    {key:'document',label:'Gerekli belgeler / Evrak',icon:'📄',words:['evrak','belge','belgeler','dilekce','dilekçe','form hazir','form hazır','basvuru metni','başvuru metni','sozlesme','sözleşme','gerekli belg','hangi belg']},
    {key:'cost',label:'Maliyet / Harç',icon:'💰',words:['masraf','masraflar','maliyet','harc','harç','ucret','ücret','fiyat','tapu harci','tapu harcı','vergi','ne kadar','kaç tl','kac tl']},
    {key:'official',label:'Resmî işlem / Başvuru',icon:'🏛️',words:['e-devlet','edevlet','kuruma basvur','kuruma başvur','resmi basvuru','resmî başvuru','nufus','nüfus','sgk','vergi dairesi','resmi islem','resmî işlem']},
    {key:'vehicle',label:'Araç / Otomobil',icon:'🚗',words:['araba','arac','araç','otomobil','ruhsat','plaka','noter araç','noter arac']},
    {key:'service',label:'Hizmet / Usta',icon:'🔧',words:['musluk','lavabo','klozet','gider','tesisat','elektrik','priz','kablo','klima','kombi','petek','boya','badana','mobilya','montaj','buzdolabi','bulasik','camasir','temizlik','nakliye','kilit','cilingir','marangoz','tadilat']}
  ];
  function decompose(text){const t=norm(text);return RULES.filter(r=>has(t,r.words));}
  function installStyle(){
    if(document.getElementById('a7RouterV2Style'))return;
    const s=document.createElement('style');s.id='a7RouterV2Style';
    s.textContent='.a7V2Needs{margin-top:12px;padding:11px 12px;border:1px solid var(--line,#29415d);border-radius:13px;background:rgba(20,184,122,.045)}.a7V2NeedsHead{font-size:11px;font-weight:800;color:var(--muted,#94a8bd);margin-bottom:8px}.a7V2NeedList{display:flex;flex-wrap:wrap;gap:6px}.a7V2Need{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:9px;background:var(--card2,#122338);border:1px solid var(--line,#29415d);font-size:11px;font-weight:700;color:var(--text,#f1f5f9)}.a7V2Note{margin-top:8px;font-size:11px;line-height:1.45;color:var(--muted,#94a8bd)}';
    document.head.appendChild(s);
  }
  function paint(modal){
    if(!modal)return;
    const ta=modal.querySelector('#a7SmartText'),result=modal.querySelector('#a7SmartResult');
    if(!ta||!result)return;
    const text=(ta.value||'').trim();
    const old=result.querySelector('.a7V2Needs');if(old)old.remove();
    const needs=decompose(text);
    if(!text||!needs.length)return;
    installStyle();
    localStorage.setItem('a7_ai_needs',JSON.stringify(needs.map(x=>x.key)));
    const box=document.createElement('div');box.className='a7V2Needs';
    box.innerHTML='<div class="a7V2NeedsHead">AI bu istekte birden fazla ihtiyacı ayırdı</div><div class="a7V2NeedList">'+needs.map(n=>'<span class="a7V2Need">'+n.icon+' '+escText(n.label)+'</span>').join('')+'</div><div class="a7V2Note">İlk akış mevcut İşimi Çöz yönlendirmesiyle açılır; diğer ihtiyaçlar bu özetten kaybolmaz.</div>';
    result.appendChild(box);
  }
  function loadRequestHandoffHelper(){
    if(document.querySelector('script[data-a7-smart-request]'))return;
    const s=document.createElement('script');s.src='./a7-smart-request-v1.js';s.setAttribute('data-a7-smart-request','1');s.defer=true;document.head.appendChild(s);
  }
  function scan(){
    const modal=document.querySelector('[data-a7-smart-modal]');
    if(!modal)return;
    const result=modal.querySelector('#a7SmartResult');
    if(!result||result.classList.contains('a7SmartHidden'))return;
    paint(modal);
  }
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('input',e=>{if(e.target&&e.target.id==='a7SmartText')setTimeout(scan,0)},true);
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest?e.target.closest('[data-a7-smart-modal] [data-a7-build]'):null;
    if(!btn)return;
    const modal=btn.closest('[data-a7-smart-modal]');if(!modal)return;
    const ta=modal.querySelector('#a7SmartText');const text=(ta&&ta.value||'').trim();if(!text)return;
    const t=norm(text);const serviceRule=RULES.find(r=>r.key==='service');const isService=!!serviceRule&&has(t,serviceRule.words);
    if(isService){
      localStorage.setItem('a7_ai_last_text',text);
      localStorage.setItem('a7_ai_last_intent','service');
      localStorage.setItem('a7_ai_request_handoff_at',String(Date.now()));
      /* The old Smart Intake button was responsible for opening the existing request form.
         V2 now calls that same existing entry point explicitly, so the AI button cannot get
         stuck waiting for a handler that may have been replaced by another UI layer. */
      if(typeof window.showRequest==='function'){
        e.preventDefault();
        e.stopImmediatePropagation();
        if(modal.parentNode)modal.remove();
        window.showRequest();
      }
    }
  },true);
  loadRequestHandoffHelper();
  setTimeout(loadRequestHandoffHelper,500);
  setTimeout(scan,250);setTimeout(scan,700);
})();
