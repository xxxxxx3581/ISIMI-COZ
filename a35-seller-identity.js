/* A3.5.3 — dynamic seller identity bridge
 * Test branch only. Does not alter Hallet, listing data, photos, search or filters.
 */
(()=>{
  if(window.__A353_SELLER_IDENTITY__) return;
  window.__A353_SELLER_IDENTITY__=1;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function profile(ownerId){
    if(!ownerId) return null;
    try{
      const rows=await supabaseRequest('GET','marketplace_profiles?select=display_name,seller_type,city,district&user_id=eq.'+encodeURIComponent(ownerId)+'&limit=1');
      return rows?.[0]||null;
    }catch(e){ console.warn('A3.5.3 profile lookup:',e); return null; }
  }
  function polishLowerSellerCard(){
    const card=document.querySelector('.a35SellerCard');
    if(!card) return;
    const label=[...card.querySelectorAll('.small.muted')].find(x=>String(x.textContent||'').trim()==='İlan sahibi');
    if(label) label.textContent='Satıcı';
  }
  async function apply(listingId){
    if(!listingId) return;
    try{
      const rows=await supabaseRequest('GET','listings?select=id,owner_id&status=eq.published&id=eq.'+encodeURIComponent(listingId)+'&limit=1');
      const ownerId=rows?.[0]?.owner_id;
      const p=await profile(ownerId);
      if(!p?.display_name) return;
      const name=E(p.display_name);
      const type=E(p.seller_type==='professional'?'Profesyonel satıcı':'Bireysel satıcı');
      const loc=[p.district,p.city].filter(Boolean).map(E).join(' · ');

      // Only target the existing detail-page seller block; do not touch the A3.5 lower card content.
      const blocks=[...document.querySelectorAll('#gmDetailArea .card,#otoDetailArea .card')];
      for(const block of blocks){
        const text=String(block.textContent||'');
        if(!text.includes('İlan sahibi')) continue;
        const labels=[...block.querySelectorAll('.small.muted')].filter(x=>String(x.textContent||'').trim()==='İlan sahibi');
        if(!labels.length) continue;
        const label=labels[0];
        let value=label.nextElementSibling;
        if(!value) continue;
        value.textContent=p.display_name;
        value.style.fontWeight='800';
        value.style.fontSize='16px';
        let meta=value.nextElementSibling;
        if(!meta || !String(meta.textContent||'').includes('satıcı')){
          meta=document.createElement('div');
          meta.className='small muted';
          meta.style.marginTop='4px';
          value.insertAdjacentElement('afterend',meta);
        }
        meta.innerHTML='<span class="activeDot"></span>'+type;
        if(loc){
          let locEl=meta.nextElementSibling;
          if(!locEl || !String(locEl.textContent||'').includes('📍')){
            locEl=document.createElement('div');
            locEl.className='small muted';
            locEl.style.marginTop='5px';
            meta.insertAdjacentElement('afterend',locEl);
          }
          locEl.textContent='📍 '+loc;
        }
        break;
      }
      polishLowerSellerCard();
    }catch(e){ console.warn('A3.5.3 identity bridge:',e); }
  }
  function hook(name){
    const f=window[name];
    if(typeof f!=='function'||f.__a353) return;
    const w=async function(id){
      const out=await f.apply(this,arguments);
      setTimeout(()=>apply(id),120);
      return out;
    };
    w.__a353=true;
    window[name]=w;
  }
  setTimeout(()=>{hook('showGayrimenkulDetail');hook('showOtomobilDetail');},0);
  window.__A353_APPLY_SELLER_IDENTITY__=apply;
})();
