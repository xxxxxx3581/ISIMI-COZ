/* A3.5.18 — Marketplace global UX polish
 * Test branch only. Hallet untouched.
 */
(()=>{
  if(window.__A3518_GLOBAL__)return; window.__A3518_GLOBAL__=1;
  const app=()=>document.getElementById('app');
  const isM=()=>{const a=app();if(!a)return false;return /Marketplace|Gayrimenkul|Otomobil|İlan detayı|İlanlarım|Favorilerim|Mesajlarım/.test(String(a.textContent||''));};
  function css(){if(document.getElementById('a3518-style'))return;const s=document.createElement('style');s.id='a3518-style';s.textContent=`
    .a3518Quick{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px!important;padding:8px!important;border:1px solid rgba(127,157,190,.16);border-radius:14px;background:rgba(127,157,190,.045)}
    .a3518Quick button{flex:1 1 145px;min-height:40px;border-radius:10px!important;font-weight:800;font-size:13px!important}
    .a3518Quick .iconOnly{flex:0 0 42px;min-width:42px;padding:0;font-size:22px!important}
    .a3518Quick .on{color:#e3263f!important}
    .a3518Title{font-weight:900;font-size:12px;opacity:.7;padding:2px 3px;display:flex;align-items:center}
    .a3518HiddenSource{display:none!important}
    .a3518Exit{display:none}
    @media(max-width:520px){.a3518Quick{display:grid;grid-template-columns:1fr 1fr}.a3518Quick button{width:100%;flex:none}.a3518Quick .iconOnly{grid-column:auto}}
  `;document.head.appendChild(s)}
  function source(text){return [...document.querySelectorAll('.a3514Tool')].find(b=>String(b.textContent||'').includes(text));}
  function quick(){const a=app();if(!a||!isM())return;if(a.querySelector('[data-a3518-quick]'))return;const fav=source('Favorilerim'),msg=source('Mesajlarım'),mine=source('İlanlarım');if(!fav&&!msg&&!mine)return;[fav,msg,mine].filter(Boolean).forEach(x=>x.classList.add('a3518HiddenSource'));const q=document.createElement('div');q.className='a3518Quick';q.dataset.a3518Quick='1';const title=document.createElement('div');title.className='a3518Title';title.textContent='Hızlı erişim';q.appendChild(title);if(fav){const b=document.createElement('button');b.type='button';b.className='iconOnly';b.textContent='♡';b.title='Favorilerim';b.setAttribute('aria-label','Favorilerim');b.onclick=()=>fav.click();q.appendChild(b)}if(msg){const b=document.createElement('button');b.type='button';b.textContent='💬 Mesajlarım';b.onclick=()=>msg.click();q.appendChild(b)}if(mine){const b=document.createElement('button');b.type='button';b.textContent='📋 İlanlarım';b.onclick=()=>mine.click();q.appendChild(b)}const first=a.firstElementChild;a.insertBefore(q,first)}
  function detailMessage(){const a=app();if(!a||!isM())return;const seller=a.querySelector('.a35SellerCard');if(!seller)return;if(seller.querySelector('[data-a3518-msg-access]'))return;const source=[...document.querySelectorAll('.a3514Social button')].find(b=>String(b.textContent||'').includes('Mesaj gönder'));if(!source)return;const b=document.createElement('button');b.type='button';b.dataset.a3518MsgAccess='1';b.textContent='💬 Mesaj gönder';b.style.cssText='width:100%;margin-top:10px;min-height:44px;border-radius:11px;font-weight:900';b.onclick=()=>source.click();seller.appendChild(b)}
  function back(){const a=app();if(!a||!isM())return;const first=a.firstElementChild;if(!first)return;let target='showListingsHub';const t=String(a.textContent||'');if(/Favorilerim|Mesajlarım|İlanlarım/.test(t))target='showListingsCategory';if(/İlan detayı/.test(t)){if(/Otomobil/.test(t))target='showOtomobilBrowse';else if(/Gayrimenkul/.test(t))target='showGayrimenkulBrowse'}if(typeof window[target]==='function'){try{if(target==='showListingsCategory')window[target]('gayrimenkul');else window[target]();return}catch(_){}}if(typeof window.showListingsHub==='function')window.showListingsHub()}
  let armed=false;
  function armBack(){if(armed)return;armed=true;history.pushState({a3518:true},'',location.href);window.addEventListener('popstate',()=>{if(!isM())return;armed=false;back();setTimeout(()=>armBack(),50)},{capture:true})}
  function run(){css();quick();detailMessage();if(isM())armBack()}
  const ob=new MutationObserver(run);ob.observe(document.body,{childList:true,subtree:true});setTimeout(run,80);setTimeout(run,400);setTimeout(run,1000);
})();
