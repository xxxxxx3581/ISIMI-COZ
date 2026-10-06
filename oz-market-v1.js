/* İşimi Çöz · Özüne Dön — doğal ürün pazaryeri arayüzü (oz-market-v1.js)
   - Ana sayfadaki "Özüne Dön" kutusu/slaytı tıklanınca tembel yüklenir (index.html: ozLoad/ozTap).
   - Tüm yetki, fiyat, stok ve durum kuralları veritabanında (RLS + oz_* RPC) uygulanır; bu dosya yalnızca arayüzdür.
   - Gerçek ödeme yok: yalnızca "deneme ödemesi" (mock) ve "kapıda ödeme" (cod) ayarla açılır.
   - window.OZ yüzeyi: __v, tryEnter, admin, authChanged, go (iç gezinme). Stiller index.html K21 bloğunda (.oz* / body.ozWorld). */
(function(){
'use strict';
if(window.OZ&&window.OZ.__v)return;
var OZ=window.OZ={__v:1};
var D=document;
var CART_KEY='isimi_oz_cart';

/* ====================== Çekirdek yardımcılar ====================== */
function E(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var NF=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
function TL(k){return NF.format(Math.round(+k||0)/100)+' ₺'}
function tlToKurus(v){var s=String(v==null?'':v).trim().replace(/\s/g,'').replace(/₺|TL/gi,'');if(!s)return NaN;if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');var n=Number(s);return isFinite(n)&&n>=0?Math.round(n*100):NaN}
function kurusToInput(k){k=+k||0;return k%100===0?String(k/100):(k/100).toFixed(2).replace('.',',')}
function fmtDate(ts){if(!ts)return '';var d=new Date(ts);if(isNaN(d))return '';return d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
function fmtDay(ts){if(!ts)return '';var d=new Date(ts);return isNaN(d)?'':d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}
function uuid(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})}
function sess(){try{return typeof getAuthSession==='function'?getAuthSession():null}catch(e){return null}}
function logged(){var s=sess();return !!(s&&s.access_token)}
function uid(){var s=sess();return s&&s.user&&s.user.id||null}
function sbUrl(){try{return SUPABASE_URL}catch(e){return ''}}
function sbKey(){try{return SUPABASE_KEY}catch(e){return ''}}
async function token(){try{if(typeof v2EnsureFreshToken==='function')await v2EnsureFreshToken()}catch(e){}var s=sess();return s&&s.access_token||null}
function arr(x){return Array.isArray(x)?x:[]}
function num(x){x=+x;return isFinite(x)?x:0}
function qs(s,r){return (r||D).querySelector(s)}
function qa(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))}
function val(id){var el=D.getElementById(id);return el?String(el.value||'').trim():''}
function checked(id){var el=D.getElementById(id);return !!(el&&el.checked)}

/* Sunucu hataları "PF_STATE: …", "PF_INPUT: …", "PF_AUTH: …" ile gelir; önek atılır. */
function cleanMsg(m){
  m=String(m||'').replace(/^(PF|OZ)_[A-Z]+:\s*/,'');
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Bağlantı sorunu. İnternetini kontrol edip tekrar dene.';
  if(/permission denied|row-level security/i.test(m))return 'Bu işlem için yetkin yok.';
  if(/Could not find the function|PGRST202|schema cache/i.test(m))return 'Bu özellik şu anda kullanılamıyor.';
  return m||'Beklenmeyen bir hata oluştu.';
}
function isAuthErr(e){var m=String(e&&e.message||'');return !!(e&&(e.code==='NOAUTH'||e.status===401||/PF_AUTH|JWT|jwt expired|giriş yapmalısın|oturum/i.test(m)))}
function wrapErr(e){var er=new Error(cleanMsg(e&&e.message||e));er.code=e&&e.code;er.status=e&&e.status;er.auth=isAuthErr(e);return er}
async function rpc(fn,args){
  if(!window.PF||typeof PF.rpc!=='function')throw new Error('Platform katmanı yüklenemedi. Sayfayı yenileyip tekrar dene.');
  try{return await PF.rpc(fn,args||{},{auth:false})}catch(e){throw wrapErr(e)}
}
async function get(path){
  if(!window.PF||typeof PF.get!=='function')throw new Error('Platform katmanı yüklenemedi. Sayfayı yenileyip tekrar dene.');
  try{return await PF.get(path)}catch(e){throw wrapErr(e)}
}
function inList(ids){return '('+ids.map(function(x){return encodeURIComponent(String(x))}).join(',')+')'}

/* ====================== Toast / sheet / onay ====================== */
function toast(m){m=cleanMsg(m);try{if(typeof v2Toast==='function')return v2Toast(m)}catch(e){}var t=D.createElement('div');t.className='ozToast';t.setAttribute('role','status');t.textContent=m;D.body.appendChild(t);setTimeout(function(){t.remove()},3200)}
function fail(e){if(e&&e.auth){needLogin(null);return}toast(e&&e.message||e)}
var SHEET_ESC=null;
function sheet(title,html,opt){
  opt=opt||{};closeSheet();
  var ov=D.createElement('div');ov.className='ozOv'+(opt.wide?' wide':'');ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',title);
  ov.innerHTML='<div class="ozSh"><div class="ozShH"><h2>'+E(title)+'</h2><button type="button" class="ozX" data-a="sheetClose" aria-label="Kapat">✕</button></div><div class="ozShB">'+html+'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)closeSheet()});
  D.body.appendChild(ov);
  SHEET_ESC=function(e){if(e.key==='Escape')closeSheet()};D.addEventListener('keydown',SHEET_ESC);
  var f=qs('.ozShB input,.ozShB select,.ozShB textarea,.ozShB button',ov);if(f&&!opt.noFocus)try{f.focus({preventScroll:true})}catch(e){}
  return ov;
}
function closeSheet(){qa('.ozOv').forEach(function(x){x.remove()});if(SHEET_ESC){D.removeEventListener('keydown',SHEET_ESC);SHEET_ESC=null}}
function confirmBox(title,text,okLabel,danger){
  return new Promise(function(res){
    var done=false;
    var ov=sheet(title,'<p class="ozP">'+E(text)+'</p><div class="ozRow2"><button type="button" class="ozBtn" data-a="cbNo">Vazgeç</button><button type="button" class="ozBtn '+(danger?'bad':'pri')+'" data-a="cbYes">'+E(okLabel||'Tamam')+'</button></div>');
    ov.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b||done)return;if(b.dataset.a==='cbYes'||b.dataset.a==='cbNo'||b.dataset.a==='sheetClose'){done=true;e.stopPropagation();closeSheet();res(b.dataset.a==='cbYes')}},true);
    var obs=new MutationObserver(function(){if(!ov.isConnected&&!done){done=true;obs.disconnect();res(false)}});obs.observe(D.body,{childList:true});
  });
}
/* Form penceresi: alanlar → değerler (Vazgeç ise null) */
function formBox(title,fieldsHtml,okLabel,validate){
  return new Promise(function(res){
    var done=false;
    var ov=sheet(title,'<div class="ozForm">'+fieldsHtml+'</div><p class="ozErr" id="ozFbErr" hidden></p><div class="ozRow2"><button type="button" class="ozBtn" data-a="fbNo">Vazgeç</button><button type="button" class="ozBtn pri" data-a="fbOk">'+E(okLabel||'Kaydet')+'</button></div>');
    ov.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b||done)return;
      if(b.dataset.a==='fbNo'||b.dataset.a==='sheetClose'){done=true;e.stopPropagation();closeSheet();res(null);return}
      if(b.dataset.a==='fbOk'){e.stopPropagation();var v={};qa('[data-f]',ov).forEach(function(i){v[i.dataset.f]=i.type==='checkbox'?i.checked:String(i.value||'').trim()});
        var er=validate?validate(v):'';if(er){var p=qs('#ozFbErr',ov);p.textContent=er;p.hidden=false;return}done=true;closeSheet();res(v)}},true);
    var obs=new MutationObserver(function(){if(!ov.isConnected&&!done){done=true;obs.disconnect();res(null)}});obs.observe(D.body,{childList:true});
  });
}
async function busy(btn,fn){if(btn){if(btn.disabled)return;btn.disabled=true;btn.setAttribute('aria-busy','true')}try{return await fn()}catch(e){fail(e);return undefined}finally{if(btn){btn.disabled=false;btn.removeAttribute('aria-busy')}}}

