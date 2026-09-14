/* A3.5.20 — Tiny home Marketplace access icons
 * Test branch only. Main home visual kept intact. Hallet untouched.
 */
(()=>{
  if(window.__A3520_HOME__)return;window.__A3520_HOME__=1;
  const app=()=>document.getElementById('app');
  const text=()=>String(app()?.textContent||'');
  const isHome=()=>{const t=text();return /İşini Hallet Menüsü/.test(t)&&!(/Marketplace 2\.0|Marketplace|Gayrimenkul|Otomobil|İlan detayı|İlanlarım|Favorilerim|Mesajlarım/.test(t));};
  function css(){if(document.getElementById('a3520-style'))return;const s=document.createElement('style');s.id='a3520-style';s.textContent=`
    .a3518Quick,.a3519Floating{display:none!important}
    .a3520HomeIcons{position:absolute;top:10px;right:10px;z-index:50;display:flex;align-items:center;gap:7px}
    .a3520HomeIcon{width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:50%!important;color:rgba(255,255,255,.92)!important;font-size:21px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important}
    .a3520HomeIcon:active{transform:scale(.88)}
    .a3520MsgIcon{font-size:17px!important;width:30px!important;height:30px!important;border:1.5px solid currentColor!important;position:relative}
    .a3520MsgIcon::after{content:'';position:absolute;right:3px;bottom:2px;width:5px;height:5px;border-left:1.5px solid currentColor;transform:skew(-25deg)}
    .a3520MsgDots{font-size:12px!important;letter-spacing:1px;transform:translateY(-1px)}
    @media(max-width:520px){.a3520HomeIcons{top:8px;right:8px;gap:5px}.a3520HomeIcon{width:28px!important;height:28px!important;min-width:28px!important;font-size:20px!important}.a3520MsgIcon{width:28px!important;height:28px!important}}
  `;document.head.appendChild(s)}
  function homeIcons(){const a=app();if(!a||!isHome())return;if(a.querySelector('[data-a3520-home-icons]'))return;
    const box=document.createElement('div');box.className='a3520HomeIcons';box.dataset.a3520HomeIcons='1';
    const fav=document.createElement('button');fav.type='button';fav.className='a3520HomeIcon';fav.textContent='♡';fav.title='Favorilerim';fav.setAttribute('aria-label','Favorilerim');
    const msg=document.createElement('button');msg.type='button';msg.className='a3520HomeIcon a3520MsgIcon';msg.innerHTML='<span class="a3520MsgDots">•••</span>';msg.title='Mesajlarım';msg.setAttribute('aria-label','Mesajlarım');
    const open=(label)=>{if(typeof window.showListingsHub==='function')window.showListingsHub();setTimeout(()=>{const b=[...document.querySelectorAll('.a3514Tool')].find(x=>String(x.textContent||'').includes(label));if(b)b.click()},350)};
    fav.onclick=()=>open('Favorilerim');msg.onclick=()=>open('Mesajlarım');box.append(fav,msg);a.appendChild(box);
  }
  function run(){css();document.querySelectorAll('.a3520HomeIcons').forEach(x=>{if(!isHome())x.remove()});homeIcons()}
  const ob=new MutationObserver(run);ob.observe(document.body,{childList:true,subtree:true});setTimeout(run,100);setTimeout(run,500);setTimeout(run,1200);
})();