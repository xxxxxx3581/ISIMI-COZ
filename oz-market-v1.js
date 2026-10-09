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
function TL(k){return NF.format(Math.round(+k||0)/100)+'\u00a0₺'}
/* Türkçe TL girişi → kuruş. Nokta binlik, virgül ondalık: 1000 · 1.000 · 1.000,50 · 1000,5. Tek noktadan sonra 1-2 hane (65.90) ondalık sayılır.
   Geçersiz biçim (harf, 1.00.0, 1,234 …) → NaN; çağıran uyarı verir ve kaydetmez. */
function tlToKurus(v){var s=String(v==null?'':v).replace(/\s+|₺|TL/gi,'');if(!s)return NaN;
  if(/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d+(,\d{1,2})?$/.test(s))s=s.replace(',','.');
  else if(!/^\d+\.\d{1,2}$/.test(s))return NaN;
  var n=Number(s);return isFinite(n)&&n>=0?Math.round(n*100):NaN}
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
function wrapErr(e){var raw=String(e&&e.message||e||'');var er=new Error(cleanMsg(raw));er.code=e&&e.code;er.status=e&&e.status;er.auth=isAuthErr(e);er.pf=/^(PF|OZ)_[A-Z]+:/.test(raw);return er}
/* Beklenmeyen ham veritabanı hatası: HTTP hatası olup PF_ önekli (RAISE EXCEPTION → SQLSTATE P0001) olmayan, oturum hatası da olmayan (ör. 23505, 22P02). */
function isRawDbErr(e){return !!e&&!e.auth&&!e.pf&&e.code!=='P0001'&&num(e.status)>=400}
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
function fail(e){if(e&&e.auth){needLogin(null);return}errToast(e&&e.message||e)}
/* A5: hata mesajı en az 6 sn kalır, dokununca kapanır (kaybolan beyaz uyarıya bağımlı olmaz) */
function errToast(m){m=cleanMsg(m);qa('.ozToast.err').forEach(function(x){x.remove()});
  var t=D.createElement('div');t.className='ozToast err';t.setAttribute('role','alert');t.textContent=m;t.title='Kapatmak için dokun';
  t.addEventListener('click',function(){t.remove()});D.body.appendChild(t);setTimeout(function(){t.remove()},Math.max(6000,Math.min(12000,m.length*90)))}
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
function closeSheet(){var hadH=!!qs('.ozOvH');qa('.ozOv').forEach(function(x){x.remove()});if(SHEET_ESC){D.removeEventListener('keydown',SHEET_ESC);SHEET_ESC=null}
  if(hadH&&ST.preH){ST.preH=false;var keep=ST.preKeep;ST.preKeep=false;var V=hNav();if(!keep&&V&&V.stack[V.idx]&&V.stack[V.idx].name==='oz:sheet')history.back()}}
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
  truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1"/>',home:'<path d="M4 11l8-7 8 7v9H4z"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',
  chk2:'<path d="M2 13l4 4 9-10M10 16l1.5 1.5L22 7"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',wallet:'<path d="M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3"/><circle cx="16.5" cy="13.5" r="1.2"/>'
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
function cartSet(c){try{if(c&&c.length)localStorage.setItem(CART_KEY,JSON.stringify(c));else localStorage.removeItem(CART_KEY)}catch(e){}cartBadge();stripSync()}
/* A2: liste ekranlarında (Keşfet, Üreticiler, üretici sayfası, arama) alt menünün hemen üstünde kalıcı "Sepeti gör" şeridi.
   Ürün sayfası (kendi alt çubuğu var), sepet ve ödeme ekranlarında yok. Toplam yalnız gösterim; tutar sunucuda hesaplanır. */
