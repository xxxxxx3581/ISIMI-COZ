// pf-env-v1.js: Supabase adres/anahtarı tek yerde — ortam seçimi + aktif sayfaların PF_ENV'i kullanması (ağa çıkmaz).
// Çalıştırma: NODE_PATH=/opt/node-tools/node_modules node tests/oz-ui/pf-env.test.js
// Doğrulanan: (1) bugünkü dosya: her host → TEST (live:false); LIVE doldurulup host eşleşince → LIVE; host eşleşmezse veya url/key eksikse → TEST.
// (2) index.html, marketplace-profile.html, marketplace-listing-edit.html: pf-env-v1.js ilk Supabase kullanımından önce yüklenir,
// SUPABASE_URL/KEY (veya URL/KEY) PF_ENV ile aynı, sayfa hatası yok.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {chromium,open,serve}=require('./harness.js');
const ROOT=path.join(__dirname,'..','..');
const SRC=fs.readFileSync(path.join(ROOT,'pf-env-v1.js'),'utf8');
const TEST_URL='https://zvffspbowdzvrrzefhkr.supabase.co';
const run=(src,host)=>{const w={};vm.runInNewContext(src,{window:w,location:{hostname:host}});return w.PF_ENV};
const withLive=(url,key,hosts)=>SRC.replace("var LIVE = {url:'', key:'', hosts:[]};","var LIVE = {url:"+JSON.stringify(url)+", key:"+JSON.stringify(key)+", hosts:"+JSON.stringify(hosts)+"};");
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 /* ---------- (1) ortam seçimi ---------- */
 ok(SRC.includes("var LIVE = {url:'', key:'', hosts:[]};"),'LIVE bugün boş');
 for(const h of ['bilinmeyen.example','a7-v2-test.onrender.com','localhost']){const e=run(SRC,h);ok(e.url===TEST_URL&&/^sb_publishable_/.test(e.key)&&e.live===false,'bugün '+h+' → TEST: '+JSON.stringify(e))}
 const L=withLive('https://canli.supabase.co','sb_publishable_CANLI',['isimicoz.com','www.isimicoz.com']);
 let e=run(L,'isimicoz.com');ok(e.url==='https://canli.supabase.co'&&e.key==='sb_publishable_CANLI'&&e.live===true,'LIVE dolu + host eşleşir → LIVE: '+JSON.stringify(e));
 e=run(L,'bilinmeyen.example');ok(e.url===TEST_URL&&e.live===false,'LIVE dolu + bilinmeyen host → TEST: '+JSON.stringify(e));
 e=run(withLive('https://canli.supabase.co','',['isimicoz.com']),'isimicoz.com');ok(e.url===TEST_URL&&e.live===false,'LIVE anahtarı eksik → TEST: '+JSON.stringify(e));
 /* ---------- (2) aktif sayfalar ---------- */
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 {const {ctx,p,st}=await open(br,{w:390,h:844,visible:true});
  const r=await p.evaluate(()=>{const ss=[...document.scripts];const i=ss.findIndex(s=>/pf-env-v1\.js\?v=1$/.test(s.getAttribute('src')||''));const j=ss.findIndex(s=>/SUPABASE_URL=/.test(s.textContent));
   return {i,j,eq:SUPABASE_URL===PF_ENV.url&&SUPABASE_KEY===PF_ENV.key,live:PF_ENV.live}});
  ok(r.i>=0&&r.i<r.j&&r.eq&&r.live===false,'index.html: pf-env önce yüklenir, SUPABASE_URL/KEY = PF_ENV: '+JSON.stringify(r));
  ok(!st.errors.length,'index.html sayfa hatası: '+st.errors.join(' | '));await ctx.close()}
 const sv=await serve();const base='http://127.0.0.1:'+sv.address().port;
 for(const [pg,vu,vk] of [['marketplace-profile.html','SUPABASE_URL','SUPABASE_KEY'],['marketplace-listing-edit.html','URL','KEY']]){
  const ctx=await br.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
  await p.route(/supabase\.co/,q=>q.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.goto(base+'/'+pg);await p.waitForTimeout(600);
  const html=fs.readFileSync(path.join(ROOT,pg),'utf8');const a=html.indexOf('<script src="./pf-env-v1.js?v=1"></script>'),b=html.search(/<script[^>]*>/);
  const r=await p.evaluate(([vu,vk])=>{try{return {eq:eval(vu)===PF_ENV.url&&eval(vk)===PF_ENV.key}}catch(e){return {err:String(e)}}},[vu,vk]);
  ok(a>=0&&a===b&&r.eq,pg+': pf-env ilk script, '+vu+'/'+vk+' = PF_ENV: '+JSON.stringify([a,b,r]));
  ok(!errs.some(m=>/PF_ENV|ReferenceError/.test(m)),pg+' PF_ENV hatası yok: '+errs.join(' | '));await ctx.close()}
 await br.close();sv.close();
 if(fails.length){console.error('pf-env BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('pf-env: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('pf-env HATA:',e);process.exit(1)});
