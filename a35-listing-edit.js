/* A3.5.6 — safe owner listing edit bridge
 * Test branch only. Adds owner-only edit entry; edit page performs authenticated, owner-scoped PATCH.
 */
(()=>{
  if(window.__A356_LISTING_EDIT__) return;
  window.__A356_LISTING_EDIT__=1;
  const session=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}};
  const uid=()=>session()?.user?.id||session()?.user_id||null;
  const idFromUrl=()=>{try{const u=new URL(location.href);return u.searchParams.get('listing')||u.searchParams.get('id')||null}catch(_){return null}};
  function editUrl(id){return './marketplace-listing-edit.html?id='+encodeURIComponent(id)}
  function addDetailEdit(id){
    const me=uid();if(!me||!id)return;
    const ownerBox=document.querySelector('.a354OwnerActions');
    if(!ownerBox||ownerBox.querySelector('[data-a356="edit"]'))return;
    const row=ownerBox.querySelector('div[style*="display:flex"]');
    if(!row)return;
    const b=document.createElement('button');b.type='button';b.dataset.a356='edit';b.textContent='Düzenle';row.insertBefore(b,row.firstChild);
    b.addEventListener('click',()=>{location.href=editUrl(id)});
  }
  function addListEdit(){
    if(!uid())return;
    document.querySelectorAll('article[data-listing-id]').forEach(a=>{
      if(a.querySelector('[data-a356="edit"]'))return;
      const id=a.getAttribute('data-listing-id');if(!id)return;
      const row=a.querySelector('div[style*="display:flex"]:last-child');
      if(!row)return;
      const b=document.createElement('button');b.type='button';b.dataset.a356='edit';b.textContent='Düzenle';
      row.insertBefore(b,row.firstChild);b.addEventListener('click',()=>{location.href=editUrl(id)});
    });
  }
  function hook(name){
    const f=window[name];if(typeof f!=='function'||f.__a356)return;
    const w=async function(id){const out=await f.apply(this,arguments);setTimeout(()=>{addDetailEdit(id||idFromUrl());addListEdit()},300);return out};
    w.__a356=true;window[name]=w;
  }
  setTimeout(()=>{
    hook('showGayrimenkulDetail');hook('showOtomobilDetail');hook('showGayrimenkulHub');hook('showOtomobilHub');hook('showListingsHub');
    addDetailEdit(idFromUrl());addListEdit();
  },0);
  window.__A356_ADD_EDIT__=()=>{addDetailEdit(idFromUrl());addListEdit()};
})();
