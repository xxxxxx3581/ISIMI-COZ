/* A3.5.15 — compact Marketplace controls + in-app navigation
 * Test branch only. Hallet flow is not rewritten.
 */
(()=>{
  if(window.__A3515_NAV__)return; window.__A3515_NAV__=1;
  const root=()=>document.getElementById('app');
  const isMarketplace=()=>{const a=root();if(!a)return false;const t=String(a.textContent||'');return /Marketplace|İlan detayı|Gayrimenkul|Otomobil|Favorilerim|Kayıtlı aramalar|Mesajlarım|İlanlarım/.test(t)};
  const css=()=>{if(document.getElementById('a3515-style'))return;const s=document.createElement('style');s.id='a3515-style';s.textContent=`
    .a3514Section{padding:12px 14px!important;margin:10px 0!important;border-radius:14px!important}
    .a3514Section h3{font-size:15px!important;margin-bottom:3px!important}
    .a3514Section>.small{font-size:12px!important}
    .a3514Tools{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin:9px 0 0!important}
    .a3514Tool{flex:1 1 145px!important;min-width:0!important;min-height:38px!important;height:40px!important;padding:7px 10px!important;border-radius:10px!important;font-size:13px!important;line-height:1.1!important}
    .a3514Social{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin:10px 0!important}
    .a3514Social button{min-height:38px!important;height:40px!important;padding:7px 11px!important;border-radius:10px!important;font-size:13px!important}
    .a3515Back{display:flex;align-items:center;gap:7px;margin:0 0 10px!important}
    .a3515Back button{min-height:38px;height:38px;padding:6px 11px;border-radius:10px;font-weight:800}
    .a3515Back .muted{font-size:12px}
    @media(max-width:520px){.a3514Tools{display:grid!important;grid-template-columns:1fr 1fr!important}.a3514Tool{flex:none!important;width:100%!important}.a3514Social{display:grid!important;grid-template-columns:1fr 1fr!important}.a3514Social button{width:100%!important}}
  `;document.head.appendChild(s)};
  const marketplaceFns=['showListingsHub','showListingsCategory','showGayrimenkulHub','showGayrimenkulBrowse','showGayrimenkulCreateForm','showGayrimenkulDetail','showOtomobilHub','showOtomobilBrowse','showOtomobilDetail','showMyListings','showRequest','showRequests','showProviderEntry','showProviderPanel'];
  const stack=[];let replay=false,boot=true;
  function wrap(name){const f=window[name];if(typeof f!=='function'||f.__a3515)return;const w=function(){if(!replay&&!boot){stack.push({name,args:[...arguments]});history.pushState({a3515:true},'',location.href)}const out=f.apply(this,arguments);boot=false;return out};w.__a3515=true;window[name]=w}
  function installWraps(){marketplaceFns.forEach(wrap);}
  function back(){if(stack.length){replay=true;stack.pop();const prev=stack[stack.length-1];if(prev&&typeof window[prev.name]==='function')window[prev.name].apply(window,prev.args);else if(typeof window.showListingsHub==='function')window.showListingsHub();replay=false;return}if(typeof window.showListingsHub==='function'&&isMarketplace()){window.showListingsHub();return}if(history.length>1)history.back();}
  function addBack(){const a=root();if(!a||!isMarketplace())return;const first=a.firstElementChild;if(!first)return;if(first.classList?.contains('a3515Back'))return;const bar=document.createElement('div');bar.className='a3515Back';bar.innerHTML='<button type="button">← Geri</button><span class="muted">Marketplace</span>';bar.querySelector('button').onclick=back;a.insertBefore(bar,first)}
  function compact(){document.querySelectorAll('.a3514Section').forEach(x=>{x.style.boxShadow='none'});const c=document.querySelector('[data-a3514-center]');if(c)c.style.display=isMarketplace()?'block':'none'}
  function observe(){const ob=new MutationObserver(()=>{css();installWraps();compact();addBack()});ob.observe(document.body,{childList:true,subtree:true});css();setTimeout(()=>{installWraps();compact();addBack()},60)}
  window.addEventListener('popstate',()=>{if(!replay){if(stack.length){replay=true;stack.pop();const p=stack[stack.length-1];if(p&&typeof window[p.name]==='function')window[p.name].apply(window,p.args);else if(typeof window.showListingsHub==='function')window.showListingsHub();replay=false}else if(isMarketplace()&&typeof window.showListingsHub==='function'){window.showListingsHub()}}});
  boot=false;observe();
})();
