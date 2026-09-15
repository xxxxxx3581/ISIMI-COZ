/* A3.5.3 — dynamic seller identity bridge */
(()=>{
  if(window.__A353_SELLER_IDENTITY__) return;
  window.__A353_SELLER_IDENTITY__=1;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]||c));
  async function profile(ownerId){
    if(!ownerId)return null;
    try{
      const rows=await supabaseRequest('GET','marketplace_profiles?select=display_name,seller_type,city,district&user_id=eq.'+encodeURIComponent(ownerId)+'&limit=1');
      return rows?.[0]||null;
    }catch(e){console.warn('A3.5.3 profile lookup:',e);return null}
  }
  function paint(card,p){
    if(!card||!p?.display_name)return false;
    const type=p.seller_type==='professional'?'Profesyonel satıcı':'Bireysel satıcı';
    const loc=[p.district,p.city].filter(Boolean).join(' · ');
    const labels=[...card.querySelectorAll('.small.muted')].filter(x=>['İlan sahibi','Satıcı'].includes(String(x.textContent||'').trim()));
    if(labels.length){
      const label=labels[0];
      label.textContent='Satıcı';
      let value=label.nextElementSibling;
      if(!value){value=document.createElement('div');label.insertAdjacentElement('afterend',value)}
      value.textContent=p.display_name;
      value.style.fontWeight='800';
      value.style.fontSize='16px';
      let meta=value.nextElementSibling;
      if(!meta||!String(meta.textContent||'').includes('satıcı')){meta=document.createElement('div');meta.className='small muted';meta.style.marginTop='4px';value.insertAdjacentElement('afterend',meta)}
      meta.innerHTML='<span class="activeDot"></span>'+E(type)+(p.seller_type==='professional'?' <strong style="margin-left:5px">PRO</strong>':'');
      if(loc){
        let locEl=meta.nextElementSibling;
        if(!locEl||!String(locEl.textContent||'').includes('📍')){locEl=document.createElement('div');locEl.className='small muted';locEl.style.marginTop='5px';meta.insertAdjacentElement('afterend',locEl)}
        locEl.textContent='📍 '+loc;
      }
      return true;
    }
    return false;
  }
  async function apply(listingId){
    if(!listingId)return;
    try{
      const rows=await supabaseRequest('GET','listings?select=id,owner_id&status=eq.published&id=eq.'+encodeURIComponent(listingId)+'&limit=1');
      const ownerId=rows?.[0]?.owner_id;
      const p=await profile(ownerId);
      if(!p?.display_name)return;
      const cards=[...document.querySelectorAll('.a35SellerCard,#gmDetailArea .card,#otoDetailArea .card')];
      let painted=false;
      for(const card of cards) painted=paint(card,p)||painted;
      if(!painted) console.warn('A3.5.3: seller card target not found');
    }catch(e){console.warn('A3.5.3 identity bridge:',e)}
  }
  function hook(name){
    const f=window[name];
    if(typeof f!=='function'||f.__a353)return;
    const w=async function(id){const out=await f.apply(this,arguments);setTimeout(()=>apply(id),120);return out};
    w.__a353=1;window[name]=w;
  }
  setTimeout(()=>{hook('showGayrimenkulDetail');hook('showOtomobilDetail')},0);
  window.__A353_APPLY_SELLER_IDENTITY__=apply;
  setTimeout(()=>{
    const scripts=[
      ['data-a354-owner-actions','./a35-listing-owner-actions.js'],
      ['data-a355-my-listings','./a35-my-listings.js'],
      ['data-a3510-detail-cleanup','./a35-detail-photo-ui-cleanup.js'],
      ['data-a3512-photo-viewer','./a35-listing-photo-viewer.js'],
      ['data-a3513-ux-polish','./a35-listing-ux-polish.js'],
      ['data-a3514-social','./a35-marketplace-social.js'],
      ['data-a3515-nav','./a35-navigation-polish.js'],
      ['data-a3516-polish','./a35-marketplace-actions-polish.js'],
      ['data-a3518-global','./a35-marketplace-global-polish.js'],
      ['data-a5-trust-safety','./a5-trust-safety.js'],
      ['data-a5-trust-compact','./a5-trust-safety-compact.js']
    ];
    scripts.forEach(([attr,src])=>{if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');s.defer=true;document.head.appendChild(s)});
  },0);
})();
