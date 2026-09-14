/* A3.5.19 — Marketplace compact action integration
 * Test branch only. Hallet untouched.
 */
(()=>{
  if(window.__A3519_GLOBAL__)return; window.__A3519_GLOBAL__=1;
  const app=()=>document.getElementById('app');
  const isM=()=>{const a=app();if(!a)return false;return /Marketplace|Gayrimenkul|Otomobil|İlan detayı|İlanlarım|Favorilerim|Mesajlarım/.test(String(a.textContent||''));};
  function css(){if(document.getElementById('a3519-style'))return;const s=document.createElement('style');s.id='a3519-style';s.textContent=`
    .a3518Quick{display:none!important}.a3518HiddenSource{display:none!important}
    .a3519Floating{display:flex;align-items:center;justify-content:center;gap:8px;position:absolute;right:12px;top:12px;z-index:20}
    .a3519Icon{width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(15,24,22,.62)!important;color:#fff!important;box-shadow:0 5px 18px rgba(0,0,0,.24);backdrop-filter:blur(6px);font-size:23px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important}
    .a3519Icon.on{color:#e3263f!important;background:rgba(255,255,255,.92)!important}.a3519Icon:active{transform:scale(.94)}
    .a3519Msg{margin-top:10px!important;min-height:44px!important;border-radius:11px!important;font-weight:900!important;width:100%!important}
  `;document.head.appendChild(s)}
  function source(text){return [...document.querySelectorAll('.a3514Tool')].find(b=>String(b.textContent||'').includes(text));}
  function hideLegacy(){document.querySelectorAll('.a3518Quick').forEach(x=>x.remove());document.querySelectorAll('.a3514Tool').forEach(b=>{const t=String(b.textContent||'');if(/^(Favorilerim|Mesajlarım|İlanlarım)$/.test(t.trim()))b.classList.add('a3518HiddenSource');if(/Kayıtlı aramalar|Bildirimler/.test(t))b.remove()});document.querySelectorAll('.a3514Section').forEach(s=>{if(!s.querySelector('.a3514Tool'))s.remove()})}
  function detailIcons(){const a=app();if(!a||!isM())return;const detail=a.querySelector('.a359DetailPage');if(!detail||detail.querySelector('[data-a3519-icons]'))return;const fav=source('Favorilerim'),msg=source('Mesajlarım');if(!fav&&!msg)return;const hero=detail.querySelector('.a3511Carousel,.a359HeroCover');if(!hero)return;hero.style.position='relative';const box=document.createElement('div');box.className='a3519Floating';box.dataset.a3519Icons='1';
    if(fav){const b=document.createElement('button');b.type='button';b.className='a3519Icon';b.textContent='♡';b.title='Favorilerim';b.setAttribute('aria-label','Favorilerim');b.onclick=()=>fav.click();box.appendChild(b)}
    if(msg){const b=document.createElement('button');b.type='button';b.className='a3519Icon';b.textContent='⋯';b.title='Mesajlarım';b.setAttribute('aria-label','Mesajlarım');b.onclick=()=>msg.click();box.appendChild(b)}
    hero.appendChild(box);
  }
  function sellerMsg(){const a=app();if(!a||!isM())return;const seller=a.querySelector('.a35SellerCard');if(!seller||seller.querySelector('[data-a3519-msg]'))return;const src=[...document.querySelectorAll('.a3514Social button')].find(b=>/Mesaj gönder/.test(String(b.textContent||'')));if(!src)return;const b=src.cloneNode(true);b.dataset.a3519Msg='1';b.className='a3519Msg';b.textContent='💬 Mesaj gönder';b.onclick=()=>src.click();seller.appendChild(b)}
  function run(){css();hideLegacy();detailIcons();sellerMsg()}
  const ob=new MutationObserver(run);ob.observe(document.body,{childList:true,subtree:true});setTimeout(run,80);setTimeout(run,400);setTimeout(run,1000);
})();