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
  return m||'Beklenmeyen bir hata oluştu.';
}
function isNetErr(e){return /Failed to fetch|NetworkError|Load failed/i.test((e&&e.message)||'')}
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
function newScreen(){SCREEN++;while(CLEANUPS.length){try{CLEANUPS.pop()()}catch(e){}}closeModal();return SCREEN}
function alive(tok){return tok===SCREEN&&!!document.getElementById('fdRoot')}
function onCleanup(fn){CLEANUPS.push(fn)}
function topOffset(){const h=document.querySelector('.v2Top');return h?Math.round(h.getBoundingClientRect().height):0}
function render(html,opt){
  css();opt=opt||{};try{setNav?.('navFood')}catch(e){}
  app('<div id="fdRoot" class="fd'+(opt.cls?' '+opt.cls:'')+'">'+html+'</div>');
  const r=document.getElementById('fdRoot');if(r)r.style.setProperty('--fd-top',topOffset()+'px');
}
/* Canlı yenilemede kaydırmayı bozmadan yerinde güncelle */
function patch(html){const r=document.getElementById('fdRoot');if(!r)return render(html);const y=window.scrollY;r.innerHTML=html;window.scrollTo(0,y)}
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
const PAY={cash_on_delivery:'Kapıda nakit',card_on_delivery:'Kapıda kart',agree_with_venue:'Restoranla anlaşmalı'};
const PAYI={cash_on_delivery:'💵',card_on_delivery:'💳',agree_with_venue:'🤝'};
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
function bellBtn(){return '<button type="button" class="fdIco" id="fdBell" aria-label="Bildirimler" onclick="showFoodNotifications()">🔔</button>'}
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
.fdCta .fb{flex:1;min-height:52px;font-size:16px}
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
function cartSave(c,keepReq){if(!keepReq)c.req=null;if(!c.items.length){localStorage.removeItem(CART_KEY);return}localStorage.setItem(CART_KEY,JSON.stringify(c))}
function cartCount(){return cartGet().items.reduce((n,x)=>n+(+x.quantity||0),0)}
function cartEst(){return cartGet().items.reduce((n,x)=>n+(+x.unit_kurus||0)*(+x.quantity||0),0)}
function cartQtyByItem(venueId){const c=cartGet(),m={};if(c.venue&&c.venue.id===venueId)c.items.forEach(x=>{m[x.menu_item_id]=(m[x.menu_item_id]||0)+x.quantity});return m}
async function cartAdd(venue,line){
  const c=cartGet();
  if(c.venue&&c.venue.id!==venue.id&&c.items.length){
    const ok=await confirmBox('Sepetini yenileyelim mi?','Sepetinde "'+c.venue.name+'" ürünleri var. Tek seferde bir restorandan sipariş verebilirsin.','Sepeti yenile',true);
    if(!ok)return false;
    c.items=[];
  }
  c.venue={id:venue.id,name:venue.name,delivery_mode:venue.delivery_mode,delivery_provider:venue.delivery_provider,image_url:venue.image_url||null};
  const ex=c.items.find(x=>x.key===line.key);
  if(ex)ex.quantity=Math.min(50,ex.quantity+line.quantity);else c.items.push(line);
  cartSave(c);refreshSticky();refreshProdBadges();toast('Sepete eklendi');try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}return true;
}
function stickyCart(){
  const n=cartCount();if(!n)return '';
  return '<div class="fdSticky" id="fdSticky"><button type="button" class="fdCartBar" onclick="showFoodCart()"><span class="n">'+n+'</span><span class="l">Sepete git</span><span class="r">'+M(cartEst())+'</span></button></div>';
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
  if(!a&&list.length){const x=list[0];a={mode:'saved',id:x.id,label:x.label,text:addrLine(x)};addrSet(a)}
  return a;
}
function addrValueHTML(a){return a?'<span>'+E(a.label||'Adres')+'</span> · '+E(a.text||''):''}
function openAddressSheet(onDone){
  const list=ADDRS||[];const cur=addrGet();const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  let showNew=!list.length;
  const draw=()=>{
    const w=modal(sheetHead('Teslimat adresi')+
      (list.length?'<div class="fdRadio">'+list.map(a=>'<label class="'+(cur&&cur.id===a.id?'on':'')+'"><input type="radio" name="fdAdr" value="'+E(a.id)+'"'+(cur&&cur.id===a.id?' checked':'')+'><span>'+E(a.label)+'<small>'+E(addrLine(a))+'</small></span></label>').join('')+'</div>':'')+
      (cur&&cur.mode==='text'?'<div class="fdNote info" style="margin-top:8px">Şu an: '+E(cur.text)+'</div>':'')+
      (showNew?'<div class="fdForm" id="fdNewA"><h3 style="margin-top:14px">Yeni adres</h3>'+
        '<label>Adres adı</label><div class="fdChips wrap" id="naL">'+['Ev','İş','Diğer'].map((l,i)=>'<button type="button" class="fdChip'+(i?'':' on')+'" data-l="'+l+'">'+l+'</button>').join('')+'</div>'+
        '<div class="two"><div><label for="naD">İlçe</label><select id="naD"><option value="">Seç</option>'+ds.map(d=>'<option>'+E(d)+'</option>').join('')+'</select></div><div><label for="naN">Mahalle</label><input id="naN" maxlength="60" autocomplete="address-level3"></div></div>'+
        '<label for="naT">Açık adres</label><textarea id="naT" rows="3" maxlength="300" placeholder="Sokak, bina no, kat, daire, tarif" autocomplete="street-address"></textarea>'+
        '<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap"><button type="button" class="fb sm" id="naG">📍 Konumumu ekle</button>'+
        '<label class="fdSw" style="font-size:13.5px"><input type="checkbox" id="naS" checked><i></i><span>Adreslerime kaydet</span></label></div>'+
        '<div class="fdErr" id="naE" hidden></div><button type="button" class="fb pri block" style="margin-top:14px" id="naOk">Bu adresi kullan</button></div>':
       '<button type="button" class="fb soft block" style="margin-top:12px" id="fdAddNew">+ Yeni adres ekle</button>'),{sheet:true,full:true});
    bindClose(w);
    qa('input[name=fdAdr]',w).forEach(r=>r.onchange=()=>{const a=list.find(x=>x.id===r.value);addrSet({mode:'saved',id:a.id,label:a.label,text:addrLine(a)});closeModal();onDone&&onDone()});
    const an=w.querySelector('#fdAddNew');if(an)an.onclick=()=>{showNew=true;draw();setTimeout(()=>{const t=document.getElementById('naT');t&&t.scrollIntoView({block:'center'})},100)};
    if(!showNew)return;
    let label='Ev',lat=null,lng=null;
    qa('#naL [data-l]',w).forEach(b=>b.onclick=()=>{label=b.dataset.l;qa('#naL [data-l]',w).forEach(x=>x.classList.toggle('on',x===b))});
    w.querySelector('#naG').onclick=function(){const btn=this;if(!navigator.geolocation)return toast('Cihazın konum paylaşımını desteklemiyor.','warn');btn.disabled=true;btn.textContent='Konum alınıyor…';
      navigator.geolocation.getCurrentPosition(p=>{lat=+p.coords.latitude.toFixed(6);lng=+p.coords.longitude.toFixed(6);btn.disabled=false;btn.textContent='📍 Konum eklendi ✓'},()=>{btn.disabled=false;btn.textContent='📍 Konumumu ekle';toast('Konum alınamadı. İzinleri kontrol et.','warn')},{timeout:10000,maximumAge:120000})};
    w.querySelector('#naOk').onclick=async function(){
      const d=w.querySelector('#naD').value,n=w.querySelector('#naN').value.trim(),t=w.querySelector('#naT').value.trim(),save=w.querySelector('#naS').checked,er=w.querySelector('#naE');
      const fail=m=>{er.hidden=false;er.textContent=m};
      if(!d)return fail('İlçe seç.');if(t.length<10)return fail('Açık adresi sokak, bina ve daire bilgisiyle yaz.');
      if(!save){addrSet({mode:'text',label:'Bu sipariş için',text:[n,t,d].filter(Boolean).join(', '),lat,lng});closeModal();onDone&&onDone();return}
      await once('addrSave',this,async()=>{try{
        const r=await Q('POST','saved_addresses',{user_id:UID(),label,district:d,neighborhood:n||null,address_note:t,lat,lng});
        const a=r&&r[0];if(!a)throw new Error('Adres kaydedilemedi.');ADDRS=[a].concat(ADDRS||[]);
        addrSet({mode:'saved',id:a.id,label:a.label,text:addrLine(a)});closeModal();toast('Adres kaydedildi');onDone&&onDone();
      }catch(e){fail(errMsg(e))}});
    };
  };
  draw();
}
window.foodAddrSheet=async function(ctx){await loadAddrs();openAddressSheet(()=>{if(ctx==='home')homeAddr();else if(ctx==='co'){CO.refresh&&CO.refresh()}})};

/* ====================== Bildirim zili ====================== */
async function bellCount(){
  try{const r=await Q('GET','food_notifications?select=id&read_at=is.null&limit=50');const el=document.getElementById('fdBell');if(el){const n=r.length;el.innerHTML='🔔'+(n?'<span class="fdDot">'+(n>9?'9+':n)+'</span>':'')}}catch(e){}
}

