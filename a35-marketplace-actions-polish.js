/* A3.5.16 — Favorites + messaging UX integration
 * Test branch only. Removes unused saved-search/notification shortcuts.
 */
(()=>{
  if(window.__A3516_POLISH__)return; window.__A3516_POLISH__=1;
  function css(){if(document.getElementById('a3516-style'))return;const s=document.createElement('style');s.id='a3516-style';s.textContent=`
    .a3516Fav{position:absolute;right:12px;bottom:12px;width:46px;height:46px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#222;box-shadow:0 5px 18px rgba(0,0,0,.28);z-index:8;font-size:27px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}
    .a3516Fav.isOn{color:#e3263f;background:#fff}
    .a3516Msg{width:100%;margin-top:10px;min-height:42px;border-radius:11px;font-weight:800}
    .a3516SocialMsg{display:none!important}
    @media(max-width:600px){.a3516Fav{width:44px;height:44px;font-size:25px;right:10px;bottom:10px}}
  `;document.head.appendChild(s)}
  function removeUnused(){document.querySelectorAll('.a3514Tool').forEach(b=>{const t=String(b.textContent||'').trim();if(t.includes('Kayıtlı aramalar')||t.includes('Bildirimler'))b.remove()});document.querySelectorAll('.a3514Tools').forEach(g=>{if(!g.querySelector('.a3514Tool'))g.remove()})}
  function syncHeart(heart,src){const on=String(src.textContent||'').includes('Favorilerde');heart.textContent=on?'♥':'♡';heart.classList.toggle('isOn',on);heart.setAttribute('aria-label',on?'Favorilerden çıkar':'Favoriye ekle')}
  function integrate(){css();removeUnused();const page=document.querySelector('.a359DetailPage');if(!page)return;const social=page.querySelector('[data-a3514-social]');const hero=page.querySelector('.a3511Carousel,.a359HeroCover');if(!social||!hero)return;const fav=[...social.querySelectorAll('button')].find(b=>String(b.textContent||'').includes('Favori'));const msg=[...social.querySelectorAll('button')].find(b=>String(b.textContent||'').includes('Mesaj'));if(fav&&hero&&!hero.querySelector('.a3516Fav')){const h=document.createElement('button');h.type='button';h.className='a3516Fav';h.onclick=()=>{fav.click();setTimeout(()=>syncHeart(h,fav),80)};hero.style.position='relative';hero.appendChild(h);syncHeart(h,fav)}else if(fav&&hero.querySelector('.a3516Fav'))syncHeart(hero.querySelector('.a3516Fav'),fav);
    if(msg){msg.classList.add('a3516SocialMsg');const seller=document.querySelector('.a35SellerCard');if(seller&&!seller.querySelector('.a3516Msg')){const m=msg.cloneNode(true);m.className='a3516Msg';m.textContent='💬 Mesaj gönder';m.onclick=()=>msg.click();seller.appendChild(m)}}
  }
  const ob=new MutationObserver(()=>integrate());ob.observe(document.body,{childList:true,subtree:true});setTimeout(integrate,80);setTimeout(integrate,400);setTimeout(integrate,1000);
})();
