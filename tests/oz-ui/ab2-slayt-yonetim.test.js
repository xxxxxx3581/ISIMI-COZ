// AB2: Özüne Dön yönetimi "Slaytlar" sekmesi — 390px, sahte RPC. Çalıştırma: node tests/oz-ui/ab2-slayt-yonetim.test.js
// Doğrulanan: sekme yönetici menüsünde; liste (satıcı adı, sıra, Sponsorlu rozeti, Aktif/Kapalı, "dd.mm.yyyy → dd.mm.yyyy" / "süresiz");
// üst açıklama; boş durum "Henüz slayt yok."; ekleme (onaylı satıcı listesi oz_admin_list(sellers, approved); doğru gövdeyle
// oz_admin_slide_save); düzenleme (aynı satıcı, değişen alanlar); silme onayı ("Bu slayt kaldırılsın mı?"; Vazgeç → çağrı yok, Kaldır →
// oz_admin_slide_delete); bitiş < başlangıç uyarısı (çağrı yok); sunucu hatası kısa Türkçe mesaj; yönetici olmayana sekme yok; 390px taşma yok.
const {chromium,open,enter}=require('./harness.js');
const SL=[{id:'h2',producer_id:'s2',seller_name:'Ege Kooperatifi',sponsored:false,sort_order:2,active:false,starts_at:null,ends_at:null,created_at:'2026-10-01T10:00:00Z'},
 {id:'h1',producer_id:'s1',seller_name:'Deneme Çiftliği',sponsored:true,sort_order:1,active:true,starts_at:'2026-10-01T09:00:00Z',ends_at:'2026-10-31T20:00:00Z',created_at:'2026-10-01T10:00:00Z'}];