/* ====================== F2 · Yemek ana sayfa ====================== */
const HF={q:'',cuisine:'',rows:[],offset:0,done:false};
async function showFoodHome(){
  if(!A())return;const tok=newScreen();
  render(bar('Yemek',null,'<span class="fdLive" id="fdLive"></span><button type="button" class="fdIco" aria-label="Siparişlerim" onclick="showFoodOrders()">🧾</button>'+bellBtn(),'İşimi Çöz')+
    '<button type="button" class="fdAddr" id="fdAddrBar" onclick="foodAddrSheet(\'home\')"><span class="ic">📍</span><span class="tx"><small>Teslimat adresi</small><b>…</b></span><span class="fdMuted">⌄</span></button>'+
    '<div id="fdActiveO"></div>'+
    '<div class="fdSearch"><input id="fdQ" type="search" placeholder="Restoran veya yemek ara" value="'+E(HF.q)+'" autocomplete="off" aria-label="Restoran ara" enterkeyhint="search"></div>'+
    '<div class="fdCuis" id="fdCuis"></div>'+
    '<div id="fdList" style="margin-top:6px">'+skel('card',2)+'</div><div id="fdMore"></div><div id="fdPartner"></div>');
  const root=document.getElementById('fdRoot');root.dataset.sticky='1';root.insertAdjacentHTML('beforeend',stickyCart());
  document.getElementById('fdQ').addEventListener('input',debounce(e=>{HF.q=e.target.value;homeRender()},250));
  bellCount();homeAddr();homeActive(tok);homePartner(tok);
  HF.rows=[];HF.offset=0;HF.done=false;
  await homeLoad(tok);
  watch(tok,[{table:'food_notifications',filter:'user_id=eq.'+UID()},{table:'food_orders',filter:'customer_id=eq.'+UID()}],(k,p)=>{if(!p||p.table==='food_notifications')bellCount();if(!p||p.table==='food_orders')homeActive(tok)});
}
async function homeAddr(){const a=await currentAddr();const b=document.querySelector('#fdAddrBar b');if(b)b.innerHTML=a?E(a.label)+' · '+E(a.text):'<span style="color:var(--fd-acc)">Adres ekle</span>'}
async function homeActive(tok){
  try{
    const r=await Q('GET','food_orders?select=id,status,delivery_mode,estimated_delivery_at,estimated_ready_at,food_venues(name)&customer_id=eq.'+UID()+'&status=not.in.('+TERMINAL.join(',')+')&order=created_at.desc&limit=3');
    if(!alive(tok))return;const o=r&&r[0];
    setHTML('fdActiveO',o?'<button type="button" class="fdActive" onclick="showFoodOrderDetail(\''+E(o.id)+'\')"><span class="e">'+(STL[o.status]||['🍽️'])[0]+'</span><span class="tx"><small>'+E(o.food_venues?o.food_venues.name:'Siparişin')+(r.length>1?' · +'+(r.length-1)+' aktif sipariş':'')+'</small><b>'+E((STL[o.status]||['',o.status])[1])+
      ((o.delivery_mode==='pickup'?o.estimated_ready_at:o.estimated_delivery_at)?' · '+hm(o.delivery_mode==='pickup'?o.estimated_ready_at:o.estimated_delivery_at):'')+'</b></span><span style="font-weight:800">Takip et ›</span></button>':'');
  }catch(e){}
}
async function homePartner(tok){
  try{const w=await whoami();if(!alive(tok))return;
    setHTML('fdPartner','<div class="fdPartner"><div class="fdMuted fdSmall" style="font-weight:800;margin-bottom:8px">İŞ ORTAKLIĞI</div>'+
      row('🏪','İşletme',(w.venues&&w.venues.length)?'İşletme paneli':'Restoranını ekle, sipariş al','showFoodBusiness()')+
      row('🛵','Kurye',w.courier?(w.courier.status==='approved'?'Kurye paneli':w.courier.status==='pending'?'Başvurun inceleniyor':'Kurye hesabı'):'Kurye ol, teslimat yap','showFoodCourier()')+
      (w.is_admin?row('🛡️','Platform','Yemek yönetimi','showFoodAdmin()'):'')+'</div>');
  }catch(e){}
}
async function homeLoad(tok){
  try{
    const rows=await Q('GET','food_venues?select=id,name,district,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,cover_url,rating_avg,rating_count&is_active=eq.true&order=is_open.desc,rating_count.desc,name.asc&limit=30&offset='+HF.offset);
    if(!alive(tok))return;
    HF.rows=HF.rows.concat(rows||[]);HF.offset+=rows.length;HF.done=rows.length<30;
    homeRender();
  }catch(e){setHTML('fdList',errBox(e,'showFoodHome()'))}
}
window.foodHomeMore=async function(btn){await once('homeMore',btn,()=>homeLoad(SCREEN))};
let CUIS=[];
window.foodCuis=function(i){HF.cuisine=i<0||HF.cuisine===CUIS[i]?'':CUIS[i];homeRender()};
function homeRender(){
  const list=document.getElementById('fdList');if(!list)return;
  const rows=HF.rows;
  const cnt={};rows.forEach(v=>cuisines(v.cuisine_type).forEach(t=>{cnt[t]=(cnt[t]||0)+1}));
  CUIS=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||a.localeCompare(b,'tr')).slice(0,12);
  setHTML('fdCuis',CUIS.length>1?'<button type="button" class="'+(HF.cuisine?'':'on')+'" onclick="foodCuis(-1)"><span>🍽️</span><em>Tümü</em></button>'+
    CUIS.map((c,i)=>'<button type="button" class="'+(HF.cuisine===c?'on':'')+'" onclick="foodCuis('+i+')"><span>'+foodIcon(c)+'</span><em>'+E(c)+'</em></button>').join(''):'');
  const q=HF.q.toLocaleLowerCase('tr').trim();
  const f=rows.filter(v=>{
    if(q&&!((v.name||'')+' '+(v.cuisine_type||'')+' '+(v.district||'')).toLocaleLowerCase('tr').includes(q))return false;
    if(HF.cuisine&&!cuisines(v.cuisine_type).includes(HF.cuisine))return false;
    return true;
  });
  const open=f.filter(openNow),closed=f.filter(v=>!openNow(v));
  list.innerHTML=!f.length?empty(rows.length?'🔍':'🍽️',rows.length?'Sonuç bulunamadı':'Henüz restoran yok',rows.length?'Farklı bir kelime dene veya filtreyi kaldır.':'Yakında burada restoranlar olacak.',rows.length?'<button type="button" class="fb sm" onclick="foodResetFilters()">Filtreyi temizle</button>':''):
    (open.length?'<div class="fdSecT"><h2>'+(HF.cuisine?E(HF.cuisine)+' restoranları':'Restoranlar')+'</h2><span class="fdMuted fdSmall">'+open.length+' açık</span></div><div class="fdGrid">'+open.map(venueCard).join('')+'</div>':'')+
    (closed.length?'<div class="fdSecT"><h2 style="font-size:15px">Şu an kapalı</h2></div><div class="fdGrid">'+closed.map(venueCard).join('')+'</div>':'');
  setHTML('fdMore',HF.done?'':'<button type="button" class="fb block" style="margin-top:12px" onclick="foodHomeMore(this)">Daha fazla restoran</button>');
}
window.foodResetFilters=function(){HF.q='';HF.cuisine='';const i=document.getElementById('fdQ');if(i)i.value='';homeRender()};
function venueCard(v){
  const open=openNow(v);const cs=cuisines(v.cuisine_type);
  const fee=v.delivery_mode==='pickup'?'Gel-al':(+v.delivery_fee_kurus?'🛵 '+M(v.delivery_fee_kurus):'🛵 Ücretsiz teslimat');
  return '<button type="button" class="fdVCard'+(open?'':' closed')+'" onclick="showFoodVenue(\''+E(v.id)+'\')">'+
    '<span class="fdVTop">'+pic(v.cover_url||'',v.name+' '+(v.cuisine_type||''),'cover',foodIcon(v.cuisine_type||v.name))+
      (v.image_url?'<span class="fdPic fdLogo lg">'+'<img src="'+E(v.image_url)+'" alt="" loading="lazy" onerror="this.parentNode.remove()">'+'</span>':'')+
      '<span class="rt">'+(+v.rating_count?stars(v.rating_avg):'<span class="fdNew">Yeni</span>')+'</span>'+
      (open?'':'<span class="cl">'+E(nextOpen(v))+'</span>')+'</span>'+
    '<span class="bd'+(v.image_url?' hasLogo':'')+'" style="display:block"><h3>'+E(v.name)+'</h3><div class="sub">'+E([cs.slice(0,2).join(' · '),v.district].filter(Boolean).join(' • ')||'Restoran')+'</div>'+
    '<div class="mt"><span>⏱ '+etaText(v)+'</span><span>'+fee+'</span>'+(+v.min_order_amount?'<span class="fdMuted">Min. '+M(v.min_order_amount)+'</span>':'')+'</div></span></button>';
}

