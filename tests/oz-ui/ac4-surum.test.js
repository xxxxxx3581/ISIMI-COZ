// AC4: canlıya geçiş sürüm hazırlığı (dosya + tarayıcı). Çalıştırma: node tests/oz-ui/ac4-surum.test.js
// Doğrulanan: W2 CSS yorumunda "TEST" kalmadı (Özüne Dön CSS bloğunda hiç "TEST" yok); oz-market-v1.js sürüm parametresi ?v=2 ve TEK yerde
// (eski ?v=1 yok; manifest/sw/başka dosyada başvuru yok); CSS çıktısı değişmedi: Özüne Dön stil bloğunun yorumsuz hali referans noktasıyla
// birebir aynı, tarayıcıdaki kural sayısı ve bildirimleri aynı; modül gerçekten ?v=2 ile yükleniyor.
// AJ1 P8: referans, tasarım çalışmasının (AJ1 Paket 1–7) son commit'i dbd46f0'a taşındı (eski: 4fca025, AJ1 öncesi canlı noktası).
// dbd46f0 zaten ?v=2 içerdiği için "?v=2→?v=1" yer değiştirmesi kalktı; index.html doğrudan karşılaştırılır. Canlıya geçişte JS değiştiği
// için ?v=3 yapılacak ve bu test aynı commit'te güncellenecek.
// AJ2: referans AJ2'nin (Paket A, B, C2 ve "Ürünleri değerlendir" tam genişlik) son tasarım commit'i 4671ffc'ye tek sefer taşındı
// (önceki: dbd46f0). 4671ffc de ?v=2 içerir; doğrudan karşılaştırma ve diğer tüm kontroller aynen.
// AJ2-C3: referans C3 commit'i 3503db8'e tek sefer taşındı (önceki: 4671ffc; arada yalnız ana ekran C3 CSS'i). ?v=2 aynen.
// AJ2-D: referans Paket D commit'i 6e6c1ec'e tek sefer taşındı (önceki: 3503db8; arada yalnız ürün ızgarası CSS'i). ?v=2 aynen.
// AJ2-E: referans Paket E commit'i f07a299'e tek sefer taşındı (önceki: 6e6c1ec; arada yan menü işaretleme/CSS'i). ?v=2 aynen.
// AJ2-D2: referans Paket D2 commit'i d07e55b'e tek sefer taşındı (önceki: f07a299; arada telefon ızgarası CSS'i). ?v=2 aynen.
// AJ2-D3: referans Paket D3 commit'i d07cc60'a tek sefer taşındı (önceki: d07e55b; arada ızgara "+" altın sarısı daire CSS'i). ?v=2 aynen.
// AJ2-F: referans Paket F commit'i 60268a5'e tek sefer taşındı (önceki: d07cc60; arada kutucuk görseli işaretlemesi). ?v=2 aynen.
// AJ2-G: referans Paket G commit'i b4f3985'e tek sefer taşındı (önceki: 60268a5; arada krem ana ekran karartma/gölge CSS'i). ?v=2 aynen.
// AJ2-G2: referans Paket G2 commit'i f891d84'e tek sefer taşındı (önceki: b4f3985; arada krem afiş karartması CSS'i). ?v=2 aynen.
// P1: referans Paket 1 commit'i fe3c30e'e tek sefer taşındı (önceki: f891d84; arada kart metinleri, alt boşluk ve sürüm). Sürüm ?v=2 → ?v=3 (canlıya geçiş, önbellek tazeleme).
// P3: referans Paket 3 commit'i 373ff45'e tek sefer taşındı (önceki: fe3c30e; arada satıcı puan rozeti ve QR düğmesi CSS'i). Sürüm ?v=3 aynen.
// P4: referans Paket 4 commit'i dcccd67'e tek sefer taşındı (önceki: 373ff45; arada satıcı puan rozeti ve kalp CSS'i). Sürüm ?v=3 aynen.
// P5: referans Paket 5 commit'i 9d58b31'e tek sefer taşındı (önceki: dcccd67; arada yalnız a7-food-v1.js?v=3 ve a35-seller-identity.js?v=3).
// P6: referans Paket 6 commit'i ecf95de'e tek sefer taşındı (önceki: 9d58b31; arada yalnız oz-market-v1.js ?v=3 → ?v=4).
// P7: referans Paket 7 commit'i 0603418'e tek sefer taşındı (önceki: ecf95de; arada yalnız oz-market-v1.js ?v=4 → ?v=5).
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {chromium,open,enter}=require('./harness.js');
const ROOT=path.resolve(__dirname,'../..');
const cur=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const base=cp.execSync('git show 0603418:index.html',{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20});
const blk=s=>{const a=s.indexOf('/*K21-BASLA*/'),b=s.indexOf('/*K21-BITIS*/');return s.slice(a,b)};
const nocom=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 ok(!/TEST/.test(blk(cur)),'Özüne Dön CSS bloğunda "TEST" kalmamalı: '+(blk(cur).match(/.{0,40}TEST.{0,20}/)||[''])[0]);
 ok(/\/\*OZ W2 hero "Sponsorlu" satıcı slaytı[^*]*:/.test(cur),'W2 yorumu nötr biçimde durmalı');
 const v=cur.match(/oz-market-v1\.js\?v=\d+/g)||[];ok(v.length===1&&v[0]==='oz-market-v1.js?v=5','sürüm parametresi tek yerde ?v=5: '+JSON.stringify(v));
 const others=['manifest.json','sw.js','food-sw.js','pf-platform-v1.js','a7-food-v1.js'].filter(f=>fs.existsSync(path.join(ROOT,f))&&/oz-market-v1\.js\?/.test(fs.readFileSync(path.join(ROOT,f),'utf8')));
 ok(!others.length,'başka dosyada sürümlü başvuru olmamalı: '+others);
 ok(nocom(blk(cur))===nocom(blk(base)),'Özüne Dön CSS (yorumsuz) değişmemeli');
 ok(nocom(cur)===nocom(base),'index.html’de sürüm ve yorum dışında değişiklik olmamalı');
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const {p,st}=await open(br,{w:390,h:844});
 await enter(p);
 const css=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 const src=await p.evaluate(()=>[...document.scripts].map(s=>s.getAttribute('src')||'').filter(s=>/oz-market/.test(s)));
 ok(src.length===1&&src[0]==='./oz-market-v1.js?v=5','modül ?v=5 ile yüklenmeli: '+JSON.stringify(src));
 await p.setContent(base.replace(/<script[\s\S]*?<\/script>/g,''));const css0=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 await p.setContent(cur.replace(/<script[\s\S]*?<\/script>/g,''));const css1=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 ok(css1.length>100&&css1.length===css0.length&&css1.join('\n')===css0.join('\n'),'CSS kural sayısı/bildirimleri aynı olmalı: '+css0.length+' → '+css1.length);
 ok(css.length>100,'yüklü sayfada Özüne Dön kuralları var: '+css.length);
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ac4-surum BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ac4-surum: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ac4-surum HATA:',e);process.exit(1)});
