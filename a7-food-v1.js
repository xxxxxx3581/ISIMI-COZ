/* İşimi Çöz · Yemek (Food) v3 — tek kaynak dosya: a7-food-v1.js
   Güvenlik, para hesabı, yetki ve durum geçişleri veritabanında (RLS + RPC) korunur; bu dosya yalnızca arayüzdür. */
(()=>{
if(window.__A7_FOOD_V3__)return;window.__A7_FOOD_V3__=1;window.__A7_FOOD_V1__=1;

/* ====================== Çekirdek yardımcılar ====================== */
const CART_KEY='isimi_food_cart_v2', OLD_CART_KEY='isimi_food_cart_v1', PHONE_KEY='isimi_food_phone', VENUE_KEY='isimi_food_my_venue';
const E=v=>typeof escapeHTML==='function'?escapeHTML(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TRY=new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'});
const M=k=>TRY.format((+k||0)/100);
const S=()=>typeof getAuthSession==='function'?getAuthSession():null;
const UID=()=>S()?.user?.id||null;
const A=()=>{const s=S();if(!s?.access_token){toast('Devam etmek için giriş yapmalısın.','warn');try{openAuthModal?.('login')}catch(e){}return null}return s};
const Q=(m,p,b=null)=>window.supabaseAuthRequest(m,p,b);
const RPC=(fn,body)=>window.supabaseAuthRequest('POST','rpc/'+fn,body||{});
const NO=id=>String(id||'').slice(0,8).toUpperCase();
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function errMsg(e){
  let m=(e&&e.message)||String(e||'');
  if(/Failed to fetch|NetworkError|Load failed|network/i.test(m))return 'Bağlantı sorunu. İnternetini kontrol edip tekrar dene.';
  m=m.replace(/^FOOD_[A-Z]+:\s*/,'');
  if(/JWT|jwt expired/i.test(m))return 'Oturumun sona erdi. Lütfen tekrar giriş yap.';
  if(/permission denied|row-level security|violates row-level/i.test(m))return 'Bu işlem için yetkin yok.';
  return m||'Beklenmeyen bir hata oluştu.';
}
function isNetErr(e){return /Failed to fetch|NetworkError|Load failed/i.test((e&&e.message)||'')}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function ago(ts){if(!ts)return'';const d=(Date.now()-new Date(ts))/1000;if(d<60)return'az önce';if(d<3600)return Math.floor(d/60)+' dk önce';if(d<86400)return Math.floor(d/3600)+' sa önce';return new Date(ts).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}
function hm(ts){return ts?new Date(ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):''}
function tlToKurus(v){const n=Number(String(v??'').replace(/\s/g,'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):NaN}
function kurusToTl(k){return ((+k||0)/100).toFixed(2).replace('.',',')}

/* ====================== Ekran yaşam döngüsü ====================== */
let SCREEN=0; const CLEANUPS=[];
function newScreen(){SCREEN++;while(CLEANUPS.length){try{CLEANUPS.pop()()}catch(e){}}return SCREEN}
function alive(tok){return tok===SCREEN&&!!document.getElementById('fdRoot')}
function onCleanup(fn){CLEANUPS.push(fn)}
function render(html,nav){css();if(nav!==false){try{setNav?.('navFood')}catch(e){}}app('<div id="fdRoot" class="fd">'+html+'</div>')}
/* Canlı yenilemede kaydırmayı bozmadan yerinde güncelle */
function patch(html){const r=document.getElementById('fdRoot');if(!r)return render(html);const y=window.scrollY;r.innerHTML=html;window.scrollTo(0,y)}

/* ====================== Toast / Modal / Sheet ====================== */
function toast(msg,kind){
  let box=document.getElementById('fdToasts');
  if(!box){box=document.createElement('div');box.id='fdToasts';box.className='fdToasts';box.setAttribute('aria-live','polite');document.body.appendChild(box)}
  const t=document.createElement('div');t.className='fdToast '+(kind||'ok');t.setAttribute('role','status');t.textContent=msg;box.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300)},kind==='err'?5200:3400);
}
let MODAL_ESC=null;
function closeModal(){const m=document.getElementById('fdModal');if(m)m.remove();document.body.classList.remove('fdNoScroll');if(MODAL_ESC){document.removeEventListener('keydown',MODAL_ESC);MODAL_ESC=null}}
function modal(inner,opts){
  css();closeModal();opts=opts||{};
  const w=document.createElement('div');w.id='fdModal';w.className='fdModalWrap'+(opts.sheet?' sheet':'');
  w.innerHTML='<div class="fdModal" role="dialog" aria-modal="true">'+inner+'</div>';
  w.addEventListener('click',ev=>{if(ev.target===w&&!opts.locked){closeModal();opts.onClose&&opts.onClose()}});
  document.body.appendChild(w);document.body.classList.add('fdNoScroll');
  if(!opts.locked){MODAL_ESC=ev=>{if(ev.key==='Escape'){closeModal();opts.onClose&&opts.onClose()}};document.addEventListener('keydown',MODAL_ESC)}
  const f=w.querySelector('[autofocus]');if(f)setTimeout(()=>f.focus(),60);
  return w;
}
function confirmBox(title,text,okLabel,danger){
  return new Promise(res=>{
    const w=modal('<h3>'+E(title)+'</h3>'+(text?'<p class="fdMuted">'+E(text)+'</p>':'')+
      '<div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn '+(danger?'fdDanger':'pri')+'" data-x="ok">'+E(okLabel||'Onayla')+'</button></div>',{onClose:()=>res(false)});
    w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(false)};
    w.querySelector('[data-x=ok]').onclick=()=>{closeModal();res(true)};
  });
}
function promptBox(title,placeholder,opts){
  opts=opts||{};
  return new Promise(res=>{
    const chips=(opts.chips||[]).map(c=>'<button type="button" class="fdChip" data-c="'+E(c)+'">'+E(c)+'</button>').join('');
    const w=modal('<h3>'+E(title)+'</h3>'+(opts.text?'<p class="fdMuted">'+E(opts.text)+'</p>':'')+
      (chips?'<div class="fdChips wrap">'+chips+'</div>':'')+
      (opts.input==='code'?'<input id="fdPr" class="fdCode" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="• • • •" autofocus>':
       '<textarea id="fdPr" rows="3" maxlength="500" placeholder="'+E(placeholder||'')+'" autofocus></textarea>')+
      '<div class="fdErr" id="fdPrErr" hidden></div>'+
      '<div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn '+(opts.danger?'fdDanger':'pri')+'" data-x="ok">'+E(opts.okLabel||'Gönder')+'</button></div>',{onClose:()=>res(null)});
    const inp=w.querySelector('#fdPr');
    w.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{inp.value=b.getAttribute('data-c');inp.focus()});
    w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(null)};
    w.querySelector('[data-x=ok]').onclick=()=>{
      const v=inp.value.trim();
      if(opts.required&&!v){const er=w.querySelector('#fdPrErr');er.hidden=false;er.textContent=opts.requiredText||'Bu alan zorunlu.';return}
      if(opts.input==='code'&&!/^\d{4}$/.test(v)){const er=w.querySelector('#fdPrErr');er.hidden=false;er.textContent='4 haneli kodu gir.';return}
      closeModal();res(v);
    };
  });
}

/* ====================== Çift tıklama / çift gönderim koruması ====================== */
const BUSY=new Set();
async function once(key,btn,fn){
  if(BUSY.has(key))return;BUSY.add(key);
  let old;if(btn&&btn.tagName){old=btn.innerHTML;btn.disabled=true;btn.classList.add('fdBusy');btn.innerHTML='<span class="fdSpin" aria-hidden="true"></span> İşleniyor…'}
  try{return await fn()}
  finally{BUSY.delete(key);if(btn&&btn.isConnected){btn.disabled=false;btn.classList.remove('fdBusy');btn.innerHTML=old}}
}

/* ====================== Realtime + güvenli yedek yoklama ====================== */
const RT={client:null,loading:null,live:false};
function rtLoad(){
  if(RT.client)return Promise.resolve(RT.client);
  if(RT.loading)return RT.loading;
  RT.loading=new Promise((res,rej)=>{
    const make=()=>{try{
      RT.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:5}}});
      res(RT.client)}catch(e){rej(e)}};
    if(window.supabase&&window.supabase.createClient)return make();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';s.async=true;s.crossOrigin='anonymous';
    s.onload=make;s.onerror=()=>{RT.loading=null;rej(new Error('realtime-load'))};
    document.head.appendChild(s);
    setTimeout(()=>{if(!RT.client){RT.loading=null;rej(new Error('realtime-timeout'))}},8000);
  });
  return RT.loading;
}
function setLive(state){const el=document.getElementById('fdLive');if(!el)return;el.className='fdLive '+state;el.title=state==='on'?'Canlı':'Otomatik yenileme (20 sn)';el.innerHTML='<i></i>'+(state==='on'?'Canlı':'20 sn yenileme')}
/* watch: tablo değişikliğinde refresh() çağırır; realtime yoksa/koparsa 20 sn'de bir yoklar */
function watch(tok,subs,refresh){
  let poll=null,channels=[],dead=false;
  const startPoll=()=>{if(poll||dead)return;setLive('poll');poll=setInterval(()=>{if(!alive(tok)){stop();return}refresh('poll')},20000)};
  const stopPoll=()=>{if(poll){clearInterval(poll);poll=null}};
  const stop=()=>{dead=true;stopPoll();channels.forEach(ch=>{try{RT.client&&RT.client.removeChannel(ch)}catch(e){}});channels=[]};
  onCleanup(stop);
  const kick=setTimeout(()=>{if(!RT.live)startPoll()},8000);onCleanup(()=>clearTimeout(kick));
  (async()=>{
    try{
      await (window.v2EnsureFreshToken?window.v2EnsureFreshToken():null);
      const c=await rtLoad();if(dead)return;
      const tokn=S()?.access_token;if(tokn)c.realtime.setAuth(tokn);
      let ok=0;
      subs.forEach((sb,i)=>{
        const ch=c.channel('fd-'+tok+'-'+i+'-'+Math.random().toString(36).slice(2,7))
          .on('postgres_changes',Object.assign({event:'*',schema:'public'},sb),payload=>{if(alive(tok))refresh('rt',payload)})
          .subscribe(st=>{
            if(dead)return;
            if(st==='SUBSCRIBED'){ok++;if(ok>=subs.length){RT.live=true;stopPoll();setLive('on')}}
            else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){RT.live=false;startPoll()}
          });
        channels.push(ch);
      });
    }catch(e){startPoll()}
  })();
  const vis=()=>{if(document.visibilityState==='visible'&&alive(tok))refresh('focus')};
  document.addEventListener('visibilitychange',vis);onCleanup(()=>document.removeEventListener('visibilitychange',vis));
}

/* ====================== Durum sözlüğü ====================== */
const STL={
  new:['🕐','Sipariş alındı','Restoranın onayı bekleniyor.'],
  accepted:['✅','Restoran onayladı','Siparişin sıraya alındı.'],
  preparing:['👨‍🍳','Hazırlanıyor','Mutfakta hazırlanıyor.'],
  ready:['📦','Hazır','Siparişin hazır.'],
  courier_search:['🔎','Kurye aranıyor','Siparişin hazır, en yakın kurye aranıyor.'],
  courier_assigned:['🛵','Kurye atandı','Kurye restorana gidiyor.'],
  courier_at_venue:['🏪','Kurye restoranda','Kurye siparişini teslim almak üzere.'],
  picked_up:['🛍️','Kurye teslim aldı','Siparişin kuryede.'],
  on_the_way:['🛵','Yolda','Siparişin sana doğru geliyor.'],
  near_customer:['📍','Yaklaştı','Kurye çok yakında. Teslimat kodunu hazır tut.'],
  delivered:['🎉','Teslim edildi','Afiyet olsun!'],
  rejected:['⛔','Restoran reddetti','Sipariş restoran tarafından reddedildi.'],
  cancelled:['✖️','İptal edildi','Sipariş iptal edildi.'],
  failed:['⚠️','Teslimat tamamlanamadı','Teslimat sırasında bir sorun oluştu. Destek süreci başlatılabilir.'],
  refund_pending:['↩️','İade süreci başladı','İaden işleme alındı.'],
  refunded:['💸','İade tamamlandı','İade tamamlandı.']
};
const TERMINAL=['delivered','rejected','cancelled','failed','refund_pending','refunded'];
const BAD=['rejected','cancelled','failed'];
const PAY={cash_on_delivery:'Kapıda nakit',card_on_delivery:'Kapıda kart',agree_with_venue:'Restoranla anlaşmalı'};
const MODE={pickup:'🛍️ Gel-al',self_delivery:'🛵 Restoran kuryesi',platform_delivery:'🛵 Kurye'};
const ISSUE={missing_item:'Eksik ürün',wrong_item:'Yanlış ürün',late:'Geç teslimat',damaged:'Hasarlı / uygunsuz ürün',not_delivered:'Teslim edilmedi',other:'Diğer'};
const DAYS=[['mon','Pzt'],['tue','Sal'],['wed','Çar'],['thu','Per'],['fri','Cum'],['sat','Cmt'],['sun','Paz']];
const VEH={walk:'🚶 Yaya',bike:'🚲 Bisiklet',motorbike:'🛵 Motosiklet',car:'🚗 Araba'};
function badge(st){const s=STL[st]||['•',st];return '<span class="fdBadge st-'+E(st)+'">'+s[0]+' '+E(s[1])+'</span>'}

/* Çalışma saati (yalnızca gösterim; asıl kontrol veritabanında) */
function openNow(v){
  if(!v||!v.is_active||!v.is_open)return false;
  const wh=v.working_hours;if(!wh||!Object.keys(wh).length)return true;
  const now=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Istanbul'}));
  const keys=['sun','mon','tue','wed','thu','fri','sat'];const d=now.getDay();const t=now.getHours()*60+now.getMinutes();
  const mm=s=>{const[a,b]=String(s).split(':');return(+a)*60+(+b)};
  for(const r of (wh[keys[d]]||[])){const o=mm(r[0]),c=mm(r[1]);if(c>o&&t>=o&&t<c)return true;if(c<=o&&t>=o)return true}
  for(const r of (wh[keys[(d+6)%7]]||[])){const o=mm(r[0]),c=mm(r[1]);if(c<=o&&t<c)return true}
  return false;
}
function hoursText(wh){
  if(!wh||!Object.keys(wh).length)return 'Çalışma saati belirtilmemiş (açık/kapalı durumuna göre sipariş alır)';
  return DAYS.map(([k,l])=>l+' '+((wh[k]||[]).map(r=>r[0]+'–'+r[1]).join(', ')||'kapalı')).join(' · ');
}

/* ====================== Görsel yardımcıları ====================== */
const FOOD_ICONS=[[/lahmacun/i,'🫓','#fef3c7'],[/iskender|i̇skender/i,'🍛','#fee2e2'],[/kebap|kebab/i,'🍢','#fee2e2'],[/döner|doner/i,'🌯','#ffedd5'],
 [/köfte|kofte/i,'🍖','#fde68a'],[/burger/i,'🍔','#fef3c7'],[/pizza/i,'🍕','#fee2e2'],[/patates/i,'🍟','#fef9c3'],[/pide/i,'🥙','#fef3c7'],
 [/tavuk|chicken/i,'🍗','#fee2e2'],[/balık|balik|fish/i,'🐟','#dbeafe'],[/çorba|corba|soup/i,'🍲','#ffedd5'],[/salata|salad/i,'🥗','#dcfce7'],
 [/makarna|pasta/i,'🍝','#fef3c7'],[/dondurma/i,'🍨','#e0f2fe'],[/baklava|künefe|kunefe|tatlı|tatli/i,'🍮','#fce7f3'],
 [/kola|cola|içecek|icecek|ayran|\bsu\b|\bçay\b|kahve/i,'🥤','#e0f2fe']];
function foodIcon(name){const n=String(name||'');for(const[re,e,bg]of FOOD_ICONS)if(re.test(n))return{emoji:e,bg};return{emoji:'🍽️',bg:'var(--v2-soft,rgba(0,0,0,.05))'}}
function media(row,size,round){
  const s=size||56,r=round||14;
  if(row&&row.image_url)return '<img class="fdImg" src="'+E(row.image_url)+'" alt="" loading="lazy" style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px">';
  const ic=foodIcon(row&&(row.name||row.cuisine_type));
  return '<div class="fdImg" aria-hidden="true" style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;background:'+ic.bg+';font-size:'+Math.round(s*.48)+'px">'+ic.emoji+'</div>';
}
async function uploadFoodImage(venueId,file){
  if(!file)throw new Error('Dosya seçilmedi.');
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Yalnızca JPG, PNG veya WEBP yükleyebilirsin.');
  if(file.size>5*1024*1024)throw new Error('Görsel en fazla 5 MB olabilir.');
  await (window.v2EnsureFreshToken?window.v2EnsureFreshToken():null);
  const tok=S()?.access_token;if(!tok)throw new Error('Giriş gerekli.');
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=venueId+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/food-images/'+path,{method:'POST',headers:{Authorization:'Bearer '+tok,apikey:SUPABASE_KEY,'Content-Type':file.type,'x-upsert':'false'},body:file});
  if(!r.ok){let t='';try{t=(await r.json()).message}catch(e){}throw new Error(t||'Görsel yüklenemedi.')}
  return SUPABASE_URL+'/storage/v1/object/public/food-images/'+path;
}

