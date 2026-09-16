/* A3.5.3 — dynamic seller identity bridge */
(()=>{
  if(window.__A353_SELLER_IDENTITY__) return;
  window.__A353_SELLER_IDENTITY__=1;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]||c));
  const listingId=()=>{try{const u=new URL(location.href);return u.searchParams.get('listing')||u.searchParams.get('id')||null}catch(_){return null}};
  async function profile(ownerId){if(!ownerId||typeof supabaseRequest!=='function')return null;try{const rows=await supabaseRequest('GET','marketplace_profiles?select=display_name,seller_type,city,district&user_id=eq.'+encodeURIComponent(ownerId)+'&limit=1');return rows?.[0]||null}catch(e){console.warn('A3.5.3 profile lookup:',e);return null}}
  function paint(card,p){
    if(!card||!p?.display_name)return false;
    const type=p.seller_type==='professional'?'Profesyonel satıcı':'Bireysel satıcı',loc=[p.district,p.city].filter(Boolean).join(' · ');
    const labels=[...card.querySelectorAll('.small.muted')].filter(x=>['İlan sahibi','Satıcı'].includes(String(x.textContent||'').trim()));
    if(!labels.length)return false;
    const label=labels[0];label.textContent='Satıcı';
    let value=label.nextElementSibling;if(!value){value=document.createElement('div');label.insertAdjacentElement('afterend',value)}
    value.textContent=p.display_name;value.style.fontWeight='800';value.style.fontSize='16px';
    let meta=value.nextElementSibling;if(!meta||!String(meta.textContent||'').includes('satıcı')){meta=document.createElement('div');meta.className='small muted';meta.style.marginTop='4px';value.insertAdjacentElement('afterend',meta)}
    meta.innerHTML='<span class="activeDot"></span>'+E(type)+(p.seller_type==='professional'?' <strong style="margin-left:5px">PRO</strong>':'');
    if(loc){let locEl=meta.nextElementSibling;if(!locEl||!String(locEl.textContent||'').includes('📍')){locEl=document.createElement('div');locEl.className='small muted';locEl.style.marginTop='5px';meta.insertAdjacentElement('afterend',locEl)}locEl.textContent='📍 '+loc}
    return true;
  }
  async function apply(id){if(!id)return;try{const rows=await supabaseRequest('GET','listings?select=id,owner_id&status=eq.published&id=eq.'+encodeURIComponent(id)+'&limit=1');const p=await profile(rows?.[0]?.owner_id);if(!p?.display_name)return;const cards=[...document.querySelectorAll('.a35SellerCard,#gmDetailArea .card,#otoDetailArea .card')];let painted=false;for(const card of cards)painted=paint(card,p)||painted;if(!painted)console.warn('A3.5.3: seller card target not found')}catch(e){console.warn('A3.5.3 identity bridge:',e)}}
  function hook(name){const f=window[name];if(typeof f!=='function'||f.__a353)return false;const w=async function(id){const out=await f.apply(this,arguments);setTimeout(()=>apply(id||listingId()),150);return out};w.__a353=1;window[name]=w;return true}
  const wait=setInterval(()=>{const a=hook('showGayrimenkulDetail'),b=hook('showOtomobilDetail');if(a||b){clearInterval(wait);setTimeout(()=>apply(listingId()),250)}},300);setTimeout(()=>clearInterval(wait),15000);
  window.__A353_APPLY_SELLER_IDENTITY__=apply;
  const ob=new MutationObserver(()=>{const id=listingId();if(id&&(document.querySelector('.a35SellerCard')||document.querySelector('#gmDetailArea .card')||document.querySelector('#otoDetailArea .card')))setTimeout(()=>apply(id),100)});ob.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{
    const scripts=[['data-a354-owner-actions','./a35-listing-owner-actions.js'],['data-a355-my-listings','./a35-my-listings.js'],['data-a3510-detail-cleanup','./a35-detail-photo-ui-cleanup.js'],['data-a3512-photo-viewer','./a35-listing-photo-viewer.js'],['data-a3513-ux-polish','./a35-listing-ux-polish.js'],['data-a3514-social','./a35-marketplace-social.js'],['data-a3515-nav','./a35-navigation-polish.js'],['data-a3516-polish','./a35-marketplace-actions-polish.js'],['data-a3518-global','./a35-marketplace-global-polish.js'],['data-a5-trust-safety','./a5-trust-safety.js'],['data-a5-trust-compact','./a5-trust-safety-compact.js'],['data-a7-voice','./a7-voice-input.js']];scripts.forEach(([attr,src])=>{if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');s.defer=true;document.head.appendChild(s)})
  },0);
})();

