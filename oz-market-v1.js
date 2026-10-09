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
var NF1=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});
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
      if(b.dataset.a==='fbOk'){e.stopPropagation();var v={};qa('[data-f]',ov).forEach(function(i){v[i.dataset.f]=(i.type==='checkbox'||i.type==='radio')?i.checked:String(i.value||'').trim()});
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
function stars(r){r=Math.round(num(r)*2)/2;var h='';for(var i=1;i<=5;i++)h+='<span class="'+(r>=i?'on':r>=i-.5?'half':'')+'">★</span>';return '<span class="ozStars" aria-label="5 üzerinden '+NF1.format(num(r))+' puan">'+h+'</span>'}
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
  ST.fav=null;ST.notif=null;ST.crid=null;ST.co=null;ST.addrs=null;ST.od=null;ST.pd=null;ST.pf=null;ST.home=null;SELLER.data=null;SELLER.img={};SELLER.id=null;SELLER.dash=null;SELLER.docs=null;SELLER.rates=null;SELLER.products=null;SELLER.variants=null;SELLER.orders=null;ST.setAt=0;
  if(!isIn){ST.resume=null;ST.set=null;cartBadge();bellBadge(0);return}
  var r=ST.resume;ST.resume=null;
  if(!D.getElementById('ozRoot')&&!(r&&r.outside))return;
  loadSettings(true).then(function(){if(D.getElementById('ozRoot'))topSync();if(r)r();else draw()}).catch(function(){if(r)r();else draw()});
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
    var isSeller=role==='seller'||/seller/.test(String(n.type||''));
    if(isSeller)go('seller',{tab:'siparisler'});else if(oid)go('order',{id:oid});
  }
});

/* ====================== Satıcı önbelleği ====================== */
var SELLER={data:null,img:{}};

/* ====================== Alıcı · ortak parçalar ====================== */
var ALG={gluten:'Gluten',sut:'Süt',yumurta:'Yumurta',yer_fistigi:'Yer fıstığı',kabuklu_yemis:'Sert kabuklu meyveler',susam:'Susam',soya:'Soya',balik:'Balık',kabuklular:'Kabuklu deniz ürünleri',yumusakcalar:'Yumuşakçalar',hardal:'Hardal',kereviz:'Kereviz',sulfit:'Sülfitler',aci_bakla:'Acı bakla'};
function algLabel(x){return ALG[x]||String(x||'')}
function isFav(id){return !!(ST.fav&&ST.fav.has(String(id)))}
async function loadFavs(){if(!logged()){ST.fav=new Set();return ST.fav}if(ST.fav)return ST.fav;try{var l=await rpc('oz_my_favorites',{});ST.fav=new Set(arr(l).map(function(x){return String(x.id)}))}catch(e){ST.fav=new Set()}return ST.fav}
function favBtn(id,on){return '<button type="button" class="ozFav'+(on?' on':'')+'" data-a="fav" data-id="'+E(id)+'" aria-pressed="'+(on?'true':'false')+'" aria-label="'+(on?'Favorilerden çıkar':'Favorilere ekle')+'">'+ico('heart',20)+'</button>'}
function card(p){
  var price=num(p.price_kurus),cmp=num(p.compare_at_kurus);
  var meta=[p.origin_city,p.seller_name].filter(Boolean).join(' · ');
  return '<div class="ozPC" role="button" tabindex="0" data-a="nav" data-k="product" data-id="'+E(p.id)+'" aria-label="'+E(p.name)+'">'+pic(p.image,p.name)+
    (p.in_stock===false?'<span class="so">Tükendi</span>':'')+favBtn(p.id,isFav(p.id))+
    '<div class="bd"><span class="nm">'+E(p.name)+'</span>'+(meta?'<span class="mt">'+E(meta)+'</span>':'')+
    (num(p.rating_count)?'<span class="mt">'+stars(p.rating_avg)+' ('+num(p.rating_count)+')</span>':'')+
    '<span class="pr">'+TL(price)+(cmp>price?'<s>'+TL(cmp)+'</s>':'')+'</span></div></div>';
}
function sellerBtn(s){
  var loc=[s.city,s.district].filter(Boolean).join(' / ');
  return '<button type="button" class="ozSeller" data-a="nav" data-k="store" data-id="'+E(s.id)+'">'+pic(s.logo_url,s.display_name)+'<span class="tx"><b>'+E(s.display_name||'Üretici')+'</b><small>'+E(loc||'Üretici')+(num(s.rating_count)?' · ★ '+NF1.format(num(s.rating_avg))+' ('+num(s.rating_count)+')':'')+'</small></span><span class="ch" aria-hidden="true">›</span></button>';
}
function searchForm(q){return '<form class="ozSearch" data-sub="search" role="search"><input class="ozIn" id="ozQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Zeytinyağı, bal, peynir ara" aria-label="Ürün ara" value="'+E(q||'')+'"><button type="submit" class="ozBtn pri" aria-label="Ara">'+ico('search',20)+'</button></form>'}
var SORTS=[['new','En yeniler'],['popular','Çok satanlar'],['rating','En beğenilenler'],['price_asc','Fiyat: artan'],['price_desc','Fiyat: azalan']];
D.addEventListener('submit',function(e){
  var f=e.target;if(!f||!f.dataset||!f.dataset.sub||!f.closest('#ozRoot,.ozOv'))return;e.preventDefault();
  var fn=SUBMIT[f.dataset.sub];if(fn){try{var r=fn(f,e);if(r&&r.catch)r.catch(fail)}catch(err){fail(err)}}
});
var SUBMIT={
  search:function(){var q=val('ozQ');var c=cur();if(c.k==='search'){c.a=Object.assign({},c.a,{q:q});draw()}else go('search',{q:q})}
};
async function homeData(){if(ST.home&&Date.now()-ST.homeAt<60000)return ST.home;ST.home=await rpc('oz_home',{});ST.homeAt=Date.now();return ST.home}
ST.home=null;ST.homeAt=0;

/* ====================== Alıcı · ana ekran ====================== */
VIEWS_EXTRA({
  home:async function(a,t){
    paint(searchForm('')+skel(1,'line')+skel(2));
    var d=await homeData();await loadFavs();if(!alive(t))return;
    var cats=arr(d&&d.categories),nw=arr(d&&d.newest),pop=arr(d&&d.popular),sel=arr(d&&d.sellers);
    var h=searchForm('');
    if(cats.length)h+='<div class="ozChips" role="list" aria-label="Kategoriler">'+cats.map(function(c){return '<button type="button" class="ozCat" role="listitem" data-a="nav" data-k="search" data-cat="'+E(c.slug)+'">'+pic(c.image_url,c.name)+'<span>'+E(c.name)+'</span></button>'}).join('')+'</div>';
    if(!nw.length&&!pop.length&&!sel.length){
      h+=empty(ico('leaf',36),'Henüz ürün yok','Üreticiler ürünlerini ekledikçe burada görünecek.',S().seller_signup_enabled?'<button type="button" class="ozBtn pri" data-a="nav" data-k="seller">Üretici misin? Satıcı ol</button>':'');
      paint(h);return;
    }
    if(nw.length)h+='<div class="ozSecH"><h2>Yeni gelenler</h2><button type="button" class="ozLink" data-a="sortGo" data-sort="new">Tümü</button></div><div class="ozRail">'+nw.map(card).join('')+'</div>';
    if(pop.length)h+='<div class="ozSecH"><h2>Çok satanlar</h2><button type="button" class="ozLink" data-a="sortGo" data-sort="popular">Tümü</button></div><div class="ozRail">'+pop.map(card).join('')+'</div>';
    if(sel.length)h+='<div class="ozSecH"><h2>Üreticiler</h2></div><div class="ozSellers">'+sel.map(sellerBtn).join('')+'</div>';
    paint(h);
  },

  /* ====================== Alıcı · arama ve listeleme ====================== */
  search:async function(a,t){
    var q=a.q||'',cat=a.cat||'',sort=a.sort||'new';
    var d=null;try{d=await homeData()}catch(e){}
    var cats=arr(d&&d.categories);
    var head=searchForm(q)+
      (cats.length?'<div class="ozChips" role="group" aria-label="Kategori"><button type="button" class="ozChip'+(cat?'':' on')+'" data-a="srchCat" data-cat="" aria-pressed="'+(!cat)+'">Tümü</button>'+cats.map(function(c){return '<button type="button" class="ozChip'+(cat===c.slug?' on':'')+'" data-a="srchCat" data-cat="'+E(c.slug)+'" aria-pressed="'+(cat===c.slug)+'">'+E(c.name)+'</button>'}).join('')+'</div>':'')+
      '<div class="ozRow2" style="margin:4px 0 12px"><label class="ozMuted" for="ozSort" style="flex:none">Sırala</label><select class="ozSel" id="ozSort" data-chg="sort" style="flex:1">'+SORTS.map(function(s){return '<option value="'+s[0]+'"'+(sort===s[0]?' selected':'')+'>'+s[1]+'</option>'}).join('')+'</select></div>';
    paint(head+'<div id="ozRes">'+skel(2)+'</div>');
    ST.sr={a:{q:q,cat:cat,sort:sort},list:[],offset:0,more:false};
    await loadFavs();
    await searchMore(t);
  },

  /* ====================== Alıcı · ürün detayı ====================== */
  product:async function(a,t){
    paint(skel(1)+skel(3,'line'));
    var p=await rpc('oz_product_detail',{p_id:a.id});
    if(!alive(t))return;
    if(!p||!p.id){paint(empty(ico('box',36),'Ürün bulunamadı','Bu ürün yayından kaldırılmış olabilir.','<button type="button" class="ozBtn" data-a="nav" data-k="home">Ana ekrana dön</button>'));return}
    if(logged()){await loadFavs();if(p.is_favorite)ST.fav.add(String(p.id));else ST.fav.delete(String(p.id))}
    var vs=arr(p.variants);var first=vs.filter(function(v){return num(v.stock)>0})[0]||vs[0]||null;
    ST.pd={p:p,sel:first?first.id:null,qty:1,t:t};
    renderProduct();
  },

  /* ====================== Alıcı · satıcı vitrini ====================== */
  store:async function(a,t){
    paint(skel(1)+skel(2));
    var rows=await get('oz_seller_public?select=*&id=eq.'+encodeURIComponent(a.id)+'&limit=1');
    if(!alive(t))return;
    var s=arr(rows)[0];
    if(!s){paint(empty(ico('store',36),'Üretici bulunamadı','Bu mağaza şu anda yayında değil.','<button type="button" class="ozBtn" data-a="nav" data-k="home">Ana ekrana dön</button>'));return}
    var loc=[s.city,s.district].filter(Boolean).join(' / ');
    var h=(s.cover_url?'<div class="ozCover"><img src="'+E(s.cover_url)+'" alt="" loading="lazy" onerror="this.remove()"></div>':'')+
      '<div class="ozStoreH">'+pic(s.logo_url,s.display_name)+'<div class="tx"><b>'+E(s.display_name||'Üretici')+'</b><span class="ozMuted">'+E(loc)+(num(s.rating_count)?' · ★ '+NF1.format(num(s.rating_avg))+' ('+num(s.rating_count)+')':'')+'</span></div></div>'+
      '<div class="ozCard">'+(s.story?'<p class="ozStory" style="margin:0 0 4px">'+E(s.story)+'</p><p style="margin:0 0 8px">'+CLAIM+'</p>':'')+
      '<div class="ozMuted">'+ico('truck',16)+' '+(num(s.handling_days)?num(s.handling_days)+' iş günü içinde kargoya verir':'Kargoya veriliş süresi belirtilmedi')+(num(s.free_ship_over_kurus)?' · '+TL(s.free_ship_over_kurus)+' ve üzeri kargo bedava':'')+'</div></div>'+
      '<div class="ozSecH"><h2>Ürünler</h2></div><div id="ozRes">'+skel(2)+'</div>';
    paint(h);
    ST.sr={a:{seller:s.id,sort:'new'},list:[],offset:0,more:false};
    await loadFavs();
    await searchMore(t);
  },

  /* ====================== Alıcı · favoriler ====================== */
  favs:async function(a,t){
    if(!logged()){paint(pageHead('Favorilerim')+loginWall('Beğendiğin ürünleri kaydetmek için giriş yap.'));return}
    paint(pageHead('Favorilerim')+skel(2));
    var l=arr(await rpc('oz_my_favorites',{}));if(!alive(t))return;
    ST.fav=new Set(l.map(function(x){return String(x.id)}));
    paint(pageHead('Favorilerim',l.length?l.length+' ürün':'')+(l.length?'<div class="ozGrid">'+l.map(card).join('')+'</div>':empty(ico('heart',36),'Favorin yok','Ürünlerdeki kalbe dokunarak favorilerine ekleyebilirsin.','<button type="button" class="ozBtn pri" data-a="nav" data-k="home">Ürünlere göz at</button>')));
  },

  /* ====================== Hesap menüsü ====================== */
  account:async function(a,t){
    var s=S();
    if(!logged()){paint(pageHead('Hesabım')+loginWall('Siparişlerini, favorilerini ve adreslerini görmek için giriş yap.')+'<div class="ozList" style="margin-top:12px">'+row('home','İşimi Çöz ana sayfası','Ana platforma dön','exit')+'</div>');return}
    var u=(sess()||{}).user||{};
    var ms=s.my_seller;
    var sellerRow=ms?row('store','Satıcı paneli',SELLER_ST[ms.status]?SELLER_ST[ms.status][0]:'Mağazanı yönet','nav',{k:'seller'}):(s.seller_signup_enabled?row('store','Satıcı ol','Ürünlerini Özüne Dön\'de sat','nav',{k:'seller'}):'');
    paint(pageHead('Hesabım',u.email||'')+'<div class="ozList">'+
      row('box','Siparişlerim','Sipariş durumu, kargo takibi, iade','nav',{k:'orders'})+
      row('heart','Favorilerim','Kaydettiğin ürünler','nav',{k:'favs'})+
      row('pin','Adreslerim','Teslimat adreslerini yönet','nav',{k:'addresses'})+
      row('bell','Bildirimler','Sipariş ve mağaza gelişmeleri','bell')+
      sellerRow+
      (s.is_admin?row('leaf','Özüne Dön yönetimi','Satıcı, ürün, sipariş ve ayarlar','admin'):'')+
      row('home','İşimi Çöz ana sayfası','Ana platforma dön','exit')+'</div>');
  }
});
var SELLER_ST={draft:['Başvuru taslağı','warn'],pending:['İnceleniyor','warn'],in_review:['İnceleniyor','warn'],approved:['Onaylı','ok'],active:['Onaylı','ok'],rejected:['Reddedildi','bad'],suspended:['Askıda','bad']};
function row(icon,title,sub,act,data){
  var attrs='';data=data||{};Object.keys(data).forEach(function(k){attrs+=' data-'+k+'="'+E(data[k])+'"'});
  return '<button type="button" class="ozRowBtn" data-a="'+act+'"'+attrs+'><span class="ic">'+ico(icon,22)+'</span><span class="tx"><b>'+E(title)+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</span><span class="ch" aria-hidden="true">›</span></button>';
}
async function searchMore(t){
  var sr=ST.sr;if(!sr)return;var a=sr.a;var LIM=24;
  var btn=D.getElementById('ozMore');if(btn){btn.disabled=true;btn.textContent='Yükleniyor…'}
  try{
    var p={sort:a.sort||'new',limit:LIM,offset:sr.offset};if(a.q)p.q=a.q;if(a.cat)p.category=a.cat;if(a.seller)p.seller_id=a.seller;
    var l=arr(await rpc('oz_search_products',{p:p}));
    if(!alive(t))return;
    sr.list=sr.list.concat(l);sr.offset+=l.length;sr.more=l.length>=LIM;
    var box=D.getElementById('ozRes');if(!box)return;
    box.innerHTML=sr.list.length?'<p class="ozMuted" style="margin:0 0 8px">'+sr.list.length+(sr.more?'+':'')+' ürün</p><div class="ozGrid">'+sr.list.map(card).join('')+'</div>'+(sr.more?'<button type="button" class="ozBtn wide" id="ozMore" data-a="more" style="margin-top:12px">Daha fazla göster</button>':''):
      empty(ico('search',36),'Sonuç bulunamadı',a.seller?'Bu üreticinin şu anda satışta ürünü yok.':'Farklı bir kelime ya da kategori deneyebilirsin.');
  }catch(e){var b=D.getElementById('ozRes');if(b&&alive(t))b.innerHTML=errBox(e)}
}
D.addEventListener('change',function(e){
  var el=e.target;if(!el||!el.dataset||!el.dataset.chg||!el.closest('#ozRoot,.ozOv'))return;
  var fn=CHANGE[el.dataset.chg];if(fn){try{var r=fn(el,e);if(r&&r.catch)r.catch(fail)}catch(err){fail(err)}}
});
var CHANGE={
  sort:function(el){var c=cur();c.a=Object.assign({},c.a,{sort:el.value});draw()}
};
/* K27: organik / menşe / sertifika bilgileri satıcı beyanıdır */
var CLAIM='<span class="ozClaim">Satıcı beyanı – platform tarafından doğrulanmadı</span>';
function renderProduct(){
  var pd=ST.pd;if(!pd)return;var p=pd.p;var vs=arr(p.variants);
  var v=vs.filter(function(x){return x.id===pd.sel})[0]||null;
  var stock=v?num(v.stock):0;var inCart=v?cartQty(v.id):0;var maxQ=Math.max(0,Math.min(99,stock-inCart));
  if(pd.qty>maxQ)pd.qty=Math.max(1,maxQ);
  var imgs=arr(p.images);var sel=p.seller||{};var price=v?num(v.price_kurus):0,cmp=v?num(v.compare_at_kurus):0;
  var gal='<div class="ozGalW"><div class="ozGal" id="ozGal" aria-label="Ürün görselleri">'+(imgs.length?imgs.map(function(u,i){return pic(u,p.name+' '+(i+1))}).join(''):pic('',p.name))+'</div>'+
    (imgs.length>1?'<span class="ozGalN" id="ozGalN">1 / '+imgs.length+'</span>':'')+favBtn(p.id,isFav(p.id))+'</div>';
  var info='<h1 class="ozPName">'+E(p.name)+'</h1>'+
    '<div class="ozMuted">'+[p.origin_city?'📍 '+E(p.origin_city):'',num(p.rating_count)?stars(p.rating_avg)+' '+num(p.rating_count)+' değerlendirme':'',num(p.sold_count)?num(p.sold_count)+' satıldı':''].filter(Boolean).join(' · ')+'</div>'+
    '<div class="ozPrice">'+(v?TL(price)+(cmp>price?'<s>'+TL(cmp)+'</s>':''):'—')+'</div>';
  var vars=vs.length>1||(vs[0]&&vs[0].label)?'<div class="ozVars" role="radiogroup" aria-label="Seçenek">'+vs.map(function(x){var out=num(x.stock)<=0;return '<button type="button" class="ozVar'+(x.id===pd.sel?' on':'')+'" role="radio" aria-checked="'+(x.id===pd.sel)+'" data-a="pickVar" data-id="'+E(x.id)+'"'+(out?' disabled':'')+'>'+E(x.label||'Standart')+'<small>'+(out?'Tükendi':TL(x.price_kurus))+'</small></button>'}).join('')+'</div>':'';
  var buy=!v||stock<=0?'<div class="ozWarn">Bu ürün şu anda stokta yok.</div>':
    (maxQ<=0?'<div class="ozWarn">Stoktaki tüm adetler sepetinde.</div><button type="button" class="ozBtn wide" data-a="nav" data-k="cart">Sepete git</button>':
    '<div class="ozBuy"><div class="ozStep" role="group" aria-label="Adet"><button type="button" data-a="pdQty" data-d="-1" aria-label="Azalt"'+(pd.qty<=1?' disabled':'')+'>−</button><b aria-live="polite">'+pd.qty+'</b><button type="button" data-a="pdQty" data-d="1" aria-label="Artır"'+(pd.qty>=maxQ?' disabled':'')+'>+</button></div><button type="button" class="ozBtn pri" data-a="addCart">Sepete ekle</button></div>'+
    (stock<=5?'<p class="ozMuted" style="margin:-6px 0 12px">Son '+stock+' adet</p>':'')+(inCart?'<p class="ozMuted" style="margin:-6px 0 12px">Sepetinde '+inCart+' adet var.</p>':''));
  var ship='<div class="ozCard"><div class="ozMuted">'+ico('truck',16)+' '+(num(sel.handling_days)?num(sel.handling_days)+' iş günü içinde kargoya verilir':'Kargoya veriliş süresi satıcıya göre değişir')+'</div>'+(num(sel.free_ship_over_kurus)?'<div class="ozMuted" style="margin-top:4px">'+E(sel.display_name||'Bu üretici')+' ürünlerinde '+TL(sel.free_ship_over_kurus)+' ve üzeri kargo bedava</div>':'')+'</div>';
  function det(title,body,open){return body?'<details class="ozDet"'+(open?' open':'')+'><summary>'+E(title)+'</summary><div>'+body+'</div></details>':''}
  var kv=[];
  if(p.net_content)kv.push(['Net miktar',p.net_content]);
  if(v&&num(v.weight_g))kv.push(['Kargo ağırlığı',NF1.format(num(v.weight_g)/1000)+' kg']);
  if(p.category&&p.category.name)kv.push(['Kategori',p.category.name]);
  if(p.organic_cert)kv.push(['Organik sertifika',p.organic_cert,1]);
  var kvH=kv.length?'<dl class="ozKV">'+kv.map(function(x){return '<dt>'+E(x[0])+'</dt><dd>'+E(x[1])+(x[2]?' '+CLAIM:'')+'</dd>'}).join('')+'</dl>':'';
  var store=(p.storage_info?'<p style="margin:0 0 6px">'+E(p.storage_info)+'</p>':'')+(num(p.shelf_life_days)?'<p style="margin:0">Raf ömrü: '+num(p.shelf_life_days)+' gün</p>':'');
  var origin=(p.origin_city?'<p style="margin:0 0 6px"><b>'+E(p.origin_city)+'</b> '+CLAIM+'</p>':'')+(p.origin_note?'<p class="ozStory" style="margin:0">'+E(p.origin_note)+'</p>':'')+(!p.origin_city&&p.origin_note?'<p style="margin:6px 0 0">'+CLAIM+'</p>':'');
  var alg=arr(p.allergens);
  var dets=det('Ürün açıklaması',p.description?'<p class="ozStory" style="margin:0">'+E(p.description)+'</p>':'',true)+det('Ürün bilgileri',kvH)+det('İçindekiler',p.ingredients?'<p class="ozStory" style="margin:0">'+E(p.ingredients)+'</p>':'')+
    det('Menşe',origin)+det('Alerjen bilgisi',alg.length?'<div class="ozWrap">'+alg.map(function(x){return '<span class="ozTag warn">'+E(algLabel(x))+'</span>'}).join('')+'</div>':'')+det('Saklama ve raf ömrü',store);
  var sellerH='<div class="ozSecH"><h2>Üretici</h2></div>'+sellerBtn(sel)+(sel.story?'<p class="ozStory ozMuted" style="margin:8px 2px 0">'+E(String(sel.story).slice(0,280))+(String(sel.story).length>280?'…':'')+'</p>':'');
  var revs=arr(p.reviews);
  var revH='<div class="ozSecH"><h2>Değerlendirmeler'+(num(p.rating_count)?' ('+num(p.rating_count)+')':'')+'</h2>'+(num(p.rating_count)?'<span>'+stars(p.rating_avg)+'</span>':'')+'</div>'+
    (revs.length?'<div class="ozCard">'+revs.map(function(r){return '<div class="ozRev"><div class="h"><span>'+stars(r.rating)+' '+E(r.name||'Alıcı')+'</span><span>'+E(fmtDay(r.created_at))+'</span></div>'+(r.comment?'<p>'+E(r.comment)+'</p>':'')+(r.seller_reply?'<div class="ozReply"><b>Üretici yanıtı:</b> '+E(r.seller_reply)+'</div>':'')+'</div>'}).join('')+'</div>':'<p class="ozMuted">Henüz değerlendirme yok. Ürünü alanlar teslimattan sonra değerlendirebilir.</p>');
  var qs_=arr(p.questions);
  var qH='<div class="ozSecH"><h2>Soru ve cevaplar</h2><button type="button" class="ozBtn sm" data-a="ask">Soru sor</button></div>'+
    (qs_.length?'<div class="ozCard">'+qs_.map(function(q){return '<div class="ozRev"><div class="h"><span>Soru</span><span>'+E(fmtDay(q.created_at))+'</span></div><p><b>'+E(q.question)+'</b></p>'+(q.answer?'<div class="ozReply"><b>Üretici:</b> '+E(q.answer)+'</div>':'<p class="ozMuted">Üreticinin cevabı bekleniyor.</p>')+'</div>'}).join('')+'</div>':'<p class="ozMuted">Henüz soru sorulmamış.</p>');
  paint(gal+info+vars+buy+ship+dets+sellerH+revH+qH);
  var g=D.getElementById('ozGal'),n=D.getElementById('ozGalN');
  if(g&&n)g.addEventListener('scroll',function(){var i=Math.round(g.scrollLeft/Math.max(1,g.clientWidth));n.textContent=(i+1)+' / '+imgs.length},{passive:true});
}
ACT_EXTRA({
  sortGo:function(b){go('search',{sort:b.dataset.sort})},
  srchCat:function(b){var c=cur();c.a=Object.assign({},c.a,{cat:b.dataset.cat,q:val('ozQ')});draw()},
  more:function(){searchMore(SCR)},
  fav:async function(b){
    var id=b.dataset.id;
    if(!logged()){needLogin(function(){toggleFav(id)});return}
    await busy(b,function(){return toggleFav(id)});
  },
  pickVar:function(b){if(!ST.pd)return;ST.pd.sel=b.dataset.id;ST.pd.qty=1;renderProduct()},
  pdQty:function(b){if(!ST.pd)return;ST.pd.qty=Math.max(1,ST.pd.qty+num(b.dataset.d));renderProduct()},
  addCart:function(){
    var pd=ST.pd;if(!pd)return;var p=pd.p;var v=arr(p.variants).filter(function(x){return x.id===pd.sel})[0];if(!v)return;
    var sel=p.seller||{};
    cartAdd({variant_id:v.id,product_id:p.id,name:p.name,label:v.label||'',image:arr(p.images)[0]||null,price_kurus:num(v.price_kurus),seller_id:sel.id||null,seller_name:sel.display_name||''},pd.qty);
    pd.qty=1;renderProduct();
    try{if(typeof v2Toast==='function'){v2Toast('Sepete eklendi','Sepete git',function(){go('cart')});return}}catch(e){}
    toast('Sepete eklendi');
  },
  ask:function(){
    var pd=ST.pd;if(!pd)return;var pid=pd.p.id;
    if(!logged()){needLogin(function(){askQuestion(pid)});return}
    return askQuestion(pid);
  },
  admin:function(){if(window.PF&&typeof PF.openAdmin==='function')PF.openAdmin('oz_overview');else toast('Yönetim paneli yüklenemedi.')}
});
/* ====================== Sipariş durumları ====================== */
var ORDER_ST={awaiting_payment:['Ödeme bekleniyor','warn'],new:['Yeni sipariş','warn'],accepted:['Onaylandı','ok'],packed:['Hazırlandı','ok'],shipped:['Kargoda','ok'],delivered:['Teslim edildi','ok'],completed:['Tamamlandı','ok'],cancelled:['İptal edildi','bad'],return_requested:['İade talebi','warn'],returned:['İade edildi','bad'],refund_pending:['İade ödemesi bekleniyor','warn'],refunded:['Ücret iade edildi','bad']};
var RET_ST={requested:['İade talebi alındı','warn'],approved:['İade onaylandı','ok'],rejected:['İade reddedildi','bad'],refunded:['Ücret iade edildi','ok'],completed:['İade tamamlandı','ok']};
var ROLE={buyer:'Alıcı',seller:'Satıcı',admin:'Yönetici',system:'Sistem'};
var PAYM={mock:'Deneme ödemesi',cod:'Kapıda ödeme',online:'Online ödeme'};
var PAY_ST={pending:['Ödeme bekleniyor','warn'],paid:['Ödendi','ok'],cod:['Kapıda ödenecek',''],refund_pending:['Ücret iadesi bekleniyor','warn'],refunded:['Ücret iade edildi','ok'],failed:['Ödeme başarısız','bad'],void:['Ödeme iptal','']};
function stTag(map,s){var x=map[s]||[s||'—',''];return '<span class="ozTag '+x[1]+'">'+E(x[0])+'</span>'}
function addrText(a){if(!a)return '';return [a.address_line,a.neighborhood,[a.district,a.city].filter(Boolean).join(' / '),a.postal_code].filter(Boolean).join(', ')}
var RET_REASONS=['Hasarlı geldi','Yanlış ürün gönderildi','Eksik ürün','Ürün açıklamayla uyuşmuyor','Bozuk / tarihi geçmiş','Diğer'];
function openLegal(type){
  if(window.PF&&typeof PF.openLegal==='function'){PF.openLegal(type);return}
  sheet('Sözleşme','<p class="ozP">Bu metin yayına alınmadan önce hukuki onaydan geçecektir.</p>');
}