/* ====================== Stiller ====================== */
function css(){
  if(document.getElementById('fdCss'))return;
  const s=document.createElement('style');s.id='fdCss';
  s.textContent=`
.fd{padding-bottom:18px;--fd-acc:#ea580c;--fd-acc-soft:rgba(234,88,12,.1);--fd-ok:#0f9f6a;--fd-bad:#dc2626}
.fd h1{font-size:22px;margin:4px 0 6px}.fd h2{font-size:17px;margin:18px 0 8px}.fd h3{font-size:16px;margin:0 0 6px}
.fdMuted{color:var(--muted);font-size:13px;line-height:1.45}.fdSmall{font-size:12px}
.fdTop{display:flex;align-items:center;gap:8px;margin:0 0 10px}.fdTop .grow{flex:1;min-width:0}
.fdBrand{display:flex;align-items:center;gap:9px}.fdBrand i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;background:linear-gradient(145deg,#f59e0b,#ea580c);color:#fff;font-size:16px}
.fdBrand b{display:block;font-size:15px;color:var(--fd-acc)}.fdBrand span{display:block;font-size:11px;color:var(--muted);font-weight:700}
.fdIconBtn{position:relative;min-width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:18px;cursor:pointer}
.fdDot{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--fd-bad);color:#fff;font-size:11px;font-weight:800;line-height:18px}
.fdSearch{display:flex;gap:8px;margin:0 0 8px}.fdSearch input,.fdSearch select{flex:1 1 140px;min-width:0;height:46px;border-radius:13px;border:1px solid var(--line);padding:0 14px;font:inherit}
.fdChips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none}.fdChips.wrap{flex-wrap:wrap;overflow:visible}
.fdChip{flex:0 0 auto;min-height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);font-weight:700;font-size:12.5px;cursor:pointer}
.fdChip.on{border-color:var(--fd-acc);background:var(--fd-acc-soft);color:var(--fd-acc)}
.fdRoles{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:4px 0 12px}
.fdRoles button{min-height:48px;border-radius:13px;border:1px solid var(--line);background:var(--card);color:var(--text);font-weight:800;font-size:13px;cursor:pointer}
.fdGrid{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:720px){.fdGrid{grid-template-columns:1fr 1fr}}
.fdCard{border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);padding:14px}
.fdVenue{display:flex;gap:12px;text-align:left;width:100%;font:inherit;cursor:pointer;align-items:flex-start}
.fdVenue.closed{opacity:.72}.fdVenue h3{margin:0 0 3px;font-size:16px}
.fdImg{flex:0 0 auto;object-fit:cover;display:grid;place-items:center;background:var(--v2-soft,rgba(0,0,0,.05))}
.fdMeta{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.fdPill{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:700;background:var(--v2-soft,rgba(0,0,0,.05));color:var(--muted)}
.fdPill.ok{background:rgba(15,159,106,.13);color:var(--fd-ok)}.fdPill.off{background:rgba(148,163,184,.2)}.fdPill.acc{background:var(--fd-acc-soft);color:var(--fd-acc)}
.fdBadge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;background:var(--fd-acc-soft);color:var(--fd-acc)}
.fdBadge.st-delivered{background:rgba(15,159,106,.13);color:var(--fd-ok)}.fdBadge.st-rejected,.fdBadge.st-cancelled,.fdBadge.st-failed{background:rgba(220,38,38,.1);color:var(--fd-bad)}
.fdCover{width:100%;height:150px;object-fit:cover;border-radius:16px;display:block;margin:6px 0 10px}
.fdCats{position:sticky;top:0;z-index:5;background:var(--bg);padding:6px 0 4px}
.fdItem{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer}.fdItem:last-child{border-bottom:0}
.fdItem.na{opacity:.5;cursor:default}.fdItem .grow{flex:1;min-width:0}.fdItem b{display:block}.fdItem p{margin:3px 0 0;font-size:12.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fdPlus{width:44px;height:44px;border-radius:12px;border:1px solid var(--fd-acc);background:var(--fd-acc-soft);color:var(--fd-acc);font-size:22px;font-weight:800;cursor:pointer;flex:0 0 auto}
.fdQty{display:inline-flex;align-items:center;gap:6px}.fdQty button{width:40px;height:40px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:18px;cursor:pointer}.fdQty b{min-width:22px;text-align:center}
.fdSticky{position:sticky;bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:20;margin-top:14px;padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--card);display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.14)}
.fdSticky .v2Btn{flex:1}
.fdLine{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:14px}.fdLine.total{font-size:17px;font-weight:900;border-top:1px solid var(--line);margin-top:6px;padding-top:10px}
.fdLine.sub{color:var(--muted);font-size:12.5px;padding:0}
.fdIssues{border:1px solid rgba(220,38,38,.35);background:rgba(220,38,38,.07);color:var(--fd-bad);border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700;margin:8px 0}
.fdIssues div+div{margin-top:4px}
.fdInfo{border:1px solid var(--line);background:var(--v2-soft,rgba(0,0,0,.04));border-radius:12px;padding:10px 12px;font-size:13px;margin:8px 0}
.fdOpt{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 2px;border-bottom:1px solid var(--line);cursor:pointer}.fdOpt input{width:22px;height:22px;margin:0;flex:0 0 22px;accent-color:var(--fd-acc)}.fdOpt .grow{flex:1}.fdOpt.na{opacity:.45}
.fdGroupH{display:flex;justify-content:space-between;align-items:center;margin:16px 0 4px}.fdGroupH b{font-size:14.5px}
.fdReq{font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px;background:var(--fd-acc-soft);color:var(--fd-acc)}
.fdRadio{display:grid;gap:8px}.fdRadio label{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:13px;cursor:pointer;margin:0;font-weight:600}
.fdRadio label.on{border-color:var(--fd-acc);background:var(--fd-acc-soft)}.fdRadio input{margin-top:2px;width:18px;height:18px}
.fdSeg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;background:var(--v2-soft,rgba(0,0,0,.05));padding:4px;border-radius:14px;margin:6px 0 12px}
.fdSeg button{min-height:42px;border-radius:11px;border:0;background:transparent;color:var(--text);font-weight:800;cursor:pointer}.fdSeg button.on{background:var(--card);box-shadow:0 2px 8px rgba(0,0,0,.08);color:var(--fd-acc)}
.fdSeg button:disabled{opacity:.4;cursor:not-allowed}
.fdHero{border-radius:18px;padding:16px;background:linear-gradient(135deg,var(--fd-acc-soft),transparent);border:1px solid var(--line);margin:6px 0 12px}
.fdHero .big{font-size:34px;line-height:1}.fdHero h2{margin:8px 0 4px;font-size:20px}
.fdTl{list-style:none;margin:6px 0;padding:0}.fdTl li{position:relative;padding:0 0 16px 30px;color:var(--muted);font-size:14px}
.fdTl li:before{content:'';position:absolute;left:8px;top:18px;bottom:-2px;width:2px;background:var(--line)}.fdTl li:last-child:before{display:none}
.fdTl li i{position:absolute;left:0;top:1px;width:18px;height:18px;border-radius:50%;border:2px solid var(--line);background:var(--card)}
.fdTl li.done{color:var(--text)}.fdTl li.done i{background:var(--fd-ok);border-color:var(--fd-ok)}.fdTl li.done:before{background:var(--fd-ok)}
.fdTl li.cur{color:var(--text);font-weight:800}.fdTl li.cur i{border-color:var(--fd-acc);background:var(--fd-acc-soft);box-shadow:0 0 0 4px var(--fd-acc-soft)}
.fdTl small{display:block;font-weight:600;color:var(--muted);font-size:11.5px}
.fdCodeBox{text-align:center;border:2px dashed var(--fd-acc);border-radius:16px;padding:14px;margin:10px 0;background:var(--fd-acc-soft)}
.fdCodeBox b{display:block;font-size:34px;letter-spacing:10px;color:var(--fd-acc);font-variant-numeric:tabular-nums}
.fdCode{font-size:30px!important;letter-spacing:12px;text-align:center;height:62px!important;font-variant-numeric:tabular-nums}
.fdTabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}
.fdTabs button{flex:0 0 auto;min-height:40px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);font-weight:800;font-size:13px;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.fdTabs button.on{border-color:var(--fd-acc);background:var(--fd-acc-soft);color:var(--fd-acc)}.fdTabs button em{font-style:normal;min-width:20px;height:20px;border-radius:10px;background:var(--fd-acc);color:#fff;font-size:11px;line-height:20px;padding:0 5px}
.fdTabs button em.z{background:var(--line);color:var(--muted)}
.fdKpi{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:6px 0 12px}@media(min-width:720px){.fdKpi{grid-template-columns:repeat(5,1fr)}}
.fdKpi div{border:1px solid var(--line);border-radius:14px;padding:10px;background:var(--card)}.fdKpi b{display:block;font-size:18px}.fdKpi span{font-size:11.5px;color:var(--muted);font-weight:700}
.fdOrder{margin-bottom:10px}.fdOrder .hd{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.fdOrder ul{margin:8px 0;padding-left:18px;font-size:14px}.fdOrder ul small{color:var(--muted)}
.fdActs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.fdActs .v2Btn{flex:1 1 140px}
.fdDanger{background:var(--fd-bad)!important;border-color:var(--fd-bad)!important;color:#fff!important}
.fdGhostDanger{color:var(--fd-bad)!important}
.fdEmpty{padding:26px 14px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:16px}
.fdEmpty b{display:block;font-size:30px;margin-bottom:6px}
.fdSkel{height:86px;border-radius:16px;background:linear-gradient(90deg,var(--card) 25%,var(--v2-soft,rgba(0,0,0,.06)) 50%,var(--card) 75%);background-size:200% 100%;animation:fdSk 1.2s infinite;border:1px solid var(--line);margin-bottom:10px}
@keyframes fdSk{0%{background-position:200% 0}100%{background-position:-200% 0}}
.fdErrBox{border:1px solid rgba(220,38,38,.35);border-radius:14px;padding:14px;color:var(--fd-bad);background:rgba(220,38,38,.06)}
.fdErr{color:var(--fd-bad);font-size:13px;font-weight:700;margin:6px 0}
.fdLive{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:var(--muted)}.fdLive i{width:8px;height:8px;border-radius:50%;background:#94a3b8}
.fdLive.on i{background:var(--fd-ok);box-shadow:0 0 0 3px rgba(15,159,106,.2)}.fdLive.poll i{background:#f59e0b}
.fdToasts{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9999;display:grid;gap:8px;width:min(92vw,420px);pointer-events:none}
.fdToast{padding:12px 14px;border-radius:13px;font-weight:700;font-size:14px;color:#fff;background:#0f172a;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .3s,transform .3s}
.fdToast.ok{background:#0f766e}.fdToast.err{background:#b91c1c}.fdToast.warn{background:#b45309}.fdToast.out{opacity:0;transform:translateY(8px)}
.fdModalWrap{position:fixed;inset:0;z-index:9998;background:rgba(2,6,23,.55);display:grid;place-items:center;padding:16px}
.fdModalWrap.sheet{place-items:end center;padding:0}
.fdModal{width:min(100%,460px);max-height:88vh;overflow:auto;background:var(--card);color:var(--text);border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.fdModalWrap.sheet .fdModal{width:min(100%,560px);border-radius:22px 22px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}
.fdModal textarea,.fdModal input:not([type=checkbox]):not([type=radio]),.fdModal select{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--line);padding:12px;font:inherit;margin:6px 0}
.fdRow2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.fdNoScroll{overflow:hidden}
.fdSpin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;display:inline-block;animation:fdSp .7s linear infinite}@keyframes fdSp{to{transform:rotate(360deg)}}
.fdBusy{opacity:.8}
.fdForm label{display:block;font-size:13px;font-weight:800;margin:12px 0 5px}.fdForm input:not([type=checkbox]):not([type=radio]),.fdForm select,.fdForm textarea{width:100%;box-sizing:border-box;min-height:46px;border-radius:12px;border:1px solid var(--line);padding:10px 12px;font:inherit}
.fdForm .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.fdForm input[type=file]{min-width:0;max-width:100%;font-size:12px}
.fdHours{display:grid;gap:6px}.fdHours div{display:grid;grid-template-columns:44px 30px minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center}.fdHours input[type=time]{min-height:40px;min-width:0;width:100%;padding:6px}
.fdStars{display:flex;gap:6px}.fdStars button{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-size:22px;cursor:pointer;filter:grayscale(1);opacity:.5}.fdStars button.on{filter:none;opacity:1;border-color:#f59e0b}
.fdKV{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13.5px}.fdKV span{color:var(--muted)}
.fdLink{background:none;border:0;color:var(--fd-acc);font-weight:800;cursor:pointer;padding:6px 0;font:inherit}
`;
  document.head.appendChild(s);
}
function back(fn,label){return '<button type="button" class="v2Btn sm" onclick="'+fn+'">← '+E(label||'Geri')+'</button>'}
function skel(n){return Array.from({length:n||3}).map(()=>'<div class="fdSkel"></div>').join('')}
function empty(icon,text,cta){return '<div class="fdEmpty"><b>'+icon+'</b>'+E(text)+(cta||'')+'</div>'}
function errBox(e,retry){return '<div class="fdErrBox"><b>Bir sorun oluştu</b><div class="fdSmall" style="margin:4px 0 10px">'+E(errMsg(e))+'</div>'+(retry?'<button type="button" class="v2Btn sm" onclick="'+retry+'">Tekrar dene</button>':'')+'</div>'}

/* whoami önbelleği */
let WHO=null,WHO_AT=0;
async function whoami(force){if(!force&&WHO&&Date.now()-WHO_AT<60000)return WHO;WHO=await RPC('food_whoami');WHO_AT=Date.now();return WHO}

/* ====================== Sepet ====================== */
function cartGet(){
  try{
    let c=JSON.parse(localStorage.getItem(CART_KEY)||'null');
    if(!c){
      const old=JSON.parse(localStorage.getItem(OLD_CART_KEY)||'null');
      if(old&&old.venue&&Array.isArray(old.items)&&old.items.length){
        c={venue:{id:old.venue.id||old.venue,name:old.venue.name||'Restoran'},items:old.items.map(x=>({key:x.menu_item_id+'|',menu_item_id:x.menu_item_id,name:x.name||'Ürün',quantity:Math.max(1,+x.quantity||1),option_ids:[],options_label:'',unit_kurus:+x.unit_price_kurus||0}))};
        localStorage.setItem(CART_KEY,JSON.stringify(c));
      }
      localStorage.removeItem(OLD_CART_KEY);
    }
    return c&&c.venue&&Array.isArray(c.items)?c:{venue:null,items:[]};
  }catch(e){return{venue:null,items:[]}}
}
function cartSave(c,keepReq){if(!keepReq)c.req=null;if(!c.items.length){localStorage.removeItem(CART_KEY);return}localStorage.setItem(CART_KEY,JSON.stringify(c))}
function cartCount(){return cartGet().items.reduce((n,x)=>n+(+x.quantity||0),0)}
function cartEst(){return cartGet().items.reduce((n,x)=>n+(+x.unit_kurus||0)*(+x.quantity||0),0)}
async function cartAdd(venue,line){
  const c=cartGet();
  if(c.venue&&c.venue.id!==venue.id&&c.items.length){
    const ok=await confirmBox('Sepetinde başka restoran var','"'+c.venue.name+'" sepetin boşaltılıp "'+venue.name+'" ile devam edilsin mi?','Sepeti değiştir',true);
    if(!ok)return false;
    c.items=[];
  }
  c.venue={id:venue.id,name:venue.name,delivery_mode:venue.delivery_mode,delivery_provider:venue.delivery_provider};
  const ex=c.items.find(x=>x.key===line.key);
  if(ex)ex.quantity=Math.min(50,ex.quantity+line.quantity);else c.items.push(line);
  cartSave(c);refreshSticky();toast('Sepete eklendi: '+line.name);return true;
}
function stickyCart(){
  const n=cartCount();if(!n)return '';
  return '<div class="fdSticky" id="fdSticky"><div><b>'+n+' ürün</b><div class="fdSmall fdMuted">~'+M(cartEst())+'</div></div><button type="button" class="v2Btn pri" onclick="showFoodCart()">Sepete git →</button></div>';
}
function refreshSticky(){const el=document.getElementById('fdSticky');const html=stickyCart();if(el){if(html)el.outerHTML=html;else el.remove()}else if(html){const r=document.getElementById('fdRoot');if(r&&r.dataset.sticky==='1')r.insertAdjacentHTML('beforeend',html)}}

/* ====================== Bildirim zili ====================== */
async function bellCount(){
  try{const r=await Q('GET','food_notifications?select=id&read_at=is.null&limit=50');const el=document.getElementById('fdBell');if(el){const n=r.length;el.innerHTML='🔔'+(n?'<span class="fdDot">'+(n>9?'9+':n)+'</span>':'')}}catch(e){}
}
function headerBar(title,sub){
  return '<div class="fdTop"><div class="fdBrand grow"><i aria-hidden="true">🍴</i><div><b>'+E(title||'Yemek')+'</b><span>'+E(sub||'İşimi Çöz')+'</span></div></div>'+
    '<span class="fdLive" id="fdLive"></span>'+
    '<button type="button" class="fdIconBtn" id="fdBell" aria-label="Bildirimler" onclick="showFoodNotifications()">🔔</button></div>';
}

