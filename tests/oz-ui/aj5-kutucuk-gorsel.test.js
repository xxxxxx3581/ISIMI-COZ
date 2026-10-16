// AJ2-F: ana ekran kutucuk görselleri (panel › Ana ekran fotoğrafları › Kutucuk görselleri) — 390px, krem ve koyu, sahte RPC/depo (ağ), veri yazmaz.
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/aj5-kutucuk-gorsel.test.js
// Doğrulanan: (i) home_hero_list'te tile_* yokken kutucuk ve afiş kapakları images/home/… dosyalarını kullanır, Yemek afişi mozaiği aynı;
// (ii) tile_* varsa kutucukta (Özüne Dön/İlanlar/İşimi Hallet için afiş kapağında da) yüklenen görsel görünür, Yemek afişi değişmez,
// açılamayan dosyada images/home/… yedeğine dönülür; (iii) panelde dört satır (önizleme, Değiştir, Varsayılana dön), yükleme sırasında düğme kilitli,
// yükleme mevcut depo + pf_admin_hero_add ile, eski aynı rol kaydı/dosyası silinir; "Varsayılana dön" kaydı ve dosyayı siler;
// (iv) 'ops' yetkisi olmayan yönetici ve yönetici olmayan kullanıcıda bölüm görünmez.
const fs=require('fs'),path=require('path');
const {chromium,open}=require('./harness.js');
const ROOT=path.resolve(__dirname,'../..');
const JPG=fs.readFileSync(path.join(ROOT,'assets/oz-cat/bal-recel.jpg'));
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 for(const th of ['light','dark']){
  const {p,st}=await open(br,{w:390,h:844,visible:true,view:'',theme:th==='dark'?'dark':''});
  let DATA={pf_public_settings:{},home_hero_list:[]};const net=[],stor=[];let addDelay=0;
  await p.route('**/rest/v1/rpc/*',async r=>{const fn=r.request().url().split('/rpc/')[1].split('?')[0];let a={};try{a=r.request().postDataJSON()||{}}catch(e){}
   net.push([fn,a]);if(fn==='pf_admin_hero_add'&&addDelay)await new Promise(x=>setTimeout(x,addDelay));
   const v=fn in DATA?DATA[fn]:(fn==='pf_admin_hero_add'?'new-id':fn==='pf_admin_hero_delete'?'old-'+a.p_id+'.jpg':[]);
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(v)})});
  await p.route('**/storage/v1/object/**',r=>{const u=r.request().url(),m=r.request().method();
   if(m==='GET'&&u.includes('/object/public/home-hero/'))return /yok\.jpg/.test(u)?r.fulfill({status:404,body:''}):r.fulfill({status:200,contentType:'image/jpeg',body:JPG});
   stor.push(m+' '+u.split('/storage/v1/object/')[1]);return r.fulfill({status:200,contentType:'application/json',body:'{"Key":"x"}'})});
  await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  const home=async()=>{await p.evaluate(()=>{window.__v2HeroCache=null;showHome()});await p.waitForTimeout(900)};
  const imgs=()=>p.evaluate(()=>{const g=s=>{const i=document.querySelector(s);return i?{src:i.getAttribute('src'),nw:i.naturalWidth}:null};
   return {tf:g('.hmTile[data-k="food"] img'),tm:g('.hmTile[data-k="market"] img'),tl:g('.hmTile[data-k="listings"] img'),ts:g('.hmTile[data-k="services"] img'),
    cm:g('.hmSl[data-k="market"] img.bg'),cl:g('.hmSl[data-k="listings"] img.bg'),cs:g('.hmSl[data-k="services"] img.bg'),
    food:[...document.querySelectorAll('.hmSl.food .hmMo img')].map(i=>i.getAttribute('src')).join(',')}});
  for(const s of ['.hmTile img','.hmSl img.bg'])await p.evaluate(s=>document.querySelectorAll(s).forEach(i=>i.loading='eager'),s);
  // (i) tile_* yok
  await home();await p.evaluate(()=>document.querySelectorAll('#app img[loading=lazy]').forEach(i=>i.loading='eager'));await p.waitForTimeout(500);
  let I=await imgs();const FOOD='images/home/y-iskender.jpg,images/home/y-burger.jpg,images/home/yemek.jpg';
  ok(I.tf.src==='images/home/yemek.jpg'&&I.tm.src==='images/home/market.jpg'&&I.tl.src==='images/home/ilanlar.jpg'&&I.ts.src==='images/home/hizmet.jpg'&&
   I.cm.src==='images/home/market.jpg'&&I.cl.src==='images/home/ilanlar.jpg'&&I.cs.src==='images/home/hizmet.jpg'&&I.food.startsWith(FOOD),'['+th+'] (i) yüklü görsel yokken yedek dosyalar: '+JSON.stringify(I));
  // (ii) tile_* var (base/slide da var: Yemek afişi kendi kurallarıyla çalışmaya devam eder)
  DATA.home_hero_list=[{role:'slide',storage_path:'hero-s1.jpg',sort_order:0,caption:null},{role:'tile_food',storage_path:'tile-f.jpg',sort_order:0,caption:null},
   {role:'tile_market',storage_path:'tile-m.jpg',sort_order:0,caption:null},{role:'tile_ilan',storage_path:'tile-yok.jpg',sort_order:0,caption:null},{role:'tile_hizmet',storage_path:'tile-h.jpg',sort_order:0,caption:null}];
  await home();await p.evaluate(()=>document.querySelectorAll('#app img[loading=lazy]').forEach(i=>i.loading='eager'));await p.waitForTimeout(900);
  I=await imgs();const H=f=>x=>x&&x.src.endsWith('/storage/v1/object/public/home-hero/'+f)&&x.nw>0;
  ok(H('tile-f.jpg')(I.tf)&&H('tile-m.jpg')(I.tm)&&H('tile-m.jpg')(I.cm)&&H('tile-h.jpg')(I.ts)&&H('tile-h.jpg')(I.cs),'['+th+'] (ii) yüklenen görsel kutucukta ve afiş kapağında: '+JSON.stringify(I));
  ok(I.tl.src==='images/home/ilanlar.jpg'&&I.cl.src==='images/home/ilanlar.jpg','['+th+'] (ii) açılamayan dosyada yedek: '+JSON.stringify([I.tl,I.cl]));
  ok(/home-hero\/hero-s1\.jpg/.test(I.food)&&!/tile-/.test(I.food)&&/y-burger\.jpg,images\/home\/yemek\.jpg/.test(I.food),'['+th+'] (ii) Yemek afişi kutucuk görselini almaz, slayt kuralı aynı: '+I.food);
  // (iii) panel
  DATA.pf_my_roles={is_admin:true,roles:['ops']};
  DATA.pf_admin_hero_list=[{id:'b1',role:'base',storage_path:'hero-b.jpg',sort_order:0,is_active:true,caption:null},{id:'s1',role:'slide',storage_path:'hero-s1.jpg',sort_order:0,is_active:true,caption:'İskender'},
   {id:'m1',role:'tile_market',storage_path:'tile-m.jpg',sort_order:0,is_active:true,caption:null},{id:'f0',role:'tile_food',storage_path:'tile-f0.jpg',sort_order:0,is_active:false,caption:null}];
  const openHero=async roles=>{await p.evaluate(r=>{window.PF.roles=r;window.PF.openAdmin('hero')},roles);await p.waitForTimeout(700)};
  const panel=()=>p.evaluate(()=>{const c=document.getElementById('pfxTiles');if(!c)return null;
   return {title:c.querySelector('b').textContent,rows:[...c.querySelectorAll('[data-tile]')].map(r=>{const b=[...r.querySelectorAll('button')];const bx=b.map(x=>x.getBoundingClientRect());
    return {k:r.dataset.tile,name:r.querySelector('b').textContent,state:r.querySelector('.pfxMuted').textContent,img:r.querySelector('img').getAttribute('src'),btn:b.map(x=>x.textContent+(x.disabled?':off':'')).join('|'),h:Math.min(...bx.map(x=>x.height))}}),
    hero:!!document.getElementById('pfxHeroB')&&!!document.getElementById('pfxHeroS'),ov:document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth}});
  await openHero({is_admin:true,roles:['ops']});let P=await panel();
  ok(P&&P.title==='Kutucuk görselleri'&&P.rows.map(r=>r.name).join('|')==='Yemek|Özüne Dön|İlanlar|İşimi Hallet'&&P.hero&&P.ov<=0,'['+th+'] (iii) panelde dört satır, Yemek afişi bölümü yerinde: '+JSON.stringify(P));
  const R=k=>P.rows.find(r=>r.k===k);
  ok(R('tile_market').state==='· Yüklenen görsel'&&/home-hero\/tile-m\.jpg$/.test(R('tile_market').img)&&R('tile_market').btn==='Değiştir|Varsayılana dön'&&
   R('tile_food').state==='· Varsayılan'&&R('tile_food').img==='images/home/yemek.jpg'&&R('tile_food').btn==='Değiştir|Varsayılana dön:off'&&R('tile_ilan').img==='images/home/ilanlar.jpg','['+th+'] (iii) önizleme ve düğme durumları: '+JSON.stringify(P.rows));
  // yükleme: düğme kilitli, depo POST + pf_admin_hero_add(tile_food), eski tile_food kaydı (f0) ve dosyası silinir
  net.length=0;stor.length=0;addDelay=500;
  await p.setInputFiles('#pfxTl_tile_food',{name:'k.jpg',mimeType:'image/jpeg',buffer:JPG});await p.waitForTimeout(250);
  const locked=await p.evaluate(()=>document.getElementById('pfxTlB_tile_food').disabled);await p.waitForTimeout(1200);addDelay=0;
  const add=net.find(x=>x[0]==='pf_admin_hero_add'),del=net.filter(x=>x[0]==='pf_admin_hero_delete').map(x=>x[1].p_id);
  ok(locked,'['+th+'] (iii) yükleme sırasında Değiştir kilitli');
  ok(add&&add[1].p_role==='tile_food'&&/^tile-\d+-[a-z0-9]+\.jpg$/.test(add[1].p_path)&&stor.some(s=>s==='POST home-hero/'+add[1].p_path)&&del.join()==='f0'&&stor.includes('DELETE home-hero/old-f0.jpg'),
   '['+th+'] (iii) yükleme mevcut depo + pf_admin_hero_add, eski kayıt/dosya silinir: '+JSON.stringify({add,del,stor}));
  // varsayılana dön
  net.length=0;stor.length=0;p.once('dialog',d=>d.accept());
  await p.click('[data-tile="tile_market"] button:nth-of-type(2)');await p.waitForTimeout(800);
  const del2=net.filter(x=>x[0]==='pf_admin_hero_delete').map(x=>x[1].p_id);
  ok(del2.join()==='m1'&&stor.includes('DELETE home-hero/old-m1.jpg'),'['+th+'] (iii) Varsayılana dön kaydı ve dosyayı siler: '+JSON.stringify({del2,stor}));
  ok(!net.some(x=>/^pf_admin_hero_(add|update)$/.test(x[0])&&x[1].p_role!=='tile_food'&&x[1].p_role!=null),'['+th+'] base/slide kayıtlarına dokunulmaz');
  // (iv) yetkisiz
  await p.evaluate(()=>{const s=document.getElementById('pfxTiles');if(s)s.closest('.pfxCard').remove()});
  await openHero({is_admin:true,roles:['finance']});ok(!(await panel()),'['+th+'] (iv) ops yetkisi olmayan yöneticide bölüm yok');
  await openHero({is_admin:false,roles:[]});ok(!(await panel()),'['+th+'] (iv) yönetici olmayanda bölüm yok');
  ok(!st.errors.length,'['+th+'] konsol/sayfa hatası yok: '+st.errors.join(' | '));
  await p.context().close();
 }
 await br.close();
 if(fails.length){console.log('aj5-kutucuk-gorsel: BAŞARISIZ\n - '+fails.join('\n - '));process.exit(1)}
 console.log('aj5-kutucuk-gorsel: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