/* A7 — General AI intent router V1 */
(()=>{
  if(window.__A7_GENERAL_AI_ROUTER_V1__) return;
  window.__A7_GENERAL_AI_ROUTER_V1__=1;
  const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
  const has=(t,arr)=>arr.some(x=>t.includes(x));
  function classify(text){
    const t=norm(text);
    if(!t)return {intent:'unknown',label:'Diğer',detail:'Ne yapmak istediğini biraz daha anlatabilir misin?'};
    const service=has(t,['musluk','lavabo','klozet','gider','tesisat','priz','elektrik','sigorta','kablo','klima','kombi','petek','boya','badana','duvar','mobilya','montaj','buzdolabi','bulaşık','bulasik','camasir','cam','pencere','temizlik','nakliye','kilit','cilingir','marangoz','tadilat','kamera','guvenlik']);
    const property=has(t,['ev almak','ev almak istiyorum','ev satmak','ev satacagim','ev satacağım','konut almak','konut satmak','daire almak','daire satmak','gayrimenkul','tasınmaz','tasinmaz','tapu','arsa almak','arsa satmak','iş yeri almak','isyeri almak','iş yeri satmak','isyeri satmak','kira sözleşmesi','kira sozlesmesi','kiraya vermek','ev kiralamak','ev kiraya']);
    const vehicle=has(t,['araba almak','araba satmak','arac almak','arac satmak','araç almak','araç satmak','otomobil almak','otomobil satmak','otomobil','araba','araç ilan','arac ilan','noter araç','noter arac','ruhsat','plaka']);
    const document=has(t,['dilekçe','dilekce','evrak','belge hazırl','belge hazir','form hazır','form hazir','başvuru metni','basvuru metni','sözleşme tasla','sozlesme tasla','kira sözleşmesi','kira sozlesmesi']);
    const official=has(t,['e-devlet','edevlet','kuruma başvur','kuruma basvur','nüfus','nufus','kimlik randevu','sgk','vergi levhası','vergi levhasi','resmi başvuru','resmi basvuru']);
    if(service)return {intent:'service',label:'Hizmet / Usta',detail:'Mevcut Usta Bul akışına yönlendirilecek.'};
    if(document&&!property&&!vehicle)return {intent:'document',label:'Evrak Hazırlama',detail:'İşini Hallet → Evrak hazırlama akışına yönlendirilecek.'};
    if(official&&!property&&!vehicle)return {intent:'official',label:'Resmî İşlem',detail:'İşini Hallet → Kurum başvurusu akışına yönlendirilecek.'};
    if(vehicle)return {intent:'vehicle',label:'Araç / Otomobil',detail:'Araç işlemleri veya otomobil ilanlarına yönlendirilecek.'};
    if(property)return {intent:'property',label:'Gayrimenkul / Tapu',detail:'İşini Hallet → Taşınmaz işlemlerine yönlendirilecek.'};
    return {intent:'unknown',label:'Diğer',detail:'Doğru akışı seçebilmek için biraz daha bilgi gerekli.'};
  }
  function modalFor(modal){
    if(!modal||modal.dataset.a7RouterReady==='1')return;
    modal.dataset.a7RouterReady='1';
    const title=modal.querySelector('.a7SmartHead h2 span:last-child');if(title)title.textContent='İşimi Çöz AI';
    const hint=modal.querySelector('.a7SmartHint');if(hint)hint.textContent='Ne yapmak istediğini kendi cümlelerinle anlat. AI önce ihtiyacını anlayıp seni doğru İşimi Çöz akışına yönlendirsin.';
    const row=modal.querySelector('.a7SmartRow');
    if(row){row.innerHTML='<button type="button" class="a7SmartChip" data-a7-example="Mutfaktaki musluk damlatıyor, bu hafta içinde bir usta gelip tamir etsin.">🔧 Usta / hizmet</button><button type="button" class="a7SmartChip" data-a7-example="İzmir’de bir ev almak istiyorum, tapu ve hazırlık adımlarını öğrenmek istiyorum.">🏠 Ev / tapu</button><button type="button" class="a7SmartChip" data-a7-example="İkinci el bir araba almak istiyorum, ilanlara bakmak istiyorum.">🚗 Araç</button><button type="button" class="a7SmartChip" data-a7-example="Bir kuruma başvuru için dilekçe hazırlamak istiyorum.">📄 Evrak / başvuru</button>';row.style.gridTemplateColumns='1fr 1fr';}
    const build=modal.querySelector('[data-a7-build]');if(build)build.textContent='Devam Et';
  }
  function routeTo(intent){
    if(intent==='service')return {handled:false};
    const modal=document.querySelector('[data-a7-smart-modal]');if(modal)modal.remove();
    if(intent==='property'){if(window.Hallet&&typeof window.Hallet.showTasinmazMenu==='function'){window.Hallet.showTasinmazMenu();return {handled:true};}if(typeof window.openHallet==='function')window.openHallet();return {handled:true};}
    if(intent==='document'){if(window.Hallet&&typeof window.Hallet.showEvrak==='function'){window.Hallet.showEvrak();return {handled:true};}if(typeof window.openHallet==='function')window.openHallet();return {handled:true};}
    if(intent==='official'){if(window.Hallet&&typeof window.Hallet.showKurum==='function'){window.Hallet.showKurum();return {handled:true};}if(typeof window.openHallet==='function')window.openHallet();return {handled:true};}
    if(intent==='vehicle'){const t=norm(localStorage.getItem('a7_ai_last_text')||'');if(has(t,['ilan','ilanlara bak','araç ilan','arac ilan','otomobil ilan','otomobil ilanlar'])){if(typeof window.showOtomobilHub==='function'){window.showOtomobilHub();return {handled:true};}}if(window.Hallet&&typeof window.Hallet.showIslemMenu==='function'){window.Hallet.showIslemMenu();return {handled:true};}if(typeof window.showOtomobilHub==='function'){window.showOtomobilHub();return {handled:true};}return {handled:true};}
    return {handled:false};
  }
  function showRouteResult(modal,route){const result=modal.querySelector('#a7SmartResult');if(!result)return;result.classList.remove('a7SmartHidden');result.innerHTML='<b>AI ihtiyacını anladı</b><div class="a7SmartLine"><span class="a7SmartLabel">Akış</span><strong>'+E(route.label)+'</strong></div><div style="margin-top:10px;font-size:12px;line-height:1.5">'+E(route.detail)+'</div><div class="small muted" style="margin-top:9px">Metnin kaybolmaz. Doğru bölüme geçtiğinde kaldığın yerden devam edebilirsin.</div>';const build=modal.querySelector('[data-a7-build]');if(build)build.textContent='Doğru Akışa Git';}
  function E(v){return typeof esc==='function'?esc(v):String(v||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  document.addEventListener('click',function(e){const btn=e.target&&e.target.closest?e.target.closest('[data-a7-smart-modal] [data-a7-build]'):null;if(!btn)return;const modal=btn.closest('[data-a7-smart-modal]');if(!modal)return;const ta=modal.querySelector('#a7SmartText');const text=(ta&&ta.value||'').trim();if(!text)return;const route=classify(text);localStorage.setItem('a7_ai_last_text',text);localStorage.setItem('a7_ai_last_intent',route.intent);if(route.intent==='service')return;e.preventDefault();e.stopImmediatePropagation();showRouteResult(modal,route);if(btn.textContent.trim()==='Doğru Akışa Git')routeTo(route.intent);},true);
  const observer=new MutationObserver(function(){const m=document.querySelector('[data-a7-smart-modal]');if(m)modalFor(m)});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{const m=document.querySelector('[data-a7-smart-modal]');if(m)modalFor(m)},200);window.__A7_CLASSIFY_INTENT_V1__=classify;
})();