/* ====================== Küçük bileşenler ====================== */
var IC={
  back:'<path d="M15 5l-7 7 7 7"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  cart:'<path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  store:'<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6"/>',box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  leaf:'<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15zM5 19l7-7"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1"/>',home:'<path d="M4 11l8-7 8 7v9H4z"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>'
};
function ico(n,s){return '<svg width="'+(s||22)+'" height="'+(s||22)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[n]||'')+'</svg>'}
function skel(n,cls){var h='';for(var i=0;i<(n||3);i++)h+='<div class="ozSk '+(cls||'')+'"></div>';return h}
function empty(icon,title,text,cta){return '<div class="ozEmpty"><div class="i" aria-hidden="true">'+icon+'</div><b>'+E(title)+'</b>'+(text?'<p>'+E(text)+'</p>':'')+(cta||'')+'</div>'}
function errBox(e,retry){return '<div class="ozErrBox" role="alert"><b>Bir sorun oluştu</b><p>'+E(cleanMsg(e&&e.message||e))+'</p>'+(retry!==false?'<button type="button" class="ozBtn" data-a="redraw">Tekrar dene</button>':'')+'</div>'}
function stars(r){r=Math.round(num(r)*2)/2;var h='';for(var i=1;i<=5;i++)h+='<span class="'+(r>=i?'on':r>=i-.5?'half':'')+'">★</span>';return '<span class="ozStars" aria-label="5 üzerinden '+NF.format(num(r)).replace(',00','')+' puan">'+h+'</span>'}
function pic(url,alt,cls){return '<span class="ozPic '+(cls||'')+'">'+(url?'<img src="'+E(url)+'" alt="'+E(alt||'')+'" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<i aria-hidden="true">🌿</i></span>'}
function pageHead(title,sub){return '<div class="ozHead"><h1>'+E(title)+'</h1>'+(sub?'<p>'+E(sub)+'</p>':'')+'</div>'}

/* ====================== Durum ====================== */
var ST={set:null,setAt:0,resume:null,fav:null,crid:null,notif:null};
var VIEWS={},ACT={};
function ACT_EXTRA(o){Object.assign(ACT,o)}
function VIEWS_EXTRA(o){Object.assign(VIEWS,o)}
async function loadSettings(force){
  if(ST.set&&!force&&Date.now()-ST.setAt<30000)return ST.set;
  var s=await rpc('oz_public_settings',{});
  ST.set=s&&typeof s==='object'?s:{};ST.setAt=Date.now();
  return ST.set;
}
function S(){return ST.set||{}}
function needLogin(resume){
  ST.resume=resume||null;
  toast('Devam etmek için giriş yap.');
  try{openAuthModal('login')}catch(e){}
}
/* index.html saveAuthSession → OZ.authChanged(true/false) */
OZ.authChanged=function(isIn){
  ST.fav=null;ST.notif=null;ST.crid=null;SELLER.data=null;ST.setAt=0;
  if(!isIn){ST.resume=null;ST.set=null;cartBadge();bellBadge(0);return}
  var r=ST.resume;ST.resume=null;
  if(!D.getElementById('ozRoot'))return;
  loadSettings(true).then(function(){topSync();if(r)r();else draw()}).catch(function(){if(r)r();else draw()});
};

/* ====================== Sepet (yerel) ====================== */
/* Satır: {variant_id, product_id, qty, name, label, image, price_kurus, seller_id, seller_name} */
function cartGet(){try{var c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(c)?c.filter(function(x){return x&&x.variant_id&&x.qty>0}):[]}catch(e){return []}}
function cartSet(c){try{if(c&&c.length)localStorage.setItem(CART_KEY,JSON.stringify(c));else localStorage.removeItem(CART_KEY)}catch(e){}cartBadge()}
function cartCount(){return cartGet().reduce(function(n,x){return n+num(x.qty)},0)}
function cartQty(variantId){var x=cartGet().filter(function(y){return y.variant_id===variantId})[0];return x?num(x.qty):0}
function cartAdd(line,qty){
  var c=cartGet();var x=c.filter(function(y){return y.variant_id===line.variant_id})[0];
  if(x){x.qty=Math.min(99,num(x.qty)+qty);Object.assign(x,line,{qty:x.qty})}else c.push(Object.assign({},line,{qty:Math.min(99,qty)}));
  cartSet(c);
}
function cartSetQty(variantId,q){var c=cartGet();c.forEach(function(x){if(x.variant_id===variantId)x.qty=Math.max(0,Math.min(99,q))});cartSet(c.filter(function(x){return x.qty>0}))}
function cartBadge(){var b=D.getElementById('ozCartN');if(!b)return;var n=cartCount();b.hidden=!n;b.textContent=n>9?'9+':String(n)}
function cartItemsParam(){return cartGet().map(function(x){return {variant_id:x.variant_id,qty:num(x.qty)}})}

/* ====================== Bildirimler ====================== */
function unread(n){return !(n&&(n.read_at||n.is_read===true||n.read===true))}
function bellBadge(n){var b=D.getElementById('ozBellN');if(!b)return;b.hidden=!n;b.textContent=n>9?'9+':String(n||'')}
async function loadNotifs(){
  if(!logged()){ST.notif=[];bellBadge(0);return []}
  var r=await get('oz_notifications?select=*&order=created_at.desc&limit=30');
  ST.notif=arr(r);bellBadge(ST.notif.filter(unread).length);return ST.notif;
}
function notifHtml(list){
  if(!list.length)return empty(ico('bell',34),'Bildirim yok','Sipariş ve mağaza gelişmeleri burada görünür.');
  return '<div class="ozRow2" style="margin-bottom:8px"><span class="ozMuted">'+list.filter(unread).length+' okunmamış</span><button type="button" class="ozBtn sm" data-a="notifAll"'+(list.some(unread)?'':' disabled')+'>Hepsini okundu yap</button></div>'+
    '<div class="ozList">'+list.map(function(n){return '<button type="button" class="ozNt'+(unread(n)?' new':'')+'" data-a="notifOpen" data-id="'+E(n.id)+'"><b>'+E(n.title||'Bildirim')+'</b>'+(n.body?'<span>'+E(n.body)+'</span>':'')+'<small>'+E(fmtDate(n.created_at))+'</small></button>'}).join('')+'</div>';
}
async function openNotifs(){
  if(!logged()){needLogin(function(){openNotifs()});return}
  sheet('Bildirimler',skel(3,'line'),{noFocus:true});
  try{var l=await loadNotifs();var b=qs('.ozOv .ozShB');if(b)b.innerHTML=notifHtml(l)}catch(e){var b2=qs('.ozOv .ozShB');if(b2)b2.innerHTML=errBox(e,false)}
}
ACT_EXTRA({
  notifAll:async function(btn){await busy(btn,async function(){await rpc('oz_mark_notifications_read',{p_ids:null});(ST.notif||[]).forEach(function(n){n.read_at=n.read_at||new Date().toISOString()});bellBadge(0);var b=qs('.ozOv .ozShB');if(b)b.innerHTML=notifHtml(ST.notif||[])})},
  notifOpen:async function(btn){
    var n=(ST.notif||[]).filter(function(x){return String(x.id)===btn.dataset.id})[0];if(!n)return;
    if(unread(n)){try{await rpc('oz_mark_notifications_read',{p_ids:[n.id]});n.read_at=new Date().toISOString();bellBadge(ST.notif.filter(unread).length)}catch(e){}}
    closeSheet();
    var oid=n.order_id||(n.data&&n.data.order_id)||(n.payload&&n.payload.order_id);
    var role=String(n.audience||n.role||(n.data&&n.data.role)||'');
    if(oid)go(role==='seller'?'sellerOrders':'order',{id:oid});
  }
});

/* ====================== Satıcı önbelleği ====================== */
var SELLER={data:null};

/* ====================== Geçici ana ekran (Aşama 2'de doldurulur) ====================== */
VIEWS_EXTRA({
  home:async function(a,t){paint(pageHead('Özüne Dön','Doğal olanı keşfet.')+skel(4))}
});

/* ====================== Dünya kabuğu: üst çubuk, gezinme ====================== */
var NAV=[],SCR=0;
function alive(t){return t===SCR&&!!D.getElementById('ozRoot')}
function paint(html){var r=D.getElementById('ozRoot');if(r)r.innerHTML=html}
function cur(){return NAV[NAV.length-1]||{k:'home',a:{}}}
function go(k,a,replace){if(replace&&NAV.length)NAV.pop();NAV.push({k:k,a:a||{}});draw()}
function back(){if(NAV.length>1){NAV.pop();draw()}else exitWorld()}
function draw(){
  var t=cur();SCR++;closeSheet();ensureWorld();
  try{window.scrollTo(0,0)}catch(e){}
  topSync();
  var v=VIEWS[t.k]||VIEWS.home;
  try{var p=v(t.a||{},SCR);if(p&&p.catch)p.catch(function(e){if(e&&e.auth&&!logged()){paint(loginWall());return}paint(errBox(e))})}catch(e){paint(errBox(e))}
}
OZ.go=function(k,a){go(k,a)};
function loginWall(text){return empty(ico('user',34),'Giriş yapman gerekiyor',text||'Bu bölümü görmek için hesabına giriş yap.','<button type="button" class="ozBtn pri" data-a="login">Giriş yap</button>')}
function topHtml(){
  return '<button type="button" class="ozIc" data-a="back" aria-label="Geri">'+ico('back')+'</button>'+
    '<button type="button" class="ozBrand" data-a="nav" data-k="home" aria-label="Özüne Dön ana sayfa"><span>Özüne <b>Dön</b></span></button>'+
    '<button type="button" class="ozIc" data-a="nav" data-k="search" aria-label="Ara">'+ico('search')+'</button>'+
    '<button type="button" class="ozIc" data-a="nav" data-k="favs" aria-label="Favorilerim">'+ico('heart')+'</button>'+
    '<button type="button" class="ozIc" data-a="nav" data-k="cart" aria-label="Sepet">'+ico('cart')+'<span class="ozBdg" id="ozCartN" hidden></span></button>'+
    '<button type="button" class="ozIc" data-a="bell" aria-label="Bildirimler">'+ico('bell')+'<span class="ozBdg dot" id="ozBellN" hidden></span></button>'+
    '<button type="button" class="ozIc" data-a="nav" data-k="account" aria-label="Hesabım">'+ico('user')+'</button>';
}
function ensureWorld(){
  if(!D.getElementById('ozRoot')){
    if(typeof app==='function')app('<div id="ozRoot" class="oz"></div>');
    else{var a=D.getElementById('app');if(a)a.innerHTML='<div id="ozRoot" class="oz"></div>'}
  }
  D.body.classList.add('ozWorld');
  if(!D.getElementById('ozTop')){var h=D.createElement('header');h.id='ozTop';h.className='ozTop';h.innerHTML=topHtml();D.body.appendChild(h)}
  if(!D.getElementById('ozStrip')){var s=D.createElement('div');s.id='ozStrip';s.className='ozStrip';s.setAttribute('role','status');s.hidden=true;s.textContent='Yönetici önizleme · Pazar herkese kapalı';D.body.appendChild(s)}
}
function leaveWorld(){D.body.classList.remove('ozWorld');['ozTop','ozStrip'].forEach(function(id){var e=D.getElementById(id);if(e)e.remove()});closeSheet()}
function exitWorld(){NAV=[];leaveWorld();try{showHome()}catch(e){}}
function topSync(){
  var s=S();var strip=D.getElementById('ozStrip');
  var pv=!!(s.is_admin&&s.market_enabled===false);
  if(strip)strip.hidden=!pv;D.body.classList.toggle('ozPreview',pv);
  cartBadge();
  if(logged()&&ST.notif)bellBadge(ST.notif.filter(unread).length);else if(!logged())bellBadge(0);
}
(function(){var a=D.getElementById('app');if(!a||!window.MutationObserver)return;
  new MutationObserver(function(){if(!D.getElementById('ozRoot')&&D.body.classList.contains('ozWorld')){NAV=[];leaveWorld()}}).observe(a,{childList:true});})();

/* Giriş noktası: pazar kapalıysa false döner (ana sayfa hmSoon gösterir). Yönetici için market_open her zaman true. */
OZ.tryEnter=async function(){
  var s=await loadSettings(true);
  if(!s||!s.market_open)return false;
  NAV=[{k:'home',a:{}}];draw();
  if(logged())loadNotifs().catch(function(){});
  return true;
};

/* ====================== Tıklama yönlendirici (data-a) ====================== */
ACT_EXTRA({
  sheetClose:function(){closeSheet()},
  back:function(){back()},
  nav:function(b){var k=b.dataset.k;var a={};if(b.dataset.id)a.id=b.dataset.id;if(b.dataset.q)a.q=b.dataset.q;if(b.dataset.cat)a.cat=b.dataset.cat;if(b.dataset.tab)a.tab=b.dataset.tab;if(k==='home'){NAV=[];}go(k,a)},
  redraw:function(){draw()},
  login:function(){needLogin(function(){draw()})},
  bell:function(){openNotifs()},
  exit:function(){exitWorld()}
});
D.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-a]');if(!b)return;
  if(!b.closest('#ozRoot,#ozTop,.ozOv,.ozAdm'))return;
  var f=ACT[b.dataset.a];if(!f)return;
  if(b.tagName==='A')e.preventDefault();
  try{var r=f(b,e);if(r&&r.catch)r.catch(fail)}catch(err){fail(err)}
});
D.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;var b=e.target;
  if(b&&b.getAttribute&&b.getAttribute('role')==='button'&&b.dataset.a&&b.closest('#ozRoot')){e.preventDefault();b.click()}
});

/*@@SON@@*/
})();
