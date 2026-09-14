/* A3.5.5 — İlanlarım management bridge
 * Test branch only. Owner-only listing management; no Hallet changes.
 */
(()=>{
  if(window.__A355_MY_LISTINGS__) return;
  window.__A355_MY_LISTINGS__=1;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));
  const session=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}};
  const uid=()=>session()?.user?.id||session()?.user_id||null;
  const typeLabel=t=>t==='gayrimenkul'?'Gayrimenkul':t==='otomobil'?'Otomobil':t==='hizmet'?'Hizmet':E(t||'İlan');
  const statusLabel=s=>({draft:'Taslak',published:'Yayında',reserved:'Rezerve',sold:'Satıldı',archived:'Arşivde'}[s]||s);
  async function rows(){
    const me=uid();
    if(!me||typeof supabaseRequest!=='function') return [];
    try{return await supabaseRequest('GET','listings?select=id,owner_id,listing_type,category,title,description,price,currency,city,district,status,created_at,updated_at&owner_id=eq.'+encodeURIComponent(me)+'&order=updated_at.desc&limit=100')||[]}catch(e){console.warn('A3.5.5 listings:',e);return []}
  }
  async function setStatus(id,status){
    const me=uid(); if(!me||!id||!['published','archived'].includes(status)) return false;
    try{
      const l=(await supabaseRequest('GET','listings?select=id,owner_id,status&owner_id=eq.'+encodeURIComponent(me)+'&id=eq.'+encodeURIComponent(id)+'&limit=1'))?.[0];
      if(!l||l.owner_id!==me||!['published','archived'].includes(l.status)) return false;
      if(typeof listingsAuthWrite!=='function') throw new Error('Yetkili ilan yazma yardımcısı bulunamadı.');
      const out=await listingsAuthWrite('PATCH','listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(me),{status});
      const updated=Array.isArray(out?.data)?out.data:[];
      return updated.length>0 && updated[0].status===status && updated[0].owner_id===me;
    }catch(e){console.warn('A3.5.5 status:',e);return false}
  }
  function card(l){
    const loc=[l.district,l.city].filter(Boolean).map(E).join(' · ');
    const price=l.price!=null?`${E(Number(l.price).toLocaleString('tr-TR'))} ${E(l.currency||'TRY')}`:'';
    const action=l.status==='published'?'<button type="button" data-a355="archive">Yayından kaldır</button>':l.status==='archived'?'<button type="button" data-a355="publish">Yeniden yayınla</button>':'';
    const view=l.status==='published'?'<button type="button" data-a355="view">İlanı aç</button>':'';
    return `<article class="card" data-listing-id="${E(l.id)}" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><strong>${E(l.title||'Başlıksız ilan')}</strong><div class="small muted" style="margin-top:4px">${typeLabel(l.listing_type)}${loc?' · 📍 '+loc:''}</div></div><span class="small muted">${E(statusLabel(l.status))}</span></div>${price?`<div style="font-size:18px;font-weight:800;margin-top:8px">${price}</div>`:''}<div class="small muted" style="margin-top:6px">Güncelleme: ${l.updated_at?new Date(l.updated_at).toLocaleString('tr-TR'):''}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${view}${action}</div></article>`;
  }
  async function show(){
    const me=uid(); if(!me){alert('İlanlarınızı görmek için giriş yapmalısınız.');return;}
    const host=document.getElementById('app'); if(!host)return;
    const list=await rows();
    host.innerHTML=`<section class="section"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><h2 style="margin:0">📋 İlanlarım</h2><div class="small muted" style="margin-top:5px">Tüm ilanlarınız ve yayın durumları</div></div><button type="button" data-a355="back">← Marketplace</button></div><div class="small muted" style="margin-top:12px">${list.length} ilan</div><div class="a355List">${list.length?list.map(card).join(''):'<div class="card" style="margin-top:12px">Henüz ilanınız bulunmuyor.</div>'}</div></section>`;
    host.querySelector('[data-a355="back"]')?.addEventListener('click',()=>typeof showListingsHub==='function'?showListingsHub():location.reload());
    host.querySelector('.a355List')?.addEventListener('click',async ev=>{
      const b=ev.target.closest('button[data-a355]'); if(!b)return;
      const article=b.closest('article[data-listing-id]');
      const id=article?.getAttribute('data-listing-id');
      const item=list.find(x=>String(x.id)===String(id));
      if(!item||!id)return;
      if(b.dataset.a355==='view'){
        if(item.listing_type==='gayrimenkul'&&typeof showGayrimenkulDetail==='function') return showGayrimenkulDetail(item.id);
        if(item.listing_type==='otomobil'&&typeof showOtomobilDetail==='function') return showOtomobilDetail(item.id);
        return;
      }
      if(b.dataset.a355==='archive'||b.dataset.a355==='publish'){
        const next=b.dataset.a355==='archive'?'archived':'published';
        b.disabled=true;
        const ok=await setStatus(item.id,next);
        if(ok) show(); else {b.disabled=false;alert('İlan durumu değiştirilemedi. Lütfen tekrar deneyin.');}
      }
    });
  }
  function addEntry(){
    const host=document.getElementById('app'); if(!host||host.querySelector('.a355Entry'))return;
    const section=document.createElement('section'); section.className='section card a355Entry';
    section.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>📋 İlanlarım</strong><div class="small muted" style="margin-top:4px">İlanlarınızı yönetin, yayından kaldırın veya yeniden yayınlayın.</div></div><button type="button" data-a355="open">Aç</button></div>';
    host.appendChild(section); section.querySelector('button')?.addEventListener('click',show);
  }
  function hook(name){const f=window[name];if(typeof f!=='function'||f.__a355)return;const w=function(){const out=f.apply(this,arguments);setTimeout(addEntry,120);return out};w.__a355=true;window[name]=w}
  setTimeout(()=>{['showListingsHub','showGayrimenkulHub','showOtomobilHub'].forEach(hook);addEntry()},0);
  window.__A355_SHOW_MY_LISTINGS__=show;
})();
