/* A5.1 compact trust UI — test branch */
(()=>{
  if(window.__A5_COMPACT_TRUST__)return;window.__A5_COMPACT_TRUST__=1;
  function clean(){
    const all=[...document.querySelectorAll('.a5Trust')];
    if(!all.length)return;
    all.slice(1).forEach(x=>x.remove());
    const one=all[0];
    one.classList.add('a5CompactTrust');
    one.querySelectorAll('.a5TrustSub,.a5SafeNote,.a5Verify,.a5Signals').forEach(x=>x.style.display='none');
    const title=one.querySelector('.a5TrustTitle');
    if(title){title.textContent='🛡️ Güven bilgileri';title.style.fontSize='12px';title.style.margin=0}
    one.style.margin='8px 0';one.style.padding='8px 10px';one.style.borderRadius='12px';
    const head=one.querySelector('.a5TrustHead');
    if(head){head.style.justifyContent='flex-start';head.style.minHeight='0'}
    if(!one.querySelector('[data-a5-compact-note]')){
      const n=document.createElement('span');n.dataset.a5CompactNote='1';n.className='small muted';n.textContent='Profil bilgileri';n.style.marginLeft='8px';n.style.fontSize='10px';head?.appendChild(n);
    }
  }
  const s=document.createElement('style');s.textContent='.a5CompactTrust{background:rgba(25,195,125,.035)!important}.a5CompactTrust~.a5Trust{display:none!important}';document.head.appendChild(s);
  clean();
  new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  setTimeout(clean,250);setTimeout(clean,900);setTimeout(clean,1800);
})();
