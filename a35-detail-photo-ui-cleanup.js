/* A3.5.10 — detail photo UI cleanup */
(()=>{
 if(window.__A3510_DETAIL_PHOTO_CLEANUP__)return;window.__A3510_DETAIL_PHOTO_CLEANUP__=1;
 function clean(){document.querySelectorAll('[data-photo-cover],[data-photo-delete],#a359PhotoInput,.a359PhotoAdd').forEach(el=>{const wrap=el.closest('.a359PhotoBar')||el.closest('label');(wrap||el).remove()});document.querySelectorAll('.a359PhotoBar').forEach(bar=>{if(!bar.textContent.trim())bar.remove()})}
 const load=()=>{if(!document.querySelector('script[data-a3511-carousel]')){const s=document.createElement('script');s.src='./a35-listing-detail-carousel.js';s.dataset.a3511Carousel='1';s.defer=true;document.head.appendChild(s)}};
 const ob=new MutationObserver(()=>{clean();load()});ob.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{clean();load()},50);setTimeout(clean,300);setTimeout(clean,1000);
})();