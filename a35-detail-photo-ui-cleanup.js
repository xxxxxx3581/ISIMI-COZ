/* A3.5.10 — detail photo UI cleanup
 * Listing detail remains read-only for photos. Photo management stays in Düzenle,
 * where the authenticated photo controls already work.
 */
(()=>{
  if(window.__A3510_DETAIL_PHOTO_CLEANUP__) return;
  window.__A3510_DETAIL_PHOTO_CLEANUP__=1;
  function clean(){
    document.querySelectorAll('[data-photo-cover],[data-photo-delete],#a359PhotoInput,.a359PhotoAdd').forEach(el=>{
      const wrap=el.closest('.a359PhotoBar')||el.closest('label');
      (wrap||el).remove();
    });
    document.querySelectorAll('.a359PhotoBar').forEach(bar=>{
      if(!bar.textContent.trim()) bar.remove();
    });
  }
  const ob=new MutationObserver(clean);
  ob.observe(document.body,{childList:true,subtree:true});
  setTimeout(clean,50);
  setTimeout(clean,300);
  setTimeout(clean,1000);
})();