var STRIP_ON={home:1,producers:1,store:1,search:1,favs:1};
function stripSync(){
  var r=D.getElementById('ozRoot');if(!r)return;var old=D.getElementById('ozCStrip');
  var c=cartGet();var n=c.reduce(function(k,x){return k+num(x.qty)},0);var k=(NAV&&NAV.length)?cur().k:'';
  var on=n>0&&STRIP_ON[k]&&D.body.classList.contains('ozWorld');
  D.body.classList.toggle('ozStripOn',!!on);
  if(!on){if(old)old.remove();return}
  var tot=c.reduce(function(s2,x){return s2+num(x.price_kurus)*num(x.qty)},0);
  var h='<button type="button" class="ozCStrip" id="ozCStrip" data-a="nav" data-k="cart">'+ico('cart',20)+'<b>Sepeti gör</b><span>'+n+' ürün · '+TL(tot)+'</span><i aria-hidden="true">›</i></button>';
  if(old)old.outerHTML=h;else r.insertAdjacentHTML('beforeend',h);
}
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
  if(!list.length)return empty(ico('bell',34),'Bildirimin yok','Sipariş ve mağaza gelişmeleri burada görünür.');
  var nu=list.filter(unread).length;
  return '<div class="ozNtH"><span class="pill'+(nu?' on':'')+'">'+(nu?nu+' okunmamış':'Hepsi okundu')+'</span><span class="acts"><button type="button" class="ozNtB" data-a="notifAll"'+(nu?'':' disabled')+' aria-label="Hepsini okundu işaretle">'+ico('chk2',16)+'<span>Okundu işaretle</span></button>'+(ST.ntDel===true?'<button type="button" class="ozNtB bad" data-a="notifDel" aria-label="Tüm bildirimleri sil">'+ico('trash',16)+'<span>Tümünü sil</span></button>':'')+'</span></div>'+
    '<div class="ozList">'+list.map(function(n){return '<button type="button" class="ozNt'+(unread(n)?' new':'')+'" data-a="notifOpen" data-id="'+E(n.id)+'"><b>'+E(n.title||'Bildirim')+'</b>'+(n.body?'<span>'+E(n.body)+'</span>':'')+'<small>'+E(fmtDate(n.created_at))+'</small></button>'}).join('')+'</div>';
}
async function openNotifs(){
  if(!logged()){needLogin(function(){openNotifs()});return}
  sheet('Bildirimler',skel(3,'line'),{noFocus:true});
  try{var l=await loadNotifs();await ntDelCheck();var b=qs('.ozOv .ozShB');if(b)b.innerHTML=notifHtml(l)}catch(e){var b2=qs('.ozOv .ozShB');if(b2)b2.innerHTML=errBox(e,false)}
}
/* "Tümünü sil" yalnız oz_delete_my_notifications RPC'si kuruluysa görünür (oz-paket4-bildirim-sil.sql). p_check:true hiçbir şey silmez. */
async function ntDelCheck(){
  if(ST.ntDel!==undefined)return;
  try{await rpc('oz_delete_my_notifications',{p_check:true});ST.ntDel=true}
  catch(e){var m=String(e&&(e.code||'')+' '+(e.message||e));if(/PGRST202|Could not find the function|kullanılamıyor|schema cache|404/i.test(m))ST.ntDel=false}
}
ACT_EXTRA({
  notifDel:async function(btn){
    if(ST.ntDelBusy)return;
    if(!await confirmBox('Tüm bildirimlerin silinsin mi?','Bu işlem geri alınamaz.','Sil',true)){openNotifs();return}
    /* kilit: onay penceresi düğmeyi kapattığı için ayrı bayrak; sunucu yalnız auth.uid() bildirimlerini siler */
    ST.ntDelBusy=1;
    try{await rpc('oz_delete_my_notifications',{p_check:false});ST.notif=[];bellBadge(0);toast('Bildirimler silindi')}catch(e){fail(e)}
    finally{ST.ntDelBusy=0;openNotifs()}
  },
  notifAll:async function(btn){await busy(btn,async function(){await rpc('oz_mark_notifications_read',{p_ids:null});(ST.notif||[]).forEach(function(n){n.read_at=n.read_at||new Date().toISOString()});bellBadge(0);var b=qs('.ozOv .ozShB');if(b)b.innerHTML=notifHtml(ST.notif||[])})},
  notifOpen:async function(btn){
    var n=(ST.notif||[]).filter(function(x){return String(x.id)===btn.dataset.id})[0];if(!n)return;
    if(unread(n)){try{await rpc('oz_mark_notifications_read',{p_ids:[n.id]});n.read_at=new Date().toISOString();bellBadge(ST.notif.filter(unread).length)}catch(e){}}
    closeSheet();
    var oid=n.order_id||(n.data&&n.data.order_id)||(n.payload&&n.payload.order_id);
    var role=String(n.audience||n.role||(n.data&&n.data.role)||'');
    var isSeller=role==='seller'||/seller/.test(String(n.type||''));
    if(isSeller)go('seller',{tab:'ozet'});else if(oid)go('order',{id:oid});
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
  return '<div class="ozPC" role="button" tabindex="0" data-a="nav" data-k="product" data-id="'+E(p.id)+'" aria-label="'+E(p.name)+'">'+pic(p.image,p.name)+
    (p.in_stock===false?'<span class="so">Tükendi</span>':'')+favBtn(p.id,isFav(p.id))+
    '<div class="bd"><span class="nm">'+E(p.name)+'</span>'+(p.seller_name?'<span class="mt">'+E(p.seller_name)+'</span>':'')+
    '<span class="pr"><b>'+TL(price)+'</b>'+(cmp>price?'<s>'+TL(cmp)+'</s>':'')+'</span></div></div>';
}
/* K30: hero slayt — yalnızca gerçek veri: marka slaytı + kapak fotoğraflı, ürünü olan en fazla 3 üretici */
/* K35: hero — 3 marka slaytı (sabit marka bloğu + metin + assets/oz-cat fotoğraf üçlüsü). İddia içeren metin yok. */
var OZ_WHEAT='<svg class="lg" viewBox="0 0 32 40" aria-hidden="true" focusable="false"><path d="M16 39V13" stroke="#F7D24A" stroke-width="2" stroke-linecap="round" fill="none"/><g fill="#F7D24A"><ellipse cx="16" cy="7" rx="3" ry="5.5"/><ellipse cx="11.6" cy="14" rx="2.6" ry="5" transform="rotate(-32 11.6 14)"/><ellipse cx="20.4" cy="14" rx="2.6" ry="5" transform="rotate(32 20.4 14)"/><ellipse cx="11.2" cy="21.5" rx="2.6" ry="5" transform="rotate(-36 11.2 21.5)"/><ellipse cx="20.8" cy="21.5" rx="2.6" ry="5" transform="rotate(36 20.8 21.5)"/></g><path d="M16 33c-4-1-7-4-8-8 4 .6 7 3.6 8 8zM16 36c4-1 7-4 8-8-4 .6-7 3.6-8 8z" fill="#CFE7C2" opacity=".85"/></svg>';
var OZ_OLIVE='<svg class="br" viewBox="0 0 120 60" aria-hidden="true" focusable="false"><path d="M4 52C30 40 62 30 116 10" stroke="#9CC58A" stroke-width="2" fill="none" stroke-linecap="round"/><g fill="#9CC58A" opacity=".9"><ellipse cx="26" cy="38" rx="9" ry="3.4" transform="rotate(-38 26 38)"/><ellipse cx="34" cy="46" rx="9" ry="3.4" transform="rotate(14 34 46)"/><ellipse cx="52" cy="29" rx="9" ry="3.4" transform="rotate(-40 52 29)"/><ellipse cx="60" cy="37" rx="9" ry="3.4" transform="rotate(10 60 37)"/><ellipse cx="80" cy="20" rx="9" ry="3.4" transform="rotate(-42 80 20)"/><ellipse cx="88" cy="28" rx="9" ry="3.4" transform="rotate(8 88 28)"/></g><g fill="#3E5A2A"><ellipse cx="44" cy="40" rx="3.6" ry="4.6"/><ellipse cx="72" cy="30" rx="3.6" ry="4.6"/></g></svg>';
/* K37: banner arka planında soluk, özgün zeytin dalı */
var OZ_BRANCH='<svg class="bg" viewBox="0 0 400 220" aria-hidden="true" focusable="false"><path d="M-10 210C70 170 150 150 230 96S350 20 410 6" stroke="#CFE7C2" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#CFE7C2"><ellipse cx="40" cy="186" rx="22" ry="7" transform="rotate(-40 40 186)"/><ellipse cx="62" cy="196" rx="22" ry="7" transform="rotate(18 62 196)"/><ellipse cx="104" cy="160" rx="22" ry="7" transform="rotate(-48 104 160)"/><ellipse cx="128" cy="172" rx="22" ry="7" transform="rotate(12 128 172)"/><ellipse cx="176" cy="126" rx="22" ry="7" transform="rotate(-52 176 126)"/><ellipse cx="200" cy="138" rx="22" ry="7" transform="rotate(6 200 138)"/><ellipse cx="250" cy="80" rx="22" ry="7" transform="rotate(-50 250 80)"/><ellipse cx="276" cy="92" rx="22" ry="7" transform="rotate(4 276 92)"/><ellipse cx="326" cy="40" rx="20" ry="6.5" transform="rotate(-46 326 40)"/><ellipse cx="350" cy="50" rx="20" ry="6.5" transform="rotate(0 350 50)"/></g><g fill="#E6F2DD"><ellipse cx="88" cy="180" rx="8" ry="10"/><ellipse cx="158" cy="146" rx="8" ry="10"/><ellipse cx="232" cy="104" rx="8" ry="10"/></g></svg>';
var HERO_SL=[['Doğadan sofranıza','Üreticiden doğrudan kapına.',['bal-recel','kuruyemis-meyve','recel']],
  ['Her kavanozda bir hikâye','Anadolu\'nun köylerinden el emeği ürünler.',['recel','tursu-konserve','el-emegi']],
  ['Güvenilir üreticiler','Başvurusu incelenen, onaylı üreticilerden.',['kuru-yemis','baharat-bitki-cay','bitki-cayi']]];
function heroHtml(){
  var oe="var p=this.parentNode;this.remove();if(p&&!p.querySelector('img'))p.remove()";
  var sl=HERO_SL.map(function(h,n){return '<div class="ozHs ozBn" role="group" aria-roledescription="slayt" aria-label="'+(n+1)+' / '+HERO_SL.length+'">'+OZ_OLIVE+
    OZ_BRANCH+'<div class="mk">'+OZ_WHEAT+'<b>Özüne <em>Dön</em></b></div><div class="tx"><em>Doğal olanı keşfet.</em><strong>'+E(h[0])+'</strong><small>'+E(h[1])+'</small></div>'+
    '<div class="tc"><span>✓ Onaylı üretici</span><span>🚚 Kapına kargo</span><span>🔒 Güvenli ödeme</span></div>'+
    '<div class="ph">'+h[2].map(function(sg,k){return '<img class="p'+(k+1)+'" src="assets/oz-cat/'+sg+'.jpg" alt="" loading="'+(n?'lazy':'eager')+'" decoding="async" onerror="'+oe+'">'}).join('')+'</div></div>'});
  return '<section class="ozHero" aria-label="Özüne Dön" aria-roledescription="slayt gösterisi"><div class="ozHeroT" id="ozHeroT">'+sl.join('')+'</div><div class="ozDots" id="ozHeroD" aria-hidden="true">'+sl.map(function(_,i){return '<i'+(i?'':' class="on"')+'></i>'}).join('')+'</div></section>';
}
function startHero(t){
  var tr=D.getElementById('ozHeroT'),dt=D.getElementById('ozHeroD');if(!tr||!dt)return;
  var n=tr.children.length,stop=false;
  function idx(){return Math.round(tr.scrollLeft/Math.max(1,tr.clientWidth))}
  tr.addEventListener('scroll',function(){var i=idx();qa('i',dt).forEach(function(x,j){x.classList.toggle('on',i===j)})},{passive:true});
  ['pointerdown','touchstart','focusin'].forEach(function(ev){tr.addEventListener(ev,function(){stop=true},{passive:true})});
  try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
  var tm=setInterval(function(){if(!alive(t)||!tr.isConnected){clearInterval(tm);return}if(stop||D.hidden)return;var i=(idx()+1)%n;try{tr.scrollTo({left:i*tr.clientWidth,behavior:'smooth'})}catch(e){tr.scrollLeft=i*tr.clientWidth}},5000);
}
/* K35: üretici sayfası parçaları */
/* Üretici sayfası (sade): başlık (logo, ad, konum, puan), kategoriler, ürünler. Kargo/minimum bilgisi sepet-ödeme ve ürün sayfasında (C8).
   açıklama yazısı gösterilmez, kategoriler kaydırmasız küçük ızgara ("Tümü" yok; aynı ikona tekrar dokunmak filtreyi kaldırır) */
function ppHtml(d,all){
  var nm=String(d.display_name||'Üretici');var cv=httpsUrl(d.cover_url),lg=httpsUrl(d.logo_url);var loc=[d.city,d.district].filter(Boolean).join(' · ');
  var own=arr(d.categories),cnt={};own.forEach(function(c){cnt[c.slug]=num(c.count)});
  var cats=all&&all.length?all.slice():own.slice();own.forEach(function(c){if(!cats.some(function(x){return x.slug===c.slug}))cats.push(c)});
  var rc=num(d.rating_count);
  return '<div class="ozPP"><div class="cv">'+(cv?'<img src="'+E(cv)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<button type="button" class="bk" data-a="back" aria-label="Geri">'+ico('back')+'</button></div>'+
    '<div class="hd"><span class="lg">'+(lg?'<img src="'+E(lg)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<i aria-hidden="true">'+E(initials(nm))+'</i></span><span class="ok">✓ Onaylı üretici</span></div>'+
    /* C7: solda ad (tek satır) + konum; sağda tek dokunma alanı: ★ puan / Değerlendirmeler (N) */
    '<div class="nmr"><div class="nl"><h1 class="nm">'+E(nm)+'</h1>'+(loc?'<p class="loc">'+E(loc)+'</p>':'')+'</div>'+
      (rc?'<button type="button" class="rtb2" data-a="ppRev" data-id="'+E(d.id)+'" aria-label="'+rc+' değerlendirmeyi gör"><b>★ '+num(d.rating_avg).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})+'</b><small>Değerlendirmeler ('+rc+')</small></button>':'<em class="new">Yeni</em>')+'</div>'+
    (cats.length?'<div class="ozSecH"><h2>Kategoriler</h2></div><div class="ozPPCats" role="list">'+
      cats.map(function(c){var n=cnt[c.slug]||0;return catTile({slug:c.slug,image_url:c.image_url,name:c.name+(n?' ('+n+')':'')},'data-a="ppCat" data-cat="'+E(c.slug)+'"'+(n?'':' data-off="1"'))}).join('')+'</div>':'')+
    '<div class="ozSecH"><h2>Ürünler</h2></div><div id="ozPPL">'+skel(2)+'</div></div>';
}
function revHtml(r){return '<div class="ozRev"><div class="h"><span>'+stars(r.rating)+' '+E(r.name||'Alıcı')+'</span><span>'+E(fmtDay(r.created_at))+'</span></div>'+(r.product_name?'<p class="ozMuted" style="margin:2px 0 0;font-size:12.5px">'+E(r.product_name)+'</p>':'')+(r.comment?'<p>'+E(r.comment)+'</p>':'')+(r.seller_reply?'<div class="ozReply"><b>Üretici yanıtı:</b> '+E(r.seller_reply)+'</div>':'')+'</div>'}
ACT_EXTRA({
  /* Değerlendirmeler alt panelde (oz_producer_reviews). Yazma yolu yalnız teslim edilen siparişten. */
  ppRev:async function(b){await busy(b,async function(){
    var l=arr(await rpc('oz_producer_reviews',{p_id:b.dataset.id,p_limit:30}));
    sheet('Değerlendirmeler',(l.length?l.map(revHtml).join(''):'<p class="ozMuted">Henüz yorum yazılmamış.</p>')+'<p class="ozHint" style="margin:10px 0 0">Değerlendirmeyi yalnız teslim aldığı siparişten alıcılar yazabilir.</p>',{noFocus:true});
  })}
});
function ppMark(){var c=(ST.pp&&ST.pp.cat)||'';qa('#ozRoot .ozPP [data-a=ppCat]').forEach(function(b){var on=(b.dataset.cat||'')===c;b.classList.toggle('sel',on);b.classList.toggle('off',!!b.dataset.off);b.setAttribute('aria-pressed',String(on))})}
function ppLines(pid){return cartGet().filter(function(x){return String(x.product_id)===String(pid)})}
function ppCtrl(p){
  if(p.in_stock===false)return '<button type="button" class="ozPlus" disabled aria-label="Tükendi">+</button>';
  var ls=ppLines(p.id);
  if(ls.length===1)return '<span class="ozPStep" role="group" aria-label="Adet"><button type="button" data-a="ppQty" data-v="'+E(ls[0].variant_id)+'" data-d="-1" aria-label="Azalt">−</button><b>'+num(ls[0].qty)+'</b><button type="button" data-a="ppQty" data-v="'+E(ls[0].variant_id)+'" data-d="1" aria-label="Bir tane daha">+</button></span>';
  var n=ls.reduce(function(k,x){return k+num(x.qty)},0);
  return '<button type="button" class="ozPlus'+(n?' in':'')+'" data-a="ppPlus" data-id="'+E(p.id)+'" aria-label="'+(n?n+' adet sepette, ekle':'Sepete ekle')+'">'+(n||'+')+'</button>';
}
/* K37: kompakt ürün satırı — solda küçük foto, ad, sağda fiyat, altında küçük altın "+" (ana ekran + üretici sayfası) */
function prodRow(p){ST.rows=ST.rows||{};ST.rows[String(p.id)]=p;
  return '<div class="ozPRow" data-pid="'+E(p.id)+'"><button type="button" class="im" data-a="nav" data-k="product" data-id="'+E(p.id)+'" aria-label="'+E(p.name)+'">'+pic(httpsUrl(p.image),p.name)+'</button>'+
    '<button type="button" class="tx" data-a="nav" data-k="product" data-id="'+E(p.id)+'"><b>'+E(p.name)+'</b>'+(p.seller_name?'<small>'+E(p.seller_name)+'</small>':'')+(p.in_stock===false?'<small class="so">Tükendi</small>':'')+'</button>'+
    '<span class="rp"><b>'+TL(p.price_kurus)+'</b><span class="ac">'+ppCtrl(p)+'</span></span></div>'}
function ppRefresh(){var m=ST.rows||{},pl=(ST.pp&&ST.pp.list)||[];qa('#ozRoot [data-pid]').forEach(function(c){var p=m[c.dataset.pid]||pl.filter(function(x){return String(x.id)===c.dataset.pid})[0];var ac=qs('.ac',c);if(p&&ac)ac.innerHTML=ppCtrl(p)});ppBar()}
function ppBar(){stripSync()}
async function ppLoad(t){
  var pp=ST.pp;if(!pp)return;var seq=++pp.seq;var box=D.getElementById('ozPPL');
  var NONE=empty(ico('box',32),'Bu üreticide henüz ürün yok','Diğer kategorilere göz atabilirsin.');
  if(pp.cat&&pp.cnt&&!pp.cnt[pp.cat]){pp.list=[];if(box)box.innerHTML=NONE;return}
  if(box)box.innerHTML=skel(2);
  var p={seller_id:pp.id,limit:24,offset:0,sort:'new'};if(pp.cat)p.category=pp.cat;
  var l;try{l=arr(await rpc('oz_search_products',{p:p}))}catch(e){if(alive(t)&&seq===pp.seq&&(box=D.getElementById('ozPPL')))box.innerHTML=errBox(e);return}
  if(!alive(t)||seq!==pp.seq)return;   /* geç gelen eski istek yeni listeyi ezmez */
  pp.list=l;box=D.getElementById('ozPPL');if(!box)return;
  box.innerHTML=l.length?'<div class="ozRows">'+l.map(function(x){return prodRow(Object.assign({},x,{seller_name:''}))}).join('')+'</div>':NONE;
}
ACT_EXTRA({
  ppCat:function(b){var pp=ST.pp;if(!pp)return;var k=b.dataset.cat||'';pp.cat=pp.cat===k?'':k;var c=cur();c.a=Object.assign({},c.a,{cat:pp.cat});hSync();ppMark();return ppLoad(SCR)},
  ppQty:function(b){var v=b.dataset.v;cartSetQty(v,cartQty(v)+num(b.dataset.d));ppRefresh()},
  /* "+": seçeneksiz (tek seçenekli) ürün doğrudan sepete; birden çok seçenekte (250 g / 500 g / 1 kg…) alt panelde seçtirir.
     Fiyat burada yalnız gösterim; sipariş tutarı sunucuda varyanttan hesaplanır (oz_quote / oz_place_order). */
  ppPlus:async function(b){
    var id=b.dataset.id;
    await busy(b,async function(){
      var d=await rpc('oz_product_detail',{p_id:id});var vs=arr(d&&d.variants).filter(function(v){return v.is_active!==false});
      if(!d||!vs.length){go('product',{id:id});return}
      if(vs.length===1){if(!(num(vs[0].stock)>0)){toast('Bu ürün şu anda stokta yok.');return}ppAddVar(d,vs[0]);return}
      ST.pick={d:d,vs:vs};
      sheet(d.name||'Seçenek seç','<p class="ozMuted" style="margin:0 0 10px">Seçenek seç</p><div class="ozOpts">'+vs.map(function(v){var st=num(v.stock),inC=cartQty(v.id);
        return '<button type="button" class="ozOpt" data-a="ppPick" data-v="'+E(v.id)+'"'+(st>0?'':' disabled')+'><b>'+E(v.label||'Standart')+'</b><span>'+TL(v.price_kurus)+'</span><small>'+(st<=0?'Tükendi':inC?'Sepette '+inC:st<=5?'Son '+st:'')+'</small></button>'}).join('')+'</div>',{noFocus:true});
    });
  },
  ppPick:function(b){var pk=ST.pick;if(!pk)return;var v=pk.vs.filter(function(x){return String(x.id)===b.dataset.v})[0];if(!v)return;closeSheet();ppAddVar(pk.d,v)}
});
function ppAddVar(d,v){
  var have=cartQty(v.id);if(have>=num(v.stock)){toast('Stoktaki tüm adetler sepetinde.');return}
  var sel=d.seller||{};
  cartAdd({variant_id:v.id,product_id:d.id,name:d.name,label:v.label||'',image:arr(d.images)[0]||null,price_kurus:num(v.price_kurus),seller_id:sel.id||null,seller_name:sel.display_name||''},1);
  ppRefresh();toast('Sepete eklendi'+(v.label?': '+v.label:''));
}
/* K30: üretici kartı (oz_producers kaydı). wide: Üreticiler sekmesindeki geniş hâl */
/* K35: üretici kartı — solda logo/baş harf + ad + il·ilçe + puan; sağda 108px akan fotoğraf kutusu (kapak, sonra ürün görselleri) */
function initials(n){var w=String(n||'').trim().split(/\s+/).filter(Boolean);return (w.slice(0,2).map(function(x){return x.charAt(0).toLocaleUpperCase('tr')}).join(''))||'Ü'}
function prdImgs(s){var seen={},out=[];[s.cover_url].concat(arr(s.products).map(function(p){return p&&p.image})).forEach(function(u){u=httpsUrl(u);if(u&&!seen[u]){seen[u]=1;out.push(u)}});return out}
function producerCard(s){
  var nm=String(s.display_name||'Üretici');var loc=[s.city,s.district].filter(Boolean).join(' · ');var lg=httpsUrl(s.logo_url);var ims=prdImgs(s);var ini=E(initials(nm));
  return '<button type="button" class="ozPrd2" data-a="nav" data-k="store" data-id="'+E(s.id)+'" aria-label="'+E(nm)+' üretici sayfası">'+
    '<span class="l"><span class="hd"><span class="lg">'+(lg?'<img src="'+E(lg)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<i aria-hidden="true">'+ini+'</i></span><b>'+E(nm)+'</b></span>'+
      (loc?'<small>'+E(loc)+'</small>':'')+'<span class="rt">'+(num(s.rating_count)?'★ '+NF1.format(num(s.rating_avg))+' <span>('+num(s.rating_count)+')</span>':'<em>Yeni</em>')+'</span>'+
      (num(s.free_ship_over_kurus)?'<span class="fs">'+TL(s.free_ship_over_kurus)+' üzeri kargo ücretsiz</span>':'')+'</span>'+
    '<span class="ozPrdF"><i class="fb" aria-hidden="true">'+(lg?'<img src="'+E(lg)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<span>'+ini+'</span></i>'+
      ims.map(function(u,k){return '<img class="fi'+(k?'':' on')+'" src="'+E(u)+'" alt="" loading="lazy" decoding="async" onerror="ozFadeErr(this)">'}).join('')+
      (num(s.product_count)?'<span class="n">'+num(s.product_count)+' ürün</span>':'')+'</span></button>';
}
/* Çapraz geçiş: 3 sn, kartlar 1 sn kaydırılmış; görünmeyen kartta durur; ekran değişince temizlenir; reduced-motion'da sabit */
var FADE={tm:[],io:null};
function fadeStop(){FADE.tm.forEach(function(x){clearTimeout(x);clearInterval(x)});FADE.tm=[];if(FADE.io){try{FADE.io.disconnect()}catch(e){}FADE.io=null}}
window.ozFadeErr=function(img){var b=img.parentNode;var was=img.classList.contains('on');img.remove();if(was&&b){var n=b.querySelector('img.fi');if(n)n.classList.add('on')}};
function startFade(t){
  fadeStop();var boxes=qa('#ozRoot .ozPrdF').filter(function(b){return qa('img.fi',b).length>1});if(!boxes.length)return;
  try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
  var vis=new Set();
  if('IntersectionObserver' in window){FADE.io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)vis.add(e.target);else vis.delete(e.target)})});boxes.forEach(function(b){FADE.io.observe(b)})}
  else boxes.forEach(function(b){vis.add(b)});
  boxes.forEach(function(b,i){FADE.tm.push(setTimeout(function(){
    FADE.tm.push(setInterval(function(){
      if(!alive(t)||!b.isConnected){fadeStop();return}if(!vis.has(b)||D.hidden)return;
      var im=qa('img.fi',b);if(im.length<2)return;var k=-1;im.forEach(function(x,j){if(x.classList.contains('on'))k=j});
      if(k>=0)im[k].classList.remove('on');im[(k+1)%im.length].classList.add('on');
    },3000))},(i%3)*1000))});
}
async function producersMore(t){
  var pr=ST.pr;var LIM=20;
  var l;try{l=arr(await rpc('oz_producers',{p_limit:LIM,p_offset:pr.off}))}catch(e){if(alive(t)&&!pr.list.length)paint(pageHead('Üreticiler'));return}
  if(!alive(t))return;
  pr.list=pr.list.concat(l);pr.off+=l.length;pr.more=l.length>=LIM;
  paint(pageHead('Üreticiler',pr.list.length?'Ürünlerini doğrudan üreticisinden al':'')+(pr.list.length?'<div class="ozPrds">'+pr.list.map(function(x){return producerCard(x)}).join('')+'</div>'+(pr.more?'<button type="button" class="ozBtn wide" data-a="prMore" style="margin-top:12px">Daha fazla üretici</button>':''):
    empty(ico('store',36),'Henüz üretici yok','Üreticiler katıldıkça burada görünecek.','<button type="button" class="ozBtn pri" data-a="tab" data-k="home">Keşfet\'e dön</button>')));
  startFade(t);
}
ACT_EXTRA({prMore:function(b){return busy(b,function(){return producersMore(SCR)})}});
function searchForm(q){return '<form class="ozSearch" data-sub="search" role="search"><input class="ozIn" id="ozQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Bal, zeytinyağı, reçel ara" aria-label="Ürün ara" value="'+E(q||'')+'"><button type="submit" class="ozBtn pri">'+ico('search',18)+'<span>Ara</span></button></form>'}
/* oz_search_products'ın desteklediği anahtarlar: new, popular, rating, price_asc, price_desc (beşi de destekleniyor) */
var SORTS=[['new','Yeni gelenler'],['popular','Çok satanlar'],['rating','En yüksek puan'],['price_asc','Fiyat ↑'],['price_desc','Fiyat ↓']];
function sortName(k){var x=SORTS.filter(function(s){return s[0]===k})[0];return x?x[1]:''}
/* K37: ana ekranda tek "Sırala" kontrolü */
function sortSel(sort){return '<label class="ozSortSel"><span>Sırala</span><select data-chg="homeSort" aria-label="Sırala">'+SORTS.map(function(s){return '<option value="'+s[0]+'"'+((sort||'new')===s[0]?' selected':'')+'>'+E(s[1])+'</option>'}).join('')+'</select></label>'}
function sortChips(sort){return '<div class="ozChips ozSorts" role="group" aria-label="Sırala">'+SORTS.map(function(s){var on=(sort||'new')===s[0];return '<button type="button" class="ozChip'+(on?' on':'')+'" data-a="sortPick" data-sort="'+s[0]+'" aria-pressed="'+on+'">'+E(s[1])+'</button>'}).join('')+'</div>'}
/* Kategori kutusu: fotoğraf yoksa slug'a göre emoji ve zemin */
var CAT_EMO=[[/bal|recel/,'🍯','#5A4320'],[/zeytin/,'🫒','#3E4A24'],[/kuruyemis|kuru-yemis|meyve/,'🥜','#5A3A22'],[/baharat|bitki|cay/,'🌿','#2F4A33'],[/tahin|pekmez/,'🥣','#56381F'],[/tursu|konserve/,'🥒','#35502F'],[/sabun|bakim/,'🧼','#3B4656'],[/el-emegi|emek|ev-yapimi/,'🧶','#563A4A'],[/icecek|sut/,'🥛','#3B4E5A']];
/* K35: kategori görseli: oz_categories.image_url (yalnız https) → assets/oz-cat/<slug>.jpg → ikon. Görsel yüklenemezse ikon görünür. */
var CAT_IMG={'bal-recel':1,'recel':1,'kuruyemis-meyve':1,'kuru-yemis':1,'baharat-bitki-cay':1,'bitki-cayi':1,'tahin-pekmez':1,'tursu-konserve':1,'konserve':1,'sabun-dogal-bakim':1,'bakim':1,'el-emegi':1,'ev-yapimi':1,'zeytin-zeytinyagi':1,'icecekler':1};
function httpsUrl(u){u=String(u||'');return /^https:\/\//i.test(u)?u:''}
function catImg(slug,url){return httpsUrl(url)||(CAT_IMG[slug]?'assets/oz-cat/'+slug+'.jpg':'')}
function catTile(c,attrs){var sl=String(c.slug||'');var m=CAT_EMO.filter(function(x){return x[0].test(sl)})[0]||[null,'🌿','#3E4A30'];var im=catImg(sl,c.image_url);
  return '<button type="button" class="ozCt" '+(attrs||'data-a="nav" data-k="search" data-cat="'+E(c.slug)+'"')+'><span class="b'+(im?' ph':'')+'" style="background:'+m[2]+'">'+(im?'<img src="'+E(im)+'" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove(\'ph\');this.remove()">':'')+'<i aria-hidden="true">'+m[1]+'</i></span><span class="l">'+E(c.name)+'</span></button>'}
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
    paint(searchForm('')+skel(1)+skel(2));
    /* K37: sıra — sipariş bandı → banner → kategoriler → üreticiler (ilk 3, tam genişlik) → ürünler (kompakt satır, tek "Sırala") */
    var r=await Promise.all([homeData(),rpc('oz_producers',{p_limit:3,p_offset:0}).catch(function(){return null}),loadFavs(),logged()?rpc('oz_my_orders',{p_limit:10,p_offset:0}).catch(function(){return null}):null]);if(!alive(t))return;
    var d=r[0]||{},prErr=r[1]===null,prs=arr(r[1]).slice(0,3);var cats=arr(d.categories);var any=arr(d.newest).length>0;
    ST.prs=prs;
    var h=searchForm('')+heroHtml(prs)+ordBand(arr(r[3]));
    if(cats.length)h+='<div class="ozSecH"><h2>Kategoriler</h2><button type="button" class="ozLink" data-a="catAll">Tümünü gör</button></div><div class="ozCts" role="list" aria-label="Kategoriler">'+cats.map(function(c){return catTile(c)}).join('')+'</div>';
    /* K35: Üreticiler şeridi — hata olursa sessizce gizli; boşsa nazik metin */
    if(prs.length)h+='<div class="ozSecH"><h2>Üreticiler</h2><button type="button" class="ozLink" data-a="tab" data-k="producers">Tümü</button></div><div class="ozPrds ozPrds3">'+prs.map(function(x){return producerCard(x)}).join('')+'</div>';
    else if(!prErr&&any)h+='<div class="ozSecH"><h2>Üreticiler</h2></div><p class="ozMuted" style="margin:0">Henüz üretici yok.</p>';
    if(!any&&!prs.length){
      h+=empty(ico('leaf',36),'Doğal ürünler yolda','Üreticiler ürünlerini ekledikçe burada görünecek.',S().seller_signup_enabled?'<button type="button" class="ozBtn pri" data-a="nav" data-k="seller">Üretici misin? Satıcı ol</button>':'');
      paint(h);startHero(t);return;
    }
    var sort=a.sort||'new';
    if(any)h+='<div class="ozSecH"><h2>Ürünler</h2>'+sortSel(sort)+'</div><div id="ozRes">'+skel(2)+'</div>';
    paint(h);startHero(t);startFade(t);
    if(any){ST.sr={a:{sort:sort},list:[],offset:0,more:false,rows:1};await searchMore(t)}
  },

  /* ====================== Alıcı · arama ve listeleme ====================== */
  search:async function(a,t){
    var q=a.q||'',cat=a.cat||'',sort=a.sort||'new';
    var d=null;try{d=await homeData()}catch(e){}
    if(!alive(t))return;
    var cats=arr(d&&d.categories);var cn=(cats.filter(function(c){return c.slug===cat})[0]||{}).name||cat;
    var applied=(q?'<button type="button" class="ozChip on x" data-a="srchClear" data-f="q" aria-label="Arama filtresini kaldır: '+E(q)+'">“'+E(q)+'” ✕</button>':'')+
      (cat?'<button type="button" class="ozChip on x" data-a="srchClear" data-f="cat" aria-label="Kategori filtresini kaldır: '+E(cn)+'">'+E(cn)+' ✕</button>':'')+
      (sort!=='new'?'<button type="button" class="ozChip on x" data-a="srchClear" data-f="sort" aria-label="Sıralamayı kaldır: '+E(sortName(sort))+'">'+E(sortName(sort))+' ✕</button>':'');
    var head=searchForm(q)+(applied?'<div class="ozWrap ozApplied" aria-label="Uygulanan seçimler">'+applied+'</div>':'')+
      (cats.length&&!cat?'<div class="ozChips" role="group" aria-label="Kategori">'+cats.map(function(c){return '<button type="button" class="ozChip" data-a="srchCat" data-cat="'+E(c.slug)+'">'+E(c.name)+'</button>'}).join('')+'</div>':'')+sortChips(sort);
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
  /* K35: üretici sayfası — oz_producer_detail + oz_search_products({seller_id,category}); sepet mevcut fonksiyonlarla */
  store:async function(a,t){
    paint(skel(1)+skel(2));
    var r=await Promise.all([rpc('oz_producer_detail',{p_id:a.id}).catch(function(){return null}),homeData().catch(function(){return null})]);var d=r[0];
    if(!alive(t))return;
    if(!d||!d.id){paint(empty(ico('store',36),'Üretici bulunamadı','Bu mağaza şu anda yayında değil.','<button type="button" class="ozBtn" data-a="nav" data-k="home">Ana ekrana dön</button>'));return}
    /* K37: tüm kategoriler (ana ekran sırası); üreticinin olanlar sayılı ve belirgin */
    var cnt={};arr(d.categories).forEach(function(c){cnt[c.slug]=num(c.count)});
    ST.pp={id:d.id,cat:a.cat||'',seq:0,list:[],cnt:cnt};
    paint(ppHtml(d,arr(r[1]&&r[1].categories)));ppMark();ppBar();
    await ppLoad(t);
  },

  /* ====================== K30: Alıcı · üreticiler (oz_producers) ====================== */
  producers:async function(a,t){
    paint(pageHead('Üreticiler')+skel(2));
    ST.pr={list:[],off:0,more:false};
    await producersMore(t);
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
      row('heart','Favorilerim','Kaydettiğin ürünler','nav',{k:'favs'})+
      row('pin','Adreslerim','Teslimat adreslerini yönet','nav',{k:'addresses'})+
      sellerRow+
      (s.is_admin?row('leaf','Özüne Dön yönetimi','Satıcı, ürün, sipariş ve ayarlar','admin'):'')+
      row('home','İşimi Çöz ana sayfası','Ana platforma dön','exit')+'</div>');
    newDotSync();
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
    box.innerHTML=sr.list.length?'<p class="ozMuted" style="margin:0 0 8px">'+sr.list.length+(sr.more?'+':'')+' ürün</p>'+(sr.rows?'<div class="ozRows">'+sr.list.map(prodRow).join('')+'</div>':'<div class="ozGrid">'+sr.list.map(card).join('')+'</div>')+(sr.more?'<button type="button" class="ozBtn wide" id="ozMore" data-a="more" style="margin-top:12px">Daha fazla göster</button>':''):
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
/* K30: birim fiyat — yalnızca miktar kesin biliniyorsa. Kaynak: seçenek adı ("500 g", "1 L") ya da tek seçenekli üründe net miktar.
   weight_g KULLANILMAZ: kargo ağırlığıdır (ambalaj dahil), net miktar değildir. Biçim tam eşleşmezse gösterilmez. */
function qtyOf(txt){var m=/^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gram|kg|kilo|ml|l|lt|litre)\s*$/i.exec(String(txt||''));if(!m)return null;var n=Number(m[1].replace(',','.'));if(!(n>0))return null;var u=m[2].toLowerCase();
  if(u==='g'||u==='gr'||u==='gram')return {q:n/1000,u:'kg'};if(u==='kg'||u==='kilo')return {q:n,u:'kg'};if(u==='ml')return {q:n/1000,u:'L'};return {q:n,u:'L'}}
