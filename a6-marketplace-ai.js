/* A6.4 — Marketplace smart natural-language search
 * Test branch only. Client-side, read-only. Keeps existing A3.4.1 search/filter intact.
 */
(()=>{
 if(window.__A6_AI_SEARCH__)return;window.__A6_AI_SEARCH__=1;
 const app=()=>document.getElementById('app');
 const norm=v=>String(v??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 const clean=q=>String(q||'').trim().replace(/\s+/g,' ');
 const stop=new Set(['ve','ile','olan','olanlar','icin','için','bir','biraz','cok','çok','civarinda','civarında','yaklasik','yaklaşık','kadar','arasi','arası','arasinda','arasında','olsun','istiyorum','arıyorum','ariyorum','bak','bul','bana','lutfen','lütfen','satilik','satılık','ilan','ilanlar','tl','try','tly','mümkünse','mumkunse','tercihen']);
 const units={milyon:1000000,milyar:1000000000,bin:1000,m:1000000};
 const isBrowse=()=>{const a=app();if(!a)return false;const t=norm(a.textContent||'');return /yayindaki ilanlar|ilanlara bak|gayrimenkul ilanlari|otomobil ilanlari/.test(t)&&!!a.querySelector('input');};
 function numberValue(s){const x=String(s).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(x);return Number.isFinite(n)?n:null}
 function parse(q){
  q=clean(q);const n=norm(q);const tokens=[],intents=[],criteria={price:null,priceApprox:false,rooms:null,area:null,km:null,year:null,hp:null,cc:null};
  const add=(v,label)=>{if(v==null||v==='')return;const s=String(v);if(!tokens.includes(s))tokens.push(s);if(label&&!intents.includes(label))intents.push(label)};
  n.replace(/(\d+(?:[\.,]\d+)?)\s*(milyar|milyon|bin|m)\b/g,(m,num,u)=>{const base=numberValue(num);const mult=units[u]||1000000;if(base!=null){criteria.price=base*mult;criteria.priceApprox=/civar|yaklas|kadar/.test(n);add(Math.round(base*mult),'fiyat')}return m});
  n.replace(/\b(\d{5,9})\s*(?:tl|try)?\b/g,(m,num)=>{if(criteria.price==null){criteria.price=Number(num);criteria.priceApprox=/civar|yaklas|kadar/.test(n);add(num,'fiyat')}return m});
  n.replace(/\b(\d+)\s*\+\s*(\d+)\b/g,(m,a,b)=>{criteria.rooms=a+'+'+b;add(criteria.rooms,'oda');return m});
  n.replace(/\b(\d+(?:[\.,]\d+)?)\s*(?:m2|m²|metrekare)\b/g,(m,num)=>{const v=numberValue(num);if(v!=null){criteria.area=v;add(Math.round(v)+' m2','metrekare')}return m});
  n.replace(/\b(\d+(?:[\.,]\d+)?)\s*(bin)?\s*km\b/g,(m,num,bin)=>{const v=numberValue(num);if(v!=null){criteria.km=v*(bin?1000:1);add(Math.round(criteria.km)+' km','km')}return m});
  n.replace(/\b(19\d{2}|20\d{2})\b/g,(m)=>{criteria.year=Number(m);add(m,'yil');return m});
  n.replace(/\b(\d+)\s*(?:hp|beygir)\b/g,(m,num)=>{criteria.hp=Number(num);add(num+' hp','guc');return m});
  n.replace(/\b(\d+)\s*(?:cc)\b/g,(m,num)=>{criteria.cc=Number(num);add(num+' cc','motor');return m});
  const words=n.split(/[^a-z0-9çğıöşü+]+/).filter(Boolean);
  words.forEach(x=>{if(x.length>=2&&!stop.has(x)&&!/^\d+$/.test(x)&&!tokens.some(t=>t===x||t.includes(x)))add(x)});
  return {q,tokens:[...new Set(tokens)].slice(0,16),intents:[...new Set(intents)],criteria};
 }
 function findSearch(){const a=app();if(!a)return null;const inputs=[...a.querySelectorAll('input')];return inputs.find(x=>/ara|arama|search/i.test(String(x.placeholder||'')+' '+String(x.getAttribute('aria-label')||'')))||inputs.find(x=>x.type==='search')||inputs[0]||null;}
 function listingNodes(){const a=app();if(!a)return[];const buttons=[...a.querySelectorAll('button')].filter(b=>/detayı gör|detay/i.test(norm(b.textContent||'')));return buttons.map(b=>{let el=b;for(let i=0;i<8&&el&&el.parentElement;i++){el=el.parentElement;const tx=norm(el.textContent||'');if(tx.includes('try')&&tx.length<900)return el}return b.closest('.card')||b.parentElement}).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)}
 function extractPrice(text){const t=norm(text);const m=t.match(/\b\d{1,3}(?:[\.\s]\d{3})+(?:,\d+)?\b|\b\d+(?:,\d+)?\s*(?:milyon|bin)\b/);if(!m)return null;const x=m[0].replace(/\s/g,'');if(x.includes('milyon'))return numberValue(x.replace('milyon',''))*1000000;if(x.includes('bin'))return numberValue(x.replace('bin',''))*1000;return numberValue(x)}
 function cardScore(node,r){const text=norm(node.textContent||'');let score=0;const reasons=[];const c=r.criteria;
  r.tokens.forEach(t=>{if(!/^\d/.test(t)&&text.includes(norm(t))){score+=7;reasons.push(t)}});
  if(c.price!=null){const p=extractPrice(text);if(p!=null){const d=Math.abs(p-c.price)/Math.max(c.price,1);const lim=c.priceApprox?.15:.08;if(d<=lim){score+=35;reasons.push('fiyat')}else if(d<=.35){score+=5}}}
  if(c.rooms!=null){if(text.includes(norm(c.rooms))){score+=35;reasons.push('oda')}else{return {score:-999,reasons:[]}}}
  const locationTokens=r.tokens.filter(t=>!/^\d/.test(t)&&!/m2$|km$|hp$|cc$/.test(t)&&t!==norm(c.rooms));
  if(locationTokens.length&&!locationTokens.some(t=>text.includes(norm(t))))return {score:-999,reasons:[]};
  if(c.area!=null){const m=text.match(/\b\d+(?:[\.,]\d+)?\s*(?:m2|m²|metrekare)\b/);if(m){const v=numberValue(m[0]);if(v!=null&&Math.abs(v-c.area)/Math.max(c.area,1)<=.15){score+=20;reasons.push('m²')}}}
  if(c.year!=null&&text.includes(String(c.year))){score+=25;reasons.push('yıl')}
  if(c.km!=null){const m=text.match(/\b\d+(?:[\.\s]\d+)?\s*(?:bin)?\s*km\b/);if(m){const s=norm(m[0]);const v=numberValue(s.replace('km','').replace('bin',''));const actual=s.includes('bin')?v*1000:v;if(actual!=null&&Math.abs(actual-c.km)/Math.max(c.km,1)<=.2){score+=20;reasons.push('km')}}}
  if(/yeni bina|sifir bina|yeni yap/.test(norm(r.q))){if(/yeni bina|sifir bina|yeni yap/.test(text)){score+=20;reasons.push('yeni bina')}else score-=3}
  return {score,reasons:[...new Set(reasons)]};
 }
 function rankListings(r){const nodes=listingNodes();if(!nodes.length)return 0;const scored=nodes.map(node=>({node,...cardScore(node,r)}));scored.sort((a,b)=>b.score-a.score);const valid=scored.filter(x=>x.score>=0);const hasStructured=!!(r.criteria.price||r.criteria.rooms||r.criteria.area||r.criteria.km||r.criteria.year||r.tokens.length);if(hasStructured){const threshold=valid.some(x=>x.score>=35)?20:1;scored.forEach(x=>x.node.style.display=x.score>=threshold?'':'none')}scored.forEach((x,i)=>{x.node.style.order=String(i);x.node.dataset.a6Score=String(Math.max(0,x.score));let badge=x.node.querySelector('[data-a6-match]');if(!badge){badge=document.createElement('div');badge.dataset.a6Match='1';badge.style.cssText='font-size:11px;margin-top:5px;font-weight:800;opacity:.72';x.node.appendChild(badge)}if(x.score>=0&&x.node.style.display!=='none'&&x.reasons.length){badge.textContent='✨ '+Math.min(99,Math.max(1,Math.round(Math.min(99,x.score*1.25))))+'% eşleşme';badge.title='Eşleşen: '+x.reasons.join(', ')}else badge.remove()});return scored.filter(x=>x.node.style.display!=='none').length}
 function clearSmartVisibility(){listingNodes().forEach(n=>{n.style.display='';const b=n.querySelector('[data-a6-match]');if(b)b.remove()})}
 function runSearch(q){const s=findSearch();if(!s)return null;clearSmartVisibility();const r=parse(q);const lexical=r.tokens.filter(t=>!/^\d/.test(t)&&!/\s*m2$/.test(t)&&!/\s*km$/.test(t)&&!/\s*(hp|cc)$/.test(t)&&t!==norm(r.criteria.rooms));s.value=lexical.join(' ');s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));const btn=[...app().querySelectorAll('button')].find(b=>/^ara$/i.test(String(b.textContent||'').trim()));if(btn)btn.click();else s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));setTimeout(()=>rankListings(r),180);setTimeout(()=>rankListings(r),550);setTimeout(()=>rankListings(r),1000);return r;}
 function inject(){if(!isBrowse())return;if(app().querySelector('[data-a6-search]'))return;const host=app(),box=document.createElement('section');box.className='card';box.dataset.a6Search='1';box.style.cssText='margin:10px 0;padding:12px 13px;border-radius:15px';box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="font-weight:900;font-size:14px">✨ Akıllı arama</div><span data-a6-count class="small muted"></span></div><div class="small muted" style="margin-top:3px">Doğal cümleyle ara; fiyat, oda, m², yıl, km ve konumu anlayabilir.</div><div style="display:flex;gap:8px;margin-top:9px"><input data-a6-input type="search" placeholder="Örn. Gaziemir 2+1 4 milyon civarı" autocomplete="off" style="flex:1"><button type="button" data-a6-go style="min-width:70px">Ara</button></div><div data-a6-hint class="small muted" style="margin-top:6px;display:none"></div>';const input=box.querySelector('[data-a6-input]'),go=box.querySelector('[data-a6-go]'),hint=box.querySelector('[data-a6-hint]'),count=box.querySelector('[data-a6-count]');const submit=()=>{const q=clean(input.value);if(!q)return;const r=runSearch(q);if(!r)return;hint.textContent=r.intents.length?'Anlaşılan: '+r.intents.join(' · '):'Arama metni kullanılıyor';hint.style.display='block';count.textContent=r.tokens.length+' kriter';};go.onclick=submit;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});host.insertBefore(box,host.firstElementChild)}
 window.__A6_INTERPRET_QUERY__=parse;window.__A6_RANK_LISTINGS__=rankListings;
 const ob=new MutationObserver(inject);ob.observe(document.body,{childList:true,subtree:true});setTimeout(inject,100);setTimeout(inject,500);setTimeout(inject,1200);
})();