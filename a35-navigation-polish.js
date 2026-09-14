/* A3.5.15 navigation safety reset
 * Deliberately passive: native app navigation remains untouched to avoid history-stack freezes.
 * Hallet untouched.
 */
(()=>{
  if(window.__A3515_NAV__)return;window.__A3515_NAV__=1;
  // Do not wrap Marketplace functions or manipulate browser history here.
})();
