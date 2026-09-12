from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "SUPABASE_URL+'/storage/v1/object/authenticated/hallet-documents/'+safePath"
new = "SUPABASE_URL+'/storage/v1/object/hallet-documents/'+safePath"
if old not in s:
    raise SystemExit('Upload endpoint pattern not found')
s = s.replace(old, new, 1)

marker = '/* DOCUMENT-ACTIONS-REPAIR */'
start = s.find(marker)
if start < 0:
    raise SystemExit('Repair marker not found')
script_start = s.rfind('<script>', 0, start)
script_end = s.find('</script>', start)
if script_start < 0 or script_end < 0:
    raise SystemExit('Repair script boundary not found')

clean = r'''<script>
/* DOCUMENT-ACTIONS-REPAIR — clean document flow */
(function(){
  function session(){try{return getAuthSession&&getAuthSession()}catch(e){return null}}
  function files(k){try{return getDocumentFiles(k)||[]}catch(e){return []}}

  function inputFix(){
    document.querySelectorAll('#hallet-root label input[data-upload-doc]').forEach(function(i){
      const l=i.parentElement;
      if(l){l.style.position='relative';l.style.overflow='hidden'}
      i.style.display='block';i.style.position='absolute';i.style.inset='0';i.style.width='100%';i.style.height='100%';i.style.opacity='0';i.style.cursor='pointer';
    });
  }

  function viewerStyle(){
    if(document.getElementById('docRepairStyle'))return;
    const s=document.createElement('style');s.id='docRepairStyle';
    s.textContent='.docRepair{position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(0,0,0,.88)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important}.docRepairCard{width:min(96vw,900px)!important;height:min(94vh,900px)!important;background:#07111f!important;border:1px solid #35535a!important;border-radius:16px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}.docRepairHead{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:10px 12px!important;color:#fff!important;background:#10252b!important}.docRepairBody{flex:1!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:auto!important}.docRepairBody img{max-width:100%!important;max-height:100%!important;object-fit:contain!important}.docRepairBody iframe{width:100%!important;height:100%!important;border:0!important;background:#fff!important}.docRepairClose{border:1px solid #45616a!important;background:#17313a!important;color:#fff!important;border-radius:9px!important;padding:8px 12px!important;font-weight:700!important}';
    document.head.appendChild(s);
  }

  async function openClean(k,i){
    const ses=session();const f=files(k)[Number(i)||0];
    if(!ses||!ses.access_token){alert('Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yap.');return}
    if(!f||!f.path){alert('Belgenin dosya yolu bulunamadı.');return}
    viewerStyle();
    const old=document.getElementById('docRepair');if(old)old.remove();
    const o=document.createElement('div');o.id='docRepair';o.className='docRepair';
    const c=document.createElement('div');c.className='docRepairCard';
    const h=document.createElement('div');h.className='docRepairHead';
    const t=document.createElement('span');t.textContent=f.name||'Belge';
    const x=document.createElement('button');x.className='docRepairClose';x.type='button';x.textContent='Kapat';x.onclick=function(){o.remove()};
    h.appendChild(t);h.appendChild(x);
    const b=document.createElement('div');b.className='docRepairBody';b.textContent='Belge açılıyor…';b.style.color='#fff';
    c.appendChild(h);c.appendChild(b);o.appendChild(c);document.body.appendChild(o);
    o.onclick=function(e){if(e.target===o)o.remove()};
    try{
      const path=f.path.split('/').map(encodeURIComponent).join('/');
      const r=await fetch(SUPABASE_URL+'/storage/v1/object/authenticated/hallet-documents/'+path,{headers:{Authorization:'Bearer '+ses.access_token,apikey:SUPABASE_KEY},cache:'no-store'});
      if(!r.ok)throw new Error((await r.text())||('HTTP '+r.status));
      const blob=await r.blob();const u=URL.createObjectURL(blob);b.innerHTML='';
      if((f.type||blob.type||'').toLowerCase().includes('pdf')){const fr=document.createElement('iframe');fr.src=u;fr.title=f.name||'PDF';b.appendChild(fr)}
      else{const img=document.createElement('img');img.src=u;img.alt=f.name||'Belge';b.appendChild(img)}
      setTimeout(function(){try{URL.revokeObjectURL(u)}catch(e){}},120000);
    }catch(e){b.textContent='Belge açılamadı: '+String(e.message||e);b.style.color='#ffb6b8';b.style.padding='20px'}
  }
  window.openDocument=openClean;

  async function deleteClean(k,i){
    const ses=session();const n=Number(i)||0;const f=files(k)[n];
    if(!ses||!ses.access_token||!f||!f.path)return alert('Belge silinemedi: oturum veya dosya bulunamadı.');
    if(!confirm('Bu belgeyi silmek istediğine emin misin?'))return;
    try{
      const path=f.path.split('/').map(encodeURIComponent).join('/');
      let r=await fetch(SUPABASE_URL+'/storage/v1/object/hallet-documents/'+path,{method:'DELETE',headers:{Authorization:'Bearer '+ses.access_token,apikey:SUPABASE_KEY}});
      if(!r.ok)throw new Error((await r.text())||('Storage HTTP '+r.status));
      r=await fetch(SUPABASE_URL+'/rest/v1/hallet_documents?case_id=eq.'+encodeURIComponent(H.dbId)+'&doc_key=eq.'+encodeURIComponent(k)+'&storage_path=eq.'+encodeURIComponent(f.path),{method:'DELETE',headers:{Authorization:'Bearer '+ses.access_token,apikey:SUPABASE_KEY,Prefer:'return=minimal'}});
      if(!r.ok)throw new Error((await r.text())||('DB HTTP '+r.status));
      const a=files(k).slice();a.splice(n,1);H.documentFiles[k]=a;H.documents[k]=a.length>0;
      if(typeof result==='function')result(false);else if(typeof propResult==='function')propResult(!!H.dbId);
    }catch(e){alert('Belge silinemedi.\n\n'+String(e.message||e))}
  }
  window.deleteDocument=deleteClean;

  function buttons(){
    document.querySelectorAll('#hallet-root button[data-a="openDoc"]').forEach(function(btn){
      if(btn.nextElementSibling&&btn.nextElementSibling.dataset.docDelete==='1')return;
      const b=document.createElement('button');b.type='button';b.className=btn.className||'topb';b.textContent='Sil';b.dataset.docDelete='1';b.dataset.k=btn.dataset.k||'';b.dataset.i=btn.dataset.i||'0';btn.parentNode.insertBefore(b,btn.nextSibling);
    });
  }
  document.addEventListener('click',function(e){
    const o=e.target&&e.target.closest&&e.target.closest('#hallet-root button[data-a="openDoc"]');
    if(o){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openClean(o.dataset.k||'',Number(o.dataset.i||0));return}
    const d=e.target&&e.target.closest&&e.target.closest('#hallet-root [data-doc-delete="1"]');
    if(d){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();deleteClean(d.dataset.k||'',Number(d.dataset.i||0));return}
  },true);
  inputFix();buttons();new MutationObserver(function(){inputFix();buttons()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''

s = s[:script_start] + clean + s[script_end + len('</script>'):]
p.write_text(s, encoding='utf-8')

for x in [new, 'DOCUMENT-ACTIONS-REPAIR — clean document flow', 'window.openDocument=openClean', 'data-upload-doc']:
    if x not in s:
        raise SystemExit('Sanity check failed: '+x)
