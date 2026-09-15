/* A3.5.6 — safe owner listing edit bridge */
(()=>{
 if(window.__A356_LISTING_EDIT__)return;window.__A356_LISTING_EDIT__=1;
 const session=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}},uid=()=>session()?.user?.id||session()?.user_id||null;
 const idFromUrl=()=>{try{const u=new URL(location.href);return u.searchParams.get('listing')||u.searchParams.get('id')||null}catch(_){return null}};
 const editUrl=id=>'./marketplace-listing-edit.html?id='+encodeURIComponent(id);
 function addDetailEdit(id){const me=uid();if(!me||!id)return;const box=document.querySelector('.a354OwnerActions');if(!box||box.querySelector('[data-a356="edit"]'))return;const row=box.querySelector('div[style*="display:flex"]');if(!row)return;const b=document.createElement('button');b.type='button';b.dataset.a356='edit';b.textContent='Düzenle';row.insertBefore(b,row.firstChild);b.onclick=()=>location.href=editUrl(id)}
 function addListEdit(){if(!uid())return;document.querySelectorAll('article[data-listing-id]').forEach(a=>{if(a.querySelector('[data-a356="edit"]'))return;const id=a.getAttribute('data-listing-id');const row=a.querySelector('div[style*="display:flex"]:last-child');if(!id||!row)return;const b=document.createElement('button');b.type='button';b.dataset.a356='edit';b.textContent='Düzenle';row.insertBefore(b,row.firstChild);b.onclick=()=>location.href=editUrl(id)})}
 function hook(n){const f=window[n];if(typeof f!=='function'||f.__a356)return;const w=async function(id){const out=await f.apply(this,arguments);setTimeout(()=>{addDetailEdit(id||idFromUrl());addListEdit()},300);return out};w.__a356=1;window[n]=w}
 function loadPlus(){if(document.querySelector('script[data-a356b]'))return;const s=document.createElement('script');s.src='./a35-listing-edit-plus.js';s.dataset.a356b='1';s.defer=true;document.head.appendChild(s)}
 setTimeout(()=>{['showGayrimenkulDetail','showOtomobilDetail','showGayrimenkulHub','showOtomobilHub','showListingsHub'].forEach(hook);addDetailEdit(idFromUrl());addListEdit();loadPlus()},0);
 window.__A356_ADD_EDIT__=()=>{addDetailEdit(idFromUrl());addListEdit()};
})();