async function page(br,slides,opt){opt=opt||{};
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 await p.evaluate(([slides,opt])=>{const F=window.__OZ_FX,R=F.R;R.oz_admin_slides=slides;R.oz_admin_slide_save='new-id';R.oz_admin_slide_delete=null;
  if(opt.notAdmin)R.pf_my_roles={is_admin:false,roles:[]};
  const o=window.PF.rpc;window.PF.rpc=async function(fn,a){if(fn==='oz_admin_list'&&a.p_kind==='sellers'){window.__ozLog(fn,a);return [{id:'s1',display_name:'Deneme Çiftliği',status:'approved'},{id:'s3',display_name:'Ayvalık Zeytin Evi',status:'approved'}]}return o(fn,a)}},[slides,opt]);
 await enter(p);await p.waitForTimeout(600);
 /* platform rolü (pf_my_roles sonucu) sahte: yönetici ya da değil */
 await p.evaluate(na=>{window.PF.roles=na?{is_admin:false,roles:[]}:{is_admin:true,roles:['super']}},!!opt.notAdmin);
 return {p,st};
}
const openSl=async p=>{await p.evaluate(()=>PF.openAdmin('oz_slides'));await p.waitForTimeout(1200)};
const L=p=>p.evaluate(()=>{const el=document.getElementById('pfxAdm');if(!el)return {missing:true,note:null,empty:null,cards:[],form:false,err:null,wide:document.documentElement.scrollWidth,ov:false};return {note:(el.querySelector('.ozSlNote')||{}).textContent||null,empty:(el.querySelector('.ozSlE')||{}).textContent||null,
 cards:[...el.querySelectorAll('.ozSlC')].map(c=>c.innerText.replace(/\s+/g,' ').trim()),form:!!el.querySelector('.ozSlF'),err:(el.querySelector('#ozSlErr:not([hidden])')||{}).textContent||null,
 wide:document.documentElement.scrollWidth,ov:[...el.querySelectorAll('*')].some(e=>e.getBoundingClientRect().right>window.innerWidth+1)}});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const clk=async(p,sel,w)=>{try{await p.click(sel,{timeout:3000})}catch(e){fails.push('tıklanamadı: '+sel)}await p.waitForTimeout(w||500)};
 let {p,st}=await page(br,SL);
 // menüde sekme var
 await p.evaluate(()=>PF.openAdmin());await p.waitForTimeout(800);
 /* AJ2-E: yönetim ana listesinde Özüne Dön sekmeleri tek kartta kısa adlı düğmeler; tam ad aria-label'da (eski: düğme metni "Özüne Dön · Slaytlar") */
 ok(await p.evaluate(()=>[...document.querySelectorAll('.pfxMenu button')].some(b=>/Özüne Dön · Slaytlar/.test(b.getAttribute('aria-label')||b.textContent)&&b.dataset.tab==='oz_slides')),'yönetim menüsünde "Özüne Dön · Slaytlar" olmalı');
 await openSl(p);let g=await L(p);
 ok(g&&g.note==='Slaytlar Keşfet ana sayfasında marka slaytlarından sonra görünür; en fazla 5.','üst açıklama: '+JSON.stringify(g&&g.note));
 ok(g&&g.cards.length===2&&/^Deneme Çiftliği Sponsorlu Aktif Sıra: 1 · 01\.10\.2026 → 31\.10\.2026/.test(g.cards[0])&&/^Ege Kooperatifi Kapalı Sıra: 2 · süresiz/.test(g.cards[1])&&!/Sponsorlu/.test(g.cards[1]),'liste (sıraya göre, rozetler, tarih): '+JSON.stringify(g&&g.cards));
 ok(g&&g.wide<=390&&!g.ov,'390px taşma yok: '+JSON.stringify(g&&[g.wide,g.ov]));
 // ekleme
 await clk(p,'#pfxAdm [data-a=aSlNew]');
 ok(st.calls.some(c=>c[0]==='oz_admin_list'&&c[1].p_kind==='sellers'&&c[1].p_status==='approved'),'satıcı listesi oz_admin_list(sellers, approved) ile');
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#ozSlSeller option')].map(o=>o.textContent));
 ok(opts.join('|')==='Satıcı seç|Deneme Çiftliği|Ayvalık Zeytin Evi','satıcı seçimi: '+JSON.stringify(opts));
 await clk(p,'#pfxAdm [data-a=aSlSave]',300);g=await L(p);ok(g.err==='Satıcı seç.'&&!st.calls.some(c=>c[0]==='oz_admin_slide_save'),'satıcısız kaydetme uyarısı, çağrı yok');
 try{await p.selectOption('#ozSlSeller','s3',{timeout:3000})}catch(e){fails.push('satıcı seçilemedi')}await p.evaluate(()=>{const a=document.getElementById('ozSlSp'),b=document.getElementById('ozSlOrd');if(a)a.checked=false;if(b)b.value='3'});
 const fill=async(sel,v)=>{try{await p.fill(sel,v,{timeout:3000})}catch(e){fails.push('doldurulamadı: '+sel)}};
 await fill('#ozSlFrom','2026-11-10');await fill('#ozSlTo','2026-11-01');
 await clk(p,'#pfxAdm [data-a=aSlSave]',300);g=await L(p);
 ok(g.err==='Bitiş tarihi başlangıçtan önce olamaz.'&&!st.calls.some(c=>c[0]==='oz_admin_slide_save'),'tarih uyarısı, çağrı yok: '+JSON.stringify(g.err));
 await fill('#ozSlTo','2026-11-20');
 await clk(p,'#pfxAdm [data-a=aSlSave]',1200);
 let sv=st.calls.filter(c=>c[0]==='oz_admin_slide_save').pop();const exp={producer_id:'s3',sponsored:false,sort_order:3,active:true};
 ok(sv&&Object.keys(exp).every(k=>sv[1].p[k]===exp[k])&&sv[1].p.starts_at===new Date('2026-11-10T00:00:00').toISOString()&&/^2026-11-2\d/.test(sv[1].p.ends_at),'ekleme gövdesi: '+JSON.stringify(sv&&sv[1]));
 g=await L(p);ok(!g.form&&st.calls.filter(c=>c[0]==='oz_admin_slides').length>=2,'kaydedince form kapanır, liste yenilenir');
 // düzenleme
 await clk(p,'#pfxAdm .ozSlC[data-id=h1] [data-a=aSlEdit]');
 const ed=await p.evaluate(()=>!document.getElementById('ozSlSeller')?{}:({sel:document.getElementById('ozSlSeller').value,dis:document.getElementById('ozSlSeller').disabled,sp:document.getElementById('ozSlSp').checked,ord:document.getElementById('ozSlOrd').value,act:document.getElementById('ozSlAct').checked,from:document.getElementById('ozSlFrom').value}));
 ok(ed.sel==='s1'&&ed.dis&&ed.sp&&ed.ord==='1'&&ed.act&&ed.from==='2026-10-01','düzenleme formu dolu: '+JSON.stringify(ed));
 await p.evaluate(()=>{const a=document.getElementById('ozSlAct'),b=document.getElementById('ozSlOrd');if(a)a.checked=false;if(b)b.value='4'});await fill('#ozSlFrom','');await fill('#ozSlTo','');
 await clk(p,'#pfxAdm [data-a=aSlSave]',1200);sv=st.calls.filter(c=>c[0]==='oz_admin_slide_save').pop();
 ok(sv&&sv[1].p.producer_id==='s1'&&sv[1].p.active===false&&sv[1].p.sort_order===4&&sv[1].p.starts_at===null&&sv[1].p.ends_at===null,'düzenleme gövdesi: '+JSON.stringify(sv&&sv[1]));
 // sunucu hatası
 await clk(p,'#pfxAdm .ozSlC[data-id=h2] [data-a=aSlEdit]');await p.evaluate(()=>{window.__OZ_FX.fail={oz_admin_slide_save:'OZ_STATE: Bitiş tarihi başlangıçtan sonra olmalı'}});
 await clk(p,'#pfxAdm [data-a=aSlSave]',800);g=await L(p);
 ok(g.err==='Slayt kaydedilemedi: Bitiş tarihi başlangıçtan sonra olmalı'&&g.form,'sunucu hatası kısa Türkçe mesaj: '+JSON.stringify(g.err));
 await p.evaluate(()=>{window.__OZ_FX.fail={}});await clk(p,'#pfxAdm [data-a=aSlCancel]');
 // silme: vazgeç → çağrı yok
 await clk(p,'#pfxAdm .ozSlC[data-id=h2] [data-a=aSlDel]',500);
 ok(await p.evaluate(()=>{const o=document.querySelector('.ozOv');return !!o&&/Bu slayt kaldırılsın mı\?/.test(o.innerText)}),'silme onay penceresi');
 await clk(p,'.ozOv [data-a=cbNo]',400);ok(!st.calls.some(c=>c[0]==='oz_admin_slide_delete'),'Vazgeç → silme çağrısı yok');
 await clk(p,'#pfxAdm .ozSlC[data-id=h2] [data-a=aSlDel]',500);await clk(p,'.ozOv [data-a=cbYes]',1200);
 ok(st.calls.some(c=>c[0]==='oz_admin_slide_delete'&&c[1].p_id==='h2'),'Kaldır → oz_admin_slide_delete(h2)');
 ok(!st.errors.length,'sayfa hatası olmamalı: '+st.errors.join(' | '));await p.context().close();
 // boş liste
 ({p,st}=await page(br,[]));await openSl(p);g=await L(p);ok(g&&g.empty==='Henüz slayt yok.'&&g.cards.length===0,'boş durum: '+JSON.stringify(g));await p.context().close();
 // yönetici olmayan
 ({p,st}=await page(br,SL,{notAdmin:true}));await p.evaluate(()=>PF.openAdmin('oz_slides'));await p.waitForTimeout(900);
 const na=await p.evaluate(()=>({adm:!!document.getElementById('pfxAdm'),menu:[...document.querySelectorAll('.pfxMenu button')].some(b=>/Slaytlar/.test(b.textContent)),drawer:!!document.querySelector('#pfxDrawer')&&/Yönetim paneli/.test(document.querySelector('#pfxDrawer').innerText)}));
 ok(!na.adm&&!na.menu&&!st.calls.some(c=>c[0]==='oz_admin_slides'),'yönetici olmayana sekme/liste yok: '+JSON.stringify(na));await p.context().close();
 await br.close();
 if(fails.length){console.error('ab2-slayt-yonetim BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ab2-slayt-yonetim: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ab2-slayt-yonetim HATA:',e&&e.message?e.message.split('\n')[0]:e);process.exit(1)});
