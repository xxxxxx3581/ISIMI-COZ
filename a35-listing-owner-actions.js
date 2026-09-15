/* A3.5.4 — safe owner listing actions bridge
 * Test branch only. Owner-only UI; no Hallet/search/photo changes.
 */
(()=>{
  if(window.__A354_OWNER_ACTIONS__) return;
  window.__A354_OWNER_ACTIONS__=1;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));
  const session=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}};
  const uid=()=>session()?.user?.id||session()?.user_id||null;
  async function listing(id){if(!id||typeof supabaseRequest!=='function')return null;try{const rows=await supabaseRequest('GET','listings?select=id,owner_id,status,title&status=in.(draft,published,reserved,sold,archived)&id=eq.'+encodeURIComponent(id)+'&limit=1');return rows?.[0]||null}catch(e){console.warn('A3.5.4 listing lookup:',e);return null}}
  async function setStatus(id,status){const me=uid();if(!me||!id||!['published','archived'].includes(status))return false;const l=await listing(id);if(!l||l.owner_id!==me)return false;try{if(typeof listingsAuthWrite!=='function')throw new Error('Yetkili ilan yazma yardımcısı bulunamadı.');const out=await listingsAuthWrite('PATCH','listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(me),{status});const rows=Array.isArray(out?.data)?out.data:[];return rows.length>0&&rows[0].status===status&&rows[0].owner_id===me}catch(e){console.warn('A3.5.4 status update:',e);return false}}
  function idFromUrl(){try{const u=new URL(location.href);return u.searchParams.get('listing')||u.searchParams.get('id')||null}catch(_){return null}}
  function loadFullEditor(){if(document.querySelector('script[data-a356-plus]'))return;const s=document.createElement('script');s.src='./a35-listing-edit-plus.js';s.dataset.a356Plus='1';s.defer=true;document.head.appendChild(s)}
  function render(id){const me=uid();if(!me||!id)return;listing(id).then(l=>{if(!l||l.owner_id!==me)return;const host=document.getElementById('app');if(!host)return;let section=host.querySelector('.a354OwnerActions');if(!section){const published=l.status==='published',archived=l.status==='archived';section=document.createElement('section');section.className='section card a354OwnerActions';section.innerHTML='<div><strong>İlan yönetimi</strong><div class="small muted" style="margin-top:4px">Bu alan yalnızca ilan sahibine görünür.</div></div><div data-a354-row style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"></div>';host.appendChild(section);const row=section.querySelector('[data-a354-row]');if(published||archived){const b=document.createElement('button');b.type='button';b.dataset.a354=published?'archive':'publish';b.textContent=published?'Yayından kaldır':'Yeniden yayınla';row.appendChild(b);b.addEventListener('click',async()=>{b.disabled=true;const next=b.dataset.a354==='archive'?'archived':'published';const ok=await setStatus(id,next);if(ok){section.remove();if(typeof window.__A355_SHOW_MY_LISTINGS__==='function')window.__A355_SHOW_MY_LISTINGS__()}else{b.disabled=false;alert('İlan durumu değiştirilemedi. Lütfen tekrar deneyin.')}})} }
    const row=section.querySelector('[data-a354-row]');if(row&&!row.querySelector('[data-a356-edit-visible]')){const b=document.createElement('button');b.type='button';b.dataset.a356EditVisible='1';b.textContent='Düzenle';b.addEventListener('click',()=>{location.href='./marketplace-listing-edit.html?id='+encodeURIComponent(id)});row.insertBefore(b,row.firstChild)}
    loadFullEditor();
  })}
  function hook(name){const f=window[name];if(typeof f!=='function'||f.__a354)return;const w=async function(id){const out=await f.apply(this,arguments);setTimeout(()=>render(id),220);return out};w.__a354=true;window[name]=w}
  setTimeout(()=>{hook('showGayrimenkulDetail');hook('showOtomobilDetail');render(idFromUrl());loadFullEditor()},0);
  window.__A354_RENDER_OWNER_ACTIONS__=render;
})();