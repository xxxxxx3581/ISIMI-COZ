/* A3.5.18 — global UX safety reset
 * Passive layer. No history manipulation and no extra Marketplace overlay.
 * A3.5.9 detail: completeness warning is intentionally hidden; editing screen is the place to complete data.
 */
(()=>{
  if(window.__A3518_GLOBAL__)return;
  window.__A3518_GLOBAL__=1;
  const s=document.createElement('style');
  s.id='a3518-global-style';
  s.textContent='.a359Missing{display:none!important}';
  document.head.appendChild(s);
})();
