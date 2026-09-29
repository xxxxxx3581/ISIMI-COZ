/* İşimi Çöz · Yemek — UI V2 (a7-food-v1.js)
   Güvenlik, para hesabı, yetki ve durum geçişleri veritabanında (RLS + RPC + trigger) korunur.
   Bu dosya yalnızca arayüzdür; İşimi Çöz'ün diğer modüllerine dokunmaz (tüm stiller .fd kapsamında). */
(()=>{
if(window.__A7_FOOD_V3__)return;window.__A7_FOOD_V3__=1;window.__A7_FOOD_V1__=1;window.__A7_FOOD_UI__=2;

/* ====================== Çekirdek yardımcılar ====================== */
const CART_KEY='isimi_food_cart_v2',OLD_CART_KEY='isimi_food_cart_v1',PHONE_KEY='isimi_food_phone',VENUE_KEY='isimi_food_my_venue',ADDR_KEY='isimi_food_addr_v2';
const E=v=>typeof escapeHTML==='function'?escapeHTML(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NF0=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}),NF2=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
/* Fiyat: tam sayı ise "1.050 TL", kuruşlu ise "1.050,50 TL" */
const M=k=>{k=Math.round(+k||0);return (k%100===0?NF0.format(k/100):NF2.format(k/100))+' TL'};
const S=()=>typeof getAuthSession==='function'?getAuthSession():null;
const UID=()=>S()?.user?.id||null;
const A=()=>{const s=S();if(!s?.access_token){toast('Devam etmek için giriş yapmalısın.','warn');try{openAuthModal?.('login')}catch(e){}return null}return s};
const Q=(m,p,b=null)=>window.supabaseAuthRequest(m,p,b);
const RPC=(fn,body)=>window.supabaseAuthRequest('POST','rpc/'+fn,body||{});
const NO=id=>String(id||'').slice(0,8).toUpperCase();
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const qa=(s,r)=>[...(r||document).querySelectorAll(s)];
function errMsg(e){
  let m=(e&&e.message)||String(e||'');
  if(/Failed to fetch|NetworkError|Load failed|network/i.test(m))return 'Bağlantı sorunu. İnternetini kontrol edip tekrar dene.';
  m=m.replace(/^FOOD_[A-Z]+:\s*/,'');
  if(/JWT|jwt expired/i.test(m))return 'Oturumun sona erdi. Lütfen tekrar giriş yap.';
  if(/permission denied|row-level security|violates row-level/i.test(m))return 'Bu işlem için yetkin yok.';
  if(/foreign key|23503/i.test(m))return 'Bu kayıt başka bir kayıtla bağlantılı olduğu için silinemiyor.';
  return m||'Beklenmeyen bir hata oluştu.';
}
function isNetErr(e){return /Failed to fetch|NetworkError|Load failed/i.test((e&&e.message)||'')}
/* food_reviews.order_id UNIQUE olduğu için PostgREST bu ilişkiyi nesne (veya null) döndürür; dizi gelirse de doğru çalışır. */
function hasReview(o){const r=o&&o.food_reviews;return Array.isArray(r)?r.length>0:!!r}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function ago(ts){if(!ts)return'';const d=(Date.now()-new Date(ts))/1000;if(d<60)return'az önce';if(d<3600)return Math.floor(d/60)+' dk önce';if(d<86400)return Math.floor(d/3600)+' sa önce';return new Date(ts).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}
function hm(ts){return ts?new Date(ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):''}
function dt(ts){if(!ts)return'';const d=new Date(ts);return d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'})+' · '+hm(ts)}
function tlToKurus(v){const n=Number(String(v??'').replace(/\s/g,'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):NaN}
function kurusToTl(k){k=+k||0;return k%100===0?String(k/100):(k/100).toFixed(2).replace('.',',')}
function trCap(s){s=String(s||'').trim();return s?s.charAt(0).toLocaleUpperCase('tr')+s.slice(1):''}
/* Serbest metin mutfak alanı → temiz etiketler ("Çorba,pide , lahmacun" → Çorba, Pide, Lahmacun) */
function cuisines(str){const seen=new Set();return String(str||'').split(/[,;/|•·]+/).map(t=>trCap(t.replace(/\s+/g,' ').trim().replace(/\s\S$/,''))).filter(t=>t.length>=3&&!seen.has(t.toLocaleLowerCase('tr'))&&seen.add(t.toLocaleLowerCase('tr')))}
function hue(s){let h=0;for(const c of String(s||'x'))h=(h*31+c.charCodeAt(0))%360;return h}

/* ====================== Ekran yaşam döngüsü ====================== */
let SCREEN=0;const CLEANUPS=[];
function newScreen(){SCREEN++;FDW_PANEL=0;while(CLEANUPS.length){try{CLEANUPS.pop()()}catch(e){}}closeModal();return SCREEN}
function alive(tok){return tok===SCREEN&&!!document.getElementById('fdRoot')}
function onCleanup(fn){CLEANUPS.push(fn)}
function topOffset(){const w=document.getElementById('fdwTop');if(w&&document.body.classList.contains('fdWorld'))return Math.round(w.getBoundingClientRect().bottom);const h=document.querySelector('.v2Top');return h?Math.round(h.getBoundingClientRect().height):0}
function render(html,opt){
  css();css2();css3();opt=opt||{};try{setNav?.('navFood')}catch(e){}
  fdwEnter();
  app('<div id="fdRoot" class="fd'+(opt.cls?' '+opt.cls:'')+'">'+html+'</div>');
  fdwSync();
  const r=document.getElementById('fdRoot');if(r)r.style.setProperty('--fd-top',topOffset()+'px');
}
/* Canlı yenilemede kaydırmayı bozmadan yerinde güncelle */
function patch(html){const r=document.getElementById('fdRoot');if(!r)return render(html);const y=window.scrollY;r.innerHTML=html;fdwSync();window.scrollTo(0,y)}
function setHTML(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;return el}

/* ====================== Toast / Modal / Sheet ====================== */
function toast(msg,kind){
  css();let box=document.getElementById('fdToasts');
  if(!box){box=document.createElement('div');box.id='fdToasts';box.className='fdToasts';box.setAttribute('aria-live','polite');document.body.appendChild(box)}
  while(box.children.length>=2)box.firstChild.remove();
  const t=document.createElement('div');t.className='fdToast '+(kind||'ok');t.setAttribute('role','status');t.textContent=msg;box.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300)},kind==='err'?5000:3000);
}
let MODAL_ESC=null;
function closeModal(){const m=document.getElementById('fdModal');if(m)m.remove();document.body.classList.remove('fdNoScroll');if(MODAL_ESC){document.removeEventListener('keydown',MODAL_ESC);MODAL_ESC=null}}
function modal(inner,opts){
  css();closeModal();opts=opts||{};
  const w=document.createElement('div');w.id='fdModal';w.className='fdModalWrap'+(opts.sheet?' sheet':'')+(opts.full?' full':'');
  w.innerHTML='<div class="fdModal fd" role="dialog" aria-modal="true">'+(opts.sheet?'<div class="fdGrab" aria-hidden="true"></div>':'')+inner+'</div>';
  w.addEventListener('click',ev=>{if(ev.target===w&&!opts.locked){closeModal();opts.onClose&&opts.onClose()}});
  document.body.appendChild(w);document.body.classList.add('fdNoScroll');
  if(!opts.locked){MODAL_ESC=ev=>{if(ev.key==='Escape'){closeModal();opts.onClose&&opts.onClose()}};document.addEventListener('keydown',MODAL_ESC)}
  const f=w.querySelector('[autofocus]');if(f)setTimeout(()=>f.focus(),80);
  return w;
}
function sheetHead(title,sub){return '<div class="fdSheetH"><div><h3>'+E(title)+'</h3>'+(sub?'<div class="fdMuted fdSmall">'+E(sub)+'</div>':'')+'</div><button type="button" class="fdX" aria-label="Kapat" data-x="close">✕</button></div>'}
function bindClose(w,res){qa('[data-x=close]',w).forEach(b=>b.onclick=()=>{closeModal();res&&res()})}
function confirmBox(title,text,okLabel,danger){
  return new Promise(res=>{
    const w=modal('<h3>'+E(title)+'</h3>'+(text?'<p class="fdMuted">'+E(text)+'</p>':'')+
      '<div class="fdRow2"><button type="button" class="fb" data-x="no">Vazgeç</button><button type="button" class="fb '+(danger?'danger':'pri')+'" data-x="ok">'+E(okLabel||'Onayla')+'</button></div>',{onClose:()=>res(false)});
    w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(false)};
    w.querySelector('[data-x=ok]').onclick=()=>{closeModal();res(true)};
  });
}
function promptBox(title,placeholder,opts){
  opts=opts||{};
  return new Promise(res=>{
    const chips=(opts.chips||[]).map(c=>'<button type="button" class="fdChip" data-c="'+E(c)+'">'+E(c)+'</button>').join('');
    const field=opts.input==='code'?'<input id="fdPr" class="fdCode" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="• • • •" autofocus>':
      opts.input==='tel'?'<input id="fdPr" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="'+E(placeholder||'')+'" value="'+E(opts.value||'')+'" autofocus>':
      '<textarea id="fdPr" rows="3" maxlength="500" placeholder="'+E(placeholder||'')+'" autofocus>'+E(opts.value||'')+'</textarea>';
    const w=modal(sheetHead(title,opts.text)+(chips?'<div class="fdChips wrap">'+chips+'</div>':'')+'<div class="fdForm">'+field+'</div>'+
      '<div class="fdErr" id="fdPrErr" hidden></div>'+
      '<div class="fdRow2"><button type="button" class="fb" data-x="no">Vazgeç</button><button type="button" class="fb '+(opts.danger?'danger':'pri')+'" data-x="ok">'+E(opts.okLabel||'Kaydet')+'</button></div>',{sheet:true,onClose:()=>res(null)});
    bindClose(w,()=>res(null));
    const inp=w.querySelector('#fdPr');
    qa('[data-c]',w).forEach(b=>b.onclick=()=>{inp.value=b.getAttribute('data-c');inp.focus()});
    w.querySelector('[data-x=no]').onclick=()=>{closeModal();res(null)};
    w.querySelector('[data-x=ok]').onclick=()=>{
      const v=inp.value.trim();const er=w.querySelector('#fdPrErr');
      if(opts.required&&!v){er.hidden=false;er.textContent=opts.requiredText||'Bu alan zorunlu.';return}
      if(opts.input==='code'&&!/^\d{4}$/.test(v)){er.hidden=false;er.textContent='4 haneli kodu gir.';return}
      if(opts.validate){const m=opts.validate(v);if(m){er.hidden=false;er.textContent=m;return}}
      closeModal();res(v);
    };
  });
}

/* ====================== Çift tıklama / çift gönderim koruması ====================== */
const BUSY=new Set();
async function once(key,btn,fn){
  if(BUSY.has(key))return;BUSY.add(key);
  let old;if(btn&&btn.tagName){old=btn.innerHTML;btn.disabled=true;btn.classList.add('fdBusy');btn.innerHTML='<span class="fdSpin" aria-hidden="true"></span>'}
  try{return await fn()}
  finally{BUSY.delete(key);if(btn&&btn.isConnected){btn.disabled=false;btn.classList.remove('fdBusy');btn.innerHTML=old}}
}

/* ====================== Realtime + güvenli yedek yoklama ====================== */
const RT={client:null,loading:null,live:false};
function rtLoad(){
  if(RT.client)return Promise.resolve(RT.client);
  if(RT.loading)return RT.loading;
  RT.loading=new Promise((res,rej)=>{
    const make=()=>{try{RT.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:5}}});res(RT.client)}catch(e){rej(e)}};
    if(window.supabase&&window.supabase.createClient)return make();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';s.async=true;s.crossOrigin='anonymous';
    s.onload=make;s.onerror=()=>{RT.loading=null;rej(new Error('realtime-load'))};
    document.head.appendChild(s);
    setTimeout(()=>{if(!RT.client){RT.loading=null;rej(new Error('realtime-timeout'))}},8000);
  });
  return RT.loading;
}
/* Canlılık göstergesi: yalnızca bağlantı yoksa küçük bir not gösterir (müşteriyi rahatsız etmez) */
function setLive(state){const el=document.getElementById('fdLive');if(!el)return;el.className='fdLive '+state;el.dataset.state=state;el.textContent=state==='poll'?'Otomatik yenileniyor':'';el.title=state==='on'?'Canlı':'20 sn\'de bir yenileniyor'}
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
  preparing:['👨‍🍳','Hazırlanıyor','Siparişin mutfakta hazırlanıyor.'],
  ready:['📦','Hazır','Siparişin hazır.'],
  courier_search:['🔎','Kurye aranıyor','Siparişin hazır, sana en yakın kurye aranıyor.'],
  courier_assigned:['🛵','Kurye atandı','Kurye siparişini almak için restorana gidiyor.'],
  courier_at_venue:['🏪','Kurye restoranda','Kurye siparişini teslim alıyor.'],
  picked_up:['🛍️','Kurye siparişi aldı','Siparişin kuryede, yola çıkmak üzere.'],
  on_the_way:['🛵','Yolda','Siparişin sana doğru geliyor.'],
  near_customer:['📍','Kurye yaklaştı','Kurye çok yakında. Teslimat kodunu hazır tut.'],
  delivered:['🎉','Teslim edildi','Afiyet olsun!'],
  rejected:['⛔','Restoran reddetti','Sipariş restoran tarafından reddedildi.'],
  cancelled:['✖️','İptal edildi','Sipariş iptal edildi.'],
  failed:['⚠️','Teslimat tamamlanamadı','Teslimat sırasında bir sorun oluştu.'],
  refund_pending:['↩️','İade süreci başladı','İaden işleme alındı.'],
  refunded:['💸','İade tamamlandı','İade tamamlandı.']
};
const TERMINAL=['delivered','rejected','cancelled','failed','refund_pending','refunded'];
const BAD=['rejected','cancelled','failed'];
const PAY={cash_on_delivery:'Kapıda nakit',card_on_delivery:'Kapıda kart',agree_with_venue:'Restoranla anlaşmalı',online_card:'Kartla online ödendi'};
const PAYI={cash_on_delivery:'💵',card_on_delivery:'💳',agree_with_venue:'🤝',online_card:'🔒'};
/* Faz 3/4 platform katmanı (pf-platform-v1.js) yüklüyse ek özellikler açılır; yoksa her şey eskisi gibi çalışır. */
const pfOn=()=>!!(window.PF&&window.PF.enabled);
const pfSet=()=>(window.PF&&window.PF.settings)||{};
const pfMissing=e=>/Could not find the function|PGRST202|schema cache/i.test((e&&e.message)||'');
const MODE={pickup:'Gel-al',self_delivery:'Restoran kuryesi',platform_delivery:'Kurye ile teslimat'};
const ISSUE={missing_item:'Eksik ürün',wrong_item:'Yanlış ürün',late:'Geç teslimat',damaged:'Hasarlı / uygunsuz ürün',not_delivered:'Teslim edilmedi',other:'Diğer'};
const DAYS=[['mon','Pazartesi'],['tue','Salı'],['wed','Çarşamba'],['thu','Perşembe'],['fri','Cuma'],['sat','Cumartesi'],['sun','Pazar']];
const VEH={walk:'🚶 Yaya',bike:'🚲 Bisiklet',motorbike:'🛵 Motosiklet',car:'🚗 Araba'};
function tone(st){return st==='delivered'?'ok':BAD.includes(st)?'bad':TERMINAL.includes(st)?'mute':'acc'}
function badge(st){const s=STL[st]||['•',st];return '<span class="fdBadge '+tone(st)+'">'+E(s[1])+'</span>'}

/* Çalışma saati (yalnızca gösterim; asıl kontrol veritabanında) */
const WK=['sun','mon','tue','wed','thu','fri','sat'];
function istNow(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Istanbul'}))}
const mm=s=>{const[a,b]=String(s).split(':');return(+a)*60+(+b)};
function openNow(v){
  if(!v||!v.is_active||!v.is_open)return false;
  const wh=v.working_hours;if(!wh||!Object.keys(wh).length)return true;
  const now=istNow();const d=now.getDay();const t=now.getHours()*60+now.getMinutes();
  for(const r of (wh[WK[d]]||[])){const o=mm(r[0]),c=mm(r[1]);if(c>o&&t>=o&&t<c)return true;if(c<=o&&t>=o)return true}
  for(const r of (wh[WK[(d+6)%7]]||[])){const o=mm(r[0]),c=mm(r[1]);if(c<=o&&t<c)return true}
  return false;
}
/* Kapalı restoran için "Bugün 18:00'de açılır" gibi kısa not */
function nextOpen(v){
  if(!v||!v.is_active)return 'Şu an hizmet vermiyor';
  if(!v.is_open)return 'Şu an sipariş almıyor';
  const wh=v.working_hours;if(!wh||!Object.keys(wh).length)return 'Şu an kapalı';
  const now=istNow();const d=now.getDay();const t=now.getHours()*60+now.getMinutes();
  for(let i=0;i<7;i++){const day=(d+i)%7;const rs=(wh[WK[day]]||[]).map(r=>mm(r[0])).sort((a,b)=>a-b);
    for(const o of rs){if(i===0&&o<=t)continue;const hh=String(Math.floor(o/60)).padStart(2,'0')+':'+String(o%60).padStart(2,'0');
      return (i===0?'Bugün ':i===1?'Yarın ':DAYS[(day+6)%7][1]+' ')+hh+"'de açılır"}}
  return 'Şu an kapalı';
}
function hoursRows(wh){
  if(!wh||!Object.keys(wh).length)return '<div class="fdMuted fdSmall">Restoran açık olduğu sürece sipariş alır.</div>';
  const today=WK[istNow().getDay()];
  return '<div class="fdKV2">'+DAYS.map(([k,l])=>'<span'+(k===today?' class="on"':'')+'>'+l+'</span><b'+(k===today?' class="on"':'')+'>'+E((wh[k]||[]).map(r=>r[0]+' – '+(r[1]==='24:00'?'00:00':r[1])).join(', ')||'Kapalı')+'</b>').join('')+'</div>';
}
function etaText(v,fulfill){const p=+v.prep_time_min||20,d=(fulfill||v.delivery_mode)==='pickup'?0:(+v.delivery_eta_min||30);const t=p+d;return t+'-'+(t+10)+' dk'}

/* ====================== Görseller ====================== */
const FOOD_ICONS=[[/lahmacun/i,'🫓'],[/iskender|i̇skender/i,'🍛'],[/kebap|kebab|adana|urfa/i,'🍢'],[/döner|doner|dürüm|durum/i,'🌯'],
 [/köfte|kofte/i,'🍖'],[/burger/i,'🍔'],[/pizza/i,'🍕'],[/patates/i,'🍟'],[/pide/i,'🥙'],[/tavuk|chicken|kanat/i,'🍗'],
 [/balık|balik|fish|hamsi/i,'🐟'],[/çorba|corba|soup/i,'🍲'],[/salata|salad|piyaz/i,'🥗'],[/makarna|pasta|mantı|manti/i,'🍝'],
 [/dondurma/i,'🍨'],[/baklava|künefe|kunefe|tatlı|tatli|sütlaç|sutlac/i,'🍮'],[/kahvaltı|kahvalti|börek|borek|poğaça|pogaca|simit/i,'🥐'],
 [/tost|sandviç|sandvic|sandwich/i,'🥪'],[/kahve|coffee/i,'☕'],[/kola|cola|içecek|icecek|ayran|\bsu\b|\bçay\b|meşrubat/i,'🥤'],[/ev yemek|sulu yemek|esnaf/i,'🍲']];
function foodIcon(name){const n=String(name||'');for(const[re,e]of FOOD_ICONS)if(re.test(n))return e;return '🍽️'}
/* pic: sabit oranlı görsel; yoksa ya da yüklenemezse şık, temaya uyumlu yer tutucu */
function pic(url,name,cls,emoji){
  const h=hue(name),ph='<span class="fdPh" style="--h:'+h+'"><i>'+(emoji||foodIcon(name))+'</i></span>';
  return '<span class="fdPic '+(cls||'')+'">'+ph+(url?'<img src="'+E(url)+'" alt="'+E(name||'')+'" loading="lazy" decoding="async" onerror="this.remove()">':'')+'</span>';
}
/* Yüklemeden önce tarayıcıda küçült: telefon fotoğrafları (4-5 MB) → ~200-400 KB WEBP/JPEG */
async function compressImage(file,maxSide){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Yalnızca JPG, PNG veya WEBP yükleyebilirsin.');
  try{
    const bmp=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file)});
    const sc=Math.min(1,maxSide/Math.max(bmp.naturalWidth,bmp.naturalHeight));
    const w=Math.round(bmp.naturalWidth*sc),h=Math.round(bmp.naturalHeight*sc);
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.drawImage(bmp,0,0,w,h);URL.revokeObjectURL(bmp.src);
    const blob=await new Promise(r=>cv.toBlob(b=>r(b),'image/webp',0.82));
    const out=blob&&blob.type==='image/webp'?blob:await new Promise(r=>cv.toBlob(b=>r(b),'image/jpeg',0.85));
    if(out&&out.size<file.size)return out;
  }catch(e){}
  return file;
}
async function uploadFoodImage(venueId,file,maxSide){
  if(!file)throw new Error('Dosya seçilmedi.');
  const blob=await compressImage(file,maxSide||1200);
  if(blob.size>5*1024*1024)throw new Error('Görsel en fazla 5 MB olabilir.');
  await (window.v2EnsureFreshToken?window.v2EnsureFreshToken():null);
  const tok=S()?.access_token;if(!tok)throw new Error('Giriş gerekli.');
  const type=blob.type||file.type;const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
  const path=venueId+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/food-images/'+path,{method:'POST',headers:{Authorization:'Bearer '+tok,apikey:SUPABASE_KEY,'Content-Type':type,'x-upsert':'false'},body:blob});
  if(!r.ok){let t='';try{t=(await r.json()).message}catch(e){}throw new Error(t||'Görsel yüklenemedi.')}
  return SUPABASE_URL+'/storage/v1/object/public/food-images/'+path;
}

/* ====================== Küçük bileşenler ====================== */
function bar(title,backFn,right,sub){
  return '<div class="fdBar">'+(backFn?'<button type="button" class="fdIco" aria-label="Geri" onclick="'+backFn+'">‹</button>':'')+
    '<div class="t"><b>'+E(title)+'</b>'+(sub?'<span>'+E(sub)+'</span>':'')+'</div>'+(right||'')+'</div>';
}
function bellBtn(){return '<button type="button" class="fdIco" id="fdBell" aria-label="Bildirimler" onclick="showFoodNotifications()">'+fdIco('bell',20)+'</button>'}
function row(icon,label,value,onclick,opt){opt=opt||{};
  return '<button type="button" class="fdRowBtn'+(opt.warn?' warn':'')+'" '+(opt.id?'id="'+opt.id+'" ':'')+'onclick="'+onclick+'"><span class="ic">'+icon+'</span><span class="tx"><small>'+E(label)+'</small><b>'+(value||'<em>'+E(opt.empty||'Ekle')+'</em>')+'</b></span><span class="ch">›</span></button>'}
function sw(id,on,onchange,label){return '<label class="fdSw"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+' onchange="'+onchange+'"><i></i>'+(label?'<span>'+E(label)+'</span>':'')+'</label>'}
function skel(kind,n){return Array.from({length:n||3}).map(()=>'<div class="fdSk '+(kind||'row')+'"></div>').join('')}
function empty(icon,title,text,cta){return '<div class="fdEmpty"><div class="i">'+icon+'</div><b>'+E(title)+'</b>'+(text?'<p>'+E(text)+'</p>':'')+(cta||'')+'</div>'}
function errBox(e,retry){return '<div class="fdErrBox"><b>Bir sorun oluştu</b><p>'+E(errMsg(e))+'</p>'+(retry?'<button type="button" class="fb sm" onclick="'+retry+'">Tekrar dene</button>':'')+'</div>'}
function stars(n){n=+n||0;return '<span class="fdStar">★ '+n.toFixed(1).replace('.',',')+'</span>'}

/* whoami önbelleği */
let WHO=null,WHO_AT=0;
async function whoami(force){if(!force&&WHO&&Date.now()-WHO_AT<60000)return WHO;WHO=await RPC('food_whoami');WHO_AT=Date.now();return WHO}

/* ====================== Stiller (yalnızca .fd kapsamı) ====================== */
function css(){
  if(document.getElementById('fdCss'))return;
  const s=document.createElement('style');s.id='fdCss';
  s.textContent=`
.fd{--fd-acc:var(--v2-pri,#0f9f6a);--fd-ink:var(--v2-pri-ink,#fff);--fd-soft:color-mix(in srgb,var(--fd-acc) 12%,transparent);--fd-ok:#0f9f6a;--fd-bad:#dc2626;--fd-warn:#d97706;--fd-star:#f59e0b;--fd-r:16px;--fd-top:0px;padding-bottom:20px;color:var(--text)}
.fd *{box-sizing:border-box}
.fd h1{font-size:22px;line-height:1.2;margin:4px 0 4px;letter-spacing:-.01em}.fd h2{font-size:17px;margin:22px 0 10px;letter-spacing:-.01em}.fd h3{font-size:16px;margin:0 0 4px}
.fd p{margin:4px 0}
.fdMuted{color:var(--muted)}.fdSmall{font-size:12.5px}.fdOk{color:var(--fd-ok)}.fdBad{color:var(--fd-bad)}
/* Butonlar */
.fb{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;transition:transform .08s}
.fb:active{transform:scale(.98)}.fb:disabled{opacity:.5;cursor:not-allowed}
.fb.pri{background:var(--fd-acc);border-color:var(--fd-acc);color:var(--fd-ink)}
.fb.danger{background:var(--fd-bad);border-color:var(--fd-bad);color:#fff}
.fb.ghost{background:transparent;border-color:transparent;color:var(--fd-acc);min-height:40px;padding:0 8px}
.fb.ghostBad{background:transparent;border-color:transparent;color:var(--fd-bad);min-height:40px;padding:0 8px}
.fb.sm{min-height:38px;padding:0 12px;font-size:13.5px;border-radius:11px}.fb.block{width:100%}
.fb.soft{background:var(--fd-soft);border-color:transparent;color:var(--fd-acc)}
/* Üst bar */
.fdBar{display:flex;align-items:center;gap:8px;margin:2px 0 12px;min-height:44px}.fdBar .t{flex:1;min-width:0}.fdBar .t b{display:block;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fdBar .t span{display:block;font-size:12px;color:var(--muted)}
.fdIco{position:relative;flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:19px;font-weight:700;display:grid;place-items:center;cursor:pointer;padding:0;line-height:1}
.fdDot{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:var(--fd-bad);color:#fff;font-size:11px;font-weight:800;line-height:19px}
.fdLive{font-size:0;font-weight:700;color:var(--fd-warn);white-space:nowrap}.fdLive:empty{display:none}.fdLive:before{content:'⟳';font-size:16px}@media(min-width:560px){.fdLive{font-size:11px}.fdLive:before{margin-right:4px;font-size:13px}}
/* Görsel */
.fdPic{position:relative;display:block;overflow:hidden;background:var(--v2-soft,rgba(127,127,127,.08));flex:0 0 auto}
.fdPic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.fdPh{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(135deg,hsl(var(--h) 70% 55% / .22),hsl(calc(var(--h) + 40) 75% 50% / .10))}
.fdPh i{font-style:normal;font-size:clamp(22px,38%,64px);filter:saturate(1.05)}
.fdPic.cover{aspect-ratio:16/9;width:100%}.fdPic.sq{aspect-ratio:1/1}.fdPic.fdLogo{aspect-ratio:1/1;border-radius:50%}
.fdPic.cover .fdPh i{font-size:52px}
/* Arama / çipler */
.fdSearch{position:relative;margin:0 0 12px}.fdSearch input{width:100%;height:48px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);padding:0 14px 0 42px;font:inherit;font-size:15px}
.fdSearch:before{content:'⌕';position:absolute;left:14px;top:50%;transform:translateY(-52%);font-size:22px;color:var(--muted)}
.fdChips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch;scrollbar-width:none}.fdChips::-webkit-scrollbar{display:none}.fdChips.wrap{flex-wrap:wrap;overflow:visible}
.fdChip{flex:0 0 auto;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
.fdChip.on{border-color:var(--fd-acc);background:var(--fd-soft);color:var(--fd-acc)}
/* Ana sayfa */
.fdAddr{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;margin:0 0 10px}
.fdAddr .ic{font-size:18px}.fdAddr .tx{flex:1;min-width:0}.fdAddr small{display:block;font-size:11.5px;color:var(--muted);font-weight:700}.fdAddr b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.fdActive{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:0;border-radius:var(--fd-r);background:var(--fd-acc);color:var(--fd-ink);font:inherit;text-align:left;cursor:pointer;margin:0 0 14px;box-shadow:0 8px 22px color-mix(in srgb,var(--fd-acc) 30%,transparent)}
.fdActive .e{font-size:26px}.fdActive .tx{flex:1;min-width:0}.fdActive small{display:block;opacity:.9;font-size:12px;font-weight:700}.fdActive b{display:block;font-size:15px}
.fdCuis{display:flex;gap:10px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}.fdCuis::-webkit-scrollbar{display:none}
.fdCuis button{flex:0 0 72px;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;color:var(--text);font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:0}
.fdCuis button span{width:60px;height:60px;border-radius:18px;display:grid;place-items:center;font-size:28px;background:var(--card);border:1px solid var(--line)}
.fdCuis button.on span{border-color:var(--fd-acc);background:var(--fd-soft)}.fdCuis button em{font-style:normal;max-width:72px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdGrid{display:grid;grid-template-columns:1fr;gap:14px}@media(min-width:720px){.fdGrid{grid-template-columns:1fr 1fr}}
.fdVCard{display:block;width:100%;padding:0;border:1px solid var(--line);border-radius:var(--fd-r);background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;overflow:hidden}
.fdVCard .fdVTop{position:relative;display:block}.fdVCard .fdPic.cover{border-radius:0}
.fdVCard .lg{position:absolute;left:12px;bottom:-18px;width:48px;border:3px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,.15)}
.fdVCard .rt{position:absolute;right:10px;top:10px}
.fdVCard .cl{position:absolute;inset:0;background:rgba(15,23,42,.55);color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;text-align:center;padding:10px}
.fdVCard .bd{padding:12px 14px 14px}.fdVCard .fdVTop+.bd.hasLogo{padding-top:24px}
.fdVCard h3{font-size:16.5px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdVCard .sub{font-size:13px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdVCard .mt{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:8px;font-size:13px;font-weight:700}
.fdVCard.closed{opacity:.85}.fdVCard.closed .fdPic img,.fdVCard.closed .fdPh{filter:grayscale(.7)}
.fdStar{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;background:var(--card);color:var(--text);font-size:12.5px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.fdStar:first-letter{color:var(--fd-star)}
.fdNew{display:inline-flex;padding:3px 8px;border-radius:999px;background:var(--fd-acc);color:var(--fd-ink);font-size:11.5px;font-weight:800}
.fdSecT{display:flex;justify-content:space-between;align-items:baseline;margin:22px 0 10px}.fdSecT h2{margin:0}
.fdPartner{margin-top:26px;border-top:1px solid var(--line);padding-top:14px}
.fdPartner .fdRowBtn{margin-bottom:8px}
/* Satır butonu */
.fdRowBtn{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;min-height:58px}
.fdRowBtn .ic{font-size:20px;width:26px;text-align:center}.fdRowBtn .tx{flex:1;min-width:0}.fdRowBtn small{display:block;font-size:11.5px;color:var(--muted);font-weight:700}
.fdRowBtn b{display:block;font-size:14.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.fdRowBtn b em{font-style:normal;color:var(--fd-acc)}.fdRowBtn .ch{font-size:22px;color:var(--muted)}
.fdRowBtn.warn{border-color:var(--fd-bad);box-shadow:0 0 0 3px rgba(220,38,38,.12)}.fdRowBtn.warn b em{color:var(--fd-bad)}
.fdRows>*+*{margin-top:8px}
/* Restoran sayfası */
.fdHero{position:relative;margin:-2px -2px 0;border-radius:var(--fd-r);overflow:hidden}
.fdHero .fdPic.cover{max-height:230px}
.fdHero .nav{position:absolute;left:10px;right:10px;top:10px;display:flex;justify-content:space-between}
.fdHero .nav .fdIco{background:rgba(255,255,255,.92);color:#0f172a;border:0;box-shadow:0 2px 10px rgba(0,0,0,.15)}
.fdVHead{display:flex;gap:12px;align-items:center;margin:14px 0 4px}.fdVHead .fdPic.fdLogo{width:56px}
.fdVHead h1{margin:0;font-size:21px}.fdVHead .sub{font-size:13px;color:var(--muted);margin-top:2px}
.fdStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;background:var(--card);margin:12px 0}
.fdStats div{padding:10px 8px;text-align:center}.fdStats div+div{border-left:1px solid var(--line)}
.fdStats small{display:block;font-size:11.5px;color:var(--muted);font-weight:700}.fdStats b{display:block;font-size:14px;margin-top:2px;white-space:nowrap}
.fdNote{border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700;margin:8px 0}
.fdNote.bad{background:rgba(220,38,38,.08);color:var(--fd-bad)}.fdNote.warn{background:rgba(217,119,6,.1);color:var(--fd-warn)}.fdNote.info{background:var(--v2-soft,rgba(127,127,127,.08));color:var(--text);font-weight:600}.fdNote.ok{background:rgba(15,159,106,.1);color:var(--fd-ok)}
.fdTabsS{position:sticky;top:var(--fd-top);z-index:15;background:var(--bg);margin:0 -12px;padding:8px 12px 6px;border-bottom:1px solid var(--line)}
.fdTabsS .fdChips{padding:0}
.fdPast{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:12px 14px;margin:12px 0}
.fdPast .hd{display:flex;justify-content:space-between;align-items:center;gap:8px}
.fdMenuSec{scroll-margin-top:calc(var(--fd-top) + 60px)}
.fdProd{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);cursor:pointer;align-items:flex-start}
.fdProd:last-child{border-bottom:0}.fdProd .tx{flex:1;min-width:0}.fdProd b{display:block;font-size:15px;line-height:1.3}
.fdProd p{font-size:13px;color:var(--muted);margin:4px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}
.fdProd .pr{margin-top:8px;font-weight:800;font-size:15px}
.fdProd .im{position:relative;width:104px;flex:0 0 104px}.fdProd .im .fdPic{border-radius:14px}
.fdProd.na{cursor:default}.fdProd.na .tx,.fdProd.na .im{opacity:.5}
.fdAdd{position:absolute;right:-6px;bottom:-6px;min-width:36px;height:36px;padding:0 8px;border-radius:12px;border:0;background:var(--card);color:var(--fd-acc);font-size:22px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.18);cursor:pointer;display:grid;place-items:center}
.fdAdd.in{background:var(--fd-acc);color:var(--fd-ink);font-size:14px}
.fdAddS{position:static;flex:0 0 auto;align-self:center}
.fdSold{position:absolute;left:6px;bottom:6px;padding:2px 8px;border-radius:999px;background:rgba(15,23,42,.8);color:#fff;font-size:11px;font-weight:800}
.fdCard{border:1px solid var(--line);border-radius:var(--fd-r);background:var(--card);color:var(--text);padding:14px}
.fdList{border:1px solid var(--line);border-radius:var(--fd-r);background:var(--card);padding:0 14px}
/* Ürün detay sayfası */
.fdItemHero{margin:-6px -18px 12px;border-radius:0}.fdItemHero.fdPic{aspect-ratio:4/3;max-height:42vh}
.fdGroupH{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:18px 0 2px;padding:10px 12px;border-radius:12px;background:var(--v2-soft,rgba(127,127,127,.07))}
.fdGroupH b{font-size:14.5px}.fdGroupH small{display:block;font-size:12px;color:var(--muted);font-weight:600}
.fdReq{flex:0 0 auto;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(217,119,6,.14);color:var(--fd-warn)}.fdReq.done{background:rgba(15,159,106,.13);color:var(--fd-ok)}
.fdOpt{display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 4px;border-bottom:1px solid var(--line);cursor:pointer}
.fdOpt:last-child{border-bottom:0}.fdOpt .tx{flex:1}.fdOpt .p{font-weight:700;font-size:14px;color:var(--muted)}
.fdOpt input{appearance:none;-webkit-appearance:none;width:22px;height:22px;margin:0;flex:0 0 22px;border:2px solid var(--line);border-radius:50%;display:grid;place-items:center;background:var(--card)}
.fdOpt input[type=checkbox]{border-radius:7px}
.fdOpt input:checked{border-color:var(--fd-acc);background:var(--fd-acc)}.fdOpt input:checked:after{content:'';width:8px;height:8px;border-radius:50%;background:var(--fd-ink)}
.fdOpt input[type=checkbox]:checked:after{width:10px;height:6px;border-radius:0;background:none;border-left:2.5px solid var(--fd-ink);border-bottom:2.5px solid var(--fd-ink);transform:rotate(-45deg) translate(1px,-1px)}
.fdOpt.na{opacity:.45;cursor:default}
.fdFoot{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom,0px));margin:16px -18px -18px;padding:12px 18px calc(14px + env(safe-area-inset-bottom,0px));background:var(--card);border-top:1px solid var(--line);display:flex;gap:10px;align-items:center}
.fdQty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}
.fdQty button{width:42px;height:46px;border:0;background:transparent;color:var(--fd-acc);font-size:20px;font-weight:800;cursor:pointer}.fdQty b{min-width:26px;text-align:center;font-size:15px}
.fdQty.sm button{width:36px;height:36px;font-size:17px}.fdQty.sm b{min-width:20px;font-size:14px}
/* Yapışkan alt çubuk */
.fdSticky{position:sticky;bottom:calc(68px + env(safe-area-inset-bottom,0px));z-index:20;margin-top:16px}
.fdCartBar{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px 8px 8px 16px;border:0;border-radius:16px;background:var(--fd-acc);color:var(--fd-ink);font:inherit;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.22);text-align:left}
.fdCartBar .n{min-width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:800;font-size:14px}
.fdCartBar .l{flex:1;font-weight:800;font-size:15px}.fdCartBar .r{font-weight:800;font-size:15px;padding:0 8px}
.fdCta{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 10px 28px rgba(0,0,0,.14)}
.fdCta .fb{flex:1;min-height:52px;font-size:16px}@media (max-width:380px){.fdCta{gap:6px;padding:8px}.fdCta .fb{min-width:0;padding:0 8px;font-size:14px}}
/* Sepet / checkout */
.fdLine{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:14.5px}.fdLine.total{font-size:17px;font-weight:900;border-top:1px solid var(--line);margin-top:6px;padding-top:12px}
.fdLine .m{color:var(--muted)}
.fdCartItem{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:center}.fdCartItem:last-of-type{border-bottom:0}
.fdCartItem .tx{flex:1;min-width:0}.fdCartItem b{display:block;font-size:14.5px}.fdCartItem small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.fdCartItem .pr{font-weight:800;font-size:14.5px;margin-top:4px}.fdCartItem .fdPic{width:56px;border-radius:12px}
.fdSeg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;background:var(--v2-soft,rgba(127,127,127,.09));padding:4px;border-radius:14px;margin:0 0 12px}
.fdSeg button{min-height:42px;padding:0 4px;border-radius:11px;border:0;background:transparent;color:var(--muted);font:inherit;font-weight:800;font-size:14px;cursor:pointer;white-space:nowrap}@media(max-width:400px){#fdTabs button{font-size:12.5px}}
.fdSeg button.on{background:var(--card);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.08)}.fdSeg button:disabled{opacity:.4}
.fdSeg button em{font-style:normal;display:inline-block;min-width:18px;height:18px;line-height:18px;border-radius:9px;background:var(--fd-acc);color:var(--fd-ink);font-size:10.5px;margin-left:3px;padding:0 4px;vertical-align:1px}
.fdSeg button em.z{background:var(--line);color:var(--muted)}
.fdRadio{display:grid;gap:8px}.fdRadio label{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:14px;cursor:pointer;margin:0;font-weight:700;background:var(--card)}
.fdRadio label.on{border-color:var(--fd-acc);box-shadow:0 0 0 3px var(--fd-soft)}.fdRadio label span{flex:1}.fdRadio small{display:block;font-weight:600;color:var(--muted);font-size:12.5px}
.fdRadio input{width:20px;height:20px;margin:0;accent-color:var(--fd-acc)}
/* Takip */
.fdTrackHero{border-radius:20px;padding:18px;background:var(--card);border:1px solid var(--line);margin:0 0 12px}
.fdTrackHero .st{display:flex;gap:12px;align-items:center}.fdTrackHero .st .e{font-size:34px}
.fdTrackHero h2{margin:0;font-size:20px}.fdTrackHero p{color:var(--muted);font-size:14px;margin-top:2px}
.fdEta{margin-top:14px;display:flex;justify-content:space-between;align-items:baseline}.fdEta small{color:var(--muted);font-weight:700;font-size:12.5px}.fdEta b{font-size:24px;letter-spacing:-.02em}
.fdSteps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px}
.fdSteps div{font-size:11.5px;font-weight:700;color:var(--muted);text-align:center}.fdSteps div i{display:block;height:6px;border-radius:3px;background:var(--line);margin-bottom:6px;overflow:hidden;position:relative}
.fdSteps div.done{color:var(--text)}.fdSteps div.done i{background:var(--fd-acc)}
.fdSteps div.cur{color:var(--fd-acc)}.fdSteps div.cur i:after{content:'';position:absolute;inset:0;width:50%;background:var(--fd-acc);border-radius:3px;animation:fdPulse 1.4s ease-in-out infinite}
@keyframes fdPulse{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.fdTrackHero.bad{background:rgba(220,38,38,.06);border-color:rgba(220,38,38,.3)}.fdTrackHero.ok{background:rgba(15,159,106,.07);border-color:rgba(15,159,106,.3)}
.fdCodeBox{display:flex;align-items:center;gap:14px;border:2px dashed var(--fd-acc);border-radius:16px;padding:12px 14px;margin:0 0 12px;background:var(--fd-soft)}
.fdCodeBox .tx{flex:1}.fdCodeBox small{display:block;font-size:12px;font-weight:700;color:var(--muted)}
.fdCodeBox b{font-size:30px;letter-spacing:8px;color:var(--fd-acc);font-variant-numeric:tabular-nums}
.fdPerson{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card);margin:0 0 12px}
.fdPerson .av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:var(--v2-soft,rgba(127,127,127,.1));flex:0 0 auto}
.fdPerson .tx{flex:1;min-width:0}.fdPerson b{display:block}.fdPerson small{display:block;color:var(--muted);font-size:12.5px}
.fdDet{border:1px solid var(--line);border-radius:14px;background:var(--card);margin:0 0 12px}
.fdDet>summary{list-style:none;cursor:pointer;padding:14px;font-weight:800;display:flex;justify-content:space-between;align-items:center}.fdDet>summary::-webkit-details-marker{display:none}
.fdDet>summary:after{content:'⌄';font-size:18px;color:var(--muted);transition:transform .2s}.fdDet[open]>summary:after{transform:rotate(180deg)}
.fdDet>div{padding:0 14px 14px}
.fdKV{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13.5px;margin-top:10px}.fdKV span{color:var(--muted)}
.fdKV2{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px}.fdKV2 span{color:var(--muted)}.fdKV2 b{text-align:right;font-weight:600}.fdKV2 .on{color:var(--fd-acc);font-weight:800}
.fdEv{list-style:none;margin:8px 0 0;padding:0;font-size:13px}.fdEv li{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px dashed var(--line)}.fdEv li:last-child{border-bottom:0}.fdEv span{color:var(--muted)}
/* Sipariş kartı (müşteri) */
.fdOCard{border:1px solid var(--line);border-radius:var(--fd-r);background:var(--card);margin-bottom:12px;overflow:hidden}
.fdOCard .hd{display:flex;gap:12px;align-items:center;padding:14px;cursor:pointer}.fdOCard .hd .fdPic{width:48px;border-radius:12px}
.fdOCard .hd .tx{flex:1;min-width:0}.fdOCard .hd b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fdOCard .hd small{display:block;color:var(--muted);font-size:12.5px}
.fdOCard .bd{padding:12px 14px 14px;border-top:1px solid var(--line)}
.fdOCard .stl{font-weight:800;font-size:14px;display:flex;gap:6px;align-items:center}.fdOCard .stl.ok{color:var(--fd-ok)}.fdOCard .stl.bad{color:var(--fd-bad)}.fdOCard .stl.acc{color:var(--fd-acc)}.fdOCard .stl.mute{color:var(--muted)}
.fdOCard .its{font-size:13.5px;color:var(--muted);margin-top:6px}
.fdOCard .acts{display:flex;gap:8px;margin-top:12px}.fdOCard .acts .fb{flex:1}
.fdBadge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800}
.fdBadge.acc{background:var(--fd-soft);color:var(--fd-acc)}.fdBadge.ok{background:rgba(15,159,106,.13);color:var(--fd-ok)}.fdBadge.bad{background:rgba(220,38,38,.1);color:var(--fd-bad)}.fdBadge.mute{background:var(--v2-soft,rgba(127,127,127,.12));color:var(--muted)}
.fdPill{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:700;background:var(--v2-soft,rgba(127,127,127,.1));color:var(--muted)}
/* İşletme paneli */
.fdSub{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:var(--v2-soft,rgba(127,127,127,.09));padding:4px;border-radius:14px;margin:0 0 14px}
.fdSub button{min-height:40px;border:0;border-radius:11px;background:transparent;color:var(--muted);font:inherit;font-weight:800;font-size:13.5px;cursor:pointer}.fdSub button.on{background:var(--card);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.08)}
.fdOpen{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--card);margin:0 0 12px}
.fdOpen .tx{flex:1}.fdOpen b{display:block}.fdOpen small{display:block;color:var(--muted);font-size:12.5px}
.fdOpen.on{border-color:rgba(15,159,106,.4);background:rgba(15,159,106,.06)}
.fdKpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}
.fdKpi div{border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:var(--card)}.fdKpi b{display:block;font-size:18px;white-space:nowrap}.fdKpi span{font-size:11.5px;color:var(--muted);font-weight:700}
.fdKpi div.hot{border-color:var(--fd-acc);background:var(--fd-soft)}.fdKpi div.hot b{color:var(--fd-acc)}
.fdBiz{border:1px solid var(--line);border-radius:var(--fd-r);background:var(--card);margin-bottom:12px;overflow:hidden}
.fdBiz.new{border-color:var(--fd-acc);box-shadow:0 0 0 3px var(--fd-soft)}
.fdBiz .hd{display:flex;justify-content:space-between;gap:10px;padding:12px 14px 0}.fdBiz .hd b{font-size:16px}.fdBiz .hd small{display:block;color:var(--muted);font-size:12px}
.fdBiz .tot{text-align:right}.fdBiz .tot b{font-size:17px}
.fdBiz .its{margin:10px 14px 0;padding:10px 12px;border-radius:12px;background:var(--v2-soft,rgba(127,127,127,.07));font-size:14px}
.fdBiz .its div+div{margin-top:4px}.fdBiz .its small{color:var(--muted);display:block;font-size:12.5px;margin-left:24px}
.fdBiz .its .q{display:inline-block;min-width:22px;font-weight:900;color:var(--fd-acc)}
.fdBiz .inf{padding:10px 14px 0;font-size:13.5px}.fdBiz .inf div{margin-top:3px}.fdBiz .inf a{color:var(--fd-acc);font-weight:700;text-decoration:none}
.fdBiz .ft{display:flex;gap:8px;align-items:center;padding:12px 14px 14px}.fdBiz .ft .fb.pri{flex:1}
.fdBiz .note{margin:10px 14px 0}
/* Formlar */
.fdForm label{display:block;font-size:13px;font-weight:800;margin:14px 0 6px}
.fdForm input:not([type=checkbox]):not([type=radio]):not([type=file]),.fdForm select,.fdForm textarea{width:100%;min-height:48px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);padding:10px 12px;font:inherit;font-size:15px}
.fdForm textarea{min-height:84px;resize:vertical}
.fdForm .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.fdForm .two label{margin-top:14px}
.fdForm .hint{font-size:12px;color:var(--muted);margin-top:4px}
.fdForm input[type=file]{min-width:0;max-width:100%;font-size:12px}
.fdHours{display:grid;gap:8px;margin-top:8px}.fdHours>div{display:grid;grid-template-columns:minmax(0,1.2fr) auto minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;font-size:13.5px;font-weight:700}
.fdHours input[type=time]{min-height:40px!important;min-width:0;width:100%;padding:6px!important;font-size:14px!important}
.fdSw{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-weight:700;margin:0!important}
.fdSw input{position:absolute;opacity:0;width:1px;height:1px}.fdSw i{position:relative;width:48px;height:28px;border-radius:14px;background:var(--line);transition:background .2s;flex:0 0 auto}
.fdSw i:after{content:'';position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:transform .2s}
.fdSw input:checked+i{background:var(--fd-ok)}.fdSw input:checked+i:after{transform:translateX(20px)}.fdSw input:focus-visible+i{outline:2px solid var(--fd-acc);outline-offset:2px}
.fdUp{display:flex;gap:12px;align-items:center}.fdUp .fdPic{width:76px;border-radius:14px}.fdUp .fdPic.cover{width:136px}
.fdUp label.fb{margin:0!important;font-size:13.5px}.fdUp input[type=file]{display:none}
/* Kurye */
.fdCourierAct{border:1px solid var(--fd-acc);border-radius:var(--fd-r);background:var(--card);overflow:hidden;margin-bottom:12px}
.fdCourierAct .hd{padding:12px 14px;background:var(--fd-soft);display:flex;justify-content:space-between;align-items:center;gap:10px}
.fdCourierAct .hd b{font-size:15px}.fdCourierAct .bd{padding:14px}
.fdCSteps{display:flex;gap:4px;margin:10px 0 2px}.fdCSteps i{flex:1;height:5px;border-radius:3px;background:var(--line)}.fdCSteps i.on{background:var(--fd-acc)}
.fdDest{border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:10px}
.fdDest.cur{border-color:var(--fd-acc)}.fdDest small{display:block;font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.fdDest b{display:block;font-size:15px;margin-top:2px}.fdDest p{font-size:13.5px;margin:2px 0 0}.fdDest .acts{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
/* Genel durumlar */
.fdEmpty{padding:34px 18px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:var(--fd-r)}
.fdEmpty .i{font-size:40px;margin-bottom:8px}.fdEmpty b{display:block;color:var(--text);font-size:16px}.fdEmpty p{font-size:13.5px;margin:4px 0 0}.fdEmpty .fb{margin-top:14px}
.fdSk{border-radius:var(--fd-r);background:linear-gradient(90deg,var(--card) 25%,var(--v2-soft,rgba(127,127,127,.1)) 50%,var(--card) 75%);background-size:200% 100%;animation:fdSk 1.2s infinite;border:1px solid var(--line);margin-bottom:12px}
.fdSk.row{height:84px}.fdSk.card{height:250px}.fdSk.hero{height:200px}.fdSk.line{height:18px;border-radius:9px;width:60%}
@keyframes fdSk{0%{background-position:200% 0}100%{background-position:-200% 0}}
.fdErrBox{border:1px solid rgba(220,38,38,.35);border-radius:14px;padding:16px;color:var(--fd-bad);background:rgba(220,38,38,.06)}.fdErrBox p{font-size:13.5px;margin:4px 0 12px;color:var(--text)}
.fdErr{color:var(--fd-bad);font-size:13px;font-weight:700;margin:8px 0}
.fdToasts{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:2147483600;display:grid;gap:8px;width:min(92vw,420px);pointer-events:none}
.fdToast{padding:12px 16px;border-radius:14px;font-weight:700;font-size:14px;color:#fff;background:#0f172a;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .3s,transform .3s;animation:fdIn .25s ease}
.fdToast.ok{background:#0f766e}.fdToast.err{background:#b91c1c}.fdToast.warn{background:#b45309}.fdToast.out{opacity:0;transform:translateY(-8px)}
@keyframes fdIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.fdModalWrap{position:fixed;inset:0;z-index:2147483500;background:rgba(2,6,23,.55);display:grid;place-items:center;padding:16px}
.fdModalWrap.sheet{place-items:end center;padding:0}
.fdModal{width:min(100%,460px);max-height:90vh;overflow:auto;background:var(--card);color:var(--text);border-radius:22px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding-bottom:18px}
.fdModalWrap.sheet .fdModal{width:min(100%,560px);border-radius:22px 22px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));animation:fdUpIn .22s ease}
.fdModalWrap.full .fdModal{max-height:94vh}
@keyframes fdUpIn{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
.fdGrab{width:40px;height:5px;border-radius:3px;background:var(--line);margin:-6px auto 10px}
.fdSheetH{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}.fdSheetH h3{font-size:18px;margin:0}
.fdX{width:36px;height:36px;border-radius:50%;border:0;background:var(--v2-soft,rgba(127,127,127,.12));color:var(--text);font-size:15px;cursor:pointer;flex:0 0 auto}
.fdModal textarea,.fdModal input:not([type=checkbox]):not([type=radio]):not([type=file]),.fdModal select{width:100%;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);padding:12px;font:inherit;font-size:15px}
.fdRow2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.fdNoScroll{overflow:hidden}
.fdSpin{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;display:inline-block;animation:fdSp .7s linear infinite}@keyframes fdSp{to{transform:rotate(360deg)}}
.fdBusy{opacity:.85}
.fdCode{font-size:30px!important;letter-spacing:14px;text-align:center;height:64px;font-variant-numeric:tabular-nums}
.fdStars{display:flex;gap:6px;margin:6px 0 10px}.fdStars button{width:46px;height:46px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-size:24px;cursor:pointer;color:var(--line)}.fdStars button.on{color:var(--fd-star);border-color:var(--fd-star)}
.fdLink{background:none;border:0;color:var(--fd-acc);font-weight:800;cursor:pointer;padding:8px 0;font:inherit;font-weight:800}
.fdCenter{text-align:center}
`;
  document.head.appendChild(s);
}

/* ====================== G1 · Mutfak kataloğu ====================== */
const CUISINES=[['Döner','🌯',/döner|doner|iskender/],['Kebap','🍢',/kebap|kebab|adana|urfa|ocakbaşı/],['Pide','🥙',/pide/],['Lahmacun','🫓',/lahmacun/],
 ['Çorba','🍲',/çorba|corba/],['Köfte','🍖',/köfte|kofte/],['Çiğ köfte','🌿',/çiğ ?köfte|cig ?kofte/],['Burger','🍔',/burger/],['Pizza','🍕',/pizza/],
 ['Tavuk','🍗',/tavuk|chicken|kanat/],['Ev yemekleri','🍛',/ev yemek|sulu yemek|esnaf/],['Tost ve sandviç','🥪',/tost|sandviç|sandvic/],
 ['Kahvaltı ve börek','🥐',/kahvaltı|kahvalti|börek|borek|gözleme/],['Tantuni ve dürüm','🌮',/tantuni|dürüm|durum|wrap/],['Izgara','🥩',/ızgara|izgara|steak|et /],
 ['Balık ve deniz ürünleri','🐟',/balık|balik|deniz|midye|hamsi/],['Makarna ve mantı','🍝',/makarna|mantı|manti|pasta/],['Salata ve sağlıklı','🥗',/salata|sağlıklı|vegan|vejetaryen/],
 ['Tatlı','🍮',/tatlı|tatli|baklava|künefe|kunefe|sütlaç/],['Dondurma','🍨',/dondurma/],['Pastane ve fırın','🍞',/pastane|fırın|firin|pasta |ekmek/],
 ['Kahve','☕',/kahve|coffee|cafe|kafe/],['Uzakdoğu','🍣',/sushi|uzakdoğu|çin|japon|noodle/],['Dünya mutfağı','🌍',/dünya|meksika|italyan|hint/]];
function catOf(token){const t=String(token||'').toLocaleLowerCase('tr');const c=CUISINES.find(x=>x[0].toLocaleLowerCase('tr')===t)||CUISINES.find(x=>x[2].test(t));return c?c[0]:null}
function catIcon(name){const c=CUISINES.find(x=>x[0]===name);return c?c[1]:foodIcon(name)}
/* Restoranın katalog mutfakları (eski serbest metinler de eşleşir) + eşleşmeyen etiketler */
function venueCats(v){const out=[];cuisines(v&&v.cuisine_type).forEach(t=>{const c=catOf(t)||t;if(!out.includes(c))out.push(c)});return out}

/* ====================== Harita (Leaflet + OpenStreetMap, anahtarsız) ====================== */
let LF=null;
function loadMap(){
  if(window.L&&window.L.map)return Promise.resolve(window.L);if(LF)return LF;
  LF=new Promise((res,rej)=>{
    const c=document.createElement('link');c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.async=true;
    s.onload=()=>res(window.L);s.onerror=()=>{LF=null;rej(new Error('Harita yüklenemedi.'))};document.head.appendChild(s);
    setTimeout(()=>{if(!window.L){LF=null;rej(new Error('Harita yüklenemedi.'))}},10000);
  });
  return LF;
}
const IZMIR=[38.4237,27.1428];
function mapIcon(L,emoji,cls){return L.divIcon({className:'fdMapPin'+(cls?' '+cls:''),html:'<span>'+emoji+'</span>',iconSize:[40,40],iconAnchor:[20,38]})}
function makeMap(L,el,center,zoom){const m=L.map(el,{zoomControl:true,attributionControl:true,maxZoom:19}).setView(center,zoom||15);
  let tc=null;try{tc=window.PF&&PF.tileConfig&&PF.tileConfig()}catch(e){}
  L.tileLayer(tc&&tc.url||'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:19,attribution:tc&&tc.attribution||'© OpenStreetMap katkıcıları'}).addTo(m);
  try{window.PF&&PF.enhanceMap&&PF.enhanceMap(L,m)}catch(e){}
  return m}
function distKm(a,b){if(!a||!b||a[0]==null||b[0]==null)return null;const R=6371,dLa=(b[0]-a[0])*Math.PI/180,dLo=(b[1]-a[1])*Math.PI/180;
  const x=Math.sin(dLa/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x))}

/* ====================== Favoriler ====================== */
let FAV=null;
async function favLoad(force){if(FAV&&!force)return FAV;try{const r=await Q('GET','food_favorites?select=venue_id&order=created_at.desc');FAV=new Set(r.map(x=>x.venue_id))}catch(e){FAV=FAV||new Set()}return FAV}
function favBtn(id,cls){const on=FAV&&FAV.has(id);return '<button type="button" class="fdFav'+(on?' on':'')+(cls?' '+cls:'')+'" data-fav="'+E(id)+'" aria-pressed="'+on+'" aria-label="'+(on?'Favorilerden çıkar':'Favorilere ekle')+'" onclick="event.stopPropagation();foodFav(\''+E(id)+'\',this)">'+(on?'♥':'♡')+'</button>'}
window.foodFav=async function(id,btn){
  await favLoad();const on=FAV.has(id);
  const set=v=>qa('[data-fav="'+id+'"]').forEach(b=>{b.classList.toggle('on',v);b.textContent=v?'♥':'♡';b.setAttribute('aria-pressed',v);b.setAttribute('aria-label',v?'Favorilerden çıkar':'Favorilere ekle')});
  set(!on);if(on)FAV.delete(id);else FAV.add(id);
  try{if(on)await Q('DELETE','food_favorites?venue_id=eq.'+id);else await Q('POST','food_favorites',{venue_id:id});toast(on?'Favorilerden çıkarıldı':'Favorilere eklendi');try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}}
  catch(e){set(on);if(on)FAV.add(id);else FAV.delete(id);toast(errMsg(e),'err')}
};

/* ====================== Rol seçici: Müşteri / İşletme / Kurye ====================== */
function roleBar(on){
  const b=(k,ic,l,fn)=>'<button type="button" class="'+(on===k?'on':'')+'"'+(on===k?' aria-current="page"':'')+' onclick="'+fn+'"><span>'+ic+'</span>'+l+'</button>';
  return '<nav class="fdRole" aria-label="Yemek bölümleri">'+b('customer','🍽️','Sipariş ver','showFoodHome()')+b('business','🏪','İşletmem','showFoodBusiness()')+b('courier','🛵','Kurye','showFoodCourier()')+'</nav>';
}
/* ====================== Ek stiller (G1–G6) ====================== */
function css2(){
  if(document.getElementById('fdCss2'))return;const s=document.createElement('style');s.id='fdCss2';
  s.textContent=`
.fdFav{width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#e11d48;font-size:20px;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.18);padding:0}
.fdFav.on{color:#e11d48}.fdVCard .fdFav{position:absolute;right:10px;top:10px}.fdVCard .rt{right:auto;left:10px}
.fdFree{position:absolute;left:10px;bottom:10px;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.95);color:#0f766e;font-size:12px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.fdVCard .fdLogo.lg+.fdFree,.fdVCard .hasLg .fdFree{left:70px}
.fdSearchBtn{display:flex;align-items:center;gap:10px;width:100%;height:48px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--muted);padding:0 14px;font:inherit;font-size:15px;cursor:pointer;margin:0 0 12px;text-align:left}
.fdSearchBtn b{font-size:20px;font-weight:400}
.fdCatGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(min-width:620px){.fdCatGrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.fdCatGrid button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:96px;padding:10px 6px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer;text-align:center;line-height:1.2}
.fdCatGrid button span{font-size:34px}.fdCatGrid button small{color:var(--muted);font-weight:600;font-size:11.5px}
.fdHist{display:flex;flex-wrap:wrap;gap:8px}.fdSecH{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px}.fdSecH b{font-size:15.5px}
.fdLogos{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.fdLogos::-webkit-scrollbar{display:none}
.fdLogos button{flex:0 0 78px;border:0;background:none;color:var(--text);font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:0;text-align:center}
.fdLogos .fdPic{width:72px;border-radius:18px;margin:0 auto 6px;border:1px solid var(--line)}.fdLogos em{font-style:normal;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdSRes{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer}.fdSRes:last-child{border-bottom:0}
.fdSRes .fdPic{width:52px;border-radius:12px}.fdSRes .tx{flex:1;min-width:0}.fdSRes b{display:block;font-size:14.5px}.fdSRes small{display:block;color:var(--muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdPop{display:flex;gap:10px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}.fdPop::-webkit-scrollbar{display:none}
.fdPop>div{position:relative;flex:0 0 150px;border:1px solid var(--line);border-radius:16px;background:var(--card);overflow:hidden;cursor:pointer}
.fdPop .fdPic{width:100%;aspect-ratio:4/3}.fdPop .bd{padding:8px 10px 10px}.fdPop b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fdPop .pr{font-weight:800;font-size:13.5px;margin-top:2px}
.fdPop .rk{position:absolute;left:8px;top:8px;padding:2px 8px;border-radius:999px;background:#ea580c;color:#fff;font-size:11px;font-weight:800;z-index:1}
.fdPop .fdAdd{right:8px;bottom:auto;top:calc(150px * .75 - 44px)}
.fdSide{margin-top:14px}.fdSide .fdOpt .fdPic{width:40px;border-radius:10px}
.fdMinBar{border-radius:14px;padding:10px 12px;margin:12px 0;background:rgba(217,119,6,.1);color:var(--fd-warn);font-weight:700;font-size:13.5px}
.fdMinBar i{display:block;height:6px;border-radius:3px;background:rgba(217,119,6,.2);margin-top:8px;overflow:hidden}.fdMinBar i b{display:block;height:100%;background:var(--fd-warn);border-radius:3px}
.fdPrefs .fdPref{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.fdPrefs .fdPref:last-child{border-bottom:0}
.fdPref .tx{flex:1}.fdPref b{display:block;font-size:14.5px}.fdPref small{display:block;color:var(--muted);font-size:12.5px}
.fdLegal{font-size:11.5px;color:var(--muted);text-align:center;margin:8px 6px 0;line-height:1.45}
.fdMap{height:220px;border-radius:16px;overflow:hidden;border:1px solid var(--line);margin:0 0 12px;position:relative;z-index:0;background:var(--v2-soft,rgba(127,127,127,.08))}
.fdMap.tall{height:min(56vh,420px)}.fdMap .leaflet-control-attribution{font-size:9px}.fdMap .leaflet-tooltip.fdTip{background:#fff;color:#0f172a;border:0;border-radius:8px;padding:2px 7px;font:700 11px/1.3 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2)}.fdMap .leaflet-tooltip.fdTip:before{display:none}.fdMap .leaflet-control-zoom a{width:34px;height:34px;line-height:34px}
.fdMapPin{background:none;border:0}.fdMapPin span{display:grid;place-items:center;width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.3);font-size:20px}
.fdMapPin span{line-height:1}.fdMapPin.cr span{background:var(--v2-pri,#0f9f6a)}
.fdMapCenter{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);font-size:38px;z-index:500;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))}
.fdActiveCard{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px;margin:0 0 14px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.06)}
.fdActiveCard .hd{display:flex;gap:12px;align-items:center}.fdActiveCard .e{font-size:30px}.fdActiveCard .tx{flex:1;min-width:0}
.fdActiveCard b{display:block;font-size:16px;color:var(--fd-acc)}.fdActiveCard small{display:block;color:var(--muted);font-size:12.5px}
.fdActiveCard .eta{text-align:right}.fdActiveCard .eta small{font-size:11px}.fdActiveCard .eta b{color:var(--text);font-size:18px}
.fdActiveCard .fdSteps{margin-top:12px}.fdActiveCard .fdSteps div{font-size:0}
.fdFar{font-size:12.5px;font-weight:700;color:var(--fd-warn);margin:-4px 0 10px;padding:0 4px}
.fdAlarm{position:sticky;top:var(--fd-top);z-index:30;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:#dc2626;color:#fff;font-weight:800;margin:0 0 12px;animation:fdBlink 1.2s ease-in-out infinite;cursor:pointer;border:0;width:100%;font:inherit;font-weight:800;text-align:left}
.fdAlarm span{flex:1}@keyframes fdBlink{50%{box-shadow:0 0 0 6px rgba(220,38,38,.25)}}
.fdTimer{font-weight:800}.fdTimer.late{color:var(--fd-bad)}
.fdCatPick{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.fdCatPick .fdChip{min-height:36px}
.fdRole{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 12px}
.fdRole button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;padding:0 6px;white-space:nowrap}
.fdRole button span{font-size:17px}.fdRole button.on{background:var(--fd-acc);border-color:var(--fd-acc);color:var(--fd-ink)}
@media(max-width:370px){.fdRole button{font-size:12.5px;gap:4px}.fdRole button span{font-size:15px}}
.fdBizStrip{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:14px;border:1px solid rgba(217,119,6,.45);background:rgba(217,119,6,.09);color:var(--text);font:inherit;text-align:left;cursor:pointer;margin:0 0 12px}
.fdBizStrip .tx{flex:1}.fdBizStrip b{display:block;font-size:14px}.fdBizStrip small{display:block;color:var(--muted);font-size:12px}
.fdApply{list-style:none;margin:6px 0 0;padding:0}
.fdApply li{display:flex;gap:12px;align-items:flex-start;padding:0 0 18px;position:relative}
.fdApply li:before{content:'';position:absolute;left:15px;top:32px;bottom:2px;width:2px;background:var(--line)}.fdApply li:last-child:before{display:none}
.fdApply i{flex:0 0 32px;height:32px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:14px;background:var(--v2-soft,rgba(127,127,127,.12));color:var(--muted)}
.fdApply li.done i{background:var(--fd-ok);color:#fff}.fdApply li.cur i{background:var(--fd-soft);color:var(--fd-acc);box-shadow:0 0 0 3px var(--fd-soft)}.fdApply li.bad i{background:var(--fd-bad);color:#fff}
.fdApply b{display:block;font-size:15px}.fdApply small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.fdDemo{font-size:11.5px;color:var(--muted);text-align:center;margin:10px 0 0}
.fdGps{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:12px;margin:0 0 12px;background:rgba(15,159,106,.09);color:var(--fd-ok)}
.fdGps.bad{background:rgba(220,38,38,.09);color:var(--fd-bad)}.fdGps.wait{background:rgba(217,119,6,.1);color:var(--fd-warn)}
.fdGps i{width:9px;height:9px;border-radius:50%;background:currentColor;flex:0 0 9px}.fdGps.ok i{animation:fdPing 1.6s ease-out infinite}
@keyframes fdPing{0%{box-shadow:0 0 0 0 rgba(15,159,106,.5)}100%{box-shadow:0 0 0 10px rgba(15,159,106,0)}}
.leaflet-marker-icon.fdMapPin{transition:transform .9s linear}
`;
  document.head.appendChild(s);
}

/* ====================== Faz 2 · Ayarlar önbelleği ====================== */
let SETS=null,SETS_AT=0;
async function foodSettings(force){if(!force&&SETS&&Date.now()-SETS_AT<60000)return SETS;try{const r=await Q('GET','food_settings?select=key,value');SETS={};(r||[]).forEach(x=>SETS[x.key]=x.value);SETS_AT=Date.now()}catch(e){SETS=SETS||{}}return SETS}

/* ====================== Faz 2 · Web Push ====================== */
const PUSH={ok:('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window)};
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.MSStream;
const isStandalone=()=>window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function b64uToBytes(s){s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);const r=atob(s),o=new Uint8Array(r.length);for(let i=0;i<r.length;i++)o[i]=r.charCodeAt(i);return o}
async function pushReg(){return navigator.serviceWorker.getRegistration('./')}
async function pushState(){
  if(!PUSH.ok)return isIOS()&&!isStandalone()?'ios':'unsupported';
  if(Notification.permission==='denied')return 'denied';
  try{const reg=await pushReg();const sub=reg&&await reg.pushManager.getSubscription();return sub&&Notification.permission==='granted'?'on':'off'}catch(e){return 'off'}
}
async function pushSave(sub){const j=sub.toJSON();return Q('POST','food_push_subscriptions',{endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,user_agent:String(navigator.userAgent||'').slice(0,200)})}
window.foodPushOn=async function(btn){
  await once('pushOn',btn,async()=>{
    try{
      if(!PUSH.ok)throw new Error(isIOS()?'iPhone\'da bildirim için önce siteyi Ana Ekrana ekle (Paylaş → Ana Ekrana Ekle).':'Bu tarayıcı anlık bildirimleri desteklemiyor.');
      const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Bildirim izni verilmedi.');
      const reg=await navigator.serviceWorker.register('./food-sw.js',{scope:'./'});await navigator.serviceWorker.ready;
      const key=await RPC('food_push_public_key');if(!key)throw new Error('Bildirim servisi hazır değil.');
      let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(key)});
      try{await pushSave(sub)}catch(e){
        if(!/duplicate|unique|23505|409/i.test(e.message||''))throw e;
        /* Aynı cihaz başka hesapta kayıtlıysa: aboneliği yenile, hesaplar karışmasın */
        try{const mine=await Q('GET','food_push_subscriptions?select=id&endpoint=eq.'+encodeURIComponent(sub.endpoint));if(mine&&mine.length){toast('🔔 Anlık bildirimler açık');pushDraw();return}}catch(x){}
        await sub.unsubscribe();sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(key)});await pushSave(sub);
      }
      toast('🔔 Anlık bildirimler açıldı');pushDraw();
    }catch(e){toast(errMsg(e),'err');pushDraw()}
  });
};
window.foodPushOff=async function(btn){
  await once('pushOff',btn,async()=>{try{const reg=await pushReg();const sub=reg&&await reg.pushManager.getSubscription();
    if(sub){try{await Q('DELETE','food_push_subscriptions?endpoint=eq.'+encodeURIComponent(sub.endpoint))}catch(e){}await sub.unsubscribe()}
    toast('Anlık bildirimler kapatıldı');pushDraw()}catch(e){toast(errMsg(e),'err')}});
};
function pushSlot(ctx){return '<div class="fdPushSlot" data-ctx="'+(ctx||'')+'"></div>'}
async function pushDraw(){
  const slots=qa('.fdPushSlot');if(!slots.length)return;const st=await pushState();
  slots.forEach(el=>{
    const ctx=el.dataset.ctx,compact=ctx!=='notif';
    const why=ctx==='business'?'Uygulama kapalıyken de yeni siparişlerden haberin olsun.':ctx==='courier'?'Yeni teslimat ve müşteri notlarını kaçırma.':'Sipariş durumun değişince telefonuna bildirim gelsin.';
    el.innerHTML=st==='on'?(compact?'':'<div class="fdNote ok" style="display:flex;justify-content:space-between;align-items:center;gap:8px">🔔 Anlık bildirimler açık<button type="button" class="fb sm" onclick="foodPushOff(this)">Kapat</button></div>'):
      st==='off'?'<div class="fdRowBtn" style="margin-bottom:12px;cursor:default"><span class="ic">🔔</span><span class="tx"><small>Anlık bildirim</small><b>'+E(why)+'</b></span><button type="button" class="fb sm pri" onclick="foodPushOn(this)">Aç</button></div>':
      st==='denied'?(compact?'':'<div class="fdNote warn">🔕 Bildirim izni kapalı. Tarayıcının site ayarlarından bu siteye bildirim izni verebilirsin.</div>'):
      st==='ios'?'<div class="fdNote info" style="margin-bottom:12px">📱 iPhone\'da anlık bildirim için siteyi Ana Ekrana ekle: Paylaş → <b>Ana Ekrana Ekle</b>, sonra oradan aç.</div>':
      (compact?'':'<div class="fdNote info">Bu tarayıcı anlık bildirimleri desteklemiyor; bildirimler uygulama içinde görünür.</div>');
  });
}
/* Bildirime dokununca ilgili ekran */
function foodNavTo(n){if(!n)return;if(n.dest==='business')return showFoodBusiness();if(n.dest==='courier')return showFoodCourier();if(n.order_id)return showFoodOrderDetail(n.order_id);return showFoodHome()}
if(PUSH.ok){try{navigator.serviceWorker.addEventListener('message',ev=>{if(ev.data&&ev.data.foodNav)foodNavTo(ev.data.foodNav)})}catch(e){}}
(function(){try{const u=new URL(location.href);const d=u.searchParams.get('food');if(!d)return;const oid=u.searchParams.get('order');
  u.searchParams.delete('food');u.searchParams.delete('order');history.replaceState(null,'',u.pathname+(u.search?u.search:'')+u.hash);
  let tries=0;const t=setInterval(()=>{tries++;if(S()&&typeof window.showFoodHome==='function'){clearInterval(t);foodNavTo({dest:d,order_id:oid})}else if(tries>20)clearInterval(t)},300)}catch(e){}})();

/* ====================== Sepet (yerel) ====================== */
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
function cartSave(c,keepReq){if(!keepReq)c.req=null;if(!c.items.length){localStorage.removeItem(CART_KEY);fdwCart();return}localStorage.setItem(CART_KEY,JSON.stringify(c));fdwCart()}
function cartCount(){return cartGet().items.reduce((n,x)=>n+(+x.quantity||0),0)}
function cartEst(){return cartGet().items.reduce((n,x)=>n+(+x.unit_kurus||0)*(+x.quantity||0),0)}
function cartQtyByItem(venueId){const c=cartGet(),m={};if(c.venue&&c.venue.id===venueId)c.items.forEach(x=>{m[x.menu_item_id]=(m[x.menu_item_id]||0)+x.quantity});return m}
async function cartAdd(venue,line,quiet){
  const c=cartGet();
  if(c.venue&&c.venue.id!==venue.id&&c.items.length){
    const ok=await confirmBox('Sepetini yenileyelim mi?','Sepetinde "'+c.venue.name+'" ürünleri var. Tek seferde bir restorandan sipariş verebilirsin.','Sepeti yenile',true);
    if(!ok)return false;
    c.items=[];
  }
  c.venue={id:venue.id,name:venue.name,delivery_mode:venue.delivery_mode,delivery_provider:venue.delivery_provider,image_url:venue.image_url||null};
  const ex=c.items.find(x=>x.key===line.key);
  if(ex)ex.quantity=Math.min(50,ex.quantity+line.quantity);else c.items.push(line);
  cartSave(c);refreshSticky();refreshProdBadges();if(!quiet){toast('Sepete eklendi');try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}}return true;
}
function stickyCart(){
  const n=cartCount();if(!n)return '';
  const cv=cartGet().venue;
  return '<div class="fdSticky" id="fdSticky">'+(cv&&HF.coupons&&HF.coupons.length?flashHint(cv.id,cartEst()):'')+'<button type="button" class="fdCartBar" onclick="showFoodCart()"><span class="n">'+n+'</span><span class="l">Sepete git</span><span class="r">'+M(cartEst())+'</span></button></div>';
}
function refreshSticky(){const el=document.getElementById('fdSticky');const html=stickyCart();if(el){if(html)el.outerHTML=html;else el.remove()}else if(html){const r=document.getElementById('fdRoot');if(r&&r.dataset.sticky==='1')r.insertAdjacentHTML('beforeend',html)}}
function refreshProdBadges(){if(!VENUE)return;const m=cartQtyByItem(VENUE.v.id);qa('[data-add]').forEach(b=>{const n=m[b.dataset.add]||0;b.classList.toggle('in',n>0);b.textContent=n>0?n:'+';b.setAttribute('aria-label',n>0?n+' adet sepette, bir tane daha ekle':'Sepete ekle')})}

/* ====================== Adres (kayıtlı + tek seferlik) ====================== */
let ADDRS=null;
function addrGet(){try{return JSON.parse(localStorage.getItem(ADDR_KEY)||'null')}catch(e){return null}}
function addrSet(a){if(a)localStorage.setItem(ADDR_KEY,JSON.stringify(a));else localStorage.removeItem(ADDR_KEY)}
function addrLine(a){return [a.neighborhood,a.address_note,a.district].filter(Boolean).join(', ')}
async function loadAddrs(force){if(ADDRS&&!force)return ADDRS;try{ADDRS=await Q('GET','saved_addresses?select=id,label,district,neighborhood,address_note,lat,lng&order=created_at.desc&limit=20')||[]}catch(e){ADDRS=ADDRS||[]}return ADDRS}
/* Seçili adresi doğrula: kayıtlı adres silinmişse ilk kayıtlıya düş */
async function currentAddr(){
  const list=await loadAddrs();let a=addrGet();
  if(a&&a.mode==='saved'&&!list.some(x=>x.id===a.id))a=null;
  if(!a&&list.length){const x=list[0];a={mode:'saved',id:x.id,label:x.label,text:addrLine(x),lat:x.lat,lng:x.lng};addrSet(a)}
  return a;
}
function addrValueHTML(a){return a?'<span>'+E(a.label||'Adres')+'</span> · '+E(a.text||''):''}
let ADDR_DRAFT=null;
function openAddressSheet(onDone,forceNew){
  const list=ADDRS||[];const cur=addrGet();const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  let showNew=forceNew||!list.length;
  const draw=()=>{
    const D=ADDR_DRAFT||{label:'Ev',d:'',n:'',t:'',save:true,lat:null,lng:null};
    const w=modal(sheetHead('Teslimat adresi')+
      (list.length?'<div class="fdRadio">'+list.map(a=>'<div style="display:flex;gap:6px;align-items:stretch"><label style="flex:1" class="'+(cur&&cur.id===a.id?'on':'')+'"><input type="radio" name="fdAdr" value="'+E(a.id)+'"'+(cur&&cur.id===a.id?' checked':'')+'><span>'+E(a.label)+(a.lat!=null?' 📍':'')+'<small>'+E(addrLine(a))+'</small></span></label>'+
        '<span style="display:flex;flex-direction:column;gap:4px"><button type="button" class="fb sm" data-ae="'+E(a.id)+'" aria-label="'+E(a.label)+' adresini düzenle">✏️</button><button type="button" class="fb sm ghostBad" style="border:1px solid var(--line)" data-ad="'+E(a.id)+'" aria-label="'+E(a.label)+' adresini sil">🗑</button></span></div>').join('')+'</div>':'')+
      (cur&&cur.mode==='text'?'<div class="fdNote info" style="margin-top:8px">Şu an: '+E(cur.text)+'</div>':'')+
      (showNew?'<div class="fdForm" id="fdNewA"><h3 style="margin-top:14px">'+(D.editId?'Adresi düzenle':'Yeni adres')+'</h3>'+
        '<label>Adres adı</label><div class="fdChips wrap" id="naL">'+['Ev','İş','Diğer'].map(l=>'<button type="button" class="fdChip'+(l===D.label?' on':'')+'" data-l="'+l+'">'+l+'</button>').join('')+'</div>'+
        '<div class="two"><div><label for="naD">İlçe</label><select id="naD"><option value="">Seç</option>'+ds.map(d=>'<option'+(d===D.d?' selected':'')+'>'+E(d)+'</option>').join('')+'</select></div><div><label for="naN">Mahalle</label><input id="naN" maxlength="60" autocomplete="address-level3" value="'+E(D.n)+'"></div></div>'+
        '<label for="naT">Açık adres</label><textarea id="naT" rows="3" maxlength="300" placeholder="Sokak, bina no, kat, daire, tarif" autocomplete="street-address">'+E(D.t)+'</textarea>'+
        '<div class="fdRow2" style="margin-top:10px"><button type="button" class="fb sm" id="naM">🗺️ '+(D.lat!=null?'Konum işaretli ✓':'Haritada işaretle')+'</button><button type="button" class="fb sm" id="naG">📍 Konumumu kullan</button></div>'+
        (D.editId?'<input type="checkbox" id="naS" checked hidden>':'<div style="margin-top:12px">'+'<label class="fdSw" style="font-size:13.5px"><input type="checkbox" id="naS"'+(D.save?' checked':'')+'><i></i><span>Adreslerime kaydet</span></label></div>')+
        '<div class="fdErr" id="naE" hidden></div><button type="button" class="fb pri block" style="margin-top:14px" id="naOk">Bu adresi kullan</button></div>':
       '<button type="button" class="fb soft block" style="margin-top:12px" id="fdAddNew">+ Yeni adres ekle</button>'),{sheet:true,full:true,onClose:()=>{ADDR_DRAFT=null}});
    bindClose(w,()=>{ADDR_DRAFT=null});
    qa('input[name=fdAdr]',w).forEach(r=>r.onchange=()=>{const a=list.find(x=>x.id===r.value);addrSet({mode:'saved',id:a.id,label:a.label,text:addrLine(a),lat:a.lat,lng:a.lng});ADDR_DRAFT=null;closeModal();onDone&&onDone()});
    qa('[data-ae]',w).forEach(b=>b.onclick=()=>{const a=list.find(x=>x.id===b.dataset.ae);if(!a)return;ADDR_DRAFT={editId:a.id,label:['Ev','İş','Diğer'].includes(a.label)?a.label:'Diğer',d:a.district||'',n:a.neighborhood||'',t:a.address_note||'',save:true,lat:a.lat,lng:a.lng};showNew=true;draw()});
    qa('[data-ad]',w).forEach(b=>b.onclick=async()=>{const a=list.find(x=>x.id===b.dataset.ad);if(!a)return;
      if(!await confirmBox('Adres silinsin mi?','"'+a.label+'" adresi kayıtlı adreslerinden kaldırılacak. Geçmiş siparişlerin etkilenmez.','Sil',true)){openAddressSheet(onDone);return}
      try{await Q('DELETE','saved_addresses?id=eq.'+encodeURIComponent(a.id));ADDRS=(ADDRS||[]).filter(x=>x.id!==a.id);const c=addrGet();if(c&&c.id===a.id)addrSet(null);toast('Adres silindi')}
      catch(e){if(/foreign key|23503/i.test((e&&e.message)||''))toast('Bu adres geçmiş bir siparişinde kullanıldığı için silinemiyor. İstersen düzenleyebilirsin.','warn');else toast(errMsg(e),'err')}
      openAddressSheet(onDone)});
    const an=w.querySelector('#fdAddNew');if(an)an.onclick=()=>{ADDR_DRAFT=null;showNew=true;draw();setTimeout(()=>{const t=document.getElementById('naT');t&&t.scrollIntoView({block:'center'})},100)};
    if(!showNew)return;
    let label=D.label,lat=D.lat,lng=D.lng;
    const snap=()=>({label,d:w.querySelector('#naD').value,n:w.querySelector('#naN').value,t:w.querySelector('#naT').value,save:w.querySelector('#naS').checked,lat,lng});
    qa('#naL [data-l]',w).forEach(b=>b.onclick=()=>{label=b.dataset.l;qa('#naL [data-l]',w).forEach(x=>x.classList.toggle('on',x===b))});
    w.querySelector('#naM').onclick=()=>{ADDR_DRAFT=snap();openMapPicker(ADDR_DRAFT.lat,ADDR_DRAFT.lng,(la,ln)=>{if(la!=null){ADDR_DRAFT.lat=la;ADDR_DRAFT.lng=ln}openAddressSheet(onDone,true)})};
    w.querySelector('#naG').onclick=function(){const btn=this;if(!navigator.geolocation)return toast('Cihazın konum paylaşımını desteklemiyor.','warn');btn.disabled=true;btn.textContent='Konum alınıyor…';
      navigator.geolocation.getCurrentPosition(p=>{lat=+p.coords.latitude.toFixed(6);lng=+p.coords.longitude.toFixed(6);btn.disabled=false;btn.textContent='📍 Konum eklendi ✓';const m=w.querySelector('#naM');if(m)m.textContent='🗺️ Konum işaretli ✓'},()=>{btn.disabled=false;btn.textContent='📍 Konumumu kullan';toast('Konum alınamadı. İzinleri kontrol et.','warn')},{timeout:10000,maximumAge:120000})};
    w.querySelector('#naOk').onclick=async function(){
      const x=snap(),er=w.querySelector('#naE');const d=x.d,n=x.n.trim(),t=x.t.trim();
      const fail=m=>{er.hidden=false;er.textContent=m};
      if(!d)return fail('İlçe seç.');if(t.length<10)return fail('Açık adresi sokak, bina ve daire bilgisiyle yaz.');
      if(D.editId){await once('addrEdit',this,async()=>{try{
        const r=await Q('PATCH','saved_addresses?id=eq.'+encodeURIComponent(D.editId),{label,district:d,neighborhood:n||null,address_note:t,lat,lng});
        const a=(r&&r[0])||Object.assign({},list.find(y=>y.id===D.editId),{label,district:d,neighborhood:n||null,address_note:t,lat,lng});
        ADDRS=(ADDRS||[]).map(y=>y.id===D.editId?a:y);const c=addrGet();if(c&&c.id===D.editId)addrSet({mode:'saved',id:a.id,label:a.label,text:addrLine(a),lat:a.lat,lng:a.lng});
        ADDR_DRAFT=null;closeModal();toast('Adres güncellendi');onDone&&onDone()}catch(e){fail(errMsg(e))}});return}
      if(!x.save){addrSet({mode:'text',label:'Bu sipariş için',text:[n,t,d].filter(Boolean).join(', '),lat,lng});ADDR_DRAFT=null;closeModal();onDone&&onDone();return}
      await once('addrSave',this,async()=>{try{
        const r=await Q('POST','saved_addresses',{user_id:UID(),label,district:d,neighborhood:n||null,address_note:t,lat,lng});
        const a=r&&r[0];if(!a)throw new Error('Adres kaydedilemedi.');ADDRS=[a].concat(ADDRS||[]);
        addrSet({mode:'saved',id:a.id,label:a.label,text:addrLine(a),lat:a.lat,lng:a.lng});ADDR_DRAFT=null;closeModal();toast('Adres kaydedildi');onDone&&onDone();
      }catch(e){fail(errMsg(e))}});
    };
  };
  draw();
}
/* Harita üzerinde konum seç: harita kayar, iğne ortada sabit */
async function openMapPicker(lat,lng,cb){
  const w=modal(sheetHead('Konumu işaretle','Haritayı kaydırarak iğneyi kapına getir.')+'<div class="fdMap tall" id="fdPick"><span class="fdMapCenter">📍</span></div>'+
    '<div class="fdRow2" style="margin-top:0"><button type="button" class="fb" data-x="me">📍 Konumum</button><button type="button" class="fb pri" data-x="ok">Bu konumu kullan</button></div>',{sheet:true,full:true,onClose:()=>cb(null)});
  bindClose(w,()=>cb(null));
  let map=null;
  try{const L=await loadMap();if(!document.getElementById('fdPick'))return;map=makeMap(L,'fdPick',lat!=null?[lat,lng]:IZMIR,lat!=null?18:12);setTimeout(()=>map.invalidateSize(),200)}
  catch(e){setHTML('fdPick','<div class="fdEmpty" style="border:0">'+E(errMsg(e))+'</div>')}
  w.querySelector('[data-x=me]').onclick=function(){if(!navigator.geolocation||!map)return;const b=this;b.disabled=true;navigator.geolocation.getCurrentPosition(p=>{b.disabled=false;map.setView([p.coords.latitude,p.coords.longitude],18)},()=>{b.disabled=false;toast('Konum alınamadı.','warn')},{timeout:10000})};
  w.querySelector('[data-x=ok]').onclick=()=>{if(!map)return;const c=map.getCenter();closeModal();cb(+c.lat.toFixed(6),+c.lng.toFixed(6))};
}
window.foodAddrSheet=async function(ctx){await loadAddrs();openAddressSheet(()=>{if(ctx==='home')homeAddr();else if(ctx==='co'){CO.refresh&&CO.refresh()}})};

/* ====================== Bildirim zili ====================== */
async function bellCount(){
  try{const r=await Q('GET','food_notifications?select=id&read_at=is.null&limit=50');const el=document.getElementById('fdBell');if(el){const n=r.length;el.innerHTML=fdIco('bell',20)+(n?'<span class="fdDot">'+(n>9?'9+':n)+'</span>':'');el.setAttribute('aria-label',n?'Bildirimler, '+n+' okunmamış':'Bildirimler')}}catch(e){}
}

/* ====================== F2 · Yemek ana sayfa ====================== */
const HF={q:'',cuisine:'',rows:[],offset:0,done:false,f:{},addr:null,promos:[],coupons:[]};
async function showFoodHome(){
  if(!A())return;FDW_TAB='home';const tok=newScreen();
  render('<div class="fdwHomeTop"><button type="button" class="fdAddr" id="fdAddrBar" onclick="foodAddrSheet(\'home\')"><span class="ic">'+fdIco('pin',20)+'</span><span class="tx"><small>Teslimat adresi</small><b>…</b></span><span class="fdMuted" aria-hidden="true">⌄</span></button>'+
    '<span class="fdLive" id="fdLive"></span><button type="button" class="fdIco fdwPanelH" id="fdwPanelH" onclick="foodPanels()" aria-label="Paneller" hidden>'+fdIco('grid',20)+'<i hidden></i></button>'+bellBtn()+'</div><div id="fdFar"></div>'+
    '<button type="button" class="fdSearchBtn" onclick="showFoodSearch()"><span class="s">'+fdIco('search',20)+'</span><span class="p">Restoran, yemek veya mutfak ara</span><span class="f">Filtrele</span></button>'+
    (pfSet().orders_enabled===false?'<div class="fdNote warn" role="status" style="margin:0 0 12px">⏸️ <b>Sipariş alımı kısa süreliğine durduruldu.</b> Menülere göz atabilirsin; birazdan tekrar dene.</div>':'')+
    '<div id="fdActiveO"></div><div id="fdRateC"></div><div id="fdwFlash"></div>'+
    '<div id="fdwHero"></div><div id="fdwCoupons"></div>'+
    '<div class="fdCuis" id="fdCuis" role="group" aria-label="Mutfaklar"></div><div class="fdwChips" id="fdwChips" role="group" aria-label="Hızlı filtreler"></div>'+
    '<div id="fdFavs"></div><div id="fdwAgain"></div><div id="fdwTopI"></div><div id="fdwRails"></div><div id="fdwMid"></div>'+
    '<div id="fdList" style="margin-top:6px">'+skel('card',2)+'</div><div id="fdMore"></div>');
  const root=document.getElementById('fdRoot');root.dataset.sticky='1';root.insertAdjacentHTML('beforeend',stickyCart());
  bellCount();homeAddr();homeActive(tok);
  HF.rows=[];HF.offset=0;HF.done=false;HF.q='';HF.promos=[];HF.coupons=[];HF.fl='';
  await Promise.all([homeLoad(tok),favLoad(true),promosLoad(tok),couponsLoad(tok),homeExtra(tok)]);if(alive(tok)){homeRender();heroRender(tok);flashRender();flashTick(tok);onCleanup(()=>flashLayerClose(true));flashAutoOpen()}
  watch(tok,[{table:'food_notifications',filter:'user_id=eq.'+UID()},{table:'food_orders',filter:'customer_id=eq.'+UID()}],(k,p)=>{if(!p||p.table==='food_notifications')bellCount();if(!p||p.table==='food_orders')homeActive(tok)});
}
async function homeAddr(){
  const a=await currentAddr();HF.addr=a&&a.lat!=null?[+a.lat,+a.lng]:null;const b=document.querySelector('#fdAddrBar b');if(b)b.innerHTML=a?E(a.label)+' · '+E(a.text):'<span style="color:var(--fd-acc)">Adres ekle</span>';
  if(document.getElementById('fdList')&&HF.rows.length)homeRender();
  /* Seçili adres bulunduğun konumdan uzaksa uyar (izin zaten verilmişse; izin istemez) */
  try{
    if(!a||a.lat==null||!navigator.permissions||!navigator.geolocation)return;
    const st=await navigator.permissions.query({name:'geolocation'});if(st.state!=='granted')return;
    navigator.geolocation.getCurrentPosition(p=>{const d=distKm([p.coords.latitude,p.coords.longitude],[a.lat,a.lng]);
      if(d!=null&&d>1.5)setHTML('fdFar','<div class="fdFar">⚠️ Seçili adres bulunduğun konumdan uzakta ('+d.toFixed(1).replace('.',',')+' km).</div>')},()=>{},{timeout:6000,maximumAge:300000});
  }catch(e){}
}
async function homeActive(tok){
  try{
    const since=new Date(Date.now()-3*3600e3).toISOString();
    const r=await Q('GET','food_orders?select=id,status,delivery_mode,estimated_delivery_at,estimated_ready_at,delivered_at,total_kurus,food_venues(name,image_url),food_reviews(id)&customer_id=eq.'+UID()+
      '&or=(status.not.in.('+TERMINAL.join(',')+'),and(status.eq.delivered,delivered_at.gt.'+since+'))&order=created_at.desc&limit=6');
    if(!alive(tok))return;
    const act=(r||[]).filter(o=>!TERMINAL.includes(o.status)),done=(r||[]).filter(o=>o.status==='delivered');
    setHTML('fdActiveO',act.length?(act.length>1?'<div class="fdSecH" style="margin-top:0"><b>Aktif siparişlerin · '+act.length+'</b></div>':'')+act.map(activeCard).join(''):'');
    /* Teslim edilen sipariş ana sayfada kart olarak kalmaz; değerlendirilmemişse BİR KEZ kısa soru gösterilir. Sipariş, Siparişlerim'de durur. */
    const recent=o=>o.delivered_at&&Date.now()-new Date(o.delivered_at)<3*3600e3;
    const ask=done.find(o=>recent(o)&&!hasReview(o)&&!ratePrompted(o.id));
    setHTML('fdRateC',ask?rateCard(ask):'');
  }catch(e){}
}
function activeCard(o){
  const st=STL[o.status]||['🍽️',o.status];const stg=stageOf(o);const eta=o.delivery_mode==='pickup'?o.estimated_ready_at:o.estimated_delivery_at;const vn=o.food_venues?o.food_venues.name:'Restoran';
  return '<div class="fdActiveCard"><div class="hd">'+pic(o.food_venues&&o.food_venues.image_url||'',vn,'sq').replace('class="fdPic sq"','class="fdPic sq" style="width:44px;border-radius:12px"')+
    '<div class="tx"><small>'+E(vn)+' · #'+E(NO(o.id))+'</small><b>'+st[0]+' '+E(st[1])+'</b></div>'+
    (eta?'<div class="eta"><small>'+(o.delivery_mode==='pickup'?'Hazır':'Tahmini')+'</small><b>'+hm(eta)+'</b></div>':'')+'</div>'+
    '<div class="fdSteps">'+[0,1,2,3].map(i=>'<div class="'+(i<stg?'done':i===stg?'cur':'')+'"><i></i>.</div>').join('')+'</div>'+
    '<button type="button" class="fb pri block" style="margin-top:12px;min-height:44px" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">'+(['picked_up','on_the_way','near_customer'].includes(o.status)?'🛵 Siparişi canlı izle':'Siparişi izle')+'</button></div>';
}
const RATE_KEY='isimi_food_rate_prompted';
function ratePrompted(id){try{return (JSON.parse(localStorage.getItem(RATE_KEY)||'[]')).includes(id)}catch(e){return false}}
function rateMark(id){try{const l=JSON.parse(localStorage.getItem(RATE_KEY)||'[]');if(!l.includes(id)){l.push(id);localStorage.setItem(RATE_KEY,JSON.stringify(l.slice(-30)))}}catch(e){}}
function rateCard(o){
  const vn=o.food_venues?o.food_venues.name:'Restoran';
  return '<div class="fdwRate" role="region" aria-label="Siparişini değerlendir"><div class="tx"><b>Siparişin nasıldı?</b><small>'+E(vn)+' · #'+E(NO(o.id))+(o.delivered_at?' · '+hm(o.delivered_at)+' teslim edildi':'')+'</small></div>'+
    '<div class="ac"><button type="button" class="fb sm" data-x="later" onclick="foodRateLater(\''+E(o.id)+'\')">Daha sonra</button><button type="button" class="fb sm pri" data-x="rate" onclick="foodRateLater(\''+E(o.id)+'\');foodReview(\''+E(o.id)+'\','+(o.delivery_mode==='platform_delivery')+')">★ Değerlendir</button></div></div>';
}
window.foodRateLater=function(id){rateMark(id);setHTML('fdRateC','')};
function ratePrompt(o){
  rateMark(o.id);const vn=o.food_venues?o.food_venues.name:'Restoran';
  const w=modal(sheetHead('Siparişin nasıldı?',vn+' · #'+NO(o.id)+(o.delivered_at?' · '+hm(o.delivered_at)+' teslim edildi':''))+
    '<p class="fdMuted" style="margin:0 0 14px">Değerlendirmen restoranın ve kuryenin gelişmesine yardımcı olur. İstersen daha sonra Siparişlerim\'den de yapabilirsin.</p>'+
    '<div class="fdRow2"><button type="button" class="fb" data-x="later">Daha sonra</button><button type="button" class="fb pri" data-x="rate">★ Değerlendir</button></div>',{sheet:true});
  bindClose(w);w.querySelector('[data-x=later]').onclick=()=>closeModal();
  w.querySelector('[data-x=rate]').onclick=()=>{closeModal();foodReview(o.id,o.delivery_mode==='platform_delivery')};
}
function doneCard(o){
  const vn=o.food_venues?o.food_venues.name:'Restoran';const reviewed=hasReview(o);
  return '<div class="fdActiveCard" style="border-color:rgba(15,159,106,.35)"><div class="hd"><span class="e">✅</span><div class="tx"><small>'+E(vn)+' · #'+E(NO(o.id))+'</small><b style="color:var(--fd-ok)">Teslim edildi'+(o.delivered_at?' · '+hm(o.delivered_at):'')+'</b></div><div class="eta"><small>Toplam</small><b>'+M(o.total_kurus)+'</b></div></div>'+
    '<div class="fdRow2" style="margin-top:12px">'+(reviewed?'<button type="button" class="fb" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">Detay</button>':'<button type="button" class="fb soft" onclick="foodReview(\''+E(o.id)+'\','+(o.delivery_mode==='platform_delivery')+')">★ Değerlendir</button>')+
    '<button type="button" class="fb" onclick="foodReorder(\''+E(o.id)+'\',this)">↻ Tekrarla</button></div></div>';
}
const VSEL='id,created_at,name,district,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,cover_url,rating_avg,rating_count,lat,lng';
async function homeLoad(tok){
  try{
    const rows=await Q('GET','food_venues?select='+VSEL+'&is_active=eq.true&order=is_open.desc,rating_count.desc,name.asc&limit=30&offset='+HF.offset);
    if(!alive(tok))return;
    HF.rows=HF.rows.concat(rows||[]);HF.offset+=rows.length;HF.done=rows.length<30;
    homeRender();
  }catch(e){setHTML('fdList',errBox(e,'showFoodHome()'))}
}
window.foodHomeMore=async function(btn){await once('homeMore',btn,()=>homeLoad(SCREEN))};
let CUIS=[];
window.foodCuis=function(i){HF.cuisine=i<0||HF.cuisine===CUIS[i]?'':CUIS[i];homeRender()};
function cuisCounts(rows){const cnt={};rows.forEach(v=>venueCats(v).forEach(t=>{if(CUISINES.some(c=>c[0]===t))cnt[t]=(cnt[t]||0)+1}));return cnt}
const FLT=[['open','Şimdi açık'],['free','Ücretsiz teslimat'],['fast','30 dk ve altı'],['top','4+ puan'],['pickup','Gel-al'],['camp','Kampanyalı']];
function venueMins(v){return (+v.prep_time_min||20)+(v.delivery_mode==='pickup'?0:(+v.delivery_eta_min||30))}
function venueKm(v){return HF.addr&&v&&v.lat!=null&&v.lng!=null?distKm(HF.addr,[+v.lat,+v.lng]):null}
function campVenues(){const s=new Set();(HF.promos||[]).forEach(p=>{if(p.venue_id)s.add(p.venue_id)});(HF.coupons||[]).forEach(c=>{if(c.venue_id)s.add(c.venue_id)});return s}
function fltPass(v,cv){const f=HF.f;
  if(f.open&&!openNow(v))return false;
  if(f.free&&(v.delivery_mode==='pickup'||+v.delivery_fee_kurus))return false;
  if(f.fast&&venueMins(v)>30)return false;
  if(f.top&&!(+v.rating_count>0&&+v.rating_avg>=4))return false;
  if(f.pickup&&!(v.delivery_mode==='pickup'||v.delivery_mode==='both'))return false;
  if(f.camp&&!(cv&&cv.has(v.id)))return false;
  return true}
window.foodFlt=function(k){HF.f[k]=!HF.f[k];homeRender()};
window.foodView=function(v){try{localStorage.setItem('isimi_food_view',v)}catch(e){}homeRender()};
function viewMode(){try{return localStorage.getItem('isimi_food_view')==='list'?'list':'cards'}catch(e){return 'cards'}}
function homeRender(){
  const list=document.getElementById('fdList');if(!list)return;
  const rows=HF.rows;const cnt=cuisCounts(rows);const cv=campVenues();
  CUIS=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||a.localeCompare(b,'tr')).slice(0,12);
  setHTML('fdCuis',CUIS.length?'<button type="button" class="'+(HF.cuisine?'':'on')+'" onclick="foodCuis(-1)"><span>🍽️</span><em>Tümü</em></button>'+
    CUIS.map((c,i)=>{const im=cuisImg(c);return '<button type="button" class="'+(HF.cuisine===c?'on':'')+'" aria-pressed="'+(HF.cuisine===c)+'" onclick="foodCuis('+i+')"><span'+(im?' class="im"':'')+'>'+(im?'<img src="'+E(im)+'" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove(\'im\');this.replaceWith(document.createTextNode(\''+catIcon(c)+'\'))">':catIcon(c))+'</span><em>'+E(c)+'</em></button>'}).join('')+
    '<button type="button" onclick="showFoodSearch()"><span>⋯</span><em>Diğerleri</em></button>':'');
  setHTML('fdwChips',FLT.filter(x=>x[0]!=='camp'||cv.size).map(x=>'<button type="button" class="fdwChip'+(HF.f[x[0]]?' on':'')+'" aria-pressed="'+!!HF.f[x[0]]+'" onclick="foodFlt(\''+x[0]+'\')">'+E(x[1])+'</button>').join(''));
  const anyF=HF.cuisine||HF.fl||Object.keys(HF.f).some(k=>HF.f[k]);
  const favs=FAV?rows.filter(v=>FAV.has(v.id)):[];
  setHTML('fdFavs',favs.length&&!anyF?'<div class="fdSecH"><b>♥ Favorilerin</b></div><div class="fdLogos">'+favs.map(v=>'<button type="button" onclick="showFoodVenue(\''+E(v.id)+'\')">'+pic(v.image_url||v.cover_url||'',v.name,'sq',catIcon(venueCats(v)[0]))+'<em>'+E(v.name)+'</em></button>').join('')+'</div>':'');
  /* Raflar: yalnız yeterli restoran varken (liste tekrarına dönüşmesin) */
  setHTML('fdwRails',anyF?'':homeRails(rows));
  setHTML('fdwAgain',anyF?'':againRail());setHTML('fdwTopI',anyF?'':topItemsRail());
  setHTML('fdwMid',!anyF?promoBanner('home_mid'):'');
  const flg=HF.fl?flashGroups().find(g=>g.id===HF.fl):null;if(HF.fl&&!flg)HF.fl='';
  const f=rows.filter(v=>(!HF.cuisine||venueCats(v).includes(HF.cuisine))&&fltPass(v,cv)&&(!flg||flg.all||flg.vids.includes(v.id)));
  const open=f.filter(openNow),closed=f.filter(v=>!openNow(v));
  const vm=viewMode();const card=vm==='list'?venueRow:venueCard;
  const withAds=arr=>{const ads=anyF?[]:promosFor('home_feed').filter(p=>p.venue_id);if(!ads.length)return arr.map(v=>card(v)).join('');
    const byId={};rows.forEach(v=>byId[v.id]=v);const out=[];let k=0;
    arr.forEach((v,i)=>{out.push(card(v));if((i===1||(i>1&&(i-1)%4===0))&&k<ads.length){const a=ads[k++];const av=byId[a.venue_id];if(av)out.push(card(av,a))}});
    return out.join('')};
  const head='<div class="fdSecT"><h2>'+(flg?'⚡ '+E(flg.title):HF.cuisine?E(HF.cuisine):'Tüm restoranlar')+' <span class="fdMuted fdSmall" style="font-weight:600">· '+f.length+' restoran</span></h2>'+
    '<span class="fdwView" role="group" aria-label="Görünüm"><button type="button" class="'+(vm==='cards'?'on':'')+'" aria-pressed="'+(vm==='cards')+'" aria-label="Büyük kart görünümü" onclick="foodView(\'cards\')">▭</button><button type="button" class="'+(vm==='list'?'on':'')+'" aria-pressed="'+(vm==='list')+'" aria-label="Liste görünümü" onclick="foodView(\'list\')">☰</button></span></div>'+
    (anyF?'<div class="fdwActiveF"><span class="fdMuted fdSmall">Filtre uygulandı</span><button type="button" class="fb ghost" onclick="foodResetFilters()">✕ Temizle</button></div>':'');
  list.innerHTML=!f.length?head+empty(rows.length?'🔍':'🍽️',rows.length?'Bu filtreye uyan restoran yok':'Henüz restoran yok',rows.length?'Filtreleri değiştir veya temizle.':'Yakında burada restoranlar olacak.',rows.length?'<button type="button" class="fb sm" onclick="foodResetFilters()">Tümünü göster</button>':''):
    head+(open.length?'<div class="fdGrid'+(vm==='list'?' fdwListV':'')+'">'+withAds(open)+'</div>':'')+
    (closed.length?'<div class="fdSecT"><h2 style="font-size:15px">Şu an kapalı</h2></div><div class="fdGrid'+(vm==='list'?' fdwListV':'')+'">'+closed.map(v=>card(v)).join('')+'</div>':'');
  setHTML('fdMore',HF.done?'':'<button type="button" class="fb block" style="margin-top:12px" onclick="foodHomeMore(this)">Daha fazla restoran</button>');
  promoSeen();
}
function railHtml(t,sub,arr){return '<div class="fdSecH"><b>'+E(t)+'</b><span class="fdMuted fdSmall">'+E(sub)+'</span></div><div class="fdwRail">'+arr.map(v=>venueCard(v)).join('')+'</div>'}
window.foodResetFilters=function(){HF.q='';HF.cuisine='';HF.f={};HF.fl='';homeRender()};
function ratingTxt(v){return +v.rating_count?stars(v.rating_avg).replace('</span>',' <small style="font-weight:600;color:var(--muted)">('+(v.rating_count>=100?'100+':v.rating_count)+')</small></span>'):'<span class="fdNew">Yeni</span>'}
function venueCard(v,ad){
  if(!ad||typeof ad!=='object')ad=null;const open=openNow(v);const km=venueKm(v);const cs=venueCats(v);const pickupOnly=v.delivery_mode==='pickup';const free=!pickupOnly&&!+v.delivery_fee_kurus;
  const fee=pickupOnly?'🛍️ Gel-al':(free?'🛵 Ücretsiz':'🛵 '+M(v.delivery_fee_kurus));
  return '<div class="fdVCard'+(open?'':' closed')+(ad?' spon':'')+'" role="button" tabindex="0" '+(ad?'data-promo="'+E(ad.id)+'" ':'')+'onclick="'+(ad?'foodPromoClick(\''+E(ad.id)+'\')':'showFoodVenue(\''+E(v.id)+'\')')+'" onkeydown="if(event.key===\'Enter\'&&event.target===this)this.click()">'+
    '<span class="fdVTop'+(v.image_url?' hasLg':'')+'">'+pic(venueImg(v),v.name+' '+(v.cuisine_type||''),'cover',catIcon(cs[0]))+
      (open&&!ad&&flashVenue(v)?'<span class="fdwFlB">⚡ Flash</span>':open&&!ad&&isNewVenue(v)?'<span class="fdwFlB nw">Yeni</span>':'')+
      (v.image_url?'<span class="fdPic fdLogo lg"><img src="'+E(v.image_url)+'" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>':'')+
      (free&&open?'<span class="fdFree">Ücretsiz teslimat</span>':'')+
      '<span class="rt">'+ratingTxt(v)+'</span>'+favBtn(v.id)+(ad?'<span class="fdwSpon">Sponsorlu</span>':'')+
      (open?'':'<span class="cl">'+E(nextOpen(v))+'</span>')+'</span>'+
    '<span class="bd'+(v.image_url?' hasLogo':'')+'" style="display:block"><h3>'+E(v.name)+'</h3><div class="sub">'+E([cs.slice(0,2).join(' · '),v.district].filter(Boolean).join(' • ')||'Restoran')+'</div>'+
    '<div class="mt"><span>⏱ '+etaText(v)+'</span><span>'+fee+'</span>'+(+v.min_order_amount?'<span class="fdMuted">Min. '+M(v.min_order_amount)+'</span>':'')+(km!=null?'<span class="fdMuted">'+km.toFixed(1).replace('.',',')+' km</span>':'')+'</div></span></div>';
}

/* ====================== G2 · Arama ====================== */
const HIST_KEY='isimi_food_search_hist';
function histGet(){try{return JSON.parse(localStorage.getItem(HIST_KEY)||'[]')}catch(e){return[]}}
function histAdd(q){q=String(q||'').trim();if(q.length<2)return;const h=histGet().filter(x=>x.toLocaleLowerCase('tr')!==q.toLocaleLowerCase('tr'));h.unshift(q);localStorage.setItem(HIST_KEY,JSON.stringify(h.slice(0,8)))}
let SQSEQ=0;
async function showFoodSearch(preset){FDW_TAB='search';
  if(!A())return;const tok=newScreen();
  render(bar('Ara','showFoodHome()')+'<div class="fdSearch"><input id="fdSQ" type="search" placeholder="Restoran, mutfak veya yemek ara" autocomplete="off" enterkeyhint="search" aria-label="Ara" autofocus></div><div id="fdSBody">'+skel('row',2)+'</div>');
  if(!HF.rows.length){try{HF.rows=await Q('GET','food_venues?select='+VSEL+'&is_active=eq.true&order=is_open.desc,rating_count.desc&limit=60')||[]}catch(e){}}
  if(!alive(tok))return;
  const inp=document.getElementById('fdSQ');setTimeout(()=>inp.focus(),60);
  const run=debounce(()=>searchRun(tok,inp.value),280);
  inp.addEventListener('input',run);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){histAdd(inp.value);inp.blur()}});
  if(preset){inp.value=preset;searchRun(tok,preset)}else searchIdle();
}
window.foodSearchSet=function(q){const i=document.getElementById('fdSQ');if(!i)return;i.value=q;histAdd(q);searchRun(SCREEN,q)};
window.foodHistClear=function(){localStorage.removeItem(HIST_KEY);searchIdle()};
window.foodPickCuisine=function(i){const c=CUISINES[i];if(!c)return;HF.cuisine=c[0];showFoodHome().then(()=>{HF.cuisine=c[0];homeRender()})};
function searchIdle(){
  const h=histGet();const cnt=cuisCounts(HF.rows);const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,6);
  const vs=HF.rows.filter(openNow).slice(0,10);
  setHTML('fdSBody',
    (h.length?'<div class="fdSecH"><b>🕘 Arama geçmişi</b><button type="button" class="fdLink" onclick="foodHistClear()">Temizle</button></div><div class="fdHist">'+h.map(q=>'<button type="button" class="fdChip" onclick="foodSearchSet(this.textContent)">'+E(q)+'</button>').join('')+'</div>':'')+
    (top.length?'<div class="fdSecH"><b>🔥 Öne çıkan aramalar</b></div><div class="fdHist">'+top.map(q=>'<button type="button" class="fdChip" onclick="foodSearchSet(this.textContent)">'+E(q.toLocaleLowerCase('tr'))+'</button>').join('')+'</div>':'')+
    (vs.length?'<div class="fdSecH"><b>Restoranlar</b></div><div class="fdLogos">'+vs.map(v=>'<button type="button" onclick="showFoodVenue(\''+E(v.id)+'\')">'+pic(v.image_url||v.cover_url||'',v.name,'sq',catIcon(venueCats(v)[0]))+'<em>'+E(v.name)+'</em></button>').join('')+'</div>':'')+
    '<div class="fdSecH"><b>Mutfaklar</b></div><div class="fdCatGrid">'+CUISINES.map((c,i)=>'<button type="button" onclick="foodPickCuisine('+i+')"><span>'+c[1]+'</span>'+E(c[0])+(cnt[c[0]]?'<small>'+cnt[c[0]]+' restoran</small>':'')+'</button>').join('')+'</div>');
}
async function searchRun(tok,raw){
  const q=String(raw||'').trim();if(q.length<2)return searchIdle();const seq=++SQSEQ;
  const ql=q.toLocaleLowerCase('tr');
  const vs=HF.rows.filter(v=>((v.name||'')+' '+(v.cuisine_type||'')+' '+venueCats(v).join(' ')+' '+(v.district||'')).toLocaleLowerCase('tr').includes(ql));
  setHTML('fdSBody',searchHTML(vs,null));
  try{
    const safe=q.replace(/[,()*%\\]/g,' ').trim();
    const items=await Q('GET','food_menu_items?select=id,name,price_kurus,image_url,venue_id,is_available&is_available=eq.true&name=ilike.*'+encodeURIComponent(safe)+'*&order=name.asc&limit=30');
    if(seq!==SQSEQ||!alive(tok))return;
    const byV={};HF.rows.forEach(v=>byV[v.id]=v);
    setHTML('fdSBody',searchHTML(vs,(items||[]).filter(i=>byV[i.venue_id]).map(i=>Object.assign(i,{v:byV[i.venue_id]}))));
  }catch(e){if(seq===SQSEQ)setHTML('fdSBody',searchHTML(vs,[]))}
}
function searchHTML(vs,items){
  const vh=vs.length?'<div class="fdSecH"><b>Restoranlar · '+vs.length+'</b></div><div class="fdList">'+vs.slice(0,8).map(v=>'<div class="fdSRes" onclick="foodSearchGo(\''+E(v.id)+'\',null)">'+pic(v.image_url||v.cover_url||'',v.name,'sq',catIcon(venueCats(v)[0]))+'<div class="tx"><b>'+E(v.name)+'</b><small>'+E([venueCats(v).slice(0,2).join(' · '),v.district].filter(Boolean).join(' • '))+'</small><small>⏱ '+etaText(v)+(openNow(v)?'':' · Kapalı')+'</small></div>'+(+v.rating_count?stars(v.rating_avg):'')+'</div>').join('')+'</div>':'';
  const ih=items===null?'<div class="fdSecH"><b>Yemekler</b></div>'+skel('row',1):items.length?'<div class="fdSecH"><b>Yemekler · '+items.length+'</b></div><div class="fdList">'+items.map(i=>'<div class="fdSRes" onclick="foodSearchGo(\''+E(i.venue_id)+'\',\''+E(i.id)+'\')">'+pic(i.image_url||'',i.name,'sq')+'<div class="tx"><b>'+E(i.name)+'</b><small>'+E(i.v.name)+(openNow(i.v)?'':' · Kapalı')+'</small></div><b>'+M(i.price_kurus)+'</b></div>').join('')+'</div>':'';
  return (vh||ih&&items&&items.length)?vh+ih:(items===null?vh+ih:empty('🔍','Sonuç bulunamadı','Farklı bir kelime dene: ör. döner, pide, çorba.'));
}
window.foodSearchGo=function(venueId,itemId){const i=document.getElementById('fdSQ');if(i)histAdd(i.value);showFoodVenue(venueId,itemId)};

/* ====================== F3 · Restoran sayfası ====================== */
let VENUE=null;
async function showFoodVenue(id,openItemId){
  if(!A())return;const tok=newScreen();favLoad();
  render(bar('',"showFoodHome()")+skel('hero',1)+skel('row',4));
  try{
    const enc=encodeURIComponent(id);
    const [vs,cats,items,groups]=await Promise.all([
      Q('GET','food_venues?select=id,name,description,district,address_text,phone,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,platform_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,cover_url,rating_avg,rating_count&id=eq.'+enc),
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order,metadata&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc')
    ]);
    if(!alive(tok))return;
    const v=vs&&vs[0];if(!v)return render(bar('Restoran','showFoodHome()')+empty('🔍','Restoran bulunamadı','Bu restoran artık listelenmiyor olabilir.','<button type="button" class="fb pri" onclick="showFoodHome()">Restoranlara dön</button>'));
    const gByItem={};(groups||[]).forEach(g=>{(gByItem[g.menu_item_id]=gByItem[g.menu_item_id]||[]).push(Object.assign(g,{food_item_options:(g.food_item_options||[]).sort((a,b)=>a.sort_order-b.sort_order)}))});
    const activeCat=new Set((cats||[]).map(c=>c.id));
    const vis=(items||[]).filter(i=>!i.category_id||activeCat.has(i.category_id));
    VENUE={v,items:vis,groups:gByItem,cats:cats||[]};
    const open=openNow(v);const cs=cuisines(v.cuisine_type);
    const secs=(cats||[]).map(c=>({c,items:vis.filter(i=>i.category_id===c.id)})).filter(s=>s.items.length);
    const other=vis.filter(i=>!i.category_id);if(other.length)secs.push({c:{id:'other',name:secs.length?'Diğer':'Menü'},items:other});
    render('<div class="fdHero">'+pic(v.cover_url||'',v.name+' '+(v.cuisine_type||''),'cover',foodIcon(v.cuisine_type||v.name))+
        '<div class="nav"><button type="button" class="fdIco" aria-label="Geri" onclick="showFoodHome()">‹</button><span style="display:flex;gap:8px">'+favBtn(v.id)+'<button type="button" class="fdIco" aria-label="Restoran bilgileri" onclick="foodVenueInfo()">ⓘ</button></span></div></div>'+
      '<div class="fdVHead">'+(v.image_url?pic(v.image_url,v.name,'fdLogo'):'')+'<div style="min-width:0;flex:1"><h1>'+E(v.name)+'</h1><div class="sub">'+E([cs.slice(0,3).join(' · '),v.district].filter(Boolean).join(' • '))+'</div></div>'+
        (+v.rating_count?'<div class="fdCenter"><div class="fdStar" style="box-shadow:none;border:1px solid var(--line)">★ '+(+v.rating_avg).toFixed(1).replace('.',',')+'</div><div class="fdMuted" style="font-size:11px;margin-top:3px">'+v.rating_count+' değerlendirme</div></div>':'<span class="fdNew">Yeni</span>')+'</div>'+
      '<div class="fdStats"><div><small>'+(v.delivery_mode==='pickup'?'Hazırlık':'Teslimat')+'</small><b>'+etaText(v)+'</b></div><div><small>'+(v.delivery_mode==='pickup'?'Sipariş':'Teslimat ücreti')+'</small><b>'+(v.delivery_mode==='pickup'?'Gel-al':(+v.delivery_fee_kurus?M(v.delivery_fee_kurus):'Ücretsiz'))+'</b></div><div><small>Min. sepet</small><b>'+(+v.min_order_amount?M(v.min_order_amount):'Yok')+'</b></div></div>'+venueExtras(v)+
      (!open?'<div class="fdNote bad">🕐 '+E(nextOpen(v))+'. Menüye göz atabilirsin; restoran açıldığında sipariş verebilirsin.</div>':'')+
      '<div id="fdPast"></div>'+
      (vis.length>5?'<div class="fdSearch" style="margin-top:12px"><input id="fdVQ" type="search" placeholder="Restoranda ara" autocomplete="off" aria-label="Restoranda ara" oninput="foodVenueFilter(this.value)"></div>':'')+
      '<div id="fdPop"></div><div id="fdVNo"></div>'+
      (secs.length>1?'<div class="fdTabsS"><div class="fdChips" id="fdCatBar">'+secs.map((s,i)=>'<button type="button" class="fdChip'+(i?'':' on')+'" data-sec="'+E(s.c.id)+'" onclick="foodGoSec(\''+E(s.c.id)+'\')">'+E(s.c.name)+'</button>').join('')+'</div></div>':'')+
      (secs.length?secs.map(s=>'<section class="fdMenuSec" id="fdSec-'+E(s.c.id)+'" data-sec="'+E(s.c.id)+'"><h2>'+E(s.c.name)+'</h2><div class="fdList">'+s.items.map(i=>prodRow(i,gByItem[i.id])).join('')+'</div></section>').join(''):
        empty('📋','Menü hazırlanıyor','Restoran menüsünü henüz eklemedi.')));
    const root=document.getElementById('fdRoot');root.dataset.sticky='1';root.insertAdjacentHTML('beforeend',stickyCart());
    refreshProdBadges();venuePast(tok,v);venuePopular(tok,v);venueLikes(tok,v);venuePromo(tok,v);if(secs.length>1)scrollSpy(tok);
    if(openItemId){const it=vis.find(x=>x.id===openItemId);if(it){const el=document.querySelector('[data-pid="'+openItemId+'"]');el&&el.scrollIntoView({block:'center'});if(it.is_available)setTimeout(()=>foodOpenItem(openItemId),250)}}
  }catch(e){if(alive(tok))render(bar('Restoran','showFoodHome()')+errBox(e,'showFoodVenue(\''+E(id)+'\')'))}
}
function prodRow(i,groups){
  const na=!i.is_available;const hasReq=(groups||[]).some(g=>g.is_required||g.min_select>0);
  const addBtn=na?'':'<button type="button" class="fdAdd'+(i.image_url?'':' fdAddS')+'" data-add="'+E(i.id)+'" aria-label="Sepete ekle" onclick="event.stopPropagation();'+(hasReq?'foodOpenItem':'foodQuickAdd')+'(\''+E(i.id)+'\')">+</button>';
  return '<div class="fdProd'+(na?' na':'')+'" data-pid="'+E(i.id)+'" data-q="'+E(((i.name||'')+' '+(i.description||'')).toLocaleLowerCase('tr'))+'" '+(na?'':'role="button" tabindex="0" onclick="foodOpenItem(\''+E(i.id)+'\')"')+'>'+
    '<div class="tx"><b>'+E(i.name)+'</b>'+(i.description?'<p>'+E(i.description)+'</p>':'')+'<div class="pr">'+M(i.price_kurus)+(groups&&groups.length&&!na?'<span class="fdMuted fdSmall" style="font-weight:600"> · seçenekli</span>':'')+'</div>'+allergenLine(i)+'<div class="fdwLk" data-lk="'+E(i.id)+'"></div></div>'+
    (i.image_url?'<div class="im">'+pic(i.image_url,i.name,'sq')+(na?'<span class="fdSold">Tükendi</span>':'')+addBtn+'</div>':(na?'<span class="fdPill">Tükendi</span>':addBtn))+'</div>';
}
window.foodVenueFilter=function(q){
  q=String(q||'').toLocaleLowerCase('tr').trim();let shown=0;
  qa('.fdProd[data-q]').forEach(p=>{const ok=!q||p.dataset.q.includes(q);p.style.display=ok?'':'none';if(ok)shown++});
  qa('.fdMenuSec').forEach(sec=>{sec.style.display=qa('.fdProd[data-q]',sec).some(p=>p.style.display!=='none')?'':'none'});
  const t=document.querySelector('.fdTabsS');if(t)t.style.display=q?'none':'';
  const pp=document.getElementById('fdPop');if(pp)pp.style.display=q?'none':'';
  setHTML('fdVNo',q&&!shown?empty('🔍','Bu restoranda bulunamadı','Başka bir kelime dene.'):'');
};
async function venuePopular(tok,v){
  try{
    const r=await RPC('food_venue_popular',{p_venue_id:v.id,p_limit:5});if(!alive(tok)||!VENUE)return;
    const its=(r||[]).map(x=>VENUE.items.find(i=>i.id===x.menu_item_id)).filter(i=>i&&i.is_available);
    if(its.length<2)return;
    setHTML('fdPop','<div class="fdSecH"><b>🔥 Popüler lezzetler</b><span class="fdMuted fdSmall">En çok sipariş edilenler</span></div><div class="fdPop">'+its.map((i,n)=>{
      const req=(VENUE.groups[i.id]||[]).some(g=>g.is_required||g.min_select>0);
      return '<div role="button" tabindex="0" onclick="foodOpenItem(\''+E(i.id)+'\')"><span class="rk">#'+(n+1)+'</span>'+pic(i.image_url||'',i.name,'')+'<button type="button" class="fdAdd" data-add="'+E(i.id)+'" aria-label="Sepete ekle" onclick="event.stopPropagation();'+(req?'foodOpenItem':'foodQuickAdd')+'(\''+E(i.id)+'\')">+</button><div class="bd"><b>'+E(i.name)+'</b><div class="pr">'+M(i.price_kurus)+'</div></div></div>'}).join('')+'</div>');
    refreshProdBadges();
  }catch(e){}
}
window.foodGoSec=function(id){const el=document.getElementById('fdSec-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})};
function scrollSpy(tok){
  const secs=qa('.fdMenuSec');if(!('IntersectionObserver' in window)||!secs.length)return;
  const top=topOffset()+64;
  const io=new IntersectionObserver(ents=>{
    const vis=ents.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!vis)return;
    const id=vis.target.dataset.sec;qa('#fdCatBar .fdChip').forEach(c=>{const on=c.dataset.sec===id;c.classList.toggle('on',on);if(on){const bar=c.parentNode;bar.scrollTo({left:c.offsetLeft-bar.clientWidth/2+c.clientWidth/2,behavior:'smooth'})}});
  },{rootMargin:'-'+top+'px 0px -55% 0px',threshold:0});
  secs.forEach(s=>io.observe(s));onCleanup(()=>io.disconnect());
}
async function venuePast(tok,v){
  try{
    const r=await Q('GET','food_orders?select=id,created_at,food_order_items(name_snapshot,quantity)&customer_id=eq.'+UID()+'&venue_id=eq.'+v.id+'&status=eq.delivered&order=created_at.desc&limit=1');
    if(!alive(tok)||!r||!r[0])return;const o=r[0];const its=o.food_order_items||[];if(!its.length)return;
    setHTML('fdPast','<div class="fdPast"><div class="hd"><div><b>Geçmiş siparişin</b><div class="fdMuted fdSmall">'+E(dt(o.created_at))+'</div></div><button type="button" class="fb soft sm" onclick="foodReorder(\''+E(o.id)+'\',this)">↻ Tekrarla</button></div>'+
      '<div class="fdMuted fdSmall" style="margin-top:6px">'+E(its.map(i=>i.name_snapshot+' ('+i.quantity+')').join(', '))+'</div></div>');
  }catch(e){}
}
window.foodVenueInfo=function(){
  if(!VENUE)return;const v=VENUE.v;
  const w=modal(sheetHead(v.name,cuisines(v.cuisine_type).join(' · '))+
    (v.description?'<p style="margin-bottom:12px">'+E(v.description)+'</p>':'')+
    '<div class="fdKV2"><span>Adres</span><b>'+E([v.address_text,v.district].filter(Boolean).join(', ')||'—')+'</b>'+
    (v.phone?'<span>Telefon</span><b><a href="tel:'+E(v.phone)+'" style="color:var(--fd-acc)">'+E(v.phone)+'</a></b>':'')+
    '<span>Sipariş</span><b>'+E(v.delivery_mode==='both'?'Teslimat ve gel-al':v.delivery_mode==='pickup'?'Yalnızca gel-al':'Yalnızca teslimat')+'</b>'+
    '<span>Ödeme</span><b>Kapıda nakit / kart'+(pfOn()&&pfSet().online_payment_enabled===true?' · online kart':'')+'</b>'+
    (+v.min_order_amount?'<span>Min. sepet</span><b>'+M(v.min_order_amount)+'</b>':'')+
    (+v.platform_fee_kurus?'<span>Hizmet bedeli</span><b>'+M(v.platform_fee_kurus)+'</b>':'')+'</div>'+
    '<h3 style="margin-top:18px">Çalışma saatleri</h3>'+hoursRows(v.working_hours)+
    (pfOn()?'<div style="margin-top:16px;text-align:right">'+PF.reportButton('venue',v.id,v.name)+'</div>':''),{sheet:true});
  bindClose(w);
};
const SIDE_CAT=/içecek|icecek|meşrubat|yan ürün|yanında|ekstra|sos|tatlı|tatli|salata|aperatif|atıştırma/i;
const SIDE_NAME=/ayran|kola|cola|fanta|gazoz|şalgam|salgam|soda|\bsu\b|limonata|çay|patates|soğan halkası|sos|sütlaç|baklava|künefe|salata|cacık/i;
/* Restoranın kendi menüsünden "Yanında iyi gider" adayları (zorunlu seçenekli ürünler hariç) */
function sideItems(V,excludeIds,max){
  if(!V)return[];const catName={};(V.cats||[]).forEach(c=>catName[c.id]=c.name);
  return V.items.filter(i=>i.is_available&&!excludeIds.includes(i.id)&&!(V.groups[i.id]||[]).some(g=>g.is_required||g.min_select>0)&&(SIDE_CAT.test(catName[i.category_id]||'')||SIDE_NAME.test(i.name||'')))
    .sort((a,b)=>a.price_kurus-b.price_kurus).slice(0,max||5);
}
window.foodQuickAdd=async function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i)return;
  await cartAdd(VENUE.v,{key:i.id+'|',menu_item_id:i.id,name:i.name,quantity:1,option_ids:[],options_label:'',unit_kurus:i.price_kurus,img:i.image_url||null});
};
window.foodOpenItem=function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i||!i.is_available)return;
  const groups=VENUE.groups[i.id]||[];let qty=1;const inCart=Object.keys(cartQtyByItem(VENUE.v.id));const sides=sideItems(VENUE,[i.id].concat(inCart),4);
  const need=g=>g.is_required?Math.max(1,g.min_select):g.min_select;
  const w=modal((i.image_url?'<span class="fdPic fdItemHero"><img src="'+E(i.image_url)+'" alt="'+E(i.name)+'" decoding="async" onerror="this.parentNode.remove()"></span>':'')+
    '<div class="fdSheetH" style="margin-top:4px"><div><h3 style="font-size:20px">'+E(i.name)+'</h3><div style="font-weight:800;font-size:16px;margin-top:4px">'+M(i.price_kurus)+'</div></div><button type="button" class="fdX" aria-label="Kapat" data-x="close">✕</button></div>'+
    (i.description?'<p class="fdMuted" style="font-size:14px;line-height:1.5">'+E(i.description)+'</p>':'')+allergenBox(i)+likeTxt(i.id,true)+
    groups.map(g=>{
      const multi=g.kind!=='single'||g.max_select>1;const n=need(g);
      const hint=g.kind==='remove'?'İstemediklerini işaretle':multi?(n?'En az '+n+', ':'')+'en fazla '+g.max_select+' seçim':'1 seçim yap';
      return '<div class="fdGroupH"><div><b>'+E(g.name)+'</b><small>'+E(hint)+'</small></div>'+(n?'<span class="fdReq" data-req="'+E(g.id)+'">Zorunlu</span>':'<span class="fdMuted fdSmall">İsteğe bağlı</span>')+'</div>'+
        g.food_item_options.map(o=>'<label class="fdOpt'+(o.is_available?'':' na')+'"><span class="tx">'+(g.kind==='remove'?'Çıkar: ':'')+E(o.name)+(o.is_available?'':' · tükendi')+'</span>'+(+o.price_delta_kurus?'<span class="p">+'+M(o.price_delta_kurus)+'</span>':'')+
          '<input type="'+(multi?'checkbox':'radio')+'" name="g'+E(g.id)+'" value="'+E(o.id)+'" data-g="'+E(g.id)+'" data-p="'+(+o.price_delta_kurus||0)+'"'+(o.is_available?'':' disabled')+'></label>').join('');
    }).join('')+
    (sides.length?'<div class="fdSide"><div class="fdGroupH"><div><b>Yanında iyi gider</b><small>İstersen birlikte ekle</small></div><span class="fdMuted fdSmall">İsteğe bağlı</span></div>'+
      sides.map(x=>'<label class="fdOpt">'+(x.image_url?pic(x.image_url,x.name,'sq'):'')+'<span class="tx">'+E(x.name)+'</span><span class="p">+'+M(x.price_kurus)+'</span><input type="checkbox" data-side="'+E(x.id)+'" data-sp="'+x.price_kurus+'"></label>').join('')+'</div>':'')+
    '<div class="fdErr" id="fdItemErr" hidden></div>'+
    '<div class="fdFoot"><div class="fdQty"><button type="button" data-q="-1" aria-label="Azalt">−</button><b id="fdIQ">1</b><button type="button" data-q="1" aria-label="Artır">+</button></div>'+
    '<button type="button" class="fb pri" style="flex:1;min-height:50px" id="fdIAdd">Sepete ekle · <span id="fdIP">'+M(i.price_kurus)+'</span></button></div>',{sheet:true,full:true});
  bindClose(w);
  const calc=()=>{const sel=qa('input[data-g]:checked',w);const add=sel.reduce((n,x)=>n+(+x.dataset.p||0),0);const sideSum=qa('input[data-side]:checked',w).reduce((n,x)=>n+(+x.dataset.sp||0),0);
    w.querySelector('#fdIP').textContent=M((i.price_kurus+add)*qty+sideSum);w.querySelector('#fdIQ').textContent=qty;
    groups.forEach(g=>{const b=w.querySelector('[data-req="'+g.id+'"]');if(b){const ok=sel.filter(x=>x.dataset.g===g.id).length>=need(g);b.classList.toggle('done',ok);b.textContent=ok?'✓ Seçildi':'Zorunlu'}});
    return{sel,add}};
  qa('[data-q]',w).forEach(b=>b.onclick=()=>{qty=Math.max(1,Math.min(50,qty+(+b.dataset.q)));calc()});
  qa('input',w).forEach(inp=>inp.onchange=()=>{
    const er=w.querySelector('#fdItemErr');if(er)er.hidden=true;
    const g=groups.find(x=>x.id===inp.dataset.g);
    if(g&&inp.type==='checkbox'){const n=qa('input[data-g="'+g.id+'"]:checked',w).length;if(n>g.max_select){inp.checked=false;toast(g.name+': en fazla '+g.max_select+' seçim','warn')}}
    calc();
  });
  w.querySelector('#fdIAdd').onclick=async()=>{
    const {sel,add}=calc();const err=w.querySelector('#fdItemErr');
    for(const g of groups){const n=sel.filter(x=>x.dataset.g===g.id).length;
      if(n<need(g)){err.hidden=false;err.textContent=g.name+' seçimi gerekli.';const b=w.querySelector('[data-req="'+g.id+'"]');b&&b.scrollIntoView({behavior:'smooth',block:'center'});return}}
    const ids=sel.map(x=>x.value).sort();
    const label=groups.map(g=>{const os=g.food_item_options.filter(o=>ids.includes(o.id));return os.length?(g.kind==='remove'?'Çıkar: ':'')+os.map(o=>o.name).join(', '):''}).filter(Boolean).join(' · ');
    closeModal();
    const sideIds=qa('input[data-side]:checked',w).map(x=>x.dataset.side);
    const ok=await cartAdd(VENUE.v,{key:i.id+'|'+ids.join(','),menu_item_id:i.id,name:i.name,quantity:qty,option_ids:ids,options_label:label,unit_kurus:i.price_kurus+add,img:i.image_url||null},sideIds.length>0);
    if(ok&&sideIds.length){for(const sid of sideIds){const x=VENUE.items.find(y=>y.id===sid);if(x)await cartAdd(VENUE.v,{key:x.id+'|',menu_item_id:x.id,name:x.name,quantity:1,option_ids:[],options_label:'',unit_kurus:x.price_kurus,img:x.image_url||null},true)}
      toast((1+sideIds.length)+' ürün sepete eklendi');try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}}
  };
};

/* ====================== F4 · Sepet ====================== */
const CO={fulfillment:null,phone:'',note:'',payment:'cash_on_delivery',quote:null,venue:null,refresh:null,prefs:{},coupon:'',when:null,cons:{},legal:[]};
const PREFS=[['noService','Servis istemiyorum','Plastik çatal, bıçak ve peçete gönderilmesin.',false],['contactless','Temassız teslimat','Kurye siparişi kapına bırakıp haber verir.',true],['noBell','Zile basma','Kurye gelince telefonla arar.',true]];
const NOTES_KEY='isimi_food_notes';
function notesGet(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]')}catch(e){return[]}}
function notesAdd(n){n=String(n||'').trim();if(!n)return;const l=notesGet().filter(x=>x!==n);l.unshift(n);localStorage.setItem(NOTES_KEY,JSON.stringify(l.slice(0,5)))}
/* Teslimat tercihleri notun başına eklenir → restoran ve kurye görür */
function composeNote(){const tags=PREFS.filter(p=>CO.prefs[p[0]]&&(!p[3]||CO.fulfillment==='delivery')).map(p=>p[1]);const n=(CO.note||'').trim();
  const out=(tags.length?'['+tags.join(' · ')+']'+(n?' ':''):'')+n;return out.slice(0,500)||null}
function coVenueMode(){const c=cartGet();return (c.venue&&c.venue.delivery_mode)||'both'}
function coFulfillDefault(){const vm=coVenueMode();if(!CO.fulfillment||(CO.fulfillment==='pickup'&&vm==='self_delivery')||(CO.fulfillment==='delivery'&&vm==='pickup'))CO.fulfillment=vm==='pickup'?'pickup':'delivery'}
function cartPayload(){return cartGet().items.map(x=>({menu_item_id:x.menu_item_id,quantity:x.quantity,option_ids:x.option_ids||[]}))}
function addrParams(){
  const a=addrGet();if(CO.fulfillment!=='delivery'||!a)return{p_address_id:null,p_address_text:null,p_lat:null,p_lng:null};
  return a.mode==='saved'?{p_address_id:a.id,p_address_text:null,p_lat:null,p_lng:null}:{p_address_id:null,p_address_text:a.text,p_lat:a.lat??null,p_lng:a.lng??null};
}
const ADDR_ISSUES=['location_required','out_of_zone'];
let QSEQ=0;
async function runQuote(){
  const c=cartGet();if(!c.items.length)return null;const seq=++QSEQ;const ap=addrParams();
  const qa0={p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_address_id:ap.p_address_id,p_lat:ap.p_lat,p_lng:ap.p_lng};
  let q;
  if(pfOn()&&CO.coupon){try{q=await RPC('pf_quote',Object.assign({p_coupon_code:CO.coupon},qa0))}catch(e){if(!pfMissing(e))throw e}}
  if(!q)q=await RPC('food_price_cart',qa0);
  if(seq!==QSEQ)return undefined;
  CO.quote=q;
  const cc=cartGet();(q.lines||[]).forEach((l,i)=>{if(cc.items[i])cc.items[i].unit_kurus=l.unit_price_kurus});cartSave(cc,true);
  return q;
}
function sumHTML(q,showDel){
  if(showDel===undefined)showDel=CO.fulfillment==='delivery';
  return '<div class="fdLine"><span class="m">Ara toplam</span><span>'+M(q.subtotal_kurus)+'</span></div>'+
    (showDel?'<div class="fdLine"><span class="m">Teslimat ücreti</span><span>'+(q.delivery_fee_kurus?M(q.delivery_fee_kurus):'<b class="fdOk">Ücretsiz</b>')+'</span></div>':'')+
    (q.platform_fee_kurus?'<div class="fdLine"><span class="m">Hizmet bedeli</span><span>'+M(q.platform_fee_kurus)+'</span></div>':'')+
    (q.discount_kurus?'<div class="fdLine"><span class="m">'+(q.coupon&&q.coupon.ok&&CO.coupon?'İndirim ('+E(CO.coupon)+')':'İndirim')+'</span><span class="fdOk">−'+M(q.discount_kurus)+'</span></div>':'')+
    '<div class="fdLine total"><span>Toplam</span><span>'+M(q.total_kurus)+'</span></div>';
}
function issuesHTML(list){return list&&list.length?'<div class="fdNote bad">'+list.map(i=>'<div>'+E(i.message)+'</div>').join('')+'</div>':''}
async function showFoodCart(){
  if(!A())return;FDW_TAB='cart';const tok=newScreen();const c=cartGet();
  if(!c.items.length)return render(bar('Sepetim','showFoodHome()')+empty('🛒','Sepetin boş','Restoranlara göz at, beğendiklerini sepete ekle.','<button type="button" class="fb pri" onclick="showFoodHome()">Restoranları keşfet</button>'));
  coFulfillDefault();
  render(bar('Sepetim','showFoodVenue(\''+E(c.venue.id)+'\')','<button type="button" class="fb ghostBad" onclick="foodClearCart()">Temizle</button>')+
    '<button type="button" class="fdRowBtn" style="margin-bottom:12px" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">'+pic(c.venue.image_url||'',c.venue.name,'sq').replace('class="fdPic sq"','class="fdPic sq" style="width:44px;border-radius:12px"')+'<span class="tx"><small>Restoran</small><b>'+E(c.venue.name)+'</b></span><span class="fdMuted fdSmall" style="font-weight:700">Menü ›</span></button>'+
    '<div class="fdList" id="fdLines"></div>'+
    '<button type="button" class="fb ghost" style="margin:6px 0 0" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">+ Ürün ekle</button>'+
    '<div id="fdMin"></div><div id="fdSides"></div>'+
    '<h2>Özet</h2><div class="fdCard" id="fdSum">'+skel('line',3)+'</div><div id="fdIss"></div>'+
    '<div class="fdSticky"><div class="fdCta"><button type="button" class="fb pri" id="fdNext" disabled onclick="showFoodCheckout()">Devam et</button></div></div>');
  cartLines();cartQuote(tok);cartExtras(tok,c.venue.id);
}
function cartLines(){
  const c=cartGet();const el=document.getElementById('fdLines');if(!el)return;
  el.innerHTML=c.items.map((x,idx)=>'<div class="fdCartItem">'+(x.img?pic(x.img,x.name,'sq'):'')+'<div class="tx"><b>'+E(x.name)+'</b>'+(x.options_label?'<small>'+E(x.options_label)+'</small>':'')+'<div class="pr">'+M(x.unit_kurus*x.quantity)+'</div></div>'+
    '<div class="fdQty sm"><button type="button" aria-label="'+(x.quantity===1?'Sil':'Azalt')+'" onclick="foodQty('+idx+',-1)">'+(x.quantity===1?'🗑':'−')+'</button><b>'+x.quantity+'</b><button type="button" aria-label="Artır" onclick="foodQty('+idx+',1)">+</button></div></div>').join('');
}
let CV=null;
async function cartExtras(tok,venueId){
  try{
    if(!CV||CV.v.id!==venueId){
      if(VENUE&&VENUE.v.id===venueId)CV=VENUE;
      else{const enc=encodeURIComponent(venueId);const [vs,cats,items,groups]=await Promise.all([
        Q('GET','food_venues?select=id,name,min_order_amount,delivery_mode,delivery_provider,image_url&id=eq.'+enc),
        Q('GET','food_menu_categories?select=id,name&venue_id=eq.'+enc+'&is_active=eq.true'),
        Q('GET','food_menu_items?select=id,name,price_kurus,image_url,is_available,category_id&venue_id=eq.'+enc),
        Q('GET','food_item_option_groups?select=menu_item_id,is_required,min_select&venue_id=eq.'+enc+'&is_active=eq.true')]);
        const g={};(groups||[]).forEach(x=>(g[x.menu_item_id]=g[x.menu_item_id]||[]).push(x));CV={v:vs[0],items:items||[],cats:cats||[],groups:g}}
    }
    if(!alive(tok))return;cartSidesDraw();cartMinDraw();
    if(!HF.coupons||!HF.coupons.length){await couponsLoad(null);if(alive(tok))cartMinDraw()}
  }catch(e){}
}
function cartSidesDraw(){
  if(!CV)return;const inCart=cartGet().items.map(x=>x.menu_item_id);const sd=sideItems(CV,inCart,6);
  setHTML('fdSides',sd.length?'<div class="fdSecH"><b>Yanında iyi gider</b></div><div class="fdPop">'+sd.map(i=>'<div role="button" tabindex="0" onclick="foodCartSide(\''+E(i.id)+'\')">'+pic(i.image_url||'',i.name,'')+'<button type="button" class="fdAdd" aria-label="'+E(i.name)+' ekle" onclick="event.stopPropagation();foodCartSide(\''+E(i.id)+'\')">+</button><div class="bd"><b>'+E(i.name)+'</b><div class="pr">'+M(i.price_kurus)+'</div></div></div>').join('')+'</div>':'');
}
function cartMinDraw(){
  const min=CV&&CV.v?+CV.v.min_order_amount||0:0;const sub=CO.quote?CO.quote.subtotal_kurus:cartEst();
  if(min&&sub<min)return setHTML('fdMin','<div class="fdMinBar">Minimum sepet tutarına <b>'+M(min-sub)+'</b> kaldı<i><b style="width:'+Math.max(4,Math.round(sub/min*100))+'%"></b></i></div>');
  /* Kupon eşiği: bir sonraki kupona ne kadar kaldı (yalnız gerçek, aktif kuponlar) */
  const vid=CV&&CV.v?CV.v.id:null;
  const fh=vid?flashHint(vid,sub):'';if(fh){const q=CO.quote;const ap=q&&q.coupon&&q.coupon.ok&&CO.autoCp;return setHTML('fdMin',ap?fh.replace('uygulanabilir','uygulandı'):fh)}
  const next=(HF.coupons||[]).filter(c=>(!c.venue_id||c.venue_id===vid)&&+c.min_subtotal_kurus>sub).sort((a,b)=>a.min_subtotal_kurus-b.min_subtotal_kurus)[0];
  setHTML('fdMin',next&&!CO.coupon?'<div class="fdMinBar fdwNudge"><b>'+M(next.min_subtotal_kurus-sub)+'</b> daha ekle, <b>'+E(next.code)+'</b> koduyla '+E(couponTxt(next))+' kazan<i><b style="width:'+Math.max(4,Math.round(sub/next.min_subtotal_kurus*100))+'%"></b></i></div>':'');
}
window.foodCartSide=async function(id){
  if(!CV)return;const x=CV.items.find(i=>i.id===id);if(!x)return;
  await cartAdd(CV.v,{key:x.id+'|',menu_item_id:x.id,name:x.name,quantity:1,option_ids:[],options_label:'',unit_kurus:x.price_kurus,img:x.image_url||null});
  cartLines();cartSidesDraw();cartQuote(SCREEN);
};
const cartQuote=debounce(async tok=>{
  const btn=document.getElementById('fdNext');if(btn)btn.disabled=true;
  try{const q=await quoteAuto();if(q===undefined||!alive(tok))return;if(!q)return;
    cartLines();setHTML('fdSum',sumHTML(q));cartMinDraw();
    const blocking=(q.issues||[]).filter(i=>!ADDR_ISSUES.includes(i.code));
    setHTML('fdIss',issuesHTML(blocking));
    if(btn){btn.disabled=blocking.length>0;btn.innerHTML='Devam et · '+M(q.total_kurus)}
  }catch(e){if(alive(tok))setHTML('fdSum',errBox(e,'showFoodCart()'))}
},300);
window.foodQty=async function(idx,d){
  const c=cartGet();const x=c.items[idx];if(!x)return;
  if(x.quantity+d<=0){const ok=await confirmBox('Ürün çıkarılsın mı?',x.name+' sepetinden çıkarılacak.','Çıkar',true);if(!ok)return;c.items.splice(idx,1)}
  else x.quantity=Math.min(50,x.quantity+d);
  cartSave(c);if(!c.items.length){CO.quote=null;return showFoodCart()}cartLines();cartQuote(SCREEN);
};
window.foodClearCart=async function(){if(!await confirmBox('Sepet temizlensin mi?','Sepetindeki tüm ürünler kaldırılacak.','Temizle',true))return;localStorage.removeItem(CART_KEY);CO.quote=null;showFoodCart()};

/* ====================== F4 · Onay (checkout) ====================== */
async function showFoodCheckout(){
  if(!A())return;const tok=newScreen();const c=cartGet();
  if(!c.items.length)return showFoodCart();
  coFulfillDefault();CO.phone=CO.phone||localStorage.getItem(PHONE_KEY)||'';
  try{const pc=sessionStorage.getItem('isimi_food_coupon');if(pc&&!CO.coupon&&pfOn()&&pfSet().coupons_enabled===true){CO.coupon=pc;sessionStorage.removeItem('isimi_food_coupon')}}catch(e){}
  render(bar('Siparişi onayla','showFoodCart()',null,c.venue.name)+skel('row',3));
  try{const vs=await Q('GET','food_venues?select=id,name,address_text,district,delivery_mode,image_url,phone&id=eq.'+encodeURIComponent(c.venue.id));CO.venue=vs&&vs[0]||c.venue}catch(e){CO.venue=c.venue}
  await loadAddrs();await currentAddr();
  if(pfOn()){try{CO.legal=await PF.legalList()}catch(e){CO.legal=[]}}else CO.legal=[];
  if(CO.payment==='online_card'&&!(pfOn()&&pfSet().online_payment_enabled===true))CO.payment='cash_on_delivery';
  if(!alive(tok))return;
  CO.refresh=()=>{if(alive(tok))coDraw(tok)};
  coDraw(tok);
}
function coDraw(tok){
  const c=cartGet();const vm=coVenueMode();const a=addrGet();const v=CO.venue||c.venue;
  const vDelivery=vm!=='pickup',vPickup=vm!=='self_delivery';
  patch(bar('Siparişi onayla','showFoodCart()',null,v.name)+
    (vDelivery&&vPickup?'<div class="fdSeg"><button type="button" class="'+(CO.fulfillment==='delivery'?'on':'')+'" onclick="foodSetFul(\'delivery\')">🛵 Teslimat</button><button type="button" class="'+(CO.fulfillment==='pickup'?'on':'')+'" onclick="foodSetFul(\'pickup\')">🛍️ Gel-al</button></div>':'')+
    '<div class="fdRows">'+
      (CO.fulfillment==='delivery'?row('📍','Teslimat adresi',a?addrValueHTML(a):'','foodAddrSheet(\'co\')',{id:'coAddr',empty:'Adres ekle'}):
        '<div class="fdRowBtn" style="cursor:default"><span class="ic">🛍️</span><span class="tx"><small>Gel-al · restorandan teslim al</small><b>'+E([v.address_text,v.district].filter(Boolean).join(', ')||v.name)+'</b></span></div>')+
      row('📞','Telefon',CO.phone?E(CO.phone):'','foodCoPhone()',{id:'coPhone',empty:'Telefon ekle'})+
      row(PAYI[CO.payment],'Ödeme',E(PAY[CO.payment]),'foodCoPay()',{id:'coPay'})+
      row('📝','Sipariş notu',CO.note?E(CO.note):'','foodCoNote()',{id:'coNote',empty:'Not ekle (isteğe bağlı)'})+
      (pfOn()&&pfSet().coupons_enabled===true?row('🎟️','Kupon',CO.coupon?E(CO.coupon):'','foodCoCoupon()',{id:'coCoupon',empty:'Kupon kodu ekle'}):'')+
      (pfOn()&&pfSet().scheduled_orders_enabled===true&&CO.payment!=='online_card'?row('🕒','Teslim zamanı',CO.when?E(dt(CO.when)):'','foodCoWhen()',{id:'coWhen',empty:'Hemen (planla)'}):'')+
    '</div>'+
    '<h2>Teslimat tercihleri</h2><div class="fdCard fdPrefs" style="padding:2px 14px">'+PREFS.filter(p=>!p[3]||CO.fulfillment==='delivery').map(p=>'<div class="fdPref"><div class="tx"><b>'+E(p[1])+'</b><small>'+E(p[2])+'</small></div>'+sw('pf_'+p[0],!!CO.prefs[p[0]],"foodPref('"+p[0]+"',this.checked)")+'</div>').join('')+'</div>'+
    '<h2>Ödeme özeti</h2><div class="fdCard" id="fdSum">'+(CO.quote?sumHTML(CO.quote):skel('line',3))+'</div><div id="fdIss"></div>'+
    '<p class="fdMuted fdSmall fdCenter" id="fdEtaL" style="margin-top:10px"></p>'+
    coLegalHTML()+
    '<div class="fdSticky"><div class="fdCta"><button type="button" class="fb pri" id="fdPlace" disabled onclick="foodPlaceOrder(this)">Siparişi ver</button></div></div>');
  coQuote(tok);
}
function coLegalHTML(){
  const docs=(CO.legal||[]).filter(d=>d.consent_kind==='per_order');
  const payTxt=CO.payment==='online_card'?'Ödeme, ödeme kuruluşunun güvenli sayfasında kartla yapılır; kart bilgilerin bizde saklanmaz.':'Ödeme teslimatta, seçtiğin yöntemle yapılır.';
  if(!docs.length)return '<p class="fdLegal">Siparişi vererek sipariş ve teslimat koşullarını kabul etmiş olursun. '+payTxt+'</p>';
  return '<div class="fdCard" id="coLegal" style="margin-top:12px">'+docs.map(d=>'<label style="display:flex;gap:10px;align-items:flex-start;margin:6px 0;font-size:14px"><input type="checkbox" style="width:18px;height:18px;margin-top:2px;flex:none" '+(CO.cons[d.doc_type]?'checked ':'')+'onchange="foodCoCons(\''+E(d.doc_type)+'\',this.checked)"><span><a href="#" style="color:var(--fd-acc)" onclick="event.preventDefault();PF.openLegal(\''+E(d.doc_type)+'\')">'+E(d.title)+'</a> metnini okudum ve onaylıyorum.</span></label>').join('')+
    '<p class="fdMuted fdSmall" style="margin-top:6px">'+payTxt+'</p></div>';
}
window.foodCoCons=function(k,v){CO.cons[k]=!!v};
function coConsents(){return (CO.legal||[]).filter(d=>d.consent_kind==='per_order').map(d=>({doc_type:d.doc_type,accepted:!!CO.cons[d.doc_type]}))}
window.foodCoCoupon=async function(){
  const v=await promptBox('Kupon kodu','Örn. HOSGELDIN',{value:CO.coupon,text:'Kupon indirimi sipariş özetinde gösterilir.',okLabel:'Uygula'});
  if(v===null)return;CO.coupon=String(v||'').trim().toUpperCase();CO.autoCp=false;CO.refresh&&CO.refresh();
  if(CO.coupon){try{const q=await runQuote();if(q&&q.coupon&&q.coupon.ok===false)toast(q.coupon.message,'warn');else if(q&&q.coupon&&q.coupon.ok)toast('Kupon uygulandı: −'+M(q.discount_kurus))}catch(e){}}
};
window.foodCoWhen=function(){
  const now=new Date(Date.now()+35*60000);const days=[];for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);days.push(d)}
  const w=modal(sheetHead('Teslim zamanı','En erken 30 dakika sonra, en geç 7 gün içinde.')+
    '<div class="fdForm"><label>Gün</label><select id="coWD">'+days.map((d,i)=>'<option value="'+i+'">'+(i===0?'Bugün':i===1?'Yarın':d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}))+'</option>').join('')+'</select>'+
    '<label>Saat</label><input id="coWT" type="time" value="'+String(now.getHours()).padStart(2,'0')+':'+String(Math.ceil(now.getMinutes()/5)*5%60).padStart(2,'0')+'"></div>'+
    '<div class="fdRow2" style="margin-top:12px"><button type="button" class="fb" data-a="now">Hemen</button><button type="button" class="fb pri" data-a="ok">Planla</button></div>'+
    '<p class="fdMuted fdSmall" style="margin-top:8px">Planlı siparişlerde yalnızca kapıda ödeme kullanılabilir. Restoran o saatte kapalıysa sipariş oluşturulamaz ve sana bildirim gelir.</p>',{sheet:true});
  bindClose(w);
  w.querySelector('[data-a=now]').onclick=()=>{CO.when=null;closeModal();CO.refresh&&CO.refresh()};
  w.querySelector('[data-a=ok]').onclick=()=>{const di=+w.querySelector('#coWD').value;const [hh,mm]=(w.querySelector('#coWT').value||'').split(':');const d=new Date();d.setDate(d.getDate()+di);d.setHours(+hh||0,+mm||0,0,0);
    if(d.getTime()<Date.now()+30*60000){toast('En erken 30 dakika sonrası seçilebilir.','warn');return}CO.when=d.toISOString();closeModal();CO.refresh&&CO.refresh()};
};
window.foodSetFul=function(f){CO.fulfillment=f;CO.refresh&&CO.refresh()};
const coQuote=debounce(async tok=>{
  const btn=document.getElementById('fdPlace');if(btn)btn.disabled=true;
  try{const q=await quoteAuto();if(q===undefined||!alive(tok)||!q)return;
    setHTML('fdSum',sumHTML(q));setHTML('fdIss',issuesHTML(q.issues));const cr=document.querySelector('#coCoupon b');if(cr&&CO.autoCp)cr.innerHTML=E(CO.coupon)+' <small class="fdMuted">· Flash, otomatik</small>';
    const t=(+q.prep_time_min||0)+(CO.fulfillment==='delivery'?(+q.delivery_eta_min||0):0);
    setHTML('fdEtaL',CO.fulfillment==='delivery'?'Tahmini teslimat '+t+'-'+(t+10)+' dk':'Tahmini hazırlık '+t+' dk');
    if(btn){btn.disabled=!q.ok;btn.innerHTML='Siparişi ver · '+M(q.total_kurus)}
  }catch(e){if(alive(tok))setHTML('fdSum',errBox(e,'showFoodCheckout()'))}
},250);
window.foodCoPhone=async function(){
  const v=await promptBox('Telefon numaran','05xx xxx xx xx',{input:'tel',value:CO.phone,text:'Restoran ve kurye gerekirse bu numaradan ulaşır.',required:true,
    validate:x=>{const d=x.replace(/\D/g,'');return d.length<10||d.length>13?'Geçerli bir telefon numarası yaz.':''}});
  if(v===null)return;CO.phone=v;localStorage.setItem(PHONE_KEY,v);CO.refresh&&CO.refresh();
};
window.foodPref=function(k,v){CO.prefs[k]=!!v};
window.foodCoNote=async function(){const saved=notesGet();const chips=saved.concat(['Acısız olsun','Soğansız olsun','Ekstra peçete']).filter((x,i,a)=>a.indexOf(x)===i).slice(0,7);
  const v=await promptBox('Sipariş notu','Restoran veya kuryeye notun',{value:CO.note,chips,text:saved.length?'Kayıtlı notların aşağıda, dokunarak seçebilirsin.':'',okLabel:'Kaydet'});if(v===null)return;CO.note=v;CO.refresh&&CO.refresh()};
window.foodCoPay=function(){
  const online=pfOn()&&pfSet().online_payment_enabled===true&&pfSet().payment_provider&&pfSet().payment_provider!=='none';
  const opts=Object.entries(PAY).filter(([k])=>k!=='online_card'||(online&&!CO.when));
  const w=modal(sheetHead('Ödeme yöntemi',online?'Kapıda veya kartla online ödeyebilirsin.':'Ödemeyi teslimatta yaparsın.')+'<div class="fdRadio">'+opts.map(([k,l])=>'<label class="'+(CO.payment===k?'on':'')+'"><input type="radio" name="fdPay" value="'+k+'"'+(CO.payment===k?' checked':'')+'><span>'+PAYI[k]+' '+E(l)+'<small>'+(k==='online_card'?'Güvenli ödeme sayfasında kartla ödersin'+(pfSet().payment_mode!=='live'?' (TEST MODU: gerçek para çekilmez)':'')+'.':k==='agree_with_venue'?'Ödeme şeklini restoranla konuşursun.':k==='card_on_delivery'?'Kurye POS cihazıyla ödersin.':'Teslimatta nakit ödersin.')+'</small></span></label>').join('')+'</div>'+
    (online?'':'<p class="fdMuted fdSmall" style="margin-top:12px">Online ödeme yakında eklenecek.</p>'),{sheet:true});
  bindClose(w);qa('input[name=fdPay]',w).forEach(r=>r.onchange=()=>{CO.payment=r.value;closeModal();CO.refresh&&CO.refresh()});
};
window.foodPlaceOrder=async function(btn){
  const c=cartGet();if(!c.items.length)return;
  const phone=(CO.phone||'').trim();const digits=phone.replace(/\D/g,'');
  const flag=id=>{const el=document.getElementById(id);if(el){el.classList.add('warn');el.scrollIntoView({behavior:'smooth',block:'center'})}};
  if(CO.fulfillment==='delivery'&&!addrGet()){flag('coAddr');toast('Teslimat adresini seç.','warn');return foodAddrSheet('co')}
  if(digits.length<10||digits.length>13){flag('coPhone');toast('Telefon numaranı ekle.','warn');return foodCoPhone()}
  if(!CO.quote||!CO.quote.ok){toast('Önce özetteki uyarıları gidermelisin.','warn');return}
  if(!c.req){c.req=uuid();cartSave(c,true)}
  const ap=addrParams();
  const body={p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_phone:phone,p_note:composeNote(),p_payment_method:CO.payment,
    p_client_request_id:c.req,p_address_id:ap.p_address_id,p_address_text:ap.p_address_text,p_lat:ap.p_lat,p_lng:ap.p_lng};
  const cons=coConsents();
  if(cons.some(x=>!x.accepted)){const el=document.getElementById('coLegal');if(el){el.classList.add('warn');el.scrollIntoView({behavior:'smooth',block:'center'})}toast('Siparişi tamamlamak için sözleşme metinlerini onaylamalısın.','warn');return}
  /* Planlı sipariş (kapıda ödeme) */
  if(pfOn()&&CO.when){
    await once('placeOrder',btn,async()=>{try{
      await RPC('pf_schedule_order',{p_venue_id:body.p_venue_id,p_items:body.p_items,p_fulfillment:body.p_fulfillment,p_phone:phone,p_note:body.p_note,p_payment_method:CO.payment,
        p_address_id:ap.p_address_id,p_address_text:ap.p_address_text,p_lat:ap.p_lat,p_lng:ap.p_lng,p_coupon_code:CO.coupon||null,p_consents:cons,p_scheduled_for:CO.when});
      localStorage.setItem(PHONE_KEY,phone);localStorage.removeItem(CART_KEY);CO.quote=null;CO.note='';CO.prefs={};const w=CO.when;CO.when=null;CO.coupon='';
      toast('Siparişin '+dt(w)+' için planlandı.');showFoodOrders();
    }catch(e){toast(errMsg(e),'err')}});return;
  }
  /* Online kart ödemesi: önce ödeme, sonra sipariş (ödenmemiş sipariş restorana düşmez) */
  if(CO.payment==='online_card'){
    if(!(pfOn()&&PF.paymentInit))return toast('Online ödeme şu anda kullanılamıyor.','warn');
    await once('placeOrder',btn,async()=>{try{
      const r=await PF.paymentInit({venue_id:body.p_venue_id,items:body.p_items,fulfillment:body.p_fulfillment,phone:phone,note:body.p_note,address_id:ap.p_address_id,address_text:ap.p_address_text,lat:ap.p_lat,lng:ap.p_lng,coupon_code:CO.coupon||null,consents:cons,client_request_id:c.req});
      localStorage.setItem(PHONE_KEY,phone);notesAdd(CO.note);
      const done=s=>{localStorage.removeItem(CART_KEY);CO.quote=null;CO.note='';CO.prefs={};CO.coupon='';if(s&&s.order_id)showFoodOrderDetail(s.order_id)};
      if(r.order_id&&r.duplicate){done(r);return}
      if(r.provider==='mock'){
        const w=modal(sheetHead('Test ödemesi','Bu bir TEST ödemesidir; kartından para çekilmez.')+'<p style="margin:8px 0 14px">Tutar: <b>'+M(r.amount_kurus)+'</b></p><div class="fdRow2"><button type="button" class="fb" data-a="no">Başarısız ödeme</button><button type="button" class="fb pri" data-a="yes">Başarılı ödeme</button></div>',{sheet:true});
        bindClose(w);
        const go=async ok=>{closeModal();try{await PF.paymentMockComplete(r.intent_id,r.mock_signature,ok)}catch(e){toast(errMsg(e),'err')}const s=await PF.waitIntent(r.intent_id);if(s&&s.status==='placed')done(s)};
        w.querySelector('[data-a=yes]').onclick=()=>go(true);w.querySelector('[data-a=no]').onclick=()=>go(false);return;
      }
      if(r.checkout_url){try{sessionStorage.setItem('pf_pay_intent',r.intent_id)}catch(e){}location.href=r.checkout_url;return}
      toast('Ödeme sayfası açılamadı.','err');
    }catch(e){toast(errMsg(e),'err')}});return;
  }
  await once('placeOrder',btn,async()=>{
    let r=null,lastErr=null;const usePf=pfOn();
    for(let attempt=0;attempt<3&&!r;attempt++){
      try{
        if(usePf&&!CO.__noPf){try{r=await RPC('pf_place_order',Object.assign({},body,{p_coupon_code:CO.coupon||null,p_consents:cons}))}catch(e){if(pfMissing(e)){CO.__noPf=true;r=await RPC('food_place_order',body)}else throw e}}
        else r=await RPC('food_place_order',body);
      }
      catch(e){lastErr=e;if(!isNetErr(e))break;await sleep(1200*(attempt+1))} /* aynı istek kimliği → sunucu çift sipariş oluşturmaz */
    }
    if(!r){toast(errMsg(lastErr),'err');if(!isNetErr(lastErr))coQuote(SCREEN);return}
    CO.coupon='';CO.autoCp=false;CO.cpRej={};
    localStorage.setItem(PHONE_KEY,phone);notesAdd(CO.note);localStorage.removeItem(CART_KEY);CO.quote=null;CO.note='';CO.prefs={};
    toast(r.duplicate?'Bu sipariş zaten oluşturulmuştu.':'Siparişin restorana iletildi!');TRK.placed=r.order_id;
    try{navigator.vibrate&&navigator.vibrate([40,40,40])}catch(e){}
    showFoodOrderDetail(r.order_id);
  });
};

/* ====================== F5 · Siparişlerim ====================== */
const OL={tab:'active',rows:[],offset:0,done:false,embed:true};
async function showFoodOrders(){
  if(!A())return;FDW_TAB='orders';const tok=newScreen();OL.rows=[];OL.offset=0;OL.done=false;
  render(bar('Siparişlerim','showFoodHome()','<span class="fdLive" id="fdLive"></span>'+bellBtn())+
    '<div class="fdSeg"><button type="button" id="fdOA" onclick="foodOrdersTab(\'active\')">Aktif</button><button type="button" id="fdOH" onclick="foodOrdersTab(\'past\')">Geçmiş</button></div>'+
    '<div id="fdOList">'+skel('row',3)+'</div><div id="fdOMore"></div>');
  bellCount();await ordersLoad(tok);
  watch(tok,[{table:'food_orders',filter:'customer_id=eq.'+UID()},{table:'food_notifications',filter:'user_id=eq.'+UID()}],async(k,p)=>{
    if(p&&p.table==='food_notifications'){bellCount();return}
    OL.rows=[];OL.offset=0;OL.done=false;await ordersLoad(tok);
  });
}
async function ordersLoad(tok){
  const base='food_orders?select=id,status,total_kurus,created_at,delivery_mode,venue_id,food_venues(name,image_url),food_order_items(name_snapshot,quantity)';
  const tail='&customer_id=eq.'+UID()+'&order=created_at.desc&limit=20&offset='+OL.offset;
  try{
    let rows;
    try{rows=await Q('GET',base+(OL.embed?',food_reviews(id)':'')+tail)}catch(e){if(!OL.embed||isNetErr(e))throw e;OL.embed=false;rows=await Q('GET',base+tail)}
    if(!alive(tok))return;OL.rows=OL.rows.concat(rows);OL.offset+=rows.length;OL.done=rows.length<20;
    if(OL.tab==='active'&&OL.offset===rows.length&&!rows.some(o=>!TERMINAL.includes(o.status))&&rows.length)OL.tab='past';
    ordersRender();
  }catch(e){setHTML('fdOList',errBox(e,'showFoodOrders()'))}
}
window.foodOrdersTab=function(t){OL.tab=t;ordersRender()};
window.foodOrdersMore=async function(btn){await once('ordersMore',btn,()=>ordersLoad(SCREEN))};
function ordersRender(){
  const a=document.getElementById('fdOA'),h=document.getElementById('fdOH');if(!a)return;
  const act=OL.rows.filter(o=>!TERMINAL.includes(o.status));
  a.classList.toggle('on',OL.tab==='active');h.classList.toggle('on',OL.tab==='past');a.innerHTML='Aktif'+(act.length?'<em>'+act.length+'</em>':'');
  const rows=OL.tab==='active'?act:OL.rows.filter(o=>TERMINAL.includes(o.status));
  setHTML('fdOList',rows.length?rows.map(orderCard).join(''):
    empty(OL.tab==='active'?'🍽️':'🧾',OL.tab==='active'?'Aktif siparişin yok':'Henüz geçmiş siparişin yok',OL.tab==='active'?'Acıktıysan restoranlara göz at.':'',OL.tab==='active'?'<button type="button" class="fb pri" onclick="showFoodHome()">Sipariş ver</button>':''));
  setHTML('fdOMore',OL.done?'':'<button type="button" class="fb block" onclick="foodOrdersMore(this)">Daha fazla</button>');
}
function orderCard(o){
  const st=STL[o.status]||['•',o.status];const t=tone(o.status);const its=o.food_order_items||[];const reviewed=hasReview(o);
  const vn=o.food_venues?o.food_venues.name:'Restoran';
  let acts='';
  if(!TERMINAL.includes(o.status))acts='<button type="button" class="fb pri" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">'+(['picked_up','on_the_way','near_customer'].includes(o.status)?'🛵 Siparişi canlı izle':'Siparişi izle')+'</button>';
  else if(o.status==='delivered')acts='<button type="button" class="fb" onclick="foodReorder(\''+E(o.id)+'\',this)">↻ Tekrarla</button>'+(reviewed?'':'<button type="button" class="fb soft" onclick="foodReview(\''+E(o.id)+'\','+(o.delivery_mode==='platform_delivery')+')">★ Değerlendir</button>');
  else acts='<button type="button" class="fb" onclick="foodReorder(\''+E(o.id)+'\',this)">↻ Tekrarla</button>';
  return '<div class="fdOCard"><div class="hd" role="button" tabindex="0" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">'+pic(o.food_venues&&o.food_venues.image_url||'',vn,'sq')+
    '<div class="tx"><b>'+E(vn)+'</b><small>'+E(dt(o.created_at))+'</small></div><div style="text-align:right"><b>'+M(o.total_kurus)+'</b><small class="fdMuted" style="display:block;font-size:12px">Detay ›</small></div></div>'+
    '<div class="bd"><div class="stl '+t+'">'+(t==='ok'?'✓':t==='bad'?'✕':st[0])+' '+E(st[1])+'</div>'+(its.length?'<div class="its">'+E(its.map(i=>i.name_snapshot+' ('+i.quantity+')').join(', '))+'</div>':'')+
    '<div class="acts">'+acts+'</div></div></div>';
}

/* ====================== F5 · Sipariş takibi ====================== */
function stageOf(o){
  const s=o.status,m=o.delivery_mode;
  if(s==='delivered')return 3;if(s==='new')return 0;
  if(m==='pickup')return s==='ready'?2:1;
  return ['picked_up','on_the_way','near_customer'].includes(s)?2:1;
}
function stageLabels(m){return m==='pickup'?['Alındı','Hazırlanıyor','Hazır','Teslim alındı']:['Alındı','Hazırlanıyor','Yolda','Teslim edildi']}
const TRK={id:null,home:null,courier:null,at:null,dst:null,venue:null,reload:null,deliveredAt:null,addr:'',vname:''};
async function showFoodOrderDetail(id){
  if(!A())return;const tok=newScreen();
  render(bar('Sipariş','showFoodOrders()')+skel('hero',1)+skel('row',2));
  if(TRK.id!==id){TRK.id=id;TRK.home=null;TRK.courier=null;TRK.at=null;TRK.dst=null}
  try{const r=await Q('GET','food_orders?select=address_lat,address_lng,delivered_at&id=eq.'+encodeURIComponent(id));const x=r&&r[0];if(x){if(x.address_lat!=null)TRK.home=[x.address_lat,x.address_lng];TRK.deliveredAt=x.delivered_at||null}}catch(e){}
  const liveLoc=async()=>{try{const r=await Q('GET','food_deliveries?select=status,courier_lat,courier_lng,courier_location_at&order_id=eq.'+encodeURIComponent(id));const d=r&&r[0];
    if(d){TRK.dst=d.status;if(d.courier_lat!=null&&['assigned','at_venue','picked_up','on_the_way','near_customer'].includes(d.status)){TRK.courier=[d.courier_lat,d.courier_lng];TRK.at=d.courier_location_at}else{TRK.courier=null}}}catch(e){}};
  const load=async()=>{
    await liveLoc();
    try{const t=await RPC('food_order_tracking',{p_order_id:id});if(alive(tok))trackRender(t)}
    catch(e){if(alive(tok)&&!document.getElementById('fdTrack'))render(bar('Sipariş','showFoodOrders()')+errBox(e,'showFoodOrderDetail(\''+E(id)+'\')'))}
  };
  TRK.reload=load;onCleanup(()=>{TRK.reload=null});
  try{const st=await foodSettings();TRK.acceptMin=+st.accept_timeout_min||null}catch(e){}
  await load();
  watch(tok,[{table:'food_orders',filter:'id=eq.'+id},{table:'food_deliveries',filter:'order_id=eq.'+id}],(k,p)=>{
    const n=p&&p.table==='food_deliveries'&&p.new;
    if(n&&n.status===TRK.dst&&n.courier_lat!=null){TRK.courier=[n.courier_lat,n.courier_lng];TRK.at=n.courier_location_at;moveCourier();return}
    load();
  });
  const stale=setInterval(()=>{if(alive(tok))locText()},15000);onCleanup(()=>clearInterval(stale));
}
let LAST_ST={};
function trackRender(t){
  const o=t.order,st=o.status,info=STL[st]||['•',st,''];
  if(LAST_ST[o.id]&&LAST_ST[o.id]!==st){toast(info[0]+' '+info[1]);try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}}
  LAST_ST[o.id]=st;
  const bad=BAD.includes(st)||st==='refund_pending'||st==='refunded';const done=st==='delivered';const stg=stageOf(o);const lbl=stageLabels(o.delivery_mode);
  const d=t.delivery;const cr=d&&d.courier;const pickup=o.delivery_mode==='pickup';
  const etaTs=pickup?o.estimated_ready_at:(o.estimated_delivery_at||o.estimated_ready_at);
  const sub=st==='ready'&&pickup?'Siparişin hazır, restorandan teslim alabilirsin.':st==='ready'&&o.delivery_mode==='self_delivery'?'Siparişin hazır, restoran kuryesi yola çıkmak üzere.':info[2];
  const showCode=t.delivery_code&&!pickup&&!TERMINAL.includes(st);
  const events=(t.events||[]).filter(e=>STL[e.to]);
  const acts=[];
  if(t.can.review)acts.push('<button type="button" class="fb pri block" onclick="foodReview(\''+E(o.id)+'\','+(t.can.review_courier?'true':'false')+')">★ Siparişi değerlendir</button>');
  if(TERMINAL.includes(st))acts.push('<button type="button" class="fb block" onclick="foodReorder(\''+E(o.id)+'\',this)">↻ Tekrar sipariş ver</button>');
  if(done&&t.can.report)acts.push('<button type="button" class="fb block ghost" style="border:1px solid var(--line)" onclick="foodIssue(\''+E(o.id)+'\')">Sorun bildir</button>');
  const qk=[];
  if(!TERMINAL.includes(st)){
    if(t.venue.phone)qk.push('<a class="q" href="tel:'+E(t.venue.phone)+'">'+fdIco('store',20)+'<span>Restoranı ara</span></a>');
    if(cr&&cr.phone)qk.push('<a class="q" href="tel:'+E(cr.phone)+'">'+fdIco('bike',20)+'<span>Kuryeyi ara</span></a>');
    if(t.can.report)qk.push('<button type="button" class="q" onclick="foodIssue(\''+E(o.id)+'\')">'+fdIco('help',20)+'<span>Sorun bildir</span></button>');
    if(t.can.cancel)qk.push('<button type="button" class="q bad" onclick="foodCustomerCancel(\''+E(o.id)+'\',this)"><b aria-hidden="true">✕</b><span>Siparişi iptal et</span></button>');
  }
  const online=o.payment_method==='online_card';
  const refundNote=st==='refund_pending'?'<div class="fdNote info">↩️ <b>İade süreci başladı.</b> '+(online?'Tutar kartına iade ediliyor; bankana göre hesabına yansıması birkaç iş günü sürebilir.':'İade durumunu bu ekrandan izleyebilirsin.')+'</div>':
    st==='refunded'?'<div class="fdNote ok">💸 <b>İade tamamlandı.</b> '+(online?'Tutar kartına iade edildi.':'')+'</div>':
    (['cancelled','rejected'].includes(st)&&!online?'<div class="fdNote info">Kapıda ödeme seçtiğin için senden ücret alınmadı.</div>':['cancelled','rejected','failed'].includes(st)&&online?'<div class="fdNote info">Online ödemen için iade süreci otomatik başlatılır; durumu burada görünür.</div>':'');
  const placed=TRK.placed===o.id&&st==='new'?'<div class="fdNote ok" role="status">✓ <b>Siparişin alındı.</b> Restoran onayladığında bildirim alacaksın.</div>':'';
  const loc=d&&d.location;const vLL=t.venue.lat!=null?[t.venue.lat,t.venue.lng]:null;
  if(!TRK.courier&&loc&&TRK.id===o.id){TRK.courier=[loc.lat,loc.lng];TRK.at=loc.at}
  const courierStage=['courier_assigned','courier_at_venue','picked_up','on_the_way','near_customer'].includes(st)||(o.delivery_mode==='self_delivery'&&['on_the_way','near_customer'].includes(st));
  const showMap=!pickup&&!TERMINAL.includes(st)&&(!!TRK.courier||(courierStage&&!!(vLL||TRK.home)));
  TRK.venue=vLL;TRK.vname=t.venue.name;TRK.st=st;TRK.mode=o.delivery_mode;setTimeout(()=>{trackMap(vLL);pushDraw()},0);
  /* V4: kurye yoldayken harita en üstte, büyük ve 'x dakika sonra kapında' balonuyla */
  const mapTop=showMap&&['picked_up','on_the_way','near_customer'].includes(st);
  const etaMin=etaTs?Math.max(0,Math.round((new Date(etaTs)-Date.now())/60000)):null;
  const mapBlock=(mapTop?'<div class="fdwTWrap"><div class="fdMap fdwTBig" id="fdTMap"></div><div class="fdwEta" aria-live="polite">'+(etaMin===null?'<b>Kurye yolda</b>':etaMin<=1||st==='near_customer'?'<b>Birazdan</b><span>kapında</span>':'<b>'+etaMin+' dakika</b><span>sonra kapında</span>')+'</div></div>':'<div class="fdMap" id="fdTMap"></div>')+
    (o.delivery_mode==='self_delivery'?'':'<div class="fdChips" style="margin-top:-4px;padding-bottom:6px"><button type="button" class="fdChip'+(TRK.view!=='all'?' on':'')+'" data-tv="focus" onclick="foodTrackView(\'focus\')">🛵 Kuryeye odaklan</button><button type="button" class="fdChip'+(TRK.view==='all'?' on':'')+'" data-tv="all" onclick="foodTrackView(\'all\')">🗺 Tümünü göster</button></div>')+'<p class="fdMuted fdSmall" id="fdTLoc" style="margin:0 0 4px"></p>'+(o.address_text?'<p class="fdMuted fdSmall" style="margin:0 0 12px">🏠 '+E(o.address_text)+'</p>':'');
  (document.getElementById('fdTrack')?patch:render)(bar('#'+o.no,'showFoodOrders()','<span class="fdLive" id="fdLive"></span>',t.venue.name)+
    '<div id="fdTrack">'+(mapTop?mapBlock:'')+'<div class="fdTrackHero'+(bad?' bad':done?' ok':'')+'"><div class="st"><span class="e">'+info[0]+'</span><div><h2>'+E(info[1])+'</h2><p>'+E(sub)+'</p></div></div>'+
      (o.cancel_reason&&bad?'<div class="fdNote bad" style="margin:12px 0 0">Sebep: '+E(o.cancel_reason)+'</div>':'')+
      (!bad&&!done&&etaTs?'<div class="fdEta"><small>'+(pickup?'Tahmini hazır olma':'Tahmini teslimat')+'</small><b>'+hm(etaTs)+'</b></div>':'')+
      (done?'<div class="fdEta"><small>✓ Teslim edildi</small><b>'+hm(TRK.deliveredAt||(events.find(e=>e.to==='delivered')||{}).at||o.created_at)+'</b></div><p style="margin-top:6px">'+E(dt(TRK.deliveredAt||(events.find(e=>e.to==='delivered')||{}).at||o.created_at))+' · '+M(o.total_kurus)+'</p>':'')+
      (!bad?'<div class="fdSteps">'+lbl.map((l,i)=>'<div class="'+(i<stg||done?'done':i===stg?'cur':'')+'"><i></i>'+E(l)+'</div>').join('')+'</div>':'')+'</div>'+
    placed+refundNote+(qk.length?'<div class="fdwQk">'+qk.join('')+'</div>':'')+
    (showMap&&!mapTop?mapBlock:'')+
    (!TERMINAL.includes(st)?pushSlot('order'):'')+
    (st==='new'&&TRK.acceptMin?'<div class="fdNote info">⏳ Restoran siparişini onaylıyor. '+TRK.acceptMin+' dk içinde yanıt gelmezse sipariş otomatik iptal edilir ve sana bildirilir.</div>':'')+
    (showCode?'<div class="fdCodeBox"><div class="tx"><small>TESLİMAT KODUN</small><span class="fdSmall">Siparişi teslim alırken kuryeye söyle.</span></div><b>'+E(t.delivery_code)+'</b></div>':'')+
    (cr?'<div class="fdPerson"><span class="av">🛵</span><div class="tx"><b>'+E(cr.name)+'</b><small>'+E(VEH[cr.vehicle]||'Kurye')+(+cr.rating_avg?' · ★ '+(+cr.rating_avg).toFixed(1):'')+
      (d.location?' · <a href="https://www.google.com/maps?q='+d.location.lat+','+d.location.lng+'" target="_blank" rel="noopener" style="color:var(--fd-acc)">konum ('+ago(d.location.at)+')</a>':'')+'</small></div>'+
      (cr.phone&&!TERMINAL.includes(st)?'<a class="fb sm soft" href="tel:'+E(cr.phone)+'">📞 Ara</a>':'')+'</div>':'')+
    '<div class="fdPerson"><span class="av">🏪</span><div class="tx"><b>'+E(t.venue.name)+'</b><small>'+E(MODE[o.delivery_mode]||'')+'</small></div>'+(t.venue.phone&&!TERMINAL.includes(st)?'<a class="fb sm" href="tel:'+E(t.venue.phone)+'">📞</a>':'')+'</div>'+
    (acts.length?'<div class="fdRows" style="margin-bottom:12px">'+acts.join('')+'</div>':'')+
    (t.review?'<div class="fdNote ok">★ Değerlendirmen: restoran '+t.review.venue_rating+'/5'+(t.review.courier_rating?' · kurye '+t.review.courier_rating+'/5':'')+(t.review.comment?' — '+E(t.review.comment):'')+'</div>':'')+
    (!TERMINAL.includes(st)?'<div class="fdPerson" id="fdNoteCard" data-note="'+E(o.note||'')+'"><span class="av">📝</span><div class="tx"><b>Sipariş notun</b><small>'+(o.note?E(o.note):'Not eklemedin')+'</small></div><button type="button" class="fb sm" onclick="foodEditNote(\''+E(o.id)+'\')">'+(o.note?'Düzenle':'Not ekle')+'</button></div>':'')+
    '<details class="fdDet"'+(TERMINAL.includes(st)?' open':'')+'><summary>Sepetim · '+t.items.reduce((n,i)=>n+i.quantity,0)+' ürün</summary><div>'+
      t.items.map(i=>'<div class="fdLine"><span>'+i.quantity+'× '+E(i.name)+((i.options||[]).length?'<br><small class="fdMuted">'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</span><span>'+M(i.line_total_kurus)+'</span></div>').join('')+
      '</div></details><details class="fdDet"'+(TERMINAL.includes(st)?' open':'')+'><summary>Ödeme ve teslimat · '+M(o.total_kurus)+'</summary><div>'+'<div>'+sumHTML({subtotal_kurus:o.subtotal_kurus,delivery_fee_kurus:o.delivery_fee_kurus,platform_fee_kurus:o.platform_fee_kurus,discount_kurus:o.discount_kurus,total_kurus:o.total_kurus},!pickup)+'</div>'+
      '<div class="fdKV"><span>Ödeme</span><b>'+E(PAY[o.payment_method]||o.payment_method)+'</b>'+(o.address_text?'<span>Adres</span><b>'+E(o.address_text)+'</b>':'')+(o.phone?'<span>Telefon</span><b>'+E(o.phone)+'</b>':'')+(o.note?'<span>Not</span><b>'+E(o.note)+'</b>':'')+'<span>Sipariş</span><b>'+E(dt(o.created_at))+'</b></div>'+
      (events.length?'<ul class="fdEv">'+events.map(e=>'<li><b>'+E(STL[e.to][1])+'</b><span>'+hm(e.at)+'</span></li>').join('')+'</ul>':'')+
    '</div></details>'+
    ((t.issues||[]).length?'<details class="fdDet" open><summary>Bildirdiğin sorunlar</summary><div>'+t.issues.map(x=>'<div style="margin-bottom:8px"><b>'+E(ISSUE[x.type]||x.type)+'</b> <span class="fdPill">'+E({open:'Açık',in_review:'İnceleniyor',resolved:'Çözüldü',rejected:'Sonuçlandı'}[x.status]||x.status)+'</span>'+(x.description?'<div class="fdMuted fdSmall">'+E(x.description)+'</div>':'')+(x.resolution?'<div class="fdSmall" style="margin-top:4px">↳ '+E(x.resolution)+'</div>':'')+'</div>').join('')+'</div></details>':'')+
    (pfOn()?'<div class="fdCenter" style="margin-top:6px">'+(['delivered'].includes(st)&&!pickup?'<button type="button" class="fb ghost" onclick="foodPfShowProof(\''+E(o.id)+'\',this)">📷 Teslim fotoğrafı</button>':'')+
      (TERMINAL.includes(st)?'<button type="button" class="fb ghost" onclick="PF.openDispute(\'food\',\'food_order\',\''+E(o.id)+'\')">Uyuşmazlık aç</button>':'')+'</div>':'')+
    '<div class="fdCenter" style="margin-top:6px">'+
      (t.can.report&&!done&&TERMINAL.includes(st)?'<button type="button" class="fb ghost" onclick="foodIssue(\''+E(o.id)+'\')">Yardım · Sorun bildir</button>':'')+'</div>'+
    (!t.can.cancel&&!TERMINAL.includes(st)&&st!=='new'?'<p class="fdMuted fdSmall fdCenter">Restoran onayladıktan sonra iptal için restoranı arayabilirsin.</p>':'')+'</div>');
}
let TMAP=null,TMK={};
async function trackMap(v){
  const el=document.getElementById('fdTMap');if(!el)return;
  try{const L=await loadMap();if(!document.getElementById('fdTMap'))return;
    if(TMAP){try{TMAP.remove()}catch(e){}TMAP=null}TMK={};
    const pts=[v,TRK.courier,TRK.home].filter(Boolean);TMAP=makeMap(L,'fdTMap',pts[0]||IZMIR,15);
    if(v){TMK.v=L.marker(v,{icon:mapIcon(L,'🏪'),title:'Restoran'}).addTo(TMAP);TMK.v.bindTooltip&&TMK.v.bindTooltip(TRK.vname||'Restoran',{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'})}
    if(TRK.home){TMK.h=L.marker(TRK.home,{icon:mapIcon(L,'🏠'),title:'Teslimat adresin'}).addTo(TMAP);TMK.h.bindTooltip&&TMK.h.bindTooltip('Adresin',{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'})}
    if(TRK.courier){TMK.c=L.marker(TRK.courier,{icon:mapIcon(L,'🛵','cr'),title:'Kurye',zIndexOffset:1000}).addTo(TMAP);TMK.c.bindTooltip&&TMK.c.bindTooltip(courierTip(),{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'})}
    TMK.line=L.polyline(pts,{color:'#0f9f6a',weight:4,opacity:.7,dashArray:'6 8'}).addTo(TMAP);
    trackView(false);
    setTimeout(()=>{if(TMAP){TMAP.invalidateSize();trackView(false)}},180);locText();
  }catch(e){(el.closest('.fdwTWrap')||el).remove();const t=document.getElementById('fdTLoc');if(t)t.remove()}
}
/* Görünüm: 'focus' = kurye (+ yoldaysa ev) yakın plan; 'all' = tüm noktalar. Ara sokak adları için en az 16. seviye. */
function trackView(user){
  if(!TMAP)return;const on=['picked_up','on_the_way','near_customer'].includes(TRK.st);
  const focus=TRK.view!=='all'&&TRK.courier?[TRK.courier].concat(on&&TRK.home?[TRK.home]:[]):[TRK.venue,TRK.courier,TRK.home].filter(Boolean);
  if(focus.length>1)TMAP.fitBounds(focus,{padding:[46,46],maxZoom:18});else if(focus.length)TMAP.setView(focus[0],17);else TMAP.setView(IZMIR,15);
  if(TRK.view!=='all'&&TRK.courier&&TMAP.getZoom&&TMAP.getZoom()<16)TMAP.setView(TRK.courier,16);
  qa('[data-tv]').forEach(b=>b.classList.toggle('on',b.dataset.tv===(TRK.view||'focus')));
}
window.foodTrackView=function(v){TRK.view=v;trackView(true)};
function courierTip(){const sec=TRK.at?Math.round((Date.now()-new Date(TRK.at))/1000):null;return 'Kurye'+(sec!=null?' · '+(sec<60?sec+' sn':Math.round(sec/60)+' dk'):'')}
function locText(){
  if(TMK.c&&TMK.c.setTooltipContent)TMK.c.setTooltipContent(courierTip());
  const el=document.getElementById('fdTLoc');if(!el)return;
  if(!TRK.courier){el.textContent=TRK.mode==='self_delivery'?'🏪 Bu siparişi restoranın kendi kuryesi getiriyor. Restoran kuryeleri konum paylaşmadığı için haritada yalnızca restoran ve adresin görünür.':'🛵 Kurye konumu, kurye konum paylaşmaya başlayınca haritada görünür.';return}
  const sec=TRK.at?Math.round((Date.now()-new Date(TRK.at))/1000):null;
  el.innerHTML=sec!=null&&sec>120?'<span style="color:var(--fd-warn);font-weight:700">⚠️ Kuryenin konumu '+Math.round(sec/60)+' dk önce güncellendi (bağlantı zayıf olabilir).</span>':'🛵 Kuryeni haritadan canlı izleyebilirsin'+(sec!=null?' · '+(sec<60?sec+' sn':Math.round(sec/60)+' dk')+' önce':'');
}
async function moveCourier(){
  if(!TMAP||!document.getElementById('fdTMap')){if(TRK.reload)TRK.reload();return}
  try{const L=await loadMap();
    if(TMK.c)TMK.c.setLatLng(TRK.courier);else{TMK.c=L.marker(TRK.courier,{icon:mapIcon(L,'🛵','cr'),title:'Kurye',zIndexOffset:1000}).addTo(TMAP);TMK.c.bindTooltip&&TMK.c.bindTooltip(courierTip(),{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'})}
    if(TMK.c.setTooltipContent)TMK.c.setTooltipContent(courierTip());
    const pts=[TMK.v&&TMK.v.getLatLng(),TRK.courier,TRK.home].filter(Boolean);if(TMK.line)TMK.line.setLatLngs(pts);
    if(!TMAP.getBounds().pad(-0.1).contains(TRK.courier))trackView(false);
  }catch(e){}
  locText();
}
window.foodEditNote=async function(id){
  const nc=document.getElementById('fdNoteCard');const cur=nc?nc.getAttribute('data-note'):'';
  const v=await promptBox('Sipariş notu','Örn. zile basmayın, kapıya bırakın',{value:cur||'',chips:['Zile basmayın','Kapıya bırakın','Beni arayın'],text:'Restoran ve kurye bildirim alır.',okLabel:'Kaydet'});
  if(v===null)return;
  try{const r=await RPC('food_update_order_note',{p_order_id:id,p_note:v});toast(r&&r.changed===false?'Not değişmedi':'Notun güncellendi, restorana iletildi');showFoodOrderDetail(id)}catch(e){toast(errMsg(e),'err')}
};
window.foodCustomerCancel=async function(id,btn){
  const ok=await confirmBox('Sipariş iptal edilsin mi?','Restoran henüz onaylamadığı için ücretsiz iptal edebilirsin.','İptal et',true);if(!ok)return;
  await once('cancel'+id,btn,async()=>{try{await RPC('food_transition_order',{p_order_id:id,p_to:'cancelled',p_reason:'Müşteri iptal etti'});toast('Siparişin iptal edildi');showFoodOrderDetail(id)}catch(e){toast(errMsg(e),'err');showFoodOrderDetail(id)}});
};
window.foodReview=function(id,withCourier){
  let vr=0,cr=0;
  const starsRow=k=>'<div class="fdStars" data-k="'+k+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-n="'+n+'" aria-label="'+n+' yıldız">★</button>').join('')+'</div>';
  const w=modal(sheetHead('Siparişini değerlendir','Yorumun restoranın gelişmesine yardımcı olur.')+'<b>Restoran</b>'+starsRow('v')+(withCourier?'<b>Kurye</b>'+starsRow('c'):'')+
    '<div id="fdRvItems"></div><div class="fdForm"><textarea id="fdRvC" rows="3" maxlength="1000" placeholder="Yorumun (isteğe bağlı)"></textarea></div><div class="fdErr" id="fdRvE" hidden></div>'+
    '<button type="button" class="fb pri block" style="margin-top:12px" data-x="ok">Gönder</button>',{sheet:true});
  bindClose(w);
  qa('.fdStars',w).forEach(g=>qa('button',g).forEach(b=>b.onclick=()=>{const n=+b.dataset.n;if(g.dataset.k==='v')vr=n;else cr=n;qa('button',g).forEach(x=>x.classList.toggle('on',+x.dataset.n<=n))}));
  /* V4: ürün beğenisi (👍/👎). Veritabanı hazır değilse bölüm hiç görünmez. */
  const likes={};
  (async()=>{try{
    const t=await RPC('food_order_tracking',{p_order_id:id});const vid=t&&t.venue&&t.venue.id;if(!vid)return;
    await RPC('food_item_like_stats',{p_venue_id:vid});
    const seen={},its=(t.items||[]).filter(i=>i.menu_item_id&&!seen[i.menu_item_id]&&(seen[i.menu_item_id]=1)).slice(0,8);
    const box=w.querySelector('#fdRvItems');if(!its.length||!box||!document.body.contains(w))return;
    box.innerHTML='<b>Ürünleri beğendin mi?</b><small class="fdMuted fdSmall" style="display:block;margin:2px 0 6px">İsteğe bağlı · diğer müşterilere yol gösterir</small><div class="fdwRvIt">'+its.map(i=>'<div class="r" data-it="'+E(i.menu_item_id)+'"><span>'+E(i.name)+'</span><button type="button" data-l="1" aria-label="'+E(i.name)+' beğendim" aria-pressed="false">👍</button><button type="button" data-l="0" aria-label="'+E(i.name)+' beğenmedim" aria-pressed="false">👎</button></div>').join('')+'</div>';
    qa('.fdwRvIt .r',box).forEach(r=>qa('button',r).forEach(bt=>bt.onclick=()=>{const k=r.dataset.it,v=bt.dataset.l==='1';
      if(likes[k]===v)delete likes[k];else likes[k]=v;qa('button',r).forEach(x=>{const on=likes[k]!==undefined&&(x.dataset.l==='1')===likes[k];x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)})}));
  }catch(e){}})();
  w.querySelector('[data-x=ok]').onclick=async function(){
    if(!vr){const e=w.querySelector('#fdRvE');e.hidden=false;e.textContent='Restorana puan ver.';return}
    await once('review'+id,this,async()=>{try{await RPC('food_submit_review',{p_order_id:id,p_venue_rating:vr,p_courier_rating:cr||null,p_comment:w.querySelector('#fdRvC').value||null});
      const lk=Object.keys(likes).map(k=>({item_id:k,liked:likes[k]}));if(lk.length)RPC('food_submit_item_likes',{p_order_id:id,p_likes:lk}).catch(()=>{});
      closeModal();toast('Teşekkürler, değerlendirmen kaydedildi');
      if(document.getElementById('fdTrack'))showFoodOrderDetail(id);else if(document.getElementById('fdOList'))showFoodOrders()}
      catch(e){const x=w.querySelector('#fdRvE');x.hidden=false;x.textContent=errMsg(e)}});
  };
};
window.foodIssue=function(id){
  const w=modal(sheetHead('Nasıl yardımcı olabiliriz?','Bildirimin restorana iletilir.')+'<div class="fdRadio">'+Object.entries(ISSUE).map(([k,l],i)=>'<label class="'+(i?'':'on')+'"><input type="radio" name="fdIs" value="'+k+'"'+(i?'':' checked')+'><span>'+E(l)+'</span></label>').join('')+'</div>'+
    '<div class="fdForm"><textarea id="fdIsD" rows="3" maxlength="1500" placeholder="Kısaca ne oldu?"></textarea></div><div class="fdErr" id="fdIsE" hidden></div>'+
    '<button type="button" class="fb pri block" style="margin-top:12px" data-x="ok">Gönder</button>',{sheet:true,full:true});
  bindClose(w);
  qa('input[name=fdIs]',w).forEach(r=>r.onchange=()=>qa('.fdRadio label',w).forEach(l=>l.classList.toggle('on',l.querySelector('input').checked)));
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
      const vs=await Q('GET','food_venues?select=id,name,delivery_mode,delivery_provider,image_url&id=eq.'+encodeURIComponent(t.venue.id));
      const v=vs&&vs[0];if(!v)throw new Error('Restoran artık aktif değil.');
      const c=cartGet();
      if(c.venue&&c.venue.id!==v.id&&c.items.length){const ok=await confirmBox('Sepetin değişecek','Mevcut sepetin boşaltılıp bu siparişin ürünleri eklensin mi?','Devam et',true);if(!ok)return}
      const items=t.items.filter(i=>i.menu_item_id).map(i=>{const ids=(i.options||[]).map(o=>o.option_id).filter(Boolean).sort();
        return{key:i.menu_item_id+'|'+ids.join(','),menu_item_id:i.menu_item_id,name:i.name,quantity:i.quantity,option_ids:ids,options_label:(i.options||[]).map(o=>(o.kind==='remove'?'Çıkar: ':'')+o.option).join(', '),unit_kurus:i.unit_price_kurus,img:null}});
      if(!items.length)throw new Error('Bu siparişin ürünleri menüde bulunamadı.');
      cartSave({venue:{id:v.id,name:v.name,delivery_mode:v.delivery_mode,delivery_provider:v.delivery_provider,image_url:v.image_url},items});
      toast('Ürünler sepete eklendi. Güncel fiyatlar sepette gösterilir.');showFoodCart();
    }catch(e){toast(errMsg(e),'err')}
  });
};

/* ====================== Bildirimler ====================== */
async function showFoodNotifications(){
  if(!A())return;const tok=newScreen();
  render(bar('Bildirimler','showFoodHome()')+'<div class="fdwNAct"><button type="button" class="fb sm" onclick="foodReadAll(this)">✓ Tümü okundu</button><button type="button" class="fb sm ghostBad" id="fdNDel" onclick="foodDelAll(this)">🗑 Tümünü sil</button></div>'+pushSlot('notif')+'<div id="fdNList">'+skel('row',3)+'</div>');pushDraw();
  const load=async()=>{
    try{const r=await Q('GET','food_notifications?select=id,order_id,type,title,body,read_at,created_at&order=created_at.desc&limit=40');if(!alive(tok))return;
      setHTML('fdNList',r.length?'<div class="fdRows">'+r.map(n=>'<button type="button" class="fdRowBtn" style="'+(n.read_at?'opacity:.65':'border-color:var(--fd-acc)')+'" onclick="foodOpenNotif(\''+E(n.id)+'\',\''+E(n.order_id||'')+'\',\''+E(n.type)+'\')"><span class="ic">'+(n.read_at?'🔕':'🔔')+'</span><span class="tx"><small>'+E(ago(n.created_at))+'</small><b>'+E(n.title)+'</b><span class="fdMuted fdSmall" style="display:block">'+E(n.body||'')+'</span></span><span class="ch">›</span></button>').join('')+'</div>':
        empty('🔔','Bildirim yok','Sipariş durumların burada görünür.'))}
    catch(e){setHTML('fdNList',errBox(e,'showFoodNotifications()'))}
  };
  await load();watch(tok,[{table:'food_notifications',filter:'user_id=eq.'+UID()}],()=>load());
}
window.foodDelAll=async function(btn){
  if(!await confirmBox('Tüm bildirimler silinsin mi?','Bildirim listen temizlenir. Siparişlerin ve sipariş geçmişin etkilenmez.','Tümünü sil',true))return;
  await once('delAll',btn,async()=>{try{const n=await RPC('food_delete_notifications',{p_ids:null});toast((+n||0)+' bildirim silindi');showFoodNotifications()}catch(e){toast(pfMissing(e)?'Bu özellik henüz etkin değil.':errMsg(e),'err')}});
};
window.foodReadAll=async function(btn){await once('readAll',btn,async()=>{try{await RPC('food_mark_notifications_read',{p_ids:null});showFoodNotifications()}catch(e){toast(errMsg(e),'err')}})};
window.foodOpenNotif=async function(id,orderId,type){
  RPC('food_mark_notifications_read',{p_ids:[id]}).catch(()=>{});
  if(type.indexOf('courier')===0)return showFoodCourier();
  if(type.indexOf('venue')===0){const w=await whoami().catch(()=>null);if(w&&w.venues&&w.venues.length)return showFoodBusiness()}
  if(orderId)return showFoodOrderDetail(orderId);
};

/* ====================== F6 · İşletme paneli ====================== */
const TABS=[['new','Yeni',['new']],['prep','Mutfakta',['preparing']],['ready','Hazır',['ready','courier_wait','active_delivery']],['past','Geçmiş',null]];
const BZ={venueId:null,role:null,tab:'new',past:'done',offset:0,orders:[],venue:null,venues:[]};
/* Tek ses bağlamı: tarayıcılar ilk dokunuştan önce ses çalmaya izin vermez */
let AC=null;
function audioCtx(resume){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!AC)AC=new C();if(resume&&AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function soundOk(){return !!AC&&AC.state==='running'}
function beep(){try{const c=audioCtx();if(!c||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.1;const t=c.currentTime;o.start(t);o.frequency.setValueAtTime(1175,t+.15);o.frequency.setValueAtTime(880,t+.3);o.frequency.setValueAtTime(1175,t+.45);o.stop(t+.6)}catch(e){}}
function alarmDraw(){
  const n=BZ.newCount||0;
  setHTML('fdAlarmBox',n?'<button type="button" class="fdAlarm" onclick="foodAlarmTap()">🔔<span>'+n+' yeni sipariş onay bekliyor'+(soundOk()?'':'<br><small style="font-weight:600">🔇 Sesli uyarı için ekrana bir kez dokun</small>')+'</span>Göster ›</button>':'');
}
window.foodAlarmTap=function(){audioCtx(true);foodBizTab('new');setTimeout(()=>{beep();alarmDraw()},120)};
function timersTick(){qa('[data-deadline]').forEach(el=>{const m=Math.ceil((new Date(el.dataset.deadline)-Date.now())/60000);el.classList.toggle('late',m<=2);el.textContent=m>0?'· ⏳ Yanıt için '+m+' dk':'· ⏳ Süre doldu, otomatik iptal ediliyor'});qa('[data-eta]').forEach(el=>{const m=Math.round((new Date(el.dataset.eta)-Date.now())/60000);el.classList.toggle('late',m<0);el.textContent=m>=0?'⏱ '+m+' dk kaldı':'⏰ '+(-m)+' dk gecikti'})}
function isMgr(){return BZ.role==='owner'||BZ.role==='manager'}
function subnav(venueId,on){
  if(!isMgr())return '';
  return '<div class="fdSub"><button type="button" class="'+(on==='orders'?'on':'')+'" onclick="showFoodBusiness(\''+E(venueId)+'\')">Siparişler</button><button type="button" class="'+(on==='menu'?'on':'')+'" onclick="showFoodMenu(\''+E(venueId)+'\')">Menü</button><button type="button" class="'+(on==='settings'?'on':'')+'" onclick="showFoodSettings(\''+E(venueId)+'\')">Ayarlar</button><button type="button" class="'+(on==='reports'?'on':'')+'" onclick="showFoodReports(\''+E(venueId)+'\')">Raporlar</button></div>';
}
async function bizContext(venueId){
  const w=await whoami(true);const venues=w.venues||[];BZ.venues=venues;
  if(!venues.length)return null;
  const pick=venueId||localStorage.getItem(VENUE_KEY);const cur=venues.find(v=>v.id===pick)||venues[0];
  localStorage.setItem(VENUE_KEY,cur.id);BZ.venueId=cur.id;BZ.role=cur.role;return cur;
}
function venueSwitchBtn(){return (BZ.venues.length>1||BZ.role==='owner')?'<button type="button" class="fdIco" aria-label="İşletme değiştir" onclick="foodVenueSwitch()">⇄</button>':''}
window.foodVenueSwitch=function(){
  const w=modal(sheetHead('İşletmelerin')+'<div class="fdRows">'+BZ.venues.map(v=>row(v.id===BZ.venueId?'✅':'🏪',{owner:'Sahip',manager:'Yönetici',staff:'Personel'}[v.role]||'',E(v.name),'showFoodBusiness(\''+E(v.id)+'\')')).join('')+
    row('➕','Yeni','İşletme ekle','foodNewVenue()')+'</div>',{sheet:true});bindClose(w);
};
async function showFoodBusiness(venueId){FDW_TAB='';
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('İşletme paneli','showFoodHome()')+skel('row',1)+skel('row',3));
  let cur;try{cur=await bizContext(venueId)}catch(e){return render(bar('İşletme paneli','showFoodHome()')+errBox(e,'showFoodBusiness()'))}
  if(!alive(tok))return;if(!cur)return venueCreateForm();
  let v=null;try{v=(await Q('GET','food_venues?select=id,name,is_open,is_active,working_hours,delivery_mode,delivery_provider,prep_time_min&id=eq.'+cur.id))[0]}catch(e){}
  if(!alive(tok))return;BZ.venue=v||{id:cur.id,name:cur.name,is_open:false};BZ.offset=0;BZ.orders=[];
  const mgr=isMgr();const open=BZ.venue.is_open;
  render(bar(BZ.venue.name,'showFoodHome()','<span class="fdLive" id="fdLive"></span>'+venueSwitchBtn()+bellBtn(),{owner:'İşletme sahibi',manager:'Yönetici',staff:'Personel'}[cur.role]||'')+
    roleBar('business')+subnav(cur.id,'orders')+
    '<div class="fdOpen'+(open?' on':'')+'" id="fdOpenCard"><div class="tx"><b>'+(open?'Sipariş alıyorsun':'Sipariş almıyorsun')+'</b><small>'+(open&&v&&!openNow(v)&&v.is_active?'Açık ama şu an çalışma saati dışında':open?'Müşteriler sipariş verebilir':'Menün görünür, sipariş verilemez')+'</small></div>'+
      (mgr?sw('fdOpenSw',open,'foodToggleOpen(this)'):'')+'</div>'+
    (mgr&&v?'<div id="fdBusy">'+busyRow(v)+'</div>':'')+
    '<div id="fdAlarmBox"></div>'+pushSlot('business')+'<div id="fdIssB"></div><div class="fdKpi" id="fdKpi">'+skel('line',1)+'</div>'+
    '<div class="fdSeg" id="fdTabs"></div><div id="fdPastF"></div><div id="fdBList">'+skel('row',2)+'</div><div id="fdBMore"></div>'+
    (mgr&&pfOn()?'<button type="button" class="fdwStrip" style="margin-top:14px" onclick="foodPromoRequest(\''+E(cur.id)+'\')"><span class="i">📣</span><span class="t"><b>Kampanya ve reklam</b><small>Öne çıkma, slider veya indirim talebi oluştur</small></span></button>':''));
  bellCount();pushDraw();
  const origTitle=document.title;onCleanup(()=>{document.title=origTitle});BZ.origTitle=origTitle;
  BZ.newCount=0;const alarm=setInterval(()=>{if(BZ.newCount>0&&document.visibilityState==='visible')beep()},6000);onCleanup(()=>clearInterval(alarm));
  const tick=setInterval(timersTick,30000);onCleanup(()=>clearInterval(tick));
  const unlock=()=>{audioCtx(true);/* bandı dokunuş bittikten sonra güncelle: dokunuş sırasında sayfa kayarsa tıklama boşa gider */setTimeout(alarmDraw,450)};document.addEventListener('pointerdown',unlock,{once:true});onCleanup(()=>document.removeEventListener('pointerdown',unlock));
  try{const st=await foodSettings();BZ.acceptMin=+st.accept_timeout_min||null}catch(e){}
  await bizLoad(tok,false);
  RPC('food_venue_issues',{p_venue_id:cur.id}).then(r=>{if(!alive(tok))return;const n=(r||[]).filter(x=>['open','in_review'].includes(x.status)).length;
    if(n)setHTML('fdIssB','<button type="button" class="fdRowBtn warn" style="margin-bottom:12px" onclick="showFoodVenueIssues(\''+E(cur.id)+'\')"><span class="ic">⚠️</span><span class="tx"><small>Müşteri bildirimi</small><b>'+n+' açık sorun bildirimi var</b></span><span class="ch">›</span></button>')}).catch(()=>{});
  watch(tok,[{table:'food_orders',filter:'venue_id=eq.'+cur.id}],debounce(async(kind,p)=>{
    if(p&&p.eventType==='INSERT'){toast('🔔 Yeni sipariş geldi!');beep();try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}if(BZ.tab!=='new'){BZ.tab='new'}}
    await bizLoad(tok,false);
  },400));
}
async function bizLoad(tok,more){
  try{
    const tab=TABS.find(t=>t[0]===BZ.tab);const secs=tab[2]||[BZ.past];const lim=tab[2]?50:20;
    const res=await Promise.all(secs.map(s=>RPC('food_venue_orders',{p_venue_id:BZ.venueId,p_section:s,p_limit:lim,p_offset:more?BZ.offset:0})));
    if(!alive(tok))return;
    const r0=res[0]||{};const s=r0.summary||{},c=r0.counts||{};
    let orders=[].concat(...res.map(r=>r.orders||[]));
    orders.sort((a,b)=>tab[2]?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
    BZ.orders=more?BZ.orders.concat(orders):orders;BZ.offset=BZ.orders.length;
    const cnt=t=>t[2]?t[2].reduce((n,k)=>n+(+c[k]||0),0):null;
    const nNew=+c.new||0;BZ.newCount=nNew;alarmDraw();
    document.title=(nNew?'('+nNew+') Yeni sipariş · ':'')+(BZ.origTitle||document.title.replace(/^\(\d+\) Yeni sipariş · /,''));
    setHTML('fdKpi','<div class="'+(nNew?'hot':'')+'"><b>'+nNew+'</b><span>Bekleyen</span></div><div><b>'+(s.today_orders||0)+'</b><span>Bugün sipariş</span></div><div><b>'+M(s.today_revenue_kurus||0)+'</b><span>Bugün hakediş</span></div>');
    setHTML('fdTabs',TABS.map(t=>{const n=cnt(t);return '<button type="button" class="'+(BZ.tab===t[0]?'on':'')+'" onclick="foodBizTab(\''+t[0]+'\')">'+E(t[1])+(n!=null?'<em class="'+(n?'':'z')+'">'+n+'</em>':'')+'</button>'}).join(''));
    setHTML('fdPastF',BZ.tab==='past'?'<div class="fdChips"><button type="button" class="fdChip'+(BZ.past==='done'?' on':'')+'" onclick="foodBizPast(\'done\')">Tamamlanan · '+(+c.done||0)+'</button><button type="button" class="fdChip'+(BZ.past==='cancelled'?' on':'')+'" onclick="foodBizPast(\'cancelled\')">İptal / red · '+(+c.cancelled||0)+'</button></div>'+
      (s.avg_prep_min!=null?'<p class="fdMuted fdSmall" style="margin:0 0 10px">Bugün: '+(s.today_delivered||0)+' tamamlanan · '+(s.today_cancelled||0)+' iptal · ort. hazırlık '+s.avg_prep_min+' dk</p>':''):'');
    const emptyTxt={new:['🛎️','Yeni sipariş yok','Sipariş geldiğinde burada anında görünür ve sesli uyarı alırsın.'],prep:['👨‍🍳','Mutfakta sipariş yok','Kabul ettiğin siparişler burada.'],ready:['📦','Hazır veya yolda sipariş yok','Hazır, kurye bekleyen ve yoldaki siparişler burada.'],past:['🧾','Kayıt yok','']}[BZ.tab];
    if(BZ.tab==='past'){pastDraw();}else setHTML('fdBList',BZ.orders.length?'<div class="fdwBizG">'+BZ.orders.map(bizCard).join('')+'</div>':empty(emptyTxt[0],emptyTxt[1],emptyTxt[2]));timersTick();
    setHTML('fdBMore',!tab[2]&&orders.length===20?'<button type="button" class="fb block" onclick="foodBizMore(this)">Daha fazla</button>':'');
  }catch(e){setHTML('fdBList',errBox(e,'showFoodBusiness()'))}
}
/* Faz 2 · Geçmiş: tarih filtresi + arama + dönem özeti (yüklenen kayıtlar üzerinde) */
BZ.pday=BZ.pday||'all';BZ.pq=BZ.pq||'';
function dayStart(off){const d=istNow();d.setHours(0,0,0,0);d.setDate(d.getDate()-off);return d}
function inIst(ts){return new Date(new Date(ts).toLocaleString('en-US',{timeZone:'Europe/Istanbul'}))}
function pastFilter(list){
  const q=BZ.pq.trim().toLocaleLowerCase('tr');
  return list.filter(o=>{
    const t=inIst(o.created_at);
    if(BZ.pday==='today'&&t<dayStart(0))return false;
    if(BZ.pday==='yesterday'&&(t<dayStart(1)||t>=dayStart(0)))return false;
    if(BZ.pday==='week'&&t<dayStart(6))return false;
    if(q){const hay=((o.no||'')+' '+(o.phone||'')+' '+(o.items||[]).map(i=>i.name).join(' ')+' '+(o.address_text||'')).toLocaleLowerCase('tr');if(!hay.includes(q))return false}
    return true;
  });
}
function pastDraw(){
  const box=document.getElementById('fdBList');if(!box)return;
  const f=pastFilter(BZ.orders);const del=f.filter(o=>o.status==='delivered');
  const days=[['today','Bugün'],['yesterday','Dün'],['week','7 gün'],['all','Tümü']];
  box.innerHTML='<div class="fdChips">'+days.map(([k,l])=>'<button type="button" class="fdChip'+(BZ.pday===k?' on':'')+'" onclick="foodPastDay(\''+k+'\')">'+l+'</button>').join('')+'</div>'+
    '<div class="fdSearch" style="margin-bottom:10px"><input id="fdPQ" type="search" placeholder="Sipariş no, telefon veya ürün ara" value="'+E(BZ.pq)+'" autocomplete="off" aria-label="Geçmişte ara"></div>'+
    (BZ.past==='done'?'<div class="fdKpi" style="margin-bottom:12px"><div><b>'+f.length+'</b><span>Sipariş</span></div><div><b>'+M(del.reduce((n,o)=>n+(+o.restaurant_share_kurus||0),0))+'</b><span>Hakediş</span></div><div><b>'+M(del.length?Math.round(del.reduce((n,o)=>n+(+o.total_kurus||0),0)/del.length):0)+'</b><span>Ort. sepet</span></div></div>':'')+
    '<div id="fdPList" class="fdwBizG">'+(f.length?f.map(bizCard).join(''):empty('🧾','Bu filtrede sipariş yok',BZ.pq?'Aramayı değiştir.':'Başka bir tarih seç.'))+'</div>';
  const i=document.getElementById('fdPQ');i.addEventListener('input',debounce(()=>{BZ.pq=i.value;const l=document.getElementById('fdPList');const ff=pastFilter(BZ.orders);if(l)l.innerHTML=ff.length?ff.map(bizCard).join(''):empty('🧾','Bu filtrede sipariş yok','Aramayı değiştir.')},250));
}
window.foodPastDay=function(k){BZ.pday=k;pastDraw()};
window.foodBizTab=function(k){BZ.tab=k;BZ.offset=0;setHTML('fdBList',skel('row',2));bizLoad(SCREEN,false)};
window.foodBizPast=function(k){BZ.past=k;BZ.offset=0;setHTML('fdBList',skel('row',2));bizLoad(SCREEN,false)};
window.foodBizMore=async function(btn){await once('bizMore',btn,()=>bizLoad(SCREEN,true))};
/* Karttaki birincil aksiyon + "⋯" menüsündeki ikincil aksiyonlar */
function bizActs(o){
  const m=o.delivery_mode,st=o.status;
  const P=(to,l)=>({to,l}),X=(to,l,bad)=>({to,l,bad});
  switch(st){
    case 'new':return{pri:P('accepted','Kabul et'),side:X('rejected','Reddet',1),more:[]};
    case 'accepted':return{pri:P('preparing','Hazırlamaya başla'),more:[X('ready','Doğrudan hazır işaretle'),X('cancelled','İptal et',1)]};
    case 'preparing':return{pri:P('ready','Sipariş hazır'),more:[X('cancelled','İptal et',1)]};
    case 'ready':return{pri:m==='pickup'?P('delivered','Müşteri teslim aldı'):m==='self_delivery'?P('on_the_way','Yola çıktı'):null,more:[X('cancelled','İptal et',1)]};
    case 'courier_search':return{info:'🔎 Kurye aranıyor. Atanınca burada görünecek.',more:[X('cancelled','İptal et',1)]};
    case 'courier_assigned':case 'courier_at_venue':return{pri:P('picked_up','Kurye teslim aldı'),more:[X('cancelled','İptal et',1)]};
    case 'on_the_way':return m==='self_delivery'?{pri:P('delivered','Teslim edildi'),more:[X('near_customer','Müşteriye yaklaştı'),X('failed','Teslim edilemedi',1)]}:{info:'🛵 Sipariş kuryede, müşteriye gidiyor.'};
    case 'near_customer':return m==='self_delivery'?{pri:P('delivered','Teslim edildi'),more:[X('failed','Teslim edilemedi',1)]}:{info:'📍 Kurye müşteriye yaklaştı.'};
    case 'picked_up':return{info:'🛍️ Kurye siparişi aldı.'};
    default:return{};
  }
}
function bizCard(o){
  const late=o.estimated_ready_at&&['accepted','preparing'].includes(o.status)&&new Date(o.estimated_ready_at)<new Date();
  const a=bizActs(o);const past=TERMINAL.includes(o.status);
  const call='foodVenueAct(\''+E(o.id)+'\',\'%TO%\',this,\''+o.delivery_mode+'\')';
  const moreJson=E(JSON.stringify((a.more||[]).map(x=>[x.to,x.l,x.bad?1:0])));
  const dl=o.status==='new'&&BZ.acceptMin?new Date(new Date(o.created_at).getTime()+BZ.acceptMin*60000).toISOString():null;
  return '<div class="fdBiz'+(o.status==='new'?' new':'')+'"><div class="hd"><div><b>#'+E(o.no)+'</b> <span class="fdMuted fdSmall">· '+ago(o.created_at)+'</span>'+(dl?' <span class="fdTimer" data-deadline="'+E(dl)+'"></span>':'')+'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'+badge(o.status)+'<span class="fdPill">'+(o.delivery_mode==='pickup'?'🛍️':'🛵')+' '+E(MODE[o.delivery_mode]||'')+'</span>'+(late?'<span class="fdBadge bad">⏰ Gecikiyor</span>':'')+'</div></div>'+
    '<div class="tot"><b>'+M(o.total_kurus)+'</b><small>'+E(PAY[o.payment_method]||'')+'</small>'+(past&&o.status==='delivered'?'<small>Hakediş '+M(o.restaurant_share_kurus)+'</small>':'')+'</div></div>'+
    '<div class="its">'+(o.items||[]).map(i=>'<div><span class="q">'+i.quantity+'×</span>'+E(i.name)+((i.options||[]).length?'<small>'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</div>').join('')+'</div>'+
    (o.note?'<div class="fdNote warn note">📝 '+E(o.note)+'</div>':'')+
    '<div class="inf">'+(o.address_text?'<div>📍 '+E(o.address_text)+'</div>':'')+(o.phone?'<div>📞 <a href="tel:'+E(o.phone)+'">'+E(o.phone)+'</a></div>':'')+
      (o.estimated_ready_at&&['accepted','preparing'].includes(o.status)?'<div>Hazır olacak: <b>'+hm(o.estimated_ready_at)+'</b> · <span class="fdTimer" data-eta="'+E(o.estimated_ready_at)+'"></span></div>':o.estimated_ready_at&&!past?'<div>⏱ Hazır olacak: <b>'+hm(o.estimated_ready_at)+'</b></div>':'')+
      (o.courier?'<div>🛵 '+E(o.courier.name)+' · '+E(VEH[o.courier.vehicle]||'')+(o.courier.phone?' · <a href="tel:'+E(o.courier.phone)+'">Ara</a>':'')+'</div>':'')+
      (o.cancel_reason?'<div class="fdBad">Sebep: '+E(o.cancel_reason)+'</div>':'')+'</div>'+
    (a.info?'<div class="fdNote info note">'+E(a.info)+'</div>':'')+
    ((a.pri||a.side||(a.more&&a.more.length))?'<div class="ft">'+
      (a.side?'<button type="button" class="fb ghostBad" onclick="'+call.replace('%TO%',a.side.to)+'">'+E(a.side.l)+'</button>':'')+
      (a.pri?'<button type="button" class="fb pri" onclick="'+call.replace('%TO%',a.pri.to)+'">'+E(a.pri.l)+'</button>':'<span style="flex:1"></span>')+
      (a.more&&a.more.length?'<button type="button" class="fb" aria-label="Diğer işlemler" onclick="foodBizMoreActs(\''+E(o.id)+'\',\''+o.delivery_mode+'\',this)" data-more="'+moreJson+'">⋯</button>':'')+'</div>':'<div style="height:12px"></div>')+'</div>';
}
window.foodBizMoreActs=function(id,mode,btn){
  let list=[];try{list=JSON.parse(btn.getAttribute('data-more'))}catch(e){}
  const w=modal(sheetHead('Sipariş #'+NO(id))+'<div class="fdRows">'+list.map(([to,l,bad])=>'<button type="button" class="fb block '+(bad?'ghostBad':'')+'" style="border:1px solid var(--line)" data-to="'+E(to)+'">'+E(l)+'</button>').join('')+'</div>',{sheet:true});
  bindClose(w);qa('[data-to]',w).forEach(b=>b.onclick=()=>{closeModal();foodVenueAct(id,b.dataset.to,null,mode)});
};
window.foodVenueAct=async function(id,to,btn,mode){
  let reason=null,prep=null,code=null;
  if(to==='accepted'){
    prep=await new Promise(res=>{
      const w=modal(sheetHead('Siparişi kabul et','Müşteriye gösterilecek tahmini hazırlık süresi')+'<div class="fdChips wrap">'+[10,15,20,30,45,60].map(n=>'<button type="button" class="fdChip" style="min-width:74px" data-n="'+n+'">'+n+' dk</button>').join('')+'</div>'+
        '<button type="button" class="fb pri block" style="margin-top:12px" data-x="ok">Varsayılan süreyle kabul et</button>',{sheet:true,onClose:()=>res(false)});
      bindClose(w,()=>res(false));qa('[data-n]',w).forEach(b=>b.onclick=()=>{closeModal();res(+b.dataset.n)});w.querySelector('[data-x=ok]').onclick=()=>{closeModal();res(null)};
    });
    if(prep===false)return;
  }
  if(to==='rejected'||to==='cancelled'||to==='failed'){
    reason=await promptBox(to==='rejected'?'Siparişi reddet':to==='failed'?'Teslimat neden tamamlanamadı?':'Siparişi iptal et','Sebep',{required:true,requiredText:'Müşteriye iletilecek bir sebep seç veya yaz.',danger:true,okLabel:to==='rejected'?'Reddet':to==='failed'?'Kaydet':'İptal et',text:'Sebep müşteriye iletilir.',
      chips:to==='failed'?['Müşteriye ulaşılamadı','Adres bulunamadı','Müşteri teslim almadı']:['Ürün tükendi','Çok yoğunuz','Restoran kapanıyor','Teslimat bölgesi dışında']});
    if(!reason)return;
  }
  if(to==='delivered'&&mode==='self_delivery'){
    code=await new Promise(res=>{
      const w=modal(sheetHead('Teslim edildi','Müşterinin 4 haneli teslimat kodunu girmen önerilir.')+'<input id="fdDc" class="fdCode" inputmode="numeric" maxlength="4" placeholder="• • • •" autofocus>'+
        '<div class="fdRow2"><button type="button" class="fb" data-x="skip">Kodsuz onayla</button><button type="button" class="fb pri" data-x="ok">Teslim edildi</button></div>',{sheet:true,onClose:()=>res(false)});
      bindClose(w,()=>res(false));w.querySelector('[data-x=skip]').onclick=()=>{closeModal();res('')};w.querySelector('[data-x=ok]').onclick=()=>{const v=w.querySelector('#fdDc').value.trim();closeModal();res(v||'')};
    });
    if(code===false)return;
  }
  if(to==='delivered'&&mode==='pickup'){if(!await confirmBox('Müşteri siparişi teslim aldı mı?','Sipariş tamamlandı olarak işaretlenecek.','Evet, teslim aldı'))return}
  if(to==='picked_up'){if(!await confirmBox('Kurye siparişi teslim aldı mı?','Ürünlerin eksiksiz verildiğinden emin ol.','Evet, teslim etti'))return}
  await once('va'+id,btn,async()=>{
    try{const r=await RPC('food_transition_order',{p_order_id:id,p_to:to,p_reason:reason,p_prep_minutes:prep,p_code:code||null});
      toast((STL[r.status]||['',r.status])[1]+' · #'+NO(id));await bizLoad(SCREEN,false)}
    catch(e){toast(errMsg(e),'err');await bizLoad(SCREEN,false)}
  });
};
/* V4 · İşletme raporları (yalnızca sahip/yönetici; kendi restoranının siparişleri, RLS ile) */
async function showFoodReports(venueId,days){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;days=[7,30].includes(+days)?+days:7;
  const head=()=>bar('Raporlar','showFoodBusiness(\''+E(venueId)+'\')')+roleBar('business')+subnav(venueId,'reports')+
    '<div class="fdChips" style="margin:0 0 12px">'+[7,30].map(d=>'<button type="button" class="fdChip'+(d===days?' on':'')+'" onclick="showFoodReports(\''+E(venueId)+'\','+d+')">Son '+d+' gün</button>').join('')+'</div>';
  render(head()+skel('row',3));
  try{
    await bizContext(venueId);if(!alive(tok))return;
    if(!isMgr())return render(bar('Raporlar','showFoodBusiness(\''+E(venueId)+'\')')+empty('🔒','Raporlar yöneticilere açık','Ciro ve hakediş raporlarını restoran sahibi veya yöneticisi görebilir.'));
    const since=new Date();since.setHours(0,0,0,0);since.setDate(since.getDate()-(days-1));
    const [rows,pop]=await Promise.all([
      Q('GET','food_orders?select=status,created_at,subtotal_kurus,restaurant_share_kurus,payment_method,delivery_mode,accepted_at,ready_at&venue_id=eq.'+encodeURIComponent(venueId)+'&created_at=gte.'+encodeURIComponent(since.toISOString())+'&order=created_at.asc&limit=5000'),
      RPC('food_venue_popular',{p_venue_id:venueId,p_limit:5}).catch(()=>[])]);
    if(!alive(tok))return;
    const del=rows.filter(o=>o.status==='delivered'),can=rows.filter(o=>['cancelled','rejected','failed'].includes(o.status));
    const sum=(a,k)=>a.reduce((n,o)=>n+(+o[k]||0),0);const ciro=sum(del,'subtotal_kurus'),hak=sum(del,'restaurant_share_kurus');
    const preps=rows.filter(o=>o.accepted_at&&o.ready_at).map(o=>(new Date(o.ready_at)-new Date(o.accepted_at))/60000).filter(x=>x>0&&x<300);
    const avgPrep=preps.length?Math.round(preps.reduce((a,b)=>a+b,0)/preps.length):null;
    const byDay=[];for(let i=0;i<days;i++){const d=new Date(since);d.setDate(since.getDate()+i);byDay.push({d,n:0,k:0})}
    del.forEach(o=>{const c=new Date(o.created_at);const i=Math.floor((new Date(c.getFullYear(),c.getMonth(),c.getDate())-since)/864e5);if(byDay[i]){byDay[i].n++;byDay[i].k+=+o.subtotal_kurus||0}});
    const mx=Math.max(1,...byDay.map(x=>x.k));
    const byH=new Array(24).fill(0);del.forEach(o=>byH[new Date(o.created_at).getHours()]++);const peak=byH.indexOf(Math.max(...byH));
    const pay={};del.forEach(o=>{const k=PAY[o.payment_method]||o.payment_method||'Diğer';pay[k]=(pay[k]||0)+1});
    const names={};(MN.items||[]).forEach(i=>names[i.id]=i.name);
    let popH='';if(pop&&pop.length){const need=pop.filter(x=>!names[x.menu_item_id]).map(x=>x.menu_item_id);
      if(need.length){try{(await Q('GET','food_menu_items?select=id,name&id=in.('+need.map(encodeURIComponent).join(',')+')')).forEach(i=>names[i.id]=i.name)}catch(e){}}
      if(!alive(tok))return;
      popH='<div class="fdSecH"><b>En çok satanlar</b></div><div class="fdCard">'+pop.map((x,i)=>'<div class="fdLine"><span>'+(i+1)+'. '+E(names[x.menu_item_id]||'Ürün')+'</span><b>'+(+x.sold||0)+' adet</b></div>').join('')+'</div>'}
    render(head()+
      '<div class="fdwRep">'+
        '<div><small>Teslim edilen</small><b>'+del.length+'</b><span>'+rows.length+' siparişten</span></div>'+
        '<div><small>Ciro (ürün)</small><b>'+M(ciro)+'</b><span>teslim edilenler</span></div>'+
        '<div><small>Hakediş</small><b>'+M(hak)+'</b><span>komisyon sonrası</span></div>'+
        '<div><small>Ort. sepet</small><b>'+(del.length?M(Math.round(ciro/del.length)):'—')+'</b><span>ürün tutarı</span></div>'+
        '<div><small>İptal / red</small><b class="'+(can.length?'fdBad':'')+'">'+can.length+'</b><span>'+(rows.length?Math.round(can.length*100/rows.length):0)+'%</span></div>'+
        '<div><small>Ort. hazırlık</small><b>'+(avgPrep!=null?avgPrep+' dk':'—')+'</b><span>onay → hazır</span></div>'+
      '</div>'+
      '<div class="fdSecH"><b>Günlük ciro</b></div><div class="fdwBars'+(days>7?' dense':'')+'" role="img" aria-label="Günlük ciro grafiği">'+byDay.map(x=>'<div title="'+E(x.d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+': '+x.n+' sipariş · '+M(x.k))+'"><i style="height:'+Math.max(x.k?4:0,Math.round(x.k*100/mx))+'%"></i><span>'+(days>7?(x.d.getDate()%5===1||days<=7?x.d.getDate():''):x.d.toLocaleDateString('tr-TR',{weekday:'short'}))+'</span></div>').join('')+'</div>'+
      (del.length?'<p class="fdMuted fdSmall" style="margin:6px 2px 0">En yoğun saat: <b>'+String(peak).padStart(2,'0')+':00–'+String((peak+1)%24).padStart(2,'0')+':00</b> · Ödeme: '+Object.entries(pay).map(([k,n])=>E(k)+' '+n).join(', ')+'</p>':'')+
      popH+
      (pfOn()?'<button type="button" class="fdwStrip" style="margin-top:14px" onclick="foodPromoRequest(\''+E(venueId)+'\')"><span class="i">📣</span><span class="t"><b>Öne çıkmak ister misin?</b><small>Ana sayfa, sponsorlu kart veya kampanya için reklam talebi gönder</small></span></button>':'')+
      '<p class="fdMuted fdSmall" style="margin:14px 2px 0">Tutarlar teslim edilen siparişlerden hesaplanır; kesin ödeme mutabakatı platform hakediş raporundadır.</p>');
  }catch(e){if(alive(tok))render(head()+errBox(e,'showFoodReports(\''+E(venueId)+'\','+days+')'))}
}
/* V4 · Reklam talebi: platformun destek kaydı üzerinden yönetime iletilir (yeni tablo gerektirmez) */
window.foodPromoRequest=function(venueId){
  const vn=(BZ.venue&&BZ.venue.id===venueId&&BZ.venue.name)||((BZ.venues||[]).find(x=>x.id===venueId)||{}).name||'Restoran';
  const OPTS=[['home_hero','Ana sayfa büyük slayt'],['home_feed','Sponsorlu restoran kartı'],['home_mid','Ana sayfa ara banner'],['venue_strip','Restoran sayfası kampanya şeridi']];
  const w=modal(sheetHead('Reklam talebi',vn)+'<div class="fdForm">'+
    '<label>Nerede görünmek istersin?</label><div class="fdwAlPick" id="prP">'+OPTS.map((o,i)=>'<button type="button" data-k="'+o[0]+'" aria-pressed="'+(i===1)+'" class="'+(i===1?'on':'')+'">'+E(o[1])+'</button>').join('')+'</div>'+
    '<div class="two"><div><label for="prS">Başlangıç</label><input id="prS" type="date"></div><div><label for="prD">Süre</label><select id="prD"><option>1 hafta</option><option>2 hafta</option><option>1 ay</option></select></div></div>'+
    '<label for="prM">Kampanya / mesajın</label><textarea id="prM" rows="3" maxlength="600" placeholder="Örn. Hafta sonu tüm pidelerde %15 indirim"></textarea>'+
    '<p class="fdMuted fdSmall" style="margin:8px 0 0">Talebin yönetime iletilir; fiyat ve uygunluk için seninle iletişime geçilir. Yayındaki reklamlar “Sponsorlu” etiketiyle gösterilir.</p>'+
    '<div class="fdErr" id="prE" hidden></div></div><div class="fdFoot"><button type="button" class="fb pri" style="flex:1" data-x="ok">Talebi gönder</button></div>',{sheet:true});
  bindClose(w);
  qa('#prP button',w).forEach(x=>x.onclick=()=>{const on=!x.classList.contains('on');x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
  w.querySelector('[data-x=ok]').onclick=async function(){
    const err=w.querySelector('#prE');const fail=m=>{err.hidden=false;err.textContent=m};err.hidden=true;
    const pl=qa('#prP button.on',w).map(x=>x.textContent);const msg=w.querySelector('#prM').value.trim();
    if(!pl.length)return fail('En az bir alan seç.');if(msg.length<5)return fail('Kampanya veya mesajını kısaca yaz.');
    const body='Restoran: '+vn+' ('+venueId+')\nAlanlar: '+pl.join(', ')+'\nBaşlangıç: '+(w.querySelector('#prS').value||'esnek')+' · Süre: '+w.querySelector('#prD').value+'\nMesaj: '+msg;
    await once('promoReq',this,async()=>{try{await RPC('pf_open_ticket',{p_kind:'support',p_module:'food',p_subject_type:'none',p_subject_id:null,p_title:('Reklam talebi · '+vn).slice(0,140),p_body:body});closeModal();toast('Reklam talebin yönetime iletildi. Destek taleplerinden izleyebilirsin.')}
      catch(e){fail(errMsg(e))}});
  };
};
/* V4 · Yoğunluk: hazırlık süresini tek dokunuşla değiştir (müşterinin gördüğü teslim süresi hemen güncellenir) */
function busyRow(v){const p=+v.prep_time_min||20;
  return '<button type="button" class="fdwBusy'+(p>=35?' hot':'')+'" onclick="foodBusySheet()"><span class="ic" aria-hidden="true">⏱</span><span class="tx"><small>Hazırlık süresi</small><b>'+p+' dk'+(p>=35?' · Yoğun':'')+'</b></span><span class="cta">'+(p>=35?'Değiştir':'Yoğunum')+'</span></button>'}
window.foodBusySheet=function(){
  const v=BZ.venue;if(!v)return;const cur=+v.prep_time_min||20;
  const w=modal(sheetHead('Hazırlık süresi','Yoğunsan süreyi artır; müşteriler sipariş verirken doğru teslim süresini görür.')+
    '<div class="fdwBusyOpts">'+[15,20,25,30,45,60].map(n=>'<button type="button" data-n="'+n+'" class="'+(n===cur?'on':'')+'"><b>'+n+'</b><span>dk'+(n>=35?' · yoğun':'')+'</span></button>').join('')+'</div>'+
    '<p class="fdMuted fdSmall" style="margin:10px 0 0">Mevcut siparişlerin süresi değişmez. Yoğunluk geçince tekrar düşürmeyi unutma.</p><div class="fdErr" id="fdBsE" hidden></div>',{sheet:true});
  bindClose(w);
  qa('.fdwBusyOpts button',w).forEach(b=>b.onclick=async()=>{const n=+b.dataset.n;if(n===cur){closeModal();return}
    qa('.fdwBusyOpts button',w).forEach(x=>x.disabled=true);
    try{await Q('PATCH','food_venues?id=eq.'+BZ.venueId,{prep_time_min:n});v.prep_time_min=n;closeModal();setHTML('fdBusy',busyRow(v));toast('Hazırlık süresi '+n+' dk olarak güncellendi')}
    catch(e){qa('.fdwBusyOpts button',w).forEach(x=>x.disabled=false);const x=w.querySelector('#fdBsE');x.hidden=false;x.textContent=errMsg(e)}});
};
window.foodToggleOpen=async function(inp){
  const open=inp.checked;inp.disabled=true;
  try{await Q('PATCH','food_venues?id=eq.'+BZ.venueId,{is_open:open});toast(open?'Restoran sipariş almaya başladı':'Restoran sipariş almayı durdurdu');showFoodBusiness(BZ.venueId)}
  catch(e){inp.checked=!open;inp.disabled=false;toast(errMsg(e),'err')}
};
/* G1 · Mutfak seçici (katalog, en fazla 5; eski serbest etiketler korunur) */
function cuisinePicker(id,current){
  const sel=venueCats({cuisine_type:current||''});const extra=sel.filter(x=>!CUISINES.some(c=>c[0]===x));
  return '<input type="hidden" id="'+id+'" value="'+E(sel.join(', '))+'"><div class="fdCatPick" data-for="'+id+'">'+
    CUISINES.map(c=>'<button type="button" class="fdChip'+(sel.includes(c[0])?' on':'')+'" data-c="'+E(c[0])+'" onclick="foodCuisPick(this)">'+c[1]+' '+E(c[0])+'</button>').join('')+
    extra.map(x=>'<button type="button" class="fdChip on" data-c="'+E(x)+'" onclick="foodCuisPick(this)">'+E(x)+' ✕</button>').join('')+'</div><div class="hint">En fazla 5 mutfak seç. Müşteriler seni bu kategorilerde bulur.</div>';
}
window.foodCuisPick=function(b){const box=b.parentNode;const on=!b.classList.contains('on');
  if(on&&qa('.fdChip.on',box).length>=5){toast('En fazla 5 mutfak seçebilirsin.','warn');return}
  b.classList.toggle('on',on);if(!on&&/✕$/.test(b.textContent))b.remove();
  document.getElementById(box.dataset.for).value=qa('.fdChip.on',box).map(x=>x.dataset.c).join(', ')};
window.foodNewVenue=function(){newScreen();FDW_PANEL=1;venueCreateForm(true)};
function venueCreateForm(extra){
  const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  render(bar(extra?'Yeni işletme':'İşletmeni ekle','showFoodHome()')+(extra?'':roleBar('business'))+
    (extra?'':'<div class="fdTrackHero" style="text-align:center"><div style="font-size:40px">🏪</div><h2 style="margin-top:6px">Restoranını İşimi Çöz\'e taşı</h2><p>Birkaç dakikada kaydol, menünü ekle ve sipariş almaya başla.</p></div>')+
    '<div class="fdCard fdForm">'+
    '<label for="nvName">İşletme adı</label><input id="nvName" maxlength="80" autocomplete="organization">'+
    '<div class="two"><div><label for="nvDist">İlçe</label><select id="nvDist"><option value="">Seç</option>'+ds.map(d=>'<option>'+E(d)+'</option>').join('')+'</select></div><div><label for="nvPhone">Telefon</label><input id="nvPhone" type="tel" inputmode="tel"></div></div>'+
    '<label for="nvAddr">Açık adres</label><input id="nvAddr" maxlength="200">'+
    '<label>Mutfak</label>'+cuisinePicker('nvCui','')+
    '<label for="nvMode">Sipariş türü</label><select id="nvMode"><option value="both">Teslimat + Gel-al</option><option value="self_delivery">Yalnızca teslimat</option><option value="pickup">Yalnızca gel-al</option></select>'+
    '<div class="fdErr" id="nvErr" hidden></div><button type="button" class="fb pri block" style="margin-top:16px" onclick="foodCreateVenue(this)">İşletmeyi oluştur</button>'+
    '<p class="fdMuted fdSmall fdCenter" style="margin-top:10px">İşletmen kapalı başlar; menünü ekleyip hazır olduğunda açarsın.</p></div>');
}
window.foodCreateVenue=async function(btn){
  const g=id=>document.getElementById(id).value.trim();const err=document.getElementById('nvErr');const fail=m=>{err.hidden=false;err.textContent=m};
  const body={owner_user_id:UID(),name:g('nvName'),district:g('nvDist'),phone:g('nvPhone'),address_text:g('nvAddr'),cuisine_type:g('nvCui'),delivery_mode:g('nvMode'),city:'İzmir',is_active:true,is_open:false};
  if(body.name.length<2)return fail('İşletme adını yaz.');if(!body.district)return fail('İlçe seç.');if(!body.cuisine_type)return fail('En az bir mutfak seç.');if(body.phone.replace(/\D/g,'').length<10)return fail('Geçerli bir telefon yaz.');
  await once('createVenue',btn,async()=>{try{const r=await Q('POST','food_venues',body);WHO=null;localStorage.setItem(VENUE_KEY,r[0].id);toast('İşletmen oluşturuldu');showFoodSettings(r[0].id,true)}catch(e){fail(errMsg(e))}});
};

/* ====================== F6 · Ayarlar (bölümlü) ====================== */
async function showFoodSettings(venueId,firstRun){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  if(pfOn()){let n=0;const iv=setInterval(()=>{const el=document.querySelector('[data-pf-onb]');if(el&&!el.dataset.pfDone){el.dataset.pfDone='1';clearInterval(iv);PF.venueOnboardingCard(venueId,el)}else if(++n>60)clearInterval(iv)},150)}
  render(bar('Ayarlar','showFoodBusiness(\''+E(venueId)+'\')')+skel('row',4));
  let v;try{await bizContext(venueId);v=(await Q('GET','food_venues?select=*&id=eq.'+encodeURIComponent(venueId)))[0]}catch(e){return render(bar('Ayarlar','showFoodBusiness()')+errBox(e,'showFoodSettings(\''+E(venueId)+'\')'))}
  if(!alive(tok)||!v)return;
  const wh=v.working_hours||{};const hasHours=Object.keys(wh).length>0;const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  const opt=(val,cur,l)=>'<option value="'+val+'"'+(val===cur?' selected':'')+'>'+l+'</option>';
  render(bar('Ayarlar','showFoodBusiness(\''+E(venueId)+'\')',null,v.name)+roleBar('business')+subnav(venueId,'settings')+
    (pfOn()?'<div data-pf-onb></div>':'')+
    (firstRun?'<div class="fdNote ok">👋 Hoş geldin! Önce temel bilgileri ve görselleri tamamla, sonra Menü sekmesinden ürünlerini ekle.</div>':'')+
    '<div class="fdForm">'+
    '<details class="fdDet"'+(firstRun?' open':'')+'><summary>🏪 Genel bilgiler</summary><div>'+
      '<label for="sName">İşletme adı</label><input id="sName" maxlength="80" value="'+E(v.name)+'">'+
      '<label for="sDesc">Kısa açıklama</label><textarea id="sDesc" rows="2" maxlength="300" placeholder="Örn. 1985\'ten beri odun ateşinde pide">'+E(v.description||'')+'</textarea>'+
      '<div class="two"><div><label for="sDist">İlçe</label><select id="sDist">'+(ds.includes(v.district)?'':'<option>'+E(v.district||'')+'</option>')+ds.map(d=>'<option'+(d===v.district?' selected':'')+'>'+E(d)+'</option>').join('')+'</select></div><div><label for="sPhone">Telefon</label><input id="sPhone" type="tel" value="'+E(v.phone||'')+'"></div></div>'+
      '<label for="sAddr">Açık adres</label><input id="sAddr" maxlength="200" value="'+E(v.address_text||'')+'">'+
      '<label>Mutfak</label>'+cuisinePicker('sCui',v.cuisine_type)+
    '</div></details>'+
    '<details class="fdDet"'+(firstRun||!v.cover_url?' open':'')+'><summary>🖼️ Görseller</summary><div>'+
      '<p class="fdMuted fdSmall">Kapak restoran kartında ve sayfanın üstünde görünür. Yatay (16:9), ışıklı ve yemeğin net göründüğü bir fotoğraf seç. Fotoğraflar yüklemeden önce otomatik küçültülür.</p>'+
      '<label>Kapak fotoğrafı</label><div class="fdUp"><span id="upCover">'+pic(v.cover_url||'',v.name,'cover')+'</span><label class="fb sm">'+(v.cover_url?'Değiştir':'Yükle')+'<input type="file" accept="image/jpeg,image/png,image/webp" onchange="foodVenueImg(this,\'cover_url\',\''+E(venueId)+'\')"></label></div>'+
      '<label>Logo</label><div class="fdUp"><span id="upLogo">'+pic(v.image_url||'',v.name,'fdLogo')+'</span><label class="fb sm">'+(v.image_url?'Değiştir':'Yükle')+'<input type="file" accept="image/jpeg,image/png,image/webp" onchange="foodVenueImg(this,\'image_url\',\''+E(venueId)+'\')"></label></div>'+
    '</div></details>'+
    '<details class="fdDet"><summary>🛵 Sipariş ve teslimat</summary><div>'+
      '<label for="sMode">Sipariş türü</label><select id="sMode">'+opt('both',v.delivery_mode,'Teslimat + Gel-al')+opt('self_delivery',v.delivery_mode,'Yalnızca teslimat')+opt('pickup',v.delivery_mode,'Yalnızca gel-al')+'</select>'+
      '<label for="sProv">Teslimatı kim yapar?</label><select id="sProv">'+opt('venue',v.delivery_provider,'Kendi kuryemiz')+opt('platform',v.delivery_provider,'Platform kuryeleri')+'</select>'+
      '<div class="two"><div><label for="sMin">Min. sepet (TL)</label><input id="sMin" inputmode="decimal" value="'+kurusToTl(v.min_order_amount)+'"></div><div><label for="sFee">Teslimat ücreti (TL)</label><input id="sFee" inputmode="decimal" value="'+kurusToTl(v.delivery_fee_kurus)+'"></div></div>'+
      '<div class="two"><div><label for="sPrep">Hazırlık (dk)</label><input id="sPrep" type="number" min="1" max="240" value="'+v.prep_time_min+'"></div><div><label for="sEta">Yol süresi (dk)</label><input id="sEta" type="number" min="1" max="240" value="'+v.delivery_eta_min+'"></div></div>'+
      '<div class="fdNote info" style="margin-top:12px">Platform komisyonu <b>%'+(v.commission_bps/100).toFixed(2).replace('.',',')+'</b> · hizmet bedeli <b>'+M(v.platform_fee_kurus)+'</b> <span class="fdMuted">(platform yönetimi belirler)</span></div>'+
    '</div></details>'+
    '<details class="fdDet"><summary>📍 Teslimat bölgesi</summary><div>'+
      '<p class="fdMuted fdSmall">Konum ve yarıçap girersen, bölge dışındaki adreslere sipariş verilemez. Mesafe kuş uçuşu hesaplanır.</p>'+
      '<div class="two"><div><label for="sLat">Enlem</label><input id="sLat" inputmode="decimal" value="'+(v.lat??'')+'"></div><div><label for="sLng">Boylam</label><input id="sLng" inputmode="decimal" value="'+(v.lng??'')+'"></div></div>'+
      '<div class="two"><div><label for="sRad">Yarıçap (km)</label><input id="sRad" inputmode="decimal" value="'+(v.delivery_radius_km??'')+'" placeholder="Boş = sınırsız"></div><div><label>&nbsp;</label><button type="button" class="fb block" onclick="foodVenueGeo(this)">📍 Konumum</button></div></div>'+
    '</div></details>'+
    '<details class="fdDet"><summary>🕐 Çalışma saatleri</summary><div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="fdSmall" style="font-weight:700">Saatleri uygula</span>'+sw('sHasH',hasHours,"document.getElementById('sHours').hidden=!this.checked")+'</div>'+
      '<p class="fdMuted fdSmall">Kapalıyken yalnızca panel anahtarı geçerlidir. Gece yarısını geçen saatler desteklenir (ör. 18:00 – 02:00).</p>'+
      '<div class="fdHours" id="sHours"'+(hasHours?'':' hidden')+'>'+DAYS.map(([k,l])=>{const r=(wh[k]||[])[0];return '<div><span>'+l+'</span>'+sw('d_'+k,!!r||!hasHours,'')+'<input type="time" data-o="'+k+'" value="'+(r?r[0]:'10:00')+'" aria-label="'+l+' açılış"><input type="time" data-c="'+k+'" value="'+(r?(r[1]==='24:00'?'23:59':r[1]):'22:00')+'" aria-label="'+l+' kapanış"></div>'}).join('')+
      '<button type="button" class="fdLink" onclick="foodCopyMon()">Pazartesi saatlerini tüm günlere uygula</button></div>'+
    '</div></details></div>'+
    '<div class="fdRows" style="margin-top:4px">'+row('⚠️','Müşteri bildirimleri','Sorun bildirimleri','showFoodVenueIssues(\''+E(venueId)+'\')')+(BZ.role==='owner'?row('👥','Ekip','Yönetici ve personel','showFoodTeam(\''+E(venueId)+'\')'):'')+'</div>'+
    '<div class="fdErr" id="sErr" hidden></div><div class="fdSticky"><div class="fdCta"><button type="button" class="fb pri" onclick="foodSaveSettings(this,\''+E(venueId)+'\')">Değişiklikleri kaydet</button></div></div>');
}
window.foodCopyMon=function(){const o=document.querySelector('[data-o=mon]').value,c=document.querySelector('[data-c=mon]').value;DAYS.forEach(([k])=>{document.querySelector('[data-o='+k+']').value=o;document.querySelector('[data-c='+k+']').value=c;document.getElementById('d_'+k).checked=true});toast('Tüm günlere uygulandı')};
window.foodVenueGeo=function(btn){if(!navigator.geolocation)return toast('Konum desteklenmiyor.','warn');btn.disabled=true;navigator.geolocation.getCurrentPosition(p=>{document.getElementById('sLat').value=p.coords.latitude.toFixed(6);document.getElementById('sLng').value=p.coords.longitude.toFixed(6);btn.disabled=false;toast('Konum eklendi, kaydetmeyi unutma')},()=>{btn.disabled=false;toast('Konum alınamadı.','warn')},{timeout:10000})};
/* Görsel yükle: yalnızca o alanı kaydeder, formdaki diğer değişiklikleri silmez */
window.foodVenueImg=async function(inp,field,venueId){
  const f=inp.files&&inp.files[0];if(!f)return;const lab=inp.parentNode;const old=lab.firstChild.textContent;
  lab.classList.add('fdBusy');lab.firstChild.textContent='Yükleniyor…';inp.disabled=true;
  try{const url=await uploadFoodImage(venueId,f,field==='cover_url'?1600:600);const b={};b[field]=url;await Q('PATCH','food_venues?id=eq.'+venueId,b);
    setHTML(field==='cover_url'?'upCover':'upLogo',pic(url,'',field==='cover_url'?'cover':'fdLogo'));lab.firstChild.textContent='Değiştir';toast('Görsel güncellendi')}
  catch(e){lab.firstChild.textContent=old;toast(errMsg(e),'err')}finally{inp.disabled=false;inp.value='';lab.classList.remove('fdBusy')}
};
window.foodSaveSettings=async function(btn,venueId){
  const g=id=>document.getElementById(id).value.trim();const err=document.getElementById('sErr');err.hidden=true;
  const fail=(m,sec)=>{err.hidden=false;err.textContent=m;toast(m,'err');if(sec){const d=document.getElementById(sec);if(d){const det=d.closest('details');if(det)det.open=true;d.focus();d.scrollIntoView({block:'center'})}}};
  const min=tlToKurus(g('sMin')||'0'),fee=tlToKurus(g('sFee')||'0'),prep=+g('sPrep'),eta=+g('sEta');
  if(!(g('sName').length>=2))return fail('İşletme adını yaz.','sName');
  if(isNaN(min))return fail('Min. sepet tutarını doğru gir (ör. 150 veya 150,50).','sMin');
  if(isNaN(fee))return fail('Teslimat ücretini doğru gir.','sFee');
  if(!(prep>=1&&prep<=240))return fail('Hazırlık süresi 1-240 dk olmalı.','sPrep');
  if(!(eta>=1&&eta<=240))return fail('Yol süresi 1-240 dk olmalı.','sEta');
  const num=x=>x===''?null:+x.replace(',','.');const lat=num(g('sLat')),lng=num(g('sLng')),rad=num(g('sRad'));
  if((lat===null)!==(lng===null)||(lat!==null&&(isNaN(lat)||isNaN(lng))))return fail('Konum için enlem ve boylamı birlikte, doğru gir.','sLat');
  if(rad!==null&&!(rad>0))return fail('Yarıçap 0\'dan büyük olmalı.','sRad');
  if(rad!==null&&lat===null)return fail('Teslimat yarıçapı için restoran konumu gerekli.','sLat');
  let wh={};
  if(document.getElementById('sHasH').checked){
    for(const[k,l]of DAYS){if(!document.getElementById('d_'+k).checked)continue;const o=document.querySelector('[data-o='+k+']').value,c=document.querySelector('[data-c='+k+']').value;
      if(!o||!c||o===c)return fail(l+' için açılış ve kapanış saatini kontrol et.','sHasH');wh[k]=[[o,c==='23:59'?'24:00':c]]}
    if(!Object.keys(wh).length)return fail('En az bir gün açık olmalı ya da saat uygulamasını kapat.','sHasH');
  }
  const body={name:g('sName'),description:g('sDesc')||null,district:g('sDist'),phone:g('sPhone'),address_text:g('sAddr'),cuisine_type:g('sCui'),delivery_mode:g('sMode'),delivery_provider:g('sProv'),
    min_order_amount:min,delivery_fee_kurus:fee,prep_time_min:prep,delivery_eta_min:eta,lat,lng,delivery_radius_km:rad,working_hours:wh};
  await once('saveSettings',btn,async()=>{try{await Q('PATCH','food_venues?id=eq.'+venueId,body);WHO=null;toast('Ayarlar kaydedildi');showFoodBusiness(venueId)}catch(e){fail(errMsg(e))}});
};

/* ====================== F6 · Menü yönetimi ====================== */
const MN={venueId:null,cats:[],items:[],groups:{}};
async function showFoodMenu(venueId){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;MN.venueId=venueId;
  if(!document.getElementById('fdMenuRoot'))render(bar('Menü','showFoodBusiness(\''+E(venueId)+'\')')+skel('row',4));
  try{
    const enc=encodeURIComponent(venueId);
    const [,cats,items,groups]=await Promise.all([bizContext(venueId),
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order,metadata&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,is_active,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&order=sort_order.asc')]);
    if(!alive(tok))return;
    MN.cats=cats;MN.items=items;MN.groups={};groups.forEach(g=>{g.food_item_options.sort((a,b)=>a.sort_order-b.sort_order);(MN.groups[g.menu_item_id]=MN.groups[g.menu_item_id]||[]).push(g)});
    const secs=cats.map(c=>({c,items:items.filter(i=>i.category_id===c.id)}));const other=items.filter(i=>!i.category_id||!cats.some(c=>c.id===i.category_id));
    const noImg=items.filter(i=>!i.image_url).length;
    patchOrRender('<div id="fdMenuRoot"></div>'+bar('Menü','showFoodBusiness(\''+E(venueId)+'\')',null,items.length+' ürün')+roleBar('business')+subnav(venueId,'menu')+
      '<div class="fdRow2" style="margin:0 0 12px"><button type="button" class="fb pri" onclick="foodItemEdit(null)">+ Ürün ekle</button><button type="button" class="fb" onclick="foodCatAdd(this)">+ Kategori</button></div>'+
      (noImg&&items.length?'<div class="fdNote warn">📷 '+noImg+' üründe fotoğraf yok. Fotoğraflı ürünler çok daha fazla sipariş alır.</div>':'')+
      (cats.length?'<div class="fdChips wrap" style="margin-top:8px">'+cats.map(c=>'<button type="button" class="fdChip'+(c.is_active?' on':'')+'" onclick="foodCatToggle(\''+E(c.id)+'\','+(!c.is_active)+',this)">'+(c.is_active?'':'🚫 ')+E(c.name)+'</button>').join('')+'</div><p class="fdMuted fdSmall" style="margin:0">Kategoriye dokunarak müşteriden gizleyebilir / gösterebilirsin.</p>':'<p class="fdMuted fdSmall">İpucu: Kategori eklersen müşteriler menünde kolay gezinir (Çorbalar, Pideler, İçecekler…).</p>')+
      (items.length?secs.concat(other.length?[{c:{id:'',name:cats.length?'Kategorisiz':'Ürünler'},items:other}]:[]).filter(s=>s.items.length||s.c.id).map(s=>'<h2>'+E(s.c.name)+' <span class="fdMuted fdSmall">'+s.items.length+'</span></h2>'+(s.items.length?'<div class="fdList">'+s.items.map(menuRow).join('')+'</div>':'<p class="fdMuted fdSmall">Bu kategoride ürün yok.</p>')).join(''):
        empty('📋','Menün boş','İlk ürününü ekle; fotoğraf, fiyat ve açıklama gir.','<button type="button" class="fb pri" onclick="foodItemEdit(null)">+ İlk ürünü ekle</button>')));
  }catch(e){if(alive(tok))render(bar('Menü','showFoodBusiness(\''+E(venueId)+'\')')+errBox(e,'showFoodMenu(\''+E(venueId)+'\')'))}
}
function patchOrRender(h){if(document.getElementById('fdRoot'))patch(h);else render(h)}
function menuRow(i){
  const gs=MN.groups[i.id]||[];
  return '<div class="fdProd" onclick="foodItemEdit(\''+E(i.id)+'\')">'+
    (i.image_url?'<div class="im" style="width:64px;flex-basis:64px">'+pic(i.image_url,i.name,'sq')+'</div>':'<div class="im" style="width:64px;flex-basis:64px"><span class="fdPic sq" style="border-radius:14px;border:1.5px dashed var(--line);display:grid;place-items:center;font-size:12px;color:var(--muted);font-weight:700;text-align:center">📷<br>Ekle</span></div>')+
    '<div class="tx"><b>'+E(i.name)+'</b><div class="pr" style="margin-top:4px">'+M(i.price_kurus)+(gs.length?' <span class="fdMuted fdSmall" style="font-weight:600">· '+gs.length+' seçenek grubu</span>':'')+'</div>'+
    '<div class="fdSmall '+(i.is_available?'fdOk':'fdBad')+'" style="font-weight:700;margin-top:4px">'+(i.is_available?'Satışta':'Tükendi')+'</div></div>'+
    '<div onclick="event.stopPropagation()" style="align-self:center">'+sw('av_'+E(i.id),i.is_available,'foodItemAvail(\''+E(i.id)+'\',this)')+'</div></div>';
}
window.foodCatAdd=async function(btn){const n=await promptBox('Yeni kategori','Örn. Çorbalar',{required:true,okLabel:'Ekle',chips:['Çorbalar','Pideler','Kebaplar','Tatlılar','İçecekler']});if(!n)return;
  await once('catAdd',btn,async()=>{try{await Q('POST','food_menu_categories',{venue_id:MN.venueId,name:n.slice(0,60),sort_order:MN.cats.length+1,is_active:true});toast('Kategori eklendi');showFoodMenu(MN.venueId)}catch(e){toast(errMsg(e),'err')}})};
window.foodCatToggle=async function(id,on,btn){await once('cat'+id,btn,async()=>{try{await Q('PATCH','food_menu_categories?id=eq.'+id,{is_active:on});toast(on?'Kategori gösteriliyor':'Kategori gizlendi');showFoodMenu(MN.venueId)}catch(e){toast(errMsg(e),'err')}})};
window.foodItemAvail=async function(id,inp){const on=inp.checked;inp.disabled=true;try{await Q('PATCH','food_menu_items?id=eq.'+id,{is_available:on});toast(on?'Ürün satışta':'Ürün tükendi olarak işaretlendi');showFoodMenu(MN.venueId)}catch(e){inp.checked=!on;inp.disabled=false;toast(errMsg(e),'err')}};
window.foodItemEdit=function(id){
  const i=id?MN.items.find(x=>x.id===id):{name:'',description:'',price_kurus:0,category_id:(MN.cats[0]||{}).id||'',is_available:true,image_url:null};if(!i)return;
  const gs=id?(MN.groups[id]||[]):[];let newFile=null,removeImg=false;
  const w=modal(sheetHead(id?'Ürünü düzenle':'Yeni ürün')+'<div class="fdForm">'+
    '<div class="fdUp" style="margin-bottom:4px"><span id="ieP">'+pic(i.image_url||'',i.name||'Ürün','sq')+'</span><div style="display:grid;gap:6px"><label class="fb sm">📷 '+(i.image_url?'Fotoğrafı değiştir':'Fotoğraf ekle')+'<input id="ieI" type="file" accept="image/jpeg,image/png,image/webp"></label>'+(i.image_url?'<button type="button" class="fb ghostBad sm" id="ieR">Fotoğrafı kaldır</button>':'')+'<span class="fdMuted" style="font-size:11.5px">Kare, ışıklı, ürünü yakından gösteren fotoğraf.</span></div></div>'+
    '<label for="ieN">Ürün adı</label><input id="ieN" maxlength="80" value="'+E(i.name)+'">'+
    '<label for="ieD">Açıklama</label><textarea id="ieD" rows="2" maxlength="300" placeholder="İçindekiler, porsiyon, gramaj">'+E(i.description||'')+'</textarea>'+
    '<div class="two"><div><label for="ieF">Fiyat (TL)</label><input id="ieF" inputmode="decimal" value="'+(id?kurusToTl(i.price_kurus):'')+'" placeholder="0"></div><div><label for="ieC">Kategori</label><select id="ieC"><option value="">Kategorisiz</option>'+MN.cats.map(c=>'<option value="'+E(c.id)+'"'+(c.id===i.category_id?' selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></div></div>'+
    '<label>Alerjenler <span class="fdMuted" style="font-weight:600">(içerenleri seç)</span></label><div class="fdwAlPick" id="ieA">'+ALLERGENS.map(x=>'<button type="button" aria-pressed="'+allergens(i).includes(x)+'" class="'+(allergens(i).includes(x)?'on':'')+'">'+E(x)+'</button>').join('')+'</div>'+
    (id?'<button type="button" class="fdRowBtn" style="margin-top:14px" id="ieO"><span class="ic">⚙️</span><span class="tx"><small>Seçenekler</small><b>'+(gs.length?gs.map(g=>E(g.name)).join(', '):'Porsiyon, ekstra, çıkarılacak malzeme')+'</b></span><span class="ch">›</span></button>':'<p class="fdMuted fdSmall" style="margin-top:10px">Seçenekleri (porsiyon, ekstra) ürünü kaydettikten sonra ekleyebilirsin.</p>')+
    '<div class="fdErr" id="ieE" hidden></div></div><div class="fdFoot"><button type="button" class="fb pri" style="flex:1" data-x="ok">Kaydet</button></div>',{sheet:true,full:true});
  bindClose(w);
  w.querySelector('#ieI').onchange=function(){const f=this.files&&this.files[0];if(!f)return;newFile=f;removeImg=false;setHTML('ieP','<span class="fdPic sq"><img src="'+URL.createObjectURL(f)+'" alt=""></span>')};
  const rb=w.querySelector('#ieR');if(rb)rb.onclick=()=>{removeImg=true;newFile=null;setHTML('ieP',pic('',i.name,'sq'));rb.remove()};
  const ob=w.querySelector('#ieO');if(ob)ob.onclick=()=>{closeModal();foodOptions(id)};
  qa('#ieA button',w).forEach(x=>x.onclick=()=>{const on=!x.classList.contains('on');x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
  w.querySelector('[data-x=ok]').onclick=async function(){
    const err=w.querySelector('#ieE');const fail=m=>{err.hidden=false;err.textContent=m;err.scrollIntoView({block:'center'})};
    const name=w.querySelector('#ieN').value.trim();const price=tlToKurus(w.querySelector('#ieF').value);
    if(name.length<2)return fail('Ürün adını yaz.');if(isNaN(price)||price<=0)return fail('Geçerli bir fiyat gir.');
    const body={name,description:w.querySelector('#ieD').value.trim()||null,price_kurus:price,category_id:w.querySelector('#ieC').value||null};
    const al=qa('#ieA button.on',w).map(x=>x.textContent);const md=Object.assign({},(i.metadata&&typeof i.metadata==='object')?i.metadata:{});
    if(al.length)md.allergens=al;else delete md.allergens;
    if(JSON.stringify(md)!==JSON.stringify((i.metadata&&typeof i.metadata==='object')?i.metadata:{}))body.metadata=md;
    await once('itemSave',this,async()=>{
      try{
        if(newFile)body.image_url=await uploadFoodImage(MN.venueId,newFile,900);else if(removeImg)body.image_url=null;
        if(id)await Q('PATCH','food_menu_items?id=eq.'+id,body);else await Q('POST','food_menu_items',Object.assign({venue_id:MN.venueId,is_available:true,sort_order:MN.items.length+1},body));
        closeModal();toast('Ürün kaydedildi');showFoodMenu(MN.venueId);
      }catch(e){fail(errMsg(e))}
    });
  };
};
window.foodOptions=function(itemId){
  const i=MN.items.find(x=>x.id===itemId);if(!i)return;const gs=MN.groups[itemId]||[];
  const w=modal(sheetHead('Seçenekler',i.name)+
    '<p class="fdMuted fdSmall">Porsiyon, ekstra veya çıkarılacak malzeme grupları ekle. Kurallar siparişte sunucuda doğrulanır.</p>'+
    gs.map(g=>'<div class="fdCard" style="margin:10px 0;padding:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>'+E(g.name)+(g.is_active?'':' <span class="fdPill">gizli</span>')+'</b><div class="fdMuted fdSmall">'+E({single:'Tek seçim',multi:'Çoklu seçim',remove:'Çıkarılacak'}[g.kind])+' · '+(g.is_required?'zorunlu':'isteğe bağlı')+' · '+g.min_select+'-'+g.max_select+'</div></div>'+
      '<button type="button" class="fb sm" data-gm="'+E(g.id)+'" data-v="'+(!g.is_active)+'">⋯</button></div>'+
      g.food_item_options.map(o=>'<div class="fdOpt'+(o.is_available?'':' na')+'" style="cursor:default"><span class="tx">'+E(o.name)+(+o.price_delta_kurus?' <span class="fdMuted">+'+M(o.price_delta_kurus)+'</span>':'')+'</span><button type="button" class="fb sm" data-oa="'+E(o.id)+'" data-v="'+(!o.is_available)+'">'+(o.is_available?'Tükendi':'Aç')+'</button><button type="button" class="fb ghostBad sm" data-od="'+E(o.id)+'" aria-label="Sil">🗑</button></div>').join('')+
      '<div class="fdForm" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:6px;margin-top:8px"><input placeholder="Seçenek adı" data-on="'+E(g.id)+'"><input placeholder="+TL" inputmode="decimal" data-op="'+E(g.id)+'"'+(g.kind==='remove'?' disabled':'')+'><button type="button" class="fb sm pri" data-oadd="'+E(g.id)+'">Ekle</button></div></div>').join('')+
    '<details class="fdDet"'+(gs.length?'':' open')+'><summary>+ Yeni grup ekle</summary><div class="fdForm"><label for="ngN">Grup adı</label><input id="ngN" placeholder="Porsiyon, Ekstralar, İstemediklerin">'+
      '<label for="ngK">Tür</label><select id="ngK"><option value="single">Tek seçim (ör. porsiyon)</option><option value="multi">Çoklu seçim (ör. ekstralar)</option><option value="remove">Çıkarılacak malzeme</option></select>'+
      '<div class="two"><div><label for="ngMin">En az</label><input id="ngMin" type="number" min="0" value="0"></div><div><label for="ngMax">En fazla</label><input id="ngMax" type="number" min="1" value="1"></div></div>'+
      '<div style="margin-top:12px">'+sw('ngR',false,'','Zorunlu seçim')+'</div>'+
      '<button type="button" class="fb pri block" style="margin-top:12px" data-x="ok">Grubu ekle</button></div></details>'+
    '<div class="fdErr" id="ogE" hidden></div>',{sheet:true,full:true,onClose:()=>showFoodMenu(MN.venueId)});
  bindClose(w,()=>showFoodMenu(MN.venueId));
  const err=w.querySelector('#ogE');const fail=e=>{err.hidden=false;err.textContent=errMsg(e);err.scrollIntoView({block:'center'})};
  const reopen=async()=>{await showFoodMenu(MN.venueId);foodOptions(itemId)};
  w.querySelector('[data-x=ok]').onclick=async function(){
    const name=w.querySelector('#ngN').value.trim(),kind=w.querySelector('#ngK').value,req=w.querySelector('#ngR').checked;let mn=+w.querySelector('#ngMin').value||0,mx=+w.querySelector('#ngMax').value||1;
    if(!name)return fail(new Error('Grup adını yaz.'));if(kind==='single')mx=1;if(req&&mn<1)mn=1;if(mn>mx)return fail(new Error('"En az" değeri "en fazla"dan büyük olamaz.'));
    await once('grpAdd',this,async()=>{try{await Q('POST','food_item_option_groups',{venue_id:MN.venueId,menu_item_id:itemId,name,kind,min_select:mn,max_select:mx,is_required:req,sort_order:gs.length+1});closeModal();reopen()}catch(e){fail(e)}});
  };
  qa('[data-oadd]',w).forEach(b=>b.onclick=async()=>{const gid=b.dataset.oadd;const n=w.querySelector('[data-on="'+gid+'"]').value.trim();const p=tlToKurus(w.querySelector('[data-op="'+gid+'"]').value||'0');
    if(!n)return fail(new Error('Seçenek adını yaz.'));if(isNaN(p))return fail(new Error('Fiyat farkını doğru gir.'));
    await once('optAdd',b,async()=>{try{await Q('POST','food_item_options',{group_id:gid,venue_id:MN.venueId,name:n,price_delta_kurus:p,sort_order:99});closeModal();reopen()}catch(e){fail(e)}})});
  qa('[data-oa]',w).forEach(b=>b.onclick=async()=>{await once('oa',b,async()=>{try{await Q('PATCH','food_item_options?id=eq.'+b.dataset.oa,{is_available:b.dataset.v==='true'});closeModal();reopen()}catch(e){fail(e)}})});
  qa('[data-od]',w).forEach(b=>b.onclick=async()=>{await once('od',b,async()=>{try{await Q('DELETE','food_item_options?id=eq.'+b.dataset.od);closeModal();reopen()}catch(e){fail(e)}})});
  qa('[data-gm]',w).forEach(b=>b.onclick=()=>{const gid=b.dataset.gm,vis=b.dataset.v==='true';
    const m=modal(sheetHead('Grup işlemleri')+'<div class="fdRows"><button type="button" class="fb block" data-a="vis">'+(vis?'Grubu göster':'Grubu gizle')+'</button><button type="button" class="fb block ghostBad" style="border:1px solid var(--line)" data-a="del">Grubu sil</button></div>',{sheet:true,onClose:reopen});
    bindClose(m,reopen);
    m.querySelector('[data-a=vis]').onclick=async()=>{closeModal();try{await Q('PATCH','food_item_option_groups?id=eq.'+gid,{is_active:vis})}catch(e){toast(errMsg(e),'err')}reopen()};
    m.querySelector('[data-a=del]').onclick=async()=>{closeModal();if(await confirmBox('Grup silinsin mi?','Gruptaki tüm seçenekler silinir. Geçmiş siparişler etkilenmez.','Sil',true)){try{await Q('DELETE','food_item_option_groups?id=eq.'+gid)}catch(e){toast(errMsg(e),'err')}}reopen()};
  });
};

/* ====================== Sorunlar ====================== */
async function showFoodVenueIssues(venueId){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Müşteri bildirimleri','showFoodBusiness(\''+E(venueId)+'\')')+'<div id="fdIList">'+skel('row',2)+'</div>');
  try{const r=await RPC('food_venue_issues',{p_venue_id:venueId});if(!alive(tok))return;
    const st={open:['Açık','bad'],in_review:['İnceleniyor','acc'],resolved:['Çözüldü','ok'],rejected:['Reddedildi','mute']};
    setHTML('fdIList',r.length?r.map(x=>'<div class="fdCard" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+E(ISSUE[x.type]||x.type)+'</b><span class="fdBadge '+(st[x.status]||['',''])[1]+'">'+E((st[x.status]||[x.status])[0])+'</span></div>'+
      '<div class="fdMuted fdSmall">Sipariş #'+E(x.order_no)+' · '+ago(x.created_at)+'</div>'+(x.description?'<p style="margin-top:8px">'+E(x.description)+'</p>':'')+(x.resolution?'<div class="fdNote info">↳ '+E(x.resolution)+'</div>':'')+
      (['open','in_review'].includes(x.status)?'<div class="fdRow2">'+(x.status==='open'?'<button type="button" class="fb" onclick="foodIssueSet(\''+E(x.id)+'\',\'in_review\',this,\''+E(venueId)+'\')">İnceliyorum</button>':'<button type="button" class="fb ghostBad" onclick="foodIssueSet(\''+E(x.id)+'\',\'rejected\',this,\''+E(venueId)+'\')">Reddet</button>')+
        '<button type="button" class="fb pri" onclick="foodIssueSet(\''+E(x.id)+'\',\'resolved\',this,\''+E(venueId)+'\')">Çözüldü</button></div>':'')+'</div>').join(''):empty('✅','Açık bildirim yok','Müşterilerin bir sorun bildirirse burada görürsün.'))}
  catch(e){setHTML('fdIList',errBox(e))}
}
window.foodIssueSet=async function(id,st,btn,venueId){
  let res=null;if(st!=='in_review'){res=await promptBox(st==='resolved'?'Nasıl çözüldü?':'Neden reddedildi?','Müşteriye iletilecek açıklama',{required:true,okLabel:'Kaydet',chips:st==='resolved'?['Eksik ürün tekrar gönderildi','Ücret iadesi yapıldı','Özür dileriz, bir sonraki siparişte telafi edeceğiz']:[]});if(!res)return}
  await once('is'+id,btn,async()=>{try{await RPC('food_update_issue',{p_issue_id:id,p_status:st,p_resolution:res});toast('Kaydedildi');showFoodVenueIssues(venueId)}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== Ekip ====================== */
async function showFoodTeam(venueId){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Ekip','showFoodSettings(\''+E(venueId)+'\')')+'<div id="fdTm">'+skel('row',1)+'</div>');
  try{const r=await Q('GET','food_venue_members?select=user_id,role,created_at&venue_id=eq.'+encodeURIComponent(venueId)+'&order=created_at.asc');if(!alive(tok))return;
    setHTML('fdTm','<div class="fdList">'+r.map(m=>'<div class="fdCartItem"><div class="tx"><b>'+(m.user_id===UID()?'Sen':'Ekip üyesi · '+E(m.user_id.slice(0,8)))+'</b><small>'+E(ago(m.created_at))+' eklendi</small></div><span class="fdBadge acc">'+E({owner:'Sahip',manager:'Yönetici',staff:'Personel'}[m.role])+'</span></div>').join('')+'</div>'+
      '<div class="fdCard fdForm" style="margin-top:14px"><h3>Üye ekle veya rolünü değiştir</h3><p class="fdMuted fdSmall">Yönetici menü ve ayarları düzenler; personel yalnızca siparişleri yönetir. Kişinin İşimi Çöz hesabı olmalı.</p>'+
      '<label for="tmE">E-posta</label><input id="tmE" type="email" autocomplete="off"><label for="tmR">Rol</label><select id="tmR"><option value="staff">Personel</option><option value="manager">Yönetici</option><option value="remove">Ekipten çıkar</option></select>'+
      '<button type="button" class="fb pri block" style="margin-top:14px" onclick="foodTeamSet(this,\''+E(venueId)+'\')">Kaydet</button></div>')}
  catch(e){setHTML('fdTm',errBox(e))}
}
window.foodTeamSet=async function(btn,venueId){
  const em=document.getElementById('tmE').value.trim(),role=document.getElementById('tmR').value;if(!/.+@.+\..+/.test(em))return toast('Geçerli bir e-posta yaz.','warn');
  await once('team',btn,async()=>{try{await RPC('food_venue_set_member',{p_venue_id:venueId,p_email:em,p_role:role});toast('Ekip güncellendi');showFoodTeam(venueId)}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== F6 · Kurye ====================== */
let GEO_WATCH=null,GEO_LAST=0;
function geoStop(){if(GEO_WATCH!=null&&navigator.geolocation)navigator.geolocation.clearWatch(GEO_WATCH);GEO_WATCH=null}
function geoStart(){
  if(GEO_WATCH!=null||!navigator.geolocation)return;
  GEO_WATCH=navigator.geolocation.watchPosition(p=>{const now=Date.now();if(now-GEO_LAST<45000)return;GEO_LAST=now;
    RPC('food_courier_update_location',{p_lat:+p.coords.latitude.toFixed(5),p_lng:+p.coords.longitude.toFixed(5)}).catch(()=>{})},()=>{},{enableHighAccuracy:false,maximumAge:60000,timeout:20000});
  onCleanup(geoStop);
}
function mapsLink(lat,lng,text){const q=lat!=null&&lng!=null?lat+','+lng:encodeURIComponent(text||'');return 'https://www.google.com/maps/dir/?api=1&destination='+q}
const CSTEP={assigned:['picked_up','Siparişi teslim aldım'],at_venue:['picked_up','Siparişi teslim aldım'],picked_up:['on_the_way','Yola çıktım']};
const CIDX={assigned:0,at_venue:0,picked_up:1,on_the_way:2,near_customer:2};
const CLBL=['İş kabul edildi','Teslim aldım','Yola çıktım','Teslim edildi'];
let CACT=null,CEARN=null;
window.foodEarnings=function(){if(!CEARN)return;const sum=l=>M(l.reduce((n,d)=>n+(+d.courier_fee_kurus||0),0));
  const w=modal(sheetHead('Kazanç özeti','Teslim edilen siparişlerin kurye ücretleri')+'<div class="fdKV2"><span>Bugün</span><b>'+CEARN.td.length+' teslimat · '+sum(CEARN.td)+'</b><span>Son 7 gün</span><b>'+CEARN.wk.length+' teslimat · '+sum(CEARN.wk)+'</b><span>Toplam</span><b>'+CEARN.all.length+' teslimat · '+sum(CEARN.all)+'</b></div>'+
    '<p class="fdMuted fdSmall" style="margin-top:12px">Kapıda tahsil ettiğin tutarlar kazançtan ayrıdır; restoranla/platformla mutabakat yapılır.</p>',{sheet:true});bindClose(w)};
async function showFoodCourier(){FDW_TAB='';
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Kurye','showFoodHome()')+roleBar('courier')+skel('row',3));
  let w;try{w=await whoami(true)}catch(e){return render(bar('Kurye','showFoodHome()')+roleBar('courier')+errBox(e,'showFoodCourier()'))}
  if(!alive(tok))return;const c=w.courier;
  if(!c)return courierApplyForm(null);
  if(c.status==='pending'||c.status==='rejected')return courierApplication(tok,c);
  if(c.status==='suspended')return render(bar('Kurye','showFoodHome()')+roleBar('courier')+'<div class="fdTrackHero bad"><div class="st"><span class="e">⛔</span><div><h2>Kurye hesabın askıda</h2><p>Detay için platform yönetimiyle iletişime geç.</p></div></div></div>');
  render(bar('Kurye',"showFoodHome()",'<span class="fdLive" id="fdLive"></span>'+bellBtn(),c.display_name+(+c.rating_avg?' · ★ '+(+c.rating_avg).toFixed(1):''))+
    roleBar('courier')+
    '<div class="fdOpen'+(c.is_available?' on':'')+'"><div class="tx"><b>'+(c.is_available?'Müsaitsin':'Moladasın')+'</b><small>'+(c.is_available?'Yeni teslimatları görüyorsun · konumun paylaşılıyor':'Teslimat almak için müsait ol')+'</small></div>'+sw('crAv',c.is_available,'foodCourierAvail(this)')+'</div>'+
    pushSlot('courier')+(pfOn()?'<div class="fdRows" style="margin-bottom:10px">'+row('📄','Kurye belgelerim','Ehliyet, ruhsat ve diğer belgeler','PF.openDocuments(\'courier\',\''+E(UID())+'\',\'Kurye belgelerim\')')+'</div>':'')+'<div class="fdKpi" id="crKpi"></div><div id="crGps"></div><div id="crMap"></div><div id="crActive"></div><div id="crPoolH"></div><div id="crPool">'+skel('row',1)+'</div><div id="crHist"></div>');
  bellCount();pushDraw();
  const load=async()=>{
    try{
      const [mine,pool]=await Promise.all([RPC('food_courier_my_deliveries'),RPC('food_courier_available')]);
      if(!alive(tok))return;
      const act=mine.find(d=>d.active);CACT=act||null;
      const today=new Date().toDateString();const td=mine.filter(d=>d.status==='delivered'&&new Date(d.updated_at).toDateString()===today);
      const wk=mine.filter(d=>d.status==='delivered'&&Date.now()-new Date(d.updated_at)<7*864e5),all=mine.filter(d=>d.status==='delivered');CEARN={td,wk,all};
      setHTML('crKpi','<div role="button" tabindex="0" onclick="foodEarnings()"><b>'+td.length+'</b><span>Bugün teslimat</span></div><div><b>'+M(td.reduce((n,d)=>n+(+d.courier_fee_kurus||0),0))+'</b><span>Bugün kazanç ›</span></div><div class="'+(pool.length&&!act?'hot':'')+'"><b>'+(act?'—':pool.length)+'</b><span>Uygun iş</span></div>');
      setHTML('crActive',act?courierActive(act):'');
      crMapSync(act||null);
      if(act){geoStop();liveStart()}else{if(LIVE.watch!=null){liveStop();setHTML('crGps','')}if(c.is_available)geoStart()}
      setHTML('crPoolH',act?'':'<h2>Uygun teslimatlar</h2>');
      setHTML('crPool',act?'':!c.is_available?empty('☕','Moladasın','Teslimat almak için üstteki anahtarı aç.'):
        pool.length?pool.map(p=>'<div class="fdwJob"><div class="h"><div class="tx"><b>'+E(p.venue_name)+'</b><small>'+E(p.venue_district||'Restoran')+' → '+E(p.dropoff_district||'Müşteri')+'</small></div><b class="fee">'+M(p.courier_fee_kurus)+'</b></div>'+
          '<div class="m">'+(p.distance_to_venue_km!=null?'<span>Restorana '+E(String(p.distance_to_venue_km).replace('.',','))+' km</span>':'')+'<span>#'+E(p.order_no)+'</span><span>'+(p.item_count||0)+' ürün</span><span>'+Math.max(1,Math.round((Date.now()-new Date(p.searching_since))/60000))+' dk&#39;dır kurye bekliyor</span></div>'+
          (p.offer_expires_at?'<div class="fdNote warn" style="margin:8px 0 0">⏳ Sana özel teklif · <b data-pf-exp="'+E(p.offer_expires_at)+'">…</b></div>':'')+
          '<div class="fdRow2"><button type="button" class="fb" onclick="foodCourierDecline(\''+E(p.delivery_id)+'\',this)">Geç</button><button type="button" class="fb pri" onclick="foodCourierAccept(\''+E(p.delivery_id)+'\',this)">İşi kabul et</button></div>'+
          '<p class="fdMuted fdSmall" style="margin:8px 0 0">Müşteri adresi ve telefonu kabul edince görünür.</p></div>').join(''):
        empty('🛵','Şu an uygun teslimat yok','Yeni teslimat geldiğinde burada görünür ve bildirim alırsın.'));
      const hist=mine.filter(d=>!d.active);
      setHTML('crHist',hist.length?'<details class="fdDet" style="margin-top:14px"><summary>Geçmiş teslimatlar · '+hist.length+'</summary><div>'+hist.slice(0,15).map(d=>'<div class="fdLine"><span>#'+E(d.order_no)+' · '+E(d.venue.name)+'<br><small class="fdMuted">'+ago(d.updated_at)+'</small></span><span style="text-align:right">'+E({delivered:'✓ Teslim edildi',failed:'⚠️ Başarısız',cancelled:'✕ İptal',searching:'↩ Bırakıldı'}[d.status]||d.status)+'<br><b>'+(d.status==='delivered'?M(d.courier_fee_kurus):'—')+'</b></span></div>').join('')+'</div></details>':'');
    }catch(e){setHTML('crPool',errBox(e,'showFoodCourier()'))}
  };
  onCleanup(crMapDrop);
  await load();
  watch(tok,[{table:'food_deliveries'},{table:'food_notifications',filter:'user_id=eq.'+UID()}],debounce((k,p)=>{if(p&&p.table==='food_notifications'){bellCount();if(p.eventType==='INSERT'&&p.new&&(p.new.type==='courier_offer'||p.new.type==='courier_offer_direct')){toast(p.new.type==='courier_offer_direct'?'🔔 Sana özel teslimat teklifi!':'🔔 Yeni teslimat var!');beep()}}load()},300));
  const pfTick=setInterval(()=>{if(!alive(tok))return clearInterval(pfTick);let exp=false;qa('[data-pf-exp]').forEach(el=>{const s=Math.round((new Date(el.dataset.pfExp)-Date.now())/1000);if(s<=0){el.textContent='süre doldu';exp=true}else el.textContent=s+' sn içinde yanıtla'});if(exp)load()},1000);onCleanup(()=>clearInterval(pfTick));
}
/* ---------- V4 · Kurye haritası: hedef (restoran/müşteri) + kuryenin kendi konumu, sokak adlarıyla ---------- */
let CMAP=null,CMK={},CMKEY='',CMFIT=false;
function crMapDrop(){if(CMAP){try{CMAP.remove()}catch(e){}}CMAP=null;CMK={};CMKEY='';CMFIT=false}
function crPt(o){return o&&o.lat!=null&&o.lng!=null&&isFinite(+o.lat)&&isFinite(+o.lng)?[+o.lat,+o.lng]:null}
function crMapFit(){
  if(!CMAP)return;const t=CMK.t&&CMK.t.getLatLng(),me=CMK.me&&CMK.me.getLatLng();
  if(t&&me)CMAP.fitBounds([t,me],{padding:[48,48],maxZoom:17});else if(t||me)CMAP.setView(t||me,17);
}
window.foodCourierMapFit=crMapFit;
function crMapMe(fit){
  if(!CMAP||!window.L)return;const p=LIVE.latest||LIVE.pos;if(!p)return;
  if(CMK.me){CMK.me.setLatLng(p);return}
  const L=window.L;CMK.me=L.marker(p,{icon:mapIcon(L,'🛵','cr'),title:'Konumun',zIndexOffset:1000}).addTo(CMAP);
  CMK.me.bindTooltip&&CMK.me.bindTooltip('Sen',{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'});
  if(fit!==false||!CMFIT){CMFIT=true;crMapFit()}
}
async function crMapSync(d){
  const box=document.getElementById('crMap');if(!box)return;
  const atV=d&&['assigned','at_venue'].includes(d.status),v=(d&&d.venue)||{},cu=(d&&d.customer)||{};
  const tgt=d?(atV?crPt(v):crPt(cu)):null;
  if(!tgt){crMapDrop();box.innerHTML='';return}
  const key=d.delivery_id+'|'+(atV?'v':'c')+'|'+tgt.join(',');
  if(CMKEY===key&&CMAP){crMapMe(false);return}
  crMapDrop();CMKEY=key;
  const name=atV?(v.name||'Restoran'):'Teslimat adresi',addr=atV?[v.address,v.district].filter(Boolean).join(', '):cu.address;
  box.innerHTML='<div class="fdwCMap"><div class="fdwCMapEl" id="crMapEl" role="img" aria-label="'+(atV?'Restorana':'Müşteriye')+' giden yol haritası"></div>'+
    '<button type="button" class="fdwCMapFit" aria-label="Haritayı ortala" onclick="foodCourierMapFit()">⌖</button>'+
    '<div class="fdwCMapB"><span aria-hidden="true">'+(atV?'🏪':'🏠')+'</span><b>'+E(name)+'</b><a class="fb sm pri" target="_blank" rel="noopener" href="'+mapsLink(tgt[0],tgt[1],addr)+'">🧭 Yol tarifi</a></div></div>';
  try{
    const L=await loadMap();if(CMKEY!==key||!document.getElementById('crMapEl'))return;
    CMAP=makeMap(L,'crMapEl',tgt,17);
    CMK.t=L.marker(tgt,{icon:mapIcon(L,atV?'🏪':'🏠'),title:name}).addTo(CMAP);
    CMK.t.bindTooltip&&CMK.t.bindTooltip(atV?(v.name||'Restoran'):'Müşteri',{permanent:true,direction:'top',offset:[0,-36],className:'fdTip'});
    crMapMe(true);
    setTimeout(()=>{if(CMAP&&CMKEY===key){CMAP.invalidateSize();crMapFit()}},180);
  }catch(e){if(CMKEY===key){CMKEY='';box.innerHTML=''}}
}
function courierActive(d){
  const st=d.status,cu=d.customer||{},v=d.venue||{};const step=CSTEP[st];const atVenue=['assigned','at_venue'].includes(st);const idx=CIDX[st]??0;
  const dest=(cur,label,name,addr,note,lat,lng,phone)=>'<div class="fdDest'+(cur?' cur':'')+'"><small>'+label+'</small><b>'+E(name)+'</b><p>'+E(addr||'')+'</p>'+(note?'<div class="fdNote warn" style="margin:8px 0 0">📝 '+E(note)+'</div>':'')+
    (cur?'<div class="acts"><a class="fb sm soft" target="_blank" rel="noopener" href="'+mapsLink(lat,lng,addr)+'">🧭 Yol tarifi</a>'+(phone?'<a class="fb sm" href="tel:'+E(phone)+'">📞 Ara</a>':'')+'</div>':'')+'</div>';
  return '<div class="fdCourierAct"><div class="hd"><b>#'+E(d.order_no)+' · '+(atVenue?'Restorana git':'Müşteriye git')+'</b><b class="fdOk">'+M(d.courier_fee_kurus)+'</b></div><div class="bd">'+
    '<div class="fdCSteps">'+[0,1,2,3].map(i=>'<i class="'+(i<=idx?'on':'')+'"></i>').join('')+'</div><div class="fdwCLbl">'+CLBL.map((l,i)=>'<span class="'+(i<=idx?'on':'')+'">'+E(l)+'</span>').join('')+'</div>'+
    dest(atVenue,'1 · Restoran',v.name,[v.address,v.district].filter(Boolean).join(', '),null,v.lat,v.lng,v.phone)+
    dest(!atVenue,'2 · Müşteri',cu.address?'Teslimat adresi':'Müşteri',cu.address,cu.note,cu.lat,cu.lng,cu.phone)+
    '<div class="fdNote info" style="margin-top:10px">🛍️ '+E((d.items||[]).map(i=>i.quantity+'× '+i.name).join(', '))+'</div>'+
    (d.collect_kurus?'<div class="fdNote warn">💵 Tahsil edilecek: <b>'+M(d.collect_kurus)+'</b> · '+E(PAY[d.payment_method]||'')+'</div>':'<div class="fdNote ok">Ödeme: '+E(PAY[d.payment_method]||'')+'</div>')+
    '</div></div>'+
    '<div class="fdSticky" style="margin-top:0;margin-bottom:14px"><div class="fdCta">'+
      '<button type="button" class="fb" style="flex:0 0 52px" aria-label="Diğer işlemler" onclick="foodCourierMore()">⋯</button>'+
      (step?'<button type="button" class="fb pri" onclick="foodCourierStep(\''+E(d.delivery_id)+'\',\''+step[0]+'\',this)">'+E(step[1])+'</button>':'')+
      (['on_the_way','near_customer'].includes(st)?'<button type="button" class="fb pri" onclick="foodCourierComplete(\''+E(d.delivery_id)+'\',this)">✓ Teslim et</button>':'')+
      (pfOn()&&['picked_up','on_the_way','near_customer'].includes(st)?'<button type="button" class="fb" style="flex:0 0 52px" aria-label="Teslim fotoğrafı" title="Teslim fotoğrafı (isteğe bağlı)" onclick="foodCourierProof(\''+E(d.delivery_id)+'\')">📷</button>':'')+
    '</div></div>';
}
window.foodCourierMore=function(){
  const d=CACT;if(!d)return;const st=d.status,cu=d.customer||{},v=d.venue||{};
  const items=[];
  if(v.phone)items.push('<a class="fb block" href="tel:'+E(v.phone)+'">📞 Restoranı ara</a>');
  if(cu.phone)items.push('<a class="fb block" href="tel:'+E(cu.phone)+'">📞 Müşteriyi ara</a>','<a class="fb block" href="sms:'+E(cu.phone)+'">💬 Müşteriye SMS</a>');
  if(st==='assigned')items.push('<button type="button" class="fb block" data-a="atv">🏪 Restorana vardım (restorana bildir)</button>');
  if(st==='on_the_way')items.push('<button type="button" class="fb block" data-a="near">📍 Müşteriye yaklaştım (müşteriye bildir)</button>');
  if(['assigned','at_venue'].includes(st))items.push('<button type="button" class="fb block ghostBad" style="border:1px solid var(--line)" data-a="release">Teslimattan vazgeç</button>');
  if(['picked_up','on_the_way','near_customer'].includes(st))items.push('<button type="button" class="fb block ghostBad" style="border:1px solid var(--line)" data-a="failed">Teslim edilemedi</button>');
  const w=modal(sheetHead('Teslimat #'+d.order_no)+'<div class="fdRows">'+items.join('')+'</div>',{sheet:true});bindClose(w);
  const r=w.querySelector('[data-a=release]');if(r)r.onclick=()=>{closeModal();foodCourierRelease(d.delivery_id,null)};
  const f=w.querySelector('[data-a=failed]');if(f)f.onclick=()=>{closeModal();foodCourierStep(d.delivery_id,'failed',null)};
  const av=w.querySelector('[data-a=atv]');if(av)av.onclick=()=>{closeModal();foodCourierStep(d.delivery_id,'at_venue',null)};
  const nr=w.querySelector('[data-a=near]');if(nr)nr.onclick=()=>{closeModal();foodCourierStep(d.delivery_id,'near_customer',null)};
};
window.foodCourierProof=function(deliveryId){
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='environment';
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;
    try{toast('Fotoğraf yükleniyor…');const blob=await shrinkImage(f,1600,0.8);const s=S();const path=UID()+'/'+deliveryId+'-'+Date.now()+'.jpg';
      const r=await fetch(SUPABASE_URL+'/storage/v1/object/food-pod/'+path,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob});
      if(!r.ok)throw new Error('Fotoğraf yüklenemedi.');
      await RPC('pf_courier_add_proof',{p_delivery_id:deliveryId,p_path:path});toast('Teslim fotoğrafı kaydedildi.');
    }catch(e){toast(errMsg(e),'err')}};
  inp.click();
};
function shrinkImage(file,max,q){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('Fotoğraf işlenemedi.')),'image/jpeg',q)};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Fotoğraf okunamadı.'))};img.src=u})}
window.foodPfShowProof=async function(orderId,btn){
  try{const pr=await RPC('pf_delivery_proof',{p_order_id:orderId});if(!pr||!pr.photo_path)return toast('Teslim fotoğrafı yok.');
    const s=S();const r=await fetch(SUPABASE_URL+'/storage/v1/object/sign/food-pod/'+pr.photo_path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
    const j=await r.json();if(!r.ok||!j.signedURL)throw new Error('Fotoğraf açılamadı.');
    const w=modal(sheetHead('Teslim fotoğrafı',dt(pr.created_at))+'<img alt="Teslim fotoğrafı" style="width:100%;border-radius:12px" src="'+E(SUPABASE_URL+'/storage/v1'+j.signedURL)+'">',{sheet:true});bindClose(w);
  }catch(e){toast(errMsg(e),'err')}
};
window.foodCourierRegister=async function(btn){
  const n=document.getElementById('crN').value.trim(),p=document.getElementById('crP').value.trim();const vb=document.querySelector('#crV .on');const v=vb?vb.dataset.v:'motorbike';const err=document.getElementById('crE');
  if(n.length<2){err.hidden=false;err.textContent='Adını yaz.';return}if(p.replace(/\D/g,'').length<10){err.hidden=false;err.textContent='Geçerli bir telefon yaz.';return}
  let pfc=null;if(pfOn()&&window.PF.readChecklist){pfc=PF.readChecklist(document.getElementById('crCons'));if(pfc.missing.length){err.hidden=false;err.textContent='Devam etmek için kurye metinlerini onaylamalısın.';return}}
  await once('crReg',btn,async()=>{try{await RPC('food_courier_register',{p_display_name:n,p_phone:p,p_vehicle:v});
    if(pfc&&pfc.items.length){try{await RPC('pf_record_consents',{p_items:pfc.items,p_context:'courier_application',p_subject_id:null,p_user_agent:navigator.userAgent.slice(0,380)})}catch(e){}}
    WHO=null;toast('Başvurun alındı, inceleniyor');showFoodCourier()}catch(e){err.hidden=false;err.textContent=errMsg(e)}});
};
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('#crV [data-v]');if(!b)return;qa('#crV [data-v]').forEach(x=>x.classList.toggle('on',x===b))});
window.foodCourierAvail=async function(inp){
  const on=inp.checked;inp.disabled=true;
  let lat=null,lng=null;
  if(on&&navigator.geolocation){try{const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000,maximumAge:60000}));lat=+p.coords.latitude.toFixed(5);lng=+p.coords.longitude.toFixed(5)}catch(e){toast('Konum alınamadı; mesafe bilgisi gösterilmeyecek.','warn')}}
  try{await RPC('food_courier_set_availability',{p_available:on,p_lat:lat,p_lng:lng});WHO=null;if(!on)geoStop();toast(on?'Müsaitsin, yeni teslimatlar gösteriliyor':'Moladasın');showFoodCourier()}
  catch(e){inp.checked=!on;inp.disabled=false;toast(errMsg(e),'err')}
};
window.foodCourierAccept=async function(id,btn){await once('crAc'+id,btn,async()=>{try{await RPC('food_courier_accept',{p_delivery_id:id});toast('Teslimat senin! Restorana git.');showFoodCourier()}catch(e){toast(errMsg(e),'err');showFoodCourier()}})};
window.foodCourierDecline=async function(id,btn){await once('crDc'+id,btn,async()=>{try{await RPC('food_courier_decline',{p_delivery_id:id});toast('Teslimat listenden kaldırıldı');showFoodCourier()}catch(e){toast(errMsg(e),'err')}})};
window.foodCourierRelease=async function(id,btn){
  const r=await promptBox('Teslimattan vazgeç','Sebep',{required:true,danger:true,okLabel:'Vazgeç',text:'Teslimat başka bir kuryeye aktarılır; bu teslimatı tekrar alamazsın.',chips:['Araç arızası','Acil durum','Restoranda çok bekledim']});if(!r)return;
  await once('crRl'+id,btn,async()=>{try{await RPC('food_courier_release',{p_delivery_id:id,p_reason:r});toast('Teslimat havuza geri döndü');showFoodCourier()}catch(e){toast(errMsg(e),'err')}});
};
window.foodCourierStep=async function(id,step,btn){
  let reason=null;
  if(step==='failed'){reason=await promptBox('Teslimat neden tamamlanamadı?','Sebep',{required:true,danger:true,okLabel:'Kaydet',chips:['Müşteriye ulaşılamadı','Adres bulunamadı','Müşteri teslim almadı']});if(!reason)return}
  if(step==='picked_up'&&!await confirmBox('Siparişi teslim aldın mı?','Ürünlerin eksiksiz olduğunu kontrol et.','Evet, aldım'))return;
  await once('crSt'+id,btn,async()=>{try{
    /* Tek dokunuş "Teslim aldım": gerekiyorsa önce mevcut "restorana vardım" adımı, sonra teslim alma (aynı sunucu akışı) */
    if(step==='picked_up'&&CACT&&CACT.delivery_id===id&&CACT.status==='assigned')await RPC('food_courier_step',{p_delivery_id:id,p_step:'at_venue',p_reason:null});
    await RPC('food_courier_step',{p_delivery_id:id,p_step:step,p_reason:reason});showFoodCourier()}catch(e){toast(errMsg(e),'err');showFoodCourier()}});
};
window.foodCourierComplete=async function(id,btn){
  const code=await promptBox('Teslimat kodu','',{input:'code',okLabel:'Teslim et',text:'Müşteriden 4 haneli teslimat kodunu iste.'});if(!code)return;
  await once('crCp'+id,btn,async()=>{try{const r=await RPC('food_courier_complete',{p_delivery_id:id,p_code:code});
    if(r.ok){toast('🎉 Teslimat tamamlandı!');showFoodCourier()}else{toast(r.message||'Kod hatalı','err')}}catch(e){toast(errMsg(e),'err')}});
};

/* ====================== Kurye başvurusu (DEMO iş akışı) ====================== */
function courierApplyForm(prev){
  if(pfOn())PF.legalList().then(list=>{const el=document.getElementById('crCons');if(el)el.innerHTML=PF.consentChecklist(list,'courier_application','courier')}).catch(()=>{});
  render(bar(prev?'Tekrar başvur':'Kurye ol','showFoodHome()')+roleBar('courier')+
    (prev?'':'<div class="fdTrackHero" style="text-align:center"><div style="font-size:40px">🛵</div><h2 style="margin-top:6px">Kendi saatlerinde teslimat yap</h2><p>Başvur, incelensin, onaylanınca müsait olduğunda yakınındaki teslimatları al.</p></div>')+
    '<div class="fdCard" style="margin-bottom:12px"><ol class="fdApply"><li class="cur"><i>1</i><div><b>Başvuru</b><small>Ad, telefon ve araç bilgisi</small></div></li><li><i>2</i><div><b>İnceleme</b><small>Bilgilerin kontrol edilir</small></div></li><li><i>3</i><div><b>Onay</b><small>Onaylanınca teslimat almaya başlarsın</small></div></li></ol></div>'+
    '<div class="fdCard fdForm"><label for="crN">Ad soyad</label><input id="crN" maxlength="60" autocomplete="name" value="'+E(prev?prev.display_name:'')+'"><label for="crP">Telefon</label><input id="crP" type="tel" inputmode="tel" autocomplete="tel" value="'+E(prev?prev.phone:'')+'">'+
    '<label>Araç</label><div class="fdChips wrap" id="crV">'+Object.entries(VEH).map(([k,l])=>'<button type="button" class="fdChip'+(k===((prev&&prev.vehicle_type)||'motorbike')?' on':'')+'" data-v="'+k+'">'+l+'</button>').join('')+'</div>'+
    '<div id="crCons"></div><div class="fdErr" id="crE" hidden></div><button type="button" class="fb pri block" style="margin-top:14px" onclick="foodCourierRegister(this)">'+(prev?'Tekrar başvur':'Başvur')+'</button>'+
    '<p class="fdDemo">Bu bir demo iş akışıdır; resmî bir kurye onay süreci değildir.</p></div>');
}
async function courierApplication(tok,c){
  let info={status:c.status,review_note:null,applied_at:null,reviewed_at:null};
  try{const r=await Q('GET','food_couriers?select=status,review_note,applied_at,reviewed_at,display_name,phone,vehicle_type&user_id=eq.'+UID());if(r&&r[0])info=Object.assign(c,r[0])}catch(e){}
  if(!alive(tok))return;
  const draw=(st,left)=>{
    const rej=st==='rejected';
    render(bar('Kurye başvurusu','showFoodHome()')+roleBar('courier')+
      '<div class="fdTrackHero'+(rej?' bad':'')+'"><div class="st"><span class="e">'+(rej?'❌':'⏳')+'</span><div><h2>'+(rej?'Başvurun reddedildi':'Başvurun inceleniyor')+'</h2><p>'+(rej?'Bilgilerini güncelleyip tekrar başvurabilirsin.':'İnceleme bitince burada ve bildirimlerde göreceksin.')+'</p></div></div></div>'+
      '<div class="fdCard"><ol class="fdApply">'+
        '<li class="done"><i>✓</i><div><b>Başvuru alındı</b><small>'+E(info.display_name||'')+' · '+E(VEH[info.vehicle_type]||'')+(info.applied_at?' · '+E(dt(info.applied_at)):'')+'</small></div></li>'+
        '<li class="'+(rej?'done':'cur')+'"><i>'+(rej?'✓':'<span class="fdSpin" style="width:14px;height:14px"></span>')+'</i><div><b>İnceleniyor</b><small>'+(rej?'İnceleme tamamlandı':left==='manual'?'Platform yönetimi başvurunu inceleyecek':'Demo inceleme'+(left>0?' · yaklaşık '+left+' sn':' · sonuçlanıyor…'))+'</small></div></li>'+
        '<li class="'+(rej?'bad':'')+'"><i>'+(rej?'✕':'3')+'</i><div><b>'+(rej?'Reddedildi':'Onay')+'</b><small>'+(rej?E(info.review_note||'Gerekçe belirtilmedi.'):'Onaylanınca teslimat almaya başlarsın')+'</small></div></li>'+
      '</ol></div>'+
      (rej?'<button type="button" class="fb pri block" style="margin-top:12px" onclick="foodCourierReapply()">Bilgileri güncelle ve tekrar başvur</button>':'')+
      '<p class="fdDemo">Bu bir demo iş akışıdır; resmî bir kurye onay süreci değildir. Onay otomatik demo incelemesiyle ya da platform yönetimi tarafından verilir.</p>');
  };
  window.foodCourierReapply=()=>courierApplyForm(info);
  if(info.status==='rejected')return draw('rejected',0);
  draw('pending',null);
  const tickFn=async()=>{
    if(!alive(tok))return;
    try{const r=await RPC('food_courier_demo_review');if(!alive(tok))return;
      if(r.status==='approved'){clearInterval(iv);WHO=null;toast('🎉 Kurye başvurun onaylandı!');try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}showFoodCourier();return}
      if(r.status==='rejected'){clearInterval(iv);WHO=null;showFoodCourier();return}
      draw('pending',r.mode==='manual'?'manual':(+r.seconds_left||0));
    }catch(e){}
  };
  const iv=setInterval(tickFn,5000);onCleanup(()=>clearInterval(iv));tickFn();
}

/* ====================== Canlı kurye konumu (aktif teslimat) ====================== */
const LIVE={watch:null,last:0,pos:null,latest:null,timer:null,beat:null,wake:null,kind:'',msg:'',bound:false};
/* Gönderim kuralı: en az 4 sn arayla; 30 m+ hareket ya da 10 sn geçtiyse gönder. Sınıra takılan son konum kaybolmaz, süre dolunca gönderilir. */
function liveSend(){
  clearTimeout(LIVE.timer);LIVE.timer=null;const p=LIVE.latest;if(!p||LIVE.watch==null)return;
  const now=Date.now(),since=now-LIVE.last,moved=LIVE.pos?distKm(LIVE.pos,p)*1000:1e9;
  if(LIVE.pos&&moved<1&&since<45000)return;
  if(since<4000||(since<10000&&moved<30)){LIVE.timer=setTimeout(liveSend,(since<4000?4000:10000)-since+50);return}
  LIVE.last=now;LIVE.pos=p;
  RPC('food_courier_update_location',{p_lat:p[0],p_lng:p[1]}).then(()=>gpsState('ok','Canlı konum paylaşılıyor · '+hm(new Date())+' · ekranı açık tut')).catch(e=>gpsState('wait','Konum gönderilemedi, tekrar denenecek: '+errMsg(e)));
}
function gpsState(kind,msg){LIVE.kind=kind;LIVE.msg=msg;setHTML('crGps','<div class="fdGps '+kind+'" role="status"><i></i><span>'+E(msg)+'</span></div><p class="fdMuted fdSmall" style="margin:-6px 0 12px">Teslimat boyunca bu ekranı açık tut; ekran kilitlenince konum paylaşımı durur, geri dönünce devam eder.</p>')}
async function wakeOn(){try{if('wakeLock' in navigator&&!LIVE.wake){LIVE.wake=await navigator.wakeLock.request('screen');LIVE.wake.addEventListener('release',()=>{LIVE.wake=null})}}catch(e){}}
function liveStop(){if(LIVE.watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(LIVE.watch);LIVE.watch=null;clearTimeout(LIVE.timer);LIVE.timer=null;clearInterval(LIVE.beat);LIVE.beat=null;LIVE.latest=null;LIVE.bound=false;try{LIVE.wake&&LIVE.wake.release()}catch(e){}LIVE.wake=null}
function liveStart(){
  if(!LIVE.bound){LIVE.bound=true;onCleanup(liveStop);const vis=()=>{if(document.visibilityState==='visible'&&LIVE.watch!=null){wakeOn();if(LIVE.last&&Date.now()-LIVE.last>20000){toast('📡 Konum paylaşımı yeniden başladı');LIVE.pos=null;liveSend()}}};document.addEventListener('visibilitychange',vis);onCleanup(()=>document.removeEventListener('visibilitychange',vis))}
  if(LIVE.watch!=null){if(LIVE.msg)gpsState(LIVE.kind,LIVE.msg);return}
  if(!navigator.geolocation)return gpsState('bad','Cihazın konum paylaşımını desteklemiyor. Müşteri seni haritada göremez.');
  gpsState('wait','Konum alınıyor… Konum izni istenirse "İzin ver"e dokun.');
  wakeOn();
  LIVE.beat=setInterval(()=>{if(LIVE.latest&&Date.now()-LIVE.last>=45000){LIVE.pos=null;liveSend()}},15000);
  LIVE.watch=navigator.geolocation.watchPosition(p=>{
    LIVE.latest=[+p.coords.latitude.toFixed(6),+p.coords.longitude.toFixed(6)];liveSend();try{crMapMe(false)}catch(e){}
  },err=>{
    if(err.code===1)gpsState('bad','Konum izni kapalı. Müşteri seni haritada göremiyor. Tarayıcı ayarlarından bu siteye konum izni ver ve sayfayı yenile.');
    else gpsState('wait','Konum alınamıyor (GPS sinyali zayıf olabilir). Tekrar deneniyor…');
  },{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
}

/* ====================== Admin ====================== */
async function showFoodAdmin(){FDW_TAB='';
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Yemek yönetimi','showFoodHome()')+skel('row',3));
  try{
    const w=await whoami(true);if(!w.is_admin)return render(bar('Yemek yönetimi','showFoodHome()')+empty('🔒','Yetkin yok','Bu alan yalnızca platform yönetimi içindir.'));
    const [o,st]=await Promise.all([RPC('food_admin_overview'),foodSettings(true)]);SETA=st||{};if(!alive(tok))return;
    const sc=o.orders_by_status||{};
    render(bar('Yemek yönetimi','showFoodHome()',null,'Son 7 gün')+
      '<div class="fdKpi">'+Object.entries(sc).map(([k,n])=>'<div><b>'+n+'</b><span>'+E((STL[k]||['',k])[1])+'</span></div>').join('')+'<div class="'+(o.searching_deliveries?'hot':'')+'"><b>'+o.searching_deliveries+'</b><span>Kurye bekleyen</span></div></div>'+
      '<details class="fdDet"><summary>⚙️ Operasyon ayarları</summary><div class="fdForm">'+
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 0"><div style="flex:1"><b>Demo kurye otomatik onayı</b><small class="fdMuted" style="display:block">Açıkken başvurular 60 sn sonra demo olarak onaylanır. Canlı kullanımda KAPALI olmalı.</small></div>'+sw('stDemo',!!SETA.courier_demo_auto_approve,"foodSetting('courier_demo_auto_approve',this.checked,this)")+'</div>'+
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 0"><div style="flex:1"><b>Anlık bildirimler (Web Push)</b></div>'+sw('stPush',!!SETA.push_enabled,"foodSetting('push_enabled',this.checked,this)")+'</div>'+
        '<div class="two"><div><label for="stAcc">Kabul süresi (dk)</label><input id="stAcc" type="number" min="3" max="60" value="'+(+SETA.accept_timeout_min||10)+'" onchange="foodSetting(&#39;accept_timeout_min&#39;,+this.value,this)"></div><div><label for="stLate">Gecikme eşiği (dk)</label><input id="stLate" type="number" min="3" max="60" value="'+(+SETA.late_notify_min||10)+'" onchange="foodSetting(&#39;late_notify_min&#39;,+this.value,this)"></div></div>'+
        '<p class="fdMuted fdSmall" style="margin-top:10px">Online ödeme: '+(SETA.online_payment_enabled?'açık':'kapalı')+' (ödeme sağlayıcı anahtarları tanımlanınca açılır).</p></div></details>'+
      '<div class="fdRows" style="margin:12px 0">'+row('⚡','Kademeli Flash indirim','Mevcut kupon altyapısıyla kademeli, süreli kampanya','foodAdmFlash()')+row('🛰️','Operasyon merkezi','Alarmlar, acil durum anahtarları, bekleyen işler','showFoodOpsCenter()')+row('🗂️','Başvurular','Restoran ve kurye: Başvuru → Belgeler → İnceleme → Onay → Aktif','showFoodOnboarding()')+row('📣','Reklam ve kampanya alanları','Slider, sponsorlu kart, banner · gösterim/tıklama','showFoodAdminPromos()')+row('💬','Yorum moderasyonu','Bildirilen yorumlar, gizle / yayına al','showFoodAdminReviews()')+'</div>'+
      '<h2>Kurye başvuruları</h2>'+(o.pending_couriers.length?o.pending_couriers.map(c=>'<div class="fdCard" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(c.name)+'</b>'+badge(c.status==='suspended'?'cancelled':'new').replace(/>[^<]*</,'>'+(c.status==='suspended'?'Askıda':'Bekliyor')+'<')+'</div><div class="fdMuted fdSmall">'+E(c.phone)+' · '+E(VEH[c.vehicle]||'')+' · '+ago(c.created_at)+'</div><div class="fdRow2">'+(c.status==='pending'?'<button type="button" class="fb ghostBad" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'rejected\',this)">Reddet</button>':c.status!=='suspended'?'<button type="button" class="fb ghostBad" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button>':'<span></span>')+'<button type="button" class="fb pri" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'approved\',this)">Onayla</button></div></div>').join(''):'<p class="fdMuted fdSmall">Bekleyen başvuru yok.</p>')+
      '<h2>Onaylı kuryeler</h2>'+(o.couriers.length?'<div class="fdList">'+o.couriers.map(c=>'<div class="fdCartItem"><div class="tx"><b>'+E(c.name)+' '+(c.is_available?'🟢':'⚪')+'</b><small>'+(+c.rating_avg?'★ '+(+c.rating_avg).toFixed(1):'Puan yok')+'</small></div><button type="button" class="fb ghostBad sm" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button></div>').join('')+'</div>':'<p class="fdMuted fdSmall">Onaylı kurye yok.</p>')+
      '<h2>Restoranlar</h2><div class="fdList">'+o.venues.map(v=>'<div class="fdCartItem"><div class="tx"><b>'+E(v.name)+'</b><small>'+(v.is_active?'Aktif':'Pasif')+' · '+(v.is_open?'Açık':'Kapalı')+' · komisyon %'+(v.commission_bps/100).toFixed(2).replace('.',',')+' · hizmet '+M(v.platform_fee_kurus)+'</small></div><button type="button" class="fb sm" onclick="foodAdmVenue(\''+E(v.id)+'\','+v.commission_bps+','+v.platform_fee_kurus+','+v.is_active+')">Düzenle</button></div>').join('')+'</div>'+
      '<h2>Açık sorunlar</h2>'+(o.open_issues.length?o.open_issues.map(x=>'<div class="fdCard" style="margin-bottom:10px"><b>'+E(ISSUE[x.type]||x.type)+'</b> <span class="fdMuted fdSmall">#'+E(x.order_no)+' · '+ago(x.created_at)+'</span>'+(x.description?'<p>'+E(x.description)+'</p>':'')+'<div class="fdRow2"><button type="button" class="fb" onclick="foodAdmIssue(\''+E(x.id)+'\',\'rejected\',this)">Reddet</button><button type="button" class="fb pri" onclick="foodAdmIssue(\''+E(x.id)+'\',\'resolved\',this)">Çözüldü</button></div></div>').join(''):'<p class="fdMuted fdSmall">Açık sorun yok.</p>'));
  }catch(e){if(alive(tok))render(bar('Yemek yönetimi','showFoodHome()')+errBox(e,'showFoodAdmin()'))}
}
/* ---------- V4 · Yemek admin: reklam alanları ve yorum moderasyonu ----------
   Tablolar henüz kurulmadıysa (veritabanı onayı bekleniyorsa) açıklayıcı bilgi gösterilir; hiçbir şey kırılmaz. */
const PLC={home_hero:'Ana sayfa slayt',home_mid:'Ana sayfa ara banner',home_feed:'Sponsorlu restoran kartı',category:'Kategori banner',venue_strip:'Restoran sayfası şeridi',post_order:'Sipariş sonrası'};
const TGT={none:'Yönlendirme yok',venue:'Restoran',cuisine:'Mutfak',search:'Arama'};
function dbMissing(e){return /PGRST20[25]|42P01|does not exist|schema cache|404/i.test(errMsg(e)+' '+(e&&e.code||'')+' '+(e&&e.status||''))}
const DBWAIT=empty('🗄️','Veritabanı kurulumu bekleniyor','Bu bölüm “Yemek V4 · 01” SQL dosyası onaylanıp uygulanınca çalışır. Mevcut sistem bundan etkilenmez.');
let APR={rows:[],venues:[]};
async function showFoodAdminPromos(){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Reklam alanları','showFoodAdmin()')+skel('row',3));
  try{
    const w=await whoami(true);if(!w.is_admin)return render(bar('Reklam alanları','showFoodAdmin()')+empty('🔒','Yetkin yok',''));
    let rows,stats=[];
    try{rows=await Q('GET','food_promos?select=*&order=active.desc,priority.desc,created_at.desc&limit=200')}catch(e){if(!alive(tok))return;return render(bar('Reklam alanları','showFoodAdmin()')+(dbMissing(e)?DBWAIT:errBox(e,'showFoodAdminPromos()')))}
    const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    try{stats=await Q('GET','food_promo_stats?select=promo_id,impressions,clicks&day=gte.'+since)}catch(e){}
    let venues=[];try{venues=await Q('GET','food_venues?select=id,name&order=name.asc&limit=500')}catch(e){}
    if(!alive(tok))return;APR={rows,venues};
    const st={};stats.forEach(x=>{const k=st[x.promo_id]=st[x.promo_id]||{i:0,c:0};k.i+=+x.impressions||0;k.c+=+x.clicks||0});
    const now=Date.now();const live=r=>r.active&&new Date(r.starts_at)<=now&&(!r.ends_at||new Date(r.ends_at)>now);
    render(bar('Reklam alanları','showFoodAdmin()',null,rows.length+' kayıt')+
      '<button type="button" class="fb pri block" style="margin-bottom:12px" onclick="foodAdmPromoEdit(null)">+ Yeni reklam / kampanya alanı</button>'+
      '<p class="fdMuted fdSmall" style="margin:0 0 10px">Son 30 gün gösterim ve tıklama. Sponsorlu içerikler müşteriye “Sponsorlu” etiketiyle gösterilir.</p>'+
      (rows.length?'<div class="fdwAdmL">'+rows.map(r=>{const k=st[r.id]||{i:0,c:0};const on=live(r);
        return '<div class="fdwAdmP'+(on?'':' off')+'"><div class="h"><b>'+E(r.title)+'</b><span class="fdPill">'+(on?'Yayında':r.active?'Zamanı dışında':'Kapalı')+'</span></div>'+
          '<small>'+E(PLC[r.placement]||r.placement)+(r.sponsored?' · Sponsorlu':'')+' · öncelik '+(+r.priority||0)+(r.ends_at?' · bitiş '+E(new Date(r.ends_at).toLocaleDateString('tr-TR')):'')+'</small>'+
          '<div class="m"><span>👁 '+k.i+'</span><span>👆 '+k.c+'</span><span>TO %'+(k.i?(k.c*100/k.i).toFixed(1).replace('.',','):'0')+'</span></div>'+
          '<div class="fdRow2"><button type="button" class="fb sm" onclick="foodAdmPromoEdit(\''+E(r.id)+'\')">Düzenle</button><button type="button" class="fb sm '+(r.active?'ghostBad':'soft')+'" onclick="foodAdmPromoToggle(\''+E(r.id)+'\','+(!r.active)+',this)">'+(r.active?'Durdur':'Yayına al')+'</button></div></div>'}).join('')+'</div>':
        empty('📣','Henüz reklam alanı yok','Eklemediğin sürece ana sayfada gerçek restoranlar öne çıkarılır.')));
  }catch(e){if(alive(tok))render(bar('Reklam alanları','showFoodAdmin()')+errBox(e,'showFoodAdminPromos()'))}
}
window.foodAdmPromoToggle=async function(id,on,btn){await once('pt'+id,btn,async()=>{try{await Q('PATCH','food_promos?id=eq.'+id,{active:on});toast(on?'Yayına alındı':'Durduruldu');showFoodAdminPromos()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmPromoEdit=function(id){
  const r=id?APR.rows.find(x=>x.id===id):{placement:'home_hero',title:'',subtitle:'',image_url:'',cta:'',target_kind:'none',target_value:'',venue_id:null,sponsored:false,priority:0,starts_at:null,ends_at:null,active:true};if(!r)return;
  const dv=x=>x?new Date(x).toISOString().slice(0,10):'';const opt=(o,cur)=>Object.entries(o).map(([k,l])=>'<option value="'+k+'"'+(k===cur?' selected':'')+'>'+E(l)+'</option>').join('');
  const w=modal(sheetHead(id?'Reklamı düzenle':'Yeni reklam alanı')+'<div class="fdForm">'+
    '<label for="apP">Alan</label><select id="apP">'+opt(PLC,r.placement)+'</select>'+
    '<label for="apT">Başlık</label><input id="apT" maxlength="80" value="'+E(r.title)+'">'+
    '<label for="apS">Alt yazı</label><input id="apS" maxlength="140" value="'+E(r.subtitle||'')+'">'+
    '<label for="apI">Görsel adresi (https, isteğe bağlı)</label><input id="apI" inputmode="url" value="'+E(r.image_url||'')+'" placeholder="https://…">'+
    '<div class="two"><div><label for="apK">Dokununca</label><select id="apK">'+opt(TGT,r.target_kind)+'</select></div><div><label for="apC">Buton yazısı</label><input id="apC" maxlength="24" value="'+E(r.cta||'')+'" placeholder="İncele"></div></div>'+
    '<label for="apV">Restoran (restoran hedefi / sponsorlu kart için)</label><select id="apV"><option value="">—</option>'+APR.venues.map(v=>'<option value="'+E(v.id)+'"'+(v.id===r.venue_id?' selected':'')+'>'+E(v.name)+'</option>').join('')+'</select>'+
    '<label for="apX">Mutfak / arama kelimesi (mutfak veya arama hedefi için)</label><input id="apX" maxlength="120" value="'+E(r.target_kind==='venue'?'':(r.target_value||''))+'">'+
    '<div class="two"><div><label for="apA">Başlangıç</label><input id="apA" type="date" value="'+dv(r.starts_at)+'"></div><div><label for="apB">Bitiş (boş = süresiz)</label><input id="apB" type="date" value="'+dv(r.ends_at)+'"></div></div>'+
    '<div class="two"><div><label for="apR">Öncelik</label><input id="apR" type="number" min="0" max="100" value="'+(+r.priority||0)+'"></div><div style="align-self:end">'+sw('apSp',!!r.sponsored,'','Sponsorlu')+'</div></div>'+
    '<div class="fdErr" id="apE" hidden></div></div><div class="fdFoot">'+(id?'<button type="button" class="fb ghostBad" data-x="del">Sil</button>':'')+'<button type="button" class="fb pri" style="flex:1" data-x="ok">Kaydet</button></div>',{sheet:true,full:true});
  bindClose(w);const g=k=>w.querySelector('#'+k).value.trim();
  w.querySelector('[data-x=ok]').onclick=async function(){
    const err=w.querySelector('#apE');err.hidden=true;const fail=m=>{err.hidden=false;err.textContent=m;err.scrollIntoView({block:'center'})};
    const kind=g('apK'),ven=g('apV')||null,img=g('apI');
    if(g('apT').length<2)return fail('Başlık yaz.');if(img&&!/^https:\/\//.test(img))return fail('Görsel adresi https:// ile başlamalı.');
    if(kind==='venue'&&!ven)return fail('Restoran hedefi için restoran seç.');if((kind==='cuisine'||kind==='search')&&!g('apX'))return fail('Mutfak veya arama kelimesini yaz.');
    if(g('apP')==='home_feed'&&!ven)return fail('Sponsorlu restoran kartı için restoran seç.');
    const a=g('apA'),b=g('apB');if(a&&b&&b<=a)return fail('Bitiş, başlangıçtan sonra olmalı.');
    const body={placement:g('apP'),title:g('apT'),subtitle:g('apS')||null,image_url:img||null,cta:g('apC')||null,target_kind:kind,target_value:kind==='venue'?ven:kind==='none'?null:g('apX'),
      venue_id:ven,sponsored:w.querySelector('#apSp').checked,priority:Math.max(0,Math.min(100,+g('apR')||0)),ends_at:b?new Date(b+'T23:59:59').toISOString():null};
    if(a)body.starts_at=new Date(a+'T00:00:00').toISOString();else if(!id)body.starts_at=new Date().toISOString();
    await once('ap',this,async()=>{try{if(id)await Q('PATCH','food_promos?id=eq.'+id,body);else await Q('POST','food_promos',body);closeModal();toast('Kaydedildi');showFoodAdminPromos()}catch(e){fail(errMsg(e))}});
  };
  const d=w.querySelector('[data-x=del]');if(d)d.onclick=async function(){if(!(await confirmBox('Reklam silinsin mi?','Gösterim istatistikleri de silinir.','Sil',true)))return;
    await once('apd',this,async()=>{try{await Q('DELETE','food_promos?id=eq.'+id);closeModal();toast('Silindi');showFoodAdminPromos()}catch(e){toast(errMsg(e),'err')}})};
};
async function showFoodAdminReviews(tab){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;tab=tab==='all'?'all':'reported';
  const head='<div class="fdSeg" style="margin-bottom:12px"><button type="button" class="'+(tab==='reported'?'on':'')+'" onclick="showFoodAdminReviews(\'reported\')">Bildirilenler</button><button type="button" class="'+(tab==='all'?'on':'')+'" onclick="showFoodAdminReviews(\'all\')">Son yorumlar</button></div>';
  render(bar('Yorum moderasyonu','showFoodAdmin()')+head+skel('row',3));
  try{
    const w=await whoami(true);if(!w.is_admin)return render(bar('Yorum moderasyonu','showFoodAdmin()')+empty('🔒','Yetkin yok',''));
    let reps=[],mods=[];
    try{[reps,mods]=await Promise.all([Q('GET','food_review_reports?select=review_id,reason,created_at&order=created_at.desc&limit=300'),Q('GET','food_review_moderation?select=review_id,hidden,reason')])}
    catch(e){if(!alive(tok))return;return render(bar('Yorum moderasyonu','showFoodAdmin()')+(dbMissing(e)?DBWAIT:errBox(e,'showFoodAdminReviews()')))}
    const rc={};reps.forEach(r=>{(rc[r.review_id]=rc[r.review_id]||[]).push(r.reason)});const hid={};mods.forEach(m=>{if(m.hidden)hid[m.review_id]=m.reason||'Gizlendi'});
    const ids=Object.keys(rc);
    const q=tab==='reported'?(ids.length?'food_reviews?select=id,venue_id,venue_rating,courier_rating,comment,created_at&id=in.('+ids.map(encodeURIComponent).join(',')+')':null):'food_reviews?select=id,venue_id,venue_rating,courier_rating,comment,created_at&comment=not.is.null&order=created_at.desc&limit=60';
    const rows=q?await Q('GET',q):[];let vn={};
    const vids=[...new Set(rows.map(r=>r.venue_id))];if(vids.length){try{(await Q('GET','food_venues?select=id,name&id=in.('+vids.map(encodeURIComponent).join(',')+')')).forEach(v=>vn[v.id]=v.name)}catch(e){}}
    if(!alive(tok))return;
    if(tab==='reported')rows.sort((a,b)=>(rc[b.id]||[]).length-(rc[a.id]||[]).length);
    render(bar('Yorum moderasyonu','showFoodAdmin()')+head+(rows.length?'<div class="fdwAdmL">'+rows.map(r=>'<div class="fdwAdmP'+(hid[r.id]?' off':'')+'"><div class="h"><b>'+E(vn[r.venue_id]||'Restoran')+'</b><span class="fdStar">★ '+(+r.venue_rating||0)+'</span></div>'+
      '<small>'+E(dt(r.created_at))+(hid[r.id]?' · Gizli ('+E(hid[r.id])+')':'')+'</small>'+(r.comment?'<p>'+E(r.comment)+'</p>':'')+
      (rc[r.id]?'<div class="fdNote warn" style="margin:6px 0 0">🚩 '+rc[r.id].length+' bildirim: '+E([...new Set(rc[r.id])].slice(0,3).join(' · '))+'</div>':'')+
      '<div class="fdRow2">'+(hid[r.id]?'<button type="button" class="fb sm soft" onclick="foodAdmReview(\''+E(r.id)+'\',false,this)">Yayına al</button>':'<button type="button" class="fb sm ghostBad" onclick="foodAdmReview(\''+E(r.id)+'\',true,this)">Gizle</button>')+'</div></div>').join('')+'</div>':
      empty('💬',tab==='reported'?'Bildirilen yorum yok':'Yorum yok',tab==='reported'?'Müşteriler uygunsuz bir yorumu bildirdiğinde burada görünür.':'')));
  }catch(e){if(alive(tok))render(bar('Yorum moderasyonu','showFoodAdmin()')+head+errBox(e,'showFoodAdminReviews()'))}
}
window.foodAdmReview=async function(id,hide,btn){
  let reason=null;if(hide){reason=await promptBox('Yorumu gizle','Gerekçe',{required:true,danger:true,okLabel:'Gizle',chips:['Hakaret veya küfür','Kişisel bilgi','Sahte / reklam','Konuyla ilgisiz']});if(!reason)return}
  const tab=document.querySelector('.fdSeg button.on')&&/Son/.test(document.querySelector('.fdSeg button.on').textContent)?'all':'reported';
  await once('rm'+id,btn,async()=>{try{
    if(hide){try{await Q('POST','food_review_moderation',{review_id:id,hidden:true,reason:reason.slice(0,200)})}catch(e){if(/23505|duplicate/i.test(errMsg(e)))await Q('PATCH','food_review_moderation?review_id=eq.'+id,{hidden:true,reason:reason.slice(0,200)});else throw e}}
    else await Q('DELETE','food_review_moderation?review_id=eq.'+id);
    toast(hide?'Yorum gizlendi':'Yorum yeniden yayında');showFoodAdminReviews(tab)}catch(e){toast(errMsg(e),'err')}})};
/* ---------- V5 · Başvuru durumları (restoran + kurye, ortak aşamalar) ---------- */
const OB_ST=['application','documents','in_review','approved','active','suspended','rejected'];
async function showFoodOnboarding(kind){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;kind=kind==='venue'||kind==='courier'?kind:'';
  const head='<div class="fdChips" style="margin:0 0 12px">'+[['','Tümü'],['venue','Restoranlar'],['courier','Kuryeler']].map(([k,l])=>'<button type="button" class="fdChip'+(k===kind?' on':'')+'" onclick="showFoodOnboarding(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  render(bar('Başvurular','showFoodAdmin()')+head+skel('row',3));
  try{
    const rows=await RPC('pf_admin_onboarding_queue',{p_kind:kind||null});if(!alive(tok))return;
    const cnt={};(rows||[]).forEach(r=>cnt[r.stage]=(cnt[r.stage]||0)+1);
    const steps='<div class="fdwObSteps">'+OB_ST.slice(0,6).map(st=>{const l=(rows.find(r=>r.stage===st)||{}).stage_label||{application:'Başvuru',documents:'Belgeler',in_review:'İnceleme',approved:'Onaylandı',active:'Aktif',suspended:'Askıda'}[st];
      return '<div class="'+(cnt[st]?'on':'')+'"><b>'+(cnt[st]||0)+'</b><span>'+E(l)+'</span></div>'}).join('')+'</div>';
    render(bar('Başvurular','showFoodAdmin()',null,(rows||[]).length+' kayıt')+head+steps+
      (window.PF&&typeof PF.openAdmin==='function'?'<button type="button" class="fb block soft" style="margin:0 0 12px" onclick="PF.openAdmin()">Belge ve restoran onayları için yönetim paneli ›</button>':'')+
      ((rows||[]).length?'<div class="fdwAdmL">'+rows.map(r=>'<div class="fdwAdmP"><div class="h"><b>'+(r.kind==='venue'?'🏪 ':'🛵 ')+E(r.name||'—')+'</b><span class="fdPill">'+E(r.stage_label)+'</span></div>'+
        '<small>Belge: '+(+r.docs_total||0)+(+r.docs_pending?' · '+r.docs_pending+' inceleme bekliyor':'')+(+r.docs_rejected?' · '+r.docs_rejected+' reddedildi':'')+(+r.required_missing?' · <span class="fdBad">'+r.required_missing+' zorunlu belge eksik</span>':'')+' · '+E(ago(r.since))+'</small>'+
        (r.reason?'<p class="fdMuted fdSmall" style="margin:4px 0 0">'+E(r.reason)+'</p>':'')+
        '</div>').join('')+'</div>':empty('🗂️','Kayıt yok','')));
  }catch(e){if(alive(tok))render(bar('Başvurular','showFoodAdmin()')+head+errBox(e,'showFoodOnboarding()'))}
}
/* ---------- V5 · Operasyon merkezi (yalnız yönetim): alarmlar, acil durum anahtarları, bekleyen işler, son işlemler ---------- */
const OPS_SW=[['orders_enabled','Sipariş alma','Kapatınca yeni sipariş ve ödeme başlatılamaz; mevcut siparişler devam eder.'],
  ['venue_signup_enabled','Yeni restoran başvurusu','Kapatınca yeni restoran oluşturulamaz.'],
  ['courier_signup_enabled','Yeni kurye başvurusu','Kapatınca yeni kurye başvurusu alınmaz.'],
  ['coupons_enabled','Kampanya / kuponlar','Kapatınca kupon kodları uygulanmaz.'],
  ['online_payment_enabled','Online ödeme','Açmak için önce ödeme sağlayıcısı seçilmiş olmalı. Canlı mod ayrıca kilitlidir.']];
const OPS_K=[['active_orders','Aktif sipariş'],['late_orders','Geciken',1],['cancelled_24h','İptal (24 sa)'],['failed_payments_24h','Başarısız ödeme (24 sa)',1],
  ['refunds_pending','Bekleyen iade',1],['payouts_pending','Bekleyen hakediş'],['payouts_failed','Başarısız hakediş',1],['venues_in_review','Onay bekleyen restoran'],
  ['couriers_pending','Onay bekleyen kurye'],['open_issues','Açık şikâyet',1],['open_tickets','Açık destek talebi'],['review_reports','Bildirilen yorum',1],
  ['active_campaigns','Aktif kampanya'],['venues_suspended','Askıdaki restoran'],['couriers_suspended','Askıdaki kurye']];
async function showFoodOpsCenter(){
  if(!A())return;const tok=newScreen();FDW_PANEL=1;
  render(bar('Operasyon merkezi','showFoodAdmin()')+skel('row',4));
  try{
    const d=await RPC('pf_admin_ops_center');if(!alive(tok))return;
    const c=d.counts||{},swv=d.switches||{},al=d.alerts||[];
    const sev={critical:['Kritik','bad'],warn:['Uyarı','warn'],info:['Bilgi','']};
    render(bar('Operasyon merkezi','showFoodAdmin()','<button type="button" class="fb sm" onclick="showFoodOpsCenter()" aria-label="Yenile">↻</button>','Güncellendi '+hm(d.generated_at))+
      (c.critical_alerts?'<div class="fdNote bad" role="alert" style="margin:0 0 12px">⚠️ <b>'+c.critical_alerts+' kritik alarm</b> açık.</div>':'')+
      '<div class="fdSecH"><b>Açık alarmlar · '+al.length+'</b></div>'+
      (al.length?'<div class="fdwAdmL">'+al.map(a=>'<div class="fdwAdmP"><div class="h"><b style="white-space:normal">'+E(a.title)+'</b><span class="fdPill '+(sev[a.severity]||['',''])[1]+'">'+E((sev[a.severity]||[a.severity])[0])+'</span></div>'+
        '<small>'+E(a.kind)+' · ilk '+E(dt(a.first_seen))+' · son '+E(ago(a.last_seen))+(a.hits>1?' · '+a.hits+' kez':'')+'</small>'+
        '<div class="fdRow2"><button type="button" class="fb sm" onclick="foodOpsResolve('+(+a.id)+',this)">Kapat</button></div></div>').join('')+'</div>':
        '<p class="fdMuted fdSmall">Açık alarm yok. Sistem 2 dakikada bir kontrol ediliyor.</p>')+
      '<div class="fdSecH"><b>Acil durum anahtarları</b></div><div class="fdwAdmL">'+OPS_SW.map(([k,l,h])=>{const on=swv[k]===true;
        return '<div class="fdwAdmP"><div class="h"><b>'+E(l)+'</b>'+sw('ops_'+k,on,"foodOpsSwitch('"+k+"',this)")+'</div><small>'+E(h)+'</small></div>'}).join('')+'</div>'+
      '<p class="fdMuted fdSmall" style="margin:6px 2px 0">Ödeme modu: <b>'+E(String(swv.payment_mode||'sandbox'))+'</b> · Sağlayıcı: <b>'+E(String(swv.payment_provider||'none'))+'</b>'+(swv.courier_demo_auto_approve===true?' · <span class="fdBad">Demo kurye otomatik onayı açık</span>':'')+'</p>'+
      '<div class="fdSecH"><b>Bekleyen işler</b></div><div class="fdwRep">'+OPS_K.map(([k,l,hot])=>'<div><small>'+E(l)+'</small><b class="'+(hot&&+c[k]?'fdBad':'')+'">'+(+c[k]||0)+'</b></div>').join('')+'</div>'+
      '<div class="fdSecH"><b>Son kritik işlemler (denetim kaydı)</b></div>'+((d.recent_audit||[]).length?'<div class="fdCard">'+d.recent_audit.map(x=>'<div class="fdLine"><span>'+E(x.action)+'<br><small class="fdMuted">'+E(x.target_type||'')+' '+E(String(x.target_id||'').slice(0,12))+'</small></span><span style="text-align:right"><small class="fdMuted">'+E(ago(x.created_at))+'</small></span></div>').join('')+'</div>':'<p class="fdMuted fdSmall">Kayıt yok.</p>'));
  }catch(e){if(alive(tok))render(bar('Operasyon merkezi','showFoodAdmin()')+errBox(e,'showFoodOpsCenter()'))}
}
window.foodOpsSwitch=async function(key,inp){
  const on=inp.checked;let reason=null;
  if(!on){reason=await promptBox('Kapatma nedeni','Kısa açıklama (denetim kaydına yazılır)',{required:true,danger:true,okLabel:'Kapat',chips:['Yoğunluk','Teknik sorun','Bakım','Ödeme sorunu']});if(!reason){inp.checked=true;return}}
  inp.disabled=true;
  try{await RPC('pf_admin_set_switch',{p_key:key,p_enabled:on,p_reason:reason});toast(on?'Açıldı':'Kapatıldı');showFoodOpsCenter()}
  catch(e){inp.checked=!on;inp.disabled=false;toast(errMsg(e),'err')}
};
window.foodOpsResolve=async function(id,btn){
  const n=await promptBox('Alarmı kapat','Ne yapıldı?',{required:true,okLabel:'Kapat',chips:['Kontrol edildi, sorun yok','Elle düzeltildi','Test kaydı']});if(!n)return;
  await once('ar'+id,btn,async()=>{try{await RPC('pf_admin_resolve_alert',{p_id:id,p_note:n});toast('Alarm kapatıldı');showFoodOpsCenter()}catch(e){toast(errMsg(e),'err')}});
};
let SETA={};
window.foodSetting=async function(k,v,el){el.disabled=true;try{await RPC('food_admin_set_setting',{p_key:k,p_value:v});SETS=null;toast('Ayar kaydedildi')}catch(e){toast(errMsg(e),'err');if(el.type==='checkbox')el.checked=!v}finally{el.disabled=false}};
window.foodAdmCourier=async function(uid,st,btn){
  let note=null;
  if(st==='rejected'||st==='suspended'){note=await promptBox(st==='rejected'?'Başvuruyu reddet':'Kuryeyi askıya al','Gerekçe',{required:true,danger:true,okLabel:st==='rejected'?'Reddet':'Askıya al',text:'Gerekçe kuryeye bildirilir.',chips:st==='rejected'?['Telefon doğrulanamadı','Bilgiler eksik','Bölgede kurye ihtiyacı yok']:['Müşteri şikâyeti','Teslimat kurallarına uyulmadı']});if(!note)return}
  await once('ac'+uid,btn,async()=>{try{await RPC('food_admin_review_courier',{p_user_id:uid,p_status:st,p_note:note});toast(st==='approved'?'Kurye onaylandı':st==='rejected'?'Başvuru reddedildi':'Kurye durumu güncellendi');showFoodAdmin()}catch(e){toast(errMsg(e),'err')}});
};
window.foodAdmIssue=async function(id,st,btn){const r=await promptBox('Açıklama','Müşteriye iletilecek',{required:true});if(!r)return;await once('ai'+id,btn,async()=>{try{await RPC('food_update_issue',{p_issue_id:id,p_status:st,p_resolution:r});showFoodAdmin()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmVenue=function(id,bps,fee,active){
  const w=modal(sheetHead('Restoran ücretleri')+'<div class="fdForm"><label for="avB">Komisyon (%)</label><input id="avB" inputmode="decimal" value="'+(bps/100)+'"><label for="avF">Hizmet bedeli (TL, sipariş başına)</label><input id="avF" inputmode="decimal" value="'+kurusToTl(fee)+'">'+
    '<div style="margin-top:14px">'+sw('avA',active,'','Restoran aktif')+'</div><div class="fdErr" id="avE" hidden></div></div><button type="button" class="fb pri block" style="margin-top:14px" data-x="ok">Kaydet</button>',{sheet:true});
  bindClose(w);
  w.querySelector('[data-x=ok]').onclick=async function(){const b=Math.round(parseFloat(w.querySelector('#avB').value.replace(',','.'))*100),f=tlToKurus(w.querySelector('#avF').value);const e=w.querySelector('#avE');
    if(!(b>=0&&b<=5000)){e.hidden=false;e.textContent='Komisyon %0-50 arası olmalı.';return}if(isNaN(f)){e.hidden=false;e.textContent='Hizmet bedelini doğru gir.';return}
    await once('av',this,async()=>{try{await RPC('food_admin_set_venue',{p_venue_id:id,p_commission_bps:b,p_platform_fee_kurus:f,p_is_active:w.querySelector('#avA').checked});closeModal();toast('Kaydedildi');showFoodAdmin()}catch(x){e.hidden=false;e.textContent=errMsg(x)}})};
};


/* ====================== V4 · Ayrı dünya: tema, üst başlık, alt menü, Hesabım ======================
   Yalnızca Yemek ekranları açıkken (#fdRoot varken) body.fdWorld sınıfı eklenir. Diğer İşimi Çöz ekranlarına
   geçildiğinde sınıf ve kabuk otomatik kaldırılır; ana platformun başlığı ve alt menüsü aynen geri gelir. */
const FDW_ICO={
  back:'<path d="M15 5l-7 7 7 7"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bag:'<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  store:'<path d="M4 9l1.6-5h12.8L20 9"/><path d="M4 9h16v1.5a2.7 2.7 0 0 1-5.3.8 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3-.8z"/><path d="M5.5 12.5V20h13v-7.5"/>',
  dish:'<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 8V6M10.5 6h3M3 16h18M5 19h14"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  ticket:'<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17h.01"/>',
  shield:'<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/>',
  bike:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h5l3 7M10 10l-1-3H7M15 10l1-3h2"/>',
  out:'<path d="M15 12H4M8 8l-4 4 4 4"/><path d="M13 4h6v16h-6"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'
};
function fdIco(k,s){s=s||22;return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(FDW_ICO[k]||'')+'</svg>'}
let FDW_TAB='',FDW_PANEL=0;
function fdwEnter(){document.body.classList.add('fdWorld');fdwShell()}
function fdwLeave(){document.body.classList.remove('fdWorld');['fdwTop','fdwNav'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove()})}
function fdwShell(){
  if(!document.getElementById('fdwTop')){
    const h=document.createElement('header');h.id='fdwTop';h.className='fdwTop';
    h.innerHTML='<button type="button" class="fdwIco" id="fdwBack" onclick="foodBack()" aria-label="İşimi Çöz ana sayfasına dön" title="İşimi Çöz’e dön">'+fdIco('back',20)+'</button>'+
      '<button type="button" class="fdwBrand" onclick="showFoodHome()" aria-label="İşimi Çöz Yemek ana sayfası"><span class="mk">'+fdIco('dish',20)+'</span><span class="wm"><small>İşimi Çöz</small><b>Yemek</b></span></button>'+
      '<div class="fdwPT" id="fdwPT" hidden><b></b><small></small></div>'+
      '<span class="fdwSlot" id="fdwSlot"></span>'+
      '<button type="button" class="fdwIco fdwPanelB" id="fdwPanelB" onclick="foodPanels()" aria-label="Paneller" title="İşletme / Kurye / Yönetim" hidden>'+fdIco('grid',20)+'<i hidden></i></button>'+
      '<button type="button" class="fdwIco fdwTheme" onclick="toggleAppTheme()" aria-label="Açık/koyu tema"></button>'+
      '<button type="button" class="fdwCart" id="fdwCart" onclick="showFoodCart()" aria-label="Sepet">'+fdIco('bag',20)+'<b id="fdwCartT"></b></button>';
    document.body.appendChild(h);
  }
  if(!document.getElementById('fdwNav')){
    const n=document.createElement('nav');n.id='fdwNav';n.className='fdwNav';n.setAttribute('aria-label','Yemek menüsü');
    const it=(k,ic,l,fn,mid)=>'<button type="button" data-tab="'+k+'"'+(mid?' class="mid"':'')+' onclick="'+fn+'">'+(mid?'<span class="c">'+fdIco(ic,24)+'<i id="fdwNavN" hidden></i></span>':fdIco(ic,23))+'<span class="l">'+l+'</span></button>';
    n.innerHTML='<div class="in">'+it('home','store','Keşfet','showFoodHome()')+it('search','search','Ara','showFoodSearch()')+it('cart','bag','Sepet','showFoodCart()',1)+it('orders','receipt','Siparişler','showFoodOrders()')+it('account','user','Hesabım','showFoodAccount()')+'</div>';
    document.body.appendChild(n);
  }
  fdwCart();
}
/* Tek üst başlık: sayfanın kendi başlık satırı (.fdBar) kabuğa taşınır; ikinci başlık/geri düğmesi görünmez. */
let FDW_BACK=null;
window.foodBack=function(){if(FDW_BACK&&FDW_BACK.isConnected){FDW_BACK.click();return}if(fdwIsHome())return showHome();showFoodHome()};
function fdwIsHome(){return !FDW_PANEL&&!!document.querySelector('#fdRoot > .fdwHomeTop')}
function fdwSync(){
  qa('#fdwNav [data-tab]').forEach(b=>{const on=!!FDW_TAB&&!FDW_PANEL&&b.dataset.tab===FDW_TAB;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  document.body.classList.toggle('fdwPanel',!!FDW_PANEL);
  const top=document.getElementById('fdwTop');if(!top)return;
  const root=document.getElementById('fdRoot');const bar=root&&root.querySelector(':scope > .fdBar');
  const slot=document.getElementById('fdwSlot'),pt=document.getElementById('fdwPT'),back=document.getElementById('fdwBack');
  if(slot)slot.innerHTML='';
  FDW_BACK=null;
  if(bar){
    const bb=bar.querySelector(':scope > .fdIco[aria-label="Geri"]');FDW_BACK=bb||null;
    const t=bar.querySelector(':scope > .t');const tb=t&&t.querySelector('b'),ts=t&&t.querySelector('span');
    const title=(tb&&tb.textContent.trim())||'';
    if(title&&pt){pt.hidden=false;pt.querySelector('b').textContent=title;const sm=pt.querySelector('small');sm.textContent=(ts&&ts.textContent)||'';sm.hidden=!sm.textContent}
    else if(pt)pt.hidden=true;
    top.classList.toggle('pg',!!title);
    if(slot)[...bar.children].filter(x=>x!==bb&&x!==t).forEach(x=>slot.appendChild(x));
    bar.classList.add('fdwMoved');bar.setAttribute('aria-hidden','true');
  }else{top.classList.remove('pg');if(pt)pt.hidden=true}
  if(back){const home=!bar&&fdwIsHome();back.setAttribute('aria-label',home?'İşimi Çöz ana sayfasına dön':'Geri');back.title=home?'İşimi Çöz’e dön':'Geri'}
  fdwFlBar();fdwPanelBtn();
}
/* Panel erişimi: yalnız işletmesi, kurye hesabı veya yönetim yetkisi olan kullanıcıya görünür */
let FDW_PN=null,FDW_PN_AT=0;
async function fdwPanelBtn(){
  const b=document.getElementById('fdwPanelB');if(!b)return;
  const hb=document.getElementById('fdwPanelH');if(FDW_PANEL){b.hidden=true;if(hb)hb.hidden=true;return}
  try{
    const w=await whoami();const has=!!(w&&((w.venues||[]).length||w.courier||w.is_admin));const home=!!hb;b.hidden=!has||!!FDW_PANEL||home;if(hb)hb.hidden=!has;if(!has)return;
    const v=(w.venues||[])[0];
    if(v&&Date.now()-FDW_PN_AT>60000){FDW_PN_AT=Date.now();try{const r=await RPC('food_venue_orders',{p_venue_id:v.id,p_section:'new',p_limit:1,p_offset:0});FDW_PN=+((r&&r.counts)||{}).new||0}catch(e){}}
    const n=v?FDW_PN||0:0;[b,hb].forEach(x=>{if(!x)return;const i=x.querySelector('i');i.hidden=!n;i.textContent=n>9?'9+':String(n)});b.setAttribute('aria-label',n?'Paneller, '+n+' yeni sipariş onay bekliyor':'Paneller');
  }catch(e){}
}
window.foodPanels=async function(){
  let w={};try{w=await whoami()}catch(e){}
  const r=(ic,t,sub,fn)=>'<button type="button" class="fdwRow" onclick="closeFoodModal();'+fn+'"><span class="ic">'+fdIco(ic,21)+'</span><span class="tx"><b>'+E(t)+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</span><span class="ch" aria-hidden="true">›</span></button>';
  const v=(w.venues||[])[0];const n=FDW_PN||0;
  const m=modal(sheetHead('Paneller','Sipariş verme ekranından ayrı çalışır')+'<div class="fdwList">'+
    r('store','İşletmem',v?(n?n+' yeni sipariş onay bekliyor · ':'')+v.name:'Restoranını yönet veya işletmeni ekle','showFoodBusiness()')+
    r('bike','Kurye',w.courier?'Teslimatlar ve kazanç':'Kurye paneli veya kurye başvurusu','showFoodCourier()')+
    (w.is_admin?r('gear','Yemek yönetimi','Platform yönetim paneli','showFoodAdmin()'):'')+'</div>',{sheet:true});
  bindClose(m);
};
window.closeFoodModal=closeModal;
function fdwCart(){
  const t=document.getElementById('fdwCartT'),n=document.getElementById('fdwNavN');if(!t&&!n)return;
  const c=cartCount();
  if(t)t.textContent=c?M(cartEst()):'';
  const btn=document.getElementById('fdwCart');if(btn){btn.classList.toggle('has',!!c);btn.setAttribute('aria-label',c?'Sepet, '+c+' ürün, '+M(cartEst()):'Sepet boş')}
  if(n){n.hidden=!c;n.textContent=c>9?'9+':String(c)}
}
/* Yemek dışına çıkılınca kabuğu kaldır */
(function(){const app=document.getElementById('app');if(!app||!window.MutationObserver)return;
  new MutationObserver(()=>{if(!document.getElementById('fdRoot')&&document.body.classList.contains('fdWorld'))fdwLeave()}).observe(app,{childList:true})})();
window.addEventListener('storage',e=>{if(e.key===CART_KEY)fdwCart()});

/* Hesabım */
async function showFoodAccount(){
  if(!A())return;FDW_TAB='account';const tok=newScreen();
  const u=(S()&&S().user)||{};const name=(u.user_metadata&&(u.user_metadata.full_name||u.user_metadata.name))||'';
  const r=(ic,t,sub,fn,cls)=>'<button type="button" class="fdwRow'+(cls?' '+cls:'')+'" onclick="'+fn+'"><span class="ic">'+fdIco(ic,21)+'</span><span class="tx"><b>'+E(t)+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</span><span class="ch" aria-hidden="true">›</span></button>';
  render('<div class="fdwAcc"><div class="fdwMe"><span class="av">'+E((name||u.email||'?').trim().charAt(0).toLocaleUpperCase('tr'))+'</span><span class="tx"><b>'+E(name||'Hesabım')+'</b><small>'+E(u.email||'')+'</small></span></div>'+
    '<div class="fdwQuick"><button type="button" onclick="showFoodOrders()">'+fdIco('receipt',24)+'<b>Siparişlerim</b></button><button type="button" onclick="foodAccFavs()">'+fdIco('heart',24)+'<b>Favorilerim</b></button></div>'+
    '<div class="fdwList">'+r('ticket','Kuponlarım','Kullanabileceğin indirimler','showFoodCoupons()')+r('pin','Adreslerim','Teslimat adreslerini yönet',"foodAddrSheet('account')")+r('bell','Bildirimler','Sipariş ve kampanya bildirimleri','showFoodNotifications()')+
    r('help','Yardım ve destek','Sık sorulanlar, sorun bildir, destek talebi','showFoodHelp()')+r('shield','Hesap ve güvenlik','Kullanıcı bilgilerin','location.href=\'./marketplace-profile.html\'')+
    (pfFn('openPrivacy')?r('shield','Gizlilik ve verilerim','KVKK, izinler, verilerini indir','PF.openPrivacy()'):'')+'</div>'+
    '<div class="fdSecH"><b>İş ortaklığı</b></div><div class="fdwList" id="fdwAccRoles">'+r('store','İşletmem','Restoranını yönet veya işletmeni ekle','showFoodBusiness()')+r('bike','Kurye','Kurye paneli veya kurye başvurusu','showFoodCourier()')+'</div>'+
    '<div class="fdwList">'+r('out','İşimi Çöz’e dön','Ana platforma geç','showHome()')+'</div></div>');
  try{const w=await whoami();if(!alive(tok))return;if(w&&w.is_admin){const box=document.getElementById('fdwAccRoles');if(box)box.insertAdjacentHTML('beforeend',r('gear','Yemek yönetimi','Platform yönetim paneli','showFoodAdmin()'))}}catch(e){}
}
function pfFn(n){try{return !!(window.PF&&typeof PF[n]==='function')}catch(e){return false}}
const FAQ=[
 ['Siparişimi nasıl iptal ederim?','Restoran siparişi onaylamadan önce Siparişlerim › Detay ekranından iptal edebilirsin. Onaylandıktan sonra iptal için restoranı ara ya da sorun bildir.'],
 ['Eksik veya yanlış ürün geldi, ne yapmalıyım?','Siparişlerim › ilgili sipariş › “Sorun bildir” ile eksik/yanlış ürünü seç. Bildirimin doğrudan restorana iletilir ve durumunu aynı ekrandan izleyebilirsin.'],
 ['Kapıda ödeme nasıl oluyor?','Kapıda nakit veya kapıda kart seçebilirsin. Tutar kuryeye/restorana teslimatta ödenir. Online kartla ödeme açıldığında ödeme ekranında ayrıca görünür.'],
 ['Teslimat kodu nedir?','Kurye getirdiğinde siparişin sana ulaştığını doğrulamak için kullanılan 4 haneli koddur. Kodu yalnızca siparişi teslim aldığında kuryeye söyle.'],
 ['Alerjen bilgisini nereden görürüm?','Restoranın girdiği alerjen bilgisi ürünün altında “⚠ Alerjen” olarak görünür. Emin olmadığın durumda sipariş notu yaz veya restoranı ara.'],
 ['Kuponu nasıl kullanırım?','Kuponlarım ekranında koda dokunduğunda kod kaydedilir ve sepette uygun olduğunda otomatik uygulanır. Alt limit ve süre kuponda yazar.'],
 ['Yorumum neden görünmüyor?','Yorumlar kurallara uygunluk kontrolünden geçebilir. Hakaret, kişisel bilgi veya reklam içeren yorumlar yayından kaldırılır.']];
async function showFoodHelp(){
  if(!A())return;FDW_TAB='account';newScreen();
  const r=(ic,t,sub,fn)=>'<button type="button" class="fdwRow" onclick="'+fn+'"><span class="ic">'+fdIco(ic,21)+'</span><span class="tx"><b>'+E(t)+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</span><span class="ch" aria-hidden="true">›</span></button>';
  render(bar('Yardım ve destek','showFoodAccount()')+
    '<div class="fdwList">'+r('receipt','Siparişimle ilgili sorun','Eksik/yanlış ürün, gecikme, ödeme','showFoodOrders()')+
    (pfFn('openSupport')?r('help','Destek taleplerim','Yeni talep aç veya mevcutları izle','PF.openSupport()'):'')+'</div>'+
    '<div class="fdSecH"><b>Sık sorulanlar</b></div><div class="fdwFaq">'+FAQ.map(q=>'<details><summary>'+E(q[0])+'</summary><p>'+E(q[1])+'</p></details>').join('')+'</div>'+
    ((pfFn('openLegal')||pfFn('openCompany'))?'<div class="fdwList" style="margin-top:14px">'+(pfFn('openLegal')?r('shield','Yasal metinler','Kullanıcı sözleşmesi, KVKK, çerezler','PF.openLegal()'):'')+(pfFn('openCompany')?r('store','Künye ve iletişim','Platform işletmecisi bilgileri','PF.openCompany()'):'')+'</div>':'')+
    '<p class="fdMuted fdSmall" style="margin:14px 2px 0">Yemek siparişlerinde satıcı ilgili restorandır; İşimi Çöz aracı platformdur.</p>');
}
window.foodAccFavs=async function(){
  if(!A())return;const tok=newScreen();FDW_TAB='account';
  render(bar('Favorilerim','showFoodAccount()')+'<div id="fdwFavL">'+skel('card',2)+'</div>');
  try{const f=await favLoad(true);const ids=[...f];if(!alive(tok))return;
    if(!ids.length){setHTML('fdwFavL',empty('♡','Henüz favorin yok','Beğendiğin restoranlarda kalbe dokun, burada toplansın.','<button type="button" class="fb pri" onclick="showFoodHome()">Restoranları keşfet</button>'));return}
    const rows=await Q('GET','food_venues?select='+VSEL+'&id=in.('+ids.map(encodeURIComponent).join(',')+')');if(!alive(tok))return;
    setHTML('fdwFavL','<div class="fdGrid">'+rows.map(venueCard).join('')+'</div>');
  }catch(e){setHTML('fdwFavL',errBox(e,'foodAccFavs()'))}
};


/* ---------- V4 · Reklam / kampanya alanları (food_promos) ----------
   Tablo yoksa ya da boşsa sessizce gerçek içerikle (öne çıkan restoranlar) devam eder. */
const PROMO_SEL='id,placement,title,subtitle,image_url,cta,target_kind,target_value,venue_id,cuisine,district,sponsored,priority';
async function promosLoad(tok){
  try{const r=await Q('GET','food_promos?select='+PROMO_SEL+'&order=priority.desc,created_at.desc&limit=40');if(tok!=null&&!alive(tok))return;HF.promos=Array.isArray(r)?r:[]}
  catch(e){HF.promos=[]}
}
function promoDistrictOk(p){if(!p.district)return true;try{const a=addrGet();const t=((a&&a.text)||'').toLocaleLowerCase('tr');return !t||t.includes(String(p.district).toLocaleLowerCase('tr'))}catch(e){return true}}
function promosFor(pl){return (HF.promos||[]).filter(p=>p.placement===pl&&promoDistrictOk(p))}
function promoTrack(ids,kind){ids=(ids||[]).filter(Boolean);if(!ids.length)return;
  if(kind==='view'){const day=new Date().toISOString().slice(0,10);let seen={};try{seen=JSON.parse(sessionStorage.getItem('isimi_food_pv')||'{}')}catch(e){}
    ids=ids.filter(id=>seen[id]!==day);if(!ids.length)return;ids.forEach(id=>seen[id]=day);try{sessionStorage.setItem('isimi_food_pv',JSON.stringify(seen))}catch(e){}}
  RPC('food_promo_track',{p_ids:ids.slice(0,20),p_kind:kind}).catch(()=>{});
}
function promoSeen(){setTimeout(()=>promoTrack(qa('#fdRoot [data-promo]').map(e=>e.dataset.promo),'view'),600)}
window.foodPromoClick=function(id){
  const p=(HF.promos||[]).find(x=>x.id===id);promoTrack([id],'click');if(!p)return;
  if(p.target_kind==='venue'&&(p.target_value||p.venue_id))return showFoodVenue(p.target_value||p.venue_id);
  if(p.target_kind==='cuisine'&&p.target_value){HF.cuisine=p.target_value;if(document.getElementById('fdList')){homeRender();const c=document.getElementById('fdCuis');c&&c.scrollIntoView({behavior:'smooth',block:'start'})}else showFoodHome();return}
  if(p.target_kind==='search'&&p.target_value)return showFoodSearch(p.target_value);
  if(p.venue_id)return showFoodVenue(p.venue_id);
};
function promoSlide(p){
  return '<button type="button" class="fdwSl'+(p.image_url?'':' noimg')+'" data-promo="'+E(p.id)+'" onclick="foodPromoClick(\''+E(p.id)+'\')" aria-label="'+E(p.title)+'">'+
    (p.image_url?'<img src="'+E(p.image_url)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+
    '<span class="ov">'+(p.sponsored?'<small class="sp">Sponsorlu</small>':'')+'<b>'+E(p.title)+'</b>'+(p.subtitle?'<em>'+E(p.subtitle)+'</em>':'')+(p.cta?'<i>'+E(p.cta)+' ›</i>':'')+'</span></button>';
}
/* Gerçek içerikli yedek slaytlar: kapak fotoğrafı olan, açık ve puanlı restoranlar (sahte rakam yok) */
function heroFallback(){
  return HF.rows.filter(v=>v.cover_url&&openNow(v)).sort((a,b)=>(+b.rating_count)-(+a.rating_count)).slice(0,4).map(v=>({id:'',_v:v}));
}
function heroRender(tok){
  const box=document.getElementById('fdwHero');if(!box)return;
  const pr=promosFor('home_hero');
  const slides=pr.length?pr.map(promoSlide):heroFallback().map(x=>{const v=x._v;const cs=venueCats(v);
    return '<button type="button" class="fdwSl" onclick="showFoodVenue(\''+E(v.id)+'\')" aria-label="'+E(v.name)+'"><img src="'+E(v.cover_url)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">'+
      '<span class="ov"><small>Öne çıkan restoran</small><b>'+E(v.name)+'</b><em>'+E([cs.slice(0,2).join(' · '),etaText(v)].filter(Boolean).join(' · '))+'</em><i>Menüyü gör ›</i></span></button>'});
  if(!slides.length){box.innerHTML='';return}
  box.innerHTML='<div class="fdwHero" aria-roledescription="carousel" aria-label="Kampanyalar ve öne çıkanlar"><div class="tr" id="fdwHeroTr">'+slides.join('')+'</div>'+
    (slides.length>1?'<div class="dots" aria-hidden="true">'+slides.map((_,i)=>'<i class="'+(i?'':'on')+'"></i>').join('')+'</div>':'')+'</div>'+
    (pr.length?'<div class="fdwNoteT">Görseller temsilidir.</div>':'');
  const tr=document.getElementById('fdwHeroTr');if(!tr||slides.length<2){promoSeen();return}
  let idx=0,user=false,timer=null;const dots=qa('.fdwHero .dots i');
  const upd=()=>{const w=tr.clientWidth||1;idx=Math.round(tr.scrollLeft/w);dots.forEach((d,i)=>d.classList.toggle('on',i===idx))};
  tr.addEventListener('scroll',()=>{clearTimeout(tr._t);tr._t=setTimeout(upd,80)},{passive:true});
  ['touchstart','pointerdown','wheel'].forEach(ev=>tr.addEventListener(ev,()=>{user=true},{passive:true}));
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce){timer=setInterval(()=>{if(user||!document.body.contains(tr))return;idx=(idx+1)%slides.length;tr.scrollTo({left:idx*tr.clientWidth,behavior:'smooth'})},5500);onCleanup(()=>clearInterval(timer))}
  promoSeen();
}
function promoBanner(pl){const p=promosFor(pl)[0];if(!p)return '';return '<div class="fdwMidB">'+promoSlide(p)+'</div>'}
/* Kuponlarım şeridi (kuponlar platformda açıksa ve fonksiyon varsa) */
let PFS_AT=0;
/* Platform ayarları: katman henüz yüklenmediyse kısa süre bekle; yönetimden değişen kupon anahtarı için 60 sn'de bir tazele */
async function pfSettingsFresh(){
  if(!window.PF)return;
  try{if(PF.ready&&!PF.settings)await Promise.race([PF.ready,sleep(4000)])}catch(e){}
  if(!PF.enabled||Date.now()-PFS_AT<60000)return;PFS_AT=Date.now();
  try{const st=await RPC('pf_public_settings');if(st&&typeof st==='object'&&!Array.isArray(st))PF.settings=Object.assign({},PF.settings||{},st)}catch(e){}
}
async function couponsLoad(tok){
  HF.coupons=[];
  try{await pfSettingsFresh();if(!(window.PF&&PF.settings&&PF.settings.coupons_enabled===true))return;const r=await RPC('food_public_coupons',{p_venue_id:null});if(tok!=null&&!alive(tok))return;HF.coupons=Array.isArray(r)?r:[];const sn=HF.coupons[0]&&HF.coupons[0].server_now;if(sn){const d=new Date(sn)-Date.now();if(Number.isFinite(d))FL_OFF=d}}catch(e){HF.coupons=[]}
  if(tok!=null&&alive(tok))setHTML('fdwCoupons',couponStrip(HF.coupons.filter(c=>!c.flash_group)));
}
function couponTxt(c){return c.kind==='percent'?'%'+c.value+' indirim':M(c.value)+' indirim'}
function couponStrip(list){if(!list||!list.length)return '';
  return '<div class="fdSecH"><b>Kuponların</b><button type="button" class="fb ghost" onclick="showFoodCoupons()">Tümü ›</button></div><div class="fdwCoupons">'+list.slice(0,8).map(c=>
    '<button type="button" class="fdwCp" onclick="foodCopyCoupon(\''+E(c.code)+'\')"><b>'+E(couponTxt(c))+'</b><small>'+(+c.min_subtotal_kurus?'Alt limit '+M(c.min_subtotal_kurus):'Alt limit yok')+(c.venue_name?' · '+E(c.venue_name):'')+'</small><em>Kod: '+E(c.code)+'</em></button>').join('')+'</div>'}
window.foodCopyCoupon=function(code){try{navigator.clipboard&&navigator.clipboard.writeText(code)}catch(e){}try{sessionStorage.setItem('isimi_food_coupon',code)}catch(e){}toast('Kupon kodu sepette otomatik uygulanacak: '+code)};
async function showFoodCoupons(){
  if(!A())return;const tok=newScreen();FDW_TAB='account';
  render(bar('Kuponlarım','showFoodAccount()')+'<div id="fdwCpL">'+skel('row',3)+'</div>');
  await couponsLoad(null);if(!alive(tok))return;
  const fg=flashGroups();
  setHTML('fdwCpL',HF.coupons.length?fg.map(g=>'<div class="fdwCpRow fl"><div><b>⚡ '+E(g.title)+'</b><small>'+g.tiers.map(t=>(+t.min_subtotal_kurus?M(t.min_subtotal_kurus)+' üzeri ':'')+tierTxt(t)).join(' · ')+'</small><small>'+(g.all?'Tüm restoranlar':g.vids.length+' restoranda geçerli')+' · Sepetine uyan kademe otomatik seçilir'+(g.end?' · Kalan '+'<span data-fl-end="'+g.end+'">'+fmtLeft(g.end-(Date.now()+FL_OFF))+'</span>':'')+'</small></div></div>').join('')+'<div class="fdwCpList">'+HF.coupons.filter(c=>!c.flash_group).map(c=>'<div class="fdwCpRow"><div><b>'+E(couponTxt(c))+'</b><small>'+E(c.title||'')+'</small><small>'+(+c.min_subtotal_kurus?'Alt limit '+M(c.min_subtotal_kurus):'Alt limit yok')+(c.max_discount_kurus?' · En fazla '+M(c.max_discount_kurus):'')+(c.venue_name?' · '+E(c.venue_name):' · Tüm restoranlar')+(c.first_order_only?' · İlk siparişe özel':'')+(c.ends_at?' · Son gün '+new Date(c.ends_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long'}):'')+'</small></div><button type="button" class="fb sm soft" onclick="foodCopyCoupon(\''+E(c.code)+'\')">'+E(c.code)+'</button></div>').join('')+'</div>':
    empty('🎟️','Şu an kullanılabilir kupon yok','Yeni kampanyalar başladığında burada görünecek.'));
  flashTick(tok);
}
/* Liste görünümü satırı */
function venueRow(v,ad){
  if(!ad||typeof ad!=='object')ad=null;const open=openNow(v);const cs=venueCats(v);const km=venueKm(v);const pickupOnly=v.delivery_mode==='pickup';const free=!pickupOnly&&!+v.delivery_fee_kurus;
  return '<div class="fdVCard fdwRowV'+(open?'':' closed')+(ad?' spon':'')+'" role="button" tabindex="0" '+(ad?'data-promo="'+E(ad.id)+'" ':'')+'onclick="'+(ad?'foodPromoClick(\''+E(ad.id)+'\')':'showFoodVenue(\''+E(v.id)+'\')')+'" onkeydown="if(event.key===\'Enter\'&&event.target===this)this.click()">'+
    '<span class="im">'+pic(v.cover_url||v.image_url||'',v.name,'sq',catIcon(cs[0]))+(open?'':'<span class="cl">Kapalı</span>')+'</span>'+
    '<span class="bd"><span class="h"><h3>'+E(v.name)+'</h3>'+favBtn(v.id)+'</span>'+
    '<span class="r1">'+ratingTxt(v)+'<span class="fdMuted">'+E(cs.slice(0,2).join(' · ')||'Restoran')+'</span></span>'+
    '<span class="mt"><span>⏱ '+etaText(v)+'</span>'+(+v.min_order_amount?'<span>Min. '+M(v.min_order_amount)+'</span>':'')+(km!=null?'<span>'+km.toFixed(1).replace('.',',')+' km</span>':'')+'</span>'+
    '<span class="bg">'+(free?'<em class="ok">Ücretsiz teslimat</em>':pickupOnly?'<em>Gel-al</em>':'')+(ad?'<em class="sp">Sponsorlu</em>':'')+'</span></span></div>';
}

/* ---------- V4 · Restoran sayfası ekleri ---------- */
const ALLERGENS=['Gluten','Süt','Yumurta','Yer fıstığı','Sert kabuklu meyve','Susam','Soya','Balık','Kabuklu deniz ürünü','Yumuşakça','Kereviz','Hardal','Sülfit','Acı bakla'];
function allergens(i){const a=i&&i.metadata&&i.metadata.allergens;return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.trim()).slice(0,12):[]}
function allergenLine(i){const a=allergens(i);return a.length?'<div class="fdwAl">⚠ Alerjen: '+E(a.join(', '))+'</div>':''}
function allergenBox(i){const a=allergens(i);return a.length?'<div class="fdNote warn" style="margin:8px 0">⚠ <b>Alerjen bilgisi:</b> '+E(a.join(', '))+'</div>':''}
let LIKES={};
function likeTxt(id,big){const l=LIKES[id];if(!l||l.total<3)return '';const pct=Math.round(l.likes*100/l.total);return '<div class="fdwLike'+(big?' big':'')+'">👍 %'+pct+' beğenildi <span>('+l.total+' değerlendirme)</span></div>'}
async function venueLikes(tok,v){
  LIKES={};try{const r=await RPC('food_item_like_stats',{p_venue_id:v.id});if(!alive(tok))return;(r||[]).forEach(x=>LIKES[x.menu_item_id]={likes:+x.likes||0,total:+x.total||0});
    qa('[data-lk]').forEach(el=>{el.innerHTML=likeTxt(el.dataset.lk)})}catch(e){}
}
function payChips(){const on=pfOn()&&pfSet().online_payment_enabled===true;
  return ['💵 Kapıda nakit','💳 Kapıda kart'].concat(on?['🔒 Online kart']:[]).map(x=>'<span>'+x+'</span>').join('')}
function todayHours(v){const wh=v.working_hours;if(!wh||!Object.keys(wh).length)return 'Adres, saatler, teslimat';const r=wh[WK[istNow().getDay()]]||[];return r.length?'Bugün '+r.map(x=>x[0]+'–'+(x[1]==='24:00'?'00:00':x[1])).join(', '):'Bugün kapalı'}
function venueExtras(v){
  return '<div class="fdwVX"><div class="fdwPay" aria-label="Ödeme yöntemleri">'+payChips()+'</div>'+
    '<div class="fdwVBtns"><button type="button" class="fdwRevBtn" onclick="showFoodReviews(\''+E(v.id)+'\')"><b>Yorumlar</b><span>'+(+v.rating_count?(+v.rating_count)+' değerlendirme':'Henüz yok')+'</span><i aria-hidden="true">›</i></button>'+
    '<button type="button" class="fdwRevBtn inf" onclick="foodVenueInfo()"><b>Hakkında</b><span>'+E(todayHours(v))+'</span><i aria-hidden="true">›</i></button></div></div><div id="fdwVPromo"></div>';
}
async function venuePromo(tok,v){
  try{
    if(!HF.promos||!HF.promos.length)await promosLoad(null);
    if(!HF.coupons||!HF.coupons.length)await couponsLoad(null);
    if(!alive(tok))return;
    const p=(HF.promos||[]).filter(x=>x.placement==='venue_strip'&&(!x.venue_id||x.venue_id===v.id))[0];
    const cps=(HF.coupons||[]).filter(c=>!c.flash_group&&(!c.venue_id||c.venue_id===v.id)).slice(0,3);
    let h='';
    if(cpOn())flashFor(v.id).forEach(g=>{h+='<div class="fdwStrip fl" role="note"><span class="i">⚡</span><span class="t"><b>'+E(g.title)+'</b><small>'+g.tiers.map(t=>(+t.min_subtotal_kurus?M(t.min_subtotal_kurus)+' üzeri ':'')+tierTxt(t)).join(' · ')+'</small></span>'+flTimer(g)+'</div>'});
    if(p)h+='<button type="button" class="fdwStrip" data-promo="'+E(p.id)+'" onclick="foodPromoClick(\''+E(p.id)+'\')"><span class="i">%</span><span class="t"><b>'+E(p.title)+'</b>'+(p.subtitle?'<small>'+E(p.subtitle)+'</small>':'')+'</span>'+(p.sponsored?'<em>Sponsorlu</em>':'')+'</button>';
    cps.forEach(c=>{h+='<button type="button" class="fdwStrip" onclick="foodCopyCoupon(\''+E(c.code)+'\')"><span class="i">🎟</span><span class="t"><b>'+E(couponTxt(c))+'</b><small>'+(+c.min_subtotal_kurus?M(c.min_subtotal_kurus)+' ve üzeri':'Alt limit yok')+' · Kod: '+E(c.code)+'</small></span></button>'});
    setHTML('fdwVPromo',h);if(p)promoSeen();refreshSticky();if(h.includes('data-fl-end'))flashTick(tok);
  }catch(e){}
}
async function showFoodReviews(venueId,off){
  if(!A())return;const tok=newScreen();off=+off||0;
  render(bar('Yorumlar',"showFoodVenue('"+E(venueId)+"')")+'<div id="fdwRvH"></div><div id="fdwRvL">'+skel('row',4)+'</div>');
  try{
    const [vs,rs]=await Promise.all([Q('GET','food_venues?select=id,name,rating_avg,rating_count&id=eq.'+encodeURIComponent(venueId)),RPC('food_venue_reviews',{p_venue_id:venueId,p_limit:30,p_offset:off}).catch(()=>null)]);
    if(!alive(tok))return;const v=vs&&vs[0];
    if(v)setHTML('fdwRvH','<div class="fdwRvSum"><div class="big">★ '+(+v.rating_count?(+v.rating_avg).toFixed(1).replace('.',','):'—')+'</div><div><b>'+E(v.name)+'</b><small>'+(+v.rating_count||0)+' değerlendirme</small></div></div>');
    if(rs===null){setHTML('fdwRvL',empty('💬','Yorumlar yakında burada','Bu restoranın yorumları kısa süre içinde herkese açık olacak.'));return}
    const list=rs||[];
    setHTML('fdwRvL',list.length?'<div class="fdwRvList">'+list.map(r=>'<div class="fdwRv"><div class="h"><b>'+E(r.author||'Müşteri')+'</b><span class="fdStar">★ '+(+r.rating||0)+'</span><small>'+E(dt(r.created_at))+'</small></div>'+(r.comment?'<p>'+E(r.comment)+'</p>':'<p class="fdMuted">Yorum yazılmadı.</p>')+
      '<button type="button" class="fb ghost sm" onclick="foodReportReview(\''+E(r.id)+'\')">Bildir</button></div>').join('')+'</div>'+(list.length>=30?'<button type="button" class="fb block" onclick="showFoodReviews(\''+E(venueId)+'\','+(off+30)+')">Daha eski yorumlar</button>':''):
      empty('💬','Henüz yorum yok','İlk siparişi verip değerlendiren sen ol.'));
  }catch(e){if(alive(tok))setHTML('fdwRvL',errBox(e,"showFoodReviews('"+E(venueId)+"')"))}
}
window.foodReportReview=async function(id){
  const r=await promptBox('Yorumu bildir','Neden uygunsuz?',{required:true,okLabel:'Bildir',chips:['Hakaret veya küfür','Kişisel bilgi içeriyor','Sahte / reklam','Konuyla ilgisiz']});if(!r)return;
  try{await Q('POST','food_review_reports',{review_id:id,reason:r.slice(0,200)});toast('Bildirimin alındı, incelenecek.')}
  catch(e){const dup=/duplicate|23505/i.test(errMsg(e));toast(dup?'Bu yorumu zaten bildirdin.':errMsg(e),dup?'ok':'err')}
};
/* ---------- V5 · Flash indirim katmanı (mevcut kampanya/kupon kayıtları; nihai indirim sunucuda doğrulanır) ---------- */
const FL_X='isimi_food_flash_x',FL_SEEN='isimi_food_flash_seen';
let FL_OFF=0;
function lsGet(k,st){try{return JSON.parse((st||localStorage).getItem(k)||'[]')}catch(e){return[]}}
function lsPut(k,v,st){try{(st||localStorage).setItem(k,JSON.stringify(v.slice(-20)))}catch(e){}}
function cpOn(){return pfOn()&&pfSet().coupons_enabled===true}
function cpDisc(c,sub){return c.kind==='percent'?Math.min(Math.round(sub*(+c.value)/100),+c.max_discount_kurus||Infinity):Math.min(+c.value,sub)}
function tierTxt(c){return c.kind==='percent'?'%'+c.value:M(c.value)}
function flashGroups(){
  const g={};(HF.coupons||[]).forEach(c=>{if(c.flash_group)(g[c.flash_group]=g[c.flash_group]||[]).push(c)});
  return Object.keys(g).map(k=>{const cs=g[k];const seen={};
    const tiers=cs.filter(c=>{const key=c.kind+'|'+c.value+'|'+c.min_subtotal_kurus;if(seen[key])return false;return seen[key]=1}).sort((a,b)=>a.min_subtotal_kurus-b.min_subtotal_kurus||a.value-b.value);
    const ends=cs.map(c=>c.ends_at).filter(Boolean).map(x=>new Date(x).getTime());
    return {id:k,title:(cs.find(c=>c.title)||{}).title||'Flash İndirim',tiers,end:ends.length?Math.min(...ends):null,all:cs.some(c=>!c.venue_id),vids:[...new Set(cs.map(c=>c.venue_id).filter(Boolean))],coupons:cs};
  }).filter(x=>x.tiers.length&&(x.end==null||x.end>Date.now()+FL_OFF));
}
function flashFor(venueId){return flashGroups().filter(g=>g.all||g.vids.includes(venueId))}
function flashVenue(v){return flashGroups().some(g=>!g.all&&g.vids.includes(v.id))}
function fmtLeft(ms){if(ms<=0)return 'Sona erdi';const s=Math.floor(ms/1000),h=Math.floor(s/3600);if(h>=48)return Math.floor(h/24)+' gün '+(h%24)+' sa';const p=n=>String(n).padStart(2,'0');return p(h)+':'+p(Math.floor(s%3600/60))+':'+p(s%60)}
function flTimer(g){return g.end==null?'':'<span class="fdwFlT" data-fl-end="'+g.end+'" role="timer" aria-label="Kalan süre">'+fmtLeft(g.end-(Date.now()+FL_OFF))+'</span>'}
/* Ana ekranda yalnız kompakt Flash çubuğu; dokununca tam ekran Flash katmanı açılır */
function flashHTML(g){
  if(lsGet(FL_X,sessionStorage).includes(g.id))return '';
  const act=HF.rows.filter(v=>g.vids.includes(v.id));if(!g.all&&!act.length)return '';
  const t0=g.tiers[0],tl=g.tiers[g.tiers.length-1];
  const sum=g.tiers.length>1?tierTxt(t0)+' – '+tierTxt(tl)+' indirim · '+g.tiers.length+' kademe':(+t0.min_subtotal_kurus?M(t0.min_subtotal_kurus)+' üzeri ':'')+tierTxt(t0)+' indirim';
  const ms=g.end!=null?g.end-(Date.now()+FL_OFF):null;
  return '<div class="fdwFlash min" data-fl="'+E(g.id)+'"><button type="button" class="bar" aria-haspopup="dialog" aria-expanded="false" aria-label="'+E(g.title)+' · Flash indirimi aç" onclick="foodFlashMin(\''+E(g.id)+'\',0)">'+
    (ms!=null?'<span class="bxs" data-fl-box="'+g.end+'">'+flBoxes(ms)+'</span><span class="tx"><b>içinde katılan restoranlardan sipariş ver, indirimlerden birini kap!</b><small>'+E(sum)+'</small></span>':'<span class="bz" aria-hidden="true">⚡</span><span class="tx"><b>'+E(g.title)+'</b><small>'+E(sum)+'</small></span>')+'</button>'+
    '<button type="button" class="x" aria-label="Flash indirimi bu oturum için gizle" onclick="foodFlashX(\''+E(g.id)+'\')">✕</button></div>';
}
function flBoxes(ms){
  if(ms<=0)return '<span class="bx"><b>00</b><small>saniye</small></span>';
  const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sc=s%60,p=n=>String(n).padStart(2,'0');
  const u=d?[[d,'gün'],[h,'saat'],[m,'dakika']]:h?[[h,'saat'],[m,'dakika'],[sc,'saniye']]:[[m,'dakika'],[sc,'saniye']];
  return u.map(x=>'<span class="bx"><b>'+p(x[0])+'</b><small>'+x[1]+'</small></span>').join('<i aria-hidden="true">:</i>');
}
function flashLayerHTML(g){
  const vs=(g.all?HF.rows:HF.rows.filter(v=>g.vids.includes(v.id))).slice().sort((a,b)=>(openNow(b)?1:0)-(openNow(a)?1:0));
  const ids=new Set(vs.filter(openNow).map(v=>v.id));
  const its=(HF.items||[]).filter(i=>ids.has(i.venue_id)).slice(0,12);
  const vname=id=>(HF.rows.find(v=>v.id===id)||{}).name||'';
  const ms=g.end!=null?g.end-(Date.now()+FL_OFF):null;
  return '<div class="flh"><div class="flt"><span class="bz">⚡ Flash İndirim</span><button type="button" class="mn" onclick="foodFlashMin(\''+E(g.id)+'\',1)" aria-label="Flash katmanını küçült">Küçült <i aria-hidden="true">⌄</i></button></div>'+
    '<h2 class="ttl">'+E(g.title)+'</h2>'+
    '<div class="tiers" role="list">'+g.tiers.map((t,i)=>'<div class="t'+(i===g.tiers.length-1&&g.tiers.length>1?' best':'')+'" role="listitem"><span class="lim">'+(+t.min_subtotal_kurus?M(t.min_subtotal_kurus).replace(' TL','TL')+'<small>ve üzerine</small>':'Alt limit<small>yok</small>')+'</span><span class="val"><b>'+E(tierTxt(t)).replace(' TL','TL')+'</b><small>İNDİRİM</small></span></div>').join('')+'</div>'+
    '<p class="nt">Sepet tutarına uyan en yüksek kademe sepette otomatik seçilir. Restoranın minimum sepet tutarı geçerlidir; kademeler ve diğer kuponlar birleştirilemez. Son tutar ödeme adımında doğrulanır.</p>'+
'</div>'+
    '<div class="bd">'+
    (its.length>=2?'<div class="fdSecH"><b>Flash’ta sipariş verebileceğin ürünler</b></div><div class="fdPop fdwFlIt">'+its.map(i=>'<div role="button" tabindex="0" onclick="showFoodVenue(\''+E(i.venue_id)+'\',\''+E(i.id)+'\')" onkeydown="if(event.key===\'Enter\')this.click()">'+pic(i.image_url,i.name,'')+'<div class="bd"><b>'+E(i.name)+'</b><small>'+E(vname(i.venue_id))+'</small><div class="pr">'+M(i.price_kurus)+'</div></div></div>').join('')+'</div>':'')+
    '<div class="fdSecH"><b>Restoranlar ('+vs.length+')</b></div>'+
    (vs.length?'<div class="fdGrid fdwListV">'+vs.map(v=>venueRow(v)).join('')+'</div>':empty('🍽️','Şu an katılan restoran yok','Kampanyaya katılan restoranlar burada listelenir.'))+'</div>'+
(ms!=null?'<div class="cd"><span class="bxs" data-fl-box="'+g.end+'">'+flBoxes(ms)+'</span><b>içinde katılan restoranlardan sipariş ver, sepetine uyan indirimi kap!</b></div>':'<div class="cd"><b>Katılan restoranlardan sipariş ver, sepetine uyan indirimi kap!</b></div>')+'';
}
let FL_ESC=null;
function flashLayerClose(instant){
  const el=document.getElementById('fdwFlL');document.body.classList.remove('fdwFlOpen');
  if(FL_ESC){document.removeEventListener('keydown',FL_ESC);FL_ESC=null}
  if(!el)return;if(!document.getElementById('fdModal'))document.body.classList.remove('fdNoScroll');
  if(instant)return el.remove();el.classList.remove('on');setTimeout(()=>el.remove(),280);
}
function flashLayerOpen(id){
  const g=flashGroups().find(x=>x.id===id);if(!g)return;
  flashLayerClose(true);
  const el=document.createElement('div');el.id='fdwFlL';el.className='fdwFlL fd';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',g.title);
  el.innerHTML=flashLayerHTML(g);document.body.appendChild(el);document.body.classList.add('fdNoScroll','fdwFlOpen');
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));
  FL_ESC=ev=>{if(ev.key==='Escape')foodFlashMin(id,1)};document.addEventListener('keydown',FL_ESC);
  const l=lsGet(FL_SEEN,sessionStorage);if(!l.includes(id)){l.push(id);lsPut(FL_SEEN,l,sessionStorage)}
  setTimeout(()=>{const b=el.querySelector('.mn');b&&b.focus({preventScroll:true})},60);
}
/* İlk girişte (oturum başına bir kez) katman kendiliğinden açılır */
function flashAutoOpen(){
  if(!cpOn()||document.getElementById('fdModal'))return;const bar=document.querySelector('#fdwFlash [data-fl]');if(!bar)return;
  const id=bar.dataset.fl;if(!lsGet(FL_SEEN,sessionStorage).includes(id))flashLayerOpen(id);
}
function flashRender(){const box=document.getElementById('fdwFlash');if(!box)return;box.innerHTML=cpOn()?flashGroups().map(flashHTML).join(''):'';fdwFlBar()}
function fdwFlBar(){document.body.classList.toggle('fdwFlBarOn',!!document.querySelector('#fdRoot #fdwFlash .fdwFlash.min')&&!FDW_PANEL)}
window.foodFlashMin=function(id,on){if(on)flashLayerClose();else flashLayerOpen(id)};
window.foodFlashX=function(id){const l=lsGet(FL_X,sessionStorage);if(!l.includes(id))l.push(id);lsPut(FL_X,l,sessionStorage);flashLayerClose();flashRender();toast('Flash indirim bu oturumda gizlendi. Kuponlarım’dan görebilirsin.')};
window.foodFlashGo=function(id){HF.fl=id;HF.cuisine='';homeRender();const l=document.getElementById('fdList');l&&l.scrollIntoView({behavior:'smooth',block:'start'})};
window.foodFlashOff=function(){HF.fl='';homeRender()};
/* Tek zamanlayıcı: yalnız ekranda sayaç varsa çalışır */
function flashTick(tok){
  if(!qa('[data-fl-end]').length&&!document.getElementById('fdwFlash'))return;
  const t=setInterval(()=>{if(!alive(tok))return clearInterval(t);let exp=false;
    qa('[data-fl-end]').forEach(el=>{const ms=+el.dataset.flEnd-(Date.now()+FL_OFF);el.textContent=fmtLeft(ms);if(ms<=0)exp=true});
    qa('[data-fl-box]').forEach(el=>{const ms=+el.dataset.flBox-(Date.now()+FL_OFF);el.innerHTML=flBoxes(ms);if(ms<=0)exp=true});
    if(exp){if(document.getElementById('fdwFlL'))flashLayerClose();flashRender();if(document.getElementById('fdList'))homeRender();refreshSticky()}},1000);
  onCleanup(()=>clearInterval(t));
}
/* Sepet: restorana uyan flash kademeleri → en iyi uygun kod + bir sonraki kademe */
function flashPick(venueId,sub){
  if(!cpOn()||!venueId)return null;const rej=CO.cpRej||{};
  const cs=flashFor(venueId).flatMap(g=>g.coupons).filter(c=>(!c.venue_id||c.venue_id===venueId)&&!rej[c.code]);if(!cs.length)return null;
  const ok=cs.filter(c=>+c.min_subtotal_kurus<=sub).sort((a,b)=>cpDisc(b,sub)-cpDisc(a,sub)||b.min_subtotal_kurus-a.min_subtotal_kurus);const best=ok[0]||null;
  const bd=best?cpDisc(best,sub):0;
  const next=cs.filter(c=>+c.min_subtotal_kurus>sub&&cpDisc(c,+c.min_subtotal_kurus)>bd).sort((a,b)=>a.min_subtotal_kurus-b.min_subtotal_kurus)[0]||null;
  return {best,next,bd};
}
function flashAuto(){
  if(CO.coupon&&!CO.autoCp)return;const c=cartGet();if(!c.venue)return;
  const p=flashPick(c.venue.id,cartEst());
  if(p&&p.best){CO.coupon=p.best.code;CO.autoCp=true}else if(CO.autoCp){CO.coupon='';CO.autoCp=false}
}
async function quoteAuto(){
  flashAuto();let q=await runQuote();
  if(q&&CO.autoCp&&q.coupon&&q.coupon.ok===false){(CO.cpRej=CO.cpRej||{})[CO.coupon]=1;CO.coupon='';CO.autoCp=false;flashAuto();q=await runQuote()}
  return q;
}
function flashHint(venueId,sub){
  const p=flashPick(venueId,sub);if(!p||(!p.best&&!p.next))return '';
  const pct=p.next?Math.max(4,Math.min(100,Math.round(sub/p.next.min_subtotal_kurus*100))):100;
  return '<div class="fdwFlHint" role="status"><span>⚡ '+(p.best?'<b>'+E(tierTxt(p.best))+'</b> Flash indirimi uygulanabilir':'Flash indirim')+(p.next?(p.best?' · ':': ')+'<b>'+M(p.next.min_subtotal_kurus-sub)+'</b> daha ekle, '+E(tierTxt(p.next))+' indirim':'')+'</span><i><b style="width:'+pct+'%"></b></i></div>';
}

/* ---------- V5 · Ana ekran rafları (yalnız gerçek veri; yetersizse raf gizlenir) ---------- */
HF.items=[];HF.top=[];HF.again=[];HF.fl='';
async function homeExtra(tok){
  const since=new Date(Date.now()-60*864e5).toISOString();
  const [items,top,past]=await Promise.all([
    Q('GET','food_menu_items?select=id,name,image_url,venue_id,price_kurus&is_available=eq.true&image_url=not.is.null&order=sort_order.asc&limit=80').catch(()=>[]),
    RPC('food_top_items',{p_limit:12}).catch(()=>[]),
    Q('GET','food_orders?select=id,venue_id,created_at,total_kurus,food_order_items(name_snapshot,quantity)&customer_id=eq.'+UID()+'&status=eq.delivered&created_at=gt.'+since+'&order=created_at.desc&limit=12').catch(()=>[])]);
  if(!alive(tok))return;HF.items=Array.isArray(items)?items:[];HF.top=Array.isArray(top)?top:[];
  const seen={};HF.again=(Array.isArray(past)?past:[]).filter(o=>!seen[o.venue_id]&&(seen[o.venue_id]=1)).slice(0,6);
}
function venueImg(v){if(v.cover_url)return v.cover_url;const it=(HF.items||[]).find(i=>i.venue_id===v.id);return it?it.image_url:''}
function cuisImg(c){
  const cu=CUISINES.find(x=>x[0]===c);const re=cu&&cu[2];
  const it=(re&&(HF.items||[]).find(i=>re.test(String(i.name||'').toLocaleLowerCase('tr'))))||(HF.items||[]).find(i=>{const v=HF.rows.find(r=>r.id===i.venue_id);return v&&venueCats(v)[0]===c});
  return it?it.image_url:'';
}
function isNewVenue(v){return v.created_at&&Date.now()-new Date(v.created_at)<30*864e5}
function againRail(){
  const list=(HF.again||[]).map(o=>({o,v:HF.rows.find(r=>r.id===o.venue_id)})).filter(x=>x.v);
  if(!list.length)return '';
  return '<div class="fdSecH"><b>Tekrar sipariş ver</b><span class="fdMuted fdSmall">Son siparişlerin</span></div><div class="fdwAgain">'+list.map(({o,v})=>{const its=o.food_order_items||[];
    return '<div class="it"><button type="button" class="hd" onclick="showFoodVenue(\''+E(v.id)+'\')">'+pic(venueImg(v),v.name,'sq',catIcon(venueCats(v)[0]))+'<span class="tx"><b>'+E(v.name)+'</b><small>'+E(its.map(i=>i.name_snapshot+(i.quantity>1?' ×'+i.quantity:'')).join(', ')||dt(o.created_at))+'</small></span></button>'+
      '<button type="button" class="fb sm soft" onclick="foodReorder(\''+E(o.id)+'\',this)"'+(openNow(v)?'':' disabled title="Şu an kapalı"')+'>↻ Tekrarla</button></div>'}).join('')+'</div>';
}
function topItemsRail(){
  const its=(HF.top||[]).filter(i=>i.image_url&&HF.rows.some(v=>v.id===i.venue_id&&openNow(v))).slice(0,10);if(its.length<3)return '';
  return '<div class="fdSecH"><b>Popüler lezzetler</b><span class="fdMuted fdSmall">Son 30 günde en çok sipariş edilenler</span></div><div class="fdPop fdwTopI">'+its.map(i=>'<div role="button" tabindex="0" onclick="showFoodVenue(\''+E(i.venue_id)+'\',\''+E(i.menu_item_id)+'\')" onkeydown="if(event.key===\'Enter\')this.click()">'+pic(i.image_url,i.name,'')+'<div class="bd"><b>'+E(i.name)+'</b><small>'+E(i.venue_name||'')+'</small><div class="pr">'+M(i.price_kurus)+'</div></div></div>').join('')+'</div>';
}
function homeRails(rows){
  const open=rows.filter(openNow);let h='';
  const rail=(t,sub,arr)=>{if(arr.length>=3)h+=railHtml(t,sub,arr.slice(0,8))};
  if(rows.length>=5){
    rail('Hızlı teslimat','30 dakika ve altı',open.filter(v=>v.delivery_mode!=='pickup'&&venueMins(v)<=30).sort((a,b)=>venueMins(a)-venueMins(b)));
    rail('Öne çıkanlar','En yüksek puanlı açık restoranlar',open.filter(v=>+v.rating_count>0).sort((a,b)=>(+b.rating_avg)-(+a.rating_avg)||(+b.rating_count)-(+a.rating_count)));
    rail('Ücretsiz teslimat','Teslimat ücreti yok',open.filter(v=>v.delivery_mode!=='pickup'&&!+v.delivery_fee_kurus));
    rail('Yeni restoranlar','Son 30 günde aramıza katılanlar',rows.filter(isNewVenue));
    if(HF.addr)rail('Yakınında','Adresine en yakın restoranlar',open.filter(v=>venueKm(v)!=null).sort((a,b)=>venueKm(a)-venueKm(b)));
    rail('Gel-al','Restorandan kendin teslim al',open.filter(v=>v.delivery_mode==='pickup'||v.delivery_mode==='both'));
  }
  return h;
}

/* ---------- V5 · Admin: kademeli Flash indirim (mevcut pf_campaigns kayıtları, bir grup adıyla) ---------- */
window.foodAdmFlash=async function(){
  let vs=[];try{vs=await Q('GET','food_venues?select=id,name&is_active=eq.true&order=name.asc&limit=200')}catch(e){}
  const tierRow=(a,b)=>'<div class="two fdwFlTier"><div><label>Sepet alt limiti (TL)</label><input inputmode="decimal" data-min value="'+(a||'')+'"></div><div><label>İndirim (TL)</label><input inputmode="decimal" data-val value="'+(b||'')+'"></div></div>';
  const w=modal(sheetHead('Kademeli Flash indirim','Her kademe ayrı bir kupon kaydı olarak oluşturulur; müşteri sepetine uyan en yüksek kademeyi kullanır.')+
    '<div class="fdForm"><label for="flT">Başlık</label><input id="flT" maxlength="80" placeholder="Örn. Hafta sonu Flash indirimi">'+
    '<label for="flP">Kod ön eki</label><input id="flP" maxlength="12" placeholder="Örn. FLASH" style="text-transform:uppercase">'+
    '<label>Kademeler</label><div id="flTiers">'+tierRow(275,70)+tierRow(350,100)+tierRow(450,150)+tierRow(550,200)+'</div><button type="button" class="fb sm" id="flAdd">+ Kademe ekle</button>'+
    '<div class="two" style="margin-top:10px"><div><label for="flS">Başlangıç (boş = hemen)</label><input id="flS" type="datetime-local"></div><div><label for="flE">Bitiş</label><input id="flE" type="datetime-local"></div></div>'+
    '<label for="flF">İndirimi karşılayan</label><select id="flF"><option value="platform">Platform</option><option value="venue">Restoran</option></select>'+
    '<label>Katılan restoranlar</label><label class="fdSw" style="font-size:13.5px"><input type="checkbox" id="flAll" checked><i></i><span>Tüm restoranlar</span></label>'+
    '<div id="flVs" class="fdwAlPick" hidden>'+vs.map(v=>'<button type="button" data-v="'+E(v.id)+'">'+E(v.name)+'</button>').join('')+'</div>'+
    '<label for="flU">Toplam kullanım sınırı (her kademe, isteğe bağlı)</label><input id="flU" inputmode="numeric" placeholder="Sınırsız">'+
    '<div class="fdErr" id="flErr" hidden></div><button type="button" class="fb pri block" style="margin-top:12px" id="flGo">Oluştur ve yayınla</button>'+
    '<p class="fdMuted fdSmall" style="margin-top:8px">Kupon kullanımı Operasyon merkezindeki “Kampanya / kuponlar” anahtarı açıkken geçerlidir. Bitiş zamanı girilirse müşteriye gerçek kalan süre gösterilir; girilmezse sayaç gösterilmez.</p></div>',{sheet:true,full:true});
  bindClose(w);
  w.querySelector('#flAdd').onclick=()=>{const b=w.querySelector('#flTiers');if(b.children.length<6)b.insertAdjacentHTML('beforeend',tierRow())};
  w.querySelector('#flAll').onchange=e=>{w.querySelector('#flVs').hidden=e.target.checked};
  qa('#flVs [data-v]',w).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  w.querySelector('#flGo').onclick=async function(){
    const er=w.querySelector('#flErr');const fail=m=>{er.hidden=false;er.textContent=m};er.hidden=true;
    const title=w.querySelector('#flT').value.trim();const pre=w.querySelector('#flP').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    const tiers=qa('.fdwFlTier',w).map(r=>({min:tlToKurus(r.querySelector('[data-min]').value),val:tlToKurus(r.querySelector('[data-val]').value)})).filter(t=>t.val>0);
    const s=w.querySelector('#flS').value,e=w.querySelector('#flE').value;const all=w.querySelector('#flAll').checked;
    const vids=all?[null]:qa('#flVs .on',w).map(b=>b.dataset.v);const lim=w.querySelector('#flU').value.trim();
    if(title.length<3)return fail('Başlık yaz.');if(pre.length<3||pre.length>12)return fail('Kod ön eki 3-12 harf/rakam olmalı.');
    if(!tiers.length)return fail('En az bir kademe gir.');if(tiers.some(t=>!Number.isFinite(t.min)||!Number.isFinite(t.val)||t.val>=t.min&&t.min>0))return fail('Her kademede indirim, alt limitten küçük olmalı.');
    if(!vids.length)return fail('En az bir restoran seç veya “Tüm restoranlar”ı aç.');
    if(e&&new Date(e)<=new Date(s||Date.now()))return fail('Bitiş, başlangıçtan sonra olmalı.');
    const grp=pre+'-'+Date.now().toString(36).toUpperCase();const made=[];
    await once('admFlash',this,async()=>{
      try{
        for(const t of tiers)for(const vid of vids){
          const code=(pre+Math.round(t.val/100)+(vid?'-'+vid.replace(/-/g,'').slice(0,4).toUpperCase():'')).slice(0,30);
          const body={title,kind:'fixed',value:t.val,min_subtotal_kurus:t.min,venue_id:vid,funded_by:w.querySelector('#flF').value,starts_at:s?new Date(s).toISOString():'',ends_at:e?new Date(e).toISOString():'',usage_limit_total:lim||'',usage_limit_per_user:1,active:true};
          let r;try{r=await RPC('pf_admin_upsert_campaign',{p:Object.assign({code},body)})}
          catch(x){if(!/duplicate|23505|code_key/i.test(errMsg(x)+' '+(x&&x.message||'')))throw x;
            /* Aynı kod daha önce kullanılmışsa mevcut kayda dokunmadan grup ekiyle benzersiz kod üret */
            r=await RPC('pf_admin_upsert_campaign',{p:Object.assign({code:(code.slice(0,23)+'-'+grp.slice(-6)).slice(0,30)},body)})}
          made.push(r.id);
        }
        await RPC('pf_admin_set_campaign_group',{p_ids:made,p_group:grp});
        closeModal();
        if(s&&new Date(s)>new Date())toast(made.length+' kademe oluşturuldu · '+dt(new Date(s).toISOString())+' itibarıyla yayında (şu an planlı)','warn');
        else toast(made.length+' kademe oluşturuldu ve yayında');
      }catch(x){for(const id of made){try{await RPC('pf_admin_upsert_campaign',{p:{id,active:false}})}catch(y){}}fail(errMsg(x)+(made.length?' (Oluşan '+made.length+' kayıt pasife alındı.)':''))}
    });
  };
};
function css3(){
  if(document.getElementById('fdCss3'))return;const s=document.createElement('style');s.id='fdCss3';
  s.textContent=`
/* Renk sistemi — açık: beyaz · mavi · kırmızı / koyu: siyah · hardal · petrol turkuaz */
body.fdWorld{--bg:#F4F6FA;--card:#FFFFFF;--card2:#EEF2F8;--line:#DCE3EC;--text:#0F172A;--muted:#526076;
  --fdw-acc:#1D4ED8;--fdw-acc2:#1E3A8A;--fdw-ink:#FFFFFF;--fdw-hot:#DC2626;--fdw-hot-ink:#FFFFFF;--fdw-2:#1D4ED8;--fdw-ok:#15803D;--fdw-soft:#E8EFFD;--fdw-hot-soft:#FDECEC;
  background:var(--bg);color:var(--text)}
html:not([data-theme="light"]) body.fdWorld{--bg:#11181C;--card:#1A2328;--card2:#222D33;--line:#2E3B42;--text:#EEF1EE;--muted:#9FAEB5;
  --fdw-acc:#D1A94F;--fdw-acc2:#B8913A;--fdw-ink:#17140E;--fdw-hot:#D1A94F;--fdw-hot-ink:#17140E;--fdw-2:#3AAFA0;--fdw-ok:#3AAFA0;--fdw-soft:rgba(209,169,79,.14);--fdw-hot-soft:rgba(209,169,79,.12);--fd-bad:#EF7A6B}
body.fdWorld .fd,body.fdWorld .fdModal{--fd-acc:var(--fdw-acc);--fd-ink:var(--fdw-ink);--fd-ok:var(--fdw-ok);--fd-soft:var(--fdw-soft)}
body.fdWorld .fdCartBar{background:var(--fdw-hot);color:var(--fdw-hot-ink)}
body.fdWorld .fdCartBar .n{background:rgba(255,255,255,.22)}
html:not([data-theme="light"]) body.fdWorld .fdCartBar .n{background:rgba(0,0,0,.18)}
/* Ana platform başlığı ve alt menüsü Yemek dünyasında gizlenir */
body.fdWorld .v2Top,body.fdWorld nav.bottom{display:none!important}
body.fdWorld .app{padding-top:calc(58px + env(safe-area-inset-top,0px))}
body.fdWorld .fdSticky{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
/* Üst başlık */
.fdwTop{position:fixed;top:0;left:0;right:0;z-index:45;max-width:880px;margin:0 auto;box-sizing:border-box;display:flex;align-items:center;gap:8px;min-height:58px;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top,0px));background:var(--card);border-bottom:1px solid var(--line);color:var(--text);font-family:inherit}
.fdwIco{flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);cursor:pointer;padding:0;font:inherit}
.fdwBrand{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:9px;border:0;background:transparent;color:var(--text);cursor:pointer;padding:0;font:inherit;text-align:left}
.fdwBrand .mk{flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--fdw-acc);color:var(--fdw-ink)}
.fdwBrand .wm{display:flex;flex-direction:column;line-height:1.05;min-width:0}
.fdwBrand .wm small{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.02em}
.fdwBrand .wm b{font-size:19px;font-weight:900;letter-spacing:-.02em;color:var(--fdw-acc)}
.fdwTheme::before{content:"";width:19px;height:19px;background:currentColor;-webkit-mask:var(--fdw-moon) center/contain no-repeat;mask:var(--fdw-moon) center/contain no-repeat}
html:not([data-theme="light"]) .fdwTheme::before{-webkit-mask-image:var(--fdw-sun);mask-image:var(--fdw-sun)}
:root{--fdw-moon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'/%3E%3C/svg%3E");--fdw-sun:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/%3E%3C/svg%3E")}
.fdwCart{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;min-width:40px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--text);cursor:pointer;font:inherit}
.fdwCart b{font-size:13.5px;font-weight:800;white-space:nowrap}.fdwCart b:empty{display:none}
.fdwCart.has{background:var(--fdw-hot);border-color:var(--fdw-hot);color:var(--fdw-hot-ink);padding:0 12px 0 10px}
.fdwIco:focus-visible,.fdwBrand:focus-visible,.fdwCart:focus-visible,.fdwNav button:focus-visible,.fdwRow:focus-visible{outline:2px solid var(--fdw-acc);outline-offset:2px}
/* Alt menü */
.fdwNav{position:fixed;left:0;right:0;bottom:0;z-index:45;background:var(--card);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px)}
.fdwNav .in{max-width:760px;margin:0 auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));height:64px}
.fdwNav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;border:0;background:transparent;color:var(--muted);font:inherit;font-size:11px;font-weight:700;cursor:pointer;padding:0 2px}
.fdwNav button .l{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwNav button.on{color:var(--fdw-acc)}
.fdwNav button.mid{justify-content:flex-end;padding-bottom:7px}
.fdwNav button.mid .c{position:relative;display:grid;place-items:center;width:54px;height:54px;margin-top:-26px;border-radius:18px;background:var(--fdw-hot);color:var(--fdw-hot-ink);border:4px solid var(--card);box-shadow:0 6px 16px rgba(0,0,0,.16)}
.fdwNav button.mid .c i{position:absolute;top:-7px;right:-9px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--text);color:var(--card);font:800 11px/20px system-ui,sans-serif;font-style:normal;text-align:center}
.fdwNav button.mid.on .l{color:var(--fdw-acc)}
@media(max-width:360px){.fdwNav button{font-size:10.5px}.fdwBrand .wm b{font-size:17px}}
/* Hesabım */
.fdwMe{display:flex;align-items:center;gap:12px;margin:6px 0 14px}
.fdwMe .av{flex:0 0 auto;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--fdw-acc);color:var(--fdw-ink);font-size:22px;font-weight:900}
.fdwMe .tx{min-width:0;display:flex;flex-direction:column}.fdwMe b{font-size:18px}.fdwMe small{color:var(--muted);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fdwQuick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 14px}
.fdwQuick button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:84px;border-radius:16px;border:1px solid var(--line);background:var(--card);color:var(--fdw-acc);font:inherit;cursor:pointer}
.fdwQuick b{color:var(--text);font-size:14px}
.fdwList{border:1px solid var(--line);border-radius:16px;background:var(--card);overflow:hidden;margin:0 0 14px}
.fdwRow{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;padding:10px 14px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);font:inherit;text-align:left;cursor:pointer}
.fdwRow:last-child{border-bottom:0}
.fdwRow .ic{flex:0 0 auto;color:var(--fdw-acc);display:grid;place-items:center}
.fdwRow .tx{flex:1;min-width:0;display:flex;flex-direction:column}.fdwRow b{font-size:15px}.fdwRow small{color:var(--muted);font-size:12.5px}
.fdwRow .ch{color:var(--muted);font-size:22px}

/* Ana ekran */
.fdwHomeTop{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.fdwHomeTop .fdAddr{flex:1;min-width:0;margin:0}
.fdwHomeTop .fdAddr .ic{color:var(--fdw-acc);display:grid;place-items:center}
.fdwHomeTop .fdAddr .tx{min-width:0}.fdwHomeTop .fdAddr b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwHomeTop #fdBell{flex:0 0 auto;width:46px;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);position:relative;display:grid;place-items:center}
body.fdWorld .fdSearchBtn{height:52px;padding:0 6px 0 14px;border-radius:16px;gap:10px}
body.fdWorld .fdSearchBtn .s{color:var(--fdw-acc);display:grid;place-items:center}
body.fdWorld .fdSearchBtn .p{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.fdWorld .fdSearchBtn .f{flex:0 0 auto;height:40px;display:grid;place-items:center;padding:0 12px;border-left:1px solid var(--line);color:var(--fdw-acc);font-weight:800;font-size:14px}
.fdwHero{position:relative;margin:4px 0 6px;border-radius:18px;overflow:hidden;background:var(--card2)}
.fdwHero .tr{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.fdwHero .tr::-webkit-scrollbar{display:none}
.fdwSl{position:relative;flex:0 0 100%;scroll-snap-align:start;aspect-ratio:16/8;min-height:150px;max-height:260px;border:0;padding:0;margin:0;overflow:hidden;cursor:pointer;background:var(--fdw-acc);color:#fff;font:inherit;text-align:left;display:block;width:100%}
.fdwSl img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fdwSl .ov{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;padding:14px 16px 18px;background:linear-gradient(0deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,0) 75%)}
.fdwSl.noimg .ov{background:none}
.fdwSl small{font-size:11.5px;font-weight:800;letter-spacing:.04em;opacity:.92}
.fdwSl small.sp{align-self:flex-start;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.92);color:#111;opacity:1}
.fdwSl b{font-size:20px;line-height:1.15;font-weight:900;letter-spacing:-.01em;text-shadow:0 1px 3px rgba(0,0,0,.35)}
.fdwSl em{font-style:normal;font-size:13px;opacity:.95}
.fdwSl i{font-style:normal;align-self:flex-start;margin-top:6px;padding:6px 12px;border-radius:999px;background:#fff;color:#111;font-size:13px;font-weight:800}
.fdwHero .dots{position:absolute;left:0;right:0;bottom:7px;display:flex;justify-content:center;gap:5px;pointer-events:none}
.fdwHero .dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.55)}.fdwHero .dots i.on{width:16px;background:#fff}
.fdwNoteT{font-size:11px;color:var(--muted);text-align:right;margin:0 2px 4px}
.fdwMidB{margin:14px 0 4px;border-radius:16px;overflow:hidden}.fdwMidB .fdwSl{aspect-ratio:16/6;min-height:110px}
.fdwChips{display:flex;gap:8px;overflow-x:auto;padding:6px 0 10px;scrollbar-width:none}.fdwChips::-webkit-scrollbar{display:none}
.fdwChip{flex:0 0 auto;height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.fdwChip.on{background:var(--fdw-acc);border-color:var(--fdw-acc);color:var(--fdw-ink)}
.fdwRail{display:grid;grid-auto-flow:column;grid-auto-columns:min(78%,300px);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px;scrollbar-width:none}
.fdwRail::-webkit-scrollbar{display:none}.fdwRail>*{scroll-snap-align:start}
.fdwView{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.fdwView button{width:40px;height:34px;border:0;background:var(--card);color:var(--muted);font-size:16px;cursor:pointer}
.fdwView button.on{background:var(--fdw-soft);color:var(--fdw-acc)}
.fdwActiveF{display:flex;justify-content:space-between;align-items:center;margin:-4px 0 8px}
.fdwSpon{position:absolute;left:10px;bottom:10px;padding:3px 8px;border-radius:999px;background:rgba(17,17,17,.78);color:#fff;font-size:11px;font-weight:800}
.fdVCard.spon .fdFree{display:none}
.fdwCoupons{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(200px,62%);gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
.fdwCp{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 14px;border-radius:16px;border:1.5px dashed var(--fdw-hot);background:var(--fdw-hot-soft);color:var(--text);font:inherit;text-align:left;cursor:pointer}
.fdwCp b{font-size:17px;color:var(--fdw-hot)}.fdwCp small{font-size:12px;color:var(--muted)}.fdwCp em{font-style:normal;font-size:12.5px;font-weight:800}
html:not([data-theme="light"]) .fdwCp b{color:var(--fdw-acc)}
.fdwCpList{display:flex;flex-direction:column;gap:10px}
.fdwCpRow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
.fdwCpRow b{display:block;font-size:17px}.fdwCpRow small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
/* Liste görünümü */
.fdGrid.fdwListV{grid-template-columns:1fr!important;gap:10px}
.fdwRowV{display:flex!important;gap:12px;padding:10px!important;align-items:stretch}
.fdwRowV .im{position:relative;flex:0 0 104px}.fdwRowV .im .fdPic{width:104px;height:100%;min-height:96px;border-radius:12px}
.fdwRowV .im .cl{position:absolute;inset:0;border-radius:12px;background:rgba(15,23,42,.55);color:#fff;display:grid;place-items:center;font-weight:800;font-size:12.5px}
.fdwRowV .bd{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:0!important}
.fdwRowV .h{display:flex;align-items:flex-start;gap:8px}.fdwRowV .h h3{flex:1;min-width:0;font-size:15.5px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwRowV .h .fdFav{position:static;width:32px;height:32px;font-size:17px;box-shadow:none;border:1px solid var(--line)}
.fdwRowV .r1{display:flex;gap:8px;align-items:center;font-size:13px;min-width:0}.fdwRowV .r1 .fdMuted{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwRowV .mt{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12.5px;font-weight:700;color:var(--muted)}
.fdwRowV .bg{display:flex;gap:6px;flex-wrap:wrap}.fdwRowV .bg em{font-style:normal;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--card2);color:var(--text)}
.fdwRowV .bg em.ok{background:var(--fdw-soft);color:var(--fdw-acc)}.fdwRowV .bg em.sp{background:rgba(17,17,17,.78);color:#fff}
.fdwOther{margin-top:28px}
/* Restoran sayfası */
.fdwVX{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px}
.fdwPay{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.fdwPay::-webkit-scrollbar{display:none}
.fdwPay span{flex:0 0 auto;display:flex;align-items:center;padding:0 10px;height:40px;border-radius:10px;background:var(--card2);font-size:12.5px;font-weight:700;white-space:nowrap}
.fdwRevBtn{display:flex;align-items:center;gap:8px;width:100%;padding:0 12px;border-radius:12px;border:1.5px solid var(--fdw-acc);background:transparent;color:var(--fdw-acc);font:inherit;cursor:pointer;text-align:left;min-height:40px}
.fdwRevBtn b{font-size:14px}.fdwRevBtn span{flex:1;font-size:13px;font-weight:700;color:var(--text)}.fdwRevBtn i{font-style:normal;font-size:20px}
.fdwStrip{display:flex;align-items:center;gap:10px;width:100%;margin:8px 0 0;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer}
.fdwStrip .i{flex:0 0 36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--fdw-hot);color:var(--fdw-hot-ink);font-weight:900}
.fdwStrip .t{flex:1;min-width:0;display:flex;flex-direction:column}.fdwStrip b{font-size:14.5px}.fdwStrip small{font-size:12px;color:var(--muted)}
.fdwStrip em{font-style:normal;font-size:11px;font-weight:800;color:var(--muted)}
.fdwLike{margin-top:4px;font-size:12.5px;font-weight:800;color:var(--fdw-ok)}.fdwLike span{font-weight:600;color:var(--muted)}.fdwLike.big{margin:6px 0 4px;font-size:14px}
.fdwLk:empty{display:none}
.fdwAl{margin-top:3px;font-size:11.5px;color:var(--muted)}
.fdwRvSum{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card);margin:0 0 12px}
.fdwRvSum .big{font-size:30px;font-weight:900;color:var(--fdw-acc)}.fdwRvSum b{display:block;font-size:16px}.fdwRvSum small{color:var(--muted)}
.fdwRvList{display:flex;flex-direction:column;gap:10px}
.fdwRv{padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.fdwRv .h{display:flex;align-items:center;gap:8px}.fdwRv .h small{margin-left:auto;color:var(--muted);font-size:12px}
.fdwRv p{margin:6px 0 0;font-size:14px;line-height:1.5}.fdwRv .fb{margin-top:4px}

/* Takip haritası (kurye yoldayken) */
.fdwTWrap{position:relative;margin:0 0 12px}
.fdMap.fdwTBig{height:min(52vh,420px);min-height:280px;margin:0}
.fdwEta{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:500;display:flex;flex-direction:column;align-items:center;padding:8px 18px;border-radius:18px;background:var(--card);color:var(--text);box-shadow:0 6px 18px rgba(0,0,0,.18);pointer-events:none;text-align:center;line-height:1.15}
.fdwEta b{font-size:20px;font-weight:900;color:var(--fdw-ok)}.fdwEta span{font-size:12.5px;color:var(--muted);font-weight:700}
.fdwNudge{border-color:var(--fdw-hot)!important}
.fdwObSteps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 12px}
.fdwObSteps>div{display:flex;flex-direction:column;align-items:center;padding:8px 4px;border:1px solid var(--line);border-radius:12px;background:var(--card);opacity:.6}
.fdwObSteps>div.on{opacity:1;border-color:var(--fdw-acc)}.fdwObSteps b{font-size:18px}.fdwObSteps span{font-size:11.5px;color:var(--muted);font-weight:700}
.fdwAdmL{display:flex;flex-direction:column;gap:10px}
.fdwAdmP{padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.fdwAdmP.off{opacity:.72}
.fdwAdmP .h{display:flex;align-items:center;gap:8px;justify-content:space-between}.fdwAdmP .h b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fdwAdmP small{display:block;color:var(--muted);font-size:12px;margin-top:2px}.fdwAdmP p{margin:6px 0 0;font-size:14px;line-height:1.5}
.fdwAdmP .m{display:flex;gap:14px;margin-top:6px;font-size:13px;font-weight:700}
.fdwAdmP .fdRow2{margin-top:8px}
body.fdWorld .fdSub{grid-template-columns:repeat(4,1fr)}body.fdWorld .fdSub button{font-size:13px;padding:0 2px}
.fdwRep{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.fdwRep>div{display:flex;flex-direction:column;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--card);min-width:0}
.fdwRep small{font-size:12px;color:var(--muted);font-weight:700}.fdwRep b{font-size:19px;font-weight:900;margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fdwRep span{font-size:11.5px;color:var(--muted)}
.fdwBars{display:flex;align-items:flex-end;gap:6px;height:150px;padding:10px 10px 0;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.fdwBars>div{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.fdwBars i{display:block;width:100%;max-width:28px;border-radius:6px 6px 0 0;background:var(--fdw-acc)}
.fdwBars span{height:22px;line-height:22px;font-size:11px;color:var(--muted);white-space:nowrap}
.fdwBars.dense{gap:2px}.fdwBars.dense i{border-radius:3px 3px 0 0}
.fdwAlPick{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}
.fdwAlPick button{padding:7px 11px;border-radius:999px;border:1.5px solid var(--line);background:transparent;color:var(--text);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.fdwAlPick button.on{border-color:var(--fdw-hot);background:color-mix(in srgb,var(--fdw-hot) 12%,transparent);color:var(--fdw-hot)}
.fdwBusy{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer}
.fdwBusy .ic{flex:0 0 36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--card2);font-size:18px}
.fdwBusy .tx{flex:1;min-width:0;display:flex;flex-direction:column}.fdwBusy small{font-size:12px;color:var(--muted)}.fdwBusy b{font-size:15px}
.fdwBusy .cta{flex:0 0 auto;font-size:13px;font-weight:800;color:var(--fdw-acc)}
.fdwBusy.hot{border-color:var(--fdw-hot)}.fdwBusy.hot b{color:var(--fdw-hot)}
.fdwBusyOpts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fdwBusyOpts button{display:flex;flex-direction:column;align-items:center;padding:12px 4px;border:1.5px solid var(--line);border-radius:14px;background:var(--card);color:var(--text);font:inherit;cursor:pointer}
.fdwBusyOpts button b{font-size:20px}.fdwBusyOpts button span{font-size:12px;color:var(--muted)}
.fdwBusyOpts button.on{border-color:var(--fdw-acc);background:color-mix(in srgb,var(--fdw-acc) 12%,transparent)}
.fdwFaq{display:flex;flex-direction:column;gap:8px}
.fdwFaq details{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:0 14px}
.fdwFaq summary{cursor:pointer;padding:14px 0;font-weight:700;font-size:14.5px;list-style:none;display:flex;justify-content:space-between;gap:10px}
.fdwFaq summary::-webkit-details-marker{display:none}.fdwFaq summary::after{content:'+';font-weight:900;color:var(--fdw-acc)}.fdwFaq details[open] summary::after{content:'–'}
.fdwFaq p{margin:0 0 14px;font-size:14px;line-height:1.55;color:var(--muted)}
.fdwRvIt{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.fdwRvIt .r{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border:1px solid var(--line);border-radius:12px}
.fdwRvIt .r span{flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fdwRvIt button{flex:0 0 44px;height:40px;border-radius:10px;border:1px solid var(--line);background:transparent;font-size:18px;cursor:pointer;filter:grayscale(1);opacity:.7}
.fdwRvIt button.on{filter:none;opacity:1;border-color:var(--fdw-acc);background:color-mix(in srgb,var(--fdw-acc) 14%,transparent)}
/* Kurye haritası */
.fdwCMap{position:relative;margin:0 0 12px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--card)}
.fdwCMapEl{height:min(38vh,300px);min-height:220px}
.fdwCMapB{display:flex;align-items:center;gap:8px;padding:10px 12px;font-size:13.5px}
.fdwCMapB b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fdwCMapB .fb{flex:0 0 auto}
.fdwCMapFit{position:absolute;top:10px;right:10px;z-index:500;width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:18px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15)}

/* ---------- V5 · Flash indirim ---------- */
.fdwFlash{position:relative;margin:4px 0 12px;padding:14px;border-radius:18px;background:linear-gradient(135deg,var(--fdw-hot-soft),var(--card) 70%);border:1.5px solid var(--fdw-hot);color:var(--text)}
.fdwFlash .hd{display:flex;align-items:center;gap:8px}
.fdwFlash .bz{white-space:nowrap;font-size:12.5px;font-weight:900;letter-spacing:.02em;padding:4px 10px;border-radius:999px;background:var(--fdw-hot);color:var(--fdw-hot-ink)}
.fdwFlT{font:800 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;padding:5px 8px;border-radius:8px;background:var(--card);border:1px solid var(--line);color:var(--text);white-space:nowrap}
.fdwFlash .sp{flex:1}
.fdwFlash .lk{border:0;background:none;color:var(--fdw-acc);font:inherit;font-size:13px;font-weight:800;cursor:pointer;min-height:36px;padding:0 6px}
.fdwFlash .x{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--muted);cursor:pointer;font-size:14px;flex:0 0 auto}
.fdwFlash .ttl{display:block;font-size:17px;margin:10px 0 8px;letter-spacing:-.01em}
.fdwFlash .tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}
.fdwFlash .t{display:flex;flex-direction:column;padding:10px 12px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
.fdwFlash .t b{font-size:20px;font-weight:900;color:var(--fdw-hot);letter-spacing:-.01em}.fdwFlash .t small{font-size:12px;color:var(--muted);font-weight:700}
html:not([data-theme="light"]) .fdwFlash .t b{color:var(--fdw-acc)}
.fdwFlash .ft{display:flex;align-items:center;gap:10px;margin-top:10px}.fdwFlash .ft .fb{flex:0 0 auto;min-height:40px}
.fdwFlash .vs{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--muted)}
.fdwFlash .lg{display:flex}.fdwFlash .lg i{position:relative;width:28px;height:28px;border-radius:50%;margin-left:-8px;border:2px solid var(--card);background:var(--card2);display:grid;place-items:center;font:800 11px/1 system-ui;font-style:normal;color:var(--text);overflow:hidden}
.fdwFlash .lg i:first-child{margin-left:0}.fdwFlash .lg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fdwFlash .nt{margin:8px 0 0;font-size:11.5px;color:var(--muted);line-height:1.4}
.fdwFlash.min{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 8px}
.fdwFlash.min .bar{flex:1;min-width:0;display:flex;align-items:center;gap:10px;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;min-height:44px;padding:0}
.fdwFlash.min .bz{padding:6px 9px}.fdwFlash.min .tx{flex:1;min-width:0;display:flex;flex-direction:column}.fdwFlash.min .tx b{font-size:14px}
.fdwFlash.min .tx small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fdwFlash.min .op{font-size:13px;font-weight:800;color:var(--fdw-acc)}
@media(max-width:380px){.fdwFlash.min .fdwFlT{display:none}}
.fdwFlHint{margin:0 0 8px;padding:8px 12px;border-radius:12px;background:var(--card);border:1px solid var(--fdw-hot);font-size:12.5px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.08)}
.fdwFlHint i{display:block;height:5px;border-radius:3px;background:var(--card2);margin-top:6px;overflow:hidden}.fdwFlHint i b{display:block;height:100%;background:var(--fdw-hot);border-radius:3px}
#fdMin .fdwFlHint{box-shadow:none;margin:12px 0}
.fdwFlB{position:absolute;left:10px;top:10px;z-index:2;padding:3px 9px;border-radius:999px;background:var(--fdw-hot);color:var(--fdw-hot-ink);font-size:11.5px;font-weight:900}
.fdwFlB.nw{background:var(--card);color:var(--text);border:1px solid var(--line)}
.fdVCard .fdwFlB~.rt{top:40px}
.fdwStrip.fl{cursor:default;border-color:var(--fdw-hot)}.fdwStrip.fl .fdwFlT{flex:0 0 auto}
.fdwCpRow.fl{border-color:var(--fdw-hot);background:var(--fdw-hot-soft);margin-bottom:10px}
/* Ana ekran ekleri */
.fdCuis button span.im{padding:0;overflow:hidden}.fdCuis button span.im img{width:100%;height:100%;object-fit:cover}
.fdCuis button span{font-size:24px}
.fdwRate{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--card)}
.fdwRate .tx{flex:1 1 180px;min-width:0;display:flex;flex-direction:column}.fdwRate b{font-size:15px}.fdwRate small{font-size:12.5px;color:var(--muted)}
.fdwRate .ac{display:flex;gap:8px}
.fdwAgain{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(250px,82%);gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}.fdwAgain::-webkit-scrollbar{display:none}
.fdwAgain .it{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
.fdwAgain .hd{display:flex;gap:10px;align-items:center;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;padding:0}
.fdwAgain .hd .fdPic{width:52px;flex:0 0 52px;border-radius:12px}.fdwAgain .tx{min-width:0;display:flex;flex-direction:column}
.fdwAgain .tx b{font-size:14.5px}.fdwAgain .tx small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwTopI>div small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Takip hızlı işlemler */
.fdwQk{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:0 0 12px}
.fdwQk .q{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;padding:8px 4px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--fdw-acc);font:inherit;font-size:12.5px;font-weight:800;text-decoration:none;cursor:pointer;text-align:center}
.fdwQk .q span{color:var(--text)}.fdwQk .q.bad,.fdwQk .q.bad span{color:var(--fd-bad)}.fdwQk .q b{font-size:18px}
/* Kurye */
.fdwJob{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px;margin-bottom:12px}
.fdwJob .h{display:flex;gap:10px;align-items:flex-start}.fdwJob .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.fdwJob .tx b{font-size:16.5px}.fdwJob .tx small{font-size:13px;color:var(--muted);font-weight:700}
.fdwJob .fee{font-size:20px;font-weight:900;color:var(--fdw-ok)}
.fdwJob .m{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.fdwJob .m span{font-size:12.5px;font-weight:700;padding:4px 9px;border-radius:999px;background:var(--card2)}
.fdwJob .fdRow2 .fb{min-height:50px;font-size:15px}.fdwJob .fdRow2 .fb.pri{flex:2}
.fdwCLbl{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:4px 0 2px}.fdwCLbl span{font-size:11px;font-weight:700;color:var(--muted);text-align:center;line-height:1.2}.fdwCLbl span.on{color:var(--fd-acc)}
body.fdWorld .fdCourierAct+.fdSticky .fb{min-height:52px;font-size:15.5px}
/* Restoran sayfası */
.fdwVBtns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fdwVBtns .fdwRevBtn{min-width:0}.fdwVBtns .fdwRevBtn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwRevBtn.inf{border-color:var(--line);color:var(--text)}
@media(max-width:380px){.fdwVBtns{grid-template-columns:1fr}}
/* Tablet / geniş ekran */
@media(min-width:768px){
  body.fdWorld .fdMenuSec .fdList{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}
  body.fdWorld .fdMenuSec .fdList .fdProd:nth-last-child(2):nth-child(odd){border-bottom:0}
  .fdwBizG{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.fdwBizG>.fdBiz{margin:0}.fdwBizG>.fdEmpty{grid-column:1/-1}
  .fdwAgain{grid-auto-columns:minmax(260px,40%)}
}
@media(min-width:1024px){
  body.fdWorld .app{max-width:1120px}.fdwTop{max-width:1120px}
  body.fdWorld .fdGrid:not(.fdwListV){grid-template-columns:repeat(3,minmax(0,1fr))}
  .fdwBizG{grid-template-columns:repeat(3,minmax(0,1fr))}
  .fdwRail{grid-auto-columns:min(32%,340px)}
  body.fdWorld .fdHero{border-radius:20px;overflow:hidden}
}

/* ---------- V5.1 · Flash katmanı (alttan açılan tam ekran; Küçült ile ana ekrana iner) ---------- */
.fdwFlL{position:fixed;inset:0;z-index:2147483000;background:var(--bg);color:var(--text);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1);padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
.fdwFlL.on{transform:none}
.fdwFlL .flh{--fl-a:#0F4C4A;--fl-b:#0B3634;--fl-y:#F2C14E;--fl-y2:#D9A232;background:linear-gradient(165deg,var(--fl-a),var(--fl-b));color:#fff;padding:calc(12px + env(safe-area-inset-top,0px)) 16px 18px}
.fdwFlL .flh>*{max-width:760px;margin-left:auto;margin-right:auto}
.fdwFlL .flh>.flt{display:flex;align-items:center;justify-content:space-between;gap:10px}
.fdwFlL .flt .bz{font-size:12.5px;font-weight:900;letter-spacing:.03em;padding:5px 11px;border-radius:999px;background:var(--fl-y);color:#17140E;white-space:nowrap}
.fdwFlL .mn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 8px 0 16px;border-radius:999px;border:0;background:#fff;color:#0F172A;font:inherit;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.fdwFlL .mn i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--fl-a);color:#fff;font-style:normal;font-size:15px;line-height:1}
.fdwFlL .mn:focus-visible{outline:3px solid var(--fl-y);outline-offset:2px}
.fdwFlL .ttl{margin:14px 0 14px;font-size:clamp(26px,8vw,40px);line-height:1.05;font-weight:900;letter-spacing:-.02em;color:var(--fl-y);text-transform:uppercase;text-align:center;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.fdwFlL .tiers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:340px){.fdwFlL .tiers{grid-template-columns:repeat(2,minmax(0,1fr))}}
.fdwFlL .t{display:flex;flex-direction:column;align-items:center}
.fdwFlL .t .lim{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;min-width:82%;padding:4px 6px 6px;border-radius:8px 8px 4px 4px;background:var(--fl-b);border:1.5px solid var(--fl-y);font-size:clamp(11px,3.3vw,14px);font-weight:900;line-height:1.1;margin-bottom:-6px}
.fdwFlL .t .lim small{font-size:9.5px;font-weight:700;opacity:.9}
.fdwFlL .t .val{width:100%;display:flex;flex-direction:column;align-items:center;padding:12px 4px 8px;border-radius:10px;background:#FFFBEF;color:#0F172A;border:2.5px solid var(--fl-y);box-shadow:0 4px 0 rgba(0,0,0,.22)}
.fdwFlL .t .val b{font-size:clamp(17px,5.4vw,26px);font-weight:900;letter-spacing:-.02em;line-height:1}
.fdwFlL .t .val small{font-size:clamp(10px,3vw,13px);font-weight:900;letter-spacing:.04em;margin-top:2px}
.fdwFlL .t.best .val{background:var(--fl-y)}
.fdwFlL .nt{margin:14px auto 0;font-size:11.5px;line-height:1.45;text-align:center;opacity:.88}
.fdwFlL .cd{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px;margin-top:16px}
.fdwFlL .cd>b{flex:1 1 160px;font-size:clamp(14px,3.9vw,17px);line-height:1.3;font-weight:800}
.fdwFlL .bxs{display:flex;align-items:center;gap:6px;flex:0 0 auto}.fdwFlL .bxs i{font-style:normal;font-weight:900;font-size:20px}
.fdwFlL .bx{display:flex;flex-direction:column;align-items:center;min-width:54px;padding:6px 6px 5px;border-radius:12px;background:#fff;color:#0F172A}
.fdwFlL .bx b{font-size:24px;font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums;border:2px solid #E5E7EB;border-radius:8px;padding:0 6px;min-width:44px;text-align:center}
.fdwFlL .bx small{font-size:11px;font-weight:700;color:#475569;margin-top:2px}
.fdwFlL>.bd{max-width:760px;margin:0 auto;padding:4px 14px 0}
.fdwFlL .fdwFlIt>div small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(min-width:768px){.fdwFlL .fdGrid.fdwListV{grid-template-columns:1fr 1fr!important}}
body.fdwFlOpen .fdToasts{z-index:2147483600}

/* ---------- V5.2 · Alt Flash çubuğu, üst adres şeridi ---------- */
#fdwFlash .fdwFlash.min{position:fixed;left:0;right:0;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:44;max-width:880px;margin:0 auto;border-radius:0;border:0;border-top:2px solid #F2C14E;padding:8px 10px 8px 12px;background:linear-gradient(165deg,#0F4C4A,#0B3634);color:#fff;box-shadow:0 -6px 18px rgba(0,0,0,.18)}
#fdwFlash .fdwFlash.min .bar{color:#fff;gap:12px;min-height:52px}
#fdwFlash .fdwFlash.min .tx b{font-size:13.5px;line-height:1.25;font-weight:800;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#fdwFlash .fdwFlash.min .tx small{color:#F2C14E;font-weight:700}
#fdwFlash .fdwFlash.min .bxs{display:flex;align-items:center;gap:4px;flex:0 0 auto}#fdwFlash .fdwFlash.min .bxs i{font-style:normal;font-weight:900}
#fdwFlash .fdwFlash.min .bx{display:flex;flex-direction:column;align-items:center;min-width:44px;padding:4px 4px 3px;border-radius:10px;background:#fff;color:#0F172A}
#fdwFlash .fdwFlash.min .bx b{font-size:18px;font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums}
#fdwFlash .fdwFlash.min .bx small{font-size:10px;font-weight:700;color:#475569}
#fdwFlash .fdwFlash.min .x{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:15px}
#fdwFlash .fdwFlash.min .bz{background:#F2C14E;color:#17140E}
@media(min-width:1024px){#fdwFlash .fdwFlash.min{max-width:1120px}}
body.fdwFlOpen #fdwFlash .fdwFlash.min{display:none}
body.fdWorld.fdwFlBarOn .fdSticky{bottom:calc(144px + env(safe-area-inset-bottom,0px))}
body.fdWorld.fdwFlBarOn .app{padding-bottom:calc(160px + env(safe-area-inset-bottom,0px))}
.fdwNAct{display:flex;justify-content:flex-end;gap:8px;margin:0 0 12px}.fdwNAct .fb{min-height:40px}
.fdwSlot #fdBell{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);position:relative;display:grid;place-items:center}

/* V5.3 · Flash katmanı tek yeşil yüzey, sayaç altta sabit */
.fdwFlL{--fl-a:#0F4C4A;--fl-b:#0B3634;background:linear-gradient(180deg,#0F4C4A 0%,#0B3634 60%,#0A2F2D 100%);color:#fff;padding-bottom:0}
.fdwFlL>.bd .fdSecH b{color:#fff}
.fdwFlL>.bd{padding-bottom:18px;flex:1 0 auto;width:100%}
.fdwFlL{display:flex;flex-direction:column}.fdwFlL>.flh,.fdwFlL>.cd{flex:0 0 auto}
.fdwFlL .cd{position:sticky;bottom:0;z-index:2;margin:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:#0B3634;border-top:2px solid #F2C14E;box-shadow:0 -8px 20px rgba(0,0,0,.25)}
.fdwFlL .cd>*{max-width:760px}
.fdwFlL .cd .bx{min-width:48px;padding:4px 4px 3px}.fdwFlL .cd .bx b{font-size:20px;min-width:38px}
.fdwFlL .fdVCard,.fdwFlL .fdPop>div{border-color:rgba(255,255,255,.14)}
.fdwHomeTop .fdwPanelH{position:relative;flex:0 0 auto;width:46px;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);display:grid;place-items:center}
.fdwHomeTop .fdwPanelH[hidden]{display:none}
.fdwHomeTop .fdwPanelH i{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--fdw-hot);color:var(--fdw-hot-ink);font:800 10.5px/18px system-ui,sans-serif;font-style:normal;text-align:center}
.fdwHomeTop .fdwPanelH i[hidden]{display:none}

/* ---------- V5 · Tek üst başlık, panel modu ---------- */
#fdRoot > .fdBar.fdwMoved{display:none!important}
.fdwTop [hidden],.fdwPT[hidden],.fdwPanelB[hidden]{display:none!important}
.fdwPT{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;line-height:1.15}
.fdwPT b{font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}
.fdwPT small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fdwTop.pg .fdwBrand{display:none}
.fdwSlot{display:flex;align-items:center;gap:6px;flex:0 0 auto}.fdwSlot:empty{display:none}
.fdwSlot .fdIco{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);display:grid;place-items:center;position:relative;font-size:18px;cursor:pointer;padding:0}
.fdwSlot .fdLive:empty{display:none}.fdwSlot .fdLive{font-size:11px;white-space:nowrap}
@media(max-width:600px){.fdwSlot .fdLive:not(:empty){font-size:0;width:10px;height:10px;border-radius:50%;padding:0;background:var(--fd-warn,#d97706);flex:0 0 10px}}
.fdBiz .tot b{white-space:nowrap}
.fdwSlot .fb{min-height:36px;padding:0 10px;font-size:13px}
.fdwPanelB{position:relative}.fdwPanelB i{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--fdw-hot);color:var(--fdw-hot-ink);font:800 10.5px/18px system-ui,sans-serif;font-style:normal;text-align:center}
body.fdWorld.fdwPanel .fdwNav{display:none}
body.fdWorld.fdwPanel .fdwCart{display:none}
body.fdWorld.fdwPanel .fdSticky{bottom:calc(10px + env(safe-area-inset-bottom,0px))}
body.fdWorld.fdwPanel .app{padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
body.fdWorld .fdHero .nav>.fdIco:first-child{visibility:hidden}
@media(max-width:380px){.fdwTop{gap:6px;padding-left:8px;padding-right:8px}.fdwTop .fdwIco,.fdwSlot .fdIco{width:38px;height:38px}.fdwCart.has b{display:none}.fdwCart.has{padding:0 10px}}
/* Hareket azaltma */
@media (prefers-reduced-motion: reduce){body.fdWorld *,body.fdWorld *::before,body.fdWorld *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;document.head.appendChild(s);
}

/* ====================== Dışa aktarım (eski adlarla uyumlu) ====================== */
Object.assign(window,{
  showFoodHome,showFoodVenue,showFoodCart,showFoodCheckout,showFoodSearch,showFoodOrders,showFoodOrderDetail,showFoodBusiness,showFoodMenu,showFoodSettings,
  showFoodVenueIssues,showFoodTeam,showFoodCourier,showFoodAdmin,showFoodNotifications,showFoodAccount,showFoodCoupons,showFoodReviews,showFoodHelp,showFoodReports,showFoodAdminPromos,showFoodAdminReviews,showFoodOpsCenter,showFoodOnboarding,
  openFood:showFoodHome,foodLoad:()=>showFoodHome(),foodAdd:(id)=>window.foodQuickAdd&&window.foodQuickAdd(id),
  foodOrder:()=>showFoodCart(),foodMenu:showFoodMenu,
  __foodTest:{cartGet,cartSave,openNow,nextOpen,cuisines,errMsg,stageOf,tlToKurus,M,addrGet,addrSet}
});
})();
