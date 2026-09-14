/* A3.5.10 — owner photo actions fix for My Listing detail
 * Test branch only. Delegated handlers for photo delete, cover and upload.
 */
(()=>{
  if(window.__A3510_PHOTO_FIX__)return;
  window.__A3510_PHOTO_FIX__=1;
  const U='https://zvffspbowdzvrrzefhkr.supabase.co',K='sb_publishable_L_qb9Q4fHktE51PEqEhTAg_O4R0eDiW';
  const S=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}};
  const T=()=>S()?.access_token||S()?.accessToken||null;
  const I=()=>S()?.user?.id||S()?.user_id||null;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));
  const api=async(method,path,body)=>{const t=T();if(!t)throw Error('Oturum bulunamadı.');const h={apikey:K,Authorization:'Bearer '+t,Accept:'application/json','Content-Type':'application/json',Prefer:'return=representation'};const r=await fetch(U+'/rest/v1/'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}),x=await r.text();let d;try{d=x?JSON.parse(x):null}catch(_){d=x}if(!r.ok)throw Error(d?.message||'HTTP '+r.status);return d};
  const storage=async(method,path,body)=>{const t=T();if(!t)throw Error('Oturum bulunamadı.');const h={apikey:K,Authorization:'Bearer '+t};const r=await fetch(U+'/storage/v1/'+path,{method,headers:h,body});const x=await r.text();if(!r.ok){let d;try{d=JSON.parse(x)}catch(_){}throw Error(d?.message||'Storage HTTP '+r.status)}return x};
  let currentId=null;
  const getListing=async id=>{const me=I();if(!me||!id)return null;const r=await api('GET','listings?select=id,owner_id,metadata&id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(me)+'&limit=1');return r?.[0]||null};
  const patchPhotos=async(l,photos)=>{const r=await api('PATCH','listings?id=eq.'+encodeURIComponent(l.id)+'&owner_id=eq.'+encodeURIComponent(I()),{metadata:{...(l.metadata||{}),photos}});if(!Array.isArray(r)||!r.length)throw Error('Fotoğraf bilgisi güncellenemedi.');return r[0]};
  const msg=t=>{const x=document.getElementById('a359PhotoMsg');if(x)x.innerHTML=t};
  const rerender=async id=>{const l=await getListing(id);if(window.__A358_SHOW_MY_LISTING_DETAIL__)await window.__A358_SHOW_MY_LISTING_DETAIL__(id);return l};
  async function del(i){const id=currentId,l=await getListing(id),ps=[...(l?.metadata?.photos||[])],p=ps[i];if(!l||!p)return;if(!confirm('Bu fotoğraf kalıcı olarak silinsin mi?'))return;try{await storage('DELETE','object/listing-photos/'+String(p.path).split('/').map(encodeURIComponent).join('/'));ps.splice(i,1);await patchPhotos(l,ps);await rerender(id);msg('<div class="success">✓ Fotoğraf silindi.</div>')}catch(e){msg('<div class="error">'+E(e.message||'Fotoğraf silinemedi.')+'</div>')}}
  async function cover(i){const id=currentId,l=await getListing(id),ps=[...(l?.metadata?.photos||[])];if(!l||!ps[i]||i===0)return;const p=ps.splice(i,1)[0];ps.unshift(p);try{await patchPhotos(l,ps);await rerender(id);msg('<div class="success">✓ Kapak fotoğrafı değiştirildi.</div>')}catch(e){msg('<div class="error">'+E(e.message||'Kapak değiştirilemedi.')+'</div>')}}
  async function upload(fs){const id=currentId,l=await getListing(id);if(!l)return;const ps=[...(l.metadata?.photos||[])];const box=document.getElementById('a359PhotoMsg');try{if(ps.length+fs.length>10)throw Error('Bir ilanda en fazla 10 fotoğraf olabilir.');for(const f of fs){if(f.size>5242880)throw Error(f.name+' 5 MB sınırını aşıyor.');const name=f.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=I()+'/'+id+'/'+Date.now()+'-'+name;await storage('POST','object/listing-photos/'+path,f);ps.push({path,name:f.name,size:f.size,type:f.type})}await patchPhotos(l,ps);await rerender(id);msg('<div class="success">✓ Fotoğraf eklendi.</div>')}catch(e){if(box)box.innerHTML='<div class="error">'+E(e.message||'Fotoğraf yüklenemedi.')+'</div>'}}
  function wrap(){const f=window.__A358_SHOW_MY_LISTING_DETAIL__;if(typeof f!=='function'||f.__a3510)return false;const w=async function(id){currentId=id;return await f.apply(this,arguments)};w.__a3510=true;window.__A358_SHOW_MY_LISTING_DETAIL__=w;return true}
  document.addEventListener('click',e=>{const d=e.target.closest('[data-photo-delete]'),c=e.target.closest('[data-photo-cover]');if(d){e.preventDefault();e.stopPropagation();del(Number(d.dataset.photoDelete));return}if(c&&!c.disabled){e.preventDefault();e.stopPropagation();cover(Number(c.dataset.photoCover));return}} ,true);
  document.addEventListener('change',e=>{if(e.target?.id==='a359PhotoInput'){upload([...e.target.files]);e.target.value=''}},true);
  const timer=setInterval(()=>{if(wrap())clearInterval(timer)},100);
  setTimeout(()=>clearInterval(timer),15000);
})();
