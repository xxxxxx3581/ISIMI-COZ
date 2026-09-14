/* A3.5.10 — direct owner photo action fix
 * Test branch only. Delegated handlers for photo cover/delete/add on listing detail.
 */
(()=>{
  if(window.__A3510_PHOTO_FIX__) return;
  window.__A3510_PHOTO_FIX__=1;
  const U='https://zvffspbowdzvrrzefhkr.supabase.co';
  const K='sb_publishable_L_qb9Q4fHktE51PEqEhTAg_O4R0eDiW';
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));
  function sess(){try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}}
  function uid(){const s=sess();return s?.user?.id||s?.user_id||null}
  function token(){const s=sess();return s?.access_token||s?.accessToken||null}
  async function getListing(id){
    if(typeof supabaseAuthRequest==='function'){
      const me=uid();
      const r=await supabaseAuthRequest('GET','listings?select=id,owner_id,metadata&owner_id=eq.'+encodeURIComponent(me)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');
      return r?.[0]||null;
    }
    return null;
  }
  async function patchListing(id,metadata){
    const me=uid();
    if(typeof listingsAuthWrite==='function'){
      const r=await listingsAuthWrite('PATCH','listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(me),{metadata});
      const row=Array.isArray(r?.data)?r.data[0]:Array.isArray(r)?r[0]:null;
      if(!row) throw Error('İlan güncellenemedi.');
      return row;
    }
    if(typeof supabaseAuthRequest==='function'){
      const r=await supabaseAuthRequest('PATCH','listings?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(me),{metadata});
      if(!r?.[0]) throw Error('İlan güncellenemedi.');
      return r[0];
    }
    throw Error('Yetkili ilan yazma bağlantısı bulunamadı.');
  }
  async function storageDelete(path){
    const t=token();
    if(!t) throw Error('Oturum bulunamadı.');
    const encoded=String(path).split('/').map(encodeURIComponent).join('/');
    const r=await fetch(U+'/storage/v1/object/listing-photos/'+encoded,{method:'DELETE',headers:{apikey:K,Authorization:'Bearer '+t}});
    const text=await r.text();
    if(!r.ok){let d;try{d=JSON.parse(text)}catch(_){}throw Error(d?.message||'Fotoğraf dosyası silinemedi (HTTP '+r.status+').')}
  }
  function msg(text,error=false){
    let el=document.getElementById('a359PhotoMsg');
    if(!el){el=document.createElement('div');el.id='a359PhotoMsg';el.style.marginTop='8px';document.querySelector('.a359Gallery')?.parentElement?.appendChild(el)}
    el.innerHTML='<div class="'+(error?'error':'success')+'">'+E(text)+'</div>';
  }
  async function reload(id){
    if(typeof window.__A358_SHOW_MY_LISTING_DETAIL__==='function') await window.__A358_SHOW_MY_LISTING_DETAIL__(id);
    else location.reload();
  }
  async function cover(id,index){
    const l=await getListing(id),photos=Array.isArray(l?.metadata?.photos)?[...l.metadata.photos]:[];
    if(!l||l.owner_id!==uid()||!photos[index]) throw Error('İlan veya fotoğraf bulunamadı.');
    if(index===0) return;
    const p=photos.splice(index,1)[0];photos.unshift(p);
    await patchListing(id,{...(l.metadata||{}),photos});
    await reload(id);
    msg('✓ Kapak fotoğrafı değiştirildi.');
  }
  async function remove(id,index){
    const l=await getListing(id),photos=Array.isArray(l?.metadata?.photos)?[...l.metadata.photos]:[];
    const p=photos[index];
    if(!l||l.owner_id!==uid()||!p) throw Error('İlan veya fotoğraf bulunamadı.');
    if(!confirm('Bu fotoğraf kalıcı olarak silinsin mi?')) return;
    await storageDelete(p.path);
    photos.splice(index,1);
    await patchListing(id,{...(l.metadata||{}),photos});
    await reload(id);
    msg('✓ Fotoğraf silindi.');
  }
  async function addFiles(id,files){
    const l=await getListing(id),photos=Array.isArray(l?.metadata?.photos)?[...l.metadata.photos]:[];
    if(!l||l.owner_id!==uid()) throw Error('İlan bulunamadı.');
    if(photos.length+files.length>10) throw Error('Bir ilanda en fazla 10 fotoğraf olabilir.');
    const t=token();if(!t)throw Error('Oturum bulunamadı.');
    for(const f of files){
      if(f.size>5242880) throw Error(f.name+' 5 MB sınırını aşıyor.');
      const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=uid()+'/'+id+'/'+Date.now()+'-'+safe;
      const r=await fetch(U+'/storage/v1/object/listing-photos/'+path,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':f.type||'application/octet-stream'},body:f});
      if(!r.ok){let d;try{d=await r.json()}catch(_){}throw Error(d?.message||'Fotoğraf yüklenemedi.')}
      photos.push({path,name:f.name,size:f.size,type:f.type});
    }
    await patchListing(id,{...(l.metadata||{}),photos});
    await reload(id);
    msg('✓ Fotoğraflar eklendi.');
  }
  document.addEventListener('click',async ev=>{
    const coverBtn=ev.target.closest?.('[data-photo-cover]');
    const deleteBtn=ev.target.closest?.('[data-photo-delete]');
    if(!coverBtn&&!deleteBtn)return;
    ev.preventDefault();ev.stopPropagation();
    const id=window.__A358_CURRENT_LISTING_ID__;
    if(!id){msg('İlan kimliği bulunamadı.',true);return}
    const b=coverBtn||deleteBtn;b.disabled=true;
    try{if(coverBtn)await cover(id,Number(coverBtn.dataset.photoCover));else await remove(id,Number(deleteBtn.dataset.photoDelete));}
    catch(e){msg(e.message||'Fotoğraf işlemi başarısız.',true);b.disabled=false}
  },true);
  document.addEventListener('change',async ev=>{
    const input=ev.target.closest?.('#a359PhotoInput');if(!input)return;
    const id=window.__A358_CURRENT_LISTING_ID__;
    if(!id)return;
    try{await addFiles(id,[...input.files])}catch(e){msg(e.message||'Fotoğraf yüklenemedi.',true)}finally{input.value=''}
  },true);
})();
