/* A3.5.12 — fullscreen listing photo viewer
 * Test branch only. Read-only viewer: does not modify listing/photo data.
 */
(()=>{
  if(window.__A3512_PHOTO_VIEWER__)return;
  window.__A3512_PHOTO_VIEWER__=1;
  const state={urls:[],index:0,scale:1,tx:0,ty:0,startX:0,startY:0,startDist:0,startScale:1,moved:false,lastTap:0};
  const style=()=>{
    if(document.getElementById('a3512style'))return;
    const s=document.createElement('style');s.id='a3512style';
    s.textContent=`
      .a3511Carousel img{cursor:zoom-in}
      .a3512Overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;touch-action:none;overscroll-behavior:contain}
      .a3512Stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}
      .a3512Img{max-width:96vw;max-height:88vh;width:auto;height:auto;object-fit:contain;transform:translate3d(var(--tx),var(--ty),0) scale(var(--scale));transform-origin:center center;transition:transform .18s ease;will-change:transform;user-select:none;-webkit-user-drag:none;cursor:grab}
      .a3512Img.dragging{cursor:grabbing;transition:none}
      .a3512Close{position:absolute;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:28px;line-height:1;z-index:4}
      .a3512Nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:30px;line-height:1;z-index:4}
      .a3512Prev{left:14px}.a3512Next{right:14px}
      .a3512Count{position:absolute;left:50%;top:16px;transform:translateX(-50%);padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font-size:13px;z-index:4}
      .a3512Hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);padding:7px 11px;border-radius:999px;background:rgba(0,0,0,.45);color:rgba(255,255,255,.9);font-size:12px;z-index:4;white-space:nowrap}
      .a3512Thumbs{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);display:flex;gap:6px;z-index:4;max-width:92vw;overflow:auto;padding:3px}
      .a3512Thumb{width:48px;height:38px;border:2px solid transparent;border-radius:7px;padding:0;overflow:hidden;background:#111;flex:0 0 auto}
      .a3512Thumb.active{border-color:#fff}.a3512Thumb img{width:100%;height:100%;object-fit:cover;display:block}
      @media(max-width:600px){.a3512Nav{width:38px;height:38px;font-size:26px}.a3512Prev{left:8px}.a3512Next{right:8px}.a3512Img{max-width:100vw;max-height:82vh}.a3512Hint{bottom:10px}.a3512Thumbs{bottom:48px}}
    `;document.head.appendChild(s)
  };
  function urlsFromCarousel(){
    const box=document.querySelector('.a3511Carousel');
    if(!box)return [];
    return [...box.querySelectorAll('.a3511Slide img')].map(x=>x.currentSrc||x.src).filter(Boolean)
  }
  function resetZoom(){state.scale=1;state.tx=0;state.ty=0}
  function applyTransform(img){img.style.setProperty('--scale',state.scale);img.style.setProperty('--tx',state.tx+'px');img.style.setProperty('--ty',state.ty+'px')}
  function close(){
    const o=document.querySelector('.a3512Overlay');if(o)o.remove();
    document.body.style.overflow=state.prevOverflow||'';
  }
  function render(o){
    const img=o.querySelector('.a3512Img'),count=o.querySelector('.a3512Count'),thumbs=o.querySelector('.a3512Thumbs');
    img.src=state.urls[state.index];img.alt='Fotoğraf '+(state.index+1);count.textContent=(state.index+1)+' / '+state.urls.length;resetZoom();applyTransform(img);
    thumbs.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===state.index));
  }
  function open(index){
    const urls=urlsFromCarousel();if(!urls.length)return;
    style();state.urls=urls;state.index=Math.max(0,Math.min(index||0,urls.length-1));state.prevOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const o=document.createElement('div');o.className='a3512Overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    o.innerHTML=`<div class="a3512Stage"><button type="button" class="a3512Close" aria-label="Kapat">×</button>${urls.length>1?'<button type="button" class="a3512Nav a3512Prev" aria-label="Önceki fotoğraf">‹</button><button type="button" class="a3512Nav a3512Next" aria-label="Sonraki fotoğraf">›</button>':''}<div class="a3512Count"></div><img class="a3512Img" draggable="false"><div class="a3512Thumbs"></div><div class="a3512Hint">İki parmakla yakınlaştır · sürükle · çift dokun</div></div>`;
    document.body.appendChild(o);
    const stage=o.querySelector('.a3512Stage'),img=o.querySelector('.a3512Img'),thumbs=o.querySelector('.a3512Thumbs');
    urls.forEach((u,i)=>{const b=document.createElement('button');b.type='button';b.className='a3512Thumb';b.setAttribute('aria-label','Fotoğraf '+(i+1));b.innerHTML='<img src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">';b.onclick=()=>{state.index=i;render(o)};thumbs.appendChild(b)});
    const next=d=>{if(urls.length<2)return;state.index=(state.index+d+urls.length)%urls.length;render(o)};
    o.querySelector('.a3512Close').onclick=close;o.querySelector('.a3512Prev')?.addEventListener('click',()=>next(-1));o.querySelector('.a3512Next')?.addEventListener('click',()=>next(1));
    o.addEventListener('click',e=>{if(e.target===o||e.target===stage)close()});
    let dragging=false,pinch=false,px=0,py=0;
    stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;img.setPointerCapture?.(e.pointerId);px=e.clientX;py=e.clientY;dragging=true;state.moved=false;img.classList.add('dragging')});
    stage.addEventListener('pointermove',e=>{if(!dragging||pinch)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)state.moved=true;if(state.scale>1){state.tx+=dx;state.ty+=dy;applyTransform(img)}px=e.clientX;py=e.clientY});
    stage.addEventListener('pointerup',()=>{dragging=false;img.classList.remove('dragging')});
    stage.addEventListener('pointercancel',()=>{dragging=false;img.classList.remove('dragging')});
    let touchA=null,touchB=null;
    stage.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch=true;touchA=e.touches[0];touchB=e.touches[1];state.startDist=Math.hypot(touchA.clientX-touchB.clientX,touchA.clientY-touchB.clientY);state.startScale=state.scale}else if(e.touches.length===1){state.startX=e.touches[0].clientX;state.startY=e.touches[0].clientY;state.moved=false}},{passive:true});
    stage.addEventListener('touchmove',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1],dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);state.scale=Math.max(1,Math.min(4,state.startScale*(dist/state.startDist)));applyTransform(img);e.preventDefault()}},{passive:false});
    stage.addEventListener('touchend',e=>{if(pinch&&e.touches.length<2){pinch=false;return}if(!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-state.startX,dy=t.clientY-state.startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)&&state.scale===1)next(dx<0?1:-1);else if(Math.abs(dx)+Math.abs(dy)<12){const now=Date.now();if(now-state.lastTap<280){state.scale=state.scale===1?2:1;state.tx=0;state.ty=0;applyTransform(img)}state.lastTap=now}},{passive:true});
    document.onkeydown=a=>{if(!document.querySelector('.a3512Overlay'))return;if(a.key==='Escape')close();if(a.key==='ArrowLeft')next(-1);if(a.key==='ArrowRight')next(1)};
    render(o);setTimeout(()=>o.querySelector('.a3512Close')?.focus(),0);
  }
  function bind(){
    document.querySelectorAll('.a3511Carousel').forEach(box=>{if(box.dataset.a3512==='1')return;box.dataset.a3512='1';box.querySelectorAll('.a3511Slide img').forEach((img,i)=>{img.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(i)})})});
  }
  const ob=new MutationObserver(bind);const start=()=>{style();bind();ob.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  setTimeout(bind,150);setTimeout(bind,600);setTimeout(bind,1400);
})();