/* ====================== F3 · Restoran sayfası ====================== */
let VENUE=null;
async function showFoodVenue(id){
  if(!A())return;const tok=newScreen();
  render(bar('',"showFoodHome()")+skel('hero',1)+skel('row',4));
  try{
    const enc=encodeURIComponent(id);
    const [vs,cats,items,groups]=await Promise.all([
      Q('GET','food_venues?select=id,name,description,district,address_text,phone,cuisine_type,is_open,is_active,working_hours,min_order_amount,delivery_fee_kurus,platform_fee_kurus,prep_time_min,delivery_eta_min,delivery_mode,delivery_provider,image_url,cover_url,rating_avg,rating_count&id=eq.'+enc),
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&is_active=eq.true&order=sort_order.asc')
    ]);
    if(!alive(tok))return;
    const v=vs&&vs[0];if(!v)return render(bar('Restoran','showFoodHome()')+empty('🔍','Restoran bulunamadı','Bu restoran artık listelenmiyor olabilir.','<button type="button" class="fb pri" onclick="showFoodHome()">Restoranlara dön</button>'));
    const gByItem={};(groups||[]).forEach(g=>{(gByItem[g.menu_item_id]=gByItem[g.menu_item_id]||[]).push(Object.assign(g,{food_item_options:(g.food_item_options||[]).sort((a,b)=>a.sort_order-b.sort_order)}))});
    const activeCat=new Set((cats||[]).map(c=>c.id));
    const vis=(items||[]).filter(i=>!i.category_id||activeCat.has(i.category_id));
    VENUE={v,items:vis,groups:gByItem};
    const open=openNow(v);const cs=cuisines(v.cuisine_type);
    const secs=(cats||[]).map(c=>({c,items:vis.filter(i=>i.category_id===c.id)})).filter(s=>s.items.length);
    const other=vis.filter(i=>!i.category_id);if(other.length)secs.push({c:{id:'other',name:secs.length?'Diğer':'Menü'},items:other});
    render('<div class="fdHero">'+pic(v.cover_url||'',v.name+' '+(v.cuisine_type||''),'cover',foodIcon(v.cuisine_type||v.name))+
        '<div class="nav"><button type="button" class="fdIco" aria-label="Geri" onclick="showFoodHome()">‹</button><button type="button" class="fdIco" aria-label="Restoran bilgileri" onclick="foodVenueInfo()">ⓘ</button></div></div>'+
      '<div class="fdVHead">'+(v.image_url?pic(v.image_url,v.name,'fdLogo'):'')+'<div style="min-width:0;flex:1"><h1>'+E(v.name)+'</h1><div class="sub">'+E([cs.slice(0,3).join(' · '),v.district].filter(Boolean).join(' • '))+'</div></div>'+
        (+v.rating_count?'<div class="fdCenter"><div class="fdStar" style="box-shadow:none;border:1px solid var(--line)">★ '+(+v.rating_avg).toFixed(1).replace('.',',')+'</div><div class="fdMuted" style="font-size:11px;margin-top:3px">'+v.rating_count+' değerlendirme</div></div>':'<span class="fdNew">Yeni</span>')+'</div>'+
      '<div class="fdStats"><div><small>'+(v.delivery_mode==='pickup'?'Hazırlık':'Teslimat')+'</small><b>'+etaText(v)+'</b></div><div><small>'+(v.delivery_mode==='pickup'?'Sipariş':'Teslimat ücreti')+'</small><b>'+(v.delivery_mode==='pickup'?'Gel-al':(+v.delivery_fee_kurus?M(v.delivery_fee_kurus):'Ücretsiz'))+'</b></div><div><small>Min. sepet</small><b>'+(+v.min_order_amount?M(v.min_order_amount):'Yok')+'</b></div></div>'+
      (!open?'<div class="fdNote bad">🕐 '+E(nextOpen(v))+'. Menüye göz atabilirsin; restoran açıldığında sipariş verebilirsin.</div>':'')+
      '<div id="fdPast"></div>'+
      (secs.length>1?'<div class="fdTabsS"><div class="fdChips" id="fdCatBar">'+secs.map((s,i)=>'<button type="button" class="fdChip'+(i?'':' on')+'" data-sec="'+E(s.c.id)+'" onclick="foodGoSec(\''+E(s.c.id)+'\')">'+E(s.c.name)+'</button>').join('')+'</div></div>':'')+
      (secs.length?secs.map(s=>'<section class="fdMenuSec" id="fdSec-'+E(s.c.id)+'" data-sec="'+E(s.c.id)+'"><h2>'+E(s.c.name)+'</h2><div class="fdList">'+s.items.map(i=>prodRow(i,gByItem[i.id])).join('')+'</div></section>').join(''):
        empty('📋','Menü hazırlanıyor','Restoran menüsünü henüz eklemedi.')));
    const root=document.getElementById('fdRoot');root.dataset.sticky='1';root.insertAdjacentHTML('beforeend',stickyCart());
    refreshProdBadges();venuePast(tok,v);if(secs.length>1)scrollSpy(tok);
  }catch(e){if(alive(tok))render(bar('Restoran','showFoodHome()')+errBox(e,'showFoodVenue(\''+E(id)+'\')'))}
}
function prodRow(i,groups){
  const na=!i.is_available;const hasReq=(groups||[]).some(g=>g.is_required||g.min_select>0);
  const addBtn=na?'':'<button type="button" class="fdAdd'+(i.image_url?'':' fdAddS')+'" data-add="'+E(i.id)+'" aria-label="Sepete ekle" onclick="event.stopPropagation();'+(hasReq?'foodOpenItem':'foodQuickAdd')+'(\''+E(i.id)+'\')">+</button>';
  return '<div class="fdProd'+(na?' na':'')+'" '+(na?'':'role="button" tabindex="0" onclick="foodOpenItem(\''+E(i.id)+'\')"')+'>'+
    '<div class="tx"><b>'+E(i.name)+'</b>'+(i.description?'<p>'+E(i.description)+'</p>':'')+'<div class="pr">'+M(i.price_kurus)+(groups&&groups.length&&!na?'<span class="fdMuted fdSmall" style="font-weight:600"> · seçenekli</span>':'')+'</div></div>'+
    (i.image_url?'<div class="im">'+pic(i.image_url,i.name,'sq')+(na?'<span class="fdSold">Tükendi</span>':'')+addBtn+'</div>':(na?'<span class="fdPill">Tükendi</span>':addBtn))+'</div>';
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
    '<span>Ödeme</span><b>Kapıda nakit / kart</b>'+
    (+v.min_order_amount?'<span>Min. sepet</span><b>'+M(v.min_order_amount)+'</b>':'')+
    (+v.platform_fee_kurus?'<span>Hizmet bedeli</span><b>'+M(v.platform_fee_kurus)+'</b>':'')+'</div>'+
    '<h3 style="margin-top:18px">Çalışma saatleri</h3>'+hoursRows(v.working_hours),{sheet:true});
  bindClose(w);
};
window.foodQuickAdd=async function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i)return;
  await cartAdd(VENUE.v,{key:i.id+'|',menu_item_id:i.id,name:i.name,quantity:1,option_ids:[],options_label:'',unit_kurus:i.price_kurus,img:i.image_url||null});
};
window.foodOpenItem=function(itemId){
  if(!VENUE)return;const i=VENUE.items.find(x=>x.id===itemId);if(!i||!i.is_available)return;
  const groups=VENUE.groups[i.id]||[];let qty=1;
  const need=g=>g.is_required?Math.max(1,g.min_select):g.min_select;
  const w=modal((i.image_url?pic(i.image_url,i.name,'fdItemHero'):'')+
    '<div class="fdSheetH" style="margin-top:4px"><div><h3 style="font-size:20px">'+E(i.name)+'</h3><div style="font-weight:800;font-size:16px;margin-top:4px">'+M(i.price_kurus)+'</div></div><button type="button" class="fdX" aria-label="Kapat" data-x="close">✕</button></div>'+
    (i.description?'<p class="fdMuted" style="font-size:14px;line-height:1.5">'+E(i.description)+'</p>':'')+
    groups.map(g=>{
      const multi=g.kind!=='single'||g.max_select>1;const n=need(g);
      const hint=g.kind==='remove'?'İstemediklerini işaretle':multi?(n?'En az '+n+', ':'')+'en fazla '+g.max_select+' seçim':'1 seçim yap';
      return '<div class="fdGroupH"><div><b>'+E(g.name)+'</b><small>'+E(hint)+'</small></div>'+(n?'<span class="fdReq" data-req="'+E(g.id)+'">Zorunlu</span>':'<span class="fdMuted fdSmall">İsteğe bağlı</span>')+'</div>'+
        g.food_item_options.map(o=>'<label class="fdOpt'+(o.is_available?'':' na')+'"><span class="tx">'+(g.kind==='remove'?'Çıkar: ':'')+E(o.name)+(o.is_available?'':' · tükendi')+'</span>'+(+o.price_delta_kurus?'<span class="p">+'+M(o.price_delta_kurus)+'</span>':'')+
          '<input type="'+(multi?'checkbox':'radio')+'" name="g'+E(g.id)+'" value="'+E(o.id)+'" data-g="'+E(g.id)+'" data-p="'+(+o.price_delta_kurus||0)+'"'+(o.is_available?'':' disabled')+'></label>').join('');
    }).join('')+
    '<div class="fdErr" id="fdItemErr" hidden></div>'+
    '<div class="fdFoot"><div class="fdQty"><button type="button" data-q="-1" aria-label="Azalt">−</button><b id="fdIQ">1</b><button type="button" data-q="1" aria-label="Artır">+</button></div>'+
    '<button type="button" class="fb pri" style="flex:1;min-height:50px" id="fdIAdd">Sepete ekle · <span id="fdIP">'+M(i.price_kurus)+'</span></button></div>',{sheet:true,full:true});
  bindClose(w);
  const calc=()=>{const sel=qa('input:checked',w);const add=sel.reduce((n,x)=>n+(+x.dataset.p||0),0);
    w.querySelector('#fdIP').textContent=M((i.price_kurus+add)*qty);w.querySelector('#fdIQ').textContent=qty;
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
    await cartAdd(VENUE.v,{key:i.id+'|'+ids.join(','),menu_item_id:i.id,name:i.name,quantity:qty,option_ids:ids,options_label:label,unit_kurus:i.price_kurus+add,img:i.image_url||null});
  };
};

