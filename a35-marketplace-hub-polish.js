/* A3.5.17 — Marketplace category hub polish
 * Test branch only. Visual/navigation layer; Hallet untouched.
 */
(()=>{
  if(window.__A3517_HUB__)return; window.__A3517_HUB__=1;
  const app=()=>document.getElementById('app');
  const txt=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const isHub=()=>{
    const a=app(); if(!a)return false;
    const t=txt(a);
    if(!/Gayrimenkul|Otomobil/.test(t))return false;
    if(a.querySelector('.a359DetailPage'))return false;
    if(/İlan detayı|İlanlarım|Düzenle/.test(t))return false;
    return !![...a.querySelectorAll('button')].find(b=>/İlanlara bak|İlan ver/.test(txt(b)));
  };
  function css(){
    if(document.getElementById('a3517-style'))return;
    const s=document.createElement('style');s.id='a3517-style';
    s.textContent=`
      .a3517Hero{margin:0 0 16px;padding:20px 18px;border-radius:20px;background:linear-gradient(135deg,rgba(22,72,58,.98),rgba(32,101,80,.94));color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.14)}
      .a3517Hero h2{margin:0;font-size:24px;line-height:1.15;letter-spacing:-.02em}
      .a3517Hero p{margin:7px 0 16px;opacity:.84;font-size:13px;line-height:1.45}
      .a3517Primary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .a3517PrimaryCard{min-height:74px!important;margin:0!important;padding:14px!important;border-radius:14px!important;background:rgba(255,255,255,.98)!important;color:#13251f!important;border:1px solid rgba(255,255,255,.2)!important;box-shadow:none!important;text-align:left!important}
      .a3517PrimaryCard button{width:100%;min-height:44px;font-size:15px;font-weight:900;border-radius:11px}
      .a3517Mine{margin:0 0 16px;padding:13px 14px;border-radius:16px;border:1px solid rgba(127,157,190,.18);background:rgba(127,157,190,.045)}
      .a3517MineTitle{font-weight:900;font-size:14px;margin-bottom:8px}
      .a3517Mine .a3514Tools{margin:0!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
      .a3517Mine .a3514Tool{min-height:38px!important;height:40px!important;padding:7px 9px!important;font-size:13px!important;border-radius:10px!important}
      .a3517MyListing{margin-top:8px!important;width:100%;min-height:40px!important}
      @media(max-width:600px){.a3517Hero{padding:18px 15px}.a3517Hero h2{font-size:21px}.a3517Primary{grid-template-columns:1fr}.a3517Mine .a3514Tools{grid-template-columns:1fr 1fr!important}}
      @media(min-width:900px){.a3517Hero{padding:28px}.a3517PrimaryCard{min-height:92px!important}.a3517PrimaryCard button{font-size:16px}}
    `;
    document.head.appendChild(s);
  }
  function findButton(re){return [...app().querySelectorAll('button')].find(b=>re.test(txt(b)))}
  function cardFor(b){return b?.closest('.card,section,article')||b?.parentElement||b}
  function build(){
    if(!isHub())return;
    const a=app(); if(a.querySelector('[data-a3517-hub]'))return;
    css();
    const view=findButton(/İlanlara bak/); const create=findButton(/İlan ver/);
    if(!view||!create)return;
    const title=/Otomobil/.test(txt(a))?'Otomobil':'Gayrimenkul';
    const hero=document.createElement('section');hero.className='a3517Hero';hero.dataset.a3517Hub='1';
    hero.innerHTML=`<h2>${title}</h2><p>İlanları keşfet veya kendi ilanını hızlıca oluştur.</p><div class="a3517Primary"></div>`;
    const primary=hero.querySelector('.a3517Primary');
    [cardFor(view),cardFor(create)].forEach((card,i)=>{
      if(!card||primary.contains(card))return;
      card.classList.add('a3517PrimaryCard');
      const label=i===0?'🔎 İlanlara bak':'＋ İlan ver';
      const b=card.querySelector('button'); if(b)b.textContent=label;
      primary.appendChild(card);
    });
    const first=a.firstElementChild;
    if(first) a.insertBefore(hero,first); else a.appendChild(hero);
    const mine=a.querySelector('.a3514Section[data-a3514-center]');
    if(mine){
      const tools=mine.querySelector('.a3514Tools');
      mine.classList.add('a3517Mine');
      const h=mine.querySelector('h3');if(h)h.textContent='Benim alanım';
      const d=mine.querySelector('.small.muted');if(d)d.textContent='Favorilerim ve mesajlarım burada.';
      if(tools){
        const my=findButton(/İlanlarım/);
        if(my&&!tools.contains(my)){
          const wrap=document.createElement('div');wrap.className='a3517MyListing';wrap.appendChild(my);tools.parentElement.appendChild(wrap);
        }
      }
    }
  }
  const ob=new MutationObserver(()=>{if(isHub())build()});
  ob.observe(document.body,{childList:true,subtree:true});
  css();setTimeout(build,80);setTimeout(build,400);setTimeout(build,1000);
})();
