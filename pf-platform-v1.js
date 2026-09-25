/* İşimi Çöz · Platform katmanı (Faz 3/4) — pf-platform-v1.js
   Yasal metinler, onay kayıtları (KVKK), gizlilik ve veri talepleri, destek/uyuşmazlık,
   şikâyet/engelleme, yönetim paneli (belgeler, işletme onayı, moderasyon, finans, ayarlar, denetim),
   harita sokak etiketi katmanı.
   - Tüm yetki ve kurallar veritabanında (RLS + SECURITY DEFINER RPC) uygulanır; bu dosya yalnızca arayüzdür.
   - Migration'lar (pf_14…pf_19) uygulanmamışsa hiçbir şey göstermez; mevcut site aynen çalışır.
   - Sır/anahtar içermez. Ödeme kartı verisi bu dosyaya hiç gelmez. */
(function(){
'use strict';
if(window.PF&&window.PF.__v)return;
var PF=window.PF={__v:1,enabled:false,settings:{},roles:null,legal:null};

/* ------------------------------------------------------------------ temel */
function SBURL(){try{return SUPABASE_URL}catch(e){return 'https://zvffspbowdzvrrzefhkr.supabase.co'}}
function SBKEY(){try{return SUPABASE_KEY}catch(e){return ''}}
function sess(){try{return typeof getAuthSession==='function'?getAuthSession():null}catch(e){return null}}
function uid(){var s=sess();return s&&s.user&&s.user.id||null}
async function tok(){try{if(typeof v2EnsureFreshToken==='function')await v2EnsureFreshToken()}catch(e){}var s=sess();return s&&s.access_token||null}
function esc(v){try{if(typeof escapeHTML==='function')return escapeHTML(v)}catch(e){}return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clean(m){m=String(m||'');m=m.replace(/^(PF|FOOD)_[A-Z]+:\s*/,'');if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Bağlantı sorunu. İnternetini kontrol edip tekrar dene.';if(/permission denied|row-level security/i.test(m))return 'Bu işlem için yetkin yok.';if(/JWT/i.test(m))return 'Oturumun sona erdi. Lütfen tekrar giriş yap.';return m||'Beklenmeyen bir hata oluştu.'}
function isMissing(e){return !!(e&&(e.code==='PGRST202'||e.status===404&&/function|schema cache/i.test(e.message||'')))}
async function call(path,opt){
  opt=opt||{};var t=opt.anon?null:await tok();
  if(opt.auth&&!t){var er=new Error('Devam etmek için giriş yapmalısın.');er.code='NOAUTH';throw er}
  var h={'apikey':SBKEY(),'Authorization':'Bearer '+(t||SBKEY()),'Accept':'application/json'};
  if(opt.body!==undefined)h['Content-Type']='application/json';
  var r=await fetch(SBURL()+path,{method:opt.method||'POST',headers:h,body:opt.body!==undefined?JSON.stringify(opt.body):undefined});
  var txt=await r.text();var d=null;try{d=txt?JSON.parse(txt):null}catch(e){d=txt}
  if(!r.ok){var e2=new Error(clean(d&&(d.message||d.error_description||d.error)||('HTTP '+r.status)));e2.code=d&&d.code;e2.status=r.status;throw e2}
  return d;
}
function rpc(fn,args,opt){opt=opt||{};return call('/rest/v1/rpc/'+fn,{body:args||{},auth:opt.auth!==false&&!opt.anon,anon:opt.anon})}
function get(path,opt){return call('/rest/v1/'+path,Object.assign({method:'GET'},opt||{}))}
PF.rpc=rpc;PF.get=get;PF.clean=clean;PF.isMissing=isMissing;
function toast(m,kind){try{if(typeof v2Toast==='function')return v2Toast(m)}catch(e){}var el=document.createElement('div');el.className='pfxToast'+(kind?' '+kind:'');el.textContent=m;document.body.appendChild(el);setTimeout(function(){el.remove()},3200)}
PF.toast=toast;
function fmtDate(ts){if(!ts)return '';var d=new Date(ts);return d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
function money(k){k=Math.round(+k||0);return (k/100).toLocaleString('tr-TR',{minimumFractionDigits:k%100?2:0,maximumFractionDigits:2})+' TL'}
PF.money=money;PF.fmtDate=fmtDate;

/* ------------------------------------------------------------------ stil */
function css(){if(document.getElementById('pfxCss'))return;var s=document.createElement('style');s.id='pfxCss';s.textContent=
'.pfxOv{position:fixed;inset:0;z-index:9000;background:rgba(3,8,18,.62);display:flex;align-items:flex-end;justify-content:center}'+
'@media(min-width:720px){.pfxOv{align-items:center}}'+
'.pfxSh{background:var(--card,#0d1b2e);color:var(--text,#e8eef7);width:100%;max-width:760px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px 28px;box-shadow:0 -8px 30px rgba(0,0,0,.35);border:1px solid var(--line,rgba(255,255,255,.1))}'+
'@media(min-width:720px){.pfxSh{border-radius:18px}}'+
'.pfxHd{display:flex;align-items:center;justify-content:space-between;gap:10px;position:sticky;top:-16px;background:inherit;padding:6px 0 10px;z-index:1}'+
'.pfxHd h2{margin:0;font-size:18px}.pfxX{border:0;background:rgba(127,127,127,.18);color:inherit;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}'+
'.pfxCard{border:1px solid var(--line,rgba(255,255,255,.12));border-radius:14px;padding:12px;margin:10px 0;background:rgba(127,127,127,.06)}'+
'.pfxRow{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}'+
'.pfxBtn{border:1px solid var(--line,rgba(255,255,255,.2));background:rgba(127,127,127,.12);color:inherit;border-radius:10px;padding:9px 12px;font-weight:700;cursor:pointer;font-size:14px}'+
'.pfxBtn.pri{background:#1f7ae0;border-color:#1f7ae0;color:#fff}.pfxBtn.bad{background:#c0392b;border-color:#c0392b;color:#fff}.pfxBtn:disabled{opacity:.5;cursor:default}'+
'.pfxIn,.pfxSel,.pfxTa{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.2));background:rgba(127,127,127,.08);color:inherit;font:inherit;margin:4px 0 8px}'+
'.pfxTa{min-height:90px}.pfxLbl{font-size:13px;opacity:.8;display:block;margin-top:6px}'+
'.pfxMuted{opacity:.72;font-size:13px}.pfxTag{display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:700;background:rgba(127,127,127,.2)}'+
'.pfxTag.ok{background:rgba(46,160,67,.25)}.pfxTag.warn{background:rgba(210,153,34,.28)}.pfxTag.bad{background:rgba(192,57,43,.3)}'+
'.pfxTabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}.pfxTabs button{white-space:nowrap}.pfxTabs button.on{background:#1f7ae0;border-color:#1f7ae0;color:#fff}'+
'.pfxDoc{white-space:pre-wrap;line-height:1.55;font-size:14px}'+
'.pfxChk{display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:14px;line-height:1.4}.pfxChk input{margin-top:3px;width:18px;height:18px;flex:none}'+
'.pfxFoot{margin:28px auto 90px;padding:16px;max-width:980px;font-size:13px;opacity:.85;border-top:1px solid var(--line,rgba(127,127,127,.25))}'+
'.pfxFoot a,.pfxFoot button{color:inherit;background:none;border:0;padding:4px 6px;text-decoration:underline;cursor:pointer;font:inherit}'+
'.pfxMsg{border-radius:12px;padding:8px 10px;margin:6px 0;background:rgba(127,127,127,.12)}.pfxMsg.me{background:rgba(31,122,224,.22)}.pfxMsg.adm{background:rgba(210,153,34,.2)}'+
'.pfxToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9500;background:#111;color:#fff;border-radius:12px;padding:10px 14px;font-weight:700}'+
'.pfxTbl{width:100%;border-collapse:collapse;font-size:13px}.pfxTbl td,.pfxTbl th{border-bottom:1px solid var(--line,rgba(127,127,127,.2));padding:6px 4px;text-align:left;vertical-align:top}'+
'.pfxStreet{background:rgba(255,255,255,.88);color:#1b2533;border:1px solid rgba(0,0,0,.25);border-radius:6px;padding:1px 5px;font:600 11px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.25);pointer-events:none;transform:translate(-50%,-50%)}';
document.head.appendChild(s)}

function sheet(title,html,opt){
  css();opt=opt||{};closeSheet(opt.keep);
  var ov=document.createElement('div');ov.className='pfxOv';ov.id=opt.id||'pfxSheet';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',title);
  ov.innerHTML='<div class="pfxSh"><div class="pfxHd"><h2>'+esc(title)+'</h2>'+(opt.noClose?'':'<button type="button" class="pfxX" data-pfx-close>Kapat</button>')+'</div><div class="pfxBody">'+html+'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov&&!opt.noClose)closeSheet();if(e.target.closest&&e.target.closest('[data-pfx-close]'))closeSheet()});
  document.body.appendChild(ov);return ov;
}
function closeSheet(keep){document.querySelectorAll('.pfxOv').forEach(function(x){if(!keep||x.id!==keep)x.remove()});if(PF._poll){clearInterval(PF._poll);PF._poll=null}}
function body(){var b=document.querySelector('#pfxSheet .pfxBody');return b}
function setBody(h){var b=body();if(b)b.innerHTML=h}
function loading(){return '<p class="pfxMuted">Yükleniyor…</p>'}
function errHTML(e){return '<div class="pfxCard"><b>İşlem tamamlanamadı</b><p class="pfxMuted">'+esc(clean(e&&e.message||e))+'</p></div>'}
PF.sheet=sheet;PF.closeSheet=closeSheet;
function need(){if(!sess()||!sess().access_token){toast('Devam etmek için giriş yapmalısın.');try{openAuthModal('login')}catch(e){}return false}return true}
async function act(btn,fn){if(btn){btn.disabled=true}try{return await fn()}catch(e){toast(clean(e&&e.message||e),'bad');return undefined}finally{if(btn)btn.disabled=false}}

/* ------------------------------------------------------------------ yasal metinler */
var LEGAL_ORDER=['kullanici_sozlesmesi','kvkk_aydinlatma','cerez_politikasi','mesafeli_satis','on_bilgilendirme','iade_iptal','acik_riza_pazarlama','acik_riza_konum','isletme_sozlesmesi','kurye_sozlesmesi','hizmet_veren_sozlesmesi','ilan_kurallari','topluluk_kurallari','hallet_sorumluluk','acik_riza_yurtdisi'];
async function legalList(){if(PF.legal)return PF.legal;try{var l=await rpc('pf_legal_current',{p_audience:null},{anon:true});PF.legal=Array.isArray(l)?l:[]}catch(e){PF.legal=[]}return PF.legal}
PF.legalList=legalList;
PF.openLegal=async function(docType){
  sheet('Yasal metinler',loading());
  try{
    var list=await legalList();
    if(docType){
      var rows=await get('pf_legal_documents?select=title,body,version,published_at,doc_type&status=eq.published&doc_type=eq.'+encodeURIComponent(docType),{anon:true});
      var d=rows&&rows[0];
      if(!d){setBody('<div class="pfxCard"><b>Bu metin henüz yayınlanmadı.</b><p class="pfxMuted">Metin hukuk incelemesi tamamlandıktan sonra burada yayınlanacak.</p></div><button type="button" class="pfxBtn" onclick="PF.openLegal()">‹ Tüm metinler</button>');return}
      setBody('<p class="pfxMuted">Sürüm '+esc(d.version)+' · Yayın: '+esc(fmtDate(d.published_at))+'</p><h3>'+esc(d.title)+'</h3><div class="pfxDoc">'+esc(d.body)+'</div><p><button type="button" class="pfxBtn" onclick="PF.openLegal()">‹ Tüm metinler</button></p>');return;
    }
    var map={};list.forEach(function(x){map[x.doc_type]=x});
    var pub=LEGAL_ORDER.filter(function(k){return map[k]});
    setBody((pub.length?pub.map(function(k){var x=map[k];return '<div class="pfxCard pfxRow"><div><b>'+esc(x.title)+'</b><div class="pfxMuted">Sürüm '+esc(x.version)+(x.summary?' · '+esc(x.summary):'')+'</div></div><button type="button" class="pfxBtn" onclick="PF.openLegal(\''+esc(k)+'\')">Oku</button></div>'}).join(''):
      '<div class="pfxCard"><b>Yasal metinler hazırlanıyor.</b><p class="pfxMuted">Kullanıcı sözleşmesi, KVKK aydınlatma metni ve diğer metinler hukuk incelemesinden sonra burada yayınlanacak.</p></div>')+
      '<p><button type="button" class="pfxBtn" onclick="PF.openCompany()">Künye ve iletişim</button></p>');
  }catch(e){setBody(errHTML(e))}
};
PF.openCompany=async function(){
  sheet('Künye ve iletişim',loading());
  try{
    var rows=await get('pf_company_info?select=key,label,value,sort_order&order=sort_order',{anon:true});
    var filled=(rows||[]).filter(function(r){return r.value&&String(r.value).trim()&&r.key!=='etbis_status'});
    var et=(rows||[]).find(function(r){return r.key==='etbis_status'});
    setBody(filled.length?'<table class="pfxTbl">'+filled.map(function(r){return '<tr><th>'+esc(r.label)+'</th><td>'+esc(r.value)+'</td></tr>'}).join('')+(et&&et.value==='registered'?'<tr><th>ETBİS</th><td>Kayıtlı</td></tr>':'')+'</table>':
      '<div class="pfxCard"><b>Şirket bilgileri henüz eklenmedi.</b><p class="pfxMuted">Platformun işletmeci bilgileri (unvan, adres, vergi ve MERSİS numaraları, iletişim) resmi kuruluş tamamlandığında burada yayınlanacak.</p></div>');
  }catch(e){setBody(errHTML(e))}
};

/* ------------------------------------------------------------------ kayıt onayları */
var PENDING_KEY='pf_pending_consents_v1';
function consentChecklist(list,ctx,aud){
  var fit=aud?function(d){return (d.audience||[]).indexOf(aud)>=0}:function(d){return (d.audience||[]).some(function(a){return a==='all'||a==='customer'})};
  var req=list.filter(function(d){return (d.consent_kind==='required'||(ctx==='order'&&d.consent_kind==='per_order'))&&fit(d)});
  var opt=list.filter(function(d){return d.consent_kind==='optional'&&fit(d)});
  var info=ctx==='signup'?list.find(function(d){return d.doc_type==='kvkk_aydinlatma'}):null;
  if(!req.length&&!opt.length)return '';
  return '<div class="pfxConsents" data-ctx="'+esc(ctx)+'" style="margin:10px 0">'+
    (info?'<p class="pfxMuted" style="margin:6px 0">Kişisel verilerin <a href="#" onclick="PF.openLegal(\'kvkk_aydinlatma\');return false">KVKK Aydınlatma Metni</a> kapsamında işlenir.</p>':'')+
    req.map(function(d){return '<label class="pfxChk"><input type="checkbox" data-doc="'+esc(d.doc_type)+'" data-req="1"><span><a href="#" onclick="PF.openLegal(\''+esc(d.doc_type)+'\');return false">'+esc(d.title)+'</a> metnini okudum, kabul ediyorum. <b>(zorunlu)</b></span></label>'}).join('')+
    opt.map(function(d){return '<label class="pfxChk"><input type="checkbox" data-doc="'+esc(d.doc_type)+'"><span><a href="#" onclick="PF.openLegal(\''+esc(d.doc_type)+'\');return false">'+esc(d.title)+'</a> (isteğe bağlı)</span></label>'}).join('')+'</div>';
}
function readChecklist(root){var out=[],missing=[];(root||document).querySelectorAll('.pfxConsents input[data-doc]').forEach(function(i){out.push({doc_type:i.getAttribute('data-doc'),accepted:!!i.checked});if(i.getAttribute('data-req')&&!i.checked)missing.push(i.getAttribute('data-doc'))});return {items:out,missing:missing}}
PF.consentChecklist=consentChecklist;PF.readChecklist=readChecklist;
async function flushPendingConsents(){
  var raw=null;try{raw=localStorage.getItem(PENDING_KEY)}catch(e){}
  if(!raw||!uid())return;
  try{var p=JSON.parse(raw);if(p&&p.items&&p.items.length){await rpc('pf_record_consents',{p_items:p.items,p_context:p.ctx||'signup',p_subject_id:null,p_user_agent:navigator.userAgent.slice(0,380)})}localStorage.removeItem(PENDING_KEY)}catch(e){if(!/giriş/i.test(e.message||''))try{localStorage.removeItem(PENDING_KEY)}catch(x){}}
}
function wrapAuth(){
  if(typeof window.openAuthModal!=='function'||window.openAuthModal.__pf)return;
  var origOpen=window.openAuthModal,origSubmit=window.submitAuth;
  window.openAuthModal=function(mode){
    origOpen.apply(this,arguments);
    if(mode!=='signup')return;
    legalList().then(function(list){
      var html=consentChecklist(list,'signup');var btn=document.getElementById('authSubmit');
      if(html&&btn&&!document.querySelector('#authModal .pfxConsents'))btn.insertAdjacentHTML('beforebegin',html);
    });
  };window.openAuthModal.__pf=1;
  if(typeof origSubmit==='function'){
    window.submitAuth=async function(mode){
      if(mode==='signup'){
        var m=document.getElementById('authModal');var r=readChecklist(m);
        if(r.missing.length){var er=document.getElementById('authError');if(er)er.innerHTML='<div class="authError">Devam etmek için zorunlu metinleri onaylamalısın.</div>';return}
        if(r.items.length)try{localStorage.setItem(PENDING_KEY,JSON.stringify({ctx:'signup',items:r.items,at:Date.now()}))}catch(e){}
      }
      var res=await origSubmit.apply(this,arguments);
      if(uid()){flushPendingConsents();afterLogin()}
      return res;
    };
  }
}
async function afterLogin(){
  if(!PF.enabled||!uid())return;
  try{PF.roles=await rpc('pf_my_roles',{})}catch(e){PF.roles=null}
  injectDrawer();
  try{
    var miss=await rpc('pf_missing_required_consents',{p_audience:'customer'});
    if(miss&&miss.length&&!sessionStorage.getItem('pf_consent_prompted')){sessionStorage.setItem('pf_consent_prompted','1');promptUpdatedTerms(miss)}
  }catch(e){}
}
function promptUpdatedTerms(miss){
  var list=miss.map(function(d){return {doc_type:d.doc_type,title:d.title,consent_kind:'required',audience:['all']}});
  sheet('Güncellenen metinler','<p>Aşağıdaki metinler yayınlandı veya güncellendi. Hizmeti kullanmaya devam etmek için onayın gerekiyor.</p>'+consentChecklist(list,'login_update')+
    '<button type="button" class="pfxBtn pri" id="pfxTermsOk">Onayla ve devam et</button>');
  document.getElementById('pfxTermsOk').onclick=function(){var btn=this;var r=readChecklist(body());if(r.missing.length)return toast('Zorunlu metinleri onaylamalısın.');
    act(btn,async function(){await rpc('pf_record_consents',{p_items:r.items,p_context:'login_update',p_subject_id:null,p_user_agent:navigator.userAgent.slice(0,380)});closeSheet();toast('Onayın kaydedildi.')})};
}

/* ------------------------------------------------------------------ gizlilik ve verilerim */
var ROLE_TR={customer:'Müşteri',venue:'İşletme',courier:'Kurye',provider:'Usta',seller:'Satıcı'};var VER_TR={unverified:'doğrulanmadı',pending:'bekliyor',missing_docs:'belge eksik',verified:'doğrulandı',rejected:'reddedildi',suspended:'askıda'};
var DR_TYPES={access:'Verilerime erişim / bilgi',export:'Verilerimin kopyası',rectify:'Düzeltme',delete:'Silme',object:'İşlemeye itiraz',restrict:'Kısıtlama',other:'Diğer'};
var DR_ST={open:'Açık',in_progress:'İşlemde',completed:'Tamamlandı',rejected:'Reddedildi',cancelled:'İptal edildi'};
PF.openPrivacy=async function(){
  if(!need())return;
  sheet('Gizlilik ve verilerim',loading());
  try{
    var r=await Promise.all([rpc('pf_my_consents',{}).catch(function(){return []}),rpc('pf_my_data_requests',{}).catch(function(){return []}),rpc('pf_my_verification',{}).catch(function(){return null}),rpc('pf_my_blocks',{}).catch(function(){return []}),legalList()]);
    var consents=r[0]||[],reqs=r[1]||[],ver=r[2],blocks=r[3]||[],legal=r[4]||[];
    var opt=legal.filter(function(d){return d.consent_kind==='optional'});
    var h='';
    h+='<div class="pfxCard"><b>Doğrulama durumum</b><div class="pfxMuted">E-posta: '+(ver&&ver.email_verified?'<span class="pfxTag ok">doğrulandı</span>':'<span class="pfxTag warn">doğrulanmadı</span>')+
      (ver&&ver.roles&&ver.roles.length?ver.roles.map(function(v){return ' · '+esc(ROLE_TR[v.role]||v.role)+': <span class="pfxTag">'+esc(VER_TR[v.status]||v.status)+'</span>'}).join(''):'')+(ver&&ver.courier_status?' · Kurye: <span class="pfxTag">'+esc(({approved:'onaylı',pending:'bekliyor',rejected:'reddedildi',suspended:'askıda'})[ver.courier_status]||ver.courier_status)+'</span>':'')+'</div></div>';
    h+='<div class="pfxCard"><b>Onaylarım</b>'+(consents.length?'<table class="pfxTbl">'+consents.map(function(c){return '<tr><td>'+esc(c.title||c.doc_type)+' <span class="pfxMuted">v'+esc(c.version||'')+(c.current_version&&c.current_version!==c.version?' (güncel v'+esc(c.current_version)+')':'')+'</span></td><td>'+(c.accepted?'<span class="pfxTag ok">onaylı</span>':'<span class="pfxTag">onay yok</span>')+'</td><td class="pfxMuted">'+esc(fmtDate(c.at))+'</td></tr>'}).join('')+'</table>':'<p class="pfxMuted">Kayıtlı onay yok.</p>')+
      opt.map(function(d){var last=consents.find(function(c){return c.doc_type===d.doc_type});var on=!!(last&&last.accepted);return '<div class="pfxRow" style="margin-top:8px"><span>'+esc(d.title)+'</span><button type="button" class="pfxBtn" onclick="PF.toggleOptional(\''+esc(d.doc_type)+'\','+(!on)+',this)">'+(on?'İzni geri al':'İzin ver')+'</button></div>'}).join('')+'</div>';
    h+='<div class="pfxCard"><b>Verilerimin kopyası</b><p class="pfxMuted">Hesabına bağlı kayıtların JSON dosyası olarak indirilir.</p><button type="button" class="pfxBtn" onclick="PF.exportData(this)">Verilerimi indir</button></div>';
    h+='<div class="pfxCard"><b>KVKK başvurularım</b>'+(reqs.length?reqs.map(function(q){return '<div class="pfxRow" style="margin:6px 0"><span>'+esc(DR_TYPES[q.type]||q.type)+' · <span class="pfxTag">'+esc(DR_ST[q.status]||q.status)+'</span><br><span class="pfxMuted">'+esc(fmtDate(q.created_at))+(q.due_at?' · son tarih '+esc(fmtDate(q.due_at)):'')+(q.response?'<br>Yanıt: '+esc(q.response):'')+'</span></span>'+(q.status==='open'?'<button type="button" class="pfxBtn" onclick="PF.cancelDataRequest(\''+esc(q.id)+'\',this)">Geri çek</button>':'')+'</div>'}).join(''):'<p class="pfxMuted">Başvurun yok.</p>')+
      '<label class="pfxLbl">Yeni başvuru türü</label><select class="pfxSel" id="pfxDrType">'+Object.keys(DR_TYPES).filter(function(k){return k!=='delete'}).map(function(k){return '<option value="'+k+'">'+esc(DR_TYPES[k])+'</option>'}).join('')+'</select>'+
      '<textarea class="pfxTa" id="pfxDrText" maxlength="2000" placeholder="Talebini kısaca yaz"></textarea><button type="button" class="pfxBtn pri" onclick="PF.submitDataRequest(this)">Başvuruyu gönder</button><p class="pfxMuted">Başvurular yasal süre içinde yanıtlanır.</p></div>';
    h+='<div class="pfxCard"><b>Engellediğim kullanıcılar</b>'+(blocks.length?blocks.map(function(b){return '<div class="pfxRow"><span>'+esc(b.name||'Kullanıcı')+' <span class="pfxMuted">'+esc(fmtDate(b.at))+'</span></span><button type="button" class="pfxBtn" onclick="PF.block(\''+esc(b.user_id)+'\',false,this)">Engeli kaldır</button></div>'}).join(''):'<p class="pfxMuted">Engellediğin kimse yok.</p>')+'</div>';
    h+='<div class="pfxCard"><b>Hesabımı sil</b><p class="pfxMuted">Silme talebin incelenir; açık siparişin, bekleyen ödemen veya yasal saklama gerektiren kayıtların varsa bunlar tamamlanana kadar hesap anonimleştirilemez. Fatura ve işlem kayıtları yasal süre boyunca saklanır.</p><button type="button" class="pfxBtn bad" onclick="PF.requestDeletion(this)">Hesabımın silinmesini talep et</button></div>';
    h+='<p><button type="button" class="pfxBtn" onclick="PF.openLegal()">Yasal metinler</button> <button type="button" class="pfxBtn" onclick="PF.openCompany()">Künye</button></p>';
    setBody(h);
  }catch(e){setBody(errHTML(e))}
};
PF.toggleOptional=function(doc,on,btn){act(btn,async function(){await rpc('pf_record_consents',{p_items:[{doc_type:doc,accepted:!!on}],p_context:'settings',p_subject_id:null,p_user_agent:navigator.userAgent.slice(0,380)});toast(on?'İzin verildi.':'İzin geri alındı.');PF.openPrivacy()})};
PF.exportData=function(btn){act(btn,async function(){var d=await rpc('pf_my_data_export',{});var blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='isimi-coz-verilerim-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);toast('Dosya indirildi.')})};
PF.submitDataRequest=function(btn){var t=document.getElementById('pfxDrType').value,x=(document.getElementById('pfxDrText').value||'').trim();if(x.length<5)return toast('Talebini birkaç kelimeyle yaz.');act(btn,async function(){await rpc('pf_submit_data_request',{p_type:t,p_details:x});toast('Başvurun alındı.');PF.openPrivacy()})};
PF.cancelDataRequest=function(id,btn){act(btn,async function(){await rpc('pf_cancel_data_request',{p_id:id});PF.openPrivacy()})};
PF.requestDeletion=function(btn){var reason=prompt('Hesabını neden silmek istiyorsun? (isteğe bağlı)','');if(reason===null)return;if(!confirm('Hesabının silinmesini talep etmek istediğine emin misin?'))return;act(btn,async function(){await rpc('pf_request_account_deletion',{p_reason:reason||'—'});toast('Silme talebin alındı.');PF.openPrivacy()})};

/* ------------------------------------------------------------------ şikâyet / engelleme */
var REASONS={fraud:'Dolandırıcılık şüphesi',fake:'Sahte / yanıltıcı',wrong_info:'Yanlış bilgi',inappropriate:'Uygunsuz içerik',harassment:'Taciz / hakaret',spam:'Spam',illegal:'Yasa dışı',safety:'Güvenlik riski',hygiene:'Hijyen / gıda güvenliği',other:'Diğer'};
PF.report=function(targetType,targetId,title){
  if(!need())return;
  sheet('Şikâyet et','<p class="pfxMuted">'+esc(title||'')+'</p><label class="pfxLbl">Neden</label><select class="pfxSel" id="pfxRepR">'+Object.keys(REASONS).map(function(k){return '<option value="'+k+'">'+esc(REASONS[k])+'</option>'}).join('')+'</select>'+
    '<label class="pfxLbl">Açıklama (isteğe bağlı)</label><textarea class="pfxTa" id="pfxRepD" maxlength="1000"></textarea><button type="button" class="pfxBtn pri" id="pfxRepGo">Gönder</button><p class="pfxMuted">Şikâyetin moderasyon ekibine iletilir; kimliğin karşı tarafla paylaşılmaz.</p>');
  document.getElementById('pfxRepGo').onclick=function(){var b=this;act(b,async function(){await rpc('pf_submit_report',{p_target_type:targetType,p_target_id:String(targetId),p_reason:document.getElementById('pfxRepR').value,p_details:document.getElementById('pfxRepD').value||null});closeSheet();toast('Şikâyetin alındı. Teşekkürler.')})};
};
PF.block=function(userId,on,btn){if(!need())return;if(on&&!confirm('Bu kullanıcıyı engellersen sana mesaj gönderemez. Devam edilsin mi?'))return;act(btn,async function(){await rpc('pf_block_user',{p_user:userId,p_block:!!on});toast(on?'Kullanıcı engellendi.':'Engel kaldırıldı.');if(!on&&document.getElementById('pfxSheet'))PF.openPrivacy()})};
PF.reportButton=function(targetType,targetId,title){if(!PF.enabled)return '';var args=(JSON.stringify(targetType)+','+JSON.stringify(String(targetId))+','+JSON.stringify(title||'')).replace(/&/g,'&amp;').replace(/'/g,'&#39;');return '<button type="button" class="pfxBtn" style="font-size:12px;padding:6px 10px" onclick=\'PF.report('+args+')\'>⚑ Şikâyet et</button>'};

/* ------------------------------------------------------------------ hizmet talebi iletişim bilgisi */
PF.fillRequestContact=async function(){
  var el=document.getElementById('pfContactSlot');if(!el||!uid())return;var id=el.getAttribute('data-req');if(!/^[0-9a-f-]{36}$/i.test(id||''))return;
  try{var c=await rpc('pf_request_contact',{p_request_id:id});if(!document.body.contains(el))return;
    if(!c||!c.visible||!c.phone){el.innerHTML=el.getAttribute('data-inline')?'':'<div class="warning" style="margin-top:12px">Müşteri telefonu teklif kabul edildiğinde görünür.</div>';return}
    if(el.getAttribute('data-inline')){el.textContent='📞 '+c.phone;return}
    var tel='tel:'+String(c.phone).replace(/[^0-9+]/g,'');var d=String(c.phone).replace(/\D/g,'');if(d.charAt(0)==='0')d='9'+d;if(d.length===10)d='90'+d;
    el.innerHTML='<div class="card" style="margin-top:12px"><strong>👤 Müşteri iletişim</strong><div class="meta" style="margin-top:8px"><span>'+esc(c.name||'')+'</span><span>📞 '+esc(c.phone)+'</span></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><a class="btn secondary" style="text-align:center;text-decoration:none" href="'+esc(tel)+'">📞 Ara</a><a class="btn secondary" style="text-align:center;text-decoration:none;background:#128C7E;border-color:#128C7E;color:#fff" href="https://wa.me/'+esc(d)+'" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a></div></div>';
  }catch(e){}
};

/* ------------------------------------------------------------------ destek ve uyuşmazlık */
var TK_ST={open:'Açık',awaiting_user:'Senden yanıt bekleniyor',awaiting_counterparty:'Karşı taraf bekleniyor',in_review:'İnceleniyor',resolved:'Çözüldü',rejected:'Reddedildi',closed:'Kapandı'};
var MODS={food:'Yemek siparişi',hizmet:'Usta / hizmet',ilan:'İlan / mesajlaşma',hallet:'Resmî işlem dosyası',account:'Hesap',payment:'Ödeme',other:'Diğer'};
PF.openSupport=async function(){
  if(!need())return;
  sheet('Destek ve uyuşmazlık',loading());
  try{
    var list=await rpc('pf_my_tickets',{});
    setBody('<button type="button" class="pfxBtn pri" onclick="PF.newTicket()">+ Yeni destek talebi</button>'+
      '<p class="pfxMuted">Bir sipariş veya hizmet işiyle ilgili uyuşmazlığı, ilgili siparişin / talebin sayfasındaki “Sorun bildir / uyuşmazlık aç” düğmesiyle açabilirsin.</p>'+
      ((list||[]).length?(list||[]).map(function(t){return '<div class="pfxCard pfxRow"><div><b>'+esc(t.title)+'</b><div class="pfxMuted">'+(t.kind==='dispute'?'Uyuşmazlık':'Destek')+' · '+esc(MODS[t.module]||t.module)+' · '+esc(fmtDate(t.updated_at||t.created_at))+'</div></div><div><span class="pfxTag">'+esc(TK_ST[t.status]||t.status)+'</span> <button type="button" class="pfxBtn" onclick="PF.openTicket(\''+esc(t.id)+'\')">Aç</button></div></div>'}).join(''):'<p class="pfxMuted">Henüz talebin yok.</p>'));
  }catch(e){setBody(errHTML(e))}
};
PF.newTicket=function(module,subjectType,subjectId,kind){
  if(!need())return;kind=kind||'support';
  sheet(kind==='dispute'?'Uyuşmazlık aç':'Yeni destek talebi',
    (kind==='dispute'?'<p class="pfxMuted">Uyuşmazlık kaydı karşı tarafa da iletilir; platform ekibi iki tarafı dinleyerek karar verir. Ödeme iadesi gerekiyorsa karar sonrası ödeme kuruluşu üzerinden yapılır.</p>':'')+
    (module?'':'<label class="pfxLbl">Konu</label><select class="pfxSel" id="pfxTkM">'+Object.keys(MODS).map(function(k){return '<option value="'+k+'">'+esc(MODS[k])+'</option>'}).join('')+'</select>')+
    '<label class="pfxLbl">Başlık</label><input class="pfxIn" id="pfxTkT" maxlength="140"><label class="pfxLbl">Açıklama</label><textarea class="pfxTa" id="pfxTkB" maxlength="4000"></textarea><button type="button" class="pfxBtn pri" id="pfxTkGo">Gönder</button>');
  document.getElementById('pfxTkGo').onclick=function(){var b=this;var t=document.getElementById('pfxTkT').value.trim(),x=document.getElementById('pfxTkB').value.trim();if(t.length<3||x.length<5)return toast('Başlık ve açıklama yaz.');
    act(b,async function(){var r=await rpc('pf_open_ticket',{p_kind:kind,p_module:module||document.getElementById('pfxTkM').value,p_subject_type:subjectType||'none',p_subject_id:subjectId?String(subjectId):null,p_title:t,p_body:x});toast('Talebin alındı.');PF.openTicket(r.id)})};
};
PF.openDispute=function(module,subjectType,subjectId){PF.newTicket(module,subjectType,subjectId,'dispute')};
PF.openTicket=async function(id,admin){
  sheet(admin?'Talep (yönetim)':'Talep',loading(),{id:'pfxSheet'});
  var draw=async function(){
    try{
      var d=await rpc('pf_ticket_detail',{p_ticket_id:id});var t=d.ticket||d;var me=uid();
      var msgs=(d.messages||[]).map(function(m){var cls=m.mine?'me':(m.sender_role==='admin'?'adm':'');return '<div class="pfxMsg '+cls+'"><div class="pfxMuted">'+esc(m.sender_role==='admin'?'Platform ekibi':m.sender_role==='counterparty'?'Karşı taraf':m.sender_role==='system'?'Sistem':'Talep sahibi')+(m.internal?' · iç not':'')+' · '+esc(fmtDate(m.created_at))+'</div>'+esc(m.body)+'</div>'}).join('');
      var closed=['resolved','rejected','closed'].indexOf(t.status)>=0;
      setBody('<div class="pfxCard"><b>'+esc(t.title)+'</b><div class="pfxMuted">'+(t.kind==='dispute'?'Uyuşmazlık':'Destek')+' · '+esc(MODS[t.module]||t.module)+' · <span class="pfxTag">'+esc(TK_ST[t.status]||t.status)+'</span></div>'+(t.resolution?'<p><b>Karar:</b> '+esc(t.resolution)+'</p>':'')+'</div>'+msgs+
        (closed?'<p class="pfxMuted">Bu talep kapandı.</p>':'<textarea class="pfxTa" id="pfxTkR" maxlength="4000" placeholder="Mesajın"></textarea>'+(admin?'<label class="pfxChk"><input type="checkbox" id="pfxTkI"> İç not (kullanıcılar görmez)</label>':'')+'<button type="button" class="pfxBtn pri" id="pfxTkS">Gönder</button>')+
        (admin?'<div class="pfxCard"><b>Durum / karar</b><select class="pfxSel" id="pfxTkSt">'+Object.keys(TK_ST).map(function(k){return '<option value="'+k+'"'+(k===t.status?' selected':'')+'>'+esc(TK_ST[k])+'</option>'}).join('')+'</select><textarea class="pfxTa" id="pfxTkRes" placeholder="Karar açıklaması (çözüldü/reddedildi için zorunlu)"></textarea><button type="button" class="pfxBtn" id="pfxTkSet">Kaydet</button></div>':''));
      var s=document.getElementById('pfxTkS');if(s)s.onclick=function(){var b=this;var x=document.getElementById('pfxTkR').value.trim();if(!x)return;act(b,async function(){await rpc('pf_ticket_reply',{p_ticket_id:id,p_body:x,p_internal:!!(document.getElementById('pfxTkI')&&document.getElementById('pfxTkI').checked)});await draw()})};
      var st=document.getElementById('pfxTkSet');if(st)st.onclick=function(){var b=this;act(b,async function(){await rpc('pf_admin_set_ticket',{p_ticket_id:id,p_status:document.getElementById('pfxTkSt').value,p_resolution:document.getElementById('pfxTkRes').value||null});toast('Kaydedildi.');await draw()})};
    }catch(e){setBody(errHTML(e))}
  };
  await draw();
  if(PF._poll)clearInterval(PF._poll);
  PF._poll=setInterval(function(){var ta=document.getElementById('pfxTkR');if(!document.getElementById('pfxSheet')){clearInterval(PF._poll);PF._poll=null;return}if(ta&&ta.value)return;draw()},20000);
};

/* ------------------------------------------------------------------ belge yükleme (işletme / kurye / usta) */
PF.uploadDocument=async function(subjectType,subjectId,typeCode,file,expiresOn){
  if(!file)throw new Error('Dosya seç.');
  if(file.size>10*1024*1024)throw new Error('Dosya en fazla 10 MB olabilir.');
  if(['application/pdf','image/jpeg','image/png','image/webp'].indexOf(file.type)<0)throw new Error('PDF, JPG, PNG veya WEBP yükleyebilirsin.');
  var t=await tok();if(!t)throw new Error('Giriş yapmalısın.');
  var ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5);
  var path=uid()+'/'+subjectType+'/'+typeCode+'-'+Date.now()+'.'+ext;
  var r=await fetch(SBURL()+'/storage/v1/object/pf-documents/'+path,{method:'POST',headers:{'apikey':SBKEY(),'Authorization':'Bearer '+t,'Content-Type':file.type,'x-upsert':'false'},body:file});
  if(!r.ok){var j=await r.json().catch(function(){return {}});throw new Error(clean(j.message||j.error||'Yükleme başarısız.'))}
  return rpc('pf_register_document',{p_subject_type:subjectType,p_subject_id:String(subjectId),p_type_code:typeCode,p_storage_path:path,p_file_name:file.name,p_mime:file.type,p_size:file.size,p_expires_on:expiresOn||null});
};
var DOC_ST={in_review:['İncelemede','warn'],approved:['Onaylı','ok'],rejected:['Reddedildi','bad'],expired:['Süresi doldu','bad'],replaced:['Yenilendi','']};
PF.documentsHTML=function(docs,subjectType,subjectId){
  var types=docs.types||[],list=docs.documents||[];
  if(!types.length)return '<p class="pfxMuted">Bu kayıt için istenen belge türleri henüz platform tarafından tanımlanmadı.</p>';
  return types.map(function(t){var d=list.find(function(x){return x.type_code===t.code});var st=d&&DOC_ST[d.status];
    return '<div class="pfxCard"><div class="pfxRow"><div><b>'+esc(t.label)+'</b>'+(t.required?' <span class="pfxTag warn">zorunlu</span>':'')+(t.description?'<div class="pfxMuted">'+esc(t.description)+'</div>':'')+'</div>'+(st?'<span class="pfxTag '+st[1]+'">'+esc(st[0])+'</span>':'<span class="pfxTag">Yüklenmedi</span>')+'</div>'+
      (d&&d.review_reason?'<p class="pfxMuted">Not: '+esc(d.review_reason)+'</p>':'')+(d&&d.expires_on?'<p class="pfxMuted">Geçerlilik: '+esc(d.expires_on)+'</p>':'')+
      '<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" class="pfxIn" data-doc-type="'+esc(t.code)+'">'+(t.has_expiry?'<label class="pfxLbl">Geçerlilik bitiş tarihi</label><input type="date" class="pfxIn" data-doc-exp="'+esc(t.code)+'">':'')+
      '<button type="button" class="pfxBtn" onclick="PF._docUp(this,\''+esc(subjectType)+'\',\''+esc(subjectId)+'\',\''+esc(t.code)+'\')">'+(d?'Yeniden yükle':'Yükle')+'</button></div>'}).join('');
};
PF._docUp=function(btn,st,sid,code){var card=btn.closest('.pfxCard');var f=card.querySelector('[data-doc-type]').files[0];var ex=card.querySelector('[data-doc-exp]');
  act(btn,async function(){await PF.uploadDocument(st,sid,code,f,ex&&ex.value||null);toast('Belge yüklendi, incelemeye alındı.');if(PF._docRefresh)PF._docRefresh()})};
PF.openDocuments=async function(subjectType,subjectId,title){
  if(!need())return;
  sheet(title||'Belgelerim',loading());
  PF._docRefresh=async function(){try{var d=await rpc('pf_subject_documents',{p_subject_type:subjectType,p_subject_id:String(subjectId)});setBody('<p class="pfxMuted">Belgeler yalnızca sana ve platformun yetkili inceleme ekibine görünür.</p>'+PF.documentsHTML(d,subjectType,subjectId))}catch(e){setBody(errHTML(e))}};
  PF._docRefresh();
};

/* ------------------------------------------------------------------ işletme başvuru paneli */
var STAGE={application:'Başvuru',documents:'Belgeler',in_review:'İncelemede',approved:'Onaylandı',active:'Yayına hazır',live:'Yayında',rejected:'Reddedildi',suspended:'Askıda'};
PF.venueOnboardingCard=async function(venueId,el){
  if(!PF.enabled||!el)return;
  try{
    var s=await rpc('pf_venue_onboarding_status',{p_venue_id:venueId});
    var live=s.stage==='live';
    var html='<div class="pfxCard"><div class="pfxRow"><b>Başvuru durumu</b><span class="pfxTag '+(live?'ok':s.stage==='rejected'?'bad':'warn')+'">'+esc(STAGE[s.stage]||s.stage)+'</span></div>'+
      (s.reason?'<p class="pfxMuted">Not: '+esc(s.reason)+'</p>':'')+
      (live?'<p class="pfxMuted">İşletmen yayında. Belgelerini güncel tut.</p>':(s.checks||[]).map(function(c){return '<div>'+(c.ok?'✅':'⬜')+' '+esc(c.label)+'</div>'}).join(''))+
      '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" onclick="PF.openDocuments(\'venue\',\''+esc(venueId)+'\',\'İşletme belgeleri\')">Belgeler</button>'+
      (['application','documents','rejected'].indexOf(s.stage)>=0?'<button type="button" class="pfxBtn pri" onclick="PF._venueSubmit(this,\''+esc(venueId)+'\')">İncelemeye gönder</button>':'')+
      (s.stage==='approved'?'<button type="button" class="pfxBtn pri" onclick="PF._venueReady(this,\''+esc(venueId)+'\')">Yayına hazırım</button>':'')+
      (!(s.checks||[]).find(function(c){return c.key==='contract'&&c.ok})?'<button type="button" class="pfxBtn" onclick="PF._venueContract(this,\''+esc(venueId)+'\')">İşletme sözleşmesini onayla</button>':'')+'</div></div>';
    el.innerHTML=html;
  }catch(e){if(!isMissing(e))el.innerHTML=''}
};
PF._venueSubmit=function(b,id){act(b,async function(){await rpc('pf_venue_submit_for_review',{p_venue_id:id});toast('Başvurun incelemeye gönderildi.');PF.venueOnboardingCard(id,b.closest('[data-pf-onb]'))})};
PF._venueReady=function(b,id){act(b,async function(){await rpc('pf_venue_mark_ready',{p_venue_id:id});toast('Hazır olarak işaretlendi. Yayına alma platform tarafından yapılır.');PF.venueOnboardingCard(id,b.closest('[data-pf-onb]'))})};
PF._venueContract=async function(b,id){var list=await legalList();var d=list.find(function(x){return x.doc_type==='isletme_sozlesmesi'});if(!d){toast('İşletme sözleşmesi henüz yayınlanmadı.');return}
  if(!confirm('“'+d.title+'” metnini okudun ve kabul ediyor musun? (Metni görmek için İptal’e basıp Yasal metinler bölümünü açabilirsin.)'))return;
  act(b,async function(){await rpc('pf_record_consents',{p_items:[{doc_type:'isletme_sozlesmesi',accepted:true}],p_context:'venue_application',p_subject_id:id,p_user_agent:navigator.userAgent.slice(0,380)});toast('Onayın kaydedildi.');PF.venueOnboardingCard(id,b.closest('[data-pf-onb]'))})};

/* ------------------------------------------------------------------ çevrim içi ödeme (yemek) */
PF.paymentInit=async function(payload){
  var t=await tok();if(!t)throw new Error('Giriş yapmalısın.');
  var r=await fetch(SBURL()+'/functions/v1/pf-payment?action=init',{method:'POST',headers:{'apikey':SBKEY(),'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  var j=await r.json().catch(function(){return {}});if(!r.ok||j.ok===false)throw new Error(clean(j.error||('Ödeme başlatılamadı ('+r.status+')')));return j;
};
PF.paymentMockComplete=async function(intentId,signature,success){
  var t=await tok();var r=await fetch(SBURL()+'/functions/v1/pf-payment?action=mock_complete',{method:'POST',headers:{'apikey':SBKEY(),'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({intent_id:intentId,signature:signature,success:!!success})});
  var j=await r.json().catch(function(){return {}});if(!r.ok||j.ok===false)throw new Error(clean(j.error||'Test ödemesi tamamlanamadı.'));return j;
};
PF.waitIntent=async function(intentId,onDone){
  sheet('Ödeme kontrol ediliyor','<p>Ödemenin sonucu kontrol ediliyor, lütfen bekle…</p>',{noClose:true});
  var t0=Date.now(),last=null;
  while(Date.now()-t0<90000){
    try{last=await rpc('pf_payment_intent_status',{p_intent_id:intentId});}catch(e){}
    if(last&&['placed','failed','expired','refund_required','refund_processing','refunded'].indexOf(last.status)>=0)break;
    await new Promise(function(r){setTimeout(r,2500)});
  }
  closeSheet();
  if(last&&last.status==='placed'){toast('Ödeme alındı, siparişin restorana iletildi.');if(onDone)onDone(last);return last}
  if(last&&/refund/.test(last.status)){sheet('Sipariş oluşturulamadı','<p>Ödemen alındı ancak sipariş oluşturulamadı: '+esc(last.error||'')+'</p><p>Tutar kartına iade edilecek. Bu süreçte destek talebi açabilirsin.</p><button type="button" class="pfxBtn" onclick="PF.openSupport()">Destek</button>');return last}
  if(last&&(last.status==='failed'||last.status==='expired')){toast('Ödeme tamamlanmadı. Kartından para çekilmedi.');return last}
  sheet('Ödeme sonucu bekleniyor','<p>Ödeme sağlayıcısından sonuç henüz gelmedi. Birkaç dakika sonra “Siparişlerim” ekranını kontrol et. Kartından çekim yapıldıysa ve sipariş oluşmadıysa tutar otomatik iade sürecine alınır.</p>');return last;
};
function handleReturnParams(){
  try{var u=new URL(location.href);var pi=u.searchParams.get('pay_intent');if(pi&&/^[0-9a-f-]{36}$/i.test(pi)){u.searchParams.delete('pay_intent');history.replaceState(null,'',u.pathname+(u.search?u.search:'')+u.hash);
    var open=function(){PF.waitIntent(pi,function(s){try{localStorage.removeItem('isimi_food_cart_v2')}catch(e){}if(s.order_id&&typeof window.showFoodOrderDetail==='function')window.showFoodOrderDetail(s.order_id)})};
    if(uid())open();else setTimeout(open,1500)}
    var lg=u.searchParams.get('pf_legal');if(lg)PF.openLegal(lg==='all'?null:lg);
  }catch(e){}
}

/* ------------------------------------------------------------------ harita: karo ayarı + sokak etiketi katmanı */
PF.tileConfig=function(){var s=PF.settings||{};var url=typeof s.map_tile_url==='string'&&/^https:\/\//.test(s.map_tile_url)&&s.map_tile_url.indexOf('{z}')>0?s.map_tile_url:null;
  return url?{url:url,attribution:typeof s.map_tile_attribution==='string'&&s.map_tile_attribution?s.map_tile_attribution:'© OpenStreetMap katkıcıları'}:null};
var LBL_CACHE={};
PF.enhanceMap=function(L,map){
  if(!PF.settings||PF.settings.map_street_labels!==true)return;
  if(!map||typeof map.on!=='function'||typeof map.getBounds!=='function'||!L||typeof L.marker!=='function')return;
  var layer=[],timer=null,seq=0;
  function clear(){layer.forEach(function(m){try{map.removeLayer(m)}catch(e){}});layer=[]}
  async function refresh(){
    var my=++seq;if(map.getZoom()<17){clear();return}
    var b=map.getBounds();var s=b.getSouth(),w=b.getWest(),n=b.getNorth(),e=b.getEast();
    if((n-s)*(e-w)>0.0004){clear();return}
    var key=[s,w,n,e].map(function(x){return x.toFixed(3)}).join(',');
    var data=LBL_CACHE[key];
    if(!data){
      try{var raw=sessionStorage.getItem('pf_lbl_'+key);if(raw)data=JSON.parse(raw)}catch(x){}
      if(!data){
        var q='[out:json][timeout:8];way["highway"]["name"]('+[s,w,n,e].map(function(x){return x.toFixed(5)}).join(',')+');out tags center 120;';
        try{var r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});if(!r.ok)return;var j=await r.json();
          data=(j.elements||[]).filter(function(x){return x.center&&x.tags&&x.tags.name}).map(function(x){return [x.center.lat,x.center.lon,x.tags.name]});
          try{sessionStorage.setItem('pf_lbl_'+key,JSON.stringify(data))}catch(x){}}catch(x){return}
      }
      LBL_CACHE[key]=data;
    }
    if(my!==seq)return;clear();var seen={};
    data.forEach(function(d){if(seen[d[2]]||layer.length>=45)return;seen[d[2]]=1;
      try{var m=L.marker([d[0],d[1]],{interactive:false,keyboard:false,icon:L.divIcon({className:'',html:'<span class="pfxStreet">'+esc(d[2])+'</span>',iconSize:[0,0]})});m.addTo(map);layer.push(m)}catch(x){}});
  }
  css();map.on('moveend zoomend',function(){clearTimeout(timer);timer=setTimeout(refresh,700)});setTimeout(refresh,900);
};

/* ------------------------------------------------------------------ menü ve alt bilgi */
function injectDrawer(){
  var d=document.getElementById('appDrawer');if(!d)return;
  var old=document.getElementById('pfxDrawer');if(old)old.remove();
  var logged=!!uid();var admin=!!(PF.roles&&PF.roles.is_admin);
  var sec=document.createElement('div');sec.id='pfxDrawer';
  sec.innerHTML='<div class="appDrawerSec">Hesap ve güvenlik</div><div class="appDrawerNav">'+
    (logged?'<button type="button" onclick="closeAppDrawer();PF.openPrivacy()">🔐 Gizlilik ve verilerim</button><button type="button" onclick="closeAppDrawer();PF.openSupport()">🎧 Destek ve uyuşmazlık</button>':'')+
    '<button type="button" onclick="closeAppDrawer();PF.openLegal()">📜 Yasal metinler</button><button type="button" onclick="closeAppDrawer();PF.openCompany()">🏢 Künye ve iletişim</button></div>'+
    (admin?'<div class="appDrawerSec">Yönetim</div><div class="appDrawerNav"><button type="button" onclick="closeAppDrawer();PF.openAdmin()">🛡️ Yönetim paneli</button></div>':'');
  var auth=document.getElementById('drawerAuth');if(auth)d.insertBefore(sec,auth);else d.appendChild(sec);
}
function injectFooter(){
  if(document.getElementById('pfxFoot'))return;css();
  var f=document.createElement('footer');f.id='pfxFoot';f.className='pfxFoot';
  f.innerHTML='<div><button type="button" onclick="PF.openLegal(\'kullanici_sozlesmesi\')">Kullanıcı Sözleşmesi</button> · <button type="button" onclick="PF.openLegal(\'kvkk_aydinlatma\')">KVKK Aydınlatma</button> · <button type="button" onclick="PF.openLegal(\'cerez_politikasi\')">Çerez Politikası</button> · <button type="button" onclick="PF.openLegal(\'iade_iptal\')">İptal ve İade</button> · <button type="button" onclick="PF.openCompany()">Künye / İletişim</button>'+(uid()?' · <button type="button" onclick="PF.openSupport()">Destek</button>':'')+'</div>'+
    '<div class="pfxMuted" style="margin-top:6px">İşimi Çöz bir aracı hizmet platformudur; yemek siparişlerinde satıcı ilgili işletmedir. Resmî işlem rehberliği resmî kurum işlemi yerine geçmez.</div>';
  document.body.appendChild(f);
}

/* ------------------------------------------------------------------ yönetim paneli */
var ADM={tab:null};
function hasRole(r){var R=PF.roles&&PF.roles.roles||[];return R.indexOf('super')>=0||R.indexOf(r)>=0}
var TABS=[['docs','Belgeler','moderator'],['venues','İşletme başvuruları','moderator'],['reports','Şikâyetler','moderator'],['susp','Askıya almalar','moderator'],['tickets','Destek','support'],
  ['kvkk','KVKK başvuruları','legal'],['legal','Yasal metinler','legal'],['company','Şirket bilgileri','legal'],['finance','Finans','finance'],['campaigns','Kampanyalar','finance'],
  ['settings','Ayarlar','ops'],['dispatch','Kurye dağıtımı','ops'],['audit','Denetim kaydı','super']];
PF.openAdmin=async function(tab){
  if(!need())return;
  if(!PF.roles)try{PF.roles=await rpc('pf_my_roles',{})}catch(e){}
  if(!(PF.roles&&PF.roles.is_admin)){toast('Yönetim yetkin yok.');return}
  var tabs=TABS.filter(function(t){return hasRole(t[2])});ADM.tab=tab||ADM.tab||tabs[0][0];
  sheet('Yönetim paneli','<div class="pfxTabs">'+tabs.map(function(t){return '<button type="button" class="pfxBtn'+(t[0]===ADM.tab?' on':'')+'" onclick="PF.openAdmin(\''+t[0]+'\')">'+esc(t[1])+'</button>'}).join('')+'</div><div id="pfxAdm">'+loading()+'</div>');
  var el=document.getElementById('pfxAdm');
  try{await (ADMIN[ADM.tab]||function(){})(el)}catch(e){el.innerHTML=errHTML(e)}
};
function isoDay(off){var d=new Date();d.setDate(d.getDate()+(off||0));return d.toISOString().slice(0,10)}
var ADMIN={
  docs:async function(el){
    var q=await rpc('pf_admin_document_queue',{p_status:'in_review',p_subject_type:null});
    el.innerHTML=(q||[]).length?(q||[]).map(function(d){return '<div class="pfxCard"><div class="pfxRow"><b>'+esc(d.type_label||d.type_code)+'</b><span class="pfxTag">'+esc(d.subject_type)+'</span></div><div class="pfxMuted">'+esc(d.subject_name||d.subject_id)+' · '+esc(d.file_name)+' · '+esc(fmtDate(d.created_at))+(d.expires_on?' · geçerlilik '+esc(d.expires_on):'')+'</div>'+
      '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" onclick="PF._admView(\''+esc(d.storage_path)+'\',this)">Görüntüle</button><button type="button" class="pfxBtn pri" onclick="PF._admDoc(\''+esc(d.id)+'\',\'approved\',this)">Onayla</button><button type="button" class="pfxBtn bad" onclick="PF._admDoc(\''+esc(d.id)+'\',\'rejected\',this)">Reddet</button></div></div>'}).join(''):'<p class="pfxMuted">İnceleme bekleyen belge yok.</p>';
  },
  venues:async function(el){
    var q=await rpc('pf_admin_venue_queue',{p_stage:null});
    el.innerHTML=(q||[]).length?(q||[]).map(function(v){return '<div class="pfxCard"><div class="pfxRow"><b>'+esc(v.name)+'</b><span class="pfxTag">'+esc(STAGE[v.stage]||v.stage)+'</span></div><div class="pfxMuted">'+esc(v.district||'')+' · '+esc(v.owner_email||'')+' · '+esc(fmtDate(v.submitted_at||v.updated_at))+(v.docs_in_review?' · '+esc(v.docs_in_review)+' belge incelemede':'')+(v.reason?'<br>Not: '+esc(v.reason):'')+'</div>'+
      ((v.checks||[]).map(function(c){return '<div>'+(c.ok?'✅':'⬜')+' '+esc(c.label)+'</div>'}).join(''))+
      '<div class="pfxRow" style="margin-top:8px"><button type="button" class="pfxBtn" onclick="PF.openDocuments(\'venue\',\''+esc(v.venue_id)+'\',\'Belgeler · '+esc(v.name)+'\')">Belgeler</button>'+
      (v.stage==='in_review'?'<button type="button" class="pfxBtn pri" onclick="PF._admVenue(\''+esc(v.venue_id)+'\',\'approved\',this)">Onayla</button><button type="button" class="pfxBtn bad" onclick="PF._admVenue(\''+esc(v.venue_id)+'\',\'rejected\',this)">Reddet</button>':'')+
      (v.stage==='active'||v.stage==='approved'?'<button type="button" class="pfxBtn pri" onclick="PF._admPublish(\''+esc(v.venue_id)+'\',this)">Yayına al</button>':'')+'</div></div>'}).join(''):'<p class="pfxMuted">Bekleyen işletme başvurusu yok.</p>';
  },
  reports:async function(el){
    var q=await rpc('pf_admin_reports',{p_status:'open'});
    el.innerHTML=(q||[]).length?(q||[]).map(function(r){return '<div class="pfxCard"><div class="pfxRow"><b>'+esc(REASONS[r.reason]||r.reason)+'</b><span class="pfxTag">'+esc(r.target_type)+'</span></div><div class="pfxMuted">'+esc(r.target_label||r.target_id)+' · '+esc(fmtDate(r.created_at))+(r.source==='marketplace'?' · ilan şikâyeti':'')+'</div>'+(r.details?'<p>'+esc(r.details)+'</p>':'')+
      '<div class="pfxRow"><button type="button" class="pfxBtn pri" onclick="PF._admReport(\''+esc(r.id)+'\',\''+esc(r.source||'pf')+'\',\'resolved\',this)">Çözüldü</button><button type="button" class="pfxBtn" onclick="PF._admReport(\''+esc(r.id)+'\',\''+esc(r.source||'pf')+'\',\'dismissed\',this)">Asılsız</button>'+
      (['listing','user','venue','provider','courier'].indexOf(r.target_type)>=0?'<button type="button" class="pfxBtn bad" onclick="PF._admSuspend(\''+esc(r.target_type)+'\',\''+esc(r.target_id)+'\',this)">Askıya al</button>':'')+'</div></div>'}).join(''):'<p class="pfxMuted">Açık şikâyet yok.</p>';
  },
  susp:async function(el){
    var q=await rpc('pf_admin_suspensions',{p_active:true});
    el.innerHTML='<div class="pfxCard"><b>Yeni askıya alma</b><select class="pfxSel" id="pfxSuT"><option value="user">Kullanıcı</option><option value="listing">İlan</option><option value="venue">İşletme</option><option value="provider">Usta</option><option value="courier">Kurye</option></select><input class="pfxIn" id="pfxSuI" placeholder="Kayıt kimliği (UUID)"><input class="pfxIn" id="pfxSuR" placeholder="Gerekçe"><input type="datetime-local" class="pfxIn" id="pfxSuU"><p class="pfxMuted">Bitiş boşsa süresizdir.</p><button type="button" class="pfxBtn bad" onclick="PF._admSuspend(document.getElementById(\'pfxSuT\').value,document.getElementById(\'pfxSuI\').value.trim(),this,document.getElementById(\'pfxSuR\').value,document.getElementById(\'pfxSuU\').value)">Askıya al</button></div>'+
      ((q||[]).length?(q||[]).map(function(s){return '<div class="pfxCard pfxRow"><div><b>'+esc(s.target_type)+'</b> · '+esc(s.target_label||s.target_id)+'<div class="pfxMuted">'+esc(s.reason)+' · '+(s.ends_at?'bitiş '+esc(fmtDate(s.ends_at)):'süresiz')+'</div></div><button type="button" class="pfxBtn" onclick="PF._admLift(\''+esc(s.id)+'\',this)">Kaldır</button></div>'}).join(''):'<p class="pfxMuted">Aktif askıya alma yok.</p>');
  },
  tickets:async function(el){
    var q=await rpc('pf_admin_tickets',{p_status:null,p_kind:null});
    el.innerHTML=(q||[]).length?(q||[]).map(function(t){return '<div class="pfxCard pfxRow"><div><b>'+esc(t.title)+'</b><div class="pfxMuted">'+(t.kind==='dispute'?'Uyuşmazlık':'Destek')+' · '+esc(MODS[t.module]||t.module)+' · '+esc(fmtDate(t.updated_at||t.created_at))+(t.due_at?' · hedef '+esc(fmtDate(t.due_at)):'')+'</div></div><div><span class="pfxTag">'+esc(TK_ST[t.status]||t.status)+'</span> <button type="button" class="pfxBtn" onclick="PF.openTicket(\''+esc(t.id)+'\',true)">Aç</button></div></div>'}).join(''):'<p class="pfxMuted">Talep yok.</p>';
  },
  kvkk:async function(el){
    var q=await rpc('pf_admin_data_requests',{p_status:null});
    el.innerHTML=(q||[]).length?(q||[]).map(function(r){return '<div class="pfxCard"><div class="pfxRow"><b>'+esc(DR_TYPES[r.type]||r.type)+'</b><span class="pfxTag '+(r.due_at&&new Date(r.due_at)<new Date()&&['open','in_progress'].indexOf(r.status)>=0?'bad':'')+'">'+esc(DR_ST[r.status]||r.status)+'</span></div><div class="pfxMuted">'+esc(r.email||r.user_id)+' · '+esc(fmtDate(r.created_at))+' · son tarih '+esc(fmtDate(r.due_at))+'</div>'+(r.details?'<p>'+esc(r.details)+'</p>':'')+
      (['open','in_progress'].indexOf(r.status)>=0?'<textarea class="pfxTa" id="pfxDrR_'+esc(r.id)+'" placeholder="Başvuru sahibine yanıt"></textarea><div class="pfxRow"><button type="button" class="pfxBtn" onclick="PF._admDr(\''+esc(r.id)+'\',\'in_progress\',this)">İşleme al</button><button type="button" class="pfxBtn pri" onclick="PF._admDr(\''+esc(r.id)+'\',\'completed\',this)">Tamamlandı</button><button type="button" class="pfxBtn" onclick="PF._admDr(\''+esc(r.id)+'\',\'rejected\',this)">Reddet</button>'+
      (r.type==='delete'?'<button type="button" class="pfxBtn bad" onclick="PF._admAnon(\''+esc(r.user_id)+'\',\''+esc(r.id)+'\',this)">Hesabı anonimleştir</button>':'')+'</div>':'')+'</div>'}).join(''):'<p class="pfxMuted">Başvuru yok.</p>';
  },
  legal:async function(el){
    var rows=await get('pf_legal_documents?select=id,doc_type,version,title,status,consent_kind,published_at,lawyer_reviewed,updated_at&order=doc_type,version.desc');
    el.innerHTML='<p class="pfxMuted">Metinler hukukçu tarafından doldurulmadan yayınlanamaz ("[TASLAK" işareti olan metin yayınlanmaz). Yayınlanan metin değiştirilemez; yeni sürüm oluşturulur ve kullanıcılardan yeniden onay istenir.</p>'+
      (rows||[]).map(function(d){return '<div class="pfxCard pfxRow"><div><b>'+esc(d.title)+'</b> <span class="pfxMuted">v'+esc(d.version)+' · '+esc(d.doc_type)+'</span><div><span class="pfxTag '+(d.status==='published'?'ok':d.status==='draft'?'warn':'')+'">'+esc(d.status)+'</span>'+(d.lawyer_reviewed?' <span class="pfxTag ok">hukukçu onaylı</span>':'')+'</div></div><button type="button" class="pfxBtn" onclick="PF._admLegalEdit(\''+esc(d.id)+'\')">'+(d.status==='draft'?'Düzenle':'Görüntüle / yeni sürüm')+'</button></div>'}).join('');
  },
  company:async function(el){
    var rows=await get('pf_company_info?select=key,label,value,is_public,sort_order&order=sort_order');
    el.innerHTML='<p class="pfxMuted">Bu alanlar resmî belgelerdeki bilgilerle doldurulmalıdır. Boş bırakılan alanlar sitede gösterilmez.</p>'+(rows||[]).map(function(r){return '<label class="pfxLbl">'+esc(r.label)+(r.is_public?'':' (gizli)')+'</label>'+(r.key==='etbis_status'?'<select class="pfxSel" data-ck="etbis_status"><option value="not_registered"'+(r.value!=='registered'&&r.value!=='in_progress'?' selected':'')+'>Kayıtlı değil</option><option value="in_progress"'+(r.value==='in_progress'?' selected':'')+'>Başvuru sürecinde</option><option value="registered"'+(r.value==='registered'?' selected':'')+'>Kayıtlı</option></select>':'<input class="pfxIn" data-ck="'+esc(r.key)+'" value="'+esc(r.value||'')+'">')}).join('')+
      '<button type="button" class="pfxBtn pri" onclick="PF._admCompany(this)">Kaydet</button>';
  },
  finance:async function(el){
    el.innerHTML='<div class="pfxRow"><input type="date" class="pfxIn" id="pfxFf" value="'+isoDay(-30)+'" style="width:auto"><input type="date" class="pfxIn" id="pfxFt" value="'+isoDay(0)+'" style="width:auto"><button type="button" class="pfxBtn" onclick="PF.openAdmin(\'finance\')">Getir</button><button type="button" class="pfxBtn" onclick="PF._admRefunds(this)">Bekleyen iadeleri işle</button></div><div id="pfxFin">'+loading()+'</div>';
    var from=document.getElementById('pfxFf').value+'T00:00:00Z',to=document.getElementById('pfxFt').value+'T23:59:59Z';
    var r=await Promise.all([rpc('pf_admin_finance_summary',{p_from:from,p_to:to}),rpc('pf_admin_payouts',{p_status:null}),rpc('pf_admin_reconciliation',{p_from:from,p_to:to}),rpc('pf_admin_invoices',{})]);
    var s=r[0]||{},po=r[1]||[],rc=r[2]||{},inv=r[3]||[];var t=s.totals||{};
    document.getElementById('pfxFin').innerHTML='<div class="pfxCard"><b>Özet</b><table class="pfxTbl">'+Object.keys(t).map(function(k){return '<tr><td>'+esc(k)+'</td><td>'+(/kurus/.test(k)?money(t[k]):esc(t[k]))+'</td></tr>'}).join('')+'</table></div>'+
      '<div class="pfxCard"><b>İşletme bazında</b><table class="pfxTbl"><tr><th>İşletme</th><th>Sipariş</th><th>Net hakediş</th><th></th></tr>'+(s.venues||[]).map(function(v){return '<tr><td>'+esc(v.venue_name||v.venue_id)+'</td><td>'+esc(v.orders)+'</td><td>'+money(v.venue_net_kurus)+'</td><td><button type="button" class="pfxBtn" onclick="PF._admPayout(\'venue\',\''+esc(v.venue_id)+'\',this)">Hakediş oluştur</button></td></tr>'}).join('')+'</table></div>'+
      '<div class="pfxCard"><b>Hakedişler</b>'+(po.length?po.map(function(p){return '<div class="pfxRow" style="margin:6px 0"><span>'+esc(p.party_name||p.party_id)+' · '+money(p.amount_kurus)+' · '+esc(p.order_count)+' sipariş<br><span class="pfxMuted">'+esc(p.status)+(p.bank_reference?' · dekont '+esc(p.bank_reference):'')+'</span></span><span>'+
        (p.status==='draft'?'<button type="button" class="pfxBtn" onclick="PF._admSetPayout(\''+esc(p.id)+'\',\'approved\',this)">Onayla</button><button type="button" class="pfxBtn" onclick="PF._admSetPayout(\''+esc(p.id)+'\',\'cancelled\',this)">İptal</button>':'')+
        (p.status==='approved'?'<button type="button" class="pfxBtn pri" onclick="PF._admSetPayout(\''+esc(p.id)+'\',\'paid\',this)">Ödendi</button>':'')+'</span></div>'}).join(''):'<p class="pfxMuted">Hakediş yok.</p>')+'<p class="pfxMuted">Dört göz kuralı: hakedişi oluşturan kişi onaylayamaz (başka finans yetkilisi varsa). Ödeme banka üzerinden yapılır; burada yalnızca kayıt tutulur.</p></div>'+
      '<div class="pfxCard"><b>Mutabakat</b>'+['online_orders_without_payment','amount_mismatches','intents_needing_refund','refunds_pending'].map(function(k){var a=rc[k]||[];return '<div>'+esc(k)+': <span class="pfxTag '+(a.length?'bad':'ok')+'">'+a.length+'</span></div>'}).join('')+'</div>'+
      '<div class="pfxCard"><b>Belgeler / faturalar</b><p class="pfxMuted">Fatura e-Fatura/e-Arşiv entegratörü üzerinden düzenlenir; burada numarası kaydedilir.</p>'+(inv.length?inv.map(function(i){return '<div class="pfxRow"><span>'+esc(i.kind)+' · '+money(i.amount_kurus)+' · '+esc(i.status)+(i.external_invoice_no?' · '+esc(i.external_invoice_no):'')+'</span>'+(i.status==='pending'?'<button type="button" class="pfxBtn" onclick="PF._admInvoice(\''+esc(i.id)+'\',this)">Belge no gir</button>':'')+'</div>'}).join(''):'<p class="pfxMuted">Kayıt yok.</p>')+'</div>';
  },
  campaigns:async function(el){
    var q=await rpc('pf_admin_campaigns',{});
    el.innerHTML='<div class="pfxCard"><b>Yeni kupon</b><input class="pfxIn" id="pfxCc" placeholder="KOD (ör. HOSGELDIN)"><input class="pfxIn" id="pfxCt" placeholder="Başlık"><select class="pfxSel" id="pfxCk"><option value="percent">Yüzde</option><option value="fixed">Sabit tutar (kuruş)</option></select><input class="pfxIn" id="pfxCv" type="number" placeholder="Değer (yüzde ya da kuruş)"><input class="pfxIn" id="pfxCm" type="number" placeholder="En fazla indirim (kuruş, isteğe bağlı)"><input class="pfxIn" id="pfxCs" type="number" placeholder="En az sepet (kuruş)"><label class="pfxChk"><input type="checkbox" id="pfxCf"> Yalnızca ilk sipariş</label><button type="button" class="pfxBtn pri" onclick="PF._admCampaign(this)">Oluştur</button><p class="pfxMuted">Kuponlar yalnızca “Kupon kullanımı” ayarı açıkken geçerlidir.</p></div>'+
      ((q||[]).length?(q||[]).map(function(c){return '<div class="pfxCard pfxRow"><div><b>'+esc(c.code)+'</b> · '+esc(c.title)+'<div class="pfxMuted">'+(c.kind==='percent'?'%'+esc(c.value):money(c.value))+' · kullanım '+esc(c.used)+' · toplam indirim '+money(c.discount_total_kurus)+'</div></div><button type="button" class="pfxBtn" onclick="PF._admCampaignToggle(\''+esc(c.id)+'\','+(!c.active)+',this)">'+(c.active?'Durdur':'Etkinleştir')+'</button></div>'}).join(''):'');
  },
  settings:async function(el){
    var rows=await get('food_settings?select=key,value');var S={};(rows||[]).forEach(function(r){S[r.key]=r.value});
    var B=[['venue_approval_required','Yeni işletmeler onaysız yayınlanamaz'],['coupons_enabled','Kupon kullanımı'],['scheduled_orders_enabled','İleri tarihli sipariş'],['auto_dispatch_enabled','Otomatik kurye teklifi'],['map_street_labels','Haritada ek sokak etiketleri (OpenStreetMap verisi)'],['payment_mock_enabled','Test ödemesi (gerçek para çekilmez)'],['online_payment_enabled','Online kart ödemesi']];
    el.innerHTML='<div class="pfxCard">'+B.map(function(b){return '<div class="pfxRow" style="margin:6px 0"><span>'+esc(b[1])+'</span><button type="button" class="pfxBtn'+(S[b[0]]===true?' pri':'')+'" onclick="PF._admSet(\''+b[0]+'\','+(S[b[0]]!==true)+',this)">'+(S[b[0]]===true?'Açık':'Kapalı')+'</button></div>'}).join('')+'</div>'+
      '<div class="pfxCard"><b>Ödeme sağlayıcısı</b><select class="pfxSel" id="pfxPp">'+['none','mock','iyzico','paytr'].map(function(p){return '<option'+(S.payment_provider===p?' selected':'')+'>'+p+'</option>'}).join('')+'</select><button type="button" class="pfxBtn" onclick="PF._admSet(\'payment_provider\',document.getElementById(\'pfxPp\').value,this)">Kaydet</button><p class="pfxMuted">Mod: '+esc(S.payment_mode||'sandbox')+'. Canlı moda geçiş panelden yapılamaz; gerçek üye işyeri sözleşmesi ve sunucu anahtarları hazır olduğunda bilinçli olarak SQL ile yapılır.</p></div>'+
      '<div class="pfxCard"><b>Kurye dağıtımı</b><label class="pfxLbl">Teklif süresi (sn, 15-300)</label><input class="pfxIn" type="number" id="pfxOs" value="'+esc(S.courier_offer_seconds||45)+'"><button type="button" class="pfxBtn" onclick="PF._admSet(\'courier_offer_seconds\',+document.getElementById(\'pfxOs\').value,this)">Kaydet</button><label class="pfxLbl">En uzak kurye (km)</label><input class="pfxIn" type="number" id="pfxMk" value="'+esc(S.dispatch_max_km||8)+'"><button type="button" class="pfxBtn" onclick="PF._admSet(\'dispatch_max_km\',+document.getElementById(\'pfxMk\').value,this)">Kaydet</button><label class="pfxLbl">"Kuryen yaklaştı" bildirimi (m)</label><input class="pfxIn" type="number" id="pfxNm" value="'+esc(S.near_notify_m||400)+'"><button type="button" class="pfxBtn" onclick="PF._admSet(\'near_notify_m\',+document.getElementById(\'pfxNm\').value,this)">Kaydet</button></div>'+
      '<div class="pfxCard"><b>Harita karo kaynağı</b><p class="pfxMuted">Boş bırakılırsa OpenStreetMap standart karoları kullanılır. Başka bir sağlayıcı kullanılacaksa kullanım koşullarına uyulmalı ve atıf metni girilmelidir.</p><input class="pfxIn" id="pfxTu" placeholder="https://…/{z}/{x}/{y}.png" value="'+esc(typeof S.map_tile_url==='string'?S.map_tile_url:'')+'"><input class="pfxIn" id="pfxTa" placeholder="Atıf metni" value="'+esc(typeof S.map_tile_attribution==='string'?S.map_tile_attribution:'')+'"><button type="button" class="pfxBtn" onclick="PF._admTiles(this)">Kaydet</button></div>';
  },
  dispatch:async function(el){
    var s=await rpc('pf_admin_dispatch_status',{});
    el.innerHTML='<div class="pfxCard"><div>Otomatik teklif: <b>'+(s.enabled?'açık':'kapalı')+'</b></div><div>Kurye bekleyen teslimat: <b>'+esc(s.searching)+'</b></div><div>Müsait kurye (son 3 dk konum): <b>'+esc(s.available_couriers)+'</b></div><div>Son 1 saat: '+esc(JSON.stringify(s.last_hour||{}))+'</div></div>'+((s.active_offers||[]).map(function(o){return '<div class="pfxCard">'+esc(o.courier||'')+' · '+(o.distance_km!=null?(+o.distance_km).toFixed(1)+' km · ':'')+'bitiş '+esc(fmtDate(o.expires_at))+'</div>'}).join(''));
  },
  audit:async function(el){
    var q=await rpc('pf_admin_audit_list',{p_limit:100,p_offset:0,p_target_type:null,p_action:null});
    el.innerHTML='<table class="pfxTbl"><tr><th>Zaman</th><th>İşlem</th><th>Hedef</th><th>Yapan</th></tr>'+(q||[]).map(function(a){return '<tr><td>'+esc(fmtDate(a.created_at))+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.target_type)+' '+esc(String(a.target_id||'').slice(0,8))+'</td><td>'+esc(a.actor_email||String(a.actor_id||'').slice(0,8))+'</td></tr>'}).join('')+'</table><p class="pfxMuted">Denetim kayıtları değiştirilemez ve silinemez.</p>';
  }
};
PF._admView=async function(path,btn){await act(btn,async function(){var t=await tok();var r=await fetch(SBURL()+'/storage/v1/object/sign/pf-documents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{'apikey':SBKEY(),'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});var j=await r.json();if(!r.ok||!j.signedURL)throw new Error(j.message||'Dosya açılamadı.');window.open(SBURL()+'/storage/v1'+j.signedURL,'_blank','noopener')})};
PF._admDoc=function(id,dec,btn){var reason=null;if(dec==='rejected'){reason=prompt('Ret gerekçesi (belge sahibine gösterilir)');if(!reason)return}act(btn,async function(){await rpc('pf_admin_review_document',{p_id:id,p_decision:dec,p_reason:reason});toast('Kaydedildi.');PF.openAdmin('docs')})};
PF._admVenue=function(id,dec,btn){var reason=null;if(dec==='rejected'){reason=prompt('Ret gerekçesi');if(!reason)return}act(btn,async function(){await rpc('pf_admin_review_venue',{p_venue_id:id,p_decision:dec,p_reason:reason});toast('Kaydedildi.');PF.openAdmin('venues')})};
PF._admPublish=function(id,btn){if(!confirm('İşletme yayına alınsın mı?'))return;act(btn,async function(){await rpc('pf_admin_publish_venue',{p_venue_id:id});toast('Yayına alındı.');PF.openAdmin('venues')})};
PF._admReport=function(id,src,st,btn){var res=prompt('Karar notu')||'';act(btn,async function(){await rpc('pf_admin_resolve_report',{p_id:id,p_source:src,p_status:st,p_resolution:res});PF.openAdmin('reports')})};
PF._admSuspend=function(type,id,btn,reason,until){if(!id)return toast('Kayıt kimliği gir.');reason=reason||prompt('Askıya alma gerekçesi');if(!reason)return;act(btn,async function(){await rpc('pf_admin_suspend',{p_target_type:type,p_target_id:String(id),p_reason:reason,p_until:until?new Date(until).toISOString():null});toast('Askıya alındı.');PF.openAdmin('susp')})};
PF._admLift=function(id,btn){var n=prompt('Kaldırma notu')||'';act(btn,async function(){await rpc('pf_admin_lift_suspension',{p_id:id,p_note:n});PF.openAdmin('susp')})};
PF._admDr=function(id,st,btn){var ta=document.getElementById('pfxDrR_'+id);act(btn,async function(){await rpc('pf_admin_handle_data_request',{p_id:id,p_status:st,p_response:ta&&ta.value||null});toast('Kaydedildi.');PF.openAdmin('kvkk')})};
PF._admAnon=function(user,reqId,btn){if(!confirm('Kullanıcının kişisel verileri anonimleştirilecek ve hesabı kapatılacak. Bu işlem geri alınamaz. Devam edilsin mi?'))return;act(btn,async function(){var r=await rpc('pf_admin_anonymize_user',{p_user:user,p_request_id:reqId});toast(r&&r.ok?'Anonimleştirildi.':'Tamamlanamadı.');PF.openAdmin('kvkk')})};
PF._admLegalEdit=async function(id){
  var rows=await get('pf_legal_documents?select=*&id=eq.'+encodeURIComponent(id));var d=rows&&rows[0];if(!d)return;
  var draft=d.status==='draft';
  sheet('Yasal metin · '+d.title,'<p class="pfxMuted">'+esc(d.doc_type)+' · v'+esc(d.version)+' · '+esc(d.status)+'</p><label class="pfxLbl">Başlık</label><input class="pfxIn" id="pfxLt" value="'+esc(d.title)+'"><label class="pfxLbl">Özet</label><input class="pfxIn" id="pfxLs" value="'+esc(d.summary||'')+'"><label class="pfxLbl">Metin</label><textarea class="pfxTa" id="pfxLb" style="min-height:280px">'+esc(d.body)+'</textarea>'+
    '<div class="pfxRow">'+(draft?'<button type="button" class="pfxBtn" id="pfxLsave">Taslağı kaydet</button><label class="pfxChk"><input type="checkbox" id="pfxLr"> Metin hukukçu tarafından incelendi</label><button type="button" class="pfxBtn pri" id="pfxLpub">Yayınla</button>':'<button type="button" class="pfxBtn pri" id="pfxLnew">Bu metinden yeni sürüm taslağı oluştur</button>')+'</div>');
  var val=function(){return {t:document.getElementById('pfxLt').value,s:document.getElementById('pfxLs').value,b:document.getElementById('pfxLb').value}};
  var sv=document.getElementById('pfxLsave');if(sv)sv.onclick=function(){var v=val();act(this,async function(){await rpc('pf_admin_save_legal_doc',{p_id:d.id,p_doc_type:null,p_title:v.t,p_body:v.b,p_summary:v.s,p_consent_kind:null,p_audience:null});toast('Kaydedildi.')})};
  var pb=document.getElementById('pfxLpub');if(pb)pb.onclick=function(){var v=val();var b=this;if(!confirm('Yayınlanan metin değiştirilemez. Yayınlansın mı?'))return;act(b,async function(){await rpc('pf_admin_save_legal_doc',{p_id:d.id,p_doc_type:null,p_title:v.t,p_body:v.b,p_summary:v.s,p_consent_kind:null,p_audience:null});await rpc('pf_admin_publish_legal_doc',{p_id:d.id,p_lawyer_reviewed:document.getElementById('pfxLr').checked});PF.legal=null;toast('Yayınlandı.');PF.openAdmin('legal')})};
  var nw=document.getElementById('pfxLnew');if(nw)nw.onclick=function(){var v=val();act(this,async function(){var r=await rpc('pf_admin_save_legal_doc',{p_id:null,p_doc_type:d.doc_type,p_title:v.t,p_body:v.b,p_summary:v.s,p_consent_kind:d.consent_kind,p_audience:d.audience});PF._admLegalEdit(r.id)})};
};
PF._admCompany=function(btn){act(btn,async function(){var els=document.querySelectorAll('#pfxAdm [data-ck]');for(var i=0;i<els.length;i++){var k=els[i].getAttribute('data-ck');await rpc('pf_admin_set_company',{p_key:k,p_value:els[i].value.trim()||null})}toast('Şirket bilgileri kaydedildi.');PF.openAdmin('company')})};
PF._admSet=function(k,v,btn){act(btn,async function(){await rpc('pf_admin_set_setting',{p_key:k,p_value:v});await loadSettings();toast('Ayar kaydedildi.');PF.openAdmin(ADM.tab)})};
PF._admTiles=function(btn){act(btn,async function(){await rpc('pf_admin_set_setting',{p_key:'map_tile_url',p_value:document.getElementById('pfxTu').value.trim()});await rpc('pf_admin_set_setting',{p_key:'map_tile_attribution',p_value:document.getElementById('pfxTa').value.trim()});await loadSettings();toast('Kaydedildi. Haritalar yeniden açıldığında uygulanır.')})};
PF._admPayout=function(type,id,btn){var f=document.getElementById('pfxFf').value+'T00:00:00Z',t=document.getElementById('pfxFt').value+'T23:59:59Z';act(btn,async function(){await rpc('pf_admin_create_payout',{p_party_type:type,p_party_id:id,p_from:f,p_to:t});toast('Hakediş taslağı oluşturuldu.');PF.openAdmin('finance')})};
PF._admSetPayout=function(id,st,btn){var ref=null;if(st==='paid'){ref=prompt('Banka dekont / işlem numarası');if(!ref)return}act(btn,async function(){await rpc('pf_admin_set_payout',{p_id:id,p_status:st,p_bank_reference:ref,p_note:null});PF.openAdmin('finance')})};
PF._admInvoice=function(id,btn){var no=prompt('Düzenlenen belge (e-Fatura/e-Arşiv) numarası');if(!no)return;act(btn,async function(){await rpc('pf_admin_upsert_invoice',{p:{id:id,status:'issued',external_invoice_no:no}});PF.openAdmin('finance')})};
PF._admRefunds=function(btn){if(!confirm('Bekleyen iadeler ödeme kuruluşuna gönderilecek. Devam edilsin mi?'))return;act(btn,async function(){var t=await tok();var r=await fetch(SBURL()+'/functions/v1/pf-payment?action=process_refunds',{method:'POST',headers:{'apikey':SBKEY(),'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:'{}'});var j=await r.json().catch(function(){return {}});if(!r.ok)throw new Error(j.error||'İade işlenemedi.');toast((j.processed||[]).length+' kayıt işlendi.');PF.openAdmin('finance')})};
PF._admCampaign=function(btn){var g=function(i){return document.getElementById(i).value.trim()};var p={code:g('pfxCc'),title:g('pfxCt'),kind:g('pfxCk'),value:+g('pfxCv'),max_discount_kurus:g('pfxCm')||null,min_subtotal_kurus:g('pfxCs')||0,first_order_only:document.getElementById('pfxCf').checked};if(!p.code||!p.title||!p.value)return toast('Kod, başlık ve değer gerekli.');act(btn,async function(){await rpc('pf_admin_upsert_campaign',{p:p});PF.openAdmin('campaigns')})};
PF._admCampaignToggle=function(id,on,btn){act(btn,async function(){await rpc('pf_admin_upsert_campaign',{p:{id:id,active:on}});PF.openAdmin('campaigns')})};

/* ------------------------------------------------------------------ açılış */
async function loadSettings(){try{var st=await rpc('pf_public_settings',{},{anon:true});if(!st||typeof st!=='object'||Array.isArray(st))return false;PF.settings=st;return true}catch(e){return false}}
PF.loadSettings=loadSettings;
async function boot(){
  var ok=await loadSettings();
  if(!ok){PF.enabled=false;return}
  PF.enabled=true;css();
  wrapAuth();injectDrawer();injectFooter();
  if(typeof window.updateAuthArea==='function'&&!window.updateAuthArea.__pf){var ou=window.updateAuthArea;window.updateAuthArea=function(){var r=ou.apply(this,arguments);try{injectDrawer();var f=document.getElementById('pfxFoot');if(f){f.remove();injectFooter()}}catch(e){}return r};window.updateAuthArea.__pf=1}
  if(uid()){await flushPendingConsents();afterLogin()}
  handleReturnParams();
  try{document.dispatchEvent(new CustomEvent('pf:ready'))}catch(e){}
}
PF.ready=(document.readyState==='loading'?new Promise(function(r){document.addEventListener('DOMContentLoaded',r)}):Promise.resolve()).then(boot).catch(function(){});
})();