/* ====================== F4 · Sepet ====================== */
const CO={fulfillment:null,phone:'',note:'',payment:'cash_on_delivery',quote:null,venue:null,refresh:null};
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
  const q=await RPC('food_price_cart',{p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_address_id:ap.p_address_id,p_lat:ap.p_lat,p_lng:ap.p_lng});
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
    (q.discount_kurus?'<div class="fdLine"><span class="m">İndirim</span><span class="fdOk">−'+M(q.discount_kurus)+'</span></div>':'')+
    '<div class="fdLine total"><span>Toplam</span><span>'+M(q.total_kurus)+'</span></div>';
}
function issuesHTML(list){return list&&list.length?'<div class="fdNote bad">'+list.map(i=>'<div>'+E(i.message)+'</div>').join('')+'</div>':''}
async function showFoodCart(){
  if(!A())return;const tok=newScreen();const c=cartGet();
  if(!c.items.length)return render(bar('Sepetim','showFoodHome()')+empty('🛒','Sepetin boş','Restoranlara göz at, beğendiklerini sepete ekle.','<button type="button" class="fb pri" onclick="showFoodHome()">Restoranları keşfet</button>'));
  coFulfillDefault();
  render(bar('Sepetim','showFoodVenue(\''+E(c.venue.id)+'\')','<button type="button" class="fb ghostBad" onclick="foodClearCart()">Temizle</button>')+
    '<button type="button" class="fdRowBtn" style="margin-bottom:12px" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">'+pic(c.venue.image_url||'',c.venue.name,'sq').replace('class="fdPic sq"','class="fdPic sq" style="width:44px;border-radius:12px"')+'<span class="tx"><small>Restoran</small><b>'+E(c.venue.name)+'</b></span><span class="fdMuted fdSmall" style="font-weight:700">Menü ›</span></button>'+
    '<div class="fdList" id="fdLines"></div>'+
    '<button type="button" class="fb ghost" style="margin:6px 0 0" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">+ Ürün ekle</button>'+
    '<h2>Özet</h2><div class="fdCard" id="fdSum">'+skel('line',3)+'</div><div id="fdIss"></div>'+
    '<div class="fdSticky"><div class="fdCta"><button type="button" class="fb pri" id="fdNext" disabled onclick="showFoodCheckout()">Devam et</button></div></div>');
  cartLines();cartQuote(tok);
}
function cartLines(){
  const c=cartGet();const el=document.getElementById('fdLines');if(!el)return;
  el.innerHTML=c.items.map((x,idx)=>'<div class="fdCartItem">'+(x.img?pic(x.img,x.name,'sq'):'')+'<div class="tx"><b>'+E(x.name)+'</b>'+(x.options_label?'<small>'+E(x.options_label)+'</small>':'')+'<div class="pr">'+M(x.unit_kurus*x.quantity)+'</div></div>'+
    '<div class="fdQty sm"><button type="button" aria-label="'+(x.quantity===1?'Sil':'Azalt')+'" onclick="foodQty('+idx+',-1)">'+(x.quantity===1?'🗑':'−')+'</button><b>'+x.quantity+'</b><button type="button" aria-label="Artır" onclick="foodQty('+idx+',1)">+</button></div></div>').join('');
}
const cartQuote=debounce(async tok=>{
  const btn=document.getElementById('fdNext');if(btn)btn.disabled=true;
  try{const q=await runQuote();if(q===undefined||!alive(tok))return;if(!q)return;
    cartLines();setHTML('fdSum',sumHTML(q));
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
  render(bar('Siparişi onayla','showFoodCart()',null,c.venue.name)+skel('row',3));
  try{const vs=await Q('GET','food_venues?select=id,name,address_text,district,delivery_mode,image_url,phone&id=eq.'+encodeURIComponent(c.venue.id));CO.venue=vs&&vs[0]||c.venue}catch(e){CO.venue=c.venue}
  await loadAddrs();await currentAddr();
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
    '</div>'+
    '<h2>Ödeme özeti</h2><div class="fdCard" id="fdSum">'+(CO.quote?sumHTML(CO.quote):skel('line',3))+'</div><div id="fdIss"></div>'+
    '<p class="fdMuted fdSmall fdCenter" id="fdEtaL" style="margin-top:10px"></p>'+
    '<div class="fdSticky"><div class="fdCta"><button type="button" class="fb pri" id="fdPlace" disabled onclick="foodPlaceOrder(this)">Siparişi ver</button></div></div>');
  coQuote(tok);
}
window.foodSetFul=function(f){CO.fulfillment=f;CO.refresh&&CO.refresh()};
const coQuote=debounce(async tok=>{
  const btn=document.getElementById('fdPlace');if(btn)btn.disabled=true;
  try{const q=await runQuote();if(q===undefined||!alive(tok)||!q)return;
    setHTML('fdSum',sumHTML(q));setHTML('fdIss',issuesHTML(q.issues));
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
window.foodCoNote=async function(){const v=await promptBox('Sipariş notu','Örn. zili çalmayın, acısız olsun',{value:CO.note,chips:['Zili çalmayın','Acısız olsun','Kapıya bırakın'],okLabel:'Kaydet'});if(v===null)return;CO.note=v;CO.refresh&&CO.refresh()};
window.foodCoPay=function(){
  const w=modal(sheetHead('Ödeme yöntemi','Ödemeyi teslimatta yaparsın.')+'<div class="fdRadio">'+Object.entries(PAY).map(([k,l])=>'<label class="'+(CO.payment===k?'on':'')+'"><input type="radio" name="fdPay" value="'+k+'"'+(CO.payment===k?' checked':'')+'><span>'+PAYI[k]+' '+E(l)+'<small>'+(k==='agree_with_venue'?'Ödeme şeklini restoranla konuşursun.':k==='card_on_delivery'?'Kurye POS cihazıyla ödersin.':'Teslimatta nakit ödersin.')+'</small></span></label>').join('')+'</div>'+
    '<p class="fdMuted fdSmall" style="margin-top:12px">Online ödeme yakında eklenecek.</p>',{sheet:true});
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
  const body={p_venue_id:c.venue.id,p_items:cartPayload(),p_fulfillment:CO.fulfillment,p_phone:phone,p_note:CO.note||null,p_payment_method:CO.payment,
    p_client_request_id:c.req,p_address_id:ap.p_address_id,p_address_text:ap.p_address_text,p_lat:ap.p_lat,p_lng:ap.p_lng};
  await once('placeOrder',btn,async()=>{
    let r=null,lastErr=null;
    for(let attempt=0;attempt<3&&!r;attempt++){
      try{r=await RPC('food_place_order',body)}
      catch(e){lastErr=e;if(!isNetErr(e))break;await sleep(1200*(attempt+1))} /* aynı istek kimliği → sunucu çift sipariş oluşturmaz */
    }
    if(!r){toast(errMsg(lastErr),'err');if(!isNetErr(lastErr))coQuote(SCREEN);return}
    localStorage.setItem(PHONE_KEY,phone);localStorage.removeItem(CART_KEY);CO.quote=null;CO.note='';
    toast(r.duplicate?'Bu sipariş zaten oluşturulmuştu.':'Siparişin restorana iletildi!');
    try{navigator.vibrate&&navigator.vibrate([40,40,40])}catch(e){}
    showFoodOrderDetail(r.order_id);
  });
};

/* ====================== F5 · Siparişlerim ====================== */
const OL={tab:'active',rows:[],offset:0,done:false,embed:true};
async function showFoodOrders(){
  if(!A())return;const tok=newScreen();OL.rows=[];OL.offset=0;OL.done=false;
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
  const st=STL[o.status]||['•',o.status];const t=tone(o.status);const its=o.food_order_items||[];const reviewed=Array.isArray(o.food_reviews)&&o.food_reviews.length>0;
  const vn=o.food_venues?o.food_venues.name:'Restoran';
  let acts='';
  if(!TERMINAL.includes(o.status))acts='<button type="button" class="fb pri" onclick="showFoodOrderDetail(\''+E(o.id)+'\')">Siparişi takip et</button>';
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
async function showFoodOrderDetail(id){
  if(!A())return;const tok=newScreen();
  render(bar('Sipariş','showFoodOrders()')+skel('hero',1)+skel('row',2));
  const load=async()=>{
    try{const t=await RPC('food_order_tracking',{p_order_id:id});if(alive(tok))trackRender(t)}
    catch(e){if(alive(tok)&&!document.getElementById('fdTrack'))render(bar('Sipariş','showFoodOrders()')+errBox(e,'showFoodOrderDetail(\''+E(id)+'\')'))}
  };
  await load();
  watch(tok,[{table:'food_orders',filter:'id=eq.'+id},{table:'food_deliveries',filter:'order_id=eq.'+id}],()=>load());
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
  (document.getElementById('fdTrack')?patch:render)(bar('#'+o.no,'showFoodOrders()','<span class="fdLive" id="fdLive"></span>',t.venue.name)+
    '<div id="fdTrack"><div class="fdTrackHero'+(bad?' bad':done?' ok':'')+'"><div class="st"><span class="e">'+info[0]+'</span><div><h2>'+E(info[1])+'</h2><p>'+E(sub)+'</p></div></div>'+
      (o.cancel_reason&&bad?'<div class="fdNote bad" style="margin:12px 0 0">Sebep: '+E(o.cancel_reason)+'</div>':'')+
      (!bad&&!done&&etaTs?'<div class="fdEta"><small>'+(pickup?'Tahmini hazır olma':'Tahmini teslimat')+'</small><b>'+hm(etaTs)+'</b></div>':'')+
      (done?'<div class="fdEta"><small>Teslim edildi</small><b>'+hm((events.find(e=>e.to==='delivered')||{}).at||o.created_at)+'</b></div>':'')+
      (!bad?'<div class="fdSteps">'+lbl.map((l,i)=>'<div class="'+(i<stg||done?'done':i===stg?'cur':'')+'"><i></i>'+E(l)+'</div>').join('')+'</div>':'')+'</div>'+
    (showCode?'<div class="fdCodeBox"><div class="tx"><small>TESLİMAT KODUN</small><span class="fdSmall">Siparişi teslim alırken kuryeye söyle.</span></div><b>'+E(t.delivery_code)+'</b></div>':'')+
    (cr?'<div class="fdPerson"><span class="av">🛵</span><div class="tx"><b>'+E(cr.name)+'</b><small>'+E(VEH[cr.vehicle]||'Kurye')+(+cr.rating_avg?' · ★ '+(+cr.rating_avg).toFixed(1):'')+
      (d.location?' · <a href="https://www.google.com/maps?q='+d.location.lat+','+d.location.lng+'" target="_blank" rel="noopener" style="color:var(--fd-acc)">konum ('+ago(d.location.at)+')</a>':'')+'</small></div>'+
      (cr.phone&&!TERMINAL.includes(st)?'<a class="fb sm soft" href="tel:'+E(cr.phone)+'">📞 Ara</a>':'')+'</div>':'')+
    '<div class="fdPerson"><span class="av">🏪</span><div class="tx"><b>'+E(t.venue.name)+'</b><small>'+E(MODE[o.delivery_mode]||'')+'</small></div>'+(t.venue.phone&&!TERMINAL.includes(st)?'<a class="fb sm" href="tel:'+E(t.venue.phone)+'">📞</a>':'')+'</div>'+
    (acts.length?'<div class="fdRows" style="margin-bottom:12px">'+acts.join('')+'</div>':'')+
    (t.review?'<div class="fdNote ok">★ Değerlendirmen: restoran '+t.review.venue_rating+'/5'+(t.review.courier_rating?' · kurye '+t.review.courier_rating+'/5':'')+(t.review.comment?' — '+E(t.review.comment):'')+'</div>':'')+
    '<details class="fdDet"><summary>Sipariş detayı · '+M(o.total_kurus)+'</summary><div>'+
      t.items.map(i=>'<div class="fdLine"><span>'+i.quantity+'× '+E(i.name)+((i.options||[]).length?'<br><small class="fdMuted">'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</span><span>'+M(i.line_total_kurus)+'</span></div>').join('')+
      '<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:6px">'+sumHTML({subtotal_kurus:o.subtotal_kurus,delivery_fee_kurus:o.delivery_fee_kurus,platform_fee_kurus:o.platform_fee_kurus,discount_kurus:o.discount_kurus,total_kurus:o.total_kurus},!pickup)+'</div>'+
      '<div class="fdKV"><span>Ödeme</span><b>'+E(PAY[o.payment_method]||o.payment_method)+'</b>'+(o.address_text?'<span>Adres</span><b>'+E(o.address_text)+'</b>':'')+(o.phone?'<span>Telefon</span><b>'+E(o.phone)+'</b>':'')+(o.note?'<span>Not</span><b>'+E(o.note)+'</b>':'')+'<span>Sipariş</span><b>'+E(dt(o.created_at))+'</b></div>'+
      (events.length?'<ul class="fdEv">'+events.map(e=>'<li><b>'+E(STL[e.to][1])+'</b><span>'+hm(e.at)+'</span></li>').join('')+'</ul>':'')+
    '</div></details>'+
    ((t.issues||[]).length?'<details class="fdDet" open><summary>Bildirdiğin sorunlar</summary><div>'+t.issues.map(x=>'<div style="margin-bottom:8px"><b>'+E(ISSUE[x.type]||x.type)+'</b> <span class="fdPill">'+E({open:'Açık',in_review:'İnceleniyor',resolved:'Çözüldü',rejected:'Sonuçlandı'}[x.status]||x.status)+'</span>'+(x.description?'<div class="fdMuted fdSmall">'+E(x.description)+'</div>':'')+(x.resolution?'<div class="fdSmall" style="margin-top:4px">↳ '+E(x.resolution)+'</div>':'')+'</div>').join('')+'</div></details>':'')+
    '<div class="fdCenter" style="margin-top:6px">'+
      (t.can.cancel?'<button type="button" class="fb ghostBad" onclick="foodCustomerCancel(\''+E(o.id)+'\',this)">Siparişi iptal et</button>':'')+
      (t.can.report?'<button type="button" class="fb ghost" onclick="foodIssue(\''+E(o.id)+'\')">Yardım · Sorun bildir</button>':'')+'</div>'+
    (!t.can.cancel&&!TERMINAL.includes(st)&&st!=='new'?'<p class="fdMuted fdSmall fdCenter">Restoran onayladıktan sonra iptal için restoranı arayabilirsin.</p>':'')+'</div>');
}
window.foodCustomerCancel=async function(id,btn){
  const ok=await confirmBox('Sipariş iptal edilsin mi?','Restoran henüz onaylamadığı için ücretsiz iptal edebilirsin.','İptal et',true);if(!ok)return;
  await once('cancel'+id,btn,async()=>{try{await RPC('food_transition_order',{p_order_id:id,p_to:'cancelled',p_reason:'Müşteri iptal etti'});toast('Siparişin iptal edildi');showFoodOrderDetail(id)}catch(e){toast(errMsg(e),'err');showFoodOrderDetail(id)}});
};
window.foodReview=function(id,withCourier){
  let vr=0,cr=0;
  const starsRow=k=>'<div class="fdStars" data-k="'+k+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-n="'+n+'" aria-label="'+n+' yıldız">★</button>').join('')+'</div>';
  const w=modal(sheetHead('Siparişini değerlendir','Yorumun restoranın gelişmesine yardımcı olur.')+'<b>Restoran</b>'+starsRow('v')+(withCourier?'<b>Kurye</b>'+starsRow('c'):'')+
    '<div class="fdForm"><textarea id="fdRvC" rows="3" maxlength="1000" placeholder="Yorumun (isteğe bağlı)"></textarea></div><div class="fdErr" id="fdRvE" hidden></div>'+
    '<button type="button" class="fb pri block" style="margin-top:12px" data-x="ok">Gönder</button>',{sheet:true});
  bindClose(w);
  qa('.fdStars',w).forEach(g=>qa('button',g).forEach(b=>b.onclick=()=>{const n=+b.dataset.n;if(g.dataset.k==='v')vr=n;else cr=n;qa('button',g).forEach(x=>x.classList.toggle('on',+x.dataset.n<=n))}));
  w.querySelector('[data-x=ok]').onclick=async function(){
    if(!vr){const e=w.querySelector('#fdRvE');e.hidden=false;e.textContent='Restorana puan ver.';return}
    await once('review'+id,this,async()=>{try{await RPC('food_submit_review',{p_order_id:id,p_venue_rating:vr,p_courier_rating:cr||null,p_comment:w.querySelector('#fdRvC').value||null});closeModal();toast('Teşekkürler, değerlendirmen kaydedildi');
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
  render(bar('Bildirimler','showFoodHome()','<button type="button" class="fb ghost" onclick="foodReadAll(this)">Tümü okundu</button>')+'<div id="fdNList">'+skel('row',3)+'</div>');
  const load=async()=>{
    try{const r=await Q('GET','food_notifications?select=id,order_id,type,title,body,read_at,created_at&order=created_at.desc&limit=40');if(!alive(tok))return;
      setHTML('fdNList',r.length?'<div class="fdRows">'+r.map(n=>'<button type="button" class="fdRowBtn" style="'+(n.read_at?'opacity:.65':'border-color:var(--fd-acc)')+'" onclick="foodOpenNotif(\''+E(n.id)+'\',\''+E(n.order_id||'')+'\',\''+E(n.type)+'\')"><span class="ic">'+(n.read_at?'🔕':'🔔')+'</span><span class="tx"><small>'+E(ago(n.created_at))+'</small><b>'+E(n.title)+'</b><span class="fdMuted fdSmall" style="display:block">'+E(n.body||'')+'</span></span><span class="ch">›</span></button>').join('')+'</div>':
        empty('🔔','Bildirim yok','Sipariş durumların burada görünür.'))}
    catch(e){setHTML('fdNList',errBox(e,'showFoodNotifications()'))}
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

/* ====================== F6 · İşletme paneli ====================== */
const TABS=[['new','Yeni',['new']],['prep','Mutfakta',['preparing']],['ready','Hazır',['ready','courier_wait','active_delivery']],['past','Geçmiş',null]];
const BZ={venueId:null,role:null,tab:'new',past:'done',offset:0,orders:[],venue:null,venues:[]};
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.08;o.start();setTimeout(()=>{o.frequency.value=1175},140);setTimeout(()=>{o.stop();c.close()},320)}catch(e){}}
function isMgr(){return BZ.role==='owner'||BZ.role==='manager'}
function subnav(venueId,on){
  if(!isMgr())return '';
  return '<div class="fdSub"><button type="button" class="'+(on==='orders'?'on':'')+'" onclick="showFoodBusiness(\''+E(venueId)+'\')">Siparişler</button><button type="button" class="'+(on==='menu'?'on':'')+'" onclick="showFoodMenu(\''+E(venueId)+'\')">Menü</button><button type="button" class="'+(on==='settings'?'on':'')+'" onclick="showFoodSettings(\''+E(venueId)+'\')">Ayarlar</button></div>';
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
async function showFoodBusiness(venueId){
  if(!A())return;const tok=newScreen();
  render(bar('İşletme paneli','showFoodHome()')+skel('row',1)+skel('row',3));
  let cur;try{cur=await bizContext(venueId)}catch(e){return render(bar('İşletme paneli','showFoodHome()')+errBox(e,'showFoodBusiness()'))}
  if(!alive(tok))return;if(!cur)return venueCreateForm();
  let v=null;try{v=(await Q('GET','food_venues?select=id,name,is_open,is_active,working_hours,delivery_mode,delivery_provider&id=eq.'+cur.id))[0]}catch(e){}
  if(!alive(tok))return;BZ.venue=v||{id:cur.id,name:cur.name,is_open:false};BZ.offset=0;BZ.orders=[];
  const mgr=isMgr();const open=BZ.venue.is_open;
  render(bar(BZ.venue.name,'showFoodHome()','<span class="fdLive" id="fdLive"></span>'+venueSwitchBtn()+bellBtn(),{owner:'İşletme sahibi',manager:'Yönetici',staff:'Personel'}[cur.role]||'')+
    subnav(cur.id,'orders')+
    '<div class="fdOpen'+(open?' on':'')+'" id="fdOpenCard"><div class="tx"><b>'+(open?'Sipariş alıyorsun':'Sipariş almıyorsun')+'</b><small>'+(open&&v&&!openNow(v)&&v.is_active?'Açık ama şu an çalışma saati dışında':open?'Müşteriler sipariş verebilir':'Menün görünür, sipariş verilemez')+'</small></div>'+
      (mgr?sw('fdOpenSw',open,'foodToggleOpen(this)'):'')+'</div>'+
    '<div id="fdIssB"></div><div class="fdKpi" id="fdKpi">'+skel('line',1)+'</div>'+
    '<div class="fdSeg" id="fdTabs"></div><div id="fdPastF"></div><div id="fdBList">'+skel('row',2)+'</div><div id="fdBMore"></div>');
  bellCount();
  const origTitle=document.title;onCleanup(()=>{document.title=origTitle});BZ.origTitle=origTitle;
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
    const nNew=+c.new||0;
    document.title=(nNew?'('+nNew+') Yeni sipariş · ':'')+(BZ.origTitle||document.title.replace(/^\(\d+\) Yeni sipariş · /,''));
    setHTML('fdKpi','<div class="'+(nNew?'hot':'')+'"><b>'+nNew+'</b><span>Bekleyen</span></div><div><b>'+(s.today_orders||0)+'</b><span>Bugün sipariş</span></div><div><b>'+M(s.today_revenue_kurus||0)+'</b><span>Bugün hakediş</span></div>');
    setHTML('fdTabs',TABS.map(t=>{const n=cnt(t);return '<button type="button" class="'+(BZ.tab===t[0]?'on':'')+'" onclick="foodBizTab(\''+t[0]+'\')">'+E(t[1])+(n!=null?'<em class="'+(n?'':'z')+'">'+n+'</em>':'')+'</button>'}).join(''));
    setHTML('fdPastF',BZ.tab==='past'?'<div class="fdChips"><button type="button" class="fdChip'+(BZ.past==='done'?' on':'')+'" onclick="foodBizPast(\'done\')">Tamamlanan · '+(+c.done||0)+'</button><button type="button" class="fdChip'+(BZ.past==='cancelled'?' on':'')+'" onclick="foodBizPast(\'cancelled\')">İptal / red · '+(+c.cancelled||0)+'</button></div>'+
      (s.avg_prep_min!=null?'<p class="fdMuted fdSmall" style="margin:0 0 10px">Bugün: '+(s.today_delivered||0)+' tamamlanan · '+(s.today_cancelled||0)+' iptal · ort. hazırlık '+s.avg_prep_min+' dk</p>':''):'');
    const emptyTxt={new:['🛎️','Yeni sipariş yok','Sipariş geldiğinde burada anında görünür ve sesli uyarı alırsın.'],prep:['👨‍🍳','Mutfakta sipariş yok','Kabul ettiğin siparişler burada.'],ready:['📦','Hazır veya yolda sipariş yok','Hazır, kurye bekleyen ve yoldaki siparişler burada.'],past:['🧾','Kayıt yok','']}[BZ.tab];
    setHTML('fdBList',BZ.orders.length?BZ.orders.map(bizCard).join(''):empty(emptyTxt[0],emptyTxt[1],emptyTxt[2]));
    setHTML('fdBMore',!tab[2]&&orders.length===20?'<button type="button" class="fb block" onclick="foodBizMore(this)">Daha fazla</button>':'');
  }catch(e){setHTML('fdBList',errBox(e,'showFoodBusiness()'))}
}
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
  return '<div class="fdBiz'+(o.status==='new'?' new':'')+'"><div class="hd"><div><b>#'+E(o.no)+'</b> <span class="fdMuted fdSmall">· '+ago(o.created_at)+'</span><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'+badge(o.status)+'<span class="fdPill">'+(o.delivery_mode==='pickup'?'🛍️':'🛵')+' '+E(MODE[o.delivery_mode]||'')+'</span>'+(late?'<span class="fdBadge bad">⏰ Gecikiyor</span>':'')+'</div></div>'+
    '<div class="tot"><b>'+M(o.total_kurus)+'</b><small>'+E(PAY[o.payment_method]||'')+'</small>'+(past&&o.status==='delivered'?'<small>Hakediş '+M(o.restaurant_share_kurus)+'</small>':'')+'</div></div>'+
    '<div class="its">'+(o.items||[]).map(i=>'<div><span class="q">'+i.quantity+'×</span>'+E(i.name)+((i.options||[]).length?'<small>'+E(i.options.map(x=>(x.kind==='remove'?'Çıkar: ':'')+x.option).join(', '))+'</small>':'')+'</div>').join('')+'</div>'+
    (o.note?'<div class="fdNote warn note">📝 '+E(o.note)+'</div>':'')+
    '<div class="inf">'+(o.address_text?'<div>📍 '+E(o.address_text)+'</div>':'')+(o.phone?'<div>📞 <a href="tel:'+E(o.phone)+'">'+E(o.phone)+'</a></div>':'')+
      (o.estimated_ready_at&&!past?'<div>⏱ Hazır olacak: <b>'+hm(o.estimated_ready_at)+'</b></div>':'')+
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
window.foodToggleOpen=async function(inp){
  const open=inp.checked;inp.disabled=true;
  try{await Q('PATCH','food_venues?id=eq.'+BZ.venueId,{is_open:open});toast(open?'Restoran sipariş almaya başladı':'Restoran sipariş almayı durdurdu');showFoodBusiness(BZ.venueId)}
  catch(e){inp.checked=!open;inp.disabled=false;toast(errMsg(e),'err')}
};
window.foodNewVenue=function(){newScreen();venueCreateForm(true)};
function venueCreateForm(extra){
  const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  render(bar(extra?'Yeni işletme':'İşletmeni ekle','showFoodHome()')+
    (extra?'':'<div class="fdTrackHero" style="text-align:center"><div style="font-size:40px">🏪</div><h2 style="margin-top:6px">Restoranını İşimi Çöz\'e taşı</h2><p>Birkaç dakikada kaydol, menünü ekle ve sipariş almaya başla.</p></div>')+
    '<div class="fdCard fdForm">'+
    '<label for="nvName">İşletme adı</label><input id="nvName" maxlength="80" autocomplete="organization">'+
    '<div class="two"><div><label for="nvDist">İlçe</label><select id="nvDist"><option value="">Seç</option>'+ds.map(d=>'<option>'+E(d)+'</option>').join('')+'</select></div><div><label for="nvPhone">Telefon</label><input id="nvPhone" type="tel" inputmode="tel"></div></div>'+
    '<label for="nvAddr">Açık adres</label><input id="nvAddr" maxlength="200">'+
    '<label for="nvCui">Mutfak</label><input id="nvCui" maxlength="80" placeholder="Pide, Kebap, Çorba"><div class="hint">Virgülle ayır. Müşteri aramalarında ve kategorilerde kullanılır.</div>'+
    '<label for="nvMode">Sipariş türü</label><select id="nvMode"><option value="both">Teslimat + Gel-al</option><option value="self_delivery">Yalnızca teslimat</option><option value="pickup">Yalnızca gel-al</option></select>'+
    '<div class="fdErr" id="nvErr" hidden></div><button type="button" class="fb pri block" style="margin-top:16px" onclick="foodCreateVenue(this)">İşletmeyi oluştur</button>'+
    '<p class="fdMuted fdSmall fdCenter" style="margin-top:10px">İşletmen kapalı başlar; menünü ekleyip hazır olduğunda açarsın.</p></div>');
}
window.foodCreateVenue=async function(btn){
  const g=id=>document.getElementById(id).value.trim();const err=document.getElementById('nvErr');const fail=m=>{err.hidden=false;err.textContent=m};
  const body={owner_user_id:UID(),name:g('nvName'),district:g('nvDist'),phone:g('nvPhone'),address_text:g('nvAddr'),cuisine_type:g('nvCui'),delivery_mode:g('nvMode'),city:'İzmir',is_active:true,is_open:false};
  if(body.name.length<2)return fail('İşletme adını yaz.');if(!body.district)return fail('İlçe seç.');if(body.phone.replace(/\D/g,'').length<10)return fail('Geçerli bir telefon yaz.');
  await once('createVenue',btn,async()=>{try{const r=await Q('POST','food_venues',body);WHO=null;localStorage.setItem(VENUE_KEY,r[0].id);toast('İşletmen oluşturuldu');showFoodSettings(r[0].id,true)}catch(e){fail(errMsg(e))}});
};

/* ====================== F6 · Ayarlar (bölümlü) ====================== */
async function showFoodSettings(venueId,firstRun){
  if(!A())return;const tok=newScreen();
  render(bar('Ayarlar','showFoodBusiness(\''+E(venueId)+'\')')+skel('row',4));
  let v;try{await bizContext(venueId);v=(await Q('GET','food_venues?select=*&id=eq.'+encodeURIComponent(venueId)))[0]}catch(e){return render(bar('Ayarlar','showFoodBusiness()')+errBox(e,'showFoodSettings(\''+E(venueId)+'\')'))}
  if(!alive(tok)||!v)return;
  const wh=v.working_hours||{};const hasHours=Object.keys(wh).length>0;const ds=(typeof DISTRICTS!=='undefined'?DISTRICTS:[]);
  const opt=(val,cur,l)=>'<option value="'+val+'"'+(val===cur?' selected':'')+'>'+l+'</option>';
  render(bar('Ayarlar','showFoodBusiness(\''+E(venueId)+'\')',null,v.name)+subnav(venueId,'settings')+
    (firstRun?'<div class="fdNote ok">👋 Hoş geldin! Önce temel bilgileri ve görselleri tamamla, sonra Menü sekmesinden ürünlerini ekle.</div>':'')+
    '<div class="fdForm">'+
    '<details class="fdDet"'+(firstRun?' open':'')+'><summary>🏪 Genel bilgiler</summary><div>'+
      '<label for="sName">İşletme adı</label><input id="sName" maxlength="80" value="'+E(v.name)+'">'+
      '<label for="sDesc">Kısa açıklama</label><textarea id="sDesc" rows="2" maxlength="300" placeholder="Örn. 1985\'ten beri odun ateşinde pide">'+E(v.description||'')+'</textarea>'+
      '<div class="two"><div><label for="sDist">İlçe</label><select id="sDist">'+(ds.includes(v.district)?'':'<option>'+E(v.district||'')+'</option>')+ds.map(d=>'<option'+(d===v.district?' selected':'')+'>'+E(d)+'</option>').join('')+'</select></div><div><label for="sPhone">Telefon</label><input id="sPhone" type="tel" value="'+E(v.phone||'')+'"></div></div>'+
      '<label for="sAddr">Açık adres</label><input id="sAddr" maxlength="200" value="'+E(v.address_text||'')+'">'+
      '<label for="sCui">Mutfak</label><input id="sCui" maxlength="80" value="'+E(v.cuisine_type||'')+'" placeholder="Pide, Kebap, Çorba"><div class="hint">Virgülle ayır. Müşteri kategorilerinde görünür.</div>'+
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
  if(!A())return;const tok=newScreen();MN.venueId=venueId;
  if(!document.getElementById('fdMenuRoot'))render(bar('Menü','showFoodBusiness(\''+E(venueId)+'\')')+skel('row',4));
  try{
    const enc=encodeURIComponent(venueId);
    const [,cats,items,groups]=await Promise.all([bizContext(venueId),
      Q('GET','food_menu_categories?select=id,name,sort_order,is_active&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_menu_items?select=id,name,description,price_kurus,is_available,category_id,image_url,sort_order&venue_id=eq.'+enc+'&order=sort_order.asc,name.asc'),
      Q('GET','food_item_option_groups?select=id,menu_item_id,name,kind,min_select,max_select,is_required,sort_order,is_active,food_item_options(id,name,price_delta_kurus,is_available,sort_order)&venue_id=eq.'+enc+'&order=sort_order.asc')]);
    if(!alive(tok))return;
    MN.cats=cats;MN.items=items;MN.groups={};groups.forEach(g=>{g.food_item_options.sort((a,b)=>a.sort_order-b.sort_order);(MN.groups[g.menu_item_id]=MN.groups[g.menu_item_id]||[]).push(g)});
    const secs=cats.map(c=>({c,items:items.filter(i=>i.category_id===c.id)}));const other=items.filter(i=>!i.category_id||!cats.some(c=>c.id===i.category_id));
    const noImg=items.filter(i=>!i.image_url).length;
    patchOrRender('<div id="fdMenuRoot"></div>'+bar('Menü','showFoodBusiness(\''+E(venueId)+'\')',null,items.length+' ürün')+subnav(venueId,'menu')+
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
    (id?'<button type="button" class="fdRowBtn" style="margin-top:14px" id="ieO"><span class="ic">⚙️</span><span class="tx"><small>Seçenekler</small><b>'+(gs.length?gs.map(g=>E(g.name)).join(', '):'Porsiyon, ekstra, çıkarılacak malzeme')+'</b></span><span class="ch">›</span></button>':'<p class="fdMuted fdSmall" style="margin-top:10px">Seçenekleri (porsiyon, ekstra) ürünü kaydettikten sonra ekleyebilirsin.</p>')+
    '<div class="fdErr" id="ieE" hidden></div></div><div class="fdFoot"><button type="button" class="fb pri" style="flex:1" data-x="ok">Kaydet</button></div>',{sheet:true,full:true});
  bindClose(w);
  w.querySelector('#ieI').onchange=function(){const f=this.files&&this.files[0];if(!f)return;newFile=f;removeImg=false;setHTML('ieP','<span class="fdPic sq"><img src="'+URL.createObjectURL(f)+'" alt=""></span>')};
  const rb=w.querySelector('#ieR');if(rb)rb.onclick=()=>{removeImg=true;newFile=null;setHTML('ieP',pic('',i.name,'sq'));rb.remove()};
  const ob=w.querySelector('#ieO');if(ob)ob.onclick=()=>{closeModal();foodOptions(id)};
  w.querySelector('[data-x=ok]').onclick=async function(){
    const err=w.querySelector('#ieE');const fail=m=>{err.hidden=false;err.textContent=m;err.scrollIntoView({block:'center'})};
    const name=w.querySelector('#ieN').value.trim();const price=tlToKurus(w.querySelector('#ieF').value);
    if(name.length<2)return fail('Ürün adını yaz.');if(isNaN(price)||price<=0)return fail('Geçerli bir fiyat gir.');
    const body={name,description:w.querySelector('#ieD').value.trim()||null,price_kurus:price,category_id:w.querySelector('#ieC').value||null};
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
  if(!A())return;const tok=newScreen();
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
  if(!A())return;const tok=newScreen();
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
const CSTEP={assigned:['at_venue','Restorana vardım'],at_venue:['picked_up','Siparişi teslim aldım'],picked_up:['on_the_way','Yola çıktım'],on_the_way:['near_customer','Müşteriye yaklaştım']};
const CIDX={assigned:0,at_venue:1,picked_up:2,on_the_way:3,near_customer:3};
let CACT=null;
async function showFoodCourier(){
  if(!A())return;const tok=newScreen();
  render(bar('Kurye','showFoodHome()')+skel('row',3));
  let w;try{w=await whoami(true)}catch(e){return render(bar('Kurye','showFoodHome()')+errBox(e,'showFoodCourier()'))}
  if(!alive(tok))return;const c=w.courier;
  if(!c)return render(bar('Kurye ol','showFoodHome()')+
    '<div class="fdTrackHero" style="text-align:center"><div style="font-size:40px">🛵</div><h2 style="margin-top:6px">Kendi saatlerinde teslimat yap</h2><p>Başvurun onaylandıktan sonra müsait olduğunda yakınındaki siparişleri görürsün.</p></div>'+
    '<div class="fdCard fdForm"><label for="crN">Ad soyad</label><input id="crN" maxlength="60" autocomplete="name"><label for="crP">Telefon</label><input id="crP" type="tel" inputmode="tel" autocomplete="tel">'+
    '<label>Araç</label><div class="fdChips wrap" id="crV">'+Object.entries(VEH).map(([k,l])=>'<button type="button" class="fdChip'+(k==='motorbike'?' on':'')+'" data-v="'+k+'">'+l+'</button>').join('')+'</div>'+
    '<div class="fdErr" id="crE" hidden></div><button type="button" class="fb pri block" style="margin-top:14px" onclick="foodCourierRegister(this)">Başvur</button></div>');
  if(c.status==='pending')return render(bar('Kurye','showFoodHome()')+'<div class="fdTrackHero"><div class="st"><span class="e">⏳</span><div><h2>Başvurun inceleniyor</h2><p>Onaylandığında bildirim alacaksın.</p></div></div></div>'+
    '<div class="fdKV2 fdCard"><span>Ad</span><b>'+E(c.display_name)+'</b><span>Araç</span><b>'+E(VEH[c.vehicle_type]||'')+'</b></div>');
  if(c.status==='suspended')return render(bar('Kurye','showFoodHome()')+'<div class="fdTrackHero bad"><div class="st"><span class="e">⛔</span><div><h2>Kurye hesabın askıda</h2><p>Detay için destekle iletişime geç.</p></div></div></div>');
  render(bar('Kurye',"showFoodHome()",'<span class="fdLive" id="fdLive"></span>'+bellBtn(),c.display_name+(+c.rating_avg?' · ★ '+(+c.rating_avg).toFixed(1):''))+
    '<div class="fdOpen'+(c.is_available?' on':'')+'"><div class="tx"><b>'+(c.is_available?'Müsaitsin':'Moladasın')+'</b><small>'+(c.is_available?'Yeni teslimatları görüyorsun · konumun paylaşılıyor':'Teslimat almak için müsait ol')+'</small></div>'+sw('crAv',c.is_available,'foodCourierAvail(this)')+'</div>'+
    '<div class="fdKpi" id="crKpi"></div><div id="crActive"></div><div id="crPoolH"></div><div id="crPool">'+skel('row',1)+'</div><div id="crHist"></div>');
  bellCount();if(c.is_available)geoStart();
  const load=async()=>{
    try{
      const [mine,pool]=await Promise.all([RPC('food_courier_my_deliveries'),RPC('food_courier_available')]);
      if(!alive(tok))return;
      const act=mine.find(d=>d.active);CACT=act||null;
      const today=new Date().toDateString();const td=mine.filter(d=>d.status==='delivered'&&new Date(d.updated_at).toDateString()===today);
      setHTML('crKpi','<div><b>'+td.length+'</b><span>Bugün teslimat</span></div><div><b>'+M(td.reduce((n,d)=>n+(+d.courier_fee_kurus||0),0))+'</b><span>Bugün kazanç</span></div><div class="'+(pool.length&&!act?'hot':'')+'"><b>'+(act?'—':pool.length)+'</b><span>Uygun iş</span></div>');
      setHTML('crActive',act?courierActive(act):'');
      setHTML('crPoolH',act?'':'<h2>Uygun teslimatlar</h2>');
      setHTML('crPool',act?'':!c.is_available?empty('☕','Moladasın','Teslimat almak için üstteki anahtarı aç.'):
        pool.length?pool.map(p=>'<div class="fdCard" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b style="font-size:16px">'+E(p.venue_name)+'</b><div class="fdMuted fdSmall">#'+E(p.order_no)+' · '+ago(p.searching_since)+'</div></div><b class="fdOk" style="font-size:18px">'+M(p.courier_fee_kurus)+'</b></div>'+
          '<div class="fdKV" style="margin-top:8px"><span>Güzergâh</span><b>'+E(p.venue_district||'Restoran')+' → '+E(p.dropoff_district||'Müşteri')+'</b>'+(p.distance_to_venue_km!=null?'<span>Restorana</span><b>'+E(String(p.distance_to_venue_km).replace('.',','))+' km</b>':'')+'<span>Paket</span><b>'+(p.item_count||0)+' ürün</b></div>'+
          '<p class="fdMuted fdSmall" style="margin-top:8px">Müşteri adresi ve telefonu kabul ettikten sonra görünür.</p>'+
          '<div class="fdRow2"><button type="button" class="fb" onclick="foodCourierDecline(\''+E(p.delivery_id)+'\',this)">Geç</button><button type="button" class="fb pri" onclick="foodCourierAccept(\''+E(p.delivery_id)+'\',this)">Kabul et</button></div></div>').join(''):
        empty('🛵','Şu an uygun teslimat yok','Yeni teslimat geldiğinde burada görünür ve bildirim alırsın.'));
      const hist=mine.filter(d=>!d.active);
      setHTML('crHist',hist.length?'<details class="fdDet" style="margin-top:14px"><summary>Geçmiş teslimatlar · '+hist.length+'</summary><div>'+hist.slice(0,15).map(d=>'<div class="fdLine"><span>#'+E(d.order_no)+' · '+E(d.venue.name)+'<br><small class="fdMuted">'+ago(d.updated_at)+'</small></span><span style="text-align:right">'+E({delivered:'✓ Teslim edildi',failed:'⚠️ Başarısız',cancelled:'✕ İptal',searching:'↩ Bırakıldı'}[d.status]||d.status)+'<br><b>'+(d.status==='delivered'?M(d.courier_fee_kurus):'—')+'</b></span></div>').join('')+'</div></details>':'');
    }catch(e){setHTML('crPool',errBox(e,'showFoodCourier()'))}
  };
  await load();
  watch(tok,[{table:'food_deliveries'},{table:'food_notifications',filter:'user_id=eq.'+UID()}],debounce((k,p)=>{if(p&&p.table==='food_notifications'){bellCount();if(p.eventType==='INSERT'&&p.new&&p.new.type==='courier_offer'){toast('🔔 Yeni teslimat var!');beep()}}load()},300));
}
function courierActive(d){
  const st=d.status,cu=d.customer||{},v=d.venue||{};const step=CSTEP[st];const atVenue=['assigned','at_venue'].includes(st);const idx=CIDX[st]??0;
  const dest=(cur,label,name,addr,note,lat,lng,phone)=>'<div class="fdDest'+(cur?' cur':'')+'"><small>'+label+'</small><b>'+E(name)+'</b><p>'+E(addr||'')+'</p>'+(note?'<div class="fdNote warn" style="margin:8px 0 0">📝 '+E(note)+'</div>':'')+
    (cur?'<div class="acts"><a class="fb sm soft" target="_blank" rel="noopener" href="'+mapsLink(lat,lng,addr)+'">🧭 Yol tarifi</a>'+(phone?'<a class="fb sm" href="tel:'+E(phone)+'">📞 Ara</a>':'')+'</div>':'')+'</div>';
  return '<div class="fdCourierAct"><div class="hd"><b>#'+E(d.order_no)+' · '+(atVenue?'Restorana git':'Müşteriye git')+'</b><b class="fdOk">'+M(d.courier_fee_kurus)+'</b></div><div class="bd">'+
    '<div class="fdCSteps">'+[0,1,2,3].map(i=>'<i class="'+(i<=idx?'on':'')+'"></i>').join('')+'</div><div class="fdMuted fdSmall">'+E((STL[d.order_status]||['',d.order_status])[1])+'</div>'+
    dest(atVenue,'1 · Restoran',v.name,[v.address,v.district].filter(Boolean).join(', '),null,v.lat,v.lng,v.phone)+
    dest(!atVenue,'2 · Müşteri',cu.address?'Teslimat adresi':'Müşteri',cu.address,cu.note,cu.lat,cu.lng,cu.phone)+
    '<div class="fdNote info" style="margin-top:10px">🛍️ '+E((d.items||[]).map(i=>i.quantity+'× '+i.name).join(', '))+'</div>'+
    (d.collect_kurus?'<div class="fdNote warn">💵 Tahsil edilecek: <b>'+M(d.collect_kurus)+'</b> · '+E(PAY[d.payment_method]||'')+'</div>':'<div class="fdNote ok">Ödeme: '+E(PAY[d.payment_method]||'')+'</div>')+
    '</div></div>'+
    '<div class="fdSticky" style="margin-top:0;margin-bottom:14px"><div class="fdCta">'+
      '<button type="button" class="fb" style="flex:0 0 52px" aria-label="Diğer işlemler" onclick="foodCourierMore()">⋯</button>'+
      (step?'<button type="button" class="fb pri" onclick="foodCourierStep(\''+E(d.delivery_id)+'\',\''+step[0]+'\',this)">'+E(step[1])+'</button>':'')+
      (['on_the_way','near_customer'].includes(st)?'<button type="button" class="fb '+(st==='near_customer'?'pri':'')+'" onclick="foodCourierComplete(\''+E(d.delivery_id)+'\',this)">✓ Teslim et</button>':'')+
    '</div></div>';
}
window.foodCourierMore=function(){
  const d=CACT;if(!d)return;const st=d.status,cu=d.customer||{},v=d.venue||{};
  const items=[];
  if(v.phone)items.push('<a class="fb block" href="tel:'+E(v.phone)+'">📞 Restoranı ara</a>');
  if(cu.phone)items.push('<a class="fb block" href="tel:'+E(cu.phone)+'">📞 Müşteriyi ara</a>','<a class="fb block" href="sms:'+E(cu.phone)+'">💬 Müşteriye SMS</a>');
  if(['assigned','at_venue'].includes(st))items.push('<button type="button" class="fb block ghostBad" style="border:1px solid var(--line)" data-a="release">Teslimattan vazgeç</button>');
  if(['picked_up','on_the_way','near_customer'].includes(st))items.push('<button type="button" class="fb block ghostBad" style="border:1px solid var(--line)" data-a="failed">Teslim edilemedi</button>');
  const w=modal(sheetHead('Teslimat #'+d.order_no)+'<div class="fdRows">'+items.join('')+'</div>',{sheet:true});bindClose(w);
  const r=w.querySelector('[data-a=release]');if(r)r.onclick=()=>{closeModal();foodCourierRelease(d.delivery_id,null)};
  const f=w.querySelector('[data-a=failed]');if(f)f.onclick=()=>{closeModal();foodCourierStep(d.delivery_id,'failed',null)};
};
window.foodCourierRegister=async function(btn){
  const n=document.getElementById('crN').value.trim(),p=document.getElementById('crP').value.trim();const vb=document.querySelector('#crV .on');const v=vb?vb.dataset.v:'motorbike';const err=document.getElementById('crE');
  if(n.length<2){err.hidden=false;err.textContent='Adını yaz.';return}if(p.replace(/\D/g,'').length<10){err.hidden=false;err.textContent='Geçerli bir telefon yaz.';return}
  await once('crReg',btn,async()=>{try{await RPC('food_courier_register',{p_display_name:n,p_phone:p,p_vehicle:v});WHO=null;toast('Başvurun alındı');showFoodCourier()}catch(e){err.hidden=false;err.textContent=errMsg(e)}});
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
  render(bar('Yemek yönetimi','showFoodHome()')+skel('row',3));
  try{
    const w=await whoami(true);if(!w.is_admin)return render(bar('Yemek yönetimi','showFoodHome()')+empty('🔒','Yetkin yok','Bu alan yalnızca platform yönetimi içindir.'));
    const o=await RPC('food_admin_overview');if(!alive(tok))return;
    const sc=o.orders_by_status||{};
    render(bar('Yemek yönetimi','showFoodHome()',null,'Son 7 gün')+
      '<div class="fdKpi">'+Object.entries(sc).map(([k,n])=>'<div><b>'+n+'</b><span>'+E((STL[k]||['',k])[1])+'</span></div>').join('')+'<div class="'+(o.searching_deliveries?'hot':'')+'"><b>'+o.searching_deliveries+'</b><span>Kurye bekleyen</span></div></div>'+
      '<h2>Kurye başvuruları</h2>'+(o.pending_couriers.length?o.pending_couriers.map(c=>'<div class="fdCard" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(c.name)+'</b>'+badge(c.status==='suspended'?'cancelled':'new').replace(/>[^<]*</,'>'+(c.status==='suspended'?'Askıda':'Bekliyor')+'<')+'</div><div class="fdMuted fdSmall">'+E(c.phone)+' · '+E(VEH[c.vehicle]||'')+' · '+ago(c.created_at)+'</div><div class="fdRow2">'+(c.status!=='suspended'?'<button type="button" class="fb ghostBad" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button>':'<span></span>')+'<button type="button" class="fb pri" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'approved\',this)">Onayla</button></div></div>').join(''):'<p class="fdMuted fdSmall">Bekleyen başvuru yok.</p>')+
      '<h2>Onaylı kuryeler</h2>'+(o.couriers.length?'<div class="fdList">'+o.couriers.map(c=>'<div class="fdCartItem"><div class="tx"><b>'+E(c.name)+' '+(c.is_available?'🟢':'⚪')+'</b><small>'+(+c.rating_avg?'★ '+(+c.rating_avg).toFixed(1):'Puan yok')+'</small></div><button type="button" class="fb ghostBad sm" onclick="foodAdmCourier(\''+E(c.user_id)+'\',\'suspended\',this)">Askıya al</button></div>').join('')+'</div>':'<p class="fdMuted fdSmall">Onaylı kurye yok.</p>')+
      '<h2>Restoranlar</h2><div class="fdList">'+o.venues.map(v=>'<div class="fdCartItem"><div class="tx"><b>'+E(v.name)+'</b><small>'+(v.is_active?'Aktif':'Pasif')+' · '+(v.is_open?'Açık':'Kapalı')+' · komisyon %'+(v.commission_bps/100).toFixed(2).replace('.',',')+' · hizmet '+M(v.platform_fee_kurus)+'</small></div><button type="button" class="fb sm" onclick="foodAdmVenue(\''+E(v.id)+'\','+v.commission_bps+','+v.platform_fee_kurus+','+v.is_active+')">Düzenle</button></div>').join('')+'</div>'+
      '<h2>Açık sorunlar</h2>'+(o.open_issues.length?o.open_issues.map(x=>'<div class="fdCard" style="margin-bottom:10px"><b>'+E(ISSUE[x.type]||x.type)+'</b> <span class="fdMuted fdSmall">#'+E(x.order_no)+' · '+ago(x.created_at)+'</span>'+(x.description?'<p>'+E(x.description)+'</p>':'')+'<div class="fdRow2"><button type="button" class="fb" onclick="foodAdmIssue(\''+E(x.id)+'\',\'rejected\',this)">Reddet</button><button type="button" class="fb pri" onclick="foodAdmIssue(\''+E(x.id)+'\',\'resolved\',this)">Çözüldü</button></div></div>').join(''):'<p class="fdMuted fdSmall">Açık sorun yok.</p>'));
  }catch(e){if(alive(tok))render(bar('Yemek yönetimi','showFoodHome()')+errBox(e,'showFoodAdmin()'))}
}
window.foodAdmCourier=async function(uid,st,btn){await once('ac'+uid,btn,async()=>{try{await RPC('food_admin_set_courier_status',{p_user_id:uid,p_status:st});toast('Kurye durumu güncellendi');showFoodAdmin()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmIssue=async function(id,st,btn){const r=await promptBox('Açıklama','Müşteriye iletilecek',{required:true});if(!r)return;await once('ai'+id,btn,async()=>{try{await RPC('food_update_issue',{p_issue_id:id,p_status:st,p_resolution:r});showFoodAdmin()}catch(e){toast(errMsg(e),'err')}})};
window.foodAdmVenue=function(id,bps,fee,active){
  const w=modal(sheetHead('Restoran ücretleri')+'<div class="fdForm"><label for="avB">Komisyon (%)</label><input id="avB" inputmode="decimal" value="'+(bps/100)+'"><label for="avF">Hizmet bedeli (TL, sipariş başına)</label><input id="avF" inputmode="decimal" value="'+kurusToTl(fee)+'">'+
    '<div style="margin-top:14px">'+sw('avA',active,'','Restoran aktif')+'</div><div class="fdErr" id="avE" hidden></div></div><button type="button" class="fb pri block" style="margin-top:14px" data-x="ok">Kaydet</button>',{sheet:true});
  bindClose(w);
  w.querySelector('[data-x=ok]').onclick=async function(){const b=Math.round(parseFloat(w.querySelector('#avB').value.replace(',','.'))*100),f=tlToKurus(w.querySelector('#avF').value);const e=w.querySelector('#avE');
    if(!(b>=0&&b<=5000)){e.hidden=false;e.textContent='Komisyon %0-50 arası olmalı.';return}if(isNaN(f)){e.hidden=false;e.textContent='Hizmet bedelini doğru gir.';return}
    await once('av',this,async()=>{try{await RPC('food_admin_set_venue',{p_venue_id:id,p_commission_bps:b,p_platform_fee_kurus:f,p_is_active:w.querySelector('#avA').checked});closeModal();toast('Kaydedildi');showFoodAdmin()}catch(x){e.hidden=false;e.textContent=errMsg(x)}})};
};

/* ====================== Dışa aktarım (eski adlarla uyumlu) ====================== */
Object.assign(window,{
  showFoodHome,showFoodVenue,showFoodCart,showFoodCheckout,showFoodOrders,showFoodOrderDetail,showFoodBusiness,showFoodMenu,showFoodSettings,
  showFoodVenueIssues,showFoodTeam,showFoodCourier,showFoodAdmin,showFoodNotifications,
  openFood:showFoodHome,foodLoad:()=>showFoodHome(),foodAdd:(id)=>window.foodQuickAdd&&window.foodQuickAdd(id),
  foodOrder:()=>showFoodCart(),foodMenu:showFoodMenu,
  __foodTest:{cartGet,cartSave,openNow,nextOpen,cuisines,errMsg,stageOf,tlToKurus,M,addrGet,addrSet}
});
})();
