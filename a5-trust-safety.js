/* A5.1 — Marketplace trust & safety layer
 * Feature branch only. No schema change. Hallet untouched.
 */
(()=>{
  if(window.__A5_TRUST_SAFETY__) return; window.__A5_TRUST_SAFETY__=1;
  const app=()=>document.getElementById('app');
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));
  const S=()=>{try{return JSON.parse(localStorage.getItem('isimi_coz_auth_session')||'null')}catch(_){return null}};
  const UID=()=>S()?.user?.id||S()?.user_id||null, TOK=()=>S()?.access_token||S()?.accessToken||null;
  const U='https://zvffspbowdzvrrzefhkr.supabase.co',K='sb_publishable_L_qb9Q4fHktE51PEqEhTAg_O4R0eDiW';
  async function api(method,path,body){const t=TOK();if(!t)throw Error('Bu işlem için giriş yapmalısın.');const h={apikey:K,Authorization:'Bearer '+t,Accept:'application/json','Content-Type':'application/json',Prefer:'return=representation'};const r=await fetch(U+'/rest/v1/'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}),x=await r.text();let d;try{d=x?JSON.parse(x):null}catch(_){d=x}if(!r.ok)throw Error(d?.message||'İşlem başarısız.');return d}
  async function pub(path){if(typeof supabaseRequest==='function')return await supabaseRequest('GET',path);return[]}
  function css(){if(document.getElementById('a5-style'))return;const s=document.createElement('style');s.id='a5-style';s.textContent=`
    .a5Trust{margin:12px 0;padding:13px 14px;border:1px solid var(--line);border-radius:15px;background:rgba(25,195,125,.055)}
    .a5TrustHead{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .a5TrustTitle{font-weight:900;font-size:13px}.a5TrustSub{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.45}
    .a5Signals{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.a5Signal{font-size:10px;padding:5px 7px;border-radius:999px;background:var(--card2);border:1px solid var(--line);color:var(--muted)}
    .a5SafeNote{font-size:11px;color:var(--muted);line-height:1.45;margin-top:9px}
    .a5ReportModal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}
    .a5ReportBox{width:min(500px,100%);max-height:90vh;overflow:auto;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:20px;padding:18px}
    .a5ReportBox h3{margin:0 0 5px}.a5ReportBox select,.a5ReportBox textarea{width:100%;margin-top:9px}.a5ReportBox textarea{min-height:105px}
    .a5ReportActions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.a5ReportActions button{border:1px solid var(--line);background:var(--card2);color:var(--text);border-radius:11px;padding:10px 13px;font-weight:800}.a5ReportActions .primary{background:var(--primary);color:#03130d;border-color:var(--primary)}
    .a5Verify{font-size:10px;font-weight:800;color:var(--muted);padding:4px 7px;border:1px solid var(--line);border-radius:999px;white-space:nowrap}
  `;document.head.appendChild(s)}
  async function listing(id){const r=await pub('listings?select=id,owner_id,title,listing_type,status&status=eq.published&id=eq.'+encodeURIComponent(id)+'&limit=1');return r?.[0]||null}
  async function profile(owner){if(!owner)return null;try{const r=await pub('marketplace_profiles?select=display_name,seller_type,city,district,bio,is_public&user_id=eq.'+encodeURIComponent(owner)+'&limit=1');return r?.[0]||null}catch(_){return null}}
  function currentHost(){return document.querySelector('#gmDetailArea,#otoDetailArea,.a359DetailPage')}
  async function addTrust(id){const host=currentHost();if(!host||host.querySelector('[data-a5-trust]'))return;const l=await listing(id);if(!l?.owner_id)return;const p=await profile(l.owner_id);if(!p)return;
    const signals=[]; if(p.display_name)signals.push('Profil adı'); if(p.city||p.district)signals.push('Konum bilgisi'); if(p.seller_type)signals.push(p.seller_type==='professional'?'Profesyonel profil':'Bireysel profil'); if(p.bio)signals.push('Tanıtım mevcut');
    const sec=document.createElement('section');sec.className='a5Trust';sec.dataset.a5Trust='1';sec.innerHTML=`<div class="a5TrustHead"><div><div class="a5TrustTitle">🛡️ Güven bilgileri</div><div class="a5TrustSub">Bu bilgiler satıcı profilinden gelir. Doğrulama yapılmadıkça doğrulanmış kişi/işletme anlamına gelmez.</div></div><span class="a5Verify">Doğrulama sistemi hazır</span></div><div class="a5Signals">${signals.map(x=>`<span class="a5Signal">✓ ${E(x)}</span>`).join('')}</div><div class="a5SafeNote">Güvenli işlem için ödeme veya teslimat öncesinde ilan ve satıcı bilgilerini kontrol et. Şüpheli bir durumda ilanı bildirebilirsin.</div></section>`;
    host.appendChild(sec);
  }
  function reportModal(id){const old=document.querySelector('[data-a5-report-modal]');if(old)old.remove();const m=document.createElement('div');m.className='a5ReportModal';m.dataset.a5ReportModal='1';m.innerHTML=`<div class="a5ReportBox"><h3>İlanı bildir</h3><div class="small muted">Şüpheli veya kurallara aykırı bir ilan gördüysen nedenini seç.</div><select id="a5Reason"><option value="fraud">Dolandırıcılık / şüpheli ilan</option><option value="wrong_info">Yanlış veya yanıltıcı bilgi</option><option value="inappropriate">Uygunsuz içerik</option><option value="duplicate">Tekrarlanan ilan</option><option value="stolen">Çalıntı / başkasına ait içerik</option><option value="other">Diğer</option></select><textarea id="a5Details" maxlength="1000" placeholder="Kısa açıklama (isteğe bağlı)"></textarea><div class="a5ReportActions"><button type="button" id="a5Cancel">Vazgeç</button><button type="button" id="a5Send" class="primary">Bildir</button></div></div>`;document.body.appendChild(m);m.querySelector('#a5Cancel').onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)m.remove()});m.querySelector('#a5Send').onclick=async()=>{if(!UID()){alert('Bildirim göndermek için giriş yapmalısın.');return}const reason=m.querySelector('#a5Reason').value,details=m.querySelector('#a5Details').value.trim()||null;try{const existing=await api('GET','marketplace_reports?select=id&listing_id=eq.'+encodeURIComponent(id)+'&reporter_id=eq.'+encodeURIComponent(UID())+'&limit=1');if(existing?.length){m.remove();alert('Bu ilanı daha önce bildirdin.');return}await api('POST','marketplace_reports',{listing_id:id,reporter_id:UID(),reason,details});m.remove();alert('Bildirimin alındı. Teşekkürler.')}catch(e){alert(e.message||'Bildirim gönderilemedi.')}}}
  function captureReports(){document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b||!String(b.textContent||'').includes('İlanı bildir'))return;const id=window.__A5_CURRENT_LISTING__;if(!id)return;e.preventDefault();e.stopImmediatePropagation();reportModal(id)},true)}
  function hook(name){const f=window[name];if(typeof f!=='function'||f.__a5)return;const w=async function(id){window.__A5_CURRENT_LISTING__=id;const out=await f.apply(this,arguments);setTimeout(()=>addTrust(id),150);return out};w.__a5=true;window[name]=w}
  css();captureReports();setTimeout(()=>{hook('showGayrimenkulDetail');hook('showOtomobilDetail')},0);setTimeout(()=>{hook('showGayrimenkulDetail');hook('showOtomobilDetail')},700);
  const ob=new MutationObserver(()=>{const h=currentHost();if(h&&window.__A5_CURRENT_LISTING__)addTrust(window.__A5_CURRENT_LISTING__)});ob.observe(document.body,{childList:true,subtree:true});
})();
