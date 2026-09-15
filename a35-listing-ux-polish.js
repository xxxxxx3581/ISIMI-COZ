/* A3.5.13 — stable listing detail spacing
 * Visual-only. Keep existing detail structure; compact mobile spacing.
 */
(()=>{
 if(window.__A3513_UX_POLISH__)return;window.__A3513_UX_POLISH__=1;
 const style=()=>{if(document.getElementById('a3513-style'))return;const s=document.createElement('style');s.id='a3513-style';s.textContent=`
.a359DetailPage{max-width:820px!important}
.a359Hero{padding:0!important;margin:0!important}
.a359HeroInfo{padding-top:0!important;margin-top:0!important}
.a359Section{position:relative;padding:13px!important;margin-top:8px!important;border-radius:16px!important}
.a359Section>h3{font-size:17px!important;margin:0 0 8px!important}
.a359Grid{gap:0 14px!important}
.a359Field{padding:8px 0!important}
.a359DetailActions{position:static!important;padding:0!important;margin:8px 0 0!important;border:0!important;border-radius:0!important;background:transparent!important;backdrop-filter:none!important}
.a359DetailActions button{min-height:42px!important;font-weight:800}
.a3513Lead{font-size:12px;opacity:.72;margin:0 0 7px}
.a3513Badge{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;margin-top:6px}
.a3511Dots{margin:4px 0 3px!important}
@media(max-width:600px){.a359Section{padding:12px!important;margin-top:7px!important}.a359HeroCover,.a3511Carousel{border-radius:16px!important}.a3511Slide{aspect-ratio:4/3}.a359HeroTitle{font-size:22px;margin-top:8px}.a359HeroPrice{margin-top:4px!important}.a359DetailActions{margin-top:7px!important}.a359DetailActions button{flex:1}}
`;document.head.appendChild(s)};
 function polish(){const page=document.querySelector('.a359DetailPage');if(!page)return;style();page.classList.add('a3513Detail');const sections=[...page.querySelectorAll('.a359Section')];sections.forEach(sec=>{const h=sec.querySelector('h3');if(!h||h.dataset.a3513)return;h.dataset.a3513='1';const t=(h.textContent||'').trim();const icon=t.includes('Gayrimenkul')?'🏠':t.includes('Araç')?'🚗':t.includes('Açıklama')?'📝':t.includes('Fotoğraf')?'📸':t.includes('İlan yönetimi')?'⚙️':'•';h.insertAdjacentText('afterbegin',icon+' ');if(t==='Gayrimenkul bilgileri'||t==='Araç bilgileri'){const lead=document.createElement('div');lead.className='a3513Lead';lead.textContent='İlanın öne çıkan özellikleri';h.insertAdjacentElement('afterend',lead)}});const hero=page.querySelector('.a359HeroInfo');if(hero&&!hero.querySelector('.a3513Badge')){const type=page.textContent.includes('Otomobil')?'Otomobil':'Gayrimenkul';const b=document.createElement('div');b.className='a3513Badge';b.textContent=type==='Otomobil'?'🚗 Araç ilanı':'🏠 Gayrimenkul ilanı';hero.appendChild(b)}}
 const ob=new MutationObserver(polish);const start=()=>{ob.observe(document.body,{childList:true,subtree:true});polish()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();setTimeout(polish,100);setTimeout(polish,500);
})();