/* ====================== Sepet ekranı ====================== */
VIEWS_EXTRA({
  cart:async function(a,t){
    var c=cartGet();
    if(!c.length){paint(pageHead('Sepetim')+empty(ico('cart',36),'Sepetin boş','Doğal ürünleri keşfetmeye başla.','<button type="button" class="ozBtn pri" data-a="nav" data-k="home">Ürünlere göz at</button>'));return}
    paint(pageHead('Sepetim')+skel(2,'line'));
    var q=null,qe=null;try{q=await rpc('oz_quote',{p_items:cartItemsParam()})}catch(e){qe=e}
    if(!alive(t))return;
    ST.quote=q;
    paint(pageHead('Sepetim',cartCount()+' ürün')+(qe?errBox(qe):'')+cartHtml(q,c));
  },

  /* ====================== Tek ekran ödeme ====================== */
  checkout:async function(a,t){
    if(!logged()){paint(pageHead('Ödeme')+loginWall('Siparişi tamamlamak için giriş yap. Sepetin korunur.'));return}
    if(!cartGet().length){go('cart',{},true);return}
    paint(pageHead('Siparişi tamamla')+skel(3,'line'));
    var r=await Promise.all([rpc('oz_quote',{p_items:cartItemsParam()}),get('oz_addresses?select=*&order=is_default.desc,created_at.desc'),loadSettings(true)]);
    if(!alive(t))return;
    if(!ST.crid)ST.crid=uuid();
    var adr=arr(r[1]);
    ST.co=ST.co||{};ST.co.q=r[0];ST.co.addrs=adr;
    if(!ST.co.addr||!adr.some(function(x){return x.id===ST.co.addr}))ST.co.addr=(adr.filter(function(x){return x.is_default})[0]||adr[0]||{}).id||null;
    var s=S();var pays=[];if(s.payment_mock)pays.push('mock');if(s.cod)pays.push('cod');
    if(pays.indexOf(ST.co.pay)<0)ST.co.pay=pays[0]||null;
    drawCheckout();
  },

  placed:function(a,t){
    var res=a.res||{};var os=arr(res.orders);var s=S();
    var needPay=os.some(function(o){return o.status==='awaiting_payment'})&&a.pay==='mock';
    paint('<div class="ozEmpty" style="padding-top:12px"><div class="i">'+ico('leaf',40)+'</div><b>'+(res.duplicate?'Bu sipariş zaten alındı, Siparişlerim\'den kontrol et':'Siparişin alındı')+'</b><p>'+(needPay?'Ödemeyi tamamladığında sipariş üreticiye iletilir.':'Üretici siparişini onayladığında bildirim alacaksın.')+'</p></div>'+
      '<div class="ozCard">'+os.map(function(o){return '<div class="ozLine"><span><b>'+E(o.order_no||'Sipariş')+'</b> '+stTag(ORDER_ST,o.status)+'</span><span>'+TL(o.total_kurus)+'</span></div>'}).join('')+'</div>'+
      (needPay?(s.payment_mock?'<div class="ozWarn">Bu bir deneme ödemesidir; gerçek para çekilmez.</div><button type="button" class="ozBtn sun wide" data-a="mockPayAll">Deneme ödemesini tamamla</button>':'<div class="ozWarn">Deneme ödemesi şu anda kapalı. Ödeme yöntemi çok yakında.</div>'):'')+
      '<div class="ozRow2" style="margin-top:12px"><button type="button" class="ozBtn" data-a="nav" data-k="orders">Siparişlerim</button><button type="button" class="ozBtn" data-a="nav" data-k="home">Alışverişe devam</button></div>');
  },

  /* ====================== Siparişlerim ====================== */
  orders:async function(a,t){
    if(!logged()){paint(pageHead('Siparişlerim')+loginWall());return}
    paint(pageHead('Siparişlerim')+skel(3,'line'));
    ST.ol={list:[],off:0,more:false};
    await ordersMore(t);
  },
  order:async function(a,t){
    if(!logged()){paint(pageHead('Sipariş')+loginWall());return}
    paint(skel(1,'line')+skel(2));
    var d=await rpc('oz_order_detail',{p_order:a.id});
    if(!alive(t))return;
    if(!d||!d.order){paint(empty(ico('box',36),'Sipariş bulunamadı','','<button type="button" class="ozBtn" data-a="nav" data-k="orders">Siparişlerim</button>'));return}
    ST.od=d;paint(orderDetailHtml(d));
  },

  /* ====================== Adreslerim ====================== */
  addresses:async function(a,t){
    if(!logged()){paint(pageHead('Adreslerim')+loginWall());return}
    paint(pageHead('Adreslerim')+skel(2,'line'));
    var l=arr(await get('oz_addresses?select=*&order=is_default.desc,created_at.desc'));
    if(!alive(t))return;ST.addrs=l;
    paint(pageHead('Adreslerim')+(l.length?'<div class="ozList">'+l.map(function(x){return '<div class="ozCard" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+E(x.title||'Adres')+'</b>'+(x.is_default?'<span class="ozTag ok">Varsayılan</span>':'')+'</div><p class="ozMuted" style="margin:6px 0 10px">'+E(x.recipient||'')+' · '+E(x.phone||'')+'<br>'+E(addrText(x))+'</p><div class="ozRow2"><button type="button" class="ozBtn sm" data-a="addrEdit" data-id="'+E(x.id)+'">Düzenle</button><button type="button" class="ozBtn sm ghost" data-a="addrDel" data-id="'+E(x.id)+'">Sil</button></div></div>'}).join('')+'</div>':
      empty(ico('pin',36),'Kayıtlı adresin yok','Siparişlerin için teslimat adresi ekle.'))+'<button type="button" class="ozBtn pri wide" data-a="addrNew" style="margin-top:12px">Yeni adres ekle</button>');
  }
});
function cartHtml(q,c){
  var groups=arr(q&&q.groups);var issues=arr(q&&q.issues);
  var byV={};groups.forEach(function(g){arr(g.items).forEach(function(it){byV[it.variant_id]=it})});
  var h='';
  if(groups.length){
    h+=groups.map(function(g){return '<div class="ozCard"><div class="ozRow2" style="justify-content:space-between"><b>'+E(g.seller_name||'Üretici')+'</b>'+(num(g.handling_days)?'<span class="ozMuted">'+num(g.handling_days)+' iş gününde kargoda</span>':'')+'</div>'+
      arr(g.items).map(function(it){return cartLine(it,num(it.stock))}).join('')+
      '<div class="ozLine"><span class="m">Ürünler</span><span>'+TL(g.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(g.shipping_kurus)?TL(g.shipping_kurus):'Bedava')+'</span></div></div>'}).join('');
  }
  var orphan=c.filter(function(x){return q&&!byV[x.variant_id]});
  if(orphan.length)h+='<div class="ozCard"><b>Satışta olmayan ürünler</b>'+orphan.map(function(x){return cartLine({variant_id:x.variant_id,product_id:x.product_id,name:x.name,label:x.label,image:x.image,unit_price_kurus:x.price_kurus,qty:x.qty,line_total_kurus:x.price_kurus*x.qty,issue:'Bu ürün artık satışta değil; sepetten çıkar.'},0)}).join('')+'</div>';
  if(!q)h+='<div class="ozCard">'+c.map(function(x){return cartLine({variant_id:x.variant_id,product_id:x.product_id,name:x.name,label:x.label,image:x.image,unit_price_kurus:x.price_kurus,qty:x.qty,line_total_kurus:x.price_kurus*x.qty},99)}).join('')+'</div>';
  if(issues.length)h+='<div class="ozWarn">'+issues.map(function(i){return '<div>'+E(typeof i==='string'?i:(i.message||i.issue||''))+'</div>'}).join('')+'</div>';
  var s=S();var min=num(s.min_order_kurus);var sub=num(q&&q.subtotal_kurus);
  var blocked=!q||issues.length>0||orphan.length>0||groups.some(function(g){return arr(g.items).some(function(it){return it.issue})});
  var minBad=q&&min&&sub<min;
  if(minBad)h+='<div class="ozWarn">En az sipariş tutarı '+TL(min)+'. Sepetine '+TL(min-sub)+' daha ekle.</div>';
  if(s.orders_enabled===false)h+='<div class="ozWarn">Sipariş alımı geçici olarak kapalı.</div>';
  h+='<div class="ozSticky">'+(q?'<div class="ozLine"><span class="m">Ürünler</span><span>'+TL(q.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(q.shipping_kurus)?TL(q.shipping_kurus):'Bedava')+'</span></div><div class="ozLine tot"><span>Toplam</span><span>'+TL(q.total_kurus)+'</span></div>':'')+
    '<button type="button" class="ozBtn pri" data-a="toCheckout" style="margin-top:8px"'+(blocked||minBad||s.orders_enabled===false?' disabled':'')+'>Ödemeye geç</button></div>';
  return h;
}
function cartLine(it,stock){
  var q=num(it.qty);var max=Math.min(99,stock||0);
  return '<div class="ozCI">'+pic(it.image,it.name)+'<div class="tx"><b>'+E(it.name)+'</b><small>'+E(it.label||'')+(it.label?' · ':'')+TL(it.unit_price_kurus)+'</small><div class="pr">'+TL(it.line_total_kurus)+'</div>'+(it.issue?'<div class="ozIssue">'+E(it.issue)+'</div>':'')+'</div>'+
    '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div class="ozStep" role="group" aria-label="Adet"><button type="button" data-a="cQty" data-id="'+E(it.variant_id)+'" data-d="-1" aria-label="Azalt">−</button><b>'+q+'</b><button type="button" data-a="cQty" data-id="'+E(it.variant_id)+'" data-d="1" aria-label="Artır"'+(q>=max?' disabled':'')+'>+</button></div>'+
    '<button type="button" class="ozLink" data-a="cDel" data-id="'+E(it.variant_id)+'" style="padding:4px;min-height:44px">Kaldır</button></div></div>';
}
/* K27: sipariş öncesi yasal onaylar (PF hukuki metin anahtarları) */
var CONSENTS=[['mesafeli_satis','Mesafeli Satış Sözleşmesi\'ni okudum, onaylıyorum.','Mesafeli Satış Sözleşmesi'],['on_bilgilendirme','Ön Bilgilendirme Formu\'nu okudum, onaylıyorum.','Ön Bilgilendirme Formu'],['iade_iptal','İade ve iptal koşullarını okudum, onaylıyorum.','İade ve iptal koşulları']];
function termsOk(co){return !!(co&&co.terms&&CONSENTS.every(function(c){return co.terms[c[0]]}))}
function coReadTerms(){var co=ST.co;if(!co)return;co.terms={};CONSENTS.forEach(function(c){co.terms[c[0]]=checked('ozT_'+c[0])})}
function coSyncBtn(){var b=D.getElementById('ozPlace');if(b&&ST.co&&!ST.placing)b.disabled=!!ST.co.blocked||!termsOk(ST.co)}
function isDupErr(e){return /duplicate key|unique constraint|23505|client_request_id/i.test(String(e&&e.message||''))||(e&&e.code==='23505')}
function dupDone(){cartSet([]);ST.crid=null;ST.co=null;toast('Bu sipariş zaten alındı, Siparişlerim\'den kontrol et.');NAV=NAV.filter(function(x){return x.k!=='checkout'&&x.k!=='cart'});go('orders',{})}
function drawCheckout(){
  var co=ST.co;var q=co.q||{};var s=S();
  var pays=[];if(s.payment_mock)pays.push('mock');if(s.cod)pays.push('cod');
  var adrH=co.addrs.length?co.addrs.map(function(x){var on=x.id===co.addr;return '<label class="ozPick'+(on?' on':'')+'"><input type="radio" name="ozAddr" value="'+E(x.id)+'" data-chg="coAddr"'+(on?' checked':'')+'><span class="tx"><b>'+E(x.title||'Adres')+' · '+E(x.recipient||'')+'</b><small>'+E(addrText(x))+'</small></span></label>'}).join(''):'<p class="ozMuted" style="margin:0 0 8px">Kayıtlı adresin yok.</p>';
  var payH=pays.length?pays.map(function(p){var on=p===co.pay;return '<label class="ozPick'+(on?' on':'')+'"><input type="radio" name="ozPay" value="'+p+'" data-chg="coPay"'+(on?' checked':'')+'><span class="tx"><b>'+E(PAYM[p])+'</b><small>'+(p==='mock'?'Gerçek para çekilmez; yalnızca deneme içindir.':'Ödemeyi ürünü teslim alırken kargo görevlisine yaparsın.')+'</small></span></label>'}).join(''):'<div class="ozWarn">Ödeme yöntemi çok yakında.</div>';
  var groups=arr(q.groups);var issues=arr(q.issues);
  var sumH=groups.map(function(g){return '<div class="ozLine"><span class="m">'+E(g.seller_name||'Üretici')+' · '+arr(g.items).reduce(function(n,i){return n+num(i.qty)},0)+' ürün</span><span>'+TL(g.total_kurus)+'</span></div>'}).join('');
  var blocked=!pays.length||!co.addr||issues.length>0||s.orders_enabled===false||groups.some(function(g){return arr(g.items).some(function(it){return it.issue})});
  co.blocked=blocked;co.terms=co.terms&&typeof co.terms==='object'?co.terms:{};
  var consH='<div class="ozCons" role="group" aria-label="Sözleşme onayları">'+CONSENTS.map(function(c){return '<div class="ozConsR"><label class="ozChk"><input type="checkbox" id="ozT_'+c[0]+'" data-chg="coTerms" data-t="'+c[0]+'"'+(co.terms[c[0]]?' checked':'')+'><span>'+E(c[1])+'</span></label><button type="button" class="ozLink" data-a="legal" data-t="'+c[0]+'" aria-label="'+E(c[2])+' metnini oku">Oku</button></div>'}).join('')+'</div>';
  paint('<div class="ozCo"><div class="ozCoMain">'+pageHead('Siparişi tamamla')+
    '<div class="ozCard"><h3>Teslimat adresi</h3>'+adrH+'<button type="button" class="ozBtn sm" data-a="addrNew" data-co="1">Yeni adres ekle</button></div>'+
    '<div class="ozCard"><h3>Ödeme yöntemi</h3>'+payH+'<button type="button" class="ozLink" data-a="legal" data-t="on_bilgilendirme">Ön Bilgilendirme Formu</button></div>'+
    '<div class="ozCard"><h3>Sipariş özeti</h3>'+sumH+'<label class="ozMuted" for="ozCoNote" style="display:block;margin-top:10px">Sipariş notu (isteğe bağlı)</label><textarea class="ozTa" id="ozCoNote" maxlength="300" style="min-height:64px" placeholder="Örn. Zile basmayın">'+E(co.note||'')+'</textarea></div>'+
    (issues.length?'<div class="ozWarn">'+issues.map(function(i){return '<div>'+E(typeof i==='string'?i:(i.message||''))+'</div>'}).join('')+'<button type="button" class="ozLink" data-a="nav" data-k="cart">Sepeti düzenle</button></div>':'')+
    (s.orders_enabled===false?'<div class="ozWarn">Sipariş alımı geçici olarak kapalı.</div>':'')+
    consH+
    '</div><div class="ozCoBar"><div class="ozLine"><span class="m">Ürünler</span><span>'+TL(q.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(q.shipping_kurus)?TL(q.shipping_kurus):'Bedava')+'</span></div><div class="ozLine tot"><span>Toplam</span><span>'+TL(q.total_kurus)+'</span></div>'+
    '<button type="button" class="ozBtn pri" id="ozPlace" data-a="place"'+(blocked||!termsOk(co)?' disabled':'')+'>Siparişi tamamla · '+TL(q.total_kurus)+'</button></div></div>');
}
async function ordersMore(t){
  var ol=ST.ol;var LIM=20;
  var l=arr(await rpc('oz_my_orders',{p_limit:LIM,p_offset:ol.off}));
  if(!alive(t))return;
  ol.list=ol.list.concat(l);ol.off+=l.length;ol.more=l.length>=LIM;
  paint(pageHead('Siparişlerim')+(ol.list.length?'<div class="ozList">'+ol.list.map(function(o){var its=arr(o.items);return '<button type="button" class="ozRowBtn" data-a="nav" data-k="order" data-id="'+E(o.id)+'">'+(its[0]?pic(its[0].image,its[0].name,'').replace('class="ozPic ','class="ozPic ozThumb '):'<span class="ic">'+ico('box',22)+'</span>')+'<span class="tx"><b>'+E(o.order_no||'Sipariş')+' · '+TL(o.total_kurus)+'</b><small>'+E(o.seller_name||'')+(o.seller_name?' · ':'')+E(fmtDay(o.created_at))+'</small><span style="display:block;margin-top:4px">'+stTag(ORDER_ST,o.status)+'</span></span><span class="ch" aria-hidden="true">›</span></button>'}).join('')+'</div>'+(ol.more?'<button type="button" class="ozBtn wide" data-a="ordMore" style="margin-top:12px">Daha fazla göster</button>':''):
    empty(ico('box',36),'Henüz siparişin yok','Verdiğin siparişler burada görünür.','<button type="button" class="ozBtn pri" data-a="nav" data-k="home">Alışverişe başla</button>')));
}
function orderDetailHtml(d){
  var o=d.order||{};var its=arr(d.items);var ev=arr(d.events);var rv=arr(d.reviewed_product_ids).map(String);var ret=d.return;var s=S();
  var st=o.status;
  var acts='';
  if(st==='awaiting_payment'&&o.payment_method==='mock'&&s.payment_mock)acts+='<button type="button" class="ozBtn sun" data-a="mockPay" data-id="'+E(o.id)+'">Deneme ödemesini tamamla</button>';
  if(st==='shipped')acts+='<button type="button" class="ozBtn pri" data-a="ordDeliver" data-id="'+E(o.id)+'">Teslim aldım</button>';
  if(st==='awaiting_payment'||st==='new')acts+='<button type="button" class="ozBtn bad" data-a="ordCancel" data-id="'+E(o.id)+'">Siparişi iptal et</button>';
  if(d.can_return&&!ret)acts+='<button type="button" class="ozBtn" data-a="ordReturn" data-id="'+E(o.id)+'">İade iste</button>';
  var canReview=(st==='delivered'||st==='completed');
  var ship=o.ship_to||{};
  var tl=ev.length?'<ol class="ozTl">'+ev.map(function(e){return '<li><b>'+E((ORDER_ST[e.to]||[e.to])[0])+'</b><small>'+E(fmtDate(e.at))+(e.role?' · '+E(ROLE[e.role]||e.role):'')+(e.reason?' · '+E(e.reason):'')+'</small></li>'}).join('')+'</ol>':'<p class="ozMuted">Henüz hareket yok.</p>';
  var trk=o.tracking_no?'<div class="ozCard"><h3>Kargo takibi</h3><p style="margin:0 0 8px">'+E(o.carrier||'Kargo')+' · Takip no: <b>'+E(o.tracking_no)+'</b></p>'+(o.tracking_url&&/^https?:\/\//i.test(o.tracking_url)?'<a class="ozBtn wide" href="'+E(o.tracking_url)+'" target="_blank" rel="noopener noreferrer">Kargonu takip et</a>':'')+'</div>':'';
  return '<div class="ozHead"><h1>'+E(o.order_no||'Sipariş')+'</h1><p>'+E(d.seller_name||'')+' · '+E(fmtDate(o.created_at))+'</p></div>'+
    '<div style="margin:0 0 12px">'+stTag(ORDER_ST,st)+'</div>'+
    (acts?'<div class="ozRow2" style="margin:0 0 12px">'+acts+'</div>':'')+
    (ret?'<div class="ozCard"><h3>İade</h3><p style="margin:0 0 6px">'+stTag(RET_ST,ret.status)+'</p>'+(ret.reason?'<p class="ozMuted" style="margin:0">Neden: '+E(ret.reason)+'</p>':'')+(ret.decision_note||ret.note?'<p class="ozMuted" style="margin:4px 0 0">Not: '+E(ret.decision_note||ret.note)+'</p>':'')+'</div>':'')+
    trk+
    '<div class="ozCard"><h3>Ürünler</h3>'+its.map(function(it){var pid=String(it.product_id||'');return '<div class="ozCI">'+pic(it.image,it.name)+'<div class="tx"><b>'+E(it.name)+'</b><small>'+E(it.label||'')+' · '+num(it.qty)+' adet</small><div class="pr">'+TL(it.line_total_kurus||num(it.unit_price_kurus)*num(it.qty))+'</div></div>'+
      (canReview&&pid?(rv.indexOf(pid)>=0?'<span class="ozTag ok">Değerlendirildi</span>':'<button type="button" class="ozBtn sm" data-a="ordReview" data-o="'+E(o.id)+'" data-p="'+E(pid)+'">Değerlendir</button>'):'')+'</div>'}).join('')+
      '<div class="ozLine"><span class="m">Ürünler</span><span>'+TL(o.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(o.shipping_fee_kurus!=null?o.shipping_fee_kurus:o.shipping_kurus)?TL(o.shipping_fee_kurus!=null?o.shipping_fee_kurus:o.shipping_kurus):'Bedava')+'</span></div>'+(num(o.discount_kurus)?'<div class="ozLine"><span class="m">İndirim</span><span>−'+TL(o.discount_kurus)+'</span></div>':'')+'<div class="ozLine tot"><span>Toplam</span><span>'+TL(o.total_kurus)+'</span></div>'+
      '<p class="ozMuted" style="margin:8px 0 0">Ödeme: '+E(PAYM[o.payment_method]||o.payment_method||'—')+(o.payment_status?' '+stTag(PAY_ST,o.payment_status):'')+'</p>'+(o.cancel_reason?'<p class="ozMuted" style="margin:4px 0 0">İptal nedeni: '+E(o.cancel_reason)+'</p>':'')+'</div>'+
    '<div class="ozCard"><h3>Teslimat adresi</h3><p style="margin:0">'+E(ship.recipient||'')+(ship.phone?' · '+E(ship.phone):'')+'</p><p class="ozMuted" style="margin:4px 0 0">'+E(addrText(ship))+'</p>'+(o.note?'<p class="ozMuted" style="margin:6px 0 0">Not: '+E(o.note)+'</p>':'')+'</div>'+
    '<div class="ozCard"><h3>Sipariş geçmişi</h3>'+tl+'</div>';
}
function addressForm(x){
  x=x||{};
  function f(id,label,v,opt){opt=opt||{};return '<label for="ozA_'+id+'">'+E(label)+'</label><input class="ozIn" id="ozA_'+id+'" data-f="'+id+'" value="'+E(v||'')+'"'+(opt.type?' type="'+opt.type+'"':'')+(opt.im?' inputmode="'+opt.im+'"':'')+(opt.ac?' autocomplete="'+opt.ac+'"':'')+' maxlength="'+(opt.max||120)+'">'}
  return f('title','Adres başlığı (Ev, İş…)',x.title,{max:40})+f('recipient','Alıcı adı soyadı',x.recipient,{ac:'name'})+f('phone','Telefon',x.phone,{type:'tel',im:'tel',ac:'tel',max:20})+
    '<div class="ozTwo"><div>'+f('city','İl',x.city,{max:40})+'</div><div>'+f('district','İlçe',x.district,{max:60})+'</div></div>'+
    f('neighborhood','Mahalle',x.neighborhood,{max:80})+'<label for="ozA_address_line">Açık adres</label><textarea class="ozTa" id="ozA_address_line" data-f="address_line" maxlength="300" style="min-height:72px">'+E(x.address_line||'')+'</textarea>'+
    f('postal_code','Posta kodu (isteğe bağlı)',x.postal_code,{im:'numeric',max:5})+
    '<label class="ozChk"><input type="checkbox" data-f="is_default"'+(x.is_default?' checked':'')+'><span>Varsayılan adresim olsun</span></label>';
}
function addrValidate(v){
  if(!v.title)return 'Adres başlığı yaz.';if(v.recipient.length<3)return 'Alıcı adını yaz.';
  var d=v.phone.replace(/\D/g,'');if(d.length<10||d.length>13)return 'Geçerli bir telefon numarası yaz.';
  if(!v.city)return 'İl yaz.';if(!v.district)return 'İlçe yaz.';if(v.address_line.length<8)return 'Açık adresi yaz.';
  if(v.postal_code&&!/^\d{5}$/.test(v.postal_code))return 'Posta kodu 5 haneli olmalı.';return '';
}
async function editAddress(x,fromCo){
  var v=await formBox(x&&x.id?'Adresi düzenle':'Yeni adres',addressForm(x),'Kaydet',addrValidate);
  if(!v)return;
  var p={title:v.title,recipient:v.recipient,phone:v.phone,city:v.city,district:v.district,neighborhood:v.neighborhood||null,address_line:v.address_line,postal_code:v.postal_code||null,is_default:!!v.is_default};
  if(x&&x.id)p.id=x.id;
  var id=await rpc('oz_save_address',{p:p});
  toast('Adres kaydedildi');
  if(fromCo&&ST.co){ST.co.addr=typeof id==='string'?id:(id&&id.id)||ST.co.addr;}
  draw();
}
async function reviewBox(orderId,productId){
  var opts=[5,4,3,2,1].map(function(n){return '<label class="ozPick" style="min-height:48px;align-items:center"><input type="radio" name="ozRate" data-f="r'+n+'" value="'+n+'"'+(n===5?' checked':'')+'><span class="tx"><b>'+'★★★★★'.slice(0,n)+'</b><small>'+['','Çok kötü','Kötü','Orta','İyi','Çok iyi'][n]+'</small></span></label>'}).join('');
  var v=await formBox('Ürünü değerlendir','<fieldset style="border:0;padding:0;margin:0"><legend class="ozMuted" style="margin-bottom:6px">Puanın</legend>'+opts+'</fieldset><label for="ozRvC">Yorumun (isteğe bağlı)</label><textarea class="ozTa" id="ozRvC" data-f="c" maxlength="1000"></textarea><p class="ozHint">Yorumun adının baş harfleriyle herkese açık görünür.</p>','Gönder');
  if(!v)return;
  var rating=5;[1,2,3,4,5].forEach(function(n){if(v['r'+n])rating=n});
  await rpc('oz_submit_review',{p_order:orderId,p_product:productId,p_rating:rating,p_comment:v.c||null});
  toast('Değerlendirmen için teşekkürler');draw();
}
ACT_EXTRA({
  cQty:function(b){var id=b.dataset.id;cartSetQty(id,cartQty(id)+num(b.dataset.d));draw()},
  cDel:function(b){cartSetQty(b.dataset.id,0);toast('Ürün sepetten çıkarıldı');draw()},
  toCheckout:function(){if(!logged()){needLogin(function(){go('checkout')});return}go('checkout')},
  legal:function(b){openLegal(b.dataset.t)},
  addrNew:function(b){return editAddress(null,!!b.dataset.co)},
  addrEdit:function(b){var x=arr(ST.addrs).filter(function(y){return String(y.id)===b.dataset.id})[0];return editAddress(x)},
  addrDel:async function(b){if(!await confirmBox('Adres silinsin mi?','Bu adres kayıtlarından kaldırılacak.','Sil',true))return;await busy(b,async function(){await rpc('oz_delete_address',{p_id:b.dataset.id});toast('Adres silindi');draw()})},
  place:async function(b){
    var co=ST.co;if(!co)return;var s=S();
    if(ST.placing)return;
    co.note=val('ozCoNote');coReadTerms();
    if(!co.addr){toast('Teslimat adresi seç.');return}
    if(!co.pay){toast('Ödeme yöntemi çok yakında.');return}
    if(!termsOk(co)){toast('Devam etmek için tüm sözleşmeleri onayla.');var miss=CONSENTS.filter(function(c){return !co.terms[c[0]]})[0];var tt=miss&&D.getElementById('ozT_'+miss[0]);if(tt)tt.focus();return}
    if(!logged()){needLogin(function(){go('checkout',{},true)});return}
    if(!ST.crid)ST.crid=uuid();
    ST.placing=true;
    try{await busy(b,async function(){
      var res;
      try{res=await rpc('oz_place_order',{p:{items:cartItemsParam(),address_id:co.addr,note:co.note||null,payment_method:co.pay,client_request_id:ST.crid,terms:true}})}
      catch(e){if(isDupErr(e)){dupDone();return}throw e}
      res=res||{};
      if(res.duplicate){dupDone();return}
      /* Onay kaydı: sipariş başına; yayında olmayan metinler sunucuda not_published döner. Sipariş alındıktan sonra hata siparişi etkilemez. */
      var ua=String(navigator.userAgent||'').slice(0,380);
      await Promise.all(arr(res.orders).map(function(o){return rpc('pf_record_consents',{p_items:CONSENTS.map(function(c){return {doc_type:c[0],accepted:true}}),p_context:'oz_order',p_subject_id:String(o.id),p_user_agent:ua}).catch(function(){})}));
      cartSet([]);ST.crid=null;var pay=co.pay;ST.co=null;
      go('placed',{res:res,pay:pay},true);
    })}finally{ST.placing=false}
  },
  mockPayAll:async function(b){
    var c=cur();var os=arr(c.a.res&&c.a.res.orders).filter(function(o){return o.status==='awaiting_payment'});
    await busy(b,async function(){for(var i=0;i<os.length;i++){await rpc('oz_mock_pay',{p_order:os[i].id});os[i].status='new'}toast('Deneme ödemesi tamamlandı');draw()});
  },
  mockPay:async function(b){await busy(b,async function(){await rpc('oz_mock_pay',{p_order:b.dataset.id});toast('Deneme ödemesi tamamlandı');draw()})},
  ordMore:function(){ordersMore(SCR).catch(fail)},
  ordDeliver:async function(b){if(!await confirmBox('Teslim aldın mı?','Ürünleri teslim aldığını onaylıyorsun. Sorun varsa sonrasında iade isteyebilirsin.','Teslim aldım'))return;await busy(b,async function(){await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'deliver',p:{}});toast('Teslimat onaylandı');draw()})},
  ordCancel:async function(b){
    var v=await formBox('Siparişi iptal et','<label for="ozCnR">İptal nedeni (isteğe bağlı)</label><textarea class="ozTa" id="ozCnR" data-f="r" maxlength="300" style="min-height:72px"></textarea>','İptal et');
    if(!v)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'cancel',p:{reason:v.r||null}});toast('Sipariş iptal edildi');draw();
  },
  ordReturn:async function(b){
    var rd=num(S().return_days);
    var v=await formBox('İade iste','<label for="ozRtR">İade nedeni</label><select class="ozSel" id="ozRtR" data-f="r">'+RET_REASONS.map(function(x){return '<option>'+E(x)+'</option>'}).join('')+'</select><label for="ozRtD">Açıklama</label><textarea class="ozTa" id="ozRtD" data-f="d" maxlength="1000" placeholder="Sorunu kısaca anlat"></textarea>'+(rd?'<p class="ozHint">Teslimattan sonraki '+rd+' gün içinde iade isteyebilirsin.</p>':''),'Gönder',function(v){return v.d.length<5?'Kısa bir açıklama yaz.':''});
    if(!v)return;await rpc('oz_request_return',{p_order:b.dataset.id,p_reason:v.r,p_details:v.d});toast('İade talebin üreticiye iletildi');draw();
  },
  ordReview:function(b){return reviewBox(b.dataset.o,b.dataset.p)}
});
Object.assign(CHANGE,{
  coAddr:function(el){if(ST.co){ST.co.addr=el.value;ST.co.note=val('ozCoNote');coReadTerms();drawCheckout()}},
  coPay:function(el){if(ST.co){ST.co.pay=el.value;ST.co.note=val('ozCoNote');coReadTerms();drawCheckout()}},
  coTerms:function(){coReadTerms();coSyncBtn()}
});
async function toggleFav(id){
  var on=await rpc('oz_toggle_favorite',{p_product:id});
  if(!ST.fav)ST.fav=new Set();
  if(on)ST.fav.add(String(id));else ST.fav.delete(String(id));
  qa('[data-a=fav][data-id="'+String(id).replace(/"/g,'')+'"]').forEach(function(x){x.classList.toggle('on',!!on);x.setAttribute('aria-pressed',on?'true':'false');x.setAttribute('aria-label',on?'Favorilerden çıkar':'Favorilere ekle')});
  toast(on?'Favorilere eklendi':'Favorilerden çıkarıldı');
  if(cur().k==='favs'&&!on)draw();
}
async function askQuestion(pid){
  var v=await formBox('Üreticiye soru sor','<label for="ozAskQ">Sorun</label><textarea class="ozTa" id="ozAskQ" data-f="q" maxlength="500" placeholder="Örn. Asit oranı nedir?"></textarea><p class="ozHint">Sorun ve cevabı ürün sayfasında herkese açık görünür. Kişisel bilgi yazma.</p>','Gönder',function(v){return v.q.length<5?'Soru en az 5 karakter olmalı.':''});
  if(!v)return;
  await rpc('oz_ask_question',{p_product:pid,p_question:v.q});
  toast('Sorun üreticiye iletildi. Cevaplanınca burada görünecek.');
}

/* ====================== Dünya kabuğu: üst çubuk, gezinme ====================== */
var NAV=[],SCR=0;
function alive(t){return t===SCR&&!!D.getElementById('ozRoot')}
function paint(html){var r=D.getElementById('ozRoot');if(r)r.innerHTML=html}
function cur(){return NAV[NAV.length-1]||{k:'home',a:{}}}
function go(k,a,replace){if(replace&&NAV.length)NAV.pop();NAV.push({k:k,a:a||{}});draw()}
function back(){if(NAV.length>1){NAV.pop();draw()}else exitWorld()}
/* K27 ön başvuru kipi (body.ozPre): pazar kapalıyken yalnızca satıcı ekranları */
var PRE_OK={seller:1,sellerApply:1,sellerProduct:1};
function isPre(){return D.body.classList.contains('ozPre')}
function draw(){
  var t=cur();if(isPre()&&!PRE_OK[t.k]){NAV=[{k:'seller',a:{}}];t=cur()}
  SCR++;closeSheet();ensureWorld();
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
function leaveWorld(){D.body.classList.remove('ozWorld','ozPre');['ozTop','ozStrip'].forEach(function(id){var e=D.getElementById(id);if(e)e.remove()});closeSheet()}
function exitWorld(){NAV=[];leaveWorld();try{showHome()}catch(e){}}
function topSync(){
  var s=S();var strip=D.getElementById('ozStrip');
  var pre=isPre();var pv=!pre&&!!(s.is_admin&&s.market_enabled===false);
  if(strip){strip.hidden=!(pv||pre);strip.textContent=pre?'Ön başvuru · Özüne Dön henüz açılmadı':'Yönetici önizleme · Pazar herkese kapalı'}D.body.classList.toggle('ozPreview',pv||pre);
  cartBadge();
  if(logged()&&ST.notif)bellBadge(ST.notif.filter(unread).length);else if(!logged())bellBadge(0);
}
(function(){var a=D.getElementById('app');if(!a||!window.MutationObserver)return;
  new MutationObserver(function(){if(!D.getElementById('ozRoot')&&D.body.classList.contains('ozWorld')){NAV=[];leaveWorld()}}).observe(a,{childList:true});})();

/* Giriş noktası: pazar kapalıysa false döner (ana sayfa hmSoon gösterir). Yönetici için market_open her zaman true. */
/* K27: pazar kapalı + satıcı başvurusu açık → ön başvuru alt sayfası (true döner). Ayar okunamazsa false (eski "Yakında" bildirimi). */
OZ.tryEnter=async function(){
  var s=null;try{s=await loadSettings(true)}catch(e){return false}
  if(!s||!s.market_open){
    if(s&&s.seller_signup_enabled===true){preSheet(s);return true}
    return false;
  }
  D.body.classList.remove('ozPre');
  NAV=[{k:'home',a:{}}];draw();
  if(logged())loadNotifs().catch(function(){});
  return true;
};

function preSheet(s){
  var has=!!(s&&s.my_seller);
  sheet('Özüne Dön çok yakında','<p class="ozP">Doğal ürün üreticisi misin? Şimdiden ön başvurunu yap, mağazan hazır olsun.</p><div class="ozRow2"><button type="button" class="ozBtn" data-a="sheetClose">Kapat</button><button type="button" class="ozBtn pri" data-a="preApply">'+(has?'Satıcı panelim':'Ön başvuru yap')+'</button></div>',{noFocus:true});
}
function enterPre(){
  var s=S();if(s.market_open){D.body.classList.remove('ozPre');NAV=[{k:'home',a:{}}];draw();return}
  if(s.seller_signup_enabled!==true&&!s.my_seller){toast('Satıcı başvuruları şu anda kapalı.');return}
  D.body.classList.add('ozPre');NAV=[{k:'seller',a:{}}];draw();
}
function preGo(){loadSettings(true).then(enterPre).catch(function(e){fail(e)})}
preGo.outside=true;

/* ====================== Tıklama yönlendirici (data-a) ====================== */
ACT_EXTRA({
  sheetClose:function(){closeSheet()},
  back:function(){back()},
  nav:function(b){var k=b.dataset.k;var a={};if(b.dataset.id)a.id=b.dataset.id;if(b.dataset.q)a.q=b.dataset.q;if(b.dataset.cat)a.cat=b.dataset.cat;if(b.dataset.tab)a.tab=b.dataset.tab;if(k==='home'){NAV=[];}go(k,a)},
  redraw:function(){draw()},
  login:function(){needLogin(function(){draw()})},
  bell:function(){openNotifs()},
  exit:function(){exitWorld()},
  preApply:function(){closeSheet();if(!logged()){needLogin(preGo);return}preGo()}
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

/* ====================== Yükleme yardımcıları (depolama) ====================== */
async function compressImage(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Yalnızca JPG, PNG veya WEBP fotoğraf yükleyebilirsin.');
  var img=await new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i)};i.onerror=function(){rej(new Error('Fotoğraf okunamadı.'))};i.src=URL.createObjectURL(file)});
  var sc=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
  var w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));
  var cv=D.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(img,0,0,w,h);try{URL.revokeObjectURL(img.src)}catch(e){}
  var blob=await new Promise(function(r){cv.toBlob(function(b){r(b)},'image/jpeg',0.82)});
  if(!blob)throw new Error('Fotoğraf hazırlanamadı.');
  if(blob.size>5*1024*1024)throw new Error('Fotoğraf küçültüldükten sonra da 5 MB\'tan büyük. Başka bir fotoğraf dene.');
  return blob;
}
async function storagePut(bucket,path,body,type){
  var tk=await token();if(!tk){var e=new Error('Giriş yapmalısın.');e.auth=true;throw e}
  var r=await fetch(sbUrl()+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{Authorization:'Bearer '+tk,apikey:sbKey(),'Content-Type':type,'x-upsert':'false'},body:body});
  if(!r.ok){var m='';try{var j=await r.json();m=j.message||j.error||''}catch(e){}throw new Error(m||'Yükleme başarısız.')}
}
function publicUrl(bucket,path){return sbUrl()+'/storage/v1/object/public/'+bucket+'/'+path}
/* oz-images/<seller_id|cat>/<uuid>.jpg → tam public URL */
async function uploadImage(prefix,file){var b=await compressImage(file);var path=prefix+'/'+uuid()+'.jpg';await storagePut('oz-images',path,b,'image/jpeg');return publicUrl('oz-images',path)}
async function uploadDoc(sellerId,file){
  var ok={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
  if(!ok[file.type])throw new Error('Belge JPG, PNG, WEBP veya PDF olmalı.');
  if(file.size>10*1024*1024)throw new Error('Belge en fazla 10 MB olabilir.');
  var path=sellerId+'/'+uuid()+'.'+ok[file.type];await storagePut('oz-docs',path,file,file.type);return path;
}
async function signedUrl(bucket,path){
  var tk=await token();var r=await fetch(sbUrl()+'/storage/v1/object/sign/'+bucket+'/'+String(path).split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{Authorization:'Bearer '+tk,apikey:sbKey(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});
  var j=await r.json().catch(function(){return {}});if(!r.ok||!j.signedURL)throw new Error(j.message||'Belge açılamadı.');
  return /^https?:/.test(j.signedURL)?j.signedURL:sbUrl()+'/storage/v1'+j.signedURL;
}
function fileBtn(label,act,accept,extra){return '<label class="ozFile">'+E(label)+'<input type="file" accept="'+accept+'" data-file="'+act+'"'+(extra||'')+'></label>'}
D.addEventListener('change',function(e){
  var el=e.target;if(!el||el.type!=='file'||!el.dataset||!el.dataset.file||!el.closest('#ozRoot,.ozOv,.ozAdm'))return;
  var f=el.files&&el.files[0];if(!f)return;var fn=FILES[el.dataset.file];if(!fn)return;
  var lab=el.closest('label');if(lab)lab.setAttribute('aria-busy','true');
  Promise.resolve().then(function(){return fn(f,el)}).catch(fail).then(function(){el.value='';if(lab)lab.removeAttribute('aria-busy')});
});
var FILES={};

/* ====================== Satıcı paneli ====================== */
var DOC_T={identity:'Kimlik belgesi',tax_plate:'Vergi levhası',food_registration:'Gıda işletme kayıt/onay belgesi',producer_cert:'Çiftçi / üretici belgesi',organic_cert:'Organik sertifika',other:'Diğer belge'};
var DOC_ST={pending:['İnceleniyor','warn'],in_review:['İnceleniyor','warn'],approved:['Onaylandı','ok'],rejected:['Reddedildi','bad']};
var PROD_ST={published:['Yayında','ok'],draft:['Taslak',''],pending:['İncelemede','warn'],in_review:['İncelemede','warn'],active:['Yayında','ok'],approved:['Yayında','ok'],rejected:['Reddedildi','bad'],hidden:['Gizli','']};
var CARRIERS=['Yurtiçi Kargo','Aras Kargo','MNG Kargo','PTT Kargo','Sürat Kargo','HepsiJet','Kolay Gelsin','UPS','DHL'];
function sellerId(){var ms=S().my_seller;return (ms&&ms.id)||SELLER.id||null}
async function sellerRow(force){
  var id=sellerId();if(!id)return null;
  if(SELLER.data&&!force&&SELLER.data.id===id)return SELLER.data;
  var r=arr(await get('oz_sellers?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1'))[0]||null;SELLER.data=r;return r;
}
function sellerTabs(tab){
  var T=[['ozet','Özet'],['urunler','Ürünlerim'],['siparisler','Siparişler'],['sorular','Sorular ve yorumlar'],['kazanc','Kazançlarım'],['magaza','Mağaza ayarları']];
  return '<div class="ozTabs" role="tablist" aria-label="Satıcı paneli">'+T.map(function(t){return '<button type="button" role="tab" class="ozChip'+(t[0]===tab?' on':'')+'" aria-selected="'+(t[0]===tab)+'" data-a="sTab" data-tab="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>';
}
function statusCard(d){
  var st=d.status;var x=SELLER_ST[st]||[st,''];
  var txt={draft:'Başvurun taslak durumunda. Bilgilerini, belgelerini ve kargo tablonu tamamlayıp incelemeye gönder.',pending:'Başvurun inceleniyor. Sonuçlandığında bildirim alacaksın.',in_review:'Başvurun inceleniyor. Sonuçlandığında bildirim alacaksın.',approved:'Mağazan onaylı. Ürünlerini ekleyip incelemeye gönderebilirsin.',active:'Mağazan onaylı.',rejected:'Başvurun reddedildi. Gerekçeyi okuyup bilgilerini düzelterek yeniden gönderebilirsin.',suspended:'Mağazan askıya alındı. Bu sürede ürünlerin satışta görünmez.'}[st]||'';
  return '<div class="ozCard"><div class="ozRow2" style="justify-content:space-between"><b>'+E(d.display_name||'Mağazam')+'</b><span class="ozTag '+x[1]+'">'+E(x[0])+'</span></div><p class="ozMuted" style="margin:8px 0 0">'+E(txt)+'</p>'+(d.status_reason&&(st==='rejected'||st==='suspended')?'<div class="ozWarn"><b>Gerekçe:</b> '+E(d.status_reason)+'</div>':'')+'</div>';
}
VIEWS_EXTRA({
  seller:async function(a,t){
    if(!logged()){paint(pageHead('Satıcı paneli')+loginWall('Satıcı olmak veya mağazanı yönetmek için giriş yap.'));return}
    paint(pageHead('Satıcı paneli')+skel(3,'line'));
    await loadSettings(true);
    var d=await rpc('oz_seller_dashboard',{});if(!alive(t))return;
    d=d||{};SELLER.dash=d;
    if(!d.has_seller){
      if(!S().seller_signup_enabled){paint(pageHead('Satıcı ol')+empty(ico('store',36),'Satıcı başvuruları şu anda kapalı','Başvurular açıldığında burada başlatabilirsin.'));return}
      paint(pageHead('Satıcı ol','Doğal ürünlerini Türkiye\'nin dört bir yanına kargo ile sat.')+
        '<div class="ozCard"><h3>Başvuru adımları</h3><ol style="margin:0;padding-left:20px;line-height:1.8"><li>Mağaza ve vergi bilgileri</li><li>Belgeler (kimlik, vergi levhası, gıda kayıt belgesi…)</li><li>Kargo ücret tablosu</li><li>Satıcı sözleşmesi onayı ve gönderim</li></ol><p class="ozMuted" style="margin:10px 0 0">Başvurun yönetici tarafından incelenir; onaylanınca ürün ekleyebilirsin.</p></div>'+
        '<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerApply" data-tab="1">Başvuruya başla</button>');return;
    }
    var st=d.status;
    if(st==='draft'||st==='rejected'){paint(pageHead('Satıcı paneli')+statusCard(d)+'<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerApply" data-tab="1">'+(st==='draft'?'Başvuruyu tamamla':'Başvuruyu düzenle ve yeniden gönder')+'</button>');return}
    if(st==='pending'||st==='in_review'){paint(pageHead('Satıcı paneli')+statusCard(d)+'<div class="ozList">'+row('box','Belgelerim','Yüklediğin belgeleri gör, eksikleri ekle','nav',{k:'sellerApply',tab:'2'})+'</div>');return}
    var tab=a.tab||'ozet';
    paint(pageHead(d.display_name||'Satıcı paneli')+(st==='suspended'?statusCard(d):'')+sellerTabs(tab)+'<div id="ozSP">'+skel(2,'line')+'</div>');
    var fn=SP[tab]||SP.ozet;await fn(d,t);
  },
  sellerApply:async function(a,t){
    if(!logged()){paint(pageHead('Satıcı başvurusu')+loginWall());return}
    var step=+(a.tab||1);
    paint(pageHead('Satıcı başvurusu')+skel(3,'line'));
    await loadSettings(true);
    var s=await sellerRow(true);if(!alive(t))return;
    if(!s&&step>1)step=1;
    var bar='<div class="ozStepper" aria-label="Adım '+step+' / 4">'+[1,2,3,4].map(function(i){return '<span class="'+(i<=step?'on':'')+'"></span>'}).join('')+'</div>';
    var title=['','1. Mağaza ve vergi bilgileri','2. Belgeler','3. Kargo ücret tablosu','4. Sözleşme ve gönderim'][step];
    if(step===1){paint(pageHead('Satıcı başvurusu',title)+bar+storeForm(s||{},true));return}
    if(step===2){
      var docs=arr(await get('oz_seller_documents?select=*&seller_id=eq.'+encodeURIComponent(s.id)+'&order=created_at.desc'));if(!alive(t))return;
      SELLER.docs=docs;
      paint(pageHead('Satıcı başvurusu',title)+bar+'<div class="ozCard"><p class="ozMuted" style="margin:0 0 10px">Belgeler yalnızca yönetici tarafından görülür. JPG, PNG, WEBP veya PDF; en fazla 10 MB.</p><label class="ozMuted" for="ozDocT">Belge türü</label><select class="ozSel" id="ozDocT">'+Object.keys(DOC_T).map(function(k){return '<option value="'+k+'">'+E(DOC_T[k])+'</option>'}).join('')+'</select><div style="margin-top:10px">'+fileBtn('Belge seç ve yükle','doc','image/jpeg,image/png,image/webp,application/pdf')+'</div></div>'+
        (docs.length?'<div class="ozList">'+docs.map(function(x){return '<div class="ozCard" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+E(DOC_T[x.doc_type||x.type]||x.doc_type||x.type)+'</b>'+stTag(DOC_ST,x.status)+'</div><p class="ozMuted" style="margin:4px 0 8px">'+E(x.file_name||x.name||'')+' · '+E(fmtDay(x.created_at))+(x.reject_reason||x.reason?'<br>Gerekçe: '+E(x.reject_reason||x.reason):'')+'</p><button type="button" class="ozBtn sm ghost" data-a="docDel" data-id="'+E(x.id)+'">Sil</button></div>'}).join('')+'</div>':empty(ico('box',30),'Henüz belge yüklemedin',''))+
        '<div class="ozRow2" style="margin-top:12px"><button type="button" class="ozBtn" data-a="nav" data-k="sellerApply" data-tab="1">Geri</button><button type="button" class="ozBtn pri" data-a="nav" data-k="sellerApply" data-tab="3">Devam</button></div>');return;
    }
    if(step===3){
      var rates=arr(await get('oz_shipping_rates?select=*&seller_id=eq.'+encodeURIComponent(s.id)+'&order=max_weight_g.asc'));if(!alive(t))return;
      SELLER.rates=rates.length?rates:[{max_weight_g:2000,fee_kurus:0}];
      paint(pageHead('Satıcı başvurusu',title)+bar+ratesEditor()+'<div class="ozRow2" style="margin-top:12px"><button type="button" class="ozBtn" data-a="nav" data-k="sellerApply" data-tab="2">Geri</button><button type="button" class="ozBtn pri" data-a="ratesSave" data-next="4">Kaydet ve devam</button></div>');return;
    }
    var docs4=arr(await get('oz_seller_documents?select=id&seller_id=eq.'+encodeURIComponent(s.id)));
    var rates4=arr(await get('oz_shipping_rates?select=id&seller_id=eq.'+encodeURIComponent(s.id)));if(!alive(t))return;
    paint(pageHead('Satıcı başvurusu',title)+bar+'<div class="ozCard"><h3>Kontrol</h3><div class="ozLine"><span class="m">Mağaza bilgileri</span><span>✓</span></div><div class="ozLine"><span class="m">Yüklenen belge</span><span>'+docs4.length+'</span></div><div class="ozLine"><span class="m">Kargo ücret basamağı</span><span>'+rates4.length+'</span></div></div>'+
      (!docs4.length?'<div class="ozWarn">En az bir belge yüklemen gerekiyor.</div>':'')+(!rates4.length?'<div class="ozWarn">Kargo ücret tablosunu doldurman gerekiyor.</div>':'')+
      '<label class="ozChk"><input type="checkbox" id="ozSTerms"><span>Satıcı sözleşmesini okudum, onaylıyorum.</span></label><button type="button" class="ozLink" data-a="legal" data-t="oz_satici_sozlesmesi">Sözleşmeyi oku</button>'+
      '<div class="ozRow2" style="margin-top:12px"><button type="button" class="ozBtn" data-a="nav" data-k="sellerApply" data-tab="3">Geri</button><button type="button" class="ozBtn pri" data-a="sellerSubmit"'+(!docs4.length||!rates4.length?' disabled':'')+'>İncelemeye gönder</button></div>');
  },
  sellerProduct:async function(a,t){
    if(!logged()){paint(loginWall());return}
    paint(pageHead(a.id?'Ürünü düzenle':'Yeni ürün')+skel(3,'line'));
    var hd=null;try{hd=await homeData()}catch(e){}
    if(!hd||!arr(hd.categories).length){try{hd={categories:arr(await get('oz_categories?select=id,name&is_active=eq.true&parent_id=is.null&order=sort.asc'))}}catch(e){}}
    var p={},vs=[];
    if(a.id){p=arr(await get('oz_products?select=*&id=eq.'+encodeURIComponent(a.id)+'&limit=1'))[0]||{};vs=arr(await get('oz_variants?select=*&product_id=eq.'+encodeURIComponent(a.id)+'&order=sort.asc'))}
    if(!alive(t))return;
    if(!sellerId()){await loadSettings(true)}
    ST.pf={id:p.id||null,name:p.name||'',category_id:p.category_id||'',description:p.description||'',ingredients:p.ingredients||'',origin_city:p.origin_city||'',origin_note:p.origin_note||'',net_content:p.net_content||'',shelf_life_days:p.shelf_life_days==null?'':String(p.shelf_life_days),storage_info:p.storage_info||'',organic_cert:p.organic_cert||'',
      allergens:arr(p.allergens).slice(),images:arr(p.images).slice(),status:p.status||'draft',reason:p.status_reason||p.reject_reason||'',
      variants:(vs.length?vs:[{label:'',price_kurus:'',compare_at_kurus:'',stock:'',weight_g:'',sku:'',is_active:true}]).map(function(v){return {id:v.id||null,label:v.label||'',price:v.price_kurus===''||v.price_kurus==null?'':kurusToInput(v.price_kurus),compare:v.compare_at_kurus?kurusToInput(v.compare_at_kurus):'',stock:v.stock==null?'':String(v.stock),weight:v.weight_g==null?'':String(v.weight_g),sku:v.sku||'',active:v.is_active!==false}}),
      cats:arr(hd&&hd.categories)};
    drawProductForm();
  }
});
var SP={
  ozet:async function(d,t){
    var e=null;try{e=await rpc('oz_seller_earnings',{})}catch(x){}
    if(!alive(t))return;var o=d.orders||{},pr=d.products||{};
    function k(label,v,tab,hot){return '<button type="button" class="ozKpi'+(hot&&num(v)?' hot':'')+'" data-a="sTab" data-tab="'+tab+'"><small>'+E(label)+'</small><b>'+E(v)+'</b></button>'}
    var h='<div class="ozKpis">'+k('Yeni sipariş',num(o.new),'siparisler',1)+k('Hazırlanacak',num(o.accepted)+num(o.packed),'siparisler',1)+k('Açık iade',num(d.open_returns),'siparisler',1)+k('Düşük stok',num(d.low_stock),'urunler',1)+k('Cevapsız soru',num(d.open_questions),'sorular',1)+k('Yanıtsız yorum',num(d.unreplied_reviews),'sorular',1)+k('Yayındaki ürün',num(pr.published)+num(pr.active),'urunler')+k('İncelemedeki ürün',num(pr.pending)+num(pr.in_review),'urunler')+'</div>';
    if(e)h+='<div class="ozSecH"><h2>Kazanç</h2><button type="button" class="ozLink" data-a="sTab" data-tab="kazanc">Ayrıntı</button></div><div class="ozKpis"><div class="ozKpi"><small>Çekilebilir</small><b>'+TL(e.available_kurus)+'</b></div><div class="ozKpi"><small>Bekleme süresinde</small><b>'+TL(e.holding_kurus)+'</b></div></div>';
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h+'<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerProduct">Yeni ürün ekle</button>';
  },
  urunler:async function(d,t){
    var sid=sellerId();
    var ps=arr(await get('oz_products?select=*&seller_id=eq.'+encodeURIComponent(sid)+'&order=updated_at.desc'));
    var vs=ps.length?arr(await get('oz_variants?select=*&product_id=in.'+inList(ps.map(function(x){return x.id}))+'&order=sort.asc')):[];
    if(!alive(t))return;
    SELLER.products=ps;SELLER.variants=vs;
    var h='<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerProduct" style="margin-bottom:12px">Yeni ürün ekle</button>';
    if(!ps.length){h+=empty(ico('box',36),'Henüz ürünün yok','İlk ürününü ekleyip incelemeye gönder.');}
    else h+='<div class="ozList">'+ps.map(function(p){
      var pv=vs.filter(function(v){return v.product_id===p.id});var stock=pv.reduce(function(n,v){return n+num(v.stock)},0);
      var st=p.is_hidden?'hidden':p.status;var low=pv.some(function(v){return v.is_active!==false&&num(v.stock)<=3});
      return '<div class="ozCard" style="margin:0"><div class="ozCI" style="border:0;padding:0">'+pic(arr(p.images)[0],p.name)+'<div class="tx"><b>'+E(p.name||'Adsız ürün')+'</b><small>'+pv.length+' seçenek · '+stock+' stok'+(low?' · <span style="color:#F7D24A">düşük stok</span>':'')+'</small><div style="margin-top:4px">'+stTag(PROD_ST,st)+'</div></div></div>'+
        ((p.status_reason||p.reject_reason)&&p.status==='rejected'?'<div class="ozWarn">Gerekçe: '+E(p.status_reason||p.reject_reason)+'</div>':'')+
        '<div class="ozRow2" style="margin-top:10px"><button type="button" class="ozBtn sm" data-a="nav" data-k="sellerProduct" data-id="'+E(p.id)+'">Düzenle</button>'+(pv.length?'<button type="button" class="ozBtn sm" data-a="stockBox" data-id="'+E(p.id)+'">Stok</button>':'')+
        (p.status==='draft'||p.status==='rejected'?'<button type="button" class="ozBtn sm pri" data-a="prodSubmit" data-id="'+E(p.id)+'">İncelemeye gönder</button>':'')+
        (p.status==='published'||p.status==='active'||p.status==='approved'?'<button type="button" class="ozBtn sm" data-a="prodHide" data-id="'+E(p.id)+'" data-h="1">Gizle</button>':'')+(p.status==='hidden'||p.is_hidden?'<button type="button" class="ozBtn sm" data-a="prodHide" data-id="'+E(p.id)+'" data-h="0">Göster</button>':'')+
        '<button type="button" class="ozBtn sm ghost" data-a="prodDel" data-id="'+E(p.id)+'">Sil</button></div></div>'}).join('')+'</div>';
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  siparisler:async function(d,t){
    var c=cur();var stt=c.a.st===undefined?'new':c.a.st;
    var T=[['new','Yeni'],['accepted','Onaylandı'],['packed','Hazırlandı'],['shipped','Kargoda'],['delivered','Teslim edildi'],['cancelled','İptal'],['','Tümü']];
    var b=D.getElementById('ozSP');if(b)b.innerHTML='<div class="ozTabs" role="tablist" aria-label="Sipariş durumu">'+T.map(function(x){return '<button type="button" role="tab" class="ozChip'+(x[0]===stt?' on':'')+'" aria-selected="'+(x[0]===stt)+'" data-a="soTab" data-st="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div><div id="ozSO">'+skel(2,'line')+'</div>';
    var l=arr(await rpc('oz_seller_orders',{p_status:stt||null,p_limit:50,p_offset:0}));
    if(!alive(t))return;SELLER.orders=l;
    var box=D.getElementById('ozSO');if(!box)return;
    box.innerHTML=l.length?'<div class="ozList">'+l.map(sellerOrderCard).join('')+'</div>':empty(ico('box',32),'Bu durumda sipariş yok','');
  },
  sorular:async function(d,t){
    var sid=sellerId();
    var ps=arr(await get('oz_products?select=id,name&seller_id=eq.'+encodeURIComponent(sid)));
    var ids=ps.map(function(x){return x.id});var nm={};ps.forEach(function(x){nm[x.id]=x.name});
    var qsl=[],rvl=[];
    if(ids.length){var r=await Promise.all([get('oz_questions?select=id,product_id,question,answer,created_at&product_id=in.'+inList(ids)+'&order=created_at.desc&limit=100'),get('oz_reviews?select=id,product_id,rating,comment,seller_reply,created_at&product_id=in.'+inList(ids)+'&order=created_at.desc&limit=100')]);qsl=arr(r[0]);rvl=arr(r[1])}
    if(!alive(t))return;
    qsl.sort(function(a,b){return (a.answer?1:0)-(b.answer?1:0)});rvl.sort(function(a,b){return (a.seller_reply?1:0)-(b.seller_reply?1:0)});
    var h='<div class="ozSecH"><h2>Sorular</h2><span class="ozMuted">'+qsl.filter(function(x){return !x.answer}).length+' cevapsız</span></div>'+
      (qsl.length?'<div class="ozList">'+qsl.map(function(q){return '<div class="ozCard" style="margin:0"><small class="ozMuted">'+E(nm[q.product_id]||'')+' · '+E(fmtDay(q.created_at))+'</small><p style="margin:4px 0 8px"><b>'+E(q.question)+'</b></p>'+(q.answer?'<div class="ozReply">'+E(q.answer)+'</div>':'<button type="button" class="ozBtn sm pri" data-a="qAnswer" data-id="'+E(q.id)+'">Cevapla</button>')+'</div>'}).join('')+'</div>':'<p class="ozMuted">Soru yok.</p>')+
      '<div class="ozSecH"><h2>Değerlendirmeler</h2><span class="ozMuted">'+rvl.filter(function(x){return !x.seller_reply}).length+' yanıtsız</span></div>'+
      (rvl.length?'<div class="ozList">'+rvl.map(function(r){return '<div class="ozCard" style="margin:0"><small class="ozMuted">'+E(nm[r.product_id]||'')+' · '+E(fmtDay(r.created_at))+'</small><div style="margin:4px 0">'+stars(r.rating)+'</div>'+(r.comment?'<p style="margin:0 0 8px">'+E(r.comment)+'</p>':'')+(r.seller_reply?'<div class="ozReply">'+E(r.seller_reply)+'</div>':'<button type="button" class="ozBtn sm" data-a="rReply" data-id="'+E(r.id)+'">Yanıtla</button>')+'</div>'}).join('')+'</div>':'<p class="ozMuted">Değerlendirme yok.</p>');
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  kazanc:async function(d,t){
    var sid=sellerId();
    var r=await Promise.all([rpc('oz_seller_earnings',{}),get('oz_payouts?select=*&seller_id=eq.'+encodeURIComponent(sid)+'&order=created_at.desc&limit=50')]);
    if(!alive(t))return;var e=r[0]||{};var po=arr(r[1]);
    var PST={pending:['Hazırlanıyor','warn'],processing:['İşleniyor','warn'],paid:['Ödendi','ok'],failed:['Başarısız','bad']};
    var h='<div class="ozKpis"><div class="ozKpi"><small>Süren siparişler</small><b>'+TL(e.in_progress_kurus)+'</b></div><div class="ozKpi"><small>Bekleme süresinde</small><b>'+TL(e.holding_kurus)+'</b></div><div class="ozKpi hot"><small>Ödemeye hazır</small><b>'+TL(e.available_kurus)+'</b></div><div class="ozKpi"><small>Ödeme sürecinde</small><b>'+TL(e.payout_pending_kurus)+'</b></div><div class="ozKpi"><small>Ödenen toplam</small><b>'+TL(e.paid_kurus)+'</b></div></div>'+
      (num(e.hold_days)?'<p class="ozMuted">Teslim edilen siparişlerin tutarı, iade süresi için '+num(e.hold_days)+' gün bekletildikten sonra ödemeye hazır olur. Ödemeler yönetici tarafından yapılır.</p>':'')+
      '<div class="ozSecH"><h2>Ödemeler</h2></div>'+(po.length?'<div class="ozList">'+po.map(function(x){return '<div class="ozCard" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+TL(x.amount_kurus)+'</b>'+stTag(PST,x.status)+'</div><p class="ozMuted" style="margin:4px 0 0">'+E(fmtDay(x.created_at))+((x.reference||x.bank_reference)?' · Ref: '+E(x.reference||x.bank_reference):'')+(x.paid_at?' · Ödendi: '+E(fmtDay(x.paid_at)):'')+'</p></div>'}).join('')+'</div>':'<p class="ozMuted">Henüz ödeme kaydı yok.</p>');
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  magaza:async function(d,t){
    var s=await sellerRow(true);var rates=arr(await get('oz_shipping_rates?select=*&seller_id=eq.'+encodeURIComponent(sellerId())+'&order=max_weight_g.asc'));
    if(!alive(t))return;SELLER.rates=rates.length?rates:[{max_weight_g:2000,fee_kurus:0}];
    var b=D.getElementById('ozSP');if(b)b.innerHTML=storeForm(s||{},false)+'<div class="ozSecH"><h2>Kargo ücret tablosu</h2></div>'+ratesEditor()+'<button type="button" class="ozBtn wide" data-a="ratesSave" style="margin-top:10px">Kargo tablosunu kaydet</button>';
  }
};
function storeForm(s,wizard){
  s=Object.assign({},s,SELLER.img||{});
  function f(id,label,v,opt){opt=opt||{};return '<label for="ozS_'+id+'">'+E(label)+'</label><input class="ozIn" id="ozS_'+id+'" value="'+E(v==null?'':v)+'"'+(opt.im?' inputmode="'+opt.im+'"':'')+(opt.type?' type="'+opt.type+'"':'')+(opt.ac?' autocomplete="'+opt.ac+'"':'')+(opt.ph?' placeholder="'+E(opt.ph)+'"':'')+' maxlength="'+(opt.max||120)+'">'}
  var kind=s.kind||'person';var lock=sellerLocked(s);
  var imgs=s.id?'<div class="ozTwo" style="margin-top:12px"><div><span class="ozMuted">Logo</span>'+(s.logo_url?pic(s.logo_url,'Logo','')+'':'')+fileBtn(s.logo_url?'Logoyu değiştir':'Logo yükle','logo','image/jpeg,image/png,image/webp')+'</div><div><span class="ozMuted">Kapak fotoğrafı</span>'+(s.cover_url?pic(s.cover_url,'Kapak',''):'')+fileBtn(s.cover_url?'Kapağı değiştir':'Kapak yükle','cover','image/jpeg,image/png,image/webp')+'</div></div>':'<p class="ozHint">Logo ve kapak fotoğrafını bu adımı kaydettikten sonra ekleyebilirsin.</p>';
  var legal=lock?'<div class="ozLock"><dl class="ozKV"><dt>Satıcı türü</dt><dd>'+(kind==='business'?'İşletme':'Bireysel üretici')+'</dd><dt>Ad soyad / ticari unvan</dt><dd>'+E(s.legal_name||'—')+'</dd><dt>TCKN / Vergi no</dt><dd>'+E(s.tax_no||'—')+'</dd></dl><p class="ozHint">Değiştirmek için destekle iletişime geç.</p></div>'+f('display_name','Mağaza adı (alıcılar görür)',s.display_name,{max:60})+f('tax_office','Vergi dairesi',s.tax_office,{max:60}):
    '<fieldset style="border:0;padding:0;margin:0"><legend class="ozMuted">Satıcı türü</legend>'+
    '<label class="ozPick'+(kind==='person'?' on':'')+'"><input type="radio" name="ozKind" value="person"'+(kind==='person'?' checked':'')+'><span class="tx"><b>Bireysel üretici</b><small>Şahıs olarak satış (çiftçi, ev üreticisi)</small></span></label>'+
    '<label class="ozPick'+(kind==='business'?' on':'')+'"><input type="radio" name="ozKind" value="business"'+(kind==='business'?' checked':'')+'><span class="tx"><b>İşletme</b><small>Şirket veya şahıs işletmesi</small></span></label></fieldset>'+
    f('display_name','Mağaza adı (alıcılar görür)',s.display_name,{max:60})+f('legal_name','Ad soyad / ticari unvan',s.legal_name,{max:120})+
    '<div class="ozTwo"><div>'+f('tax_no','TCKN / Vergi no',s.tax_no,{im:'numeric',max:11})+'</div><div>'+f('tax_office','Vergi dairesi',s.tax_office,{max:60})+'</div></div>';
  /* IBAN yalnızca satıcının kendi formunda (oz_sellers, RLS: sahibi/yönetici); müşteri ekranlarında hiç kullanılmaz */
  var bank='<div class="ozBank"><b class="ozBankH">Ödeme hesabı</b>'+f('iban','IBAN',s.iban,{max:34,ac:'off',ph:'TR00 0000 0000 0000 0000 0000 00'})+f('iban_holder','Hesap sahibi adı',s.iban_holder,{max:160,ac:'off'})+'<p class="ozHint">Ödemeler bu hesaba yapılır. Hesap sahibi adı ünvanınla aynı olmalı.</p></div>';
  return '<div class="ozCard ozForm">'+legal+
    f('phone','Telefon',s.phone,{type:'tel',im:'tel',max:20})+bank+
    '<div class="ozTwo"><div>'+f('city','İl',s.city,{max:40})+'</div><div>'+f('district','İlçe',s.district,{max:60})+'</div></div>'+
    f('ship_from_city','Kargonun çıkacağı il',s.ship_from_city,{max:40})+
    '<label for="ozS_story">Hikâyen (alıcılar görür)</label><textarea class="ozTa" id="ozS_story" maxlength="2000" placeholder="Ürünlerini nasıl üretiyorsun?">'+E(s.story||'')+'</textarea>'+
    '<div class="ozTwo"><div>'+f('handling_days','Hazırlık süresi (iş günü)',s.handling_days==null?2:s.handling_days,{im:'numeric',max:2})+'</div><div>'+f('free_ship','Bu tutar ve üzeri kargo bedava (₺, boş = yok)',s.free_ship_over_kurus?kurusToInput(s.free_ship_over_kurus):'',{im:'decimal',max:10})+'</div></div>'+
    imgs+'<p class="ozErr" id="ozSErr" hidden></p><button type="button" class="ozBtn pri wide" data-a="storeSave" data-w="'+(wizard?'1':'')+'" style="margin-top:14px">'+(wizard?'Kaydet ve devam':'Mağaza bilgilerini kaydet')+'</button></div>';
}
/* Onaylı hesapta tür, ünvan ve vergi no sunucuda kilitli (PF_STATE) — formda salt okunur */
function sellerLocked(s){return !!(s&&s.id&&s.status==='approved')}
function ibanClean(v){return String(v||'').replace(/\s+/g,'').toUpperCase()}
function ratesEditor(){
  return '<div class="ozCard" id="ozRates"><p class="ozMuted" style="margin:0 0 10px">Paketin ağırlığına göre kargo ücreti. Her satır "bu ağırlığa kadar" geçerlidir.</p>'+
    SELLER.rates.map(function(r,i){return '<div class="ozRate"><div><label class="ozMuted" for="ozRw'+i+'">En fazla (kg)</label><input class="ozIn" id="ozRw'+i+'" data-rw inputmode="decimal" value="'+E(r.max_weight_g?NF1.format(num(r.max_weight_g)/1000):'')+'"></div><div><label class="ozMuted" for="ozRf'+i+'">Ücret (₺)</label><input class="ozIn" id="ozRf'+i+'" data-rf inputmode="decimal" value="'+E(r.fee_kurus===''||r.fee_kurus==null?'':kurusToInput(r.fee_kurus))+'"></div><button type="button" class="ozX" data-a="rateDel" data-i="'+i+'" aria-label="Satırı sil"'+(SELLER.rates.length<2?' disabled':'')+'>✕</button></div>'}).join('')+
    '<button type="button" class="ozBtn sm" data-a="rateAdd">Satır ekle</button><p class="ozErr" id="ozRErr" hidden></p></div>';
}
function readRates(){
  var ws=qa('#ozRates [data-rw]'),fs=qa('#ozRates [data-rf]');var out=[];
  for(var i=0;i<ws.length;i++){var kg=Number(String(ws[i].value).replace(',','.'));var fee=tlToKurus(fs[i].value);out.push({max_weight_g:isFinite(kg)&&kg>0?Math.round(kg*1000):NaN,fee_kurus:fee})}
  return out;
}
function sellerOrderCard(o){
  var its=arr(o.items);var sh=o.ship_to||{};var ret=o.return;
  var acts='';
  if(o.status==='new')acts+='<button type="button" class="ozBtn sm pri" data-a="soAct" data-act="accept" data-id="'+E(o.id)+'">Kabul et</button>';
  if(o.status==='accepted')acts+='<button type="button" class="ozBtn sm pri" data-a="soAct" data-act="pack" data-id="'+E(o.id)+'">Hazırlandı</button>';
  if(o.status==='packed'||o.status==='accepted')acts+='<button type="button" class="ozBtn sm'+(o.status==='packed'?' pri':'')+'" data-a="soShip" data-id="'+E(o.id)+'">Kargoya ver</button>';
  if(o.status==='new'||o.status==='accepted'||o.status==='packed')acts+='<button type="button" class="ozBtn sm bad" data-a="soCancel" data-id="'+E(o.id)+'">İptal et</button>';
  return '<div class="ozCard" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+E(o.order_no||'Sipariş')+'</b>'+stTag(ORDER_ST,o.status)+'</div><p class="ozMuted" style="margin:4px 0 8px">'+E(fmtDate(o.created_at))+' · '+TL(o.total_kurus)+'</p>'+
    its.map(function(it){return '<div class="ozLine"><span>'+num(it.qty)+' × '+E(it.name)+(it.label?' ('+E(it.label)+')':'')+'</span><span>'+TL(it.line_total_kurus||num(it.unit_price_kurus)*num(it.qty))+'</span></div>'}).join('')+
    '<div class="ozReply" style="margin-top:8px"><b>Teslimat:</b> '+E(sh.recipient||o.buyer_name||'')+(sh.phone?' · '+E(sh.phone):'')+'<br>'+E(addrText(sh))+(o.note?'<br><b>Not:</b> '+E(o.note):'')+'</div>'+
    (o.tracking_no?'<p class="ozMuted" style="margin:8px 0 0">'+E(o.carrier||'Kargo')+' · '+E(o.tracking_no)+'</p>':'')+
    (ret?'<div class="ozWarn"><b>İade:</b> '+stTag(RET_ST,ret.status)+' '+E(ret.reason||'')+(ret.details?' — '+E(ret.details):'')+(ret.status==='requested'?'<div class="ozRow2" style="margin-top:8px"><button type="button" class="ozBtn sm pri" data-a="retDecide" data-id="'+E(ret.id)+'" data-ok="1">İadeyi kabul et</button><button type="button" class="ozBtn sm bad" data-a="retDecide" data-id="'+E(ret.id)+'" data-ok="0">Reddet</button></div>':'')+'</div>':'')+
    (acts?'<div class="ozRow2" style="margin-top:10px">'+acts+'</div>':'')+'</div>';
}
function pfRead(){
  var pf=ST.pf;if(!pf)return;
  ['name','category_id','description','ingredients','origin_city','origin_note','net_content','shelf_life_days','storage_info','organic_cert'].forEach(function(k){var el=D.getElementById('ozP_'+k);if(el)pf[k]=el.value});
  qa('#ozVars .ozVarRow').forEach(function(r,i){var v=pf.variants[i];if(!v)return;['label','price','compare','stock','weight','sku'].forEach(function(k){var el=qs('[data-v="'+k+'"]',r);if(el)v[k]=el.value});var ac=qs('[data-v="active"]',r);if(ac)v.active=ac.checked});
}
function drawProductForm(){
  var pf=ST.pf;
  function f(id,label,opt){opt=opt||{};return '<label for="ozP_'+id+'">'+E(label)+'</label><input class="ozIn" id="ozP_'+id+'" value="'+E(pf[id])+'" maxlength="'+(opt.max||120)+'"'+(opt.im?' inputmode="'+opt.im+'"':'')+'>'}
  var TAMAX={description:4000,ingredients:1000,origin_note:500,storage_info:300};
  function ta(id,label,ph){return '<label for="ozP_'+id+'">'+E(label)+'</label><textarea class="ozTa" id="ozP_'+id+'" maxlength="'+(TAMAX[id]||1000)+'"'+(ph?' placeholder="'+E(ph)+'"':'')+'>'+E(pf[id])+'</textarea>'}
  var imgs='<div class="ozImgs">'+pf.images.map(function(u,i){return '<div class="ozImg">'+pic(u,'Fotoğraf '+(i+1))+'<div class="tools"><button type="button" data-a="imgMove" data-i="'+i+'" data-d="-1" aria-label="Sola taşı"'+(i===0?' disabled':'')+'>‹</button><button type="button" data-a="imgDel" data-i="'+i+'" aria-label="Fotoğrafı sil">✕</button><button type="button" data-a="imgMove" data-i="'+i+'" data-d="1" aria-label="Sağa taşı"'+(i===pf.images.length-1?' disabled':'')+'>›</button></div></div>'}).join('')+'</div>'+
    (pf.images.length<8?'<div style="margin-top:8px">'+fileBtn('Fotoğraf ekle','pimg','image/jpeg,image/png,image/webp')+'</div>':'')+'<p class="ozHint">İlk fotoğraf kapak olarak kullanılır. En fazla 8 fotoğraf.</p>';
  var vars=pf.variants.map(function(v,i){return '<div class="ozVarRow"><div class="ozTwo"><div><label>Seçenek adı</label><input class="ozIn" data-v="label" value="'+E(v.label)+'" placeholder="Örn. 1 L" maxlength="40"></div><div><label>Stok kodu (isteğe bağlı)</label><input class="ozIn" data-v="sku" value="'+E(v.sku)+'" maxlength="40"></div></div>'+
    '<div class="ozTwo"><div><label>Fiyat (₺)</label><input class="ozIn" data-v="price" inputmode="decimal" value="'+E(v.price)+'"></div><div><label>Eski fiyat (₺, isteğe bağlı)</label><input class="ozIn" data-v="compare" inputmode="decimal" value="'+E(v.compare)+'"></div></div>'+
    '<div class="ozTwo"><div><label>Stok (adet)</label><input class="ozIn" data-v="stock" inputmode="numeric" value="'+E(v.stock)+'"></div><div><label>Kargo ağırlığı (gram)</label><input class="ozIn" data-v="weight" inputmode="numeric" value="'+E(v.weight)+'"></div></div>'+
    '<div class="ozRow2" style="justify-content:space-between"><label class="ozChk" style="margin:0"><input type="checkbox" data-v="active"'+(v.active?' checked':'')+'><span>Satışta</span></label><button type="button" class="ozBtn sm ghost" data-a="varDel" data-i="'+i+'"'+(pf.variants.length<2?' disabled':'')+'>Seçeneği sil</button></div></div>'}).join('');
  var catOpts='<option value="">Kategori seç</option>'+pf.cats.map(function(c){return '<option value="'+E(c.id)+'"'+(String(c.id)===String(pf.category_id)?' selected':'')+'>'+E(c.name)+'</option>'}).join('');
  var st=PROD_ST[pf.status]||['Taslak',''];
  paint(pageHead(pf.id?'Ürünü düzenle':'Yeni ürün')+(pf.id?'<p style="margin:-6px 0 12px">'+stTag(PROD_ST,pf.status)+'</p>':'')+(pf.reason&&pf.status==='rejected'?'<div class="ozWarn">Gerekçe: '+E(pf.reason)+'</div>':'')+
    '<div class="ozCard"><h3>Fotoğraflar</h3>'+imgs+'</div>'+
    '<div class="ozCard ozForm"><h3>Ürün bilgileri</h3>'+f('name','Ürün adı',{max:120})+'<label for="ozP_category_id">Kategori</label><select class="ozSel" id="ozP_category_id">'+catOpts+'</select>'+
      ta('description','Açıklama','Ürünü, üretim şeklini ve tadını anlat')+
      '<div class="ozWarn">Sağlık beyanı uyarısı: "hastalığı önler, tedavi eder, bağışıklığı güçlendirir" gibi sağlık iddiaları yasal olarak yasaktır. Bu tür ifadeler içeren ürünler onaylanmaz.</div>'+
      ta('ingredients','İçindekiler','Örn. %100 süzme çiçek balı')+
      (pf.id?'<div class="ozReapp"><p class="ozHint">↻ Bu alanları değiştirirsen ürün yeniden onaya girer.</p>':'<div>')+f('net_content','Net miktar',{max:40})+
      '<div class="ozTwo"><div>'+f('origin_city','Menşe (il)',{max:40})+'</div><div>'+f('shelf_life_days','Raf ömrü (gün)',{im:'numeric',max:5})+'</div></div>'+
      ta('origin_note','Menşe notu','Örn. Ula köyündeki kendi bahçemizden')+ta('storage_info','Saklama koşulları','Örn. Serin ve kuru yerde saklayın')+f('organic_cert','Organik sertifika no (varsa)',{max:80})+
      '<fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="ozMuted" style="font-weight:700;font-size:13px">Alerjenler</legend><div class="ozWrap">'+Object.keys(ALG).map(function(k){var on=pf.allergens.indexOf(k)>=0;return '<button type="button" class="ozChip'+(on?' on':'')+'" data-a="algT" data-k="'+k+'" aria-pressed="'+on+'">'+E(ALG[k])+'</button>'}).join('')+'</div></fieldset></div></div>'+
    '<div class="ozCard" id="ozVars"><h3>Seçenekler, fiyat ve stok</h3>'+vars+'<button type="button" class="ozBtn sm" data-a="varAdd">Seçenek ekle</button></div>'+
    '<p class="ozErr" id="ozPErr" hidden></p><div class="ozRow2"><button type="button" class="ozBtn" data-a="prodSave">Kaydet</button><button type="button" class="ozBtn pri" data-a="prodSave" data-sub="1">Kaydet ve incelemeye gönder</button></div>');
}
function pfPayload(){
  var pf=ST.pf;pfRead();
  if(pf.name.trim().length<3)return 'Ürün adı en az 3 karakter olmalı.';
  if(!pf.category_id)return 'Kategori seç.';
  if(!pf.images.length)return 'En az bir fotoğraf ekle.';
  var vs=[];
  for(var i=0;i<pf.variants.length;i++){var v=pf.variants[i];var pr=tlToKurus(v.price),cm=v.compare?tlToKurus(v.compare):null,stk=v.stock===''?NaN:Number(v.stock),wg=v.weight===''?NaN:Number(v.weight);
    if(!v.label.trim())return (i+1)+'. seçeneğin adını yaz.';
    if(!(pr>0))return (i+1)+'. seçeneğin fiyatını yaz.';
    if(cm!==null&&!(cm>pr))return (i+1)+'. seçenekte eski fiyat, fiyattan yüksek olmalı (ya da boş bırak).';
    if(!(stk>=0)||Math.floor(stk)!==stk)return (i+1)+'. seçeneğin stok adedini yaz.';
    if(!(wg>0))return (i+1)+'. seçeneğin kargo ağırlığını gram olarak yaz.';
    var o={label:v.label.trim(),price_kurus:pr,compare_at_kurus:cm,stock:stk,weight_g:Math.round(wg),sku:v.sku.trim()||null,is_active:!!v.active,sort:i};if(v.id)o.id=v.id;vs.push(o)}
  var sl=pf.shelf_life_days===''?null:Number(pf.shelf_life_days);if(sl!==null&&!(sl>=1&&sl<=3650&&Math.floor(sl)===sl))return 'Raf ömrü 1-3650 gün arasında olmalı.';
  var p={name:pf.name.trim(),description:pf.description.trim()||null,ingredients:pf.ingredients.trim()||null,origin_city:pf.origin_city.trim()||null,origin_note:pf.origin_note.trim()||null,net_content:pf.net_content.trim()||null,shelf_life_days:sl,storage_info:pf.storage_info.trim()||null,allergens:pf.allergens.slice(),images:pf.images.slice(),organic_cert:pf.organic_cert.trim()||null,category_id:pf.category_id,variants:vs};
  if(pf.id)p.id=pf.id;return p;
}
async function saveStore(btn){
  var kindEl=qs('input[name=ozKind]:checked');var g=function(k){return val('ozS_'+k)};
  var lock=sellerLocked(SELLER.data);var iban=ibanClean(g('iban'));
  var err='';var hd=Number(g('handling_days'));var fs=g('free_ship')?tlToKurus(g('free_ship')):null;
  if(g('display_name').length<3)err='Mağaza adını yaz.';else if(!lock&&g('legal_name').length<3)err='Ad soyad veya ticari unvanı yaz.';
  else if(!lock&&!/^\d{10,11}$/.test(g('tax_no')))err='TCKN 11, vergi numarası 10 haneli olmalı.';
  else if(!/^TR\d{24}$/.test(iban))err='TR ile başlayan 26 karakterlik IBAN yaz.';
  else if(g('iban_holder').length<3)err='Hesap sahibi adını yaz.';
  else{var dg=g('phone').replace(/\D/g,'');if(dg.length<10||dg.length>13)err='Geçerli bir telefon numarası yaz.';else if(!g('city'))err='İl yaz.';else if(!g('ship_from_city'))err='Kargonun çıkacağı ili yaz.';else if(!(hd>=1&&hd<=14))err='Hazırlık süresi 1-14 iş günü olmalı.';else if(fs!==null&&!(fs>0))err='Kargo bedava tutarını doğru yaz ya da boş bırak.'}
  var pe=D.getElementById('ozSErr');if(err){if(pe){pe.textContent=err;pe.hidden=false}return}
  if(pe)pe.hidden=true;
  var s=Object.assign({},SELLER.data||{},SELLER.img||{});
  var p={display_name:g('display_name'),iban:iban,iban_holder:g('iban_holder'),tax_office:g('tax_office')||null,phone:g('phone'),city:g('city'),district:g('district')||null,ship_from_city:g('ship_from_city'),story:g('story')||null,logo_url:s.logo_url||null,cover_url:s.cover_url||null,handling_days:Math.round(hd),free_ship_over_kurus:fs};
  if(!lock){p.kind=kindEl?kindEl.value:'person';p.legal_name=g('legal_name');p.tax_no=g('tax_no')}
  await busy(btn,async function(){
    var r;try{r=await rpc('oz_seller_apply',{p:p})}catch(e){if(e&&e.auth)throw e;if(pe){pe.textContent=e.message;pe.hidden=false;try{pe.scrollIntoView({block:'center'})}catch(x){}}return}
    if(r&&r.seller_id)SELLER.id=r.seller_id;
    SELLER.img={};
    await loadSettings(true);SELLER.data=null;
    toast('Mağaza bilgileri kaydedildi');
    if(btn.dataset.w)go('sellerApply',{tab:'2'},true);else draw();
  });
}
ACT_EXTRA({
  sTab:function(b){var c=cur();if(c.k!=='seller'){go('seller',{tab:b.dataset.tab});return}c.a={tab:b.dataset.tab};draw()},
  soTab:function(b){var c=cur();c.a=Object.assign({},c.a,{tab:'siparisler',st:b.dataset.st});draw()},
  storeSave:function(b){return saveStore(b)},
  rateAdd:function(){SELLER.rates=readRates().map(function(r){return {max_weight_g:isFinite(r.max_weight_g)?r.max_weight_g:'',fee_kurus:isFinite(r.fee_kurus)?r.fee_kurus:''}});SELLER.rates.push({max_weight_g:'',fee_kurus:''});var el=D.getElementById('ozRates');if(el)el.outerHTML=ratesEditor()},
  rateDel:function(b){var rs=readRates().map(function(r){return {max_weight_g:isFinite(r.max_weight_g)?r.max_weight_g:'',fee_kurus:isFinite(r.fee_kurus)?r.fee_kurus:''}});rs.splice(+b.dataset.i,1);SELLER.rates=rs;var el=D.getElementById('ozRates');if(el)el.outerHTML=ratesEditor()},
  ratesSave:async function(b){
    var rs=readRates();var err='';
    rs.forEach(function(r,i){if(!err&&!(r.max_weight_g>0))err=(i+1)+'. satırda ağırlığı yaz.';if(!err&&!(r.fee_kurus>=0))err=(i+1)+'. satırda ücreti yaz.'});
    var ws=rs.map(function(r){return r.max_weight_g});if(!err&&new Set(ws).size!==ws.length)err='Aynı ağırlık iki kez yazılmış.';
    var pe=D.getElementById('ozRErr');if(err){if(pe){pe.textContent=err;pe.hidden=false}return}
    rs.sort(function(a,b){return a.max_weight_g-b.max_weight_g});
    await busy(b,async function(){await rpc('oz_seller_set_rates',{p:rs});toast('Kargo tablosu kaydedildi');if(b.dataset.next)go('sellerApply',{tab:b.dataset.next},true);else draw()});
  },
  docDel:async function(b){if(!await confirmBox('Belge silinsin mi?','Bu belge başvurundan kaldırılacak.','Sil',true))return;await rpc('oz_seller_delete_document',{p_id:b.dataset.id});toast('Belge silindi');draw()},
  sellerSubmit:async function(b){
    if(!checked('ozSTerms')){toast('Devam etmek için satıcı sözleşmesini onayla.');return}
    await busy(b,async function(){await rpc('oz_seller_submit',{});await loadSettings(true);toast('Başvurun incelemeye gönderildi');NAV=NAV.filter(function(x){return x.k!=='sellerApply'});go('seller',{},true)});
  },
  algT:function(b){pfRead();var pf=ST.pf;var k=b.dataset.k;var i=pf.allergens.indexOf(k);if(i>=0)pf.allergens.splice(i,1);else pf.allergens.push(k);b.classList.toggle('on',i<0);b.setAttribute('aria-pressed',String(i<0))},
  varAdd:function(){pfRead();ST.pf.variants.push({id:null,label:'',price:'',compare:'',stock:'',weight:'',sku:'',active:true});drawProductForm()},
  varDel:function(b){pfRead();ST.pf.variants.splice(+b.dataset.i,1);drawProductForm()},
  imgDel:function(b){pfRead();ST.pf.images.splice(+b.dataset.i,1);drawProductForm()},
  imgMove:function(b){pfRead();var im=ST.pf.images;var i=+b.dataset.i,j=i+num(b.dataset.d);if(j<0||j>=im.length)return;var x=im[i];im[i]=im[j];im[j]=x;drawProductForm()},
  prodSave:async function(b){
    var p=pfPayload();var pe=D.getElementById('ozPErr');
    if(typeof p==='string'){if(pe){pe.textContent=p;pe.hidden=false;pe.scrollIntoView({block:'center'})}return}
    if(pe)pe.hidden=true;
    await busy(b,async function(){
      var id=await rpc('oz_product_save',{p:p});id=typeof id==='string'?id:(id&&id.id)||ST.pf.id;ST.pf.id=id;
      if(b.dataset.sub){await rpc('oz_product_submit',{p_id:id});toast('Ürün incelemeye gönderildi')}else toast('Ürün kaydedildi');
      NAV.pop();var c=cur();if(c.k==='seller')c.a={tab:'urunler'};draw();
    });
  },
  prodSubmit:async function(b){await busy(b,async function(){await rpc('oz_product_submit',{p_id:b.dataset.id});toast('Ürün incelemeye gönderildi');draw()})},
  prodHide:async function(b){await busy(b,async function(){await rpc('oz_product_set_hidden',{p_id:b.dataset.id,p_hidden:b.dataset.h==='1'});toast(b.dataset.h==='1'?'Ürün gizlendi':'Ürün yeniden gösteriliyor');draw()})},
  prodDel:async function(b){if(!await confirmBox('Ürün silinsin mi?','Bu işlem geri alınamaz.','Sil',true))return;await rpc('oz_product_delete',{p_id:b.dataset.id});toast('Ürün silindi');draw()},
  stockBox:async function(b){
    var vs=arr(SELLER.variants).filter(function(v){return v.product_id===b.dataset.id});
    var v=await formBox('Stok güncelle',vs.map(function(x,i){return '<label for="ozSt'+i+'">'+E(x.label||'Seçenek')+'</label><input class="ozIn" id="ozSt'+i+'" data-f="'+E(x.id)+'" inputmode="numeric" value="'+num(x.stock)+'">'}).join(''),'Kaydet',function(v){for(var k in v){var n=Number(v[k]);if(!(n>=0)||Math.floor(n)!==n)return 'Stok 0 veya daha büyük tam sayı olmalı.'}return ''});
    if(!v)return;
    for(var i=0;i<vs.length;i++){var n=Number(v[vs[i].id]);if(n!==num(vs[i].stock))await rpc('oz_variant_set_stock',{p_variant:vs[i].id,p_stock:n})}
    toast('Stok güncellendi');draw();
  },
  soAct:async function(b){await busy(b,async function(){await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:b.dataset.act,p:{}});toast(b.dataset.act==='accept'?'Sipariş kabul edildi':'Sipariş hazırlandı olarak işaretlendi');draw()})},
  soShip:async function(b){
    var v=await formBox('Kargoya ver','<label for="ozShC">Kargo firması</label><input class="ozIn" id="ozShC" data-f="carrier" list="ozCarriers" maxlength="40"><datalist id="ozCarriers">'+CARRIERS.map(function(c){return '<option value="'+E(c)+'">'}).join('')+'</datalist><label for="ozShN">Takip numarası</label><input class="ozIn" id="ozShN" data-f="no" maxlength="60"><label for="ozShU">Takip bağlantısı (isteğe bağlı)</label><input class="ozIn" id="ozShU" data-f="url" type="url" inputmode="url" placeholder="https://" maxlength="300">','Kargoya verildi',function(v){if(v.carrier.length<2)return 'Kargo firmasını yaz.';if(v.no.length<3)return 'Takip numarasını yaz.';if(v.url&&!/^https?:\/\/\S+$/i.test(v.url))return 'Bağlantı https:// ile başlamalı.';return ''});
    if(!v)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'ship',p:{carrier:v.carrier,tracking_no:v.no,tracking_url:v.url||null}});toast('Sipariş kargoya verildi');draw();
  },
  soCancel:async function(b){
    var v=await formBox('Siparişi iptal et','<label for="ozScR">İptal gerekçesi (alıcı görür)</label><textarea class="ozTa" id="ozScR" data-f="r" maxlength="300"></textarea>','İptal et',function(v){return v.r.length<5?'İptal gerekçesini yaz.':''});
    if(!v)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'cancel',p:{reason:v.r}});toast('Sipariş iptal edildi');draw();
  },
  retDecide:async function(b){
    var ok=b.dataset.ok==='1';
    var v=await formBox(ok?'İadeyi kabul et':'İadeyi reddet','<label for="ozRdN">'+(ok?'Not (isteğe bağlı)':'Ret gerekçesi')+'</label><textarea class="ozTa" id="ozRdN" data-f="n" maxlength="500"></textarea>',ok?'Kabul et':'Reddet',function(v){return !ok&&v.n.length<5?'Ret gerekçesini yaz.':''});
    if(!v)return;await rpc('oz_decide_return',{p_return:b.dataset.id,p_approve:ok,p_note:v.n||null});toast(ok?'İade kabul edildi':'İade reddedildi');draw();
  },
  qAnswer:async function(b){var v=await formBox('Soruyu cevapla','<label for="ozQa">Cevabın (herkese açık)</label><textarea class="ozTa" id="ozQa" data-f="a" maxlength="1000"></textarea>','Gönder',function(v){return v.a.length<2?'Cevabını yaz.':''});if(!v)return;await rpc('oz_answer_question',{p_question:b.dataset.id,p_answer:v.a});toast('Cevabın yayınlandı');draw()},
  rReply:async function(b){var v=await formBox('Değerlendirmeyi yanıtla','<label for="ozRr">Yanıtın (herkese açık)</label><textarea class="ozTa" id="ozRr" data-f="a" maxlength="1000"></textarea>','Gönder',function(v){return v.a.length<2?'Yanıtını yaz.':''});if(!v)return;await rpc('oz_reply_review',{p_review:b.dataset.id,p_reply:v.a});toast('Yanıtın yayınlandı');draw()}
});
Object.assign(FILES,{
  doc:async function(f){var s=await sellerRow();if(!s)throw new Error('Önce mağaza bilgilerini kaydet.');var type=val('ozDocT')||'other';toast('Belge yükleniyor…');var path=await uploadDoc(s.id,f);await rpc('oz_seller_add_document',{p_type:type,p_path:path,p_name:f.name.slice(0,120),p_mime:f.type,p_size:f.size});toast('Belge yüklendi');draw()},
  pimg:async function(f){var sid=sellerId();if(!sid)throw new Error('Satıcı kaydın bulunamadı.');pfRead();toast('Fotoğraf yükleniyor…');var u=await uploadImage(sid,f);ST.pf.images.push(u);drawProductForm()},
  logo:async function(f){await storeImage(f,'logo_url')},
  cover:async function(f){await storeImage(f,'cover_url')}
});
async function storeImage(f,key){
  var s=await sellerRow();if(!s)throw new Error('Önce mağaza bilgilerini kaydet.');
  toast('Fotoğraf yükleniyor…');var u=await uploadImage(s.id,f);
  SELLER.img=SELLER.img||{};SELLER.img[key]=u;
  toast('Fotoğraf yüklendi. Kaydetmeyi unutma.');
  var c=cur();if(c.k==='seller'){var b=D.getElementById('ozSP');if(b){var rates=SELLER.rates;b.innerHTML=storeForm(s,false)+'<div class="ozSecH"><h2>Kargo ücret tablosu</h2></div>'+ratesEditor()+'<button type="button" class="ozBtn wide" data-a="ratesSave" style="margin-top:10px">Kargo tablosunu kaydet</button>';SELLER.rates=rates}}else draw();
}

/* ====================== Yönetici (PF.openAdmin → Özüne Dön sekmeleri) ====================== */
var ADM={key:null,el:null,f:{},detail:null};
function aEl(){var el=ADM.el&&ADM.el.isConnected?ADM.el:D.getElementById('pfxAdm');if(el)el.classList.add('ozAdm');return el}
function aPaint(h){var el=aEl();if(el)el.innerHTML=h}
function aLoading(){return '<p class="pfxMuted">Yükleniyor…</p>'}
function aErr(e){return '<div class="pfxCard"><b>İşlem tamamlanamadı</b><p class="pfxMuted">'+E(cleanMsg(e&&e.message||e))+'</p><button type="button" class="pfxBtn" data-a="aReload">Tekrar dene</button></div>'}
function aTag(map,s){var x=map[s]||[s||'—',''];return '<span class="ozTag '+x[1]+'">'+E(x[0])+'</span>'}
var KPI_L={sellers_pending:'Onay bekleyen satıcı',sellers_active:'Onaylı satıcı',products_pending:'Onay bekleyen ürün',products_active:'Yayındaki ürün',orders_open:'Açık sipariş',orders_today:'Bugünkü sipariş',returns_open:'Açık iade',payouts_due_kurus:'Ödenecek tutar',gmv_kurus:'Toplam satış',documents_pending:'Bekleyen belge',questions_open:'Cevapsız soru',auto_cancelled:'Otomatik iptal edilen sipariş',sellers_approved:'Onaylı satıcı',products_published:'Yayındaki ürün',payouts_pending:'Bekleyen ödeme kaydı',payable_kurus:'Ödemeye hazır tutar',commission_kurus:'Komisyon geliri',refunds_pending:'Bekleyen ücret iadesi',paid:'Ödenen',orders:'Siparişler',cancelled_unpaid:'Ödenmediği için iptal',nudged:'Hatırlatma gönderilen',cancelled:'İptal edilen',auto_delivered:'Otomatik teslim edilen sipariş',released:'Ödemeye serbest bırakılan',unpaid_cancelled:'Ödenmediği için iptal edilen'};
function kpiLabel(k){return KPI_L[k]||String(k).replace(/_kurus$/,'').replace(/_/g,' ').replace(/^./,function(c){return c.toLocaleUpperCase('tr')})}
function kpiVal(k,v){if(/_kurus$/.test(k))return TL(v);if(typeof v==='boolean')return v?'Evet':'Hayır';if(v&&typeof v==='object')return Object.keys(v).map(function(x){return ((ORDER_ST[x]||[x])[0])+': '+(/_kurus$/.test(x)?TL(v[x]):v[x])}).join(' · ')||'—';return String(v==null?'—':v)}
function filterBar(kind,opts,withQ){
  var f=ADM.f[kind]||{};
  return '<div class="pfxRow" style="margin:0 0 8px">'+(opts?'<select class="pfxSel" id="ozAdmSt" style="flex:1;min-width:150px;margin:0" aria-label="Durum">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(String(f.st==null?opts[0][0]:f.st)===o[0]?' selected':'')+'>'+E(o[1])+'</option>'}).join('')+'</select>':'')+
    (withQ?'<input class="pfxIn" id="ozAdmQ" style="flex:2;min-width:150px;margin:0" placeholder="Ara" aria-label="Ara" value="'+E(f.q||'')+'">':'')+
    '<button type="button" class="pfxBtn" data-a="aFilter" data-kind="'+kind+'">Listele</button></div>';
}
async function aList(kind,defSt){
  var f=ADM.f[kind]||{};var st=f.st==null?defSt:f.st;
  return arr(await rpc('oz_admin_list',{p_kind:kind,p_status:st||null,p_q:f.q||null,p_limit:50,p_offset:0}));
}
var A_ST_SELLER=[['pending','İnceleniyor'],['','Tümü'],['approved','Onaylı'],['rejected','Reddedildi'],['suspended','Askıda'],['draft','Taslak']];
var A_ST_PROD=[['pending','Onay bekleyen'],['','Tümü'],['published','Yayında'],['rejected','Reddedildi'],['hidden','Gizli'],['draft','Taslak']];
var A_ST_ORDER=[['','Tümü'],['awaiting_payment','Ödeme bekleniyor'],['new','Yeni'],['accepted','Onaylandı'],['packed','Hazırlandı'],['shipped','Kargoda'],['delivered','Teslim edildi'],['cancelled','İptal'],['return_requested','İade talebi'],['returned','İade edildi']];
var A_ST_RET=[['requested','Bekleyen'],['','Tümü'],['approved','Onaylandı'],['rejected','Reddedildi'],['refunded','İade edildi']];
var A_ST_PAY=[['','Tümü'],['pending','Bekleyen'],['paid','Ödendi'],['failed','Başarısız']];
var SET_B=[['oz_market_enabled','Pazar açık (herkes görür)'],['oz_seller_signup_enabled','Satıcı başvuruları açık'],['oz_orders_enabled','Sipariş alımı açık'],['oz_payment_mock_enabled','Deneme ödemesi (gerçek para çekilmez)'],['oz_cod_enabled','Kapıda ödeme']];
var SET_N=[['oz_return_days','İade süresi (gün)',0],['oz_auto_deliver_days','Kargodan sonra otomatik teslim (gün)',0],['oz_payout_hold_days','Ödeme bekletme süresi (gün)',0],['oz_unpaid_cancel_minutes','Ödenmeyen siparişi iptal (dakika)',0],['oz_default_ship_kurus','Varsayılan kargo ücreti (₺)',1],['oz_min_order_kurus','En az sipariş tutarı (₺)',1]];
var ADMV={
  oz_overview:async function(){
    var o=await rpc('oz_admin_overview',{})||{};
    var ks=Object.keys(o);
    aPaint('<div class="ozKpis">'+(ks.length?ks.map(function(k){return '<div class="ozKpi"><small>'+E(kpiLabel(k))+'</small><b>'+E(kpiVal(k,o[k]))+'</b></div>'}).join(''):'<p class="pfxMuted">Özet verisi yok.</p>')+'</div>'+
      '<div class="pfxCard"><b>Bakım çalıştır</b><p class="pfxMuted">Ödenmeyen siparişleri iptal etme, süresi dolan teslimleri tamamlama, bekletme süresi biten tutarları serbest bırakma gibi zamanlı işleri hemen çalıştırır.</p><button type="button" class="pfxBtn pri" data-a="aTick">Bakım çalıştır</button><div id="ozAdmTick"></div></div>');
  },
  oz_settings:async function(){
    var s=await rpc('oz_admin_settings',{})||{};
    aPaint('<div class="pfxCard"><b>Açma / kapama</b>'+SET_B.map(function(b){var on=s[b[0]]===true;return '<div class="pfxRow" style="margin:8px 0"><span>'+E(b[1])+'</span><button type="button" class="pfxBtn'+(on?' pri':'')+'" data-a="aSetB" data-k="'+b[0]+'" data-v="'+(on?'0':'1')+'" aria-pressed="'+on+'">'+(on?'Açık':'Kapalı')+'</button></div>'}).join('')+
      '<p class="pfxMuted">Pazar kapalıyken yalnızca yöneticiler önizleme olarak görür; diğer kullanıcılar ana sayfada "Özüne Dön çok yakında!" uyarısını görür.</p></div>'+
      '<div class="pfxCard"><b>Sayılar</b>'+SET_N.map(function(n){var v=s[n[0]];var shown=v==null?'':(n[2]?kurusToInput(v):String(v));return '<label class="pfxLbl" for="ozAS_'+n[0]+'">'+E(n[1])+'</label><div class="pfxRow"><input class="pfxIn" id="ozAS_'+n[0]+'" inputmode="decimal" value="'+E(shown)+'" style="flex:1;margin:0"><button type="button" class="pfxBtn" data-a="aSetN" data-k="'+n[0]+'" data-tl="'+n[2]+'">Kaydet</button></div>'}).join('')+'</div>');
  },
  oz_sellers:async function(){
    if(ADM.detail&&ADM.detail.kind==='seller')return sellerDetail(ADM.detail.id);
    aPaint(filterBar('sellers',A_ST_SELLER,true)+aLoading());
    var l=await aList('sellers','pending');
    aPaint(filterBar('sellers',A_ST_SELLER,true)+(l.length?l.map(function(s){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(s.display_name||'—')+'</b>'+aTag(SELLER_ST,s.status)+'</div><div class="pfxMuted">'+E([s.city,s.owner_email,fmtDay(s.created_at)].filter(Boolean).join(' · '))+'</div><div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aSeller" data-id="'+E(s.id)+'">Ayrıntı ve karar</button></div></div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>'));
  },
  oz_products:async function(){
    aPaint(filterBar('products',A_ST_PROD,true)+aLoading());
    var l=await aList('products','pending');
    aPaint(filterBar('products',A_ST_PROD,true)+(l.length?l.map(function(p){var st=p.is_hidden?'hidden':p.status;return '<div class="pfxCard"><div class="pfxRow"><b>'+E(p.name||'—')+'</b>'+aTag(PROD_ST,st)+'</div><div class="pfxMuted">'+E([p.seller_name,p.price_kurus!=null?TL(p.price_kurus):'',fmtDay(p.created_at||p.updated_at)].filter(Boolean).join(' · '))+'</div>'+(p.image?'<img src="'+E(p.image)+'" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px;margin-top:8px">':'')+
      '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aPView" data-id="'+E(p.id)+'">İncele</button>'+(st==='pending'||st==='in_review'||st==='rejected'||st==='draft'?'<button type="button" class="pfxBtn pri" data-a="aProd" data-d="approve" data-id="'+E(p.id)+'">Onayla</button>':'')+(st==='pending'||st==='in_review'||st==='published'||st==='active'||st==='approved'?'<button type="button" class="pfxBtn bad" data-a="aProd" data-d="reject" data-id="'+E(p.id)+'">Reddet</button>':'')+
      (st==='hidden'?'<button type="button" class="pfxBtn" data-a="aProd" data-d="unhide" data-id="'+E(p.id)+'">Göster</button>':(st==='published'||st==='active'||st==='approved'?'<button type="button" class="pfxBtn" data-a="aProd" data-d="hide" data-id="'+E(p.id)+'">Gizle</button>':''))+'</div></div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>'));
  },
  oz_orders:async function(){
    aPaint(filterBar('orders',A_ST_ORDER,true)+aLoading());
    var l=await aList('orders','');
    aPaint(filterBar('orders',A_ST_ORDER,true)+(l.length?l.map(function(o){var st=o.status;return '<div class="pfxCard"><div class="pfxRow"><b>'+E(o.order_no||'Sipariş')+' · '+TL(o.total_kurus)+'</b>'+aTag(ORDER_ST,st)+'</div><div class="pfxMuted">'+E([o.seller_name,o.buyer_email,fmtDate(o.created_at)].filter(Boolean).join(' · '))+'</div>'+(o.payment_status?'<div style="margin-top:4px">'+aTag(PAY_ST,o.payment_status)+'</div>':'')+'<div class="pfxRow" style="margin-top:8px">'+
      '<button type="button" class="pfxBtn" data-a="aOView" data-id="'+E(o.id)+'">Ayrıntı</button>'+
      (['awaiting_payment','new','accepted','packed','shipped'].indexOf(st)>=0?'<button type="button" class="pfxBtn bad" data-a="aOCancel" data-id="'+E(o.id)+'">İptal et</button>':'')+
      (st==='shipped'?'<button type="button" class="pfxBtn" data-a="aODeliver" data-id="'+E(o.id)+'">Teslim edildi</button>':'')+
      (o.payment_status==='refund_pending'||st==='refund_pending'?'<button type="button" class="pfxBtn pri" data-a="aRefund" data-id="'+E(o.id)+'">İade yapıldı</button>':'')+'</div></div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>'));
  },
  oz_returns:async function(){
    aPaint(filterBar('returns',A_ST_RET,true)+aLoading());
    var l=await aList('returns','requested');
    aPaint(filterBar('returns',A_ST_RET,true)+(l.length?l.map(function(r){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(r.order_no||'Sipariş')+'</b>'+aTag(RET_ST,r.status)+'</div><div class="pfxMuted">'+E([r.reason,r.details,fmtDate(r.created_at)].filter(Boolean).join(' · '))+'</div>'+
      (r.status==='requested'?'<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn pri" data-a="aRet" data-ok="1" data-id="'+E(r.id)+'">Kabul et</button><button type="button" class="pfxBtn bad" data-a="aRet" data-ok="0" data-id="'+E(r.id)+'">Reddet</button></div>':'')+
      (r.order_id&&(r.status==='approved'||r.order_status==='refund_pending')?'<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aRefund" data-id="'+E(r.order_id)+'">Ücret iadesi yapıldı</button></div>':'')+'</div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>'));
  },
  oz_payouts:async function(){
    aPaint(filterBar('payouts',A_ST_PAY,false)+aLoading());
    var l=await aList('payouts','');
    var PST={pending:['Bekliyor','warn'],processing:['İşleniyor','warn'],paid:['Ödendi','ok'],failed:['Başarısız','bad']};
    var due=l.filter(function(x){return !x.status&&x.seller_id}),pays=l.filter(function(x){return x.status});
    aPaint(filterBar('payouts',A_ST_PAY,false)+
      (due.length?'<h4 style="margin:10px 0 6px">Ödemeye hazır satıcılar</h4>'+due.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(x.seller_name||x.seller_id)+'</b><span>'+TL(x.available_kurus)+'</span></div><div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn pri" data-a="aPayNew" data-id="'+E(x.seller_id)+'">Ödeme kaydı oluştur</button></div></div>'}).join(''):'')+
      '<h4 style="margin:10px 0 6px">Ödeme kayıtları</h4>'+(pays.length?pays.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(x.seller_name||x.seller_id||'')+' · '+TL(x.amount_kurus)+'</b>'+aTag(PST,x.status)+'</div><div class="pfxMuted">'+E([fmtDay(x.created_at),(x.reference||x.bank_reference)?'Ref: '+(x.reference||x.bank_reference):''].filter(Boolean).join(' · '))+'</div>'+
        (x.status==='pending'||x.status==='processing'?'<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn pri" data-a="aPayMark" data-ok="1" data-id="'+E(x.id)+'">Ödendi</button><button type="button" class="pfxBtn bad" data-a="aPayMark" data-ok="0" data-id="'+E(x.id)+'">Başarısız</button></div>':'')+'</div>'}).join(''):'<p class="pfxMuted">Ödeme kaydı yok.</p>'));
  },
  oz_categories:async function(){
    var l=[];try{l=arr(await get('oz_categories?select=*&order=sort.asc,name.asc'))}catch(e){}
    if(!l.length){try{l=arr((await rpc('oz_home',{})||{}).categories)}catch(e){}}
    ADM.cats=l;
    aPaint('<button type="button" class="pfxBtn pri" data-a="aCat">Kategori ekle</button>'+(l.length?l.map(function(c){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(c.name)+'</b><span>'+(c.is_active===false?'<span class="ozTag">Pasif</span>':'<span class="ozTag ok">Aktif</span>')+(c.perishable?' <span class="ozTag warn">Çabuk bozulur</span>':'')+'</span></div><div class="pfxMuted">'+E(c.slug||'')+(c.sort!=null?' · sıra '+E(c.sort):'')+'</div>'+(c.image_url?'<img src="'+E(c.image_url)+'" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;margin-top:8px">':'')+
      '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aCat" data-id="'+E(c.id)+'">Düzenle</button><button type="button" class="pfxBtn" data-a="aCatToggle" data-id="'+E(c.id)+'">'+(c.is_active===false?'Aktif yap':'Pasif yap')+'</button></div></div>'}).join(''):'<p class="pfxMuted">Kategori yok.</p>'));
  },
  oz_moderation:async function(){
    aPaint(aLoading());
    var r=await Promise.all([rpc('oz_admin_list',{p_kind:'reviews',p_status:null,p_q:null,p_limit:50,p_offset:0}),rpc('oz_admin_list',{p_kind:'questions',p_status:null,p_q:null,p_limit:50,p_offset:0})]);
    var rv=arr(r[0]),qs_=arr(r[1]);
    function hid(x){return !!(x.is_hidden||x.hidden||x.status==='hidden')}
    aPaint('<h4 style="margin:6px 0">Değerlendirmeler</h4>'+(rv.length?rv.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><span>'+stars(x.rating)+' '+E(x.product_name||'')+'</span>'+(hid(x)?'<span class="ozTag bad">Gizli</span>':'')+'</div><p style="margin:6px 0">'+E(x.comment||'')+'</p><div class="pfxMuted">'+E(fmtDay(x.created_at))+'</div><div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aMod" data-kind="review" data-id="'+E(x.id)+'" data-h="'+(hid(x)?'0':'1')+'">'+(hid(x)?'Göster':'Gizle')+'</button></div></div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>')+
      '<h4 style="margin:12px 0 6px">Sorular</h4>'+(qs_.length?qs_.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><span>'+E(x.product_name||'')+'</span>'+(hid(x)?'<span class="ozTag bad">Gizli</span>':'')+'</div><p style="margin:6px 0">'+E(x.question||'')+'</p>'+(x.answer?'<p class="pfxMuted" style="margin:0 0 6px">Cevap: '+E(x.answer)+'</p>':'')+'<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aMod" data-kind="question" data-id="'+E(x.id)+'" data-h="'+(hid(x)?'0':'1')+'">'+(hid(x)?'Göster':'Gizle')+'</button></div></div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>'));
  }
};
OZ.admin=async function(key,el){
  ADM.el=el;ADM.key=key;if(el)el.classList.add('ozAdm');
  if(key!=='oz_sellers')ADM.detail=null;
  var fn=ADMV[key];if(!fn){aPaint('<p class="pfxMuted">Bölüm bulunamadı.</p>');return}
  try{await fn()}catch(e){aPaint(aErr(e))}
};
function aReload(){return OZ.admin(ADM.key,aEl())}
async function sellerDetail(id){
  aPaint(aLoading());
  var d=await rpc('oz_admin_seller_detail',{p_id:id})||{};var s=d.seller||{};
  var docs=arr(d.documents),rates=arr(d.rates);
  var pct=s.commission_bps!=null?num(s.commission_bps)/100:10;
  aPaint('<button type="button" class="pfxBtn" data-a="aSellerBack">← Satıcılar</button>'+
    '<div class="pfxCard"><div class="pfxRow"><b>'+E(s.display_name||'—')+'</b>'+aTag(SELLER_ST,s.status)+'</div>'+
    '<table class="pfxTbl" style="margin-top:8px">'+[['Tür',s.kind==='business'?'İşletme':'Bireysel'],['Ad / unvan',s.legal_name],['Vergi / TCKN',s.tax_no],['Vergi dairesi',s.tax_office],['Telefon',s.phone],['E-posta',d.owner_email],['Konum',[s.city,s.district].filter(Boolean).join(' / ')],['Kargo çıkış ili',s.ship_from_city],['Hazırlık süresi',s.handling_days!=null?s.handling_days+' iş günü':''],['Kargo bedava',s.free_ship_over_kurus?TL(s.free_ship_over_kurus)+' ve üzeri':'—'],['Durum gerekçesi',s.status_reason]].filter(function(r){return r[1]}).map(function(r){return '<tr><th>'+E(r[0])+'</th><td>'+E(r[1])+'</td></tr>'}).join('')+'</table>'+
    (s.story?'<p class="pfxMuted" style="white-space:pre-wrap">'+E(s.story)+'</p>':'')+'</div>'+
    '<div class="pfxCard"><b>Belgeler</b>'+(docs.length?docs.map(function(x){return '<div style="margin:8px 0;padding-top:8px;border-top:1px solid rgba(127,127,127,.2)"><div class="pfxRow"><span>'+E(DOC_T[x.doc_type||x.type]||x.doc_type||x.type)+' · '+E(x.file_name||x.name||'')+'</span>'+aTag(DOC_ST,x.status)+'</div><div class="pfxRow" style="margin-top:6px"><button type="button" class="pfxBtn" data-a="aDocView" data-p="'+E(x.path||x.storage_path||'')+'">Görüntüle</button><button type="button" class="pfxBtn pri" data-a="aDoc" data-ok="1" data-id="'+E(x.id)+'">Onayla</button><button type="button" class="pfxBtn bad" data-a="aDoc" data-ok="0" data-id="'+E(x.id)+'">Reddet</button></div></div>'}).join(''):'<p class="pfxMuted">Belge yok.</p>')+'</div>'+
    '<div class="pfxCard"><b>Kargo tablosu</b>'+(rates.length?'<table class="pfxTbl">'+rates.map(function(r){return '<tr><td>'+NF1.format(num(r.max_weight_g)/1000)+' kg\'a kadar</td><td>'+TL(r.fee_kurus)+'</td></tr>'}).join('')+'</table>':'<p class="pfxMuted">Kargo tablosu yok.</p>')+'</div>'+
    '<div class="pfxCard"><b>Karar</b><label class="pfxLbl" for="ozAdmCom">Komisyon (%)</label><input class="pfxIn" id="ozAdmCom" inputmode="decimal" value="'+E(String(pct).replace('.',','))+'"><div class="pfxRow"><button type="button" class="pfxBtn pri" data-a="aSDec" data-d="approve" data-id="'+E(s.id||id)+'">Onayla</button><button type="button" class="pfxBtn bad" data-a="aSDec" data-d="reject" data-id="'+E(s.id||id)+'">Reddet</button><button type="button" class="pfxBtn" data-a="aSDec" data-d="suspend" data-id="'+E(s.id||id)+'">Askıya al</button></div></div>');
}
function slugify(s){return String(s||'').toLocaleLowerCase('tr').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)}
async function reasonBox(title,label,required){var v=await formBox(title,'<label for="ozAR">'+E(label)+'</label><textarea class="ozTa" id="ozAR" data-f="r" maxlength="500"></textarea>','Onayla',function(v){return required&&v.r.length<3?'Gerekçe yaz.':''});return v?v.r:null}
ACT_EXTRA({
  aReload:function(){return aReload()},
  aFilter:function(b){ADM.f[b.dataset.kind]={st:val('ozAdmSt'),q:val('ozAdmQ')};return aReload()},
  aTick:async function(b){await busy(b,async function(){var r=await rpc('oz_admin_ops_tick',{});var el=D.getElementById('ozAdmTick');if(el)el.innerHTML='<table class="pfxTbl" style="margin-top:8px">'+(r&&typeof r==='object'?Object.keys(r).map(function(k){return '<tr><th>'+E(kpiLabel(k))+'</th><td>'+E(kpiVal(k,r[k]))+'</td></tr>'}).join(''):'<tr><td>'+E(String(r))+'</td></tr>')+'</table>';toast('Bakım tamamlandı')})},
  aSetB:async function(b){
    var k=b.dataset.k,on=b.dataset.v==='1';
    if(k==='oz_market_enabled'&&on&&!await confirmBox('Pazar açılsın mı?','Açıldığında herkes Özüne Dön\'ü görür ve sipariş verebilir. Satıcıların, ürünlerin ve ödeme ayarlarının hazır olduğundan emin ol.','Pazarı aç',true))return;
    await busy(b,async function(){await rpc('oz_admin_set_setting',{p_key:k,p_value:on});toast('Ayar kaydedildi');ST.setAt=0;await aReload()});
  },
  aSetN:async function(b){
    var k=b.dataset.k,raw=val('ozAS_'+k);var v=b.dataset.tl==='1'?tlToKurus(raw):Number(String(raw).replace(',','.'));
    if(!(v>=0)||(b.dataset.tl!=='1'&&Math.floor(v)!==v)){toast('Geçerli bir sayı yaz.');return}
    await busy(b,async function(){await rpc('oz_admin_set_setting',{p_key:k,p_value:v});toast('Ayar kaydedildi')});
  },
  aSeller:function(b){ADM.detail={kind:'seller',id:b.dataset.id};return aReload()},
  aSellerBack:function(){ADM.detail=null;return aReload()},
  aDocView:async function(b){if(!b.dataset.p){toast('Belge yolu bulunamadı.');return}await busy(b,async function(){var u=await signedUrl('oz-docs',b.dataset.p);window.open(u,'_blank','noopener')})},
  aDoc:async function(b){var ok=b.dataset.ok==='1';var r=null;if(!ok){r=await reasonBox('Belgeyi reddet','Ret gerekçesi (satıcı görür)',true);if(r===null)return}await rpc('oz_admin_review_document',{p_id:b.dataset.id,p_approve:ok,p_reason:r});toast(ok?'Belge onaylandı':'Belge reddedildi');await aReload()},
  aSDec:async function(b){
    var d=b.dataset.d;var bps=null,r=null;
    if(d==='approve'){var pct=Number(val('ozAdmCom').replace(',','.'));if(!(pct>=0&&pct<=50)){toast('Komisyon %0 ile %50 arasında olmalı.');return}bps=Math.round(pct*100);if(!await confirmBox('Satıcı onaylansın mı?','Komisyon: %'+String(pct).replace('.',',')+'. Onaylanan satıcı ürün ekleyip incelemeye gönderebilir.','Onayla'))return}
    else{r=await reasonBox(d==='reject'?'Başvuruyu reddet':'Satıcıyı askıya al','Gerekçe (satıcı görür)',true);if(r===null)return}
    await rpc('oz_admin_review_seller',{p_id:b.dataset.id,p_decision:d,p_reason:r,p_commission_bps:bps});toast('Karar kaydedildi');await aReload();
  },
  aProd:async function(b){var d=b.dataset.d;var r=null;if(d==='reject'||d==='hide'){r=await reasonBox(d==='reject'?'Ürünü reddet':'Ürünü gizle','Gerekçe (satıcı görür)',d==='reject');if(r===null)return}await rpc('oz_admin_review_product',{p_id:b.dataset.id,p_decision:d,p_reason:r||null});toast('Karar kaydedildi');await aReload()},
  aPView:async function(b){
    await busy(b,async function(){var p=await rpc('oz_product_detail',{p_id:b.dataset.id})||{};
      sheet(p.name||'Ürün','<div class="ozImgs" style="margin-bottom:10px">'+arr(p.images).map(function(u){return pic(u,p.name)}).join('')+'</div>'+
        '<dl class="ozKV"><dt>Satıcı</dt><dd>'+E((p.seller||{}).display_name||'')+'</dd><dt>Kategori</dt><dd>'+E((p.category||{}).name||'')+'</dd><dt>Menşe</dt><dd>'+E(p.origin_city||'')+'</dd><dt>Net miktar</dt><dd>'+E(p.net_content||'')+'</dd><dt>Raf ömrü</dt><dd>'+E(p.shelf_life_days!=null?p.shelf_life_days+' gün':'')+'</dd><dt>Alerjen</dt><dd>'+E(arr(p.allergens).map(algLabel).join(', ')||'—')+'</dd><dt>Organik</dt><dd>'+E(p.organic_cert||'—')+'</dd></dl>'+
        '<h3 style="font-size:15px;margin:12px 0 4px">Açıklama</h3><p class="ozStory" style="margin:0">'+E(p.description||'—')+'</p><h3 style="font-size:15px;margin:12px 0 4px">İçindekiler</h3><p class="ozStory" style="margin:0">'+E(p.ingredients||'—')+'</p>'+
        '<h3 style="font-size:15px;margin:12px 0 4px">Seçenekler</h3>'+arr(p.variants).map(function(v){return '<div class="ozLine"><span>'+E(v.label||'')+' · stok '+num(v.stock)+' · '+num(v.weight_g)+' g</span><span>'+TL(v.price_kurus)+'</span></div>'}).join(''),{wide:true})});
  },
  aOView:async function(b){
    await busy(b,async function(){var d=null;try{d=await rpc('oz_order_detail',{p_order:b.dataset.id})}catch(e){toast(e.message);return}
      sheet('Sipariş',orderDetailHtml(d||{order:{}}).replace(/data-a="(mockPay|ordDeliver|ordCancel|ordReturn|ordReview)"/g,'data-x="$1" disabled'),{wide:true})});
  },
  aOCancel:async function(b){var r=await reasonBox('Siparişi iptal et','İptal gerekçesi (alıcı ve satıcı görür)',true);if(r===null)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'cancel',p:{reason:r}});toast('Sipariş iptal edildi');await aReload()},
  aODeliver:async function(b){if(!await confirmBox('Teslim edildi olarak işaretlensin mi?','Alıcı yerine teslimatı onaylıyorsun.','İşaretle'))return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'deliver',p:{}});toast('Teslim edildi olarak işaretlendi');await aReload()},
  aRefund:async function(b){var v=await formBox('Ücret iadesi yapıldı','<label for="ozARef">İade referansı (dekont/işlem no)</label><input class="ozIn" id="ozARef" data-f="r" maxlength="80">','Kaydet',function(v){return v.r.length<2?'Referans yaz.':''});if(!v)return;await rpc('oz_admin_mark_refunded',{p_order:b.dataset.id,p_reference:v.r});toast('İade kaydedildi');await aReload()},
  aRet:async function(b){var ok=b.dataset.ok==='1';var r=await reasonBox(ok?'İadeyi kabul et':'İadeyi reddet',ok?'Not (isteğe bağlı)':'Ret gerekçesi',!ok);if(r===null)return;await rpc('oz_decide_return',{p_return:b.dataset.id,p_approve:ok,p_note:r||null});toast('Karar kaydedildi');await aReload()},
  aPayNew:async function(b){if(!await confirmBox('Ödeme kaydı oluşturulsun mu?','Satıcının ödemeye hazır tutarı için ödeme kaydı açılır. Parayı bankadan gönderdikten sonra "Ödendi" olarak işaretle.','Oluştur'))return;await rpc('oz_admin_create_payout',{p_seller:b.dataset.id});toast('Ödeme kaydı oluşturuldu');await aReload()},
  aPayMark:async function(b){var ok=b.dataset.ok==='1';var v=await formBox(ok?'Ödendi olarak işaretle':'Başarısız olarak işaretle','<label for="ozAPr">'+(ok?'Banka referansı':'Açıklama')+'</label><input class="ozIn" id="ozAPr" data-f="r" maxlength="80">','Kaydet',function(v){return ok&&v.r.length<2?'Banka referansını yaz.':''});if(!v)return;await rpc('oz_admin_mark_payout',{p_id:b.dataset.id,p_paid:ok,p_reference:v.r||null});toast('Ödeme güncellendi');await aReload()},
  aMod:async function(b){await busy(b,async function(){await rpc('oz_admin_moderate',{p_kind:b.dataset.kind,p_id:b.dataset.id,p_hide:b.dataset.h==='1'});toast(b.dataset.h==='1'?'Gizlendi':'Gösteriliyor');await aReload()})},
  aCatToggle:async function(b){var c=arr(ADM.cats).filter(function(x){return String(x.id)===b.dataset.id})[0];if(!c)return;await busy(b,async function(){await rpc('oz_admin_category_save',{p:catPayload(c,{is_active:c.is_active===false})});toast('Kategori güncellendi');await aReload()})},
  aCat:async function(b){
    var c=b.dataset.id?arr(ADM.cats).filter(function(x){return String(x.id)===b.dataset.id})[0]||{}:{};ADM.catImg=c.image_url||null;
    var parents=arr(ADM.cats).filter(function(x){return x.id!==c.id});
    var v=await formBox(c.id?'Kategoriyi düzenle':'Yeni kategori',
      '<label for="ozCN">Ad</label><input class="ozIn" id="ozCN" data-f="name" value="'+E(c.name||'')+'" maxlength="60"><label for="ozCS">Kısa ad (adres için, boş = otomatik)</label><input class="ozIn" id="ozCS" data-f="slug" value="'+E(c.slug||'')+'" maxlength="60">'+
      '<label for="ozCP">Üst kategori</label><select class="ozSel" id="ozCP" data-f="parent"><option value="">Yok</option>'+parents.map(function(p){return '<option value="'+E(p.id)+'"'+(String(c.parent_id||'')===String(p.id)?' selected':'')+'>'+E(p.name)+'</option>'}).join('')+'</select>'+
      '<label for="ozCO">Sıra</label><input class="ozIn" id="ozCO" data-f="sort" inputmode="numeric" value="'+E(c.sort==null?'':c.sort)+'">'+
      '<label class="ozChk"><input type="checkbox" data-f="active"'+(c.is_active===false?'':' checked')+'><span>Aktif</span></label><label class="ozChk"><input type="checkbox" data-f="perishable"'+(c.perishable?' checked':'')+'><span>Çabuk bozulur (soğuk zincir / kısa raf ömrü)</span></label>'+
      '<div id="ozCImg" style="margin:8px 0">'+(c.image_url?pic(c.image_url,'Kategori görseli','')+'':'')+'</div>'+fileBtn('Görsel yükle','catimg','image/jpeg,image/png,image/webp'),
      'Kaydet',function(v){return v.name.length<2?'Kategori adını yaz.':(v.sort&&!(Number(v.sort)>=0)?'Sıra sayı olmalı.':'')});
    if(!v)return;
    var p={name:v.name,slug:v.slug?slugify(v.slug):slugify(v.name),parent_id:v.parent||null,image_url:ADM.catImg||null,sort:v.sort===''?null:Number(v.sort),is_active:!!v.active,perishable:!!v.perishable};if(c.id)p.id=c.id;
    await rpc('oz_admin_category_save',{p:p});toast('Kategori kaydedildi');ST.home=null;await aReload();
  }
});
function catPayload(c,over){var p={id:c.id,name:c.name,slug:c.slug,parent_id:c.parent_id||null,image_url:c.image_url||null,sort:c.sort==null?null:c.sort,is_active:c.is_active!==false,perishable:!!c.perishable};return Object.assign(p,over||{})}
FILES.catimg=async function(f){toast('Görsel yükleniyor…');var u=await uploadImage('cat',f);ADM.catImg=u;var b=D.getElementById('ozCImg');if(b)b.innerHTML=pic(u,'Kategori görseli','');toast('Görsel yüklendi')};

/*@@SON@@*/
})();