/* ====================== Keşfet ====================== */
const HF={q:'',district:'',cuisine:'',open:false,mode:'',min:0,rows:[],offset:0,done:false};
async function showFoodHome(){
  if(!A())return;const tok=newScreen();
  render(headerBar('Yemek','Yakınındaki restoranlar')+
    '<div class="fdRoles" id="fdRoles"><button type="button" onclick="showFoodOrders()">📦 Siparişlerim</button><button type="button" onclick="showFoodBusiness()">🏪 İşletmem</button><button type="button" onclick="showFoodCourier()">🛵 Kurye</button></div>'+
    '<div class="fdSearch"><input id="fdQ" type="search" placeholder="Restoran, mutfak veya semt ara" value="'+E(HF.q)+'" autocomplete="off" aria-label="Restoran ara">'+
    '<select id="fdDistrict" aria-label="İlçe"><option value="">Tüm ilçeler</option></select></div>'+
    '<div class="fdChips" id="fdChips"></div>'+
    '<div id="fdList">'+skel(4)+'</div><div id="fdMore"></div>');
  document.getElementById('fdRoot').dataset.sticky='1';
  document.getElementById('fdRoot').insertAdjacentHTML('beforeend',stickyCart());
  document.getElementById('fdQ').addEventListener('input',debounce(e=>{HF.q=e.target.value;homeRender()},250));
  document.getElementById('fdDistrict').addEventListener('change',e=>{HF.district=e.target.value;homeRender()});
  bellCount();
  whoami().then(w=>{if(!alive(tok))return;const r=document.getElementById('fdRoles');if(w&&w.is_admin&&r)r.insertAdjacentHTML('beforeend','<button type="button" onclick="showFoodAdmin()">🛡️ Yönetim</button>')}).catch(()=>{});
  HF.rows=[];HF.offset=0;HF.done=false;
  await homeLoad(tok);
  watch(tok,[{table:'food_notifications',filter:'user_id=eq.'+UID()}],()=>bellCount());
}
async function homeLoad(tok){
  try{
    const rows=await Q('GET','food_venues?select=id,name,district,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,rating_avg,rating_count&is_active=eq.true&order=is_open.desc,name.asc&limit=30&offset='+HF.offset);
    if(!alive(tok))return;
    HF.rows=HF.rows.concat(rows||[]);HF.offset+=rows.length;HF.done=rows.length<30;
    homeRender();
  }catch(e){const l=document.getElementById('fdList');if(l)l.innerHTML=errBox(e,'showFoodHome()')}
}
window.foodHomeMore=async function(btn){await once('homeMore',btn,()=>homeLoad(SCREEN))};
window.foodChip=function(k,v){if(k==='open')HF.open=!HF.open;else if(k==='mode')HF.mode=HF.mode===v?'':v;else if(k==='min')HF.min=HF.min===v?0:v;else if(k==='cuisine')HF.cuisine=HF.cuisine===v?'':v;homeRender()};
function homeRender(){
  const list=document.getElementById('fdList');if(!list)return;
  const rows=HF.rows;
  const dsel=document.getElementById('fdDistrict');
  if(dsel&&dsel.options.length<=1){[...new Set(rows.map(r=>r.district).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')).forEach(d=>dsel.insertAdjacentHTML('beforeend','<option'+(HF.district===d?' selected':'')+'>'+E(d)+'</option>'))}
  const cuis=[...new Set(rows.map(r=>(r.cuisine_type||'').trim()).filter(Boolean))].slice(0,10);
  document.getElementById('fdChips').innerHTML=
    '<button type="button" class="fdChip'+(HF.open?' on':'')+'" onclick="foodChip(\'open\')">🟢 Şu an açık</button>'+
    '<button type="button" class="fdChip'+(HF.mode==='delivery'?' on':'')+'" onclick="foodChip(\'mode\',\'delivery\')">🛵 Teslimat</button>'+
    '<button type="button" class="fdChip'+(HF.mode==='pickup'?' on':'')+'" onclick="foodChip(\'mode\',\'pickup\')">🛍️ Gel-al</button>'+
    '<button type="button" class="fdChip'+(HF.min===10000?' on':'')+'" onclick="foodChip(\'min\',10000)">Min. sepet ≤ 100 TL</button>'+
    cuis.map(c=>'<button type="button" class="fdChip'+(HF.cuisine===c?' on':'')+'" onclick="foodChip(\'cuisine\',\''+E(c).replace(/'/g,'&#39;')+'\')">'+E(c)+'</button>').join('');
  const q=HF.q.toLocaleLowerCase('tr').trim();
  const f=rows.filter(v=>{
    if(q&&!((v.name||'')+' '+(v.cuisine_type||'')+' '+(v.district||'')).toLocaleLowerCase('tr').includes(q))return false;
    if(HF.district&&v.district!==HF.district)return false;
    if(HF.cuisine&&(v.cuisine_type||'').trim()!==HF.cuisine)return false;
    if(HF.open&&!openNow(v))return false;
    if(HF.mode==='delivery'&&!['self_delivery','both'].includes(v.delivery_mode))return false;
    if(HF.mode==='pickup'&&!['pickup','both'].includes(v.delivery_mode))return false;
    if(HF.min&&(+v.min_order_amount||0)>HF.min)return false;
    return true;
  }).sort((a,b)=>(openNow(b)?1:0)-(openNow(a)?1:0));
  list.innerHTML=f.length?'<div class="fdGrid">'+f.map(venueCard).join('')+'</div>':
    empty('🍽️',rows.length?'Filtrelere uyan restoran yok.':'Henüz restoran yok.', rows.length?'<div style="margin-top:10px"><button type="button" class="v2Btn sm" onclick="foodResetFilters()">Filtreleri temizle</button></div>':'');
  const more=document.getElementById('fdMore');if(more)more.innerHTML=HF.done?'':'<button type="button" class="v2Btn block" style="margin-top:10px" onclick="foodHomeMore(this)">Daha fazla restoran</button>';
}
window.foodResetFilters=function(){Object.assign(HF,{q:'',district:'',cuisine:'',open:false,mode:'',min:0});const i=document.getElementById('fdQ');if(i)i.value='';const d=document.getElementById('fdDistrict');if(d)d.value='';homeRender()};
function venueCard(v){
  const open=openNow(v);const eta=(+v.prep_time_min||20)+(v.delivery_mode==='pickup'?0:(+v.delivery_eta_min||30));
  return '<button type="button" class="fdCard fdVenue'+(open?'':' closed')+'" onclick="showFoodVenue(\''+E(v.id)+'\')">'+media(v,64,16)+
    '<div style="min-width:0;flex:1"><h3>'+E(v.name)+'</h3><div class="fdMuted">'+E([v.cuisine_type,v.district].filter(Boolean).join(' · ')||'Restoran')+'</div>'+
    '<div class="fdMeta"><span class="fdPill '+(open?'ok':'off')+'">'+(open?'🟢 Açık':'⚪ Kapalı')+'</span>'+
    (v.rating_count?'<span class="fdPill acc">⭐ '+(+v.rating_avg).toFixed(1)+' ('+v.rating_count+')</span>':'')+
    '<span class="fdPill">⏱ '+eta+' dk</span>'+
    (v.delivery_mode!=='pickup'?'<span class="fdPill">🛵 '+(+v.delivery_fee_kurus?M(v.delivery_fee_kurus):'Ücretsiz teslimat')+'</span>':'')+
    (v.delivery_mode!=='self_delivery'?'<span class="fdPill">🛍️ Gel-al</span>':'')+
    (+v.min_order_amount?'<span class="fdPill">Min. '+M(v.min_order_amount)+'</span>':'')+'</div></div></button>';
}

/* ====================== Restoran ====================== */
let VENUE=null;
async function showFoodVenue(id){
  if(!A())return;const tok=newScreen();
  render(back('showFoodHome()','Restoranlar')+'<div style="margin-top:10px">'+skel(4)+'</div>');
  try{
    const enc=encodeURIComponent(id);
    const [vs,cats,items,groups]=await Promise.all([
      Q('GET','food_venues?select=id,name,description,district,address_text,phone,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,platform_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,cover_url,rating_avg,rating_count&id=eq.'+enc),
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc')
    ]);
    if(!alive(tok))return;
    const v=vs&&vs[0];if(!v)return render(back('showFoodHome()','Restoranlar')+empty('🔍','Restoran bulunamadı.'));
    const gByItem={};(groups||[]).forEach(g=>{(gByItem[g.menu_item_id]=gByItem[g.menu_item_id]||[]).push(Object.assign(g,{food_item_options:(g.food_item_options||[]).sort((a,b)=>a.sort_order-b.sort_order)}))});
    const activeCat=new Set((cats||[]).map(c=>c.id));
    const vis=(items||[]).filter(i=>!i.category_id||activeCat.has(i.category_id));
    VENUE={v,items:vis,groups:gByItem};
    const open=openNow(v);
    const secs=(cats||[]).map(c=>({c,items:vis.filter(i=>i.category_id===c.id)})).filter(s=>s.items.length);
    const other=vis.filter(i=>!i.category_id);if(other.length)secs.push({c:{id:'other',name:'Diğer'},items:other});
    render(back('showFoodHome()','Restoranlar')+
      (v.cover_url?'<img class="fdCover" src="'+E(v.cover_url)+'" alt="">':'<div style="height:8px"></div>')+
      '<div style="display:flex;gap:12px;align-items:center">'+media(v,64,16)+'<div style="min-width:0"><h1 style="margin:0">'+E(v.name)+'</h1><div class="fdMuted">'+E([v.cuisine_type,v.district].filter(Boolean).join(' · '))+'</div></div></div>'+
      '<div class="fdMeta" style="margin:10px 0"><span class="fdPill '+(open?'ok':'off')+'">'+(open?'🟢 Şu an açık':'⚪ Şu an sipariş almıyor')+'</span>'+
      (v.rating_count?'<span class="fdPill acc">⭐ '+(+v.rating_avg).toFixed(1)+' · '+v.rating_count+' değerlendirme</span>':'')+
      '<span class="fdPill">⏱ Hazırlık ~'+v.prep_time_min+' dk'+(v.delivery_mode!=='pickup'?' + teslimat ~'+v.delivery_eta_min+' dk':'')+'</span>'+
      (v.delivery_mode!=='pickup'?'<span class="fdPill">🛵 Teslimat '+(+v.delivery_fee_kurus?M(v.delivery_fee_kurus):'ücretsiz')+'</span>':'')+
      (+v.min_order_amount?'<span class="fdPill">Min. sepet '+M(v.min_order_amount)+'</span>':'')+
      (+v.platform_fee_kurus?'<span class="fdPill">Hizmet bedeli '+M(v.platform_fee_kurus)+'</span>':'')+'</div>'+
      (v.description?'<p class="fdMuted">'+E(v.description)+'</p>':'')+
      '<details class="fdInfo"><summary><b>Restoran bilgileri</b></summary><div class="fdKV" style="margin-top:8px"><span>Adres</span><b>'+E(v.address_text||v.district||'—')+'</b><span>Saatler</span><b>'+E(hoursText(v.working_hours))+'</b><span>Sipariş</span><b>'+E(v.delivery_mode==='both'?'Teslimat ve gel-al':v.delivery_mode==='pickup'?'Yalnızca gel-al':'Yalnızca teslimat')+'</b></div></details>'+
      (!open?'<div class="fdIssues">Restoran şu an sipariş almıyor. Menüye göz atabilir, açıldığında sipariş verebilirsin.</div>':'')+
      (secs.length>1?'<div class="fdCats"><div class="fdChips">'+secs.map(s=>'<button type="button" class="fdChip" onclick="document.getElementById(\'fdSec-'+E(s.c.id)+'\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">'+E(s.c.name)+'</button>').join('')+'</div></div>':'')+
      (secs.length?secs.map(s=>'<h2 id="fdSec-'+E(s.c.id)+'">'+E(s.c.name)+'</h2><div class="fdCard" style="padding:0 14px">'+s.items.map(i=>itemRow(i,gByItem[i.id])).join('')+'</div>').join(''):empty('📋','Menü henüz eklenmemiş.')));
    document.getElementById('fdRoot').dataset.sticky='1';
    document.getElementById('fdRoot').insertAdjacentHTML('beforeend',stickyCart());
  }catch(e){if(alive(tok))render(back('showFoodHome()','Restoranlar')+'<div style="margin-top:10px">'+errBox(e,'showFoodVenue(\''+E(id)+'\')')+'</div>')}
}
function itemRow(i,groups){
  const na=!i.is_available;const hasReq=(groups||[]).some(g=>g.is_required||g.min_select>0);
  return '<div class="fdItem'+(na?' na':'')+'" '+(na?'':'role="button" tabindex="0" onclick="foodOpenItem(\''+E(i.id)+'\')"')+'>'+media(i,64,14)+
    '<div class="grow"><b>'+E(i.name)+'</b>'+(i.description?'<p>'+E(i.description)+'</p>':'')+
    '<div style="margin-top:4px;font-weight:800">'+M(i.price_kurus)+(groups&&groups.length?' <span class="fdPill">Seçenekli</span>':'')+(na?' <span class="fdPill off">Tükendi</span>':'')+'</div></div>'+
    (na?'':'<button type="button" class="fdPlus" aria-label="'+E(i.name)+' ekle" onclick="event.stopPropagation();'+(hasReq?'foodOpenItem':'foodQuickAdd')+'(\''+E(i.id)+'\')">+</button>')+'</div>';
}
window.foodQuickAdd=async function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i)return;
  await cartAdd(VENUE.v,{key:i.id+'|',menu_item_id:i.id,name:i.name,quantity:1,option_ids:[],options_label:'',unit_kurus:i.price_kurus});
};
window.foodOpenItem=function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i||!i.is_available)return;
  const groups=VENUE.groups[i.id]||[];let qty=1;
  const w=modal((i.image_url?'<img class="fdCover" src="'+E(i.image_url)+'" alt="">':'')+
    '<h3 style="font-size:19px">'+E(i.name)+'</h3>'+(i.description?'<p class="fdMuted">'+E(i.description)+'</p>':'')+
    '<div style="font-weight:900;font-size:16px">'+M(i.price_kurus)+'</div>'+
    groups.map(g=>{
      const multi=g.kind!=='single'||g.max_select>1;const req=g.is_required||g.min_select>0;
      const hint=g.kind==='remove'?'İstemediklerini seç':multi?(g.min_select?'En az '+g.min_select+', ':'')+'en fazla '+g.max_select+' seçim':'Bir seçim yap';
      return '<div class="fdGroupH"><b>'+E(g.name)+'</b>'+(req?'<span class="fdReq">Zorunlu</span>':'<span class="fdMuted fdSmall">İsteğe bağlı</span>')+'</div><div class="fdMuted fdSmall">'+E(hint)+'</div>'+
        g.food_item_options.map(o=>'<label class="fdOpt'+(o.is_available?'':' na')+'"><input type="'+(multi?'checkbox':'radio')+'" name="g'+E(g.id)+'" value="'+E(o.id)+'" data-g="'+E(g.id)+'" data-p="'+(+o.price_delta_kurus||0)+'"'+(o.is_available?'':' disabled')+'><span class="grow">'+(g.kind==='remove'?'Çıkar: ':'')+E(o.name)+(o.is_available?'':' (tükendi)')+'</span>'+(+o.price_delta_kurus?'<b>+'+M(o.price_delta_kurus)+'</b>':'')+'</label>').join('');
    }).join('')+
    '<div class="fdErr" id="fdItemErr" hidden></div>'+
    '<div style="display:flex;gap:10px;align-items:center;margin-top:14px"><div class="fdQty"><button type="button" data-q="-1" aria-label="Azalt">−</button><b id="fdIQ">1</b><button type="button" data-q="1" aria-label="Artır">+</button></div>'+
    '<button type="button" class="v2Btn pri" style="flex:1" id="fdIAdd">Sepete ekle · <span id="fdIP">'+M(i.price_kurus)+'</span></button></div>',{sheet:true});
  const calc=()=>{const sel=[...w.querySelectorAll('input:checked')];const add=sel.reduce((n,x)=>n+(+x.dataset.p||0),0);w.querySelector('#fdIP').textContent=M((i.price_kurus+add)*qty);w.querySelector('#fdIQ').textContent=qty;return{sel,add}};
  w.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{qty=Math.max(1,Math.min(50,qty+(+b.dataset.q)));calc()});
  w.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{
    const er=w.querySelector('#fdItemErr');if(er)er.hidden=true;
    const g=groups.find(x=>x.id===inp.dataset.g);
    if(g&&inp.type==='checkbox'){const n=w.querySelectorAll('input[data-g="'+g.id+'"]:checked').length;if(n>g.max_select){inp.checked=false;toast(g.name+': en fazla '+g.max_select+' seçim','warn')}}
    calc();
  });
  w.querySelector('#fdIAdd').onclick=async()=>{
    const {sel,add}=calc();const err=w.querySelector('#fdItemErr');
    for(const g of groups){const n=sel.filter(x=>x.dataset.g===g.id).length;const need=g.is_required?Math.max(1,g.min_select):g.min_select;
      if(n<need){err.hidden=false;err.textContent=g.name+' seçimi gerekli.';return}}
    const ids=sel.map(x=>x.value).sort();
    const label=groups.map(g=>{const os=g.food_item_options.filter(o=>ids.includes(o.id));return os.length?(g.kind==='remove'?'Çıkar: ':'')+os.map(o=>o.name).join(', '):''}).filter(Boolean).join(' · ');
    closeModal();
    await cartAdd(VENUE.v,{key:i.id+'|'+ids.join(','),menu_item_id:i.id,name:i.name,quantity:qty,option_ids:ids,options_label:label,unit_kurus:i.price_kurus+add});
  };
};