function unitPrice(p,v){var vs=arr(p.variants);var q=qtyOf(v.label)||(vs.length===1?qtyOf(p.net_content):null);if(!q||!(num(v.price_kurus)>0))return '';
  var k=Math.round(num(v.price_kurus)/q.q);if(Math.abs(q.q-1)<1e-9)return '';return '≈ '+TL(k)+'/'+q.u}

/* K27: organik / menşe / sertifika bilgileri satıcı beyanıdır */
var CLAIM='<span class="ozClaim">Satıcı beyanı – platform tarafından doğrulanmadı</span>';
/* A1: sepette ürün varsa alt çubukta kalıcı yeşil sepet düğmesi + adet rozeti */
function cartBtnH(){var n=cartCount();return n?'<button type="button" class="ozCartB" data-a="nav" data-k="cart" aria-label="Sepete git, '+n+' ürün">'+ico('cart',22)+'<span class="n">'+(n>99?'99+':n)+'</span></button>':''}
function renderProduct(){
  var pd=ST.pd;if(!pd)return;var p=pd.p;var vs=arr(p.variants);
  var v=vs.filter(function(x){return x.id===pd.sel})[0]||null;
  var stock=v?num(v.stock):0;var inCart=v?cartQty(v.id):0;var maxQ=Math.max(0,Math.min(99,stock-inCart));
  if(pd.qty>maxQ)pd.qty=Math.max(1,maxQ);
  var imgs=arr(p.images);var sel=p.seller||{};var price=v?num(v.price_kurus):0,cmp=v?num(v.compare_at_kurus):0;
  /* K37: ana foto 260px (4:3, cover) + altında küçük önizleme şeridi */
  var gal='<div class="ozGalW pd"><div class="ozGal" id="ozGal" aria-label="Ürün görselleri">'+(imgs.length?imgs.map(function(u,i){return pic(u,p.name+' '+(i+1))}).join(''):pic('',p.name))+'</div>'+
    (imgs.length>1?'<span class="ozGalN" id="ozGalN">1 / '+imgs.length+'</span>':'')+favBtn(p.id,isFav(p.id))+'</div>'+(imgs.length>1?'<div class="ozThumbs" id="ozGalD">'+imgs.map(function(u,i){return '<button type="button" class="'+(i?'':'on')+'" data-a="galGo" data-i="'+i+'" aria-label="'+(i+1)+'. görsel">'+pic(u,'')+'</button>'}).join('')+'</div>':'');
  var lg=httpsUrl(sel.logo_url);
  var chipP=sel.id?'<button type="button" class="ozPChip" data-a="nav" data-k="store" data-id="'+E(sel.id)+'"><span class="lg">'+(lg?'<img src="'+E(lg)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<i aria-hidden="true">'+E(initials(sel.display_name))+'</i></span><b>'+E(sel.display_name||'Üretici')+'</b><span aria-hidden="true">›</span></button>':'';
  /* B3: adın yanında yıldız + sayı; dokununca değerlendirmeler alt panelde (son 20) */
  var rcP=num(p.rating_count);
  var info='<div class="ozPNm"><h1 class="ozPName">'+E(p.name)+'</h1>'+(rcP?'<button type="button" class="ozRtB" data-a="pdRev" aria-label="'+rcP+' değerlendirmeyi gör"><b>★ '+num(p.rating_avg).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})+'</b><small>('+rcP+')</small></button>':'')+'</div>'+chipP+
    '<div class="ozMuted">'+[p.origin_city?'📍 '+E(p.origin_city):'',num(p.sold_count)?num(p.sold_count)+' satıldı':''].filter(Boolean).join(' · ')+'</div>'+
    '<div class="ozPrice">'+(v?'<b>'+TL(price)+'</b>'+(cmp>price?'<s>'+TL(cmp)+'</s>':''):'—')+'</div>'+(v&&unitPrice(p,v)?'<p class="ozUnit">'+unitPrice(p,v)+'</p>':'');
  /* B2: tek seçenekte seçim kutusu yok (etiketi alt çubukta) */
  var vars=vs.length>1?'<div class="ozVars" role="radiogroup" aria-label="Seçenek">'+vs.map(function(x){var out=num(x.stock)<=0;return '<button type="button" class="ozVar'+(x.id===pd.sel?' on':'')+'" role="radio" aria-checked="'+(x.id===pd.sel)+'" data-a="pickVar" data-id="'+E(x.id)+'"'+(out?' disabled':'')+'>'+E(x.label||'Standart')+'<small>'+(out?'Tükendi':TL(x.price_kurus))+'</small></button>'}).join('')+'</div>':'';
  /* K30: stok bilgisi içerikte, satın alma sabit alt çubukta (seçili seçenek + fiyat + adet + buton) */
  var buy=!v||stock<=0?'<div class="ozWarn">Bu ürün şu anda stokta yok.</div>':
    (maxQ<=0?'<div class="ozWarn">Stoktaki tüm adetler sepetinde.</div>':'<div class="ozQty"><span class="ozMuted">Adet</span><div class="ozStep" role="group" aria-label="Adet"><button type="button" data-a="pdQty" data-d="-1" aria-label="Azalt"'+(pd.qty<=1?' disabled':'')+'>−</button><b aria-live="polite">'+pd.qty+'</b><button type="button" data-a="pdQty" data-d="1" aria-label="Artır"'+(pd.qty>=maxQ?' disabled':'')+'>+</button></div>'+(stock<=5?'<span class="ozMuted">Son '+stock+' adet</span>':'')+'</div>')+(inCart&&v&&stock>0?'<p class="ozMuted" style="margin:0 0 10px">Sepetinde '+inCart+' adet var.</p>':'');
  var bar='<div class="ozBuyBar" role="region" aria-label="Satın al"><div class="tx"><small>'+E(v?(v.label||'Standart'):'')+'</small><b>'+(v?TL(price):'—')+'</b></div>'+
    (!v||stock<=0?'<button type="button" class="ozBtn" disabled>Stokta yok</button>':
    maxQ<=0?'<button type="button" class="ozBtn pri" data-a="nav" data-k="cart">Sepete git</button>':
    '<button type="button" class="ozBtn pri" data-a="addCart">Sepete ekle'+(pd.qty>1?' ('+pd.qty+')':'')+'</button>')+cartBtnH()+'</div>';
  var ship='<p class="ozShipN">'+ico('truck',16)+'<span>'+(num(sel.handling_days)?num(sel.handling_days)+' iş günü içinde kargoya verilir':'Kargoya veriliş süresi satıcıya göre değişir')+(num(sel.free_ship_over_kurus)?' · '+TL(sel.free_ship_over_kurus)+' ve üzeri kargo bedava':'')+'</span></p>';
  /* B1: foto ve fiyatın hemen altında tek "Özellikler" kartı (hep açık, iki sütun, boşlar gizli); açıklama 3 satır + Devamı */
  var alg=arr(p.allergens);var fe=[];
  if(p.net_content)fe.push(['Net miktar',E(p.net_content)]);
  if(p.origin_city||p.origin_note)fe.push(['Menşe',E(p.origin_city||'')+(p.origin_note?(p.origin_city?'<br>':'')+'<span class="ozMuted">'+E(p.origin_note)+'</span>':'')]);
  if(num(p.shelf_life_days))fe.push(['Raf ömrü',num(p.shelf_life_days)+' gün']);
  if(p.storage_info)fe.push(['Saklama',E(p.storage_info)]);
  if(p.ingredients)fe.push(['İçindekiler',E(p.ingredients)]);
  if(alg.length)fe.push(['Alerjen',alg.map(function(x){return '<span class="ozTag warn">'+E(algLabel(x))+'</span>'}).join(' ')]);
  if(p.category&&p.category.name)fe.push(['Kategori',E(p.category.name)]);
  if(v&&num(v.weight_g))fe.push(['Kargo ağırlığı',NF1.format(num(v.weight_g)/1000)+' kg']);
  if(p.organic_cert)fe.push(['Organik sertifika',E(p.organic_cert)]);
  var feH=fe.length?'<div class="ozCard ozFeat"><h3>Özellikler</h3><dl class="ozKV">'+fe.map(function(x){return '<dt>'+E(x[0])+'</dt><dd>'+x[1]+'</dd>'}).join('')+'</dl>'+
    ((p.origin_city||p.origin_note||p.organic_cert)?'<p class="ozFeatN">'+CLAIM+'</p>':'')+'</div>':'';
  var dsc=String(p.description||'');
  var descH=dsc?'<div class="ozDesc"><p class="ozStory'+(dsc.length>140?' ozClamp ozC3':'')+'" id="ozStory">'+E(dsc)+'</p>'+(dsc.length>140?'<button type="button" class="ozLink" data-a="storyMore" aria-controls="ozStory" aria-expanded="false">Devamı</button>':'')+'</div>':'';
  /* K37: büyük üretici kutusu yerine üstte çip; altta "Üreticinin diğer ürünleri" */
  var moreH=sel.id?'<div id="ozPDMore"></div>':'';
  var revH='';
  var qs_=arr(p.questions);
  /* B4: tek satır; dokununca alt panelde liste + "Soru sor" */
  var qH='<button type="button" class="ozRowBtn ozQaRow" data-a="pdQa"><span class="ic">'+ico('bell',20)+'</span><span class="tx"><b>Soru ve cevaplar ('+qs_.length+')</b></span><span class="ch" aria-hidden="true">›</span></button>';
  paint(gal+info+feH+descH+vars+buy+ship+revH+qH+moreH+bar);
  var g=D.getElementById('ozGal'),n=D.getElementById('ozGalN');
  var gd=D.getElementById('ozGalD');if(g&&gd)g.addEventListener('scroll',function(){var i=Math.round(g.scrollLeft/Math.max(1,g.clientWidth));qa('button',gd).forEach(function(x,j){x.classList.toggle('on',i===j)})},{passive:true});
  if(sel.id)pdMore(pd,sel);
  if(g&&n)g.addEventListener('scroll',function(){var i=Math.round(g.scrollLeft/Math.max(1,g.clientWidth));n.textContent=(i+1)+' / '+imgs.length},{passive:true});
}
/* K37: üreticinin diğer ürünleri — bir kez yüklenir (seçenek değişince yeniden istek atılmaz) */
function pdMoreHtml(pd,sel){var l=pd.more||[];return l.length?'<div class="ozSecH"><h2>Üreticinin diğer ürünleri</h2><button type="button" class="ozLink" data-a="nav" data-k="store" data-id="'+E(sel.id)+'">Tümü</button></div><div class="ozRail">'+l.map(card).join('')+'</div>':''}
async function pdMore(pd,sel){
  var box=D.getElementById('ozPDMore');if(!box)return;
  if(pd.more){box.innerHTML=pdMoreHtml(pd,sel);return}
  var l;try{l=arr(await rpc('oz_search_products',{p:{seller_id:sel.id,limit:9,offset:0,sort:'new'}}))}catch(e){return}
  if(!alive(pd.t)||ST.pd!==pd)return;
  pd.more=l.filter(function(x){return String(x.id)!==String(pd.p.id)}).slice(0,8);
  box=D.getElementById('ozPDMore');if(box)box.innerHTML=pdMoreHtml(pd,sel);
}
ACT_EXTRA({
  pdQa:function(){var pd=ST.pd;if(!pd)return;var l=arr(pd.p.questions);
    sheet('Soru ve cevaplar ('+l.length+')',(l.length?l.map(function(q){return '<div class="ozRev"><div class="h"><span>Soru</span><span>'+E(fmtDay(q.created_at))+'</span></div><p><b>'+E(q.question)+'</b></p>'+(q.answer?'<div class="ozReply"><b>Üretici:</b> '+E(q.answer)+'</div>':'<p class="ozMuted">Üreticinin cevabı bekleniyor.</p>')+'</div>'}).join(''):'<p class="ozMuted">Henüz soru sorulmamış.</p>')+
      '<button type="button" class="ozBtn pri wide" data-a="ask" style="margin-top:12px">Soru sor</button>',{noFocus:true})},
  pdRev:function(){var pd=ST.pd;if(!pd)return;var l=arr(pd.p.reviews).slice(0,20);
    sheet('Değerlendirmeler ('+num(pd.p.rating_count)+')',(l.length?l.map(revHtml).join(''):'<p class="ozMuted">Henüz yorum yazılmamış.</p>')+'<p class="ozHint" style="margin:10px 0 0">Değerlendirmeyi yalnız teslim aldığı siparişten alıcılar yazabilir.</p>',{noFocus:true})},
  galGo:function(b){var g=D.getElementById('ozGal');if(!g)return;var i=num(b.dataset.i);try{g.scrollTo({left:i*g.clientWidth,behavior:'smooth'})}catch(e){g.scrollLeft=i*g.clientWidth}},
  sortGo:function(b){go('search',{sort:b.dataset.sort})},
  sortPick:function(b){var c=cur();c.a=Object.assign({},c.a,{sort:b.dataset.sort});
    if(c.k==='home'){qa('.ozSorts .ozChip').forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on))});hSync();ST.sr={a:{sort:b.dataset.sort},list:[],offset:0,more:false};var r=D.getElementById('ozRes');if(r)r.innerHTML=skel(2);return searchMore(SCR)}
    draw()},
  srchClear:function(b){var c=cur();var a=Object.assign({},c.a);if(b.dataset.f==='q')a.q='';else if(b.dataset.f==='cat')a.cat='';else a.sort='new';c.a=a;draw()},
  storyMore:function(b){var p=D.getElementById('ozStory');if(!p)return;var o=p.classList.toggle('ozClamp');b.textContent=o?'Devamı':'Daha az';b.setAttribute('aria-expanded',String(!o))},
  catAll:async function(){var d=await homeData();sheet('Kategoriler','<div class="ozCtGrid">'+arr(d&&d.categories).map(function(c){return catTile(c)}).join('')+'</div>',{noFocus:true})},
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
    if(c.length&&logged()){await coLoad(t,'Sepetim');return}  /* A3: girişliyken sepet = tek ekran ödeme */
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
    await coLoad(t,'Siparişi tamamla');
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
    paint(pageHead('Siparişlerim')+ordTabs(a.tab||'active')+skel(3,'line'));
    ST.ol={list:[],off:0,more:false,tab:a.tab||'active'};ST.rvd={};
    await ordersMore(t);
  },
  order:async function(a,t){
    if(!logged()){paint(pageHead('Sipariş')+loginWall());return}
    paint(skel(1,'line')+skel(2));
    var d=await rpc('oz_order_detail',{p_order:a.id});
    if(!alive(t))return;
    if(!d||!d.order){paint(empty(ico('box',36),'Sipariş bulunamadı','','<button type="button" class="ozBtn" data-a="nav" data-k="orders">Siparişlerim</button>'));return}
    ST.od=d;paint(orderDetailHtml(d));
    /* Siparişlerim kartındaki "Kargoyu takip et" / "Değerlendir" buradaki ilgili karta götürür */
    if(a.focus){var fe=D.getElementById(a.focus==='trk'?'ozTrkC':'ozRateC');if(fe)try{fe.scrollIntoView({block:'start'})}catch(e){}}
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
/* Ödeme adımı TEK yerde: bugün yalnız deneme (mock) ödemesi. Gerçek ödeme sağlayıcısı geldiğinde yalnız bu fonksiyon değişir.
   Dönüş: {ok, skipped}. Hata fırlatmaz; başarısız sipariş "Ödeme bekleniyor" kalır, detayda "Ödemeyi tamamla" ile tekrar denenir. */
async function payOrders(os,method){
  var s=S();if(method!=='mock'||!s.payment_mock)return {ok:false,skipped:true};
  var ok=true;
  for(var i=0;i<os.length;i++){var o=os[i];if(o.status&&o.status!=='awaiting_payment')continue;
    try{await rpc('oz_mock_pay',{p_order:o.id});o.status='new'}catch(e){ok=false}}
  return {ok:ok,skipped:false};
}
/* A3: tek ekran ödeme yükleyici (Sepet sekmesi ve checkout ortak) */
async function coLoad(t,title){
  paint(pageHead(title)+skel(3,'line'));
  var r=await Promise.all([rpc('oz_quote',{p_items:cartItemsParam()}).catch(function(e){return {__err:e}}),get('oz_addresses?select=*&order=is_default.desc,created_at.desc'),loadSettings(true)]);
  if(!alive(t))return;
  if(!ST.crid)ST.crid=uuid();
  var adr=arr(r[1]);
  /* A6: üretici kargo eşiği / en az sipariş (gösterim için oz_producer_detail; kural sunucuda) */
  ST.sinfo=ST.sinfo||{};var need=arr(r[0]&&r[0].groups).map(function(g){return g.seller_id}).filter(function(id){return id&&!ST.sinfo[id]});
  if(need.length){var ds=await Promise.all(need.map(function(id){return rpc('oz_producer_detail',{p_id:id}).catch(function(){return null})}));if(!alive(t))return;need.forEach(function(id,i){if(ds[i])ST.sinfo[id]=ds[i]})}
  ST.co=ST.co||{};ST.co.title=title;ST.co.qe=r[0]&&r[0].__err||null;ST.co.q=ST.co.qe?null:r[0];ST.co.addrs=adr;
  if(!ST.co.addr||!adr.some(function(x){return x.id===ST.co.addr}))ST.co.addr=(adr.filter(function(x){return x.is_default})[0]||adr[0]||{}).id||null;
  var s=S();var pays=[];if(s.payment_mock)pays.push('mock');if(s.cod)pays.push('cod');
  if(pays.indexOf(ST.co.pay)<0)ST.co.pay=pays[0]||null;
  drawCheckout();
}
function freeHint(g){var si=(ST.sinfo||{})[g.seller_id]||{};var fo=num(si.free_ship_over_kurus);if(!fo)return '';var sub=num(g.subtotal_kurus);
  return '<p class="ozFreeH">'+TL(fo)+' üzeri kargo ücretsiz'+(sub<fo&&num(g.shipping_kurus)?' · '+TL(fo-sub)+' daha ekle':'')+'</p>'}
/* en az sipariş: sunucu toplam ara tutarı genel ayarla karşılaştırır; burada yalnız uyarı ve buton pasifleştirme */
function minInfo(q,groups){if(!q)return '';var s=S();var g0=groups[0]||{};var si=(ST.sinfo||{})[g0.seller_id]||{};var min=num(s.min_order_kurus)||num(si.min_order_kurus);var sub=num(q.subtotal_kurus);
  if(!min||sub>=min||!sub)return '';return (groups.length===1?'Bu üreticiden en az '+TL(min)+' sipariş verebilirsin, ':'En az sipariş tutarı '+TL(min)+'; ')+TL(min-sub)+' daha ekle.'}
function coKeep(){var co=ST.co;if(!co)return;var n=D.getElementById('ozCoNote');if(n)co.note=n.value;coReadTerms()}
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
/* A3: tek onay kutusu üç belgeyi kapsar; sunucu sipariş eklenirken üç belge için ayrı onay kaydını tutmaya devam eder (terms:true) */
function termsOk(co){return !!(co&&co.agree)}
function coReadTerms(){var co=ST.co;if(!co)return;var el=D.getElementById('ozTAll');if(el)co.agree=el.checked}
function coWhy(co){var r=co.reasons||[];if(!termsOk(co))r=r.concat(['Devam etmek için sözleşme onayını işaretle.']);return r[0]||''}
function coSyncBtn(){var b=D.getElementById('ozPlace');if(b&&ST.co&&!ST.placing){var w=coWhy(ST.co);b.disabled=!!w;var y=D.getElementById('ozPlaceWhy');if(y){y.textContent=w;y.hidden=!w}}}
/* Mükerrer sipariş: BİRİNCİL yol sunucunun {duplicate:true} yanıtı (aynı client_request_id). Bu fonksiyon yalnızca YEDEK:
   eşzamanlı iki istekte oz_orders_client_request_id_seller_id_key benzersizlik ihlali. Başka benzersizlik hataları (ör. order_no) mükerrer SAYILMAZ. */
function isDupErr(e){var m=String(e&&e.message||'');return /client_request_id/i.test(m)&&(/duplicate key|unique/i.test(m)||!!(e&&e.code==='23505'))}
function dupDone(){cartSet([]);ST.crid=null;ST.co=null;ST.staleSeq=HSEQ;ST.staleUsed=true;toast('Bu sipariş zaten alındı, Siparişlerim\'den kontrol et.');NAV=NAV.filter(function(x){return x.k!=='checkout'&&x.k!=='cart'});go('orders',{})}
function drawCheckout(){
  var co=ST.co;var q=co.q||{};var s=S();var c=cartGet();
  var pays=[];if(s.payment_mock)pays.push('mock');if(s.cod)pays.push('cod');
  var groups=arr(q.groups);var issues=arr(q.issues);
  var byV={};groups.forEach(function(g){arr(g.items).forEach(function(it){byV[it.variant_id]=it})});
  var orphan=co.q?c.filter(function(x){return !byV[x.variant_id]}):[];
  /* sepet ürünleri: adet −/+ ve kaldır (üretici başına) */
  var itH=groups.map(function(g){return '<div class="ozCard ozCoG"><div class="ozRow2" style="justify-content:space-between"><b>'+E(g.seller_name||'Üretici')+'</b>'+(num(g.handling_days)?'<span class="ozMuted">'+num(g.handling_days)+' iş gününde kargoda</span>':'')+'</div>'+
    arr(g.items).map(function(it){return cartLine(it,num(it.stock))}).join('')+
    '<div class="ozLine"><span class="m">Ürünler</span><span>'+TL(g.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo ücreti</span><span>'+(num(g.shipping_kurus)?TL(g.shipping_kurus):'Bedava')+'</span></div>'+freeHint(g)+'</div>'}).join('');
  if(orphan.length)itH+='<div class="ozCard"><b>Satışta olmayan ürünler</b>'+orphan.map(function(x){return cartLine({variant_id:x.variant_id,product_id:x.product_id,name:x.name,label:x.label,image:x.image,unit_price_kurus:x.price_kurus,qty:x.qty,line_total_kurus:x.price_kurus*x.qty,issue:'Bu ürün artık satışta değil; sepetten çıkar.'},0)}).join('')+'</div>';
  if(!co.q)itH+=(co.qe?errBox(co.qe):'')+'<div class="ozCard">'+c.map(function(x){return cartLine({variant_id:x.variant_id,product_id:x.product_id,name:x.name,label:x.label,image:x.image,unit_price_kurus:x.price_kurus,qty:x.qty,line_total_kurus:x.price_kurus*x.qty},99)}).join('')+'</div>';
  /* teslimat adresi: seçili adres + Değiştir / Ekle */
  var ad=co.addrs.filter(function(x){return x.id===co.addr})[0];
  var adrH='<div class="ozCard"><div class="ozRow2" style="justify-content:space-between"><h3 style="margin:0">Teslimat adresi</h3>'+(co.addrs.length?'<button type="button" class="ozLink" data-a="coAddrSheet" style="min-height:44px">'+(co.addrs.length>1?'Değiştir':'Değiştir / ekle')+'</button>':'')+'</div>'+
    (ad?'<p style="margin:6px 0 0"><b>'+E(ad.title||'Adres')+' · '+E(ad.recipient||'')+'</b></p><p class="ozMuted" style="margin:2px 0 0">'+E(addrText(ad))+'</p>':'<p class="ozMuted" style="margin:6px 0 8px">Kayıtlı adresin yok.</p><button type="button" class="ozBtn sm pri" data-a="addrNew" data-co="1">Adres ekle</button>')+'</div>';
  /* ödeme yöntemi: birden fazlaysa seçim, tekse kısa bilgi */
  var payH=!pays.length?'<div class="ozWarn">Ödeme yöntemi çok yakında.</div>':pays.length===1?'<p class="ozMuted ozPayL">Ödeme: <b>'+E(PAYM[pays[0]])+'</b>'+(pays[0]==='mock'?' · gerçek para çekilmez':'')+'</p>':
    '<div class="ozCard"><h3>Ödeme yöntemi</h3>'+pays.map(function(p){var on=p===co.pay;return '<label class="ozPick'+(on?' on':'')+'"><input type="radio" name="ozPay" value="'+p+'" data-chg="coPay"'+(on?' checked':'')+'><span class="tx"><b>'+E(PAYM[p])+'</b><small>'+(p==='mock'?'Gerçek para çekilmez; yalnızca deneme içindir.':'Ödemeyi ürünü teslim alırken kargo görevlisine yaparsın.')+'</small></span></label>'}).join('')+'</div>';
  var noteH='<div class="ozCard"><label class="ozMuted" for="ozCoNote" style="display:block;margin:0 0 6px">Sipariş notu (isteğe bağlı)</label><textarea class="ozTa" id="ozCoNote" maxlength="300" style="min-height:56px" placeholder="Örn. Zile basmayın">'+E(co.note||'')+'</textarea></div>';
  var consH='<div class="ozCons1"><label class="ozChk"><input type="checkbox" id="ozTAll" data-chg="coTerms"'+(co.agree?' checked':'')+'><span>Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu ve iade/iptal koşullarını okudum, onaylıyorum.</span></label>'+
    '<div class="lk">'+CONSENTS.map(function(c2){return '<button type="button" class="ozLink" data-a="legal" data-t="'+c2[0]+'" aria-label="'+E(c2[2])+' metnini oku">Oku: '+E(c2[2])+'</button>'}).join('')+'</div></div>';
  var reasons=[];
  if(!c.length)reasons.push('Sepetin boş.');
  if(s.orders_enabled===false)reasons.push('Sipariş alımı geçici olarak kapalı.');
  if(!co.q)reasons.push('Sepet tutarı hesaplanamadı; sayfayı yenile.');
  if(issues.length||orphan.length||groups.some(function(g){return arr(g.items).some(function(it){return it.issue})}))reasons.push('Sepetteki sorunlu ürünleri düzelt.');
  if(!pays.length)reasons.push('Ödeme yöntemi çok yakında.');
  if(!co.addr)reasons.push('Teslimat adresi ekle.');
  var mn=minInfo(q,groups);if(mn)reasons.unshift(mn);
  co.reasons=reasons;co.blocked=reasons.length>0;
  var why=coWhy(co);
  paint('<div class="ozCo"><div class="ozCoMain">'+pageHead(co.title||'Sepetim',cartCount()+' ürün')+itH+
    (issues.length?'<div class="ozWarn">'+issues.map(function(i){return '<div>'+E(typeof i==='string'?(i==='unavailable'?'Bazı ürünler artık satışta değil.':i):(i.message||''))+'</div>'}).join('')+'</div>':'')+
    (mn?'<div class="ozWarn ozMinW">'+E(mn)+'</div>':'')+adrH+payH+noteH+consH+
    '</div><div class="ozCoBar"><div class="ozLine"><span class="m">Ürünler</span><span>'+TL(q.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(q.shipping_kurus)?TL(q.shipping_kurus):'Bedava')+'</span></div><div class="ozLine tot"><span>Toplam</span><span>'+TL(q.total_kurus)+'</span></div>'+
    '<p class="ozWhy" id="ozPlaceWhy" role="status"'+(why?'':' hidden')+'>'+E(why)+'</p>'+
    '<button type="button" class="ozBtn pri" id="ozPlace" data-a="place"'+(why?' disabled':'')+'>Siparişi onayla ve öde</button></div></div>');
}
/* K37: ana ekran sipariş bandı — yalnız aktif sipariş varsa */
function ordBand(l){var a=l.filter(function(o){return ordTab(o.status)==='active'});if(!a.length)return '';var o=a[0],n=a.length;
  /* "Siparişini izle": slider'ın hemen altında, altın vurgulu; tek siparişte takip ekranı, birden fazlada Siparişlerim/Aktif */
  var at=n>1?'data-k="orders" data-tab="active"':'data-k="order" data-id="'+E(o.id)+'"'+(o.status==='shipped'?' data-focus="trk"':'');
  return '<button type="button" class="ozOBand" data-a="nav" '+at+'>'+ico('truck',22)+'<span class="tx"><b>'+(n>1?n+' aktif siparişin var':'Siparişini izle')+'</b><small>'+(n>1?'Siparişlerime git':E((ORDER_ST[o.status]||[o.status])[0])+' · '+E(o.order_no||''))+'</small></span><span aria-hidden="true">›</span></button>'}
/* K30: Siparişlerim sekmeleri (oz_my_orders durum filtresi almaz; ayrım istemcide) */
var ORD_TABS=[['active','Aktif',['awaiting_payment','new','accepted','packed','shipped']],['done','Teslim edilen',['delivered','completed']],['ret','İade/İptal',['cancelled','return_requested','returned','refund_pending','refunded']]];
function ordTab(st){for(var i=0;i<ORD_TABS.length;i++)if(ORD_TABS[i][2].indexOf(st)>=0)return ORD_TABS[i][0];return 'active'}
function ordTabs(tab){return '<div class="ozTabs" role="tablist" aria-label="Sipariş durumu">'+ORD_TABS.map(function(x){var on=x[0]===tab;return '<button type="button" role="tab" class="ozChip'+(on?' on':'')+'" aria-selected="'+on+'" data-a="ordTab" data-tab="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'}
/* Sipariş kalemi: oz_order_detail ham satır döndürür (product_name, variant_label, quantity, image_url),
   oz_my_orders / oz_seller_orders kısa ad (name, label, qty, image) — liste, detay ve satıcı kartı hep buradan okur */
function ordItems(l){return arr(l).map(function(it){it=it||{};var q=num(it.qty!=null?it.qty:it.quantity),u=num(it.unit_price_kurus);
  return {product_id:it.product_id||null,variant_id:it.variant_id||null,name:it.name||it.product_name||'Ürün',label:it.label||it.variant_label||'',qty:q,image:it.image||it.image_url||'',unit_price_kurus:u,line_total_kurus:num(it.line_total_kurus)||u*q}})}
/* Siparişlerim kartında duruma göre TEK aksiyon (kart tıklamasından ayrı düğme) */
function ordAct(o){var id=E(o.id),st=o.status;
  if(st==='awaiting_payment'||st==='new')return '<button type="button" class="ozBtn sm bad" data-a="ordCancel" data-id="'+id+'" data-no="'+E(o.order_no||'')+'">İptal et</button>';
  if(st==='shipped')return '<button type="button" class="ozBtn sm sun" data-a="nav" data-k="order" data-id="'+id+'" data-focus="trk">Kargoyu takip et</button>';
  if(st==='delivered'||st==='completed'){var rv=ST.rvd&&ST.rvd[o.id];return rv==='all'?'<button type="button" class="ozBtn sm" disabled>Değerlendirildi</button>':'<button type="button" class="ozBtn sm pri" data-a="nav" data-k="order" data-id="'+id+'" data-focus="rate">Değerlendir</button>'}
  return '';
}
function ordCard(o){var its=ordItems(o.items);var act=ordAct(o);
  return '<div class="ozOrd" role="button" tabindex="0" data-a="nav" data-k="order" data-id="'+E(o.id)+'" data-oid="'+E(o.id)+'"><span class="h"><b>'+E(o.seller_name||'Üretici')+'</b>'+stTag(ORDER_ST,o.status)+'</span>'+
    progMini(o.status)+'<span class="th">'+its.slice(0,4).map(function(it){return pic(it.image,it.name,'ozThumb')}).join('')+(its.length>4?'<span class="more">+'+(its.length-4)+'</span>':'')+'</span>'+
    '<span class="f"><small>'+E(o.order_no||'')+' · '+E(fmtDay(o.created_at))+' · '+its.reduce(function(n,x){return n+num(x.qty)},0)+' ürün</small><b>'+TL(o.total_kurus)+'</b></span>'+(act?'<span class="ac">'+act+'</span>':'')+'</div>'}
/* Teslim edilen siparişlerde "Değerlendirildi" bilgisi yalnız sipariş detayında var: görünen ilk 10 kart için sessizce okunur */
async function ordRvLoad(t){
  var ol=ST.ol;if(!ol)return;ST.rvd=ST.rvd||{};
  var need=ol.list.filter(function(o){return (o.status==='delivered'||o.status==='completed')&&ordTab(o.status)===ol.tab&&!ST.rvd[o.id]}).slice(0,10);
  await Promise.all(need.map(function(o){return rpc('oz_order_detail',{p_order:o.id}).then(function(d){
    var its=ordItems(d&&d.items).filter(function(x){return x.product_id});var rv=arr(d&&d.reviewed_product_ids).map(String);
    ST.rvd[o.id]=its.length&&its.every(function(x){return rv.indexOf(String(x.product_id))>=0})?'all':'some'}).catch(function(){})}));
  if(!alive(t))return;
  need.forEach(function(o){var c=qs('#ozRoot .ozOrd[data-oid="'+o.id+'"] .ac');if(c)c.innerHTML=ordAct(o)});
}
async function ordersMore(t){
  var ol=ST.ol;var LIM=30;
  var l=arr(await rpc('oz_my_orders',{p_limit:LIM,p_offset:ol.off}));
  if(!alive(t))return;
  ol.list=ol.list.concat(l);ol.off+=l.length;ol.more=l.length>=LIM;
  ordersPaint();ordRvLoad(t);
}
function ordersPaint(){
  var ol=ST.ol;if(!ol)return;
  var sh=ol.list.filter(function(o){return ordTab(o.status)===ol.tab});
  var emp={active:['Aktif siparişin yok','Verdiğin siparişler hazırlanırken ve kargodayken burada görünür.'],done:['Teslim edilen sipariş yok','Teslim aldığın siparişler burada listelenir.'],ret:['İade veya iptal yok','İptal edilen ya da iade edilen siparişler burada görünür.']}[ol.tab];
  paint(pageHead('Siparişlerim')+ordTabs(ol.tab)+(sh.length?'<div class="ozList">'+sh.map(ordCard).join('')+'</div>':empty(ico('box',36),emp[0],emp[1],!ol.list.length?'<button type="button" class="ozBtn pri" data-a="tab" data-k="home">Alışverişe başla</button>':''))+
    (ol.more?'<button type="button" class="ozBtn wide" data-a="ordMore" style="margin-top:12px">Daha eski siparişleri yükle</button>':''));
}
/* Sipariş ilerlemesi: Alındı → Hazırlanıyor → Kargoda → Teslim edildi */
var PROG=['Alındı','Hazırlanıyor','Kargoda','Teslim edildi'];
/* K37: Siparişlerim kartında küçük renkli aşama çubuğu (buton içinde olduğu için span) */
function progMini(st){var i={new:0,accepted:1,packed:1,shipped:2,delivered:3,completed:3}[st];if(i==null)return '';
  return '<span class="ozSteps col" aria-hidden="true">'+PROG.map(function(x,k){return '<span class="s'+k+(k<i?' ok':k===i?' cur':'')+'"><i></i><span>'+E(x)+'</span></span>'}).join('')+'</span>'}
function progHtml(o){
  var st=o.status;
  if(st==='cancelled')return '<div class="ozProgX bad" role="status"><b>Sipariş iptal edildi</b>'+(o.cancel_reason?'<span>Neden: '+E(o.cancel_reason)+'</span>':'')+(o.payment_status&&PAY_ST[o.payment_status]?'<span>Ödeme: '+E(PAY_ST[o.payment_status][0])+'</span>':'')+'</div>';
  if(st==='return_requested'||st==='returned'||st==='refund_pending'||st==='refunded')return '<div class="ozProgX warn" role="status"><b>'+E((ORDER_ST[st]||[st])[0])+'</b><span>İade sürecinin ayrıntıları aşağıda.</span></div>';
  var i={awaiting_payment:-1,new:0,accepted:1,packed:1,shipped:2,delivered:3,completed:3}[st];if(i==null)i=0;
  return (st==='awaiting_payment'?'<div class="ozWarn" role="status">Ödeme bekleniyor. Ödeme tamamlanınca sipariş üreticiye iletilir.</div>':'')+
    '<ol class="ozProg col" aria-label="Sipariş durumu">'+PROG.map(function(n,j){return '<li class="s'+j+' '+(j<i?'done':j===i?'cur':'')+'"'+(j===i?' aria-current="step"':'')+'><i aria-hidden="true">'+(j<i||(j===i&&i===3)?'✓':j+1)+'</i><span>'+n+'</span></li>'}).join('')+'</ol>';
}
/* Sipariş takip (kargo) kartı: tarihli durum çizgisi, firma, takip no + Kopyala, bilinen firmada "firmanın sayfasında takip et".
   Uygulamada canlı konum yok; konum/ayrıntı yalnız kargo firmasının sayfasında. */
var TRK_SITES=[[/aras/i,'Aras Kargo','https://www.araskargo.com.tr/'],[/yurt\s*i[cç]i/i,'Yurtiçi Kargo','https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula'],[/mng/i,'MNG Kargo','https://www.mngkargo.com.tr/'],
  [/ptt/i,'PTT Kargo','https://gonderitakip.ptt.gov.tr/'],[/s[uü]rat/i,'Sürat Kargo','https://www.suratkargo.com.tr/'],[/\bups\b/i,'UPS','https://www.ups.com/track?loc=tr_TR'],
  [/hepsi\s*jet/i,'HepsiJet','https://www.hepsijet.com/'],[/trendyol/i,'Trendyol Express','https://www.trendyolexpress.com/']];
function carrierOf(n){n=String(n||'');for(var i=0;i<TRK_SITES.length;i++)if(TRK_SITES[i][0].test(n))return TRK_SITES[i];return null}
function trkCard(o,ev){
  var st=o.status;if(!o.tracking_no&&!/^(shipped|delivered|completed)$/.test(st))return '';
  function at(to){var e=arr(ev).filter(function(x){return x.to===to})[0];return e?e.at:null}
  var idx={awaiting_payment:0,new:0,accepted:1,packed:1,shipped:2,delivered:3,completed:3}[st];if(idx==null)idx=-1;
  var steps=[['Alındı',at('new')||o.created_at],['Hazırlanıyor',at('accepted')],['Kargoya verildi',o.shipped_at||at('shipped')],['Teslim edildi',o.delivered_at||at('delivered')]];
  var bar=progMini(st);
  var line='<ol class="ozTrkL">'+steps.map(function(x,k){var done=k<=idx;return '<li class="'+(done?'ok':'')+(k===idx?' cur':'')+'"><i aria-hidden="true"></i><b>'+E(x[0])+'</b>'+(done&&x[1]?'<small>'+E(fmtDate(x[1]))+'</small>':'')+'</li>'}).join('')+'</ol>';
  var cr=carrierOf(o.carrier);
  return '<div class="ozCard" id="ozTrkC"><h3>Kargo takibi</h3>'+bar+
    (o.carrier?'<p class="ozMuted" style="margin:0 0 6px">Kargo firması: <b style="color:#F6ECDC">'+E(o.carrier)+'</b></p>':'')+
    (o.tracking_no?'<div class="ozTrk"><span><small>Takip no</small><b class="ozMono">'+E(o.tracking_no)+'</b></span><button type="button" class="ozBtn sm ozCopyB" data-a="copyTrk" data-v="'+E(o.tracking_no)+'" aria-label="Takip numarasını kopyala">Kopyala</button></div>':'')+
    (cr&&o.tracking_no?'<button type="button" class="ozBtn wide" data-a="trkGo" data-v="'+E(o.tracking_no)+'" data-u="'+E(cr[2])+'">Kargo firmasının sayfasında takip et</button><p class="ozHint" style="margin:6px 0 0">Takip numaran kopyalanır, '+E(cr[1])+' sayfası açılır; numarayı oraya yapıştır.</p>':
      (o.tracking_url&&/^https:\/\//i.test(o.tracking_url)?'<a class="ozBtn wide" href="'+E(o.tracking_url)+'" target="_blank" rel="noopener noreferrer">Takip bağlantısını aç</a>':''))+
    '<details class="ozTrkH"><summary>Hareketler</summary>'+line+'</details></div>';
}
function orderDetailHtml(d){
  var o=d.order||{};var its=ordItems(d.items);var ev=arr(d.events);var rv=arr(d.reviewed_product_ids).map(String);var ret=d.return;var s=S();
  var st=o.status;
  var acts='';
  if(st==='awaiting_payment'&&o.payment_method==='mock'&&s.payment_mock)acts+='<button type="button" class="ozBtn sun" data-a="mockPay" data-id="'+E(o.id)+'">Ödemeyi tamamla</button>';
  if(st==='shipped')acts+='<button type="button" class="ozBtn pri" data-a="ordDeliver" data-id="'+E(o.id)+'">Siparişim elime ulaştı</button>';
  if(st==='awaiting_payment'||st==='new')acts+='<button type="button" class="ozBtn bad" data-a="ordCancel" data-id="'+E(o.id)+'" data-no="'+E(o.order_no||'')+'">Siparişi iptal et</button>';
  if(d.can_return&&!ret)acts+='<button type="button" class="ozBtn" data-a="ordReturn" data-id="'+E(o.id)+'">İade talebi oluştur</button>';
  var canReview=(st==='delivered'||st==='completed');
  var ship=o.ship_to||{};
  var tl=ev.length?'<ol class="ozTl">'+ev.map(function(e){return '<li><b>'+E((ORDER_ST[e.to]||[e.to])[0])+'</b><small>'+E(fmtDate(e.at))+(e.role?' · '+E(ROLE[e.role]||e.role):'')+(e.reason?' · '+E(e.reason):'')+'</small></li>'}).join('')+'</ol>':'<p class="ozMuted">Henüz hareket yok.</p>';
  var trk=trkCard(o,ev);
  /* A5: sipariş oluşturulduktan sonra kalıcı yeşil bant (kapatılabilir) */
  var pb=ST.placedBand,band='';
  if(pb&&pb.ids.indexOf(String(o.id))>=0)band='<div class="ozPlacedB" role="status"><span class="i">'+ico('leaf',20)+'</span><span class="tx"><b>Siparişin alındı</b><small>'+
    (pb.payFail&&st==='awaiting_payment'?'Ödeme tamamlanamadı; aşağıdan "Ödemeyi tamamla" ile tekrar dene.':st==='awaiting_payment'?'Ödemeyi tamamladığında üreticiye iletilir.':'Üretici onayladığında bildirim alacaksın.')+
    (pb.n>1?' '+pb.n+' üreticiden '+pb.n+' sipariş oluşturuldu.':'')+'</small>'+(pb.n>1?'<button type="button" class="ozLink" data-a="nav" data-k="orders">Siparişlerim</button>':'')+'</span><button type="button" class="x" data-a="bandClose" aria-label="Kapat">'+ico('x',18)+'</button></div>';
  return band+'<div class="ozHead"><h1>'+E(o.order_no||'Sipariş')+'</h1><p>'+E(d.seller_name||'')+' · '+E(fmtDate(o.created_at))+'</p></div>'+
    '<div style="margin:0 0 10px">'+stTag(ORDER_ST,st)+'</div>'+progHtml(o)+
    (acts?'<div class="ozRow2 ozOdActs" style="margin:0 0 12px">'+acts+'</div>':'')+
    (canReview&&its.some(function(it){return it.product_id&&rv.indexOf(String(it.product_id))<0})?'<div class="ozCard ozRvC" id="ozRateC"><h3>Ürünleri değerlendir</h3>'+its.filter(function(it){return it.product_id&&rv.indexOf(String(it.product_id))<0}).map(function(it){return '<div class="ozRvI">'+pic(it.image,it.name)+'<b>'+E(it.name)+'</b><button type="button" class="ozBtn sm pri" data-a="ordReview" data-o="'+E(o.id)+'" data-p="'+E(String(it.product_id))+'">Değerlendir</button></div>'}).join('')+'</div>':'')+
    (ret?'<div class="ozCard"><h3>İade</h3><p style="margin:0 0 6px">'+stTag(RET_ST,ret.status)+'</p>'+(ret.reason?'<p class="ozMuted" style="margin:0">Neden: '+E(ret.reason)+'</p>':'')+(ret.decision_note||ret.note?'<p class="ozMuted" style="margin:4px 0 0">Not: '+E(ret.decision_note||ret.note)+'</p>':'')+'</div>':'')+
    trk+
    '<div class="ozCard"><h3>Ürünler</h3>'+its.map(function(it){var pid=String(it.product_id||'');return '<div class="ozCI">'+pic(it.image,it.name)+'<div class="tx"><b>'+E(it.name)+(it.label?' <span class="ozMuted">('+E(it.label)+')</span>':'')+'</b><small>'+it.qty+' adet × '+TL(it.unit_price_kurus)+'</small><div class="pr">'+TL(it.line_total_kurus)+'</div></div>'+
      (canReview&&pid?(rv.indexOf(pid)>=0?'<span class="ozTag ok">Değerlendirildi</span>':'<button type="button" class="ozBtn sm" data-a="ordReview" data-o="'+E(o.id)+'" data-p="'+E(pid)+'">Değerlendir</button>'):'')+'</div>'}).join('')+
      '<div class="ozLine"><span class="m">Ürünler</span><span>'+TL(o.subtotal_kurus)+'</span></div><div class="ozLine"><span class="m">Kargo</span><span>'+(num(o.shipping_fee_kurus!=null?o.shipping_fee_kurus:o.shipping_kurus)?TL(o.shipping_fee_kurus!=null?o.shipping_fee_kurus:o.shipping_kurus):'Bedava')+'</span></div>'+(num(o.discount_kurus)?'<div class="ozLine"><span class="m">İndirim</span><span>−'+TL(o.discount_kurus)+'</span></div>':'')+'<div class="ozLine tot"><span>Toplam</span><span>'+TL(o.total_kurus)+'</span></div>'+
      '<p class="ozMuted" style="margin:8px 0 0">Ödeme: '+E(PAYM[o.payment_method]||o.payment_method||'—')+(o.payment_status?' '+stTag(PAY_ST,o.payment_status):'')+'</p>'+(o.cancel_reason?'<p class="ozMuted" style="margin:4px 0 0">İptal nedeni: '+E(o.cancel_reason)+'</p>':'')+'</div>'+
    '<div class="ozCard"><h3>Teslimat adresi</h3><p style="margin:0">'+E(ship.recipient||'')+(ship.phone?' · '+E(ship.phone):'')+'</p><p class="ozMuted" style="margin:4px 0 0">'+E(addrText(ship))+'</p>'+(o.note?'<p class="ozMuted" style="margin:6px 0 0">Not: '+E(o.note)+'</p>':'')+'</div>'+
    '<details class="ozDet"><summary>Sipariş geçmişi</summary><div>'+tl+'</div></details>';
}
function addressForm(x){
  x=x||{};
  function f(id,label,v,opt){opt=opt||{};return '<label for="ozA_'+id+'">'+E(label)+'</label><input class="ozIn" id="ozA_'+id+'" data-f="'+id+'" value="'+E(v||'')+'"'+(opt.type?' type="'+opt.type+'"':'')+(opt.im?' inputmode="'+opt.im+'"':'')+(opt.ac?' autocomplete="'+opt.ac+'"':'')+' maxlength="'+(opt.max||120)+'">'}
  return '<p class="ozHint" style="margin:0 0 6px">* işaretli alanlar zorunlu</p>'+f('title','Adres başlığı (Ev, İş…) *',x.title,{max:40})+f('recipient','Alıcı adı soyadı *',x.recipient,{ac:'name'})+f('phone','Telefon *',x.phone,{type:'tel',im:'tel',ac:'tel',max:20})+
    '<div class="ozTwo"><div>'+f('city','İl *',x.city,{max:40})+'</div><div>'+f('district','İlçe *',x.district,{max:60})+'</div></div>'+
    f('neighborhood','Mahalle',x.neighborhood,{max:80})+'<label for="ozA_address_line">Açık adres *</label><textarea class="ozTa" id="ozA_address_line" data-f="address_line" maxlength="300" style="min-height:72px">'+E(x.address_line||'')+'</textarea>'+
    f('postal_code','Posta kodu (isteğe bağlı)',x.postal_code,{im:'numeric',max:5})+
    '<label class="ozChk"><input type="checkbox" data-f="is_default"'+(x.is_default?' checked':'')+'><span>Varsayılan adresim olsun</span></label>';
}
function addrValidate(v){
  if(!v.title)return 'Adres başlığı eksik.';if(!v.recipient)return 'Alıcı adı soyadı eksik.';if(v.recipient.length<3)return 'Alıcı adı en az 3 harf olmalı.';
  var d=v.phone.replace(/\D/g,'');if(!d)return 'Telefon numarası eksik.';if(d.length<10||d.length>13)return 'Telefon numarası 10-11 haneli olmalı (örn. 0532 123 45 67).';
  if(!v.city)return 'İl eksik.';if(!v.district)return 'İlçe eksik.';if(!v.address_line)return 'Açık adres eksik.';if(v.address_line.length<8)return 'Açık adres çok kısa; sokak ve kapı numarasını da yaz.';
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
  bandClose:function(b){ST.placedBand=null;var x=b.closest('.ozPlacedB');if(x)x.remove()},
  cQty:function(b){coKeep();var id=b.dataset.id;cartSetQty(id,cartQty(id)+num(b.dataset.d));draw()},
  cDel:function(b){coKeep();cartSetQty(b.dataset.id,0);toast('Ürün sepetten çıkarıldı');draw()},
  coAddrSheet:function(){var co=ST.co;if(!co)return;coKeep();
    sheet('Teslimat adresi',co.addrs.map(function(x){var on=x.id===co.addr;return '<button type="button" class="ozPick'+(on?' on':'')+'" data-a="coAddrPick" data-id="'+E(x.id)+'"><span class="tx"><b>'+E(x.title||'Adres')+' · '+E(x.recipient||'')+'</b><small>'+E(addrText(x))+'</small></span>'+(on?'<span class="ozTag ok">Seçili</span>':'')+'</button>'}).join('')+'<button type="button" class="ozBtn wide" data-a="addrNew" data-co="1" style="margin-top:6px">Yeni adres ekle</button>',{noFocus:true})},
  coAddrPick:function(b){if(!ST.co)return;ST.co.addr=b.dataset.id;closeSheet();drawCheckout()},
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
    if(!termsOk(co)){toast('Devam etmek için sözleşme onayını işaretle.');var tt=D.getElementById('ozTAll');if(tt)tt.focus();return}
    if(co.blocked){toast(coWhy(co));return}
    if(!logged()){needLogin(function(){go('checkout',{},true)});return}
    if(!ST.crid)ST.crid=uuid();
    ST.placing=true;
    try{await busy(b,async function(){
      var res;
      try{res=await rpc('oz_place_order',{p:{items:cartItemsParam(),address_id:co.addr,note:co.note||null,payment_method:co.pay,client_request_id:ST.crid,terms:true}})}
      catch(e){if(isDupErr(e)){dupDone();return}  /* yedek yol */
        if(isRawDbErr(e)){toast('Siparişin oluşturulamadı, lütfen tekrar dene. Sorun sürerse destekle iletişime geç.');return}  /* ham DB mesajı gösterilmez; sepet korunur */
        throw e}
      res=res||{};
      if(res.duplicate===true){dupDone();return}  /* birincil yol */
      /* Sözleşme onayları oz_orders ekleme tetikleyicisinde kaydedilir (context 'order', subject 'oz:<id>'); istemci ayrıca kayıt yapmaz. */
      cartSet([]);ST.crid=null;var pay=co.pay;ST.co=null;ST.staleSeq=HSEQ;ST.staleUsed=false;
      /* A4: ödeme adımı otomatik zincirlenir, ara ekran yok → siparişin detayı. Başarısızsa sipariş "Ödeme bekleniyor" kalır. */
      var os=arr(res.orders);var pr=await payOrders(os,pay);
      ST.placedBand={ids:os.map(function(o){return String(o.id)}),n:os.length,payFail:!pr.ok&&!pr.skipped};
      if(os.length)go('order',{id:os[0].id},true);else go('orders',{},true);  /* ödeme ekranının yerine geçer */
    })}finally{ST.placing=false}
  },
  mockPayAll:async function(b){
    var c=cur();var os=arr(c.a.res&&c.a.res.orders).filter(function(o){return o.status==='awaiting_payment'});
    await busy(b,async function(){for(var i=0;i<os.length;i++){await rpc('oz_mock_pay',{p_order:os[i].id});os[i].status='new'}toast('Deneme ödemesi tamamlandı');draw()});
  },
  mockPay:async function(b){await busy(b,async function(){var r=await payOrders([{id:b.dataset.id,status:'awaiting_payment'}],'mock');
    if(r.ok){if(ST.placedBand)ST.placedBand.payFail=false;toast('Ödeme tamamlandı')}else fail(new Error('Ödeme tamamlanamadı. Biraz sonra tekrar dene.'));draw()})},
  ordMore:function(){ordersMore(SCR).catch(fail)},
  ordTab:function(b){var c=cur();c.a=Object.assign({},c.a,{tab:b.dataset.tab});if(ST.ol&&ST.ol.off){ST.ol.tab=b.dataset.tab;hSync();ordersPaint();ordRvLoad(SCR);return}draw()},
  trkGo:function(b){var w=null;try{w=window.open(b.dataset.u,'_blank','noopener,noreferrer')}catch(e){}copyText(b.dataset.v).then(function(ok){toast(ok?'Takip numarası kopyalandı; firma sayfasında yapıştır.':'Takip no: '+b.dataset.v)});},
  copyTrk:async function(b){var t=b.dataset.v;var ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){try{var x=D.createElement('textarea');x.value=t;x.style.position='fixed';x.style.opacity='0';D.body.appendChild(x);x.select();ok=D.execCommand('copy');x.remove()}catch(_){}}toast(ok?'Takip numarası kopyalandı':'Kopyalanamadı; numarayı elle seç.')},
  ordDeliver:async function(b){if(!await confirmBox('Siparişin eline ulaştı mı?','Ürünleri teslim aldığını onaylıyorsun. Sorun varsa sonrasında iade isteyebilirsin.','Evet, elime ulaştı'))return;await busy(b,async function(){await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'deliver',p:{}});toast('Teslimat onaylandı');draw()})},
  /* Müşteri iptali: yalnız ilk aşamada (ödeme bekleniyor / Alındı); sonrası "Sorun bildir". Sunucu da aynı kuralı uygular,
     stoğu geri koyar (oz_restock) ve satıcıya bildirim gönderir. Onay → kilit → net mesaj → ekran ve sayaçlar yenilenir. */
  ordCancel:async function(b){
    if(ST.cnl)return;
    var v=await formBox('Siparişi iptal et','<p class="ozP" style="margin:0 0 8px">'+E(b.dataset.no?b.dataset.no+' iptal edilecek. ':'')+'Bu işlem geri alınamaz; ödediysen ücret iadesi başlatılır.</p><label for="ozCnR">İptal nedeni (isteğe bağlı)</label><textarea class="ozTa" id="ozCnR" data-f="r" maxlength="300" style="min-height:72px"></textarea>','Evet, iptal et');
    if(!v)return;
    ST.cnl=1;
    try{await busy(b,async function(){
      await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'cancel',p:{reason:v.r||null}});
      toast('Siparişin iptal edildi; üreticiye bildirildi.');draw();
    })}finally{ST.cnl=0}
  },
  ordReturn:async function(b){
    var rd=num(S().return_days);
    var v=await formBox('İade iste','<label for="ozRtR">İade nedeni</label><select class="ozSel" id="ozRtR" data-f="r">'+RET_REASONS.map(function(x){return '<option>'+E(x)+'</option>'}).join('')+'</select><label for="ozRtD">Açıklama</label><textarea class="ozTa" id="ozRtD" data-f="d" maxlength="1000" placeholder="Sorunu kısaca anlat"></textarea>'+(rd?'<p class="ozHint">Teslimattan sonraki '+rd+' gün içinde iade isteyebilirsin.</p>':''),'Gönder',function(v){return v.d.length<5?'Kısa bir açıklama yaz.':''});
    if(!v)return;await rpc('oz_request_return',{p_order:b.dataset.id,p_reason:v.r,p_details:v.d});toast('İade talebin üreticiye iletildi');draw();
  },
  ordReview:function(b){return reviewBox(b.dataset.o,b.dataset.p)}
});
Object.assign(CHANGE,{
  pfCat:function(el){var n=D.getElementById('ozPCatN');if(n)n.hidden=!pfCatIsDrink(el.value)},
  homeSort:function(el){var c=cur();if(c.k!=='home')return;c.a=Object.assign({},c.a,{sort:el.value});hSync();ST.sr={a:{sort:el.value},list:[],offset:0,more:false,rows:1};var r=D.getElementById('ozRes');if(r)r.innerHTML=skel(2);return searchMore(SCR)},
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
  toast('Sorun üreticiye iletildi. Cevaplanınca "Soru ve cevaplar" bölümünde görünecek.');
}

/* ====================== Dünya kabuğu: üst çubuk, gezinme ====================== */
var NAV=[],SCR=0;
function alive(t){return t===SCR&&!!D.getElementById('ozRoot')}
function paint(html){var r=D.getElementById('ozRoot');if(r)r.innerHTML=html;stripSync()}
function cur(){return NAV[NAV.length-1]||{k:'home',a:{}}}
function go(k,a,replace){if(replace&&NAV.length)NAV.pop();NAV.push({k:k,a:a||{}});HPEND={rep:!!replace};draw()}
function back(){var V=hNav(),ce=V&&V.stack[V.idx];if(ce&&isOzEnt(ce)&&V.idx>0){history.back();return}if(NAV.length>1){NAV.pop();draw()}else exitWorld()}

/* ====================== K30: geri tuşu (platform V2_NAV yığınıyla) ======================
   Platform (index.html) her ekranı V2_NAV.stack'e {v2:idx} durumuyla pushState eder; popstate'te önce açık pencereleri
   (.v2Sheet, çekmece, giriş modalı, .ozOv) kapatır, sonra kayıttaki fn'i çalıştırır. Özüne Dön ekranları bu yığına
   "oz:N" adlı kayıtlar olarak girer; fn, o anki NAV kopyasını geri yükler. Kök Özüne Dön kaydından geri → platform ana sayfası. */
var HSEQ=0,HREST=false,HPEND=null;
function hNav(){var V=window.V2_NAV;return typeof window.v2NavPush==='function'&&V&&Array.isArray(V.stack)?V:null}
function isOzEnt(e){return !!(e&&typeof e.name==='string'&&e.name.indexOf('oz:')===0&&e.name!=='oz:sheet')}
function hSnap(){return NAV.map(function(x){return {k:x.k,a:Object.assign({},x.a)}})}
function hFn(snap,pre,seq){return function(){return hRestore(snap,pre,seq)}}
function hPush(rep){
  var V=hNav();if(!V||HREST)return;
  var ce=V.stack[V.idx];var seq=++HSEQ;
  if((rep&&isOzEnt(ce))||(ce&&ce.name==='oz:sheet'))V.replaceNext=true;   /* platform kaydı (ana sayfa) asla ezilmez */
  try{window.v2NavPush('oz:'+seq,hFn(hSnap(),isPre(),seq),[])}catch(e){}
}
function hSync(){var V=hNav();if(!V||HREST)return;var ce=V.stack[V.idx];if(isOzEnt(ce))ce.fn=hFn(hSnap(),isPre(),+ce.name.slice(3))}
function hRestore(snap,pre,seq){
  var top=snap[snap.length-1]||{};
  /* Sipariş verildikten sonra eski sepet/ödeme kayıtlarına dönülmez: ilki Siparişlerim olur, sonrakiler atlanır */
  if(ST.staleSeq&&seq<=ST.staleSeq&&(top.k==='checkout'||top.k==='cart')){
    if(!ST.staleUsed){ST.staleUsed=true;snap=[{k:'home',a:{}},{k:'orders',a:{}}];var V=hNav();if(V&&V.stack[V.idx])V.stack[V.idx].fn=hFn(snap,false,++HSEQ)}
    else{setTimeout(function(){history.back()},0);return}
  }
  HREST=true;
  try{D.body.classList.toggle('ozPre',!!pre);NAV=snap.map(function(x){return {k:x.k,a:Object.assign({},x.a)}});draw()}finally{HREST=false}
}
/* Kök Özüne Dön kaydına geri sar (yeni kayıt açmadan); yoksa ana ekrana git */
function goRoot(){
  var V=hNav();
  if(V&&isOzEnt(V.stack[V.idx])&&!isOzEnt(V.stack[V.idx-1])){NAV=[{k:'home',a:{}}];HPEND={rep:true};draw();return}
  if(V){for(var j=V.idx-1;j>=0;j--){var e=V.stack[j];if(!isOzEnt(e))break;var nx=V.stack[j-1];if(!isOzEnt(nx)){history.go(j-V.idx);return}}}
  NAV=[{k:'home',a:{}}];HPEND={rep:false};draw();
}
OZ.closeSheet=function(){closeSheet()};
/* Platform popstate'inden sonra çalışır: geçmiş kaydı olan alt sayfa (.ozOvH) açıkken geri → yalnızca kapat */
window.addEventListener('popstate',function(){if(qs('.ozOvH')){ST.preKeep=true;closeSheet()}});
/* K27 ön başvuru kipi (body.ozPre): pazar kapalıyken yalnızca satıcı ekranları */
var PRE_OK={seller:1,sellerApply:1,sellerProduct:1};
function isPre(){return D.body.classList.contains('ozPre')}
function draw(){
  var t=cur();if(isPre()&&!PRE_OK[t.k]){NAV=[{k:'seller',a:{}}];t=cur()}
  SCR++;closeSheet();fadeStop();ensureWorld();
  try{window.scrollTo(0,0)}catch(e){}
  topSync();
  var v=VIEWS[t.k]||VIEWS.home;
  var hp=HPEND;HPEND=null;if(hp)hPush(hp.rep);else hSync();
  try{var p=v(t.a||{},SCR);if(p&&p.catch)p.catch(function(e){if(e&&e.auth&&!logged()){paint(loginWall());return}paint(errBox(e))})}catch(e){paint(errBox(e))}
}
OZ.go=function(k,a){go(k,a)};
function loginWall(text){return empty(ico('user',34),'Giriş yapman gerekiyor',text||'Bu bölümü görmek için hesabına giriş yap.','<button type="button" class="ozBtn pri" data-a="login">Giriş yap</button>')}
function topHtml(){
  return '<button type="button" class="ozIc" data-a="back" aria-label="Geri">'+ico('back')+'</button>'+
    '<button type="button" class="ozBrand" data-a="nav" data-k="home" aria-label="Özüne Dön ana sayfa"><span>Özüne <b>Dön</b></span></button>'+
    '<button type="button" class="ozIc" data-a="nav" data-k="search" aria-label="Ara">'+ico('search')+'</button>'+
    '<button type="button" class="ozIc" data-a="bell" aria-label="Bildirimler">'+ico('bell')+'<span class="ozBdg dot" id="ozBellN" hidden></span></button>';
}
/* K30: alt menü (alıcı). Ürün sayfası (sabit "Sepete ekle"), ödeme, satıcı ekranları ve ön başvuru kipinde gizli. */
var TABS=[['home','Keşfet','leaf'],['producers','Üreticiler','store'],['orders','Siparişlerim','box'],['cart','Sepet','cart'],['account','Hesabım','user']];
var TAB_OF={home:'home',search:'home',producers:'producers',orders:'orders',order:'orders',cart:'cart',account:'account',favs:'account',addresses:'account'};
var NONAV={product:1,checkout:1,seller:1,sellerApply:1,sellerProduct:1};
function navHtml(){return TABS.map(function(t){return '<button type="button" class="ozNavB" data-a="tab" data-k="'+t[0]+'">'+ico(t[2],22)+'<span class="l">'+t[1]+'</span>'+(t[0]==='cart'?'<span class="ozBdg" id="ozCartN" hidden></span>':'')+'</button>'}).join('')}
/* K30: satıcı alt menüsü (onaylı/askıdaki satıcı panelinde; ön başvuru kipinde menü yok, üstteki sekme çipleri kalır) */
/* Satıcı paneli tek ekran: 'ozet' = sayaçlar + siparişler (eski 'siparisler' sekmesi buraya yönlenir) */
var STABS=[['ozet','Siparişler','box'],['urunler','Ürünler','tag'],['sorular','Sorular','star'],['kazanc','Kazanç','wallet'],['magaza','Mağaza','store']];
function sellerNavHtml(){return STABS.map(function(t){return '<button type="button" class="ozNavB" data-a="sTab" data-tab="'+t[0]+'">'+ico(t[2],22)+'<span class="l">'+t[1]+'</span>'+(t[0]==='ozet'?'<span class="ozBdg dot" id="ozSoN" hidden></span>':'')+'</button>'}).join('')}
/* K37: Siparişler sekmesinde kırmızı rozet — bekleyen (yeni + hazırlanıyor + kargoya hazır) sipariş sayısı */
function soBadge(){var b=D.getElementById('ozSoN');if(!b)return;var n=SELLER.soN;if(n==null){var o=(SELLER.dash&&SELLER.dash.orders)||{};n=num(o.new)+num(o.accepted)+num(o.packed)}b.hidden=!n;b.textContent=n>9?'9+':String(n)}
function sellerPanelOn(){var d=SELLER.dash;return !!(d&&d.has_seller&&/^(approved|active|suspended)$/.test(d.status||''))}
/* Yeni sipariş ışığı: satıcının "Yeni" durumda siparişi varsa Hesabım sekmesinde ve Hesabım > Satıcı paneli satırında
   yumuşak yanıp sönen nokta. Sayı mevcut oz_seller_dashboard'dan (en fazla dakikada bir); sipariş "Yeni"den çıkınca söner. */
/* C6: bekleyen iş = Yeni + Hazırlanıyor (kabul edildi / hazırlandı); hepsi kargoya verilince söner */
function newDotSync(){var n=num(ST.newN),on=n>0;qa('#ozNav .ozNavB[data-k=account], #ozRoot .ozRowBtn[data-k=seller]').forEach(function(b){b.classList.toggle('ozPulse',on);if(on)b.setAttribute('data-n',n>9?'9+':String(n));else b.removeAttribute('data-n')})}
function newDotCheck(){
  var ms=S().my_seller;if(!logged()||!ms||!/^(approved|active)$/.test(ms.status||''))return;
  if(ST.newBusy||Date.now()-(ST.newAt||0)<60000)return;ST.newBusy=1;ST.newAt=Date.now();
  rpc('oz_seller_dashboard',{}).then(function(d){var o=(d&&d.orders)||{};ST.newN=num(o.new)+num(o.accepted)+num(o.packed);newDotSync()}).catch(function(){}).then(function(){ST.newBusy=0});
}
function navSync(){
  var c=cur(),k=c.k,nav=D.getElementById('ozNav');
  var mode=!D.body.classList.contains('ozWorld')||isPre()?'':k==='seller'?(sellerPanelOn()?'seller':''):(NONAV[k]?'':'buyer');
  if(nav&&mode&&nav.dataset.mode!==mode){nav.innerHTML=mode==='seller'?sellerNavHtml():navHtml();nav.dataset.mode=mode;nav.setAttribute('aria-label',mode==='seller'?'Satıcı menüsü':'Özüne Dön menüsü');cartBadge()}
  if(mode==='seller')soBadge();else if(mode==='buyer'){newDotSync();newDotCheck()}
  D.body.classList.toggle('ozNavOn',!!mode);
  qa('#ozNav .ozNavB').forEach(function(b){var on=mode==='seller'?b.dataset.tab===((c.a&&c.a.tab)||'ozet'):TAB_OF[k]===b.dataset.k;if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
}
function ensureWorld(){
  if(!D.getElementById('ozRoot')){
    if(typeof app==='function')app('<div id="ozRoot" class="oz"></div>');
    else{var a=D.getElementById('app');if(a)a.innerHTML='<div id="ozRoot" class="oz"></div>'}
  }
  D.body.classList.add('ozWorld');
  if(!D.getElementById('ozTop')){var h=D.createElement('header');h.id='ozTop';h.className='ozTop';h.innerHTML=topHtml();D.body.appendChild(h)}
  if(!D.getElementById('ozNav')){var n=D.createElement('nav');n.id='ozNav';n.className='ozNav';n.setAttribute('aria-label','Özüne Dön menüsü');n.innerHTML=navHtml();D.body.appendChild(n)}
  if(!D.getElementById('ozStrip')){var s=D.createElement('div');s.id='ozStrip';s.className='ozStrip';s.setAttribute('role','status');s.hidden=true;s.textContent='Yönetici önizleme · Pazar herkese kapalı';D.body.appendChild(s)}
}
function leaveWorld(){D.body.classList.remove('ozWorld','ozPre','ozNavOn');['ozTop','ozStrip','ozNav'].forEach(function(id){var e=D.getElementById(id);if(e)e.remove()});closeSheet()}
function exitWorld(){NAV=[];leaveWorld();try{showHome()}catch(e){}}
function topSync(){
  var s=S();var strip=D.getElementById('ozStrip');
  var pre=isPre();var pv=!pre&&!!(s.is_admin&&s.market_enabled===false);
  if(strip){strip.hidden=!(pv||pre);strip.textContent=pre?'Ön başvuru · Özüne Dön henüz açılmadı':'Yönetici önizleme · Pazar herkese kapalı'}D.body.classList.toggle('ozPreview',pv||pre);
  cartBadge();navSync();
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
  NAV=[{k:'home',a:{}}];HPEND={rep:false};draw();
  if(logged())loadNotifs().catch(function(){});
  return true;
};

function preSheet(s){
  var has=!!(s&&s.my_seller);
  /* Ana sayfa yığının en altında olabilir: alt sayfa için ayrı geçmiş kaydı (geri tuşu yalnızca alt sayfayı kapatır, siteden çıkmaz) */
  var V=hNav();if(V&&!HREST){try{window.v2NavPush('oz:sheet',function(){},[]);ST.preH=true}catch(e){}}
  var ov=sheet('Özüne Dön çok yakında','<p class="ozP">Doğal ürün üreticisi misin? Şimdiden ön başvurunu yap, mağazan hazır olsun.</p><div class="ozRow2"><button type="button" class="ozBtn" data-a="sheetClose">Kapat</button><button type="button" class="ozBtn pri" data-a="preApply">'+(has?'Satıcı panelim':'Ön başvuru yap')+'</button></div>',{noFocus:true});
  ov.classList.add('ozOvH');
}
function enterPre(){
  var s=S();if(s.market_open){D.body.classList.remove('ozPre');NAV=[{k:'home',a:{}}];HPEND={rep:false};draw();return}
  if(s.seller_signup_enabled!==true&&!s.my_seller){toast('Satıcı başvuruları şu anda kapalı.');return}
  D.body.classList.add('ozPre');NAV=[{k:'seller',a:{}}];HPEND={rep:false};draw();
}
function preGo(){loadSettings(true).then(enterPre).catch(function(e){fail(e)})}
preGo.outside=true;

/* ====================== Tıklama yönlendirici (data-a) ====================== */
ACT_EXTRA({
  sheetClose:function(){closeSheet()},
  back:function(){back()},
  nav:function(b){var k=b.dataset.k;var a={};if(b.dataset.id)a.id=b.dataset.id;if(b.dataset.q)a.q=b.dataset.q;if(b.dataset.cat)a.cat=b.dataset.cat;if(b.dataset.tab)a.tab=b.dataset.tab;if(b.dataset.focus)a.focus=b.dataset.focus;if(k==='home'&&!a.cat&&!a.q){goRoot();return}if(k==='home'){NAV=[];}go(k,a)},
  redraw:function(){draw()},
  login:function(){needLogin(function(){draw()})},
  /* Alt menü: Keşfet köke geri sarar; sekmeler arası geçiş yeni geçmiş kaydı açmaz (platformdaki gibi) */
  tab:function(b){var k=b.dataset.k;if(k==='home'){goRoot();return}
    var c=cur();if(c.k===k&&NAV.length<=2){try{window.scrollTo(0,0)}catch(e){}return}
    var onTab=TAB_OF[c.k]===c.k&&c.k!=='home'&&NAV.length===2;
    NAV=[{k:'home',a:{}},{k:k,a:{}}];HPEND={rep:onTab};draw()},
  bell:function(){openNotifs()},
  exit:function(){exitWorld()},
  preApply:function(){ST.preKeep=true;closeSheet();if(!logged()){needLogin(preGo);return}preGo()}
});
D.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-a]');if(!b)return;
  if(!b.closest('#ozRoot,#ozTop,#ozNav,.ozOv,.ozAdm'))return;
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
  var T=[['ozet','Siparişler'],['urunler','Ürünlerim'],['sorular','Sorular ve yorumlar'],['kazanc','Kazançlarım'],['magaza','Mağaza ayarları']];
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
    d=d||{};SELLER.dash=d;SELLER.soN=null;
    if(!d.has_seller){
      if(!S().seller_signup_enabled){paint(pageHead('Satıcı ol')+empty(ico('store',36),'Satıcı başvuruları şu anda kapalı','Başvurular açıldığında burada başlatabilirsin.'));return}
      paint(pageHead('Satıcı ol','Doğal ürünlerini Türkiye\'nin dört bir yanına kargo ile sat.')+
        '<div class="ozCard"><h3>Başvuru adımları</h3><ol style="margin:0;padding-left:20px;line-height:1.8"><li>Mağaza ve vergi bilgileri</li><li>Belgeler (kimlik, vergi levhası, gıda kayıt belgesi…)</li><li>Kargo ücret tablosu</li><li>Satıcı sözleşmesi onayı ve gönderim</li></ol><p class="ozMuted" style="margin:10px 0 0">Başvurun yönetici tarafından incelenir; onaylanınca ürün ekleyebilirsin.</p></div>'+
        '<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerApply" data-tab="1">Başvuruya başla</button>');return;
    }
    var st=d.status;
    if(st==='draft'||st==='rejected'){paint(pageHead('Satıcı paneli')+statusCard(d)+'<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerApply" data-tab="1">'+(st==='draft'?'Başvuruyu tamamla':'Başvuruyu düzenle ve yeniden gönder')+'</button>');return}
    if(st==='pending'||st==='in_review'){paint(pageHead('Satıcı paneli')+statusCard(d)+'<div class="ozList">'+row('box','Belgelerim','Yüklediğin belgeleri gör, eksikleri ekle','nav',{k:'sellerApply',tab:'2'})+'</div>');return}
    var tab=a.tab==='siparisler'?'ozet':(a.tab||'ozet');
    navSync();
    var TT={ozet:'Siparişler',siparisler:'Siparişler',urunler:'Ürünlerim',kazanc:'Kazançlarım',magaza:'Mağaza ayarları',sorular:'Sorular ve yorumlar'};
    paint(pageHead(tab==='ozet'?(d.display_name||'Satıcı paneli'):TT[tab]||'Satıcı paneli',tab==='ozet'?'Satıcı paneli':'')+(st==='suspended'?statusCard(d):'')+(isPre()?sellerTabs(tab):'')+'<div id="ozSP">'+skel(2,'line')+'</div>');
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
    if(!hd||!arr(hd.categories).length){try{hd={categories:arr(await get('oz_categories?select=id,slug,name&is_active=eq.true&parent_id=is.null&order=sort.asc'))}}catch(e){}}
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
  /* Tek panel: renkli sayaçlar (sunucu sayımı: oz_seller_dashboard.orders) + altında duruma göre siparişler.
     Sayaca dokunmak listeyi o duruma süzer, tekrar dokunmak kaldırır. Her kartta tek ana aksiyon (sellerOrderCard). */
  ozet:async function(d,t){
    var c=cur();var stt=c.a.st||'';if(stt==='toship')stt='prep';if(!SG_BY[stt]&&stt!=='past')stt='';
    var o=d.orders||{};
    var cnt={new:num(o.new),prep:num(o.accepted)+num(o.packed),ship:num(o.shipped),issue:Math.max(num(o.return_requested),num(d.open_returns))};
    SELLER.soN=cnt.new+cnt.prep;soBadge();ST.newN=cnt.new+cnt.prep;ST.newAt=Date.now();
    var st=['new','accepted','packed','shipped','return_requested'];
    var r=await Promise.all(st.map(function(x){return rpc('oz_seller_orders',{p_status:x,p_limit:50,p_offset:0}).catch(function(){return []})}).concat([stt==='past'?rpc('oz_seller_orders',{p_status:null,p_limit:50,p_offset:0}):null,stockStats().catch(function(){return null})]));
    if(!alive(t))return;
    var all=[];st.forEach(function(x,i){all=all.concat(arr(r[i]).filter(function(y){return y.status===x}))});SELLER.orders=all;
    var ss=r[st.length+1];
    var h='<div class="ozSoCnt k4" role="tablist" aria-label="Sipariş durumu">'+SG.map(function(g){var on=stt===g[0];return '<button type="button" role="tab" class="c '+g[2]+(on?' on':'')+'" aria-selected="'+on+'" data-a="soTab" data-st="'+g[0]+'"><b>'+cnt[g[0]]+'</b><small>'+E(g[1])+'</small></button>'}).join('')+'</div>';
    /* küçük rozetler: sayaç satırının sağında (ikon + sayı) */
    function mini(ic,n,lbl,attrs){return '<button type="button" class="ozSoMi" data-a="sTab" '+attrs+' aria-label="'+E(lbl+': '+n)+'" title="'+E(lbl)+'">'+ico(ic,18)+'<b>'+n+'</b></button>'}
    var more=[];if(ss&&(ss.low+ss.out))more.push(mini('tag',ss.low+ss.out,'Düşük stok / Tükendi','data-tab="urunler" data-low="1"'));
    if(num(d.open_questions))more.push(mini('bell',num(d.open_questions),'Cevap bekleyen soru','data-tab="sorular"'));
    if(num(d.unreplied_reviews))more.push(mini('star',num(d.unreplied_reviews),'Yanıtsız yorum','data-tab="sorular"'));
    if(more.length)h+='<div class="ozSoMore2">'+more.join('')+'</div>';
    var list;
    if(stt==='past'){list=arr(r[st.length]).filter(function(x){return /^(delivered|completed|cancelled|returned)$/.test(x.status)});
      h+='<div class="ozSecH"><h2>Geçmiş siparişler</h2><button type="button" class="ozLink" data-a="soTab" data-st="past">Kapat</button></div>'+(list.length?'<div class="ozList">'+list.map(sellerOrderCard).join('')+'</div>':'<p class="ozMuted">Geçmiş sipariş yok.</p>');}
    else{
      var gs=stt?[SG_BY[stt]]:SG;var any=false;
      gs.forEach(function(g){var l=all.filter(function(x){return g[3].indexOf(x.status)>=0});if(!l.length&&!stt)return;any=true;
        h+='<div class="ozSecH"><h2>'+E(g[1])+' ('+l.length+')</h2></div>'+(l.length?'<div class="ozList">'+l.map(sellerOrderCard).join('')+'</div>':'<p class="ozMuted">Bu durumda sipariş yok.</p>')});
      if(!any)h+=empty(ico('box',32),'Bekleyen iş yok','Yeni sipariş gelince burada görünür.');
      h+='<button type="button" class="ozBtn wide ghost" data-a="soTab" data-st="past" style="margin-top:12px">Geçmiş siparişler</button>';
    }
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h+'<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerProduct" style="margin-top:14px">Yeni ürün ekle</button>';
  },
  urunler:async function(d,t){
    var sid=sellerId();
    var ps=arr(await get('oz_products?select=*&seller_id=eq.'+encodeURIComponent(sid)+'&order=updated_at.desc'));
    var vs=ps.length?arr(await get('oz_variants?select=*&product_id=in.'+inList(ps.map(function(x){return x.id}))+'&order=sort.asc')):[];
    /* K37: kategori ikon filtresi (ana ekranla aynı sıra ve görseller) */
    var cats=[];try{cats=arr((await homeData()||{}).categories)}catch(e){}
    if(!cats.length){try{cats=arr(await get('oz_categories?select=id,slug,name,image_url&is_active=eq.true&parent_id=is.null&order=sort.asc'))}catch(e){}}
    if(!alive(t))return;
    SELLER.products=ps;SELLER.variants=vs;
    var low=!!cur().a.low,cat=cur().a.cat||'';
    if(low)ps=ps.filter(function(p){return vs.some(function(v){return v.product_id===p.id&&v.is_active!==false&&num(v.stock)<LOW_STOCK})});
    var cid={};cats.forEach(function(c){cid[c.slug]=String(c.id)});var cn={};SELLER.products.forEach(function(p){cn[String(p.category_id)]=(cn[String(p.category_id)]||0)+1});
    var catH=cats.length&&SELLER.products.length?'<div class="ozCts ozSpCts" role="list" aria-label="Kategori">'+'<button type="button" class="ozCt'+(cat?'':' sel')+'" data-a="spCat" data-cat="" aria-pressed="'+!cat+'"><span class="b" style="background:#2E8B57"><i aria-hidden="true">🧺</i></span><span class="l">Tümü ('+SELLER.products.length+')</span></button>'+
      cats.map(function(c){var n=cn[String(c.id)]||0;var on=cat===c.slug;return catTile({slug:c.slug,image_url:c.image_url,name:c.name+(n?' ('+n+')':'')},'data-a="spCat" data-cat="'+E(c.slug)+'" aria-pressed="'+on+'"').replace('class="ozCt"','class="ozCt'+(on?' sel':'')+(n?'':' off')+'"')}).join('')+'</div>':'';
    if(cat)ps=ps.filter(function(p){return String(p.category_id)===cid[cat]});
    var h=catH+(low?'<div class="ozWrap ozApplied"><button type="button" class="ozChip x" data-a="sTab" data-tab="urunler" aria-label="Düşük stok filtresini kaldır">Düşük stok / Tükendi ✕</button></div>':'')+'<button type="button" class="ozBtn pri wide" data-a="nav" data-k="sellerProduct" style="margin-bottom:12px">Yeni ürün ekle</button>';
    if(!ps.length){h+=cat?empty(ico('box',36),'Bu kategoride ürünün yok',''):empty(ico('box',36),'Henüz ürünün yok','İlk ürününü ekleyip yayınla.');}
    else h+='<div class="ozList">'+ps.map(function(p){
      var pv=vs.filter(function(v){return v.product_id===p.id});var stock=pv.reduce(function(n,v){return n+num(v.stock)},0);
      var st=p.is_hidden?'hidden':p.status;var low=pv.some(function(v){return v.is_active!==false&&num(v.stock)<=3});
      return '<div class="ozCard" style="margin:0"><div class="ozCI" style="border:0;padding:0">'+pic(arr(p.images)[0],p.name)+'<div class="tx"><b>'+E(p.name||'Adsız ürün')+'</b><small>'+pv.length+' seçenek · '+stock+' stok'+(low?' · <span style="color:#F7D24A">düşük stok</span>':'')+'</small><div style="margin-top:4px">'+stTag(PROD_ST,st)+'</div></div></div>'+
        ((p.status_reason||p.reject_reason)&&p.status==='rejected'?'<div class="ozWarn">Gerekçe: '+E(p.status_reason||p.reject_reason)+'</div>':'')+
        '<div class="ozRow2" style="margin-top:10px"><button type="button" class="ozBtn sm" data-a="nav" data-k="sellerProduct" data-id="'+E(p.id)+'">Düzenle</button>'+(pv.length?'<button type="button" class="ozBtn sm" data-a="stockBox" data-id="'+E(p.id)+'">Stok</button>':'')+
        ((p.status==='draft'||p.status==='rejected')&&sellerApproved()?'<button type="button" class="ozBtn sm pri" data-a="prodSubmit" data-id="'+E(p.id)+'" data-st="'+E(p.status)+'">'+(p.status==='draft'?'Yayınla':'Yeniden incelemeye gönder')+'</button>':'')+
        (p.status==='published'||p.status==='active'||p.status==='approved'?'<button type="button" class="ozBtn sm" data-a="prodHide" data-id="'+E(p.id)+'" data-h="1">Gizle</button>':'')+(p.status==='hidden'||p.is_hidden?'<button type="button" class="ozBtn sm" data-a="prodHide" data-id="'+E(p.id)+'" data-h="0">Göster</button>':'')+
        '<button type="button" class="ozBtn sm ghost" data-a="prodDel" data-id="'+E(p.id)+'">Sil</button></div></div>'}).join('')+'</div>';
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  siparisler:function(d,t){return SP.ozet(d,t)},
  /* Satıcı paneli "Sorular ve yorumlar": tabloyu doğrudan okuyan TEK yer. Ürün sayfası oz_product_detail yanıtındaki reviews/questions'ı kullanır;
     misafir bu sekmeye ulaşamaz (seller görünümü giriş ister) — yine de girişsiz/satıcısız durumda tabloya istek atılmaz. user_id/order_id istenmez. */
  sorular:async function(d,t){
    var sid=sellerId();if(!logged()||!sid){var b0=D.getElementById('ozSP');if(b0)b0.innerHTML=loginWall();return}
    var ps=arr(await get('oz_products?select=id,name&seller_id=eq.'+encodeURIComponent(sid)));
    var ids=ps.map(function(x){return x.id});var nm={};ps.forEach(function(x){nm[x.id]=x.name});
    var qsl=[],rvl=[];
    if(ids.length){var r=await Promise.all([get('oz_questions?select=id,product_id,question,answer,created_at&product_id=in.'+inList(ids)+'&order=created_at.desc&limit=100'),get('oz_reviews?select=id,product_id,rating,comment,seller_reply,created_at&product_id=in.'+inList(ids)+'&order=created_at.desc&limit=100')]);qsl=arr(r[0]);rvl=arr(r[1])}
    if(!alive(t))return;
    qsl.sort(function(a,b){return (a.answer?1:0)-(b.answer?1:0)});rvl.sort(function(a,b){return (a.seller_reply?1:0)-(b.seller_reply?1:0)});
    var h='<div class="ozSecH"><h2>Sorular</h2><span class="ozMuted">'+qsl.filter(function(x){return !x.answer}).length+' cevapsız</span></div>'+
      (qsl.length?'<div class="ozList">'+qsl.map(function(q){return '<div class="ozCard" style="margin:0"><small class="ozMuted">'+E(nm[q.product_id]||'')+' · '+E(fmtDay(q.created_at))+'</small><p style="margin:4px 0 8px"><b>'+E(q.question)+'</b></p>'+'<div class="ozRow2">'+(q.answer?'<div class="ozReply" style="flex:1 1 100%">'+E(q.answer)+'</div>':'<button type="button" class="ozBtn sm pri" data-a="qAnswer" data-id="'+E(q.id)+'">Cevapla</button>')+'<button type="button" class="ozBtn sm ghost" data-a="nav" data-k="product" data-id="'+E(q.product_id)+'">Ürüne git</button></div>'+'</div>'}).join('')+'</div>':'<p class="ozMuted">Soru yok.</p>')+
      '<div class="ozSecH"><h2>Değerlendirmeler</h2><span class="ozMuted">'+rvl.filter(function(x){return !x.seller_reply}).length+' yanıtsız</span></div>'+
      (rvl.length?'<div class="ozList">'+rvl.map(function(r){return '<div class="ozCard" style="margin:0"><small class="ozMuted">'+E(nm[r.product_id]||'')+' · '+E(fmtDay(r.created_at))+'</small><div style="margin:4px 0">'+stars(r.rating)+'</div>'+(r.comment?'<p style="margin:0 0 8px">'+E(r.comment)+'</p>':'')+(r.seller_reply?'<div class="ozReply">'+E(r.seller_reply)+'</div>':'<button type="button" class="ozBtn sm" data-a="rReply" data-id="'+E(r.id)+'">Yanıtla</button>')+'</div>'}).join('')+'</div>':'<p class="ozMuted">Değerlendirme yok.</p>');
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  kazanc:async function(d,t){
    var sid=sellerId();
    var r=await Promise.all([rpc('oz_seller_earnings',{}),get('oz_payouts?select=*&seller_id=eq.'+encodeURIComponent(sid)+'&order=created_at.desc&limit=50'),periodStats().catch(function(){return null})]);
    if(!alive(t))return;var e=r[0]||{};var po=arr(r[1]);var ps=r[2];
    var PST={pending:['Hazırlanıyor','warn'],processing:['İşleniyor','warn'],paid:['Ödendi','ok'],failed:['Başarısız','bad']};
    var h=(ps?'<div class="ozKpis"><div class="ozKpi"><small>Bugün</small><b>'+TL(ps.today.k)+'</b><span>'+ps.today.n+' sipariş</span></div><div class="ozKpi"><small>Bu hafta</small><b>'+TL(ps.week.k)+'</b><span>'+ps.week.n+' sipariş</span></div></div><p class="ozHint" style="margin:-4px 0 12px">Gelen siparişlerdeki satıcı payın; ödemesi bekleyen ve iptal edilen siparişler hariç. Hafta pazartesi başlar.</p>':'')+
      '<div class="ozKpis"><div class="ozKpi"><small>Süren siparişler</small><b>'+TL(e.in_progress_kurus)+'</b></div><div class="ozKpi"><small>Bekleme süresinde</small><b>'+TL(e.holding_kurus)+'</b></div><div class="ozKpi hot"><small>Ödemeye hazır</small><b>'+TL(e.available_kurus)+'</b></div><div class="ozKpi"><small>Ödeme sürecinde</small><b>'+TL(e.payout_pending_kurus)+'</b></div><div class="ozKpi"><small>Ödenen toplam</small><b>'+TL(e.paid_kurus)+'</b></div></div>'+
      (num(e.hold_days)?'<p class="ozMuted">Teslim edilen siparişlerin tutarı, iade süresi için '+num(e.hold_days)+' gün bekletildikten sonra ödemeye hazır olur. Ödemeler yönetici tarafından yapılır.</p>':'')+
      '<div class="ozSecH"><h2>Ödemeler</h2></div>'+(po.length?'<div class="ozList">'+po.map(function(x){return '<div class="ozCard" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+TL(x.amount_kurus)+'</b>'+stTag(PST,x.status)+'</div><p class="ozMuted" style="margin:4px 0 0">'+E(fmtDay(x.created_at))+((x.reference||x.bank_reference)?' · Ref: '+E(x.reference||x.bank_reference):'')+(x.paid_at?' · Ödendi: '+E(fmtDay(x.paid_at)):'')+'</p></div>'}).join('')+'</div>':'<p class="ozMuted">Henüz ödeme kaydı yok.</p>');
    var b=D.getElementById('ozSP');if(b)b.innerHTML=h;
  },
  magaza:async function(d,t){
    var s=await sellerRow(true);var rates=arr(await get('oz_shipping_rates?select=*&seller_id=eq.'+encodeURIComponent(sellerId())+'&order=max_weight_g.asc'));
    if(!alive(t))return;SELLER.rates=rates.length?rates:[{max_weight_g:2000,fee_kurus:0}];
    var b=D.getElementById('ozSP');if(b)b.innerHTML='<div class="ozList" style="margin:0 0 12px">'+row('box','Belgelerim','Kimlik, vergi levhası, gıda kayıt belgesi…','nav',{k:'sellerApply',tab:'2'})+row('star','Sorular ve yorumlar','Alıcı soruları ve değerlendirmeler','sTab',{tab:'sorular'})+'</div>'+storeForm(s||{},false)+'<div class="ozSecH"><h2>Kargo ücret tablosu</h2></div>'+ratesEditor()+'<button type="button" class="ozBtn wide" data-a="ratesSave" style="margin-top:10px">Kargo tablosunu kaydet</button>';
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
/* K37: satıcı sipariş grupları [anahtar, ad, renk, durumlar] ve 5 adımlı çubuk */
var SG=[['new','Yeni','c1',['new']],['prep','Hazırlanıyor','c2',['accepted','packed']],['ship','Kargoda','c4',['shipped']],['issue','Sorunlu','c6',['return_requested']]];
var SG_BY={};SG.forEach(function(g){SG_BY[g[0]]=g});
var SO_STEPS=['Yeni','Hazırlanıyor','Kargoya hazır','Yolda','Teslim'];
function soSteps(st){var i={new:0,accepted:1,packed:2,shipped:3,delivered:4,completed:4}[st];if(i==null)return '';
  return '<ol class="ozSteps" aria-label="Sipariş adımı: '+E(SO_STEPS[i])+'">'+SO_STEPS.map(function(x,k){return '<li class="'+(k<i?'ok':k===i?'cur':'')+'"><i></i><span>'+E(x)+'</span></li>'}).join('')+'</ol>'}
function sellerOrderCard(o){
  var its=ordItems(o.items);var sh=o.ship_to||{};var ret=o.return;
  /* K30: duruma göre TEK ilerleyen birincil buton: Yeni → Kabul et, Kabul edildi → Hazırlandı, Hazırlandı → Kargoya ver */
  var acts='',id=E(o.id);
  if(o.status==='new')acts='<button type="button" class="ozBtn pri" data-a="soAct" data-act="accept" data-id="'+id+'">Kabul et</button><button type="button" class="ozBtn ghost sm" data-a="soCancel" data-rej="1" data-id="'+id+'">Reddet</button>';
  else if(o.status==='accepted')acts='<button type="button" class="ozBtn pri" data-a="soAct" data-act="pack" data-id="'+id+'">Hazırlandı</button><button type="button" class="ozBtn ghost sm" data-a="soCancel" data-id="'+id+'">İptal et</button>';
  else if(o.status==='packed')acts='<button type="button" class="ozBtn pri" data-a="soShip" data-id="'+id+'">Kargoya ver</button><button type="button" class="ozBtn ghost sm" data-a="soCancel" data-id="'+id+'">İptal et</button>';
  var wait=o.status==='shipped'?'<p class="ozHint" style="margin:8px 0 0">Kargoda. Alıcı teslim aldığını onaylayınca tamamlanır; onaylamazsa belirlenen süre sonunda otomatik teslim edilmiş sayılır.</p>':'';
  return '<div class="ozCard ozSoC" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+E(o.order_no||'Sipariş')+'</b>'+stTag(ORDER_ST,o.status)+'</div><p class="ozMuted" style="margin:2px 0 6px">'+E(fmtDate(o.created_at))+' · '+TL(o.total_kurus)+'</p>'+soSteps(o.status)+
    its.map(function(it){return '<div class="ozLine"><span>'+num(it.qty)+' × '+E(it.name)+(it.label?' ('+E(it.label)+')':'')+'</span><span>'+TL(it.line_total_kurus||num(it.unit_price_kurus)*num(it.qty))+'</span></div>'}).join('')+
    '<details class="ozAdr"><summary>'+ico('pin',14)+'<span>'+E([sh.recipient||o.buyer_name||'',sh.district].filter(Boolean).join(' · ')||'Teslimat adresi')+'</span></summary><div>'+(sh.phone?E(sh.phone)+'<br>':'')+E(addrText(sh))+(o.note?'<br><b>Not:</b> '+E(o.note):'')+'</div></details>'+(o.note?'<p class="ozHint" style="margin:4px 0 0">📝 Siparişte not var</p>':'')+
    (o.tracking_no?'<p class="ozMuted" style="margin:8px 0 0">'+E(o.carrier||'Kargo')+' · '+E(o.tracking_no)+'</p>':'')+
    (ret?'<div class="ozWarn"><b>İade:</b> '+stTag(RET_ST,ret.status)+' '+E(ret.reason||'')+(ret.details?' — '+E(ret.details):'')+(ret.status==='requested'?'<div class="ozRow2" style="margin-top:8px"><button type="button" class="ozBtn sm pri" data-a="retDecide" data-id="'+E(ret.id)+'" data-ok="1">İadeyi kabul et</button><button type="button" class="ozBtn sm bad" data-a="retDecide" data-id="'+E(ret.id)+'" data-ok="0">Reddet</button></div>':'')+'</div>':'')+
    wait+(acts?'<div class="ozRow2 ozSoActs" style="margin-top:10px">'+acts+'</div>':'')+'</div>';
}
/* "Bugün" yeni sipariş kartı: ürün fotoğrafı, adet, tutar, alıcı ilçe/il */
function newOrderCard(o){var its=ordItems(o.items),sh=o.ship_to||{};var loc=[sh.district,sh.city].filter(Boolean).join(', ');
  return '<div class="ozCard ozNewO" style="margin:0"><div class="ozRow2" style="justify-content:space-between"><b>'+E(o.order_no||'Sipariş')+'</b><span class="ozMuted">'+E(fmtDate(o.created_at))+'</span></div>'+
    its.map(function(it){return '<div class="ozCI">'+pic(it.image,it.name)+'<div class="tx"><b>'+E(it.name)+'</b><small>'+(it.label?E(it.label)+' · ':'')+num(it.qty)+' adet</small></div></div>'}).join('')+
    '<div class="ozRow2" style="justify-content:space-between;margin-top:6px"><span class="ozMuted">'+ico('pin',14)+' '+E(loc||'—')+'</span><b>'+TL(o.total_kurus)+'</b></div>'+
    '<div class="ozRow2 ozSoActs" style="margin-top:10px"><button type="button" class="ozBtn pri" data-a="soAct" data-act="accept" data-id="'+E(o.id)+'">Kabul et</button><button type="button" class="ozBtn bad" data-a="soCancel" data-rej="1" data-id="'+E(o.id)+'">Reddet</button></div></div>'}
/* Bugün / bu hafta: oz_seller_orders'tan (satıcı payı; awaiting_payment ve cancelled hariç). Hafta 300'den fazla sipariş içeriyorsa eksik kalacağı için gösterilmez. */
async function periodStats(){
  var now=new Date(),d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),w0=new Date(d0);w0.setDate(d0.getDate()-((d0.getDay()+6)%7));
  var all=[],off=0,LIM=100,done=false;
  for(var i=0;i<3&&!done;i++){var l=arr(await rpc('oz_seller_orders',{p_status:null,p_limit:LIM,p_offset:off}));all=all.concat(l);off+=l.length;
    if(l.length<LIM||(l.length&&new Date(l[l.length-1].created_at)<w0))done=true}
  if(!done)return null;
  var out={today:{n:0,k:0},week:{n:0,k:0}};
  all.forEach(function(o){var c=new Date(o.created_at);if(isNaN(c)||c<w0||o.status==='cancelled'||o.status==='awaiting_payment')return;var k=num(o.seller_share_kurus);out.week.n++;out.week.k+=k;if(c>=d0){out.today.n++;out.today.k+=k}});
  return out;
}
/* Düşük stok (<5) ve tükenen (0) yayındaki ürün sayısı — satıcının kendi ürün/stok verisinden */
var LOW_STOCK=5;
async function stockStats(){
  var sid=sellerId();if(!sid)return null;
  var ps=arr(await get('oz_products?select=id,status&seller_id=eq.'+encodeURIComponent(sid)+'&status=eq.published'));if(!ps.length)return {low:0,out:0};
  var vs=arr(await get('oz_variants?select=product_id,stock,is_active&product_id=in.'+inList(ps.map(function(x){return x.id}))));
  var low=0,out=0;ps.forEach(function(p){var v=vs.filter(function(x){return x.product_id===p.id&&x.is_active!==false});if(!v.length)return;var tot=v.reduce(function(n,x){return n+num(x.stock)},0);if(tot<=0)out++;else if(v.some(function(x){return num(x.stock)<LOW_STOCK}))low++});
  return {low:low,out:out};
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
  var vars=pf.variants.map(function(v,i){return '<div class="ozVarRow"><div class="ozTwo"><div><label>Seçenek adı</label><input class="ozIn" data-v="label" value="'+E(v.label)+'" placeholder="Örn. 500 g" maxlength="40"></div><div><label>Stok kodu (isteğe bağlı)</label><input class="ozIn" data-v="sku" value="'+E(v.sku)+'" maxlength="40"></div></div>'+
    '<div class="ozTwo"><div><label>Fiyat (₺)</label><input class="ozIn" data-v="price" inputmode="decimal" value="'+E(v.price)+'"></div><div><label>Eski fiyat (₺, isteğe bağlı)</label><input class="ozIn" data-v="compare" inputmode="decimal" value="'+E(v.compare)+'"></div></div>'+
    '<div class="ozTwo"><div><label>Stok (adet)</label><input class="ozIn" data-v="stock" inputmode="numeric" value="'+E(v.stock)+'"></div><div><label>Kargo ağırlığı (gram)</label><input class="ozIn" data-v="weight" inputmode="numeric" value="'+E(v.weight)+'"></div></div>'+
    '<div class="ozRow2" style="justify-content:space-between"><label class="ozChk" style="margin:0"><input type="checkbox" data-v="active"'+(v.active?' checked':'')+'><span>Satışta</span></label><button type="button" class="ozBtn sm ghost" data-a="varDel" data-i="'+i+'"'+(pf.variants.length<2?' disabled':'')+'>Seçeneği sil</button></div></div>'}).join('');
  var catOpts='<option value="">Kategori seç</option>'+pf.cats.map(function(c){return '<option value="'+E(c.id)+'"'+(String(c.id)===String(pf.category_id)?' selected':'')+'>'+E(c.name)+'</option>'}).join('');
  var st=PROD_ST[pf.status]||['Taslak',''];
  paint(pageHead(pf.id?'Ürünü düzenle':'Yeni ürün')+(pf.id?'<p style="margin:-6px 0 12px">'+stTag(PROD_ST,pf.status)+'</p>':'')+(pf.reason&&pf.status==='rejected'?'<div class="ozWarn">Gerekçe: '+E(pf.reason)+'</div>':'')+
    '<div class="ozCard"><h3>Fotoğraflar</h3>'+imgs+'</div>'+
    '<div class="ozCard ozForm"><h3>Ürün bilgileri</h3>'+f('name','Ürün adı',{max:120})+'<label for="ozP_category_id">Kategori</label><select class="ozSel" id="ozP_category_id" data-chg="pfCat">'+catOpts+'</select><p class="ozHint" id="ozPCatN"'+(pfCatIsDrink(pf.category_id)?'':' hidden')+'>⚠ '+E(DRINK_NOTE)+'</p>'+
      ta('description','Açıklama','Ürünü, üretim şeklini ve tadını anlat')+
      '<div class="ozWarn">Sağlık beyanı uyarısı: "hastalığı önler, tedavi eder, bağışıklığı güçlendirir" gibi sağlık iddiaları yasal olarak yasaktır. Bu tür ifadeler içeren ürünler onaylanmaz.</div>'+
      ta('ingredients','İçindekiler','Örn. %100 süzme çiçek balı')+
      (pf.id?'<div class="ozReapp"><p class="ozHint">↻ Bu alanları değiştirirsen ürün yeniden onaya girer.</p>':'<div>')+f('net_content','Net miktar',{max:40})+
      '<div class="ozTwo"><div>'+f('origin_city','Menşe (il)',{max:40})+'</div><div>'+f('shelf_life_days','Raf ömrü (gün)',{im:'numeric',max:5})+'</div></div>'+
      ta('origin_note','Menşe notu','Örn. Ula köyündeki kendi bahçemizden')+ta('storage_info','Saklama koşulları','Örn. Serin ve kuru yerde saklayın')+f('organic_cert','Organik sertifika no (varsa)',{max:80})+
      '<fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="ozMuted" style="font-weight:700;font-size:13px">Alerjenler</legend><div class="ozWrap">'+Object.keys(ALG).map(function(k){var on=pf.allergens.indexOf(k)>=0;return '<button type="button" class="ozChip'+(on?' on':'')+'" data-a="algT" data-k="'+k+'" aria-pressed="'+on+'">'+E(ALG[k])+'</button>'}).join('')+'</div></fieldset></div></div>'+
    '<div class="ozCard" id="ozVars"><h3>Seçenekler (gramaj), fiyat ve stok</h3><p class="ozHint" style="margin:0 0 8px">Tek seçenek yeterli; 250 g / 500 g / 1 kg gibi farklı boyları ayrı satır olarak ekle. Alıcı "+" ile seçer.</p>'+vars+'<button type="button" class="ozBtn sm" data-a="varAdd">Seçenek ekle</button></div>'+
    '<p class="ozErr" id="ozPErr" hidden></p><div class="ozRow2"><button type="button" class="ozBtn'+(pfSubLabel(pf)?'':' pri')+'" data-a="prodSave">Kaydet</button>'+(pfSubLabel(pf)?'<button type="button" class="ozBtn pri" data-a="prodSave" data-sub="1">'+pfSubLabel(pf)+'</button>':'')+'</div>');
}
/* K37: oz_product_submit taslağı doğrudan yayınlar, reddedileni yeniden incelemeye alır; onaysız satıcıda / yayındaki üründe gönderim düğmesi yok */
function sellerApproved(){var st=(SELLER.dash&&SELLER.dash.status)||((S().my_seller||{}).status)||'';return /^(approved|active)$/.test(st)}
function pfSubLabel(pf){if(!sellerApproved())return '';var st=pf.status||'draft';return st==='draft'?'Kaydet ve yayınla':st==='rejected'?'Yeniden incelemeye gönder':''}
function prodSubToast(st){return st==='rejected'?'Ürün yeniden incelemeye gönderildi':'Ürün yayınlandı'}
/* K37: Süt & İçecekler notu */
function pfCatIsDrink(id){var c=(ST.pf&&ST.pf.cats||[]).filter(function(x){return String(x.id)===String(id)})[0];return !!c&&(c.slug==='icecekler'||/içecek/i.test(c.name||''))}
var DRINK_NOTE='Taze süt/çabuk bozulan ürün satılamaz; yalnızca uzun ömürlü içecekler.';
function pfPayload(){
  var pf=ST.pf;pfRead();
  if(pf.name.trim().length<3)return 'Ürün adı en az 3 karakter olmalı.';
  if(!pf.category_id)return 'Kategori seç.';
  if(!pf.images.length)return 'En az bir fotoğraf ekle.';
  var vs=[];
  for(var i=0;i<pf.variants.length;i++){var v=pf.variants[i];var pr=tlToKurus(v.price),cm=v.compare?tlToKurus(v.compare):null,stk=v.stock===''?NaN:Number(v.stock),wg=v.weight===''?NaN:Number(v.weight);
    if(!v.label.trim())return (i+1)+'. seçeneğin adını yaz.';
    if(!(pr>0))return (i+1)+'. seçeneğin fiyatını '+(String(v.price).trim()?'doğru yaz (örn. 1.250,50).':'yaz.');
    if(cm!==null&&isNaN(cm))return (i+1)+'. seçeneğin eski fiyatını doğru yaz (örn. 1.250,50) ya da boş bırak.';
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
  else{var dg=g('phone').replace(/\D/g,'');if(dg.length<10||dg.length>13)err='Geçerli bir telefon numarası yaz.';else if(!g('city'))err='İl yaz.';else if(!g('ship_from_city'))err='Kargonun çıkacağı ili yaz.';else if(!(hd>=1&&hd<=14))err='Hazırlık süresi 1-14 iş günü olmalı.';else if(fs!==null&&!(fs>0))err='Kargo bedava tutarını doğru yaz (örn. 1.000 veya 1.000,50) ya da boş bırak.'}
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
  sTab:function(b){var a={tab:b.dataset.tab};if(b.dataset.st!=null)a.st=b.dataset.st;if(b.dataset.low)a.low=1;var c=cur();if(c.k!=='seller'){go('seller',a);return}c.a=a;draw()},
  spCat:function(b){var c=cur();c.a=Object.assign({},c.a,{tab:'urunler',cat:b.dataset.cat||''});hSync();draw()},
  soTab:function(b){var c=cur();var k=b.dataset.st||'';var now=(c.a&&c.a.st)||'';c.a=Object.assign({},c.a,{tab:'ozet',st:now===k?'':k});draw()},
  storeSave:function(b){return saveStore(b)},
  rateAdd:function(){SELLER.rates=readRates().map(function(r){return {max_weight_g:isFinite(r.max_weight_g)?r.max_weight_g:'',fee_kurus:isFinite(r.fee_kurus)?r.fee_kurus:''}});SELLER.rates.push({max_weight_g:'',fee_kurus:''});var el=D.getElementById('ozRates');if(el)el.outerHTML=ratesEditor()},
  rateDel:function(b){var rs=readRates().map(function(r){return {max_weight_g:isFinite(r.max_weight_g)?r.max_weight_g:'',fee_kurus:isFinite(r.fee_kurus)?r.fee_kurus:''}});rs.splice(+b.dataset.i,1);SELLER.rates=rs;var el=D.getElementById('ozRates');if(el)el.outerHTML=ratesEditor()},
  ratesSave:async function(b){
    var rs=readRates();var err='';
    rs.forEach(function(r,i){if(!err&&!(r.max_weight_g>0))err=(i+1)+'. satırda ağırlığı yaz.';if(!err&&!(r.fee_kurus>=0))err=(i+1)+'. satırda ücreti doğru yaz (örn. 49,90).'});
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
      if(b.dataset.sub){var st0=ST.pf.status;await rpc('oz_product_submit',{p_id:id});toast(prodSubToast(st0))}else toast('Ürün kaydedildi');
      NAV.pop();var c=cur();if(c.k==='seller')c.a={tab:'urunler'};draw();
    });
  },
  prodSubmit:async function(b){await busy(b,async function(){await rpc('oz_product_submit',{p_id:b.dataset.id});toast(prodSubToast(b.dataset.st));draw()})},
  prodHide:async function(b){await busy(b,async function(){await rpc('oz_product_set_hidden',{p_id:b.dataset.id,p_hidden:b.dataset.h==='1'});toast(b.dataset.h==='1'?'Ürün gizlendi':'Ürün yeniden gösteriliyor');draw()})},
  prodDel:async function(b){if(!await confirmBox('Ürün silinsin mi?','Bu işlem geri alınamaz.','Sil',true))return;await rpc('oz_product_delete',{p_id:b.dataset.id});toast('Ürün silindi');draw()},
  stockBox:async function(b){
    var vs=arr(SELLER.variants).filter(function(v){return v.product_id===b.dataset.id});
    var v=await formBox('Stok güncelle',vs.map(function(x,i){return '<label for="ozSt'+i+'">'+E(x.label||'Seçenek')+'</label><input class="ozIn" id="ozSt'+i+'" data-f="'+E(x.id)+'" inputmode="numeric" value="'+num(x.stock)+'">'}).join(''),'Kaydet',function(v){for(var k in v){var n=Number(v[k]);if(!(n>=0)||Math.floor(n)!==n)return 'Stok 0 veya daha büyük tam sayı olmalı.'}return ''});
    if(!v)return;
    for(var i=0;i<vs.length;i++){var n=Number(v[vs[i].id]);if(n!==num(vs[i].stock))await rpc('oz_variant_set_stock',{p_variant:vs[i].id,p_stock:n})}
    toast('Stok güncellendi');draw();
  },
  soAct:async function(b){await busy(b,async function(){await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:b.dataset.act,p:{}});toast(b.dataset.act==='accept'?'Sipariş kabul edildi — sırada "Hazırlandı"':'Sipariş hazırlandı — sırada "Kargoya ver"');draw()})},
  soShip:async function(b){
    var v=await formBox('Kargoya ver','<label for="ozShC">Kargo firması</label><input class="ozIn" id="ozShC" data-f="carrier" list="ozCarriers" maxlength="40"><datalist id="ozCarriers">'+CARRIERS.map(function(c){return '<option value="'+E(c)+'">'}).join('')+'</datalist><label for="ozShN">Takip numarası</label><input class="ozIn" id="ozShN" data-f="no" maxlength="60"><label for="ozShU">Takip bağlantısı (isteğe bağlı)</label><input class="ozIn" id="ozShU" data-f="url" type="url" inputmode="url" placeholder="https://" maxlength="300">','Kargoya verildi',function(v){if(v.carrier.length<2)return 'Kargo firmasını yaz.';if(v.no.length<3)return 'Takip numarasını yaz.';if(v.url&&!/^https?:\/\/\S+$/i.test(v.url))return 'Bağlantı https:// ile başlamalı.';return ''});
    if(!v)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'ship',p:{carrier:v.carrier,tracking_no:v.no,tracking_url:v.url||null}});toast('Sipariş kargoya verildi; alıcıya takip bilgisi gönderildi');draw();
  },
  soCancel:async function(b){
    var rej=!!b.dataset.rej;
    var v=await formBox(rej?'Siparişi reddet':'Siparişi iptal et','<label for="ozScR">'+(rej?'Reddetme nedeni':'İptal gerekçesi')+' * (alıcı görür)</label><textarea class="ozTa" id="ozScR" data-f="r" maxlength="300" placeholder="Örn. Ürün stokta kalmadı"></textarea>',rej?'Reddet':'İptal et',function(v){return !v.r?'Neden alanı zorunlu.':v.r.length<5?'Nedeni biraz daha açık yaz (en az 5 harf).':''});
    if(!v)return;await rpc('oz_transition_order',{p_order:b.dataset.id,p_action:'cancel',p:{reason:v.r}});toast(rej?'Sipariş reddedildi; alıcıya bildirildi':'Sipariş iptal edildi');draw();
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
    /* K28: IBAN'ı boş satıcıyı uyar (yönetici oz_sellers okuyabilir; IBAN değeri çekilmez, yalnızca IBAN'ı olan id'ler). Okunamazsa uyarı gösterilmez. */
    var sids=l.map(function(x){return x.seller_id}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i});var ib=null;
    if(sids.length){try{ib={};arr(await get('oz_sellers?select=id&iban=not.is.null&id=in.'+inList(sids))).forEach(function(r){ib[r.id]=true})}catch(e){ib=null}}
    ADM.ib=ib;
    aPaint(filterBar('payouts',A_ST_PAY,false)+
      (due.length?'<h4 style="margin:10px 0 6px">Ödemeye hazır satıcılar</h4>'+due.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(x.seller_name||x.seller_id)+'</b><span>'+TL(x.available_kurus)+'</span></div>'+noIbanWarn(ib,x.seller_id)+(function(){var ni=!!(ib&&!ib[x.seller_id]);return '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn pri" data-a="aPayNew" data-id="'+E(x.seller_id)+'"'+(ni?' disabled aria-describedby="ozPN_'+E(x.seller_id)+'"':'')+'>Ödeme kaydı oluştur</button>'+(ni?'<span class="pfxMuted" id="ozPN_'+E(x.seller_id)+'">Önce satıcının IBAN\'ı gerekli</span>':'')+'</div><p class="ozErr" data-payerr="'+E(x.seller_id)+'" hidden></p>'})()+'</div>'}).join(''):'')+
      '<h4 style="margin:10px 0 6px">Ödeme kayıtları</h4>'+(pays.length?pays.map(function(x){return '<div class="pfxCard"><div class="pfxRow"><b>'+E(x.seller_name||x.seller_id||'')+' · '+TL(x.amount_kurus)+'</b>'+aTag(PST,x.status)+'</div><div class="pfxMuted">'+E([fmtDay(x.created_at),(x.reference||x.bank_reference)?'Ref: '+(x.reference||x.bank_reference):''].filter(Boolean).join(' · '))+'</div>'+
        (x.status==='pending'||x.status==='processing'?noIbanWarn(ib,x.seller_id)+'<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn pri" data-a="aPayMark" data-ok="1" data-s="'+E(x.seller_id||'')+'" data-id="'+E(x.id)+'">Ödendi</button><button type="button" class="pfxBtn bad" data-a="aPayMark" data-ok="0" data-id="'+E(x.id)+'">Başarısız</button></div>':'')+'</div>'}).join(''):'<p class="pfxMuted">Ödeme kaydı yok.</p>'));
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
    /* K28: IBAN yalnızca yönetici ekranında (oz_admin_seller_detail) */
    '<div class="pfxCard"><b>Ödeme hesabı</b>'+(s.iban?'<table class="pfxTbl" style="margin-top:8px"><tr><th>IBAN</th><td style="overflow-wrap:anywhere">'+E(ibanFmt(s.iban))+'</td></tr><tr><th>Hesap sahibi</th><td>'+E(s.iban_holder||'—')+'</td></tr></table><div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" data-a="aCopy" data-v="'+E(ibanClean(s.iban))+'">Kopyala</button></div>':'<p class="pfxMuted" style="margin:6px 0 0">IBAN girilmemiş</p>')+'</div>'+
    '<div class="pfxCard"><b>Belgeler</b>'+(docs.length?docs.map(function(x){return '<div style="margin:8px 0;padding-top:8px;border-top:1px solid rgba(127,127,127,.2)"><div class="pfxRow"><span>'+E(DOC_T[x.doc_type||x.type]||x.doc_type||x.type)+' · '+E(x.file_name||x.name||'')+'</span>'+aTag(DOC_ST,x.status)+'</div><div class="pfxRow" style="margin-top:6px"><button type="button" class="pfxBtn" data-a="aDocView" data-p="'+E(x.path||x.storage_path||'')+'">Görüntüle</button><button type="button" class="pfxBtn pri" data-a="aDoc" data-ok="1" data-id="'+E(x.id)+'">Onayla</button><button type="button" class="pfxBtn bad" data-a="aDoc" data-ok="0" data-id="'+E(x.id)+'">Reddet</button></div></div>'}).join(''):'<p class="pfxMuted">Belge yok.</p>')+'</div>'+
    '<div class="pfxCard"><b>Kargo tablosu</b>'+(rates.length?'<table class="pfxTbl">'+rates.map(function(r){return '<tr><td>'+NF1.format(num(r.max_weight_g)/1000)+' kg\'a kadar</td><td>'+TL(r.fee_kurus)+'</td></tr>'}).join('')+'</table>':'<p class="pfxMuted">Kargo tablosu yok.</p>')+'</div>'+
    '<div class="pfxCard"><b>Karar</b><label class="pfxLbl" for="ozAdmCom">Komisyon (%)</label><input class="pfxIn" id="ozAdmCom" inputmode="decimal" value="'+E(String(pct).replace('.',','))+'"><div class="pfxRow"><button type="button" class="pfxBtn pri" data-a="aSDec" data-d="approve" data-id="'+E(s.id||id)+'">Onayla</button><button type="button" class="pfxBtn bad" data-a="aSDec" data-d="reject" data-id="'+E(s.id||id)+'">Reddet</button><button type="button" class="pfxBtn" data-a="aSDec" data-d="suspend" data-id="'+E(s.id||id)+'">Askıya al</button></div></div>');
}
function ibanFmt(v){return ibanClean(v).replace(/(.{4})/g,'$1 ').trim()}
var NO_IBAN='Satıcı IBAN girmemiş, ödeme yapılamaz';
function noIbanWarn(ids,sid){return sid&&ids&&!ids[sid]?'<div class="ozWarn" role="alert" style="margin:8px 0 0">'+NO_IBAN+'</div>':''}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{var a=D.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='fixed';a.style.opacity='0';D.body.appendChild(a);a.select();var ok=D.execCommand('copy');a.remove();return ok}catch(x){return false}}}
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
  aPayNew:async function(b){var ni=ADM.ib&&!ADM.ib[b.dataset.id];if(!await confirmBox('Ödeme kaydı oluşturulsun mu?',(ni?NO_IBAN+'. ':'')+'Satıcının ödemeye hazır tutarı için ödeme kaydı açılır. Parayı bankadan gönderdikten sonra "Ödendi" olarak işaretle.','Oluştur'))return;
    /* K29: sunucu geçerli IBAN yoksa PF_STATE ile reddeder; mesaj olduğu gibi gösterilir */
    var pe=qa('[data-payerr]').filter(function(x){return x.dataset.payerr===b.dataset.id})[0];if(pe)pe.hidden=true;
    await busy(b,async function(){try{await rpc('oz_admin_create_payout',{p_seller:b.dataset.id})}catch(e){if(e&&e.auth)throw e;if(pe){pe.textContent=e.message;pe.hidden=false}toast(e.message);return}toast('Ödeme kaydı oluşturuldu');await aReload()})},
  aCopy:async function(b){toast(await copyText(b.dataset.v)?'IBAN kopyalandı':'Kopyalanamadı; elle seç ve kopyala.')},
  aPayMark:async function(b){var ok=b.dataset.ok==='1';var ni=ok&&ADM.ib&&b.dataset.s&&!ADM.ib[b.dataset.s];var v=await formBox(ok?'Ödendi olarak işaretle':'Başarısız olarak işaretle',(ni?'<div class="ozWarn" role="alert">'+NO_IBAN+'</div>':'')+'<label for="ozAPr">'+(ok?'Banka referansı':'Açıklama')+'</label><input class="ozIn" id="ozAPr" data-f="r" maxlength="80">','Kaydet',function(v){return ok&&v.r.length<2?'Banka referansını yaz.':''});if(!v)return;await rpc('oz_admin_mark_payout',{p_id:b.dataset.id,p_paid:ok,p_reference:v.r||null});toast('Ödeme güncellendi');await aReload()},
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
