/* A6.2 — Marketplace natural-language search
 * Client-side, read-only. Reuses the existing A3.4.1 search control.
 * No schema changes, no writes, no Hallet changes.
 */
(()=>{
 if(window.__A6_AI_SEARCH__)return;window.__A6_AI_SEARCH__=1;
 const app=()=>document.getElementById('app');
 const norm=v=>String(v??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 const clean=q=>String(q||'').trim().replace(/\s+/g,' ');
 const stop=new Set(['ve','ile','olan','olanlar','icin','için','bir','biraz','cok','çok','civarinda','civarında','yaklasik','yaklaşık','kadar','arasi','arası','arasinda','arasında','olsun','istiyorum','arıyorum','ariyorum','bak','bul','bana','lutfen','lütfen','satilik','satılık','ilan','ilanlar','tl','try','tly']);
 const units={milyon:1000000,milyar:1000000000,bin:1000};
 const isBrowse=()=>{const a=app();if(!a)return false;const t=String(a.textContent||'');return /İlanlara bak|Gayrimenkul ilanları|Otomobil ilanları/.test(t)&&!!a.querySelector('input');};
 function numberValue(s){const x=String(s).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(x);return Number.isFinite(n)?n:null}
 function parse(q){
  q=clean(q);const n=norm(q);const tokens=[];const intents=[];
  const add=(v,label)=>{if(v==null||v==='')return;const s=String(v);if(!tokens.includes(s))tokens.push(s);if(label&&!intents.includes(label))intents.push(label)};
  // Price: 5 milyon, 4.5m, 500 bin; ranges are represented as readable endpoints.
  n.replace(/(\d+(?:[\.,]\d+)?)\s*(milyar|milyon|bin|m)\b/g,(m,num,u)=>{const base=numberValue(num);const mult=units[u]||1000000;if(base!=null){add(Math.round(base*mult),'fiyat');}return m});
  n.replace(/\b(\d{5,9})\s*(?:tl|try)?\b/g,(m,num)=>{add(num,'fiyat');return m});
  // Room patterns: 3+1 / 3 1 / 2+1.
  n.replace(/\b(\d+)\s*\+\s*(\d+)\b/g,(m,a,b)=>{add(a+'+'+b,'oda');return m});
  // Area: 120 m2 / 120 metrekare.
  n.replace(/\b(\d+(?:[\.,]\d+)?)\s*(?:m2|m²|metrekare)\b/g,(m,num)=>{const v=numberValue(num);if(v!=null)add(Math.round(v)+' m2','metrekare');return m});
  // Vehicle mileage/year/power/engine size.
  n.replace(/\b(\d+(?:[\.,]\d+)?)\s*(?:bin)?\s*km\b/g,(m,num)=>{const v=numberValue(num);if(v!=null)add(Math.round(v* (String(m).includes('bin')?1000:1))+' km','km');return m});
  n.replace(/\b(19\d{2}|20\d{2})\b/g,(m)=>{add(m,'yil');return m});
  n.replace(/\b(\d+)\s*(?:hp|beygir)\b/g,(m,num)=>{add(num+' hp','guc');return m});
  n.replace(/\b(\d+)\s*(?:cc)\b/g,(m,num)=>{add(num+' cc','motor');return m});
  // Common vehicle terms and seller/category vocabulary are kept as search tokens.
  const words=n.split(/[^a-z0-9çğıöşü+]+/).filter(Boolean);
  words.forEach(x=>{if(x.length>=2&&!stop.has(x)&&!/^\d+$/.test(x)&&!tokens.some(t=>t===x||t.includes(x)))add(x)});
  return {q,tokens:[...new Set(tokens)].slice(0,16),intents};
 }
 function findSearch(){const a=app();if(!a)return null;const inputs=[...a.querySelectorAll('input')];return inputs.find(x=>/ara|arama|search/i.test(String(x.placeholder||'')+' '+String(x.getAttribute('aria-label')||'')))||inputs.find(x=>x.type==='search')||inputs[0]||null;}
 function runSearch(q){const s=findSearch();if(!s)return false;const r=parse(q);const text=r.tokens.length?r.tokens.join(' '):r.q;s.value=text;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));const btn=[...app().querySelectorAll('button')].find(b=>/^ara$/i.test(String(b.textContent||'').trim()));if(btn)btn.click();else s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));return r;}
 function inject(){
  if(!isBrowse())return;if(app().querySelector('[data-a6-search]'))return;
  const host=app(),box=document.createElement('section');box.className='card';box.dataset.a6Search='1';box.style.cssText='margin:10px 0;padding:12px 13px;border-radius:15px';
  box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="font-weight:900;font-size:14px">✨ Akıllı arama</div><span data-a6-count class="small muted"></span></div><div class="small muted" style="margin-top:3px">Doğal cümleyle ara; fiyat, oda, m², yıl, km ve konumu anlayabilir.</div><div style="display:flex;gap:8px;margin-top:9px"><input data-a6-input type="search" placeholder="Örn. Karabağlar 3+1 5 milyon civarı" autocomplete="off" style="flex:1"><button type="button" data-a6-go style="min-width:70px">Ara</button></div><div data-a6-hint class="small muted" style="margin-top:6px;display:none"></div>';
  const input=box.querySelector('[data-a6-input]'),go=box.querySelector('[data-a6-go]'),hint=box.querySelector('[data-a6-hint]'),count=box.querySelector('[data-a6-count]');
  const submit=()=>{const q=clean(input.value);if(!q)return;const r=runSearch(q);if(!r)return;hint.textContent=r.intents.length?'Anlaşılan: '+r.intents.join(' · '):'Arama metni kullanılıyor';hint.style.display='block';count.textContent=r.tokens.length+' kriter';};
  go.onclick=submit;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});host.insertBefore(box,host.firstElementChild);
 }
 window.__A6_INTERPRET_QUERY__=parse;
 const ob=new MutationObserver(inject);ob.observe(document.body,{childList:true,subtree:true});setTimeout(inject,100);setTimeout(inject,500);setTimeout(inject,1200);
})();