/* ====================== Sepet + Checkout ====================== */
const CO={fulfillment:null,addressId:null,addressText:'',phone:'',note:'',payment:'cash_on_delivery',quote:null,addrs:[],newAddr:false,lat:null,lng:null};
async function showFoodCart(){
  if(!A())return;const tok=newScreen();const c=cartGet();
  if(!c.items.length)return render(back('showFoodHome()','Restoranlar')+'<h1 style="margin-top:12px">Sepetim</h1>'+empty('🛒','Sepetin boş.','<div style="margin-top:10px"><button type="button" class="v2Btn pri" onclick="showFoodHome()">Restoranları keşfet</button></div>'));
  const vm=(c.venue&&c.venue.delivery_mode)||'both';
  if(!CO.fulfillment||(CO.fulfillment==='pickup'&&vm==='self_delivery')||(CO.fulfillment==='delivery'&&vm==='pickup'))CO.fulfillment=vm==='pickup'?'pickup':'delivery';
  CO.phone=CO.phone||localStorage.getItem(PHONE_KEY)||'';
  render(back('showFoodVenue(\''+E(c.venue.id)+'\')',c.venue.name)+'<h1 style="margin-top:12px">Sepetim</h1><div class="fdMuted">'+E(c.venue.name)+'</div>'+
    '<div class="fdCard" id="fdLines" style="margin-top:10px"></div>'+
    '<h2>Teslimat</h2><div class="fdSeg"><button type="button" id="fdFD" '+(vm==='pickup'?'disabled':'')+' onclick="foodSetFul(\'delivery\')">🛵 Teslimat</button><button type="button" id="fdFP" '+(vm==='self_delivery'?'disabled':'')+' onclick="foodSetFul(\'pickup\')">🛍️ Gel-al</button></div>'+
    '<div id="fdAddr"></div>'+
    '<div class="fdForm"><label for="fdPhone">Telefon</label><input id="fdPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" value="'+E(CO.phone)+'">'+
    '<label for="fdNote">Sipariş notu <span class="fdMuted">(isteğe bağlı)</span></label><textarea id="fdNote" rows="2" maxlength="500" placeholder="Örn. zili çalmayın, acısız olsun">'+E(CO.note)+'</textarea></div>'+
    '<h2>Ödeme</h2><div class="fdRadio" id="fdPay">'+Object.entries(PAY).map(([k,l])=>'<label class="'+(CO.payment===k?'on':'')+'"><input type="radio" name="fdPay" value="'+k+'"'+(CO.payment===k?' checked':'')+'><span><b>'+E(l)+'</b><div class="fdMuted fdSmall">'+(k==='agree_with_venue'?'Ödeme şeklini restoranla konuşursun.':'Teslimatta ödersin.')+'</div></span></label>').join('')+'</div>'+
    '<div class="fdInfo">💳 Online ödeme henüz aktif değil; ödemeyi teslimatta yaparsın.</div>'+
    '<h2>Özet</h2><div class="fdCard" id="fdSum">'+skel(1)+'</div>'+
    '<div class="fdSticky"><div><div class="fdSmall fdMuted">Toplam</div><b id="fdTot">…</b></div><button type="button" class="v2Btn pri" id="fdPlace" disabled onclick="foodPlaceOrder(this)">Siparişi onayla</button></div>');
  document.getElementById('fdPhone').addEventListener('input',e=>{CO.phone=e.target.value});
  document.getElementById('fdNote').addEventListener('input',e=>{CO.note=e.target.value});
  document.querySelectorAll('input[name=fdPay]').forEach(r=>r.onchange=()=>{CO.payment=r.value;document.querySelectorAll('#fdPay label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked))});
  cartLines();segSync();
  try{CO.addrs=await Q('GET','saved_addresses?select=id,label,district,neighborhood,address_note,lat,lng&order=created_at.desc&limit=20')||[]}catch(e){CO.addrs=[]}
  if(!alive(tok))return;
  if(CO.addressId&&!CO.addrs.some(a=>a.id===CO.addressId))CO.addressId=null;
  if(!CO.addressId&&!CO.addressText&&CO.addrs.length)CO.addressId=CO.addrs[0].id;
  addrRender();quote();
}
function segSync(){const d=document.getElementById('fdFD'),p=document.getElementById('fdFP');if(d)d.classList.toggle('on',CO.fulfillment==='delivery');if(p)p.classList.toggle('on',CO.fulfillment==='pickup')}
window.foodSetFul=function(f){CO.fulfillment=f;segSync();addrRender();quote()};
function cartLines(q){
  const c=cartGet();const el=document.getElementById('fdLines');if(!el)return;
  const ql=q&&q.lines||[];
  el.innerHTML=c.items.map((x,idx)=>{const s=ql[idx];const line=s?s.line_total_kurus:(x.unit_kurus*x.quantity);
    return '<div class="fdItem" style="cursor:default"><div class="grow"><b>'+E(x.name)+'</b>'+(x.options_label?'<p>'+E(x.options_label)+'</p>':'')+'<div class="fdSmall fdMuted">'+M(s?s.unit_price_kurus:x.unit_kurus)+' / adet</div></div>'+
      '<div style="text-align:right"><div class="fdQty"><button type="button" aria-label="Azalt" onclick="foodQty('+idx+',-1)">'+(x.quantity===1?'🗑':'−')+'</button><b>'+x.quantity+'</b><button type="button" aria-label="Artır" onclick="foodQty('+idx+',1)">+</button></div><div style="font-weight:800;margin-top:4px">'+M(line)+'</div></div></div>'}).join('')+
    '<button type="button" class="fdLink" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">+ Ürün ekle</button>';
}
window.foodQty=async function(idx,d){
  const c=cartGet();const x=c.items[idx];if(!x)return;
  if(x.quantity+d<=0){const ok=await confirmBox('Ürün çıkarılsın mı?',x.name+' sepetten çıkarılacak.','Çıkar',true);if(!ok)return;c.items.splice(idx,1)}
  else x.quantity=Math.min(50,x.quantity+d);
  cartSave(c);if(!c.items.length){CO.quote=null;return showFoodCart()}cartLines(null);quote();
};
function addrRender(){
  const el=document.getElementById('fdAddr');if(!el)return;
  if(CO.fulfillment==='pickup'){el.innerHTML='<div class="fdInfo">🛍️ Siparişini restorandan kendin alacaksın. Hazır olduğunda bildirim gelir.</div>';return}
  el.innerHTML='<div class="fdRadio">'+CO.addrs.map(a=>'<label class="'+(CO.addressId===a.id?'on':'')+'"><input type="radio" name="fdAd" value="'+E(a.id)+'"'+(CO.addressId===a.id?' checked':'')+'><span><b>'+E(a.label)+'</b><div class="fdMuted fdSmall">'+E([a.neighborhood,a.district].filter(Boolean).join(', '))+(a.address_note?' · '+E(a.address_note):'')+(a.lat?' · 📍 konumlu':'')+'</div></span></label>').join('')+
    '<label class="'+(!CO.addressId?'on':'')+'"><input type="radio" name="fdAd" value=""'+(!CO.addressId?' checked':'')+'><span><b>Bu sipariş için adres yaz</b></span></label></div>'+
    (!CO.addressId?'<div class="fdForm"><textarea id="fdAT" rows="3" maxlength="500" placeholder="Mahalle, sokak, bina no, daire, tarif…">'+E(CO.addressText)+'</textarea>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button type="button" class="v2Btn sm" onclick="foodGeo(this)">📍 '+(CO.lat?'Konum eklendi ✓':'Konumumu ekle')+'</button><button type="button" class="v2Btn sm" onclick="foodSaveAddr(this)">💾 Adreslerime kaydet</button></div></div>':
      '<div class="fdForm"><label for="fdAT2">Ek adres tarifi <span class="fdMuted">(isteğe bağlı)</span></label><input id="fdAT2" maxlength="200" placeholder="Kat, daire, kapı kodu" value="'+E(CO.addressText)+'"></div>');
  el.querySelectorAll('input[name=fdAd]').forEach(r=>r.onchange=()=>{CO.addressId=r.value||null;CO.addressText='';addrRender();quote()});
  const at=document.getElementById('fdAT');if(at)at.addEventListener('input',e=>{CO.addressText=e.target.value});
  const at2=document.getElementById('fdAT2');if(at2)at2.addEventListener('input',e=>{CO.addressText=e.target.value});
}
window.foodGeo=function(btn){
  if(!navigator.geolocation)return toast('Cihazın konum paylaşımını desteklemiyor.','warn');
  btn.disabled=true;btn.textContent='Konum alınıyor…';
  navigator.geolocation.getCurrentPosition(p=>{CO.lat=+p.coords.latitude.toFixed(6);CO.lng=+p.coords.longitude.toFixed(6);btn.disabled=false;btn.textContent='📍 Konum eklendi ✓';quote()},
    ()=>{btn.disabled=false;btn.textContent='📍 Konumumu ekle';toast('Konum alınamadı. İzinleri kontrol et.','warn')},{enableHighAccuracy:false,timeout:10000,maximumAge:120000});
};
window.foodSaveAddr=async function(btn){
  const t=(CO.addressText||'').trim();if(t.length<10)return toast('Önce adresi açık şekilde yaz.','warn');
  const label=await promptBox('Adrese bir ad ver','Ev, İş…',{chips:['Ev','İş','Aile'],required:true,okLabel:'Kaydet'});if(!label)return;
  await once('saveAddr',btn,async()=>{
    try{const r=await Q('POST','saved_addresses',{user_id:UID(),label:label.slice(0,40),address_note:t,lat:CO.lat,lng:CO.lng});
      const a=r&&r[0];if(a){CO.addrs.unshift(a);CO.addressId=a.id;CO.addressText=''}addrRender();quote();toast('Adres kaydedildi')}
    catch(e){toast(errMsg(e),'err')}
  });
};
function cartPayload(){return cartGet().items.map(x=>({menu_item_id:x.menu_item_id,quantity:x.quantity,option_ids:x.option_ids||[]}))}
let QSEQ=0;
const quote=debounce(async()=>{
  const c=cartGet();if(!c.items.length)return;const seq=++QSEQ;
  const sum=document.getElementById('fdSum');const btn=document.getElementById('fdPlace');if(btn)btn.disabled=true;
  try{
    const q=await RPC('food_price_cart',{p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_address_id:CO.fulfillment==='delivery'?CO.addressId:null,p_lat:CO.fulfillment==='delivery'&&!CO.addressId?CO.lat:null,p_lng:CO.fulfillment==='delivery'&&!CO.addressId?CO.lng:null});
    if(seq!==QSEQ||!document.getElementById('fdSum'))return;
    CO.quote=q;cartLines(q);
    // sunucu fiyatını sepete yansıt (gösterim tutarlılığı)
    const cc=cartGet();(q.lines||[]).forEach((l,i)=>{if(cc.items[i])cc.items[i].unit_kurus=l.unit_price_kurus});cartSave(cc,true);
    sum.innerHTML='<div class="fdLine"><span>Ara toplam</span><b>'+M(q.subtotal_kurus)+'</b></div>'+
      (CO.fulfillment==='delivery'?'<div class="fdLine"><span>Teslimat ücreti</span><b>'+(q.delivery_fee_kurus?M(q.delivery_fee_kurus):'Ücretsiz')+'</b></div>':'')+
      (q.platform_fee_kurus?'<div class="fdLine"><span>Hizmet bedeli</span><b>'+M(q.platform_fee_kurus)+'</b></div>':'')+
      (q.discount_kurus?'<div class="fdLine"><span>İndirim</span><b>−'+M(q.discount_kurus)+'</b></div>':'')+
      '<div class="fdLine total"><span>Toplam</span><span>'+M(q.total_kurus)+'</span></div>'+
      '<div class="fdLine sub"><span>Tahmini süre</span><span>~'+((+q.prep_time_min||0)+(CO.fulfillment==='delivery'?(+q.delivery_eta_min||0):0))+' dk</span></div>'+
      (q.issues&&q.issues.length?'<div class="fdIssues">'+q.issues.map(i=>'<div>• '+E(i.message)+'</div>').join('')+'</div>':'');
    document.getElementById('fdTot').textContent=M(q.total_kurus);
    if(btn){btn.disabled=!q.ok;btn.textContent=q.ok?'Siparişi onayla · '+M(q.total_kurus):'Siparişi onayla'}
  }catch(e){if(seq!==QSEQ||!sum)return;sum.innerHTML=errBox(e);if(btn)btn.disabled=true}
},350);
window.foodPlaceOrder=async function(btn){
  const c=cartGet();if(!c.items.length)return;
  const phone=(CO.phone||'').trim();const digits=phone.replace(/\D/g,'');
  if(digits.length<10||digits.length>13){toast('Geçerli bir telefon numarası gir.','warn');document.getElementById('fdPhone')?.focus();return}
  if(CO.fulfillment==='delivery'&&!CO.addressId&&(CO.addressText||'').trim().length<10){toast('Teslimat adresini açık şekilde yaz.','warn');document.getElementById('fdAT')?.focus();return}
  if(!CO.quote||!CO.quote.ok){toast('Sepetteki uyarıları gidermelisin.','warn');return}
  if(!c.req){c.req=uuid();cartSave(c,true)}
  const body={p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_phone:phone,p_note:CO.note||null,p_payment_method:CO.payment,
    p_client_request_id:c.req,p_address_id:CO.fulfillment==='delivery'?CO.addressId:null,p_address_text:CO.fulfillment==='delivery'?(CO.addressText||null):null,
    p_lat:CO.fulfillment==='delivery'&&!CO.addressId?CO.lat:null,p_lng:CO.fulfillment==='delivery'&&!CO.addressId?CO.lng:null};
  await once('placeOrder',btn,async()=>{
    let r=null,lastErr=null;
    for(let attempt=0;attempt<3&&!r;attempt++){
      try{r=await RPC('food_place_order',body)}
      catch(e){lastErr=e;if(!isNetErr(e))break;await sleep(1200*(attempt+1))} // aynı istek kimliği → sunucu çift sipariş oluşturmaz
    }
    if(!r){toast(errMsg(lastErr),'err');if(!isNetErr(lastErr))quote();return}
    localStorage.setItem(PHONE_KEY,phone);
    localStorage.removeItem(CART_KEY);CO.quote=null;CO.note='';
    toast(r.duplicate?'Bu sipariş zaten oluşturulmuştu.':'Siparişin restorana iletildi!');
    showFoodOrderDetail(r.order_id);
  });
};

/* ====================== Siparişlerim ====================== */
const OL={tab:'active',rows:[],offset:0,done:false};
async function showFoodOrders(){
  if(!A())return;const tok=newScreen();OL.rows=[];OL.offset=0;OL.done=false;
  render(back('showFoodHome()','Yemek')+headerBar('Siparişlerim','Aktif ve geçmiş siparişler').replace('fdTop','fdTop" style="margin-top:10px')+
    '<div class="fdSeg"><button type="button" id="fdOA" onclick="foodOrdersTab(\'active\')">Aktif</button><button type="button" id="fdOH" onclick="foodOrdersTab(\'past\')">Geçmiş</button></div>'+
    '<div id="fdOList">'+skel(3)+'</div><div id="fdOMore"></div>');
  bellCount();await ordersLoad(tok);
  watch(tok,[{table:'food_orders',filter:'customer_id=eq.'+UID()},{table:'food_notifications',filter:'user_id=eq.'+UID()}],async(kind,p)=>{
    if(p&&p.table==='food_notifications'){bellCount();return}
    OL.rows=[];OL.offset=0;OL.done=false;await ordersLoad(tok);
  });
}
async function ordersLoad(tok){
  try{
    const rows=await Q('GET','food_orders?select=id,status,total_kurus,created_at,delivery_mode,venue_id,food_venues(name,image_url)&customer_id=eq.'+UID()+'&order=created_at.desc&limit=20&offset='+OL.offset);
    if(!alive(tok))return;OL.rows=OL.rows.concat(rows);OL.offset+=rows.length;OL.done=rows.length<20;ordersRender();
  }catch(e){const l=document.getElementById('fdOList');if(l)l.innerHTML=errBox(e,'showFoodOrders()')}
}
window.foodOrdersTab=function(t){OL.tab=t;ordersRender()};
window.foodOrdersMore=async function(btn){await once('ordersMore',btn,()=>ordersLoad(SCREEN))};
function ordersRender(){
  const a=document.getElementById('fdOA'),h=document.getElementById('fdOH');if(!a)return;a.classList.toggle('on',OL.tab==='active');h.classList.toggle('on',OL.tab==='past');
  const rows=OL.rows.filter(o=>OL.tab==='active'?!TERMINAL.includes(o.status):TERMINAL.includes(o.status));
  document.getElementById('fdOList').innerHTML=rows.length?rows.map(o=>'<button type="button" class="fdCard fdVenue" style="margin-bottom:10px" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">'+media({name:o.food_venues&&o.food_venues.name,image_url:o.food_venues&&o.food_venues.image_url},52,14)+
    '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(o.food_venues?o.food_venues.name:'Restoran')+'</b><b>'+M(o.total_kurus)+'</b></div>'+
    '<div class="fdMuted fdSmall">#'+NO(o.id)+' · '+ago(o.created_at)+' · '+E(MODE[o.delivery_mode]||'')+'</div><div style="margin-top:6px">'+badge(o.status)+'</div></div></button>').join(''):
    empty(OL.tab==='active'?'🍽️':'🧾',OL.tab==='active'?'Aktif siparişin yok.':'Geçmiş sipariş yok.',OL.tab==='active'?'<div style="margin-top:10px"><button type="button" class="v2Btn pri" onclick="showFoodHome()">Sipariş ver</button></div>':'');
  document.getElementById('fdOMore').innerHTML=OL.done?'':'<button type="button" class="v2Btn block" onclick="foodOrdersMore(this)">Daha fazla</button>';
}

/* ====================== Sipariş takip ====================== */
function steps(mode){
  if(mode==='pickup')return [['new','Sipariş alındı'],['accepted','Restoran onayladı'],['preparing','Hazırlanıyor'],['ready','Gel-al için hazır'],['delivered','Teslim alındı']];
  if(mode==='self_delivery')return [['new','Sipariş alındı'],['accepted','Restoran onayladı'],['preparing','Hazırlanıyor'],['ready','Hazır'],['on_the_way','Yolda'],['near_customer','Teslimata yaklaşıyor'],['delivered','Teslim edildi']];
  return [['new','Sipariş alındı'],['accepted','Restoran onayladı'],['preparing','Hazırlanıyor'],['courier_search','Kurye bekleniyor'],['courier_assigned','Kurye atandı'],['courier_at_venue','Kurye restoranda'],['picked_up','Kurye siparişi aldı'],['on_the_way','Yolda'],['near_customer','Teslimata yaklaşıyor'],['delivered','Teslim edildi']];
}
async function showFoodOrderDetail(id){
  if(!A())return;const tok=newScreen();
  render(back('showFoodOrders()','Siparişlerim')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  const load=async()=>{
    try{const t=await RPC('food_order_tracking',{p_order_id:id});if(alive(tok))trackRender(t)}
    catch(e){if(alive(tok)&&!document.getElementById('fdTrack'))render(back('showFoodOrders()','Siparişlerim')+'<div style="margin-top:10px">'+errBox(e,'showFoodOrderDetail(\''+E(id)+'\')')+'</div>')}
  };
  await load();
  watch(tok,[{table:'food_orders',filter:'id=eq.'+id},{table:'food_deliveries',filter:'order_id=eq.'+id}],()=>load());
}
let LAST_ST={};
function trackRender(t){
  const o=t.order,st=o.status,info=STL[st]||['•',st,''];
  if(LAST_ST[o.id]&&LAST_ST[o.id]!==st){toast(info[0]+' '+info[1]);try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}}
  LAST_ST[o.id]=st;
  const ev={};(t.events||[]).forEach(e=>{ev[e.to]=ev[e.to]||e.at});
  const seq=steps(o.delivery_mode);const idxMap={};seq.forEach((s,i)=>idxMap[s[0]]=i);
  const order=['new','accepted','preparing','ready','courier_search','courier_assigned','courier_at_venue','picked_up','on_the_way','near_customer','delivered'];
  let cur=idxMap[st];if(cur===undefined){const reached=order.filter(s=>ev[s]&&idxMap[s]!==undefined);cur=reached.length?idxMap[reached[reached.length-1]]:0;if(st==='ready'&&o.delivery_mode==='platform_delivery')cur=idxMap.courier_search}
  const bad=BAD.includes(st)||st==='refund_pending'||st==='refunded';
  const d=t.delivery;const cr=d&&d.courier;
  const eta=o.estimated_delivery_at&&!TERMINAL.includes(st)?'<div class="fdSmall" style="margin-top:6px">⏱ Tahmini '+(o.delivery_mode==='pickup'?'hazır olma':'teslimat')+': <b>'+hm(o.delivery_mode==='pickup'?o.estimated_ready_at:o.estimated_delivery_at)+'</b></div>':'';
  (document.getElementById('fdTrack')?patch:render)(back('showFoodOrders()','Siparişlerim')+
    '<div id="fdTrack" style="margin-top:10px"><div class="fdTop"><div class="grow"><b>'+E(t.venue.name)+'</b><div class="fdMuted fdSmall">#'+o.no+' · '+ago(o.created_at)+'</div></div><span class="fdLive" id="fdLive"></span></div>'+
    '<div class="fdHero"'+(bad?' style="background:rgba(220,38,38,.07)"':'')+'><div class="big">'+info[0]+'</div><h2>'+E(info[1])+'</h2><div class="fdMuted">'+E(st==='ready'&&o.delivery_mode==='pickup'?'Siparişin hazır, restorandan teslim alabilirsin.':info[2])+'</div>'+
      (o.cancel_reason&&bad?'<div class="fdIssues" style="margin-bottom:0">Sebep: '+E(o.cancel_reason)+'</div>':'')+eta+'</div>'+
    (t.delivery_code&&['new','accepted','preparing','ready','courier_search','courier_assigned','courier_at_venue','picked_up','on_the_way','near_customer'].includes(st)?
      '<div class="fdCodeBox"><div class="fdSmall"><b style="font-size:13px;letter-spacing:0;color:inherit;display:inline">Teslimat kodun</b></div><b>'+E(t.delivery_code)+'</b><div class="fdSmall fdMuted">Siparişi teslim alırken kuryeye söyle. Başkasıyla paylaşma.</div></div>':'')+
    (cr?'<div class="fdCard" style="margin-bottom:10px;display:flex;gap:12px;align-items:center"><div class="fdImg" style="width:48px;height:48px;border-radius:50%;font-size:24px">🛵</div><div style="flex:1"><b>'+E(cr.name)+'</b><div class="fdMuted fdSmall">'+E(VEH[cr.vehicle]||'')+(+cr.rating_avg?' · ⭐ '+(+cr.rating_avg).toFixed(1):'')+'</div>'+
      (d.location?'<a class="fdLink" target="_blank" rel="noopener" href="https://www.google.com/maps?q='+d.location.lat+','+d.location.lng+'">📍 Kuryenin son konumu ('+ago(d.location.at)+')</a>':'')+'</div>'+
      (cr.phone?'<a class="v2Btn sm" href="tel:'+E(cr.phone)+'">📞 Ara</a>':'')+'</div>':'')+
    (!bad?'<div class="fdCard"><ol class="fdTl">'+seq.map((s,i)=>'<li class="'+(i<cur||st==='delivered'?'done':i===cur?'cur':'')+'"><i></i>'+E(s[1])+(ev[s[0]]?'<small>'+hm(ev[s[0]])+'</small>':'')+'</li>').join('')+'</ol></div>':'')+
    '<h2>Sipariş</h2><div class="fdCard">'+t.items.map(i=>'<div class="fdLine"><span>'+i.quantity+'× '+E(i.name)+((i.options||[]).length?'<br><small class="fdMuted">'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</span><b>'+M(i.line_total_kurus)+'</b></div>').join('')+
      '<div class="fdLine" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px"><span>Ara toplam</span><span>'+M(o.subtotal_kurus)+'</span></div>'+
      (o.delivery_mode!=='pickup'?'<div class="fdLine"><span>Teslimat</span><span>'+(o.delivery_fee_kurus?M(o.delivery_fee_kurus):'Ücretsiz')+'</span></div>':'')+
      (o.platform_fee_kurus?'<div class="fdLine"><span>Hizmet bedeli</span><span>'+M(o.platform_fee_kurus)+'</span></div>':'')+
      (o.discount_kurus?'<div class="fdLine"><span>İndirim</span><span>−'+M(o.discount_kurus)+'</span></div>':'')+
      '<div class="fdLine total"><span>Toplam</span><span>'+M(o.total_kurus)+'</span></div>'+
      '<div class="fdKV" style="margin-top:10px"><span>Teslimat</span><b>'+E(MODE[o.delivery_mode]||'')+'</b><span>Ödeme</span><b>'+E(PAY[o.payment_method]||o.payment_method)+'</b>'+
      (o.address_text?'<span>Adres</span><b>'+E(o.address_text)+'</b>':'')+(o.phone?'<span>Telefon</span><b>'+E(o.phone)+'</b>':'')+(o.note?'<span>Not</span><b>'+E(o.note)+'</b>':'')+
      (t.venue.phone?'<span>Restoran</span><b><a href="tel:'+E(t.venue.phone)+'">'+E(t.venue.phone)+'</a></b>':'')+'</div></div>'+
    (t.review?'<div class="fdInfo">⭐ Değerlendirmen: restoran '+t.review.venue_rating+'/5'+(t.review.courier_rating?' · kurye '+t.review.courier_rating+'/5':'')+(t.review.comment?' — '+E(t.review.comment):'')+'</div>':'')+
    ((t.issues||[]).length?'<h2>Bildirdiğin sorunlar</h2>'+t.issues.map(x=>'<div class="fdCard" style="margin-bottom:8px"><b>'+E(ISSUE[x.type]||x.type)+'</b> <span class="fdPill">'+E({open:'Açık',in_review:'İnceleniyor',resolved:'Çözüldü',rejected:'Sonuçlandı'}[x.status]||x.status)+'</span>'+(x.description?'<div class="fdMuted fdSmall">'+E(x.description)+'</div>':'')+(x.resolution?'<div class="fdSmall" style="margin-top:4px">↳ '+E(x.resolution)+'</div>':'')+'</div>').join(''):'')+
    '<div class="fdActs">'+
      (t.can.cancel?'<button type="button" class="v2Btn fdGhostDanger" onclick="foodCustomerCancel(\''+E(o.id)+'\',this)">Siparişi iptal et</button>':'')+
      (t.can.review?'<button type="button" class="v2Btn pri" onclick="foodReview(\''+E(o.id)+'\','+(t.can.review_courier?'true':'false')+')">⭐ Değerlendir</button>':'')+
      (t.can.report?'<button type="button" class="v2Btn" onclick="foodIssue(\''+E(o.id)+'\')">⚠️ Sorun bildir</button>':'')+
      (TERMINAL.includes(st)?'<button type="button" class="v2Btn" onclick="foodReorder(\''+E(o.id)+'\',this)">🔁 Tekrar sipariş</button>':'')+
    '</div>'+
    (!t.can.cancel&&st!=='new'&&!TERMINAL.includes(st)?'<p class="fdMuted fdSmall" style="margin-top:10px">Restoran siparişi onayladıktan sonra iptal için restoranla iletişime geçebilir veya teslimattan sonra sorun bildirebilirsin.</p>':'')+
    '</div>');
}
window.foodCustomerCancel=async function(id,btn){
  const ok=await confirmBox('Sipariş iptal edilsin mi?','Restoran henüz onaylamadığı için ücretsiz iptal edebilirsin.','İptal et',true);if(!ok)return;
  await once('cancel'+id,btn,async()=>{try{await RPC('food_transition_order',{p_order_id:id,p_to:'cancelled',p_reason:'Müşteri iptal etti'});toast('Siparişin iptal edildi');showFoodOrderDetail(id)}catch(e){toast(errMsg(e),'err');showFoodOrderDetail(id)}});
};
window.foodReview=function(id,withCourier){
  let vr=0,cr=0;
  const stars=(k)=>'<div class="fdStars" data-k="'+k+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-n="'+n+'" aria-label="'+n+' yıldız">⭐</button>').join('')+'</div>';
  const w=modal('<h3>Siparişini değerlendir</h3><div class="fdMuted fdSmall">Restoran</div>'+stars('v')+(withCourier?'<div class="fdMuted fdSmall" style="margin-top:10px">Kurye</div>'+stars('c'):'')+
    '<textarea id="fdRvC" rows="3" maxlength="1000" placeholder="Yorumun (isteğe bağlı)"></textarea><div class="fdErr" id="fdRvE" hidden></div>'+
    '<div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Gönder</button></div>');
  w.querySelectorAll('.fdStars').forEach(g=>g.querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=+b.dataset.n;if(g.dataset.k==='v')vr=n;else cr=n;g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.n<=n))}));
  w.querySelector('[data-x=no]').onclick=closeModal;
  w.querySelector('[data-x=ok]').onclick=async function(){
    if(!vr){const e=w.querySelector('#fdRvE');e.hidden=false;e.textContent='Restorana puan ver.';return}
    await once('review'+id,this,async()=>{try{await RPC('food_submit_review',{p_order_id:id,p_venue_rating:vr,p_courier_rating:cr||null,p_comment:w.querySelector('#fdRvC').value||null});closeModal();toast('Teşekkürler, değerlendirmen kaydedildi');showFoodOrderDetail(id)}
      catch(e){const x=w.querySelector('#fdRvE');x.hidden=false;x.textContent=errMsg(e)}});
  };
};
window.foodIssue=function(id){
  const w=modal('<h3>Sorun bildir</h3><div class="fdRadio">'+Object.entries(ISSUE).map(([k,l],i)=>'<label class="'+(i?'':'on')+'"><input type="radio" name="fdIs" value="'+k+'"'+(i?'':' checked')+'><span>'+E(l)+'</span></label>').join('')+'</div>'+
    '<textarea id="fdIsD" rows="3" maxlength="1500" placeholder="Kısaca ne oldu?"></textarea><div class="fdErr" id="fdIsE" hidden></div>'+
    '<div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Gönder</button></div>');
  w.querySelectorAll('input[name=fdIs]').forEach(r=>r.onchange=()=>w.querySelectorAll('.fdRadio label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked)));
  w.querySelector('[data-x=no]').onclick=closeModal;
  w.querySelector('[data-x=ok]').onclick=async function(){
    const type=w.querySelector('input[name=fdIs]:checked').value;
    await once('issue'+id,this,async()=>{try{await RPC('food_report_issue',{p_order_id:id,p_type:type,p_description:w.querySelector('#fdIsD').value||null});closeModal();toast('Bildirimin restorana iletildi');showFoodOrderDetail(id)}
      catch(e){const x=w.querySelector('#fdIsE');x.hidden=false;x.textContent=errMsg(e)}});
  };
};
window.foodReorder=async function(id,btn){
  await once('reorder'+id,btn,async()=>{
    try{
      const t=await RPC('food_order_tracking',{p_order_id:id});
      const vs=await Q('GET','food_venues?select=id,name,delivery_mode,delivery_provider&id=eq.'+encodeURIComponent(t.venue.id));
      const v=vs&&vs[0];if(!v)throw new Error('Restoran artık aktif değil.');
      const c=cartGet();
      if(c.venue&&c.venue.id!==v.id&&c.items.length){const ok=await confirmBox('Sepetin değişecek','Mevcut sepetin boşaltılıp bu siparişin ürünleri eklensin mi?','Devam et',true);if(!ok)return}
      const items=t.items.filter(i=>i.menu_item_id).map(i=>{const ids=(i.options||[]).map(o=>o.option_id).filter(Boolean).sort();
        return{key:i.menu_item_id+'|'+ids.join(','),menu_item_id:i.menu_item_id,name:i.name,quantity:i.quantity,option_ids:ids,options_label:(i.options||[]).map(o=>(o.kind==='remove'?'Çıkar: ':'')+o.option).join(', '),unit_kurus:i.unit_price_kurus}});
      if(!items.length)throw new Error('Bu siparişin ürünleri menüde bulunamadı.');
      cartSave({venue:{id:v.id,name:v.name,delivery_mode:v.delivery_mode,delivery_provider:v.delivery_provider},items});
      toast('Ürünler sepete eklendi. Güncel fiyatlar sepette gösterilir.');showFoodCart();
    }catch(e){toast(errMsg(e),'err')}
  });
};

/* ====================== Bildirimler ====================== */
async function showFoodNotifications(){
  if(!A())return;const tok=newScreen();
  render(back('showFoodHome()','Yemek')+'<div class="fdTop" style="margin-top:10px"><h1 class="grow" style="margin:0">Bildirimler</h1><button type="button" class="v2Btn sm" onclick="foodReadAll(this)">Tümünü okundu yap</button></div><div id="fdNList">'+skel(3)+'</div>');
  const load=async()=>{
    try{const r=await Q('GET','food_notifications?select=id,order_id,type,title,body,read_at,created_at&order=created_at.desc&limit=40');if(!alive(tok))return;
      document.getElementById('fdNList').innerHTML=r.length?r.map(n=>'<button type="button" class="fdCard fdVenue" style="margin-bottom:8px'+(n.read_at?';opacity:.7':'')+'" onclick="foodOpenNotif(\''+E(n.id)+'\',\''+E(n.order_id||'')+'\',\''+E(n.type)+'\')"><div style="font-size:22px">'+(n.read_at?'🔕':'🔔')+'</div><div style="flex:1;min-width:0"><b>'+E(n.title)+'</b><div class="fdMuted fdSmall">'+E(n.body||'')+'</div><div class="fdMuted fdSmall">'+ago(n.created_at)+'</div></div></button>').join(''):empty('🔔','Henüz bildirimin yok.')}
    catch(e){const l=document.getElementById('fdNList');if(l)l.innerHTML=errBox(e,'showFoodNotifications()')}
  };
  await load();watch(tok,[{table:'food_notifications',filter:'user_id=eq.'+UID()}],()=>load());
}
window.foodReadAll=async function(btn){await once('readAll',btn,async()=>{try{await RPC('food_mark_notifications_read',{p_ids:null});showFoodNotifications()}catch(e){toast(errMsg(e),'err')}})};
window.foodOpenNotif=async function(id,orderId,type){
  RPC('food_mark_notifications_read',{p_ids:[id]}).catch(()=>{});
  if(type.indexOf('courier')===0)return showFoodCourier();
  if(type.indexOf('venue')===0){const w=await whoami().catch(()=>null);if(w&&w.venues&&w.venues.length)return showFoodBusiness()}
  if(orderId)return showFoodOrderDetail(orderId);
};

/* ====================== Restoran paneli ====================== */
const SECTIONS=[['new','Yeni'],['preparing','Hazırlanan'],['ready','Hazır'],['courier_wait','Kurye bekleyen'],['active_delivery','Teslimatta'],['done','Tamamlanan'],['cancelled','İptaller']];
const BZ={venueId:null,role:null,section:'new',offset:0,orders:[],venue:null};
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.08;o.start();setTimeout(()=>{o.stop();c.close()},220)}catch(e){}}
async function showFoodBusiness(venueId){
  if(!A())return;const tok=newScreen();
  render(back('showFoodHome()','Yemek')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  let w;try{w=await whoami(true)}catch(e){return render(back('showFoodHome()','Yemek')+'<div style="margin-top:10px">'+errBox(e,'showFoodBusiness()')+'</div>')}
  if(!alive(tok))return;
  const venues=w.venues||[];
  if(!venues.length)return venueCreateForm();
  const pick=venueId||localStorage.getItem(VENUE_KEY);
  const cur=venues.find(v=>v.id===pick)||venues[0];
  localStorage.setItem(VENUE_KEY,cur.id);BZ.venueId=cur.id;BZ.role=cur.role;BZ.offset=0;BZ.orders=[];
  let v;try{v=(await Q('GET','food_venues?select=id,name,is_open,is_active,working_hours,delivery_mode,delivery_provider&id=eq.'+cur.id))[0]}catch(e){}
  if(!alive(tok))return;BZ.venue=v||{id:cur.id,name:cur.name};
  const mgr=cur.role==='owner'||cur.role==='manager';
  render(back('showFoodHome()','Yemek')+
    '<div class="fdTop" style="margin-top:10px"><div class="grow"><h1 style="margin:0">🏪 '+E(BZ.venue.name)+'</h1><div class="fdMuted fdSmall">'+E({owner:'İşletme sahibi',manager:'Yönetici',staff:'Personel'}[cur.role]||'')+'</div></div><span class="fdLive" id="fdLive"></span>'+
    '<button type="button" class="fdIconBtn" id="fdBell" aria-label="Bildirimler" onclick="showFoodNotifications()">🔔</button></div>'+
    (venues.length>1||cur.role==='owner'?'<div class="fdChips">'+venues.map(x=>'<button type="button" class="fdChip'+(x.id===cur.id?' on':'')+'" onclick="showFoodBusiness(\''+E(x.id)+'\')">'+E(x.name)+'</button>').join('')+'<button type="button" class="fdChip" onclick="foodNewVenue()">+ Yeni işletme</button></div>':'')+
    (v?'<div class="fdCard" style="display:flex;align-items:center;gap:12px;margin:6px 0 10px"><div style="flex:1"><b>'+(v.is_open?'🟢 Sipariş alıyor':'⚪ Sipariş almıyor')+'</b><div class="fdMuted fdSmall">'+(v.is_open&&!openNow(v)&&v.is_active?'Açık ama şu an çalışma saati dışında':'Müşteriler '+(v.is_open?'sipariş verebilir':'menüyü görür, sipariş veremez'))+'</div></div>'+
      (mgr?'<button type="button" class="v2Btn '+(v.is_open?'':'pri')+'" onclick="foodToggleOpen(this,'+(!v.is_open)+')">'+(v.is_open?'Kapat':'Aç')+'</button>':'')+'</div>':'')+
    '<div class="fdRoles">'+(mgr?'<button type="button" onclick="showFoodMenu(\''+E(cur.id)+'\')">📋 Menü</button><button type="button" onclick="showFoodSettings(\''+E(cur.id)+'\')">⚙️ Ayarlar</button>':'')+
      '<button type="button" onclick="showFoodVenueIssues(\''+E(cur.id)+'\')">⚠️ Sorunlar</button>'+(cur.role==='owner'?'<button type="button" onclick="showFoodTeam(\''+E(cur.id)+'\')">👥 Ekip</button>':'')+'</div>'+
    '<div class="fdKpi" id="fdKpi"></div><div class="fdTabs" id="fdTabs"></div><div id="fdBList">'+skel(2)+'</div><div id="fdBMore"></div>');
  bellCount();
  await bizLoad(tok,false);
  let lastIds=new Set(BZ.orders.map(o=>o.id));
  watch(tok,[{table:'food_orders',filter:'venue_id=eq.'+cur.id}],debounce(async(kind,p)=>{
    if(p&&p.eventType==='INSERT'){toast('🔔 Yeni sipariş geldi!');beep();try{navigator.vibrate&&navigator.vibrate([120,60,120])}catch(e){}}
    await bizLoad(tok,false);
  },400));
}
async function bizLoad(tok,more){
  try{
    const r=await RPC('food_venue_orders',{p_venue_id:BZ.venueId,p_section:BZ.section,p_limit:20,p_offset:more?BZ.offset:0});
    if(!alive(tok))return;
    BZ.orders=more?BZ.orders.concat(r.orders):r.orders;BZ.offset=BZ.orders.length;
    const s=r.summary||{},c=r.counts||{};
    document.getElementById('fdKpi').innerHTML='<div><b>'+(s.today_orders||0)+'</b><span>Bugünkü sipariş</span></div><div><b>'+(s.today_delivered||0)+'</b><span>Tamamlanan</span></div><div><b>'+M(s.today_revenue_kurus||0)+'</b><span>Bugünkü hakedişin</span></div><div><b>'+(s.today_cancelled||0)+'</b><span>İptal / red</span></div><div><b>'+(s.avg_prep_min!=null?s.avg_prep_min+' dk':'—')+'</b><span>Ort. hazırlık</span></div>';
    document.getElementById('fdTabs').innerHTML=SECTIONS.map(([k,l])=>'<button type="button" class="'+(BZ.section===k?'on':'')+'" onclick="foodBizTab(\''+k+'\')">'+E(l)+' <em class="'+(c[k]?'':'z')+'">'+(c[k]||0)+'</em></button>').join('');
    document.getElementById('fdBList').innerHTML=BZ.orders.length?BZ.orders.map(bizCard).join(''):empty(BZ.section==='new'?'🛎️':'📭',BZ.section==='new'?'Yeni sipariş yok. Geldiğinde burada anında görünür.':'Bu bölümde sipariş yok.');
    document.getElementById('fdBMore').innerHTML=r.orders.length===20?'<button type="button" class="v2Btn block" onclick="foodBizMore(this)">Daha fazla</button>':'';
  }catch(e){const l=document.getElementById('fdBList');if(l)l.innerHTML=errBox(e,'showFoodBusiness()')}
}
window.foodBizTab=function(k){BZ.section=k;BZ.offset=0;const l=document.getElementById('fdBList');if(l)l.innerHTML=skel(2);bizLoad(SCREEN,false)};
window.foodBizMore=async function(btn){await once('bizMore',btn,()=>bizLoad(SCREEN,true))};
function bizActions(o){
  const b=(to,label,cls)=>'<button type="button" class="v2Btn '+(cls||'')+'" onclick="foodVenueAct(\''+E(o.id)+'\',\''+to+'\',this,\''+o.delivery_mode+'\')">'+label+'</button>';
  const cancel=b('cancelled','İptal et','fdGhostDanger');
  switch(o.status){
    case 'new':return b('accepted','✅ Kabul et','pri')+b('rejected','Reddet','fdGhostDanger');
    case 'accepted':return b('preparing','👨‍🍳 Hazırlamaya başla','pri')+b('ready','📦 Hazır')+cancel;
    case 'preparing':return b('ready','📦 Sipariş hazır','pri')+cancel;
    case 'ready':return (o.delivery_mode==='pickup'?b('delivered','🛍️ Müşteri teslim aldı','pri'):o.delivery_mode==='self_delivery'?b('on_the_way','🛵 Yola çıktı','pri'):'')+cancel;
    case 'courier_search':return '<div class="fdInfo" style="flex-basis:100%">🔎 Kurye aranıyor. Kurye atanınca burada görünecek.</div>'+cancel;
    case 'courier_assigned':case 'courier_at_venue':return b('picked_up','🤝 Kurye teslim aldı','pri')+cancel;
    case 'on_the_way':return o.delivery_mode==='self_delivery'?b('near_customer','📍 Yaklaştı')+b('delivered','✅ Teslim edildi','pri')+b('failed','Teslim edilemedi','fdGhostDanger'):'';
    case 'near_customer':return o.delivery_mode==='self_delivery'?b('delivered','✅ Teslim edildi','pri')+b('failed','Teslim edilemedi','fdGhostDanger'):'';
    default:return '';
  }
}
function bizCard(o){
  const late=o.estimated_ready_at&&['accepted','preparing'].includes(o.status)&&new Date(o.estimated_ready_at)<new Date();
  return '<div class="fdCard fdOrder"><div class="hd"><div><b>#'+o.no+'</b> <span class="fdMuted fdSmall">'+ago(o.created_at)+'</span><div style="margin-top:4px">'+badge(o.status)+' <span class="fdPill">'+E(MODE[o.delivery_mode]||'')+'</span>'+(late?' <span class="fdPill" style="color:var(--fd-bad)">⏰ Gecikiyor</span>':'')+'</div></div>'+
    '<div style="text-align:right"><b style="font-size:17px">'+M(o.total_kurus)+'</b><div class="fdMuted fdSmall">'+E(PAY[o.payment_method]||'')+'</div><div class="fdMuted fdSmall">Hakediş '+M(o.restaurant_share_kurus)+'</div></div></div>'+
    '<ul>'+(o.items||[]).map(i=>'<li><b>'+i.quantity+'×</b> '+E(i.name)+((i.options||[]).length?'<br><small>'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</li>').join('')+'</ul>'+
    (o.note?'<div class="fdInfo">📝 '+E(o.note)+'</div>':'')+
    '<div class="fdKV">'+(o.address_text?'<span>Adres</span><b>'+E(o.address_text)+'</b>':'')+(o.phone?'<span>Telefon</span><b><a href="tel:'+E(o.phone)+'">'+E(o.phone)+'</a></b>':'')+
    (o.estimated_ready_at?'<span>Hazır olacak</span><b>'+hm(o.estimated_ready_at)+(o.prep_time_min?' ('+o.prep_time_min+' dk)':'')+'</b>':'')+
    (o.courier?'<span>Kurye</span><b>'+E(o.courier.name)+' · '+E(VEH[o.courier.vehicle]||'')+(o.courier.phone?' · <a href="tel:'+E(o.courier.phone)+'">Ara</a>':'')+'</b>':'')+
    (o.cancel_reason?'<span>Sebep</span><b>'+E(o.cancel_reason)+'</b>':'')+'</div>'+
    '<div class="fdActs">'+bizActions(o)+'</div></div>';
}
window.foodVenueAct=async function(id,to,btn,mode){
  let reason=null,prep=null,code=null;
  if(to==='accepted'){
    prep=await new Promise(res=>{
      const w=modal('<h3>Siparişi kabul et</h3><p class="fdMuted">Tahmini hazırlık süresi</p><div class="fdChips wrap">'+[10,15,20,30,45,60].map(n=>'<button type="button" class="fdChip" data-n="'+n+'">'+n+' dk</button>').join('')+'</div><div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Varsayılan süreyle kabul et</button></div>',{onClose:()=>res(false)});
      w.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{closeModal();res(+b.dataset.n)});
      w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(false)};w.querySelector('[data-x=ok]').onclick=()=>{closeModal();res(null)};
    });
    if(prep===false)return;
  }
  if(to==='rejected'||to==='cancelled'||to==='failed'){
    reason=await promptBox(to==='rejected'?'Siparişi reddet':to==='failed'?'Teslimat neden tamamlanamadı?':'Siparişi iptal et','Sebep',{required:true,requiredText:'Müşteriye iletilecek bir sebep yaz.',danger:true,okLabel:to==='rejected'?'Reddet':to==='failed'?'Kaydet':'İptal et',
      chips:to==='failed'?['Müşteriye ulaşılamadı','Adres bulunamadı','Müşteri teslim almadı']:['Ürün tükendi','Çok yoğunuz','Restoran kapanıyor','Teslimat bölgesi dışında']});
    if(!reason)return;
  }
  if(to==='delivered'&&mode==='self_delivery'){
    code=await new Promise(res=>{
      const w=modal('<h3>Teslim edildi olarak işaretle</h3><p class="fdMuted">Müşterinin 4 haneli teslimat kodunu girmen önerilir (isteğe bağlı).</p><input id="fdDc" class="fdCode" inputmode="numeric" maxlength="4" placeholder="• • • •" autofocus><div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Teslim edildi</button></div>',{onClose:()=>res(false)});
      w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(false)};w.querySelector('[data-x=ok]').onclick=()=>{const v=w.querySelector('#fdDc').value.trim();closeModal();res(v||'')};
    });
    if(code===false)return;
  }
  if(to==='delivered'&&mode==='pickup'){if(!await confirmBox('Müşteri siparişi teslim aldı mı?','Sipariş tamamlandı olarak işaretlenecek.','Evet, teslim aldı'))return}
  await once('va'+id,btn,async()=>{
    try{const r=await RPC('food_transition_order',{p_order_id:id,p_to:to,p_reason:reason,p_prep_minutes:prep,p_code:code||null});
      toast((STL[r.status]||['',r.status])[1]+' · #'+NO(id));await bizLoad(SCREEN,false)}
    catch(e){toast(errMsg(e),'err');await bizLoad(SCREEN,false)}
  });
};
window.foodToggleOpen=async function(btn,open){
  await once('toggleOpen',btn,async()=>{try{await Q('PATCH','food_venues?id=eq.'+BZ.venueId,{is_open:open});toast(open?'Restoran sipariş almaya başladı':'Restoran kapatıldı');showFoodBusiness(BZ.venueId)}catch(e){toast(errMsg(e),'err')}});
};
window.foodNewVenue=function(){newScreen();venueCreateForm(true)};
function venueCreateForm(extra){
  const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  render(back('showFoodHome()','Yemek')+'<div class="fdCard fdForm" style="margin-top:10px"><h1 style="margin-top:0">🏪 '+(extra?'Yeni işletme':'İşletmeni ekle')+'</h1><p class="fdMuted">Kayıttan sonra menünü, çalışma saatlerini ve teslimat ayarlarını düzenleyebilirsin. İşletmen kapalı başlar; hazır olduğunda açarsın.</p>'+
    '<label for="nvName">İşletme adı</label><input id="nvName" maxlength="80">'+
    '<div class="two"><div><label for="nvDist">İlçe</label><select id="nvDist"><option value="">Seç</option>'+ds.map(d=>'<option>'+E(d)+'</option>').join('')+'</select></div><div><label for="nvPhone">Telefon</label><input id="nvPhone" type="tel" inputmode="tel"></div></div>'+
    '<label for="nvAddr">Açık adres</label><input id="nvAddr" maxlength="200">'+
    '<label for="nvCui">Mutfak</label><input id="nvCui" maxlength="40" placeholder="Pide, Kebap, Burger…">'+
    '<label for="nvMode">Sipariş türü</label><select id="nvMode"><option value="both">Teslimat + Gel-al</option><option value="self_delivery">Yalnızca teslimat</option><option value="pickup">Yalnızca gel-al</option></select>'+
    '<div class="fdErr" id="nvErr" hidden></div><button type="button" class="v2Btn pri block" style="margin-top:14px" onclick="foodCreateVenue(this)">İşletmeyi oluştur</button></div>');
}
window.foodCreateVenue=async function(btn){
  const g=id=>document.getElementById(id).value.trim();const err=document.getElementById('nvErr');
  const body={owner_user_id:UID(),name:g('nvName'),district:g('nvDist'),phone:g('nvPhone'),address_text:g('nvAddr'),cuisine_type:g('nvCui'),delivery_mode:g('nvMode'),city:'İzmir',is_active:true,is_open:false};
  if(body.name.length<2){err.hidden=false;err.textContent='İşletme adını yaz.';return}
  if(!body.district){err.hidden=false;err.textContent='İlçe seç.';return}
  if(body.phone.replace(/\D/g,'').length<10){err.hidden=false;err.textContent='Geçerli bir telefon yaz.';return}
  await once('createVenue',btn,async()=>{try{const r=await Q('POST','food_venues',body);WHO=null;toast('İşletmen oluşturuldu');showFoodSettings(r[0].id,true)}catch(e){err.hidden=false;err.textContent=errMsg(e)}});
};

/* ====================== Ayarlar ====================== */
async function showFoodSettings(venueId,firstRun){
  if(!A())return;const tok=newScreen();
  render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  let v;try{v=(await Q('GET','food_venues?select=*&id=eq.'+encodeURIComponent(venueId)))[0]}catch(e){return render(errBox(e,'showFoodSettings(\''+E(venueId)+'\')'))}
  if(!alive(tok)||!v)return;
  const wh=v.working_hours||{};const hasHours=Object.keys(wh).length>0;
  const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<div class="fdForm" style="margin-top:10px"><h1>⚙️ Ayarlar</h1>'+(firstRun?'<div class="fdInfo">👋 Şimdi temel ayarları tamamla, sonra menünü ekle.</div>':'')+
    '<div class="fdCard"><h3>Genel</h3><label for="sName">İşletme adı</label><input id="sName" maxlength="80" value="'+E(v.name)+'">'+
    '<label for="sDesc">Açıklama</label><textarea id="sDesc" rows="2" maxlength="300">'+E(v.description||'')+'</textarea>'+
    '<div class="two"><div><label for="sDist">İlçe</label><select id="sDist">'+ds.map(d=>'<option'+(d===v.district?' selected':'')+'>'+E(d)+'</option>').join('')+'</select></div><div><label for="sPhone">Telefon</label><input id="sPhone" type="tel" value="'+E(v.phone||'')+'"></div></div>'+
    '<label for="sAddr">Açık adres</label><input id="sAddr" maxlength="200" value="'+E(v.address_text||'')+'"><label for="sCui">Mutfak</label><input id="sCui" maxlength="40" value="'+E(v.cuisine_type||'')+'">'+
    '<div class="two"><div><label>Logo</label>'+media(v,64,14)+'<input type="file" accept="image/jpeg,image/png,image/webp" onchange="foodVenueImg(this,\'image_url\')"></div><div><label>Kapak</label>'+(v.cover_url?'<img src="'+E(v.cover_url)+'" alt="" style="width:100%;height:64px;object-fit:cover;border-radius:12px">':'<div class="fdMuted fdSmall">Kapak yok</div>')+'<input type="file" accept="image/jpeg,image/png,image/webp" onchange="foodVenueImg(this,\'cover_url\')"></div></div></div>'+
    '<div class="fdCard" style="margin-top:10px"><h3>Sipariş ve teslimat</h3>'+
    '<label for="sMode">Sipariş türü</label><select id="sMode">'+[['both','Teslimat + Gel-al'],['self_delivery','Yalnızca teslimat'],['pickup','Yalnızca gel-al']].map(([k,l])=>'<option value="'+k+'"'+(v.delivery_mode===k?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
    '<label for="sProv">Teslimatı kim yapar?</label><select id="sProv"><option value="venue"'+(v.delivery_provider==='venue'?' selected':'')+'>Kendi kuryemiz</option><option value="platform"'+(v.delivery_provider==='platform'?' selected':'')+'>Platform kuryeleri</option></select>'+
    '<div class="two"><div><label for="sMin">Min. sepet (TL)</label><input id="sMin" inputmode="decimal" value="'+kurusToTl(v.min_order_amount)+'"></div><div><label for="sFee">Teslimat ücreti (TL)</label><input id="sFee" inputmode="decimal" value="'+kurusToTl(v.delivery_fee_kurus)+'"></div></div>'+
    '<div class="two"><div><label for="sPrep">Hazırlık (dk)</label><input id="sPrep" type="number" min="1" max="240" value="'+v.prep_time_min+'"></div><div><label for="sEta">Teslimat süresi (dk)</label><input id="sEta" type="number" min="1" max="240" value="'+v.delivery_eta_min+'"></div></div>'+
    '<label>Teslimat bölgesi</label><div class="fdMuted fdSmall">Konum ve yarıçap girilirse, bölge dışındaki adreslere sipariş sunucuda engellenir. Harita API\'si bağlı olmadığı için kuş uçuşu mesafe kullanılır.</div>'+
    '<div class="two"><div><label for="sLat">Enlem</label><input id="sLat" inputmode="decimal" value="'+(v.lat??'')+'"></div><div><label for="sLng">Boylam</label><input id="sLng" inputmode="decimal" value="'+(v.lng??'')+'"></div></div>'+
    '<div class="two"><div><label for="sRad">Yarıçap (km)</label><input id="sRad" inputmode="decimal" value="'+(v.delivery_radius_km??'')+'" placeholder="Boş = sınırsız"></div><div><label>&nbsp;</label><button type="button" class="v2Btn block" onclick="foodVenueGeo(this)">📍 Konumumu kullan</button></div></div>'+
    '<div class="fdInfo">Platform komisyonu: <b>%'+(v.commission_bps/100).toFixed(2).replace('.',',')+'</b> · Hizmet bedeli: <b>'+M(v.platform_fee_kurus)+'</b> <span class="fdMuted">(platform yönetimi belirler)</span></div></div>'+
    '<div class="fdCard" style="margin-top:10px"><h3>Çalışma saatleri</h3><label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="sHasH" style="width:20px;min-height:20px"'+(hasHours?' checked':'')+' onchange="document.getElementById(\'sHours\').hidden=!this.checked"> Çalışma saatlerini uygula</label>'+
    '<div class="fdMuted fdSmall">Kapalıysa yalnızca "Aç/Kapat" düğmesi geçerli olur. Açıksa saat dışında sipariş sunucuda engellenir. Gece yarısını geçen saatler desteklenir (ör. 18:00–02:00).</div>'+
    '<div class="fdHours" id="sHours"'+(hasHours?'':' hidden')+' style="margin-top:8px">'+DAYS.map(([k,l])=>{const r=(wh[k]||[])[0];return '<div><b>'+l+'</b><input type="checkbox" data-d="'+k+'"'+(r||!hasHours?' checked':'')+' aria-label="'+l+' açık"><input type="time" data-o="'+k+'" value="'+(r?r[0]:'10:00')+'"><input type="time" data-c="'+k+'" value="'+(r?(r[1]==='24:00'?'23:59':r[1]):'22:00')+'"></div>'}).join('')+
    '<button type="button" class="fdLink" onclick="foodCopyMon()">Pazartesi saatlerini tüm günlere uygula</button></div></div>'+
    '<div class="fdErr" id="sErr" hidden></div><div class="fdSticky"><button type="button" class="v2Btn pri" onclick="foodSaveSettings(this,\''+E(venueId)+'\')">Ayarları kaydet</button></div></div>');
}
window.foodCopyMon=function(){const o=document.querySelector('[data-o=mon]').value,c=document.querySelector('[data-c=mon]').value;DAYS.forEach(([k])=>{document.querySelector('[data-o='+k+']').value=o;document.querySelector('[data-c='+k+']').value=c;document.querySelector('[data-d='+k+']').checked=true})};
window.foodVenueGeo=function(btn){if(!navigator.geolocation)return toast('Konum desteklenmiyor.','warn');btn.disabled=true;navigator.geolocation.getCurrentPosition(p=>{document.getElementById('sLat').value=p.coords.latitude.toFixed(6);document.getElementById('sLng').value=p.coords.longitude.toFixed(6);btn.disabled=false;toast('Konum eklendi, kaydetmeyi unutma')},()=>{btn.disabled=false;toast('Konum alınamadı.','warn')},{timeout:10000})};
window.foodVenueImg=async function(inp,field){
  const f=inp.files&&inp.files[0];if(!f)return;const vid=localStorage.getItem(VENUE_KEY);
  inp.disabled=true;try{const url=await uploadFoodImage(vid,f);const b={};b[field]=url;await Q('PATCH','food_venues?id=eq.'+vid,b);toast('Görsel güncellendi');showFoodSettings(vid)}catch(e){toast(errMsg(e),'err')}finally{inp.disabled=false}
};
window.foodSaveSettings=async function(btn,venueId){
  const g=id=>document.getElementById(id).value.trim();const err=document.getElementById('sErr');const fail=m=>{err.hidden=false;err.textContent=m;err.scrollIntoView({block:'center'})};err.hidden=true;
  const min=tlToKurus(g('sMin')||'0'),fee=tlToKurus(g('sFee')||'0'),prep=+g('sPrep'),eta=+g('sEta');
  if(!(g('sName').length>=2))return fail('İşletme adını yaz.');
  if(isNaN(min)||isNaN(fee))return fail('Tutarları doğru gir (ör. 150 veya 150,50).');
  if(!(prep>=1&&prep<=240)||!(eta>=1&&eta<=240))return fail('Süreler 1-240 dakika arasında olmalı.');
  const lat=g('sLat')?+g('sLat').replace(',','.'):null,lng=g('sLng')?+g('sLng').replace(',','.'):null,rad=g('sRad')?+g('sRad').replace(',','.'):null;
  if((lat===null)!==(lng===null))return fail('Konum için enlem ve boylamı birlikte gir.');
  if(rad!==null&&!(rad>0))return fail('Yarıçap 0\'dan büyük olmalı.');
  if(rad!==null&&lat===null)return fail('Teslimat yarıçapı için restoran konumu gerekli.');
  let wh={};
  if(document.getElementById('sHasH').checked){
    for(const[k,l]of DAYS){if(!document.querySelector('[data-d='+k+']').checked)continue;const o=document.querySelector('[data-o='+k+']').value,c=document.querySelector('[data-c='+k+']').value;
      if(!o||!c||o===c)return fail(l+' için açılış ve kapanış saatini kontrol et.');wh[k]=[[o,c==='23:59'?'24:00':c]]}
    if(!Object.keys(wh).length)return fail('En az bir gün açık olmalı veya saat uygulamasını kapat.');
  }
  const body={name:g('sName'),description:g('sDesc')||null,district:g('sDist'),phone:g('sPhone'),address_text:g('sAddr'),cuisine_type:g('sCui'),delivery_mode:g('sMode'),delivery_provider:g('sProv'),
    min_order_amount:min,delivery_fee_kurus:fee,prep_time_min:prep,delivery_eta_min:eta,lat,lng,delivery_radius_km:rad,working_hours:wh};
  await once('saveSettings',btn,async()=>{try{await Q('PATCH','food_venues?id=eq.'+venueId,body);WHO=null;toast('Ayarlar kaydedildi');showFoodBusiness(venueId)}catch(e){fail(errMsg(e))}});
};

/* ====================== Menü yönetimi ====================== */
const MN={venueId:null,cats:[],items:[],groups:{}};
async function showFoodMenu(venueId){
  if(!A())return;const tok=newScreen();MN.venueId=venueId;
  render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  try{
    const enc=encodeURIComponent(venueId);
    const [cats,items,groups]=await Promise.all([
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,is_active,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&order=sort_order.asc')]);
    if(!alive(tok))return;
    MN.cats=cats;MN.items=items;MN.groups={};groups.forEach(g=>{g.food_item_options.sort((a,b)=>a.sort_order-b.sort_order);(MN.groups[g.menu_item_id]=MN.groups[g.menu_item_id]||[]).push(g)});
    const secs=cats.map(c=>({c,items:items.filter(i=>i.category_id===c.id)}));const other=items.filter(i=>!i.category_id||!cats.some(c=>c.id===i.category_id));
    patchOrRender(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<div class="fdTop" style="margin-top:10px"><h1 class="grow" style="margin:0">📋 Menü</h1><button type="button" class="v2Btn sm pri" onclick="foodItemEdit(null)">+ Ürün</button></div>'+
      '<h2>Kategoriler</h2><div class="fdChips wrap">'+cats.map(c=>'<button type="button" class="fdChip'+(c.is_active?' on':'')+'" onclick="foodCatToggle(\''+E(c.id)+'\','+(!c.is_active)+',this)" title="Aç/kapat">'+(c.is_active?'👁 ':'🚫 ')+E(c.name)+'</button>').join('')+'<button type="button" class="fdChip" onclick="foodCatAdd(this)">+ Kategori</button></div>'+
      (cats.some(c=>!c.is_active)?'<div class="fdMuted fdSmall">🚫 işaretli kategoriler müşteriye gösterilmez.</div>':'')+
      (secs.concat(other.length?[{c:{id:'',name:'Kategorisiz'},items:other}]:[]).map(s=>'<h2>'+E(s.c.name)+' <span class="fdMuted fdSmall">('+s.items.length+')</span></h2>'+(s.items.length?'<div class="fdCard" style="padding:0 14px">'+s.items.map(menuRow).join('')+'</div>':'<div class="fdMuted fdSmall">Bu kategoride ürün yok.</div>')).join('')||empty('📋','Menün boş. İlk ürününü ekle.')));
  }catch(e){if(alive(tok))render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+errBox(e,'showFoodMenu(\''+E(venueId)+'\')'))}
}
function patchOrRender(h){if(document.getElementById('fdRoot'))patch(h);else render(h)}
function menuRow(i){
  const gs=MN.groups[i.id]||[];
  return '<div class="fdItem" style="cursor:default">'+media(i,56,12)+'<div class="grow"><b>'+E(i.name)+'</b><div class="fdSmall">'+M(i.price_kurus)+(gs.length?' · '+gs.length+' seçenek grubu':'')+'</div>'+
    '<div class="fdActs" style="margin-top:6px"><button type="button" class="v2Btn sm" onclick="foodItemEdit(\''+E(i.id)+'\')">Düzenle</button><button type="button" class="v2Btn sm" onclick="foodOptions(\''+E(i.id)+'\')">Seçenekler</button>'+
    '<button type="button" class="v2Btn sm '+(i.is_available?'':'pri')+'" onclick="foodItemAvail(\''+E(i.id)+'\','+(!i.is_available)+',this)">'+(i.is_available?'Tükendi yap':'Satışa aç')+'</button></div></div>'+(i.is_available?'':'<span class="fdPill off">Tükendi</span>')+'</div>';
}
window.foodCatAdd=async function(btn){const n=await promptBox('Yeni kategori','Örn. Ana yemekler',{required:true,okLabel:'Ekle'});if(!n)return;
  await once('catAdd',btn,async()=>{try{await Q('POST','food_menu_categories',{venue_id:MN.venueId,name:n.slice(0,60),sort_order:MN.cats.length+1,is_active:true});showFoodMenu(MN.venueId)}catch(e){toast(errMsg(e),'err')}})};
window.foodCatToggle=async function(id,on,btn){await once('cat'+id,btn,async()=>{try{await Q('PATCH','food_menu_categories?id=eq.'+id,{is_active:on});showFoodMenu(MN.venueId)}catch(e){toast(errMsg(e),'err')}})};
window.foodItemAvail=async function(id,on,btn){await once('av'+id,btn,async()=>{try{await Q('PATCH','food_menu_items?id=eq.'+id,{is_available:on});toast(on?'Ürün satışa açıldı':'Ürün tükendi olarak işaretlendi');showFoodMenu(MN.venueId)}catch(e){toast(errMsg(e),'err')}})};
window.foodItemEdit=function(id){
  const i=id?MN.items.find(x=>x.id===id):{name:'',description:'',price_kurus:0,category_id:(MN.cats[0]||{}).id||'',is_available:true};if(!i)return;
  const w=modal('<h3>'+(id?'Ürünü düzenle':'Yeni ürün')+'</h3><div class="fdForm"><label for="ieN">Ad</label><input id="ieN" maxlength="80" value="'+E(i.name)+'" autofocus>'+
    '<label for="ieD">Açıklama</label><textarea id="ieD" rows="2" maxlength="300">'+E(i.description||'')+'</textarea>'+
    '<div class="two"><div><label for="ieP">Fiyat (TL)</label><input id="ieP" inputmode="decimal" value="'+(id?kurusToTl(i.price_kurus):'')+'"></div><div><label for="ieC">Kategori</label><select id="ieC"><option value="">Kategorisiz</option>'+MN.cats.map(c=>'<option value="'+E(c.id)+'"'+(c.id===i.category_id?' selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></div></div>'+
    '<label>Görsel</label><div style="display:flex;gap:10px;align-items:center">'+media(i,56,12)+'<input id="ieI" type="file" accept="image/jpeg,image/png,image/webp"></div>'+(i.image_url?'<label style="display:flex;gap:6px;align-items:center;font-weight:600"><input type="checkbox" id="ieR" style="width:18px;min-height:18px"> Görseli kaldır</label>':'')+
    '<div class="fdErr" id="ieE" hidden></div></div><div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Kaydet</button></div>',{sheet:true});
  w.querySelector('[data-x=no]').onclick=closeModal;
  w.querySelector('[data-x=ok]').onclick=async function(){
    const err=w.querySelector('#ieE');const fail=m=>{err.hidden=false;err.textContent=m};
    const name=w.querySelector('#ieN').value.trim();const price=tlToKurus(w.querySelector('#ieP').value);
    if(name.length<2)return fail('Ürün adını yaz.');if(isNaN(price)||price<=0)return fail('Geçerli bir fiyat gir.');
    const body={name,description:w.querySelector('#ieD').value.trim()||null,price_kurus:price,category_id:w.querySelector('#ieC').value||null};
    await once('itemSave',this,async()=>{
      try{
        const f=w.querySelector('#ieI').files[0];if(f)body.image_url=await uploadFoodImage(MN.venueId,f);else if(w.querySelector('#ieR')&&w.querySelector('#ieR').checked)body.image_url=null;
        if(id)await Q('PATCH','food_menu_items?id=eq.'+id,body);else await Q('POST','food_menu_items',Object.assign({venue_id:MN.venueId,is_available:true,sort_order:MN.items.length+1},body));
        closeModal();toast('Ürün kaydedildi');showFoodMenu(MN.venueId);
      }catch(e){fail(errMsg(e))}
    });
  };
};
window.foodOptions=function(itemId){
  const i=MN.items.find(x=>x.id===itemId);if(!i)return;const gs=MN.groups[itemId]||[];
  const w=modal('<h3>Seçenekler · '+E(i.name)+'</h3><p class="fdMuted fdSmall">Boyut, ekstra veya çıkarılacak malzeme gruplarını ekle. Kurallar sipariş sırasında sunucuda doğrulanır.</p>'+
    gs.map(g=>'<div class="fdCard" style="margin:8px 0;padding:10px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+E(g.name)+(g.is_active?'':' (gizli)')+'</b><span class="fdMuted fdSmall">'+E({single:'Tek seçim',multi:'Çoklu',remove:'Çıkarılacak'}[g.kind])+' · '+(g.is_required?'zorunlu':'isteğe bağlı')+' · '+g.min_select+'-'+g.max_select+'</span></div>'+
      g.food_item_options.map(o=>'<div class="fdOpt'+(o.is_available?'':' na')+'" style="cursor:default"><span class="grow">'+E(o.name)+(+o.price_delta_kurus?' · +'+M(o.price_delta_kurus):'')+'</span><button type="button" class="v2Btn sm" data-oa="'+E(o.id)+'" data-v="'+(!o.is_available)+'">'+(o.is_available?'Tükendi':'Aç')+'</button><button type="button" class="v2Btn sm fdGhostDanger" data-od="'+E(o.id)+'" aria-label="Sil">🗑</button></div>').join('')+
      '<div style="display:flex;gap:6px;margin-top:6px"><input placeholder="Seçenek adı" data-on="'+E(g.id)+'" style="flex:2"><input placeholder="+TL" inputmode="decimal" data-op="'+E(g.id)+'" style="flex:1"'+(g.kind==='remove'?' disabled':'')+'><button type="button" class="v2Btn sm" data-oadd="'+E(g.id)+'">Ekle</button></div>'+
      '<div class="fdActs"><button type="button" class="v2Btn sm" data-ga="'+E(g.id)+'" data-v="'+(!g.is_active)+'">'+(g.is_active?'Grubu gizle':'Grubu göster')+'</button><button type="button" class="v2Btn sm fdGhostDanger" data-gd="'+E(g.id)+'">Grubu sil</button></div></div>').join('')+
    '<h3 style="margin-top:14px">Yeni grup</h3><div class="fdForm"><input id="ngN" placeholder="Örn. Porsiyon, Ekstralar, İçinde istemediklerin"><div class="two"><select id="ngK"><option value="single">Tek seçim</option><option value="multi">Çoklu seçim</option><option value="remove">Çıkarılacak malzeme</option></select><label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:600"><input type="checkbox" id="ngR" style="width:18px;min-height:18px"> Zorunlu</label></div>'+
    '<div class="two"><input id="ngMin" type="number" min="0" value="0" aria-label="En az"><input id="ngMax" type="number" min="1" value="1" aria-label="En fazla"></div><div class="fdMuted fdSmall">En az / en fazla seçim</div></div>'+
    '<div class="fdErr" id="ogE" hidden></div><div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Kapat</button><button type="button" class="v2Btn pri" data-x="ok">Grubu ekle</button></div>',{sheet:true,onClose:()=>showFoodMenu(MN.venueId)});
  const err=w.querySelector('#ogE');const fail=e=>{err.hidden=false;err.textContent=errMsg(e)};
  const reopen=async()=>{await showFoodMenu(MN.venueId);foodOptions(itemId)};
  w.querySelector('[data-x=no]').onclick=()=>{closeModal();showFoodMenu(MN.venueId)};
  w.querySelector('[data-x=ok]').onclick=async function(){
    const name=w.querySelector('#ngN').value.trim(),kind=w.querySelector('#ngK').value,req=w.querySelector('#ngR').checked;let mn=+w.querySelector('#ngMin').value||0,mx=+w.querySelector('#ngMax').value||1;
    if(name.length<1)return fail(new Error('Grup adını yaz.'));if(kind==='single')mx=1;if(req&&mn<1)mn=1;if(mn>mx)return fail(new Error('En az, en fazladan büyük olamaz.'));
    await once('grpAdd',this,async()=>{try{await Q('POST','food_item_option_groups',{venue_id:MN.venueId,menu_item_id:itemId,name,kind,min_select:mn,max_select:mx,is_required:req,sort_order:gs.length+1});closeModal();reopen()}catch(e){fail(e)}});
  };
  w.querySelectorAll('[data-oadd]').forEach(b=>b.onclick=async()=>{const gid=b.dataset.oadd;const n=w.querySelector('[data-on="'+gid+'"]').value.trim();const p=tlToKurus(w.querySelector('[data-op="'+gid+'"]').value||'0');
    if(!n)return fail(new Error('Seçenek adını yaz.'));if(isNaN(p))return fail(new Error('Fiyat farkını doğru gir.'));
    await once('optAdd',b,async()=>{try{await Q('POST','food_item_options',{group_id:gid,venue_id:MN.venueId,name:n,price_delta_kurus:p,sort_order:99});closeModal();reopen()}catch(e){fail(e)}})});
  w.querySelectorAll('[data-oa]').forEach(b=>b.onclick=async()=>{await once('oa',b,async()=>{try{await Q('PATCH','food_item_options?id=eq.'+b.dataset.oa,{is_available:b.dataset.v==='true'});closeModal();reopen()}catch(e){fail(e)}})});
  w.querySelectorAll('[data-od]').forEach(b=>b.onclick=async()=>{await once('od',b,async()=>{try{await Q('DELETE','food_item_options?id=eq.'+b.dataset.od);closeModal();reopen()}catch(e){fail(e)}})});
  w.querySelectorAll('[data-ga]').forEach(b=>b.onclick=async()=>{await once('ga',b,async()=>{try{await Q('PATCH','food_item_option_groups?id=eq.'+b.dataset.ga,{is_active:b.dataset.v==='true'});closeModal();reopen()}catch(e){fail(e)}})});
  w.querySelectorAll('[data-gd]').forEach(b=>b.onclick=async()=>{closeModal();if(!await confirmBox('Grup silinsin mi?','Gruptaki tüm seçenekler silinir. Geçmiş siparişler etkilenmez.','Sil',true))return reopen();try{await Q('DELETE','food_item_option_groups?id=eq.'+b.dataset.gd)}catch(e){toast(errMsg(e),'err')}reopen()});
};

/* ====================== Sorunlar ====================== */
async function showFoodVenueIssues(venueId){
  if(!A())return;const tok=newScreen();
  render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<h1 style="margin-top:10px">⚠️ Sorun bildirimleri</h1><div id="fdIList">'+skel(2)+'</div>');
  try{const r=await RPC('food_venue_issues',{p_venue_id:venueId});if(!alive(tok))return;
    document.getElementById('fdIList').innerHTML=r.length?r.map(x=>'<div class="fdCard" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(ISSUE[x.type]||x.type)+'</b><span class="fdPill">'+E({open:'Açık',in_review:'İnceleniyor',resolved:'Çözüldü',rejected:'Reddedildi'}[x.status])+'</span></div>'+
      '<div class="fdMuted fdSmall">#'+E(x.order_no)+' · '+ago(x.created_at)+'</div>'+(x.description?'<p>'+E(x.description)+'</p>':'')+(x.resolution?'<div class="fdInfo">↳ '+E(x.resolution)+'</div>':'')+
      (['open','in_review'].includes(x.status)?'<div class="fdActs">'+(x.status==='open'?'<button type="button" class="v2Btn" onclick="foodIssueSet(\''+E(x.id)+'\',\'in_review\',this,\''+E(venueId)+'\')">İnceliyorum</button>':'')+
        '<button type="button" class="v2Btn pri" onclick="foodIssueSet(\''+E(x.id)+'\',\'resolved\',this,\''+E(venueId)+'\')">Çözüldü</button><button type="button" class="v2Btn fdGhostDanger" onclick="foodIssueSet(\''+E(x.id)+'\',\'rejected\',this,\''+E(venueId)+'\')">Reddet</button></div>':'')+'</div>').join(''):empty('✅','Açık sorun bildirimi yok.')}
  catch(e){const l=document.getElementById('fdIList');if(l)l.innerHTML=errBox(e)}
}
window.foodIssueSet=async function(id,st,btn,venueId){
  let res=null;if(st!=='in_review'){res=await promptBox(st==='resolved'?'Nasıl çözüldü?':'Neden reddedildi?','Müşteriye iletilecek açıklama',{required:true,okLabel:'Kaydet',chips:st==='resolved'?['Eksik ürün tekrar gönderildi','Ücret iadesi yapıldı','Özür dileriz, indirim tanımlandı']:[]});if(!res)return}
  await once('is'+id,btn,async()=>{try{await RPC('food_update_issue',{p_issue_id:id,p_status:st,p_resolution:res});toast('Kaydedildi');showFoodVenueIssues(venueId)}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== Ekip ====================== */
async function showFoodTeam(venueId){
  if(!A())return;const tok=newScreen();
  render(back('showFoodBusiness(\''+E(venueId)+'\')','Panel')+'<h1 style="margin-top:10px">👥 Ekip</h1><div id="fdTm">'+skel(1)+'</div>');
  try{const r=await Q('GET','food_venue_members?select=user_id,role,created_at&venue_id=eq.'+encodeURIComponent(venueId)+'&order=created_at.asc');if(!alive(tok))return;
    document.getElementById('fdTm').innerHTML='<div class="fdCard">'+r.map(m=>'<div class="fdLine"><span>'+(m.user_id===UID()?'<b>Sen</b>':'Üye · '+E(m.user_id.slice(0,8)))+'</span><b>'+E({owner:'Sahip',manager:'Yönetici',staff:'Personel'}[m.role])+'</b></div>').join('')+'</div>'+
      '<div class="fdCard fdForm" style="margin-top:10px"><h3>Üye ekle / değiştir</h3><div class="fdMuted fdSmall">Yönetici menü ve ayarları düzenleyebilir; personel yalnızca siparişleri yönetir. Kişinin İşimi Çöz hesabı olmalı.</div>'+
      '<label for="tmE">E-posta</label><input id="tmE" type="email" autocomplete="off"><label for="tmR">Rol</label><select id="tmR"><option value="staff">Personel</option><option value="manager">Yönetici</option><option value="remove">Ekipten çıkar</option></select>'+
      '<button type="button" class="v2Btn pri block" style="margin-top:12px" onclick="foodTeamSet(this,\''+E(venueId)+'\')">Kaydet</button></div>'}
  catch(e){const l=document.getElementById('fdTm');if(l)l.innerHTML=errBox(e)}
}
window.foodTeamSet=async function(btn,venueId){
  const em=document.getElementById('tmE').value.trim(),role=document.getElementById('tmR').value;if(!/.+@.+\..+/.test(em))return toast('Geçerli bir e-posta yaz.','warn');
  await once('team',btn,async()=>{try{await RPC('food_venue_set_member',{p_venue_id:venueId,p_email:em,p_role:role});toast('Ekip güncellendi');showFoodTeam(venueId)}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== Kurye ====================== */
let GEO_WATCH=null,GEO_LAST=0;
function geoStop(){if(GEO_WATCH!=null&&navigator.geolocation){navigator.geolocation.clearWatch(GEO_WATCH)}GEO_WATCH=null}
function geoStart(){
  if(GEO_WATCH!=null||!navigator.geolocation)return;
  GEO_WATCH=navigator.geolocation.watchPosition(p=>{const now=Date.now();if(now-GEO_LAST<45000)return;GEO_LAST=now;
    RPC('food_courier_update_location',{p_lat:+p.coords.latitude.toFixed(5),p_lng:+p.coords.longitude.toFixed(5)}).catch(()=>{})},()=>{},{enableHighAccuracy:false,maximumAge:60000,timeout:20000});
  onCleanup(geoStop);
}
function mapsLink(lat,lng,text){const q=lat!=null&&lng!=null?lat+','+lng:encodeURIComponent(text||'');return 'https://www.google.com/maps/dir/?api=1&destination='+q}
async function showFoodCourier(){
  if(!A())return;const tok=newScreen();
  render(back('showFoodHome()','Yemek')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  let w;try{w=await whoami(true)}catch(e){return render(back('showFoodHome()','Yemek')+errBox(e,'showFoodCourier()'))}
  if(!alive(tok))return;const c=w.courier;
  if(!c)return render(back('showFoodHome()','Yemek')+'<div class="fdCard fdForm" style="margin-top:10px"><h1 style="margin-top:0">🛵 Kurye ol</h1><p class="fdMuted">Başvurun platform yönetimi tarafından onaylandıktan sonra teslimat almaya başlayabilirsin.</p>'+
    '<label for="crN">Ad soyad</label><input id="crN" maxlength="60"><label for="crP">Telefon</label><input id="crP" type="tel" inputmode="tel"><label for="crV">Araç</label><select id="crV">'+Object.entries(VEH).map(([k,l])=>'<option value="'+k+'"'+(k==='motorbike'?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
    '<div class="fdErr" id="crE" hidden></div><button type="button" class="v2Btn pri block" style="margin-top:14px" onclick="foodCourierRegister(this)">Başvur</button></div>');
  if(c.status==='pending')return render(back('showFoodHome()','Yemek')+'<div class="fdHero" style="margin-top:10px"><div class="big">⏳</div><h2>Başvurun inceleniyor</h2><div class="fdMuted">Onaylandığında bildirim alacaksın. Bilgilerin: '+E(c.display_name)+' · '+E(VEH[c.vehicle_type]||'')+'</div></div>');
  if(c.status==='suspended')return render(back('showFoodHome()','Yemek')+'<div class="fdHero" style="margin-top:10px;background:rgba(220,38,38,.07)"><div class="big">⛔</div><h2>Kurye hesabın askıda</h2><div class="fdMuted">Detay için destekle iletişime geç.</div></div>');
  render(back('showFoodHome()','Yemek')+'<div class="fdTop" style="margin-top:10px"><div class="grow"><h1 style="margin:0">🛵 Kurye</h1><div class="fdMuted fdSmall">'+E(c.display_name)+(+c.rating_avg?' · ⭐ '+(+c.rating_avg).toFixed(1):'')+'</div></div><span class="fdLive" id="fdLive"></span><button type="button" class="fdIconBtn" id="fdBell" onclick="showFoodNotifications()" aria-label="Bildirimler">🔔</button></div>'+
    '<div class="fdCard" style="display:flex;gap:12px;align-items:center"><div style="flex:1"><b id="crAvT">'+(c.is_available?'🟢 Müsaitsin':'⚪ Müsait değilsin')+'</b><div class="fdMuted fdSmall">Müsaitken yeni teslimatları görürsün ve konumun ~45 sn\'de bir paylaşılır.</div></div><button type="button" class="v2Btn '+(c.is_available?'':'pri')+'" onclick="foodCourierAvail(this,'+(!c.is_available)+')">'+(c.is_available?'Molaya geç':'Müsaitim')+'</button></div>'+
    '<div id="crActive"></div><h2>Uygun teslimatlar</h2><div id="crPool">'+skel(1)+'</div><h2>Geçmiş</h2><div id="crHist"></div>');
  bellCount();
  if(c.is_available)geoStart();
  const load=async()=>{
    try{
      const [mine,pool]=await Promise.all([RPC('food_courier_my_deliveries'),RPC('food_courier_available')]);
      if(!alive(tok))return;
      const act=mine.find(d=>d.active);
      document.getElementById('crActive').innerHTML=act?courierActive(act):'';
      document.getElementById('crPool').innerHTML=act?'<div class="fdInfo">Aktif teslimatını tamamlayınca yeni teslimat alabilirsin.</div>':
        (!c.is_available?'<div class="fdInfo">Yeni teslimatları görmek için "Müsaitim" durumuna geç.</div>':
        pool.length?pool.map(p=>'<div class="fdCard" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(p.venue_name)+'</b><b style="color:var(--fd-ok)">'+M(p.courier_fee_kurus)+'</b></div>'+
          '<div class="fdMuted fdSmall">#'+E(p.order_no)+' · '+E(p.venue_district||'')+' → '+E(p.dropoff_district||'müşteri adresi')+' · '+(p.item_count||0)+' ürün'+(p.distance_to_venue_km!=null?' · restorana '+p.distance_to_venue_km+' km':'')+' · '+ago(p.searching_since)+'</div>'+
          '<div class="fdMuted fdSmall">Müşteri adresi ve telefonu kabul ettikten sonra görünür.</div>'+
          '<div class="fdActs"><button type="button" class="v2Btn pri" onclick="foodCourierAccept(\''+E(p.delivery_id)+'\',this)">Teslimatı kabul et</button><button type="button" class="v2Btn" onclick="foodCourierDecline(\''+E(p.delivery_id)+'\',this)">Reddet</button></div></div>').join(''):empty('🛵','Şu an uygun teslimat yok. Yeni teslimat geldiğinde burada görünür.'));
      const hist=mine.filter(d=>!d.active);
      document.getElementById('crHist').innerHTML=hist.length?'<div class="fdCard">'+hist.slice(0,10).map(d=>'<div class="fdLine"><span>#'+E(d.order_no)+' · '+E(d.venue.name)+'<br><small class="fdMuted">'+ago(d.updated_at)+'</small></span><span>'+E({delivered:'✅ Teslim edildi',failed:'⚠️ Başarısız',cancelled:'✖️ İptal',searching:'↩️ Bırakıldı'}[d.status]||d.status)+'<br><b>'+M(d.status==='delivered'?d.courier_fee_kurus:0)+'</b></span></div>').join('')+'</div>':'<div class="fdMuted fdSmall">Henüz teslimat yok.</div>';
    }catch(e){const p=document.getElementById('crPool');if(p)p.innerHTML=errBox(e,'showFoodCourier()')}
  };
  await load();
  watch(tok,[{table:'food_deliveries'},{table:'food_notifications',filter:'user_id=eq.'+UID()}],debounce((k,p)=>{if(p&&p.table==='food_notifications'){bellCount();if(p.eventType==='INSERT'&&p.new&&p.new.type==='courier_offer'){toast('🔔 Yeni teslimat var!');beep()}}load()},300));
}
function courierActive(d){
  const st=d.status,cu=d.customer||{},v=d.venue||{};
  const step={assigned:['at_venue','🏪 Restorana vardım'],at_venue:['picked_up','🛍️ Siparişi teslim aldım'],picked_up:['on_the_way','🛵 Yola çıktım'],on_the_way:['near_customer','📍 Müşteriye yaklaştım']}[st];
  const phase=['assigned','at_venue'].includes(st)?'Restorana git':'Müşteriye git';
  return '<h2>Aktif teslimat</h2><div class="fdCard" style="border-color:var(--fd-acc)"><div style="display:flex;justify-content:space-between;gap:8px"><b>#'+E(d.order_no)+' · '+E(phase)+'</b><b style="color:var(--fd-ok)">'+M(d.courier_fee_kurus)+'</b></div>'+
    '<div style="margin-top:6px">'+badge(d.order_status)+'</div>'+
    '<h3 style="margin-top:12px">🏪 '+E(v.name)+'</h3><div class="fdMuted fdSmall">'+E(v.address||v.district||'')+'</div><div class="fdActs"><a class="v2Btn sm" target="_blank" rel="noopener" href="'+mapsLink(v.lat,v.lng,(v.address||'')+' '+(v.district||''))+'">🧭 Yol tarifi</a>'+(v.phone?'<a class="v2Btn sm" href="tel:'+E(v.phone)+'">📞 Restoran</a>':'')+'</div>'+
    '<h3 style="margin-top:12px">📍 Müşteri</h3><div>'+E(cu.address||'')+'</div>'+(cu.note?'<div class="fdInfo">📝 '+E(cu.note)+'</div>':'')+
    '<div class="fdActs"><a class="v2Btn sm" target="_blank" rel="noopener" href="'+mapsLink(cu.lat,cu.lng,cu.address)+'">🧭 Yol tarifi</a>'+(cu.phone?'<a class="v2Btn sm" href="tel:'+E(cu.phone)+'">📞 Müşteriyi ara</a><a class="v2Btn sm" href="sms:'+E(cu.phone)+'">💬 SMS</a>':'')+'</div>'+
    '<ul style="margin:10px 0;padding-left:18px">'+(d.items||[]).map(i=>'<li>'+i.quantity+'× '+E(i.name)+'</li>').join('')+'</ul>'+
    (d.collect_kurus?'<div class="fdInfo">💵 Müşteriden tahsil edilecek: <b>'+M(d.collect_kurus)+'</b> ('+E(PAY[d.payment_method]||'')+')</div>':'<div class="fdInfo">Ödeme: '+E(PAY[d.payment_method]||'')+'</div>')+
    '<div class="fdActs">'+(step?'<button type="button" class="v2Btn pri" onclick="foodCourierStep(\''+E(d.delivery_id)+'\',\''+step[0]+'\',this)">'+step[1]+'</button>':'')+
      (['on_the_way','near_customer'].includes(st)?'<button type="button" class="v2Btn pri" onclick="foodCourierComplete(\''+E(d.delivery_id)+'\',this)">✅ Teslim et (kod)</button>':'')+
      (['assigned','at_venue'].includes(st)?'<button type="button" class="v2Btn fdGhostDanger" onclick="foodCourierRelease(\''+E(d.delivery_id)+'\',this)">Teslimattan vazgeç</button>':'')+
      (['picked_up','on_the_way','near_customer'].includes(st)?'<button type="button" class="v2Btn fdGhostDanger" onclick="foodCourierStep(\''+E(d.delivery_id)+'\',\'failed\',this)">Teslim edilemedi</button>':'')+'</div></div>';
}
window.foodCourierRegister=async function(btn){
  const n=document.getElementById('crN').value.trim(),p=document.getElementById('crP').value.trim(),v=document.getElementById('crV').value;const err=document.getElementById('crE');
  if(n.length<2){err.hidden=false;err.textContent='Adını yaz.';return}if(p.replace(/\D/g,'').length<10){err.hidden=false;err.textContent='Geçerli bir telefon yaz.';return}
  await once('crReg',btn,async()=>{try{await RPC('food_courier_register',{p_display_name:n,p_phone:p,p_vehicle:v});WHO=null;toast('Başvurun alındı');showFoodCourier()}catch(e){err.hidden=false;err.textContent=errMsg(e)}});
};
window.foodCourierAvail=async function(btn,on){
  await once('crAv',btn,async()=>{
    let lat=null,lng=null;
    if(on&&navigator.geolocation){try{const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000,maximumAge:60000}));lat=+p.coords.latitude.toFixed(5);lng=+p.coords.longitude.toFixed(5)}catch(e){toast('Konum alınamadı; mesafe bilgisi gösterilmeyecek.','warn')}}
    try{await RPC('food_courier_set_availability',{p_available:on,p_lat:lat,p_lng:lng});WHO=null;if(!on)geoStop();toast(on?'Müsaitsin, yeni teslimatlar gösteriliyor':'Moladasın');showFoodCourier()}catch(e){toast(errMsg(e),'err')}
  });
};
window.foodCourierAccept=async function(id,btn){await once('crAc'+id,btn,async()=>{try{await RPC('food_courier_accept',{p_delivery_id:id});toast('Teslimat senin! Restorana git.');showFoodCourier()}catch(e){toast(errMsg(e),'err');showFoodCourier()}})};
window.foodCourierDecline=async function(id,btn){await once('crDc'+id,btn,async()=>{try{await RPC('food_courier_decline',{p_delivery_id:id});toast('Teslimat listenden kaldırıldı');showFoodCourier()}catch(e){toast(errMsg(e),'err')}})};
window.foodCourierRelease=async function(id,btn){
  const r=await promptBox('Teslimattan vazgeç','Sebep',{required:true,danger:true,okLabel:'Vazgeç',text:'Teslimat başka bir kuryeye aktarılır. Bu teslimatı bir daha alamazsın.',chips:['Araç arızası','Acil durum','Restoranda çok bekledim']});if(!r)return;
  await once('crRl'+id,btn,async()=>{try{await RPC('food_courier_release',{p_delivery_id:id,p_reason:r});toast('Teslimat havuza geri döndü');showFoodCourier()}catch(e){toast(errMsg(e),'err')}});
};
window.foodCourierStep=async function(id,step,btn){
  let reason=null;
  if(step==='failed'){reason=await promptBox('Teslimat neden tamamlanamadı?','Sebep',{required:true,danger:true,okLabel:'Kaydet',chips:['Müşteriye ulaşılamadı','Adres bulunamadı','Müşteri teslim almadı']});if(!reason)return}
  if(step==='picked_up'&&!await confirmBox('Siparişi teslim aldın mı?','Ürünlerin tam olduğunu kontrol et.','Evet, aldım'))return;
  await once('crSt'+id,btn,async()=>{try{await RPC('food_courier_step',{p_delivery_id:id,p_step:step,p_reason:reason});showFoodCourier()}catch(e){toast(errMsg(e),'err');showFoodCourier()}});
};
window.foodCourierComplete=async function(id,btn){
  const code=await promptBox('Teslimat kodu','',{input:'code',okLabel:'Teslim et',text:'Müşteriden 4 haneli teslimat kodunu iste.'});if(!code)return;
  await once('crCp'+id,btn,async()=>{try{const r=await RPC('food_courier_complete',{p_delivery_id:id,p_code:code});
    if(r.ok){toast('🎉 Teslimat tamamlandı!');showFoodCourier()}else{toast(r.message||'Kod hatalı','err')}}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== Admin ====================== */
async function showFoodAdmin(){
  if(!A())return;const tok=newScreen();
  render(back('showFoodHome()','Yemek')+'<div style="margin-top:10px">'+skel(3)+'</div>');
  try{
    const w=await whoami(true);if(!w.is_admin)return render(back('showFoodHome()','Yemek')+empty('🔒','Bu alan yalnızca platform yönetimi içindir.'));
    const o=await RPC('food_admin_overview');if(!alive(tok))return;
    const sc=o.orders_by_status||{};
    render(back('showFoodHome()','Yemek')+'<h1 style="margin-top:10px">🛡️ Yemek yönetimi</h1>'+
      '<div class="fdKpi">'+Object.entries(sc).map(([k,n])=>'<div><b>'+n+'</b><span>'+E((STL[k]||['',k])[1])+' (7 gün)</span></div>').join('')+'<div><b>'+o.searching_deliveries+'</b><span>Kurye bekleyen</span></div></div>'+
      '<h2>Kurye başvuruları</h2>'+(o.pending_couriers.length?o.pending_couriers.map(c=>'<div class="fdCard" style="margin-bottom:8px"><b>'+E(c.name)+'</b> <span class="fdPill">'+E(c.status)+'</span><div class="fdMuted fdSmall">'+E(c.phone)+' · '+E(VEH[c.vehicle]||'')+' · '+ago(c.created_at)+'</div><div class="fdActs"><button type="button" class="v2Btn pri" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'approved\',this)">Onayla</button>'+(c.status!=='suspended'?'<button type="button" class="v2Btn fdGhostDanger" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button>':'')+'</div></div>').join(''):'<div class="fdMuted fdSmall">Bekleyen başvuru yok.</div>')+
      '<h2>Onaylı kuryeler</h2>'+(o.couriers.length?'<div class="fdCard">'+o.couriers.map(c=>'<div class="fdLine"><span>'+E(c.name)+' '+(c.is_available?'🟢':'⚪')+(+c.rating_avg?' · ⭐ '+(+c.rating_avg).toFixed(1):'')+'</span><button type="button" class="fdLink" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button></div>').join('')+'</div>':'<div class="fdMuted fdSmall">Onaylı kurye yok.</div>')+
      '<h2>Restoranlar</h2>'+o.venues.map(v=>'<div class="fdCard" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b>'+E(v.name)+'</b><span>'+(v.is_active?'Aktif':'Pasif')+' · '+(v.is_open?'Açık':'Kapalı')+'</span></div><div class="fdMuted fdSmall">Komisyon %'+(v.commission_bps/100).toFixed(2)+' · Hizmet bedeli '+M(v.platform_fee_kurus)+'</div><div class="fdActs"><button type="button" class="v2Btn sm" onclick="foodAdmVenue(\''+E(v.id)+'\','+v.commission_bps+','+v.platform_fee_kurus+','+v.is_active+')">Düzenle</button></div></div>').join('')+
      '<h2>Açık sorunlar</h2>'+(o.open_issues.length?o.open_issues.map(x=>'<div class="fdCard" style="margin-bottom:8px"><b>'+E(ISSUE[x.type]||x.type)+'</b> · #'+E(x.order_no)+'<div class="fdMuted fdSmall">'+E(x.description||'')+' · '+ago(x.created_at)+'</div><div class="fdActs"><button type="button" class="v2Btn sm pri" onclick="foodAdmIssue(\''+E(x.id)+'\',\'resolved\',this)">Çözüldü</button><button type="button" class="v2Btn sm" onclick="foodAdmIssue(\''+E(x.id)+'\',\'rejected\',this)">Reddet</button></div></div>').join(''):'<div class="fdMuted fdSmall">Açık sorun yok.</div>'));
  }catch(e){if(alive(tok))render(back('showFoodHome()','Yemek')+errBox(e,'showFoodAdmin()'))}
}
window.foodAdmCourier=async function(uid,st,btn){await once('ac'+uid,btn,async()=>{try{await RPC('food_admin_set_courier_status',{p_user_id:uid,p_status:st});toast('Kurye durumu güncellendi');showFoodAdmin()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmIssue=async function(id,st,btn){const r=await promptBox('Açıklama','Müşteriye iletilecek',{required:true});if(!r)return;await once('ai'+id,btn,async()=>{try{await RPC('food_update_issue',{p_issue_id:id,p_status:st,p_resolution:r});showFoodAdmin()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmVenue=function(id,bps,fee,active){
  const w=modal('<h3>Restoran ücretleri</h3><div class="fdForm"><label for="avB">Komisyon (%)</label><input id="avB" inputmode="decimal" value="'+(bps/100)+'"><label for="avF">Hizmet bedeli (TL, sipariş başına)</label><input id="avF" inputmode="decimal" value="'+kurusToTl(fee)+'">'+
    '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="avA" style="width:20px;min-height:20px"'+(active?' checked':'')+'> Aktif</label><div class="fdErr" id="avE" hidden></div></div><div class="fdRow2"><button type="button" class="v2Btn" data-x="no">Vazgeç</button><button type="button" class="v2Btn pri" data-x="ok">Kaydet</button></div>');
  w.querySelector('[data-x=no]').onclick=closeModal;
  w.querySelector('[data-x=ok]').onclick=async function(){const b=Math.round(parseFloat(w.querySelector('#avB').value.replace(',','.'))*100),f=tlToKurus(w.querySelector('#avF').value);const e=w.querySelector('#avE');
    if(!(b>=0&&b<=5000)){e.hidden=false;e.textContent='Komisyon %0-50 arası olmalı.';return}if(isNaN(f)){e.hidden=false;e.textContent='Hizmet bedelini doğru gir.';return}
    await once('av',this,async()=>{try{await RPC('food_admin_set_venue',{p_venue_id:id,p_commission_bps:b,p_platform_fee_kurus:f,p_is_active:w.querySelector('#avA').checked});closeModal();toast('Kaydedildi');showFoodAdmin()}catch(x){e.hidden=false;e.textContent=errMsg(x)}})};
};

/* ====================== Dışa aktarım (eski adlarla uyumlu) ====================== */
Object.assign(window,{
  showFoodHome,showFoodVenue,showFoodCart,showFoodOrders,showFoodOrderDetail,showFoodBusiness,showFoodMenu,showFoodSettings,
  showFoodVenueIssues,showFoodTeam,showFoodCourier,showFoodAdmin,showFoodNotifications,
  openFood:showFoodHome,foodLoad:()=>showFoodHome(),foodAdd:(id)=>window.foodQuickAdd&&window.foodQuickAdd(id),
  foodOrder:()=>showFoodCart(),foodMenu:showFoodMenu,
  __foodTest:{cartGet,cartSave,openNow,hoursText,errMsg,steps,tlToKurus,M}
});
})();
