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
// P8: referans Paket 8 commit'i 1661f34'e tek sefer taşındı (önceki: 0603418; arada yalnız oz-market-v1.js ?v=5 → ?v=6).
// P9: referans Paket 9 commit'i 73e4e64'e tek sefer taşındı (önceki: 1661f34; arada yalnız oz-market-v1.js ?v=6 → ?v=7).
// P10: referans Paket 10 commit'i 8aba1d7'e tek sefer taşındı (önceki: 73e4e64; arada oz-market-v1.js ?v=7 → ?v=8 ve K21-JS bloğuna ?oz_pay iyzico dönüş işleyicisi).
// P11: referans Paket 11 commit'i a728005'e tek sefer taşındı (önceki: 8aba1d7; arada yalnız oz-market-v1.js ?v=8 → ?v=9).
// P13: referans 60e9226'e tek sefer taşındı (önceki: a728005; arada yalnız pf-platform-v1.js ?v=3 → ?v=4; oz-market-v1.js ?v=9 aynen).
// P12: oz-market-v1.js ?v=9 → ?v=10; referans 60e9226 aynen. Bilinçli değişiklik: "sürüm ve yorum dışında değişiklik olmamalı" karşılaştırması
//      artık oz-market-v1.js?v=N değerini (yalnız onu) yok sayar; sürümün tam değeri aşağıdaki ayrı kontrolle (?v=10, tek yerde) denetlenir.
// P19: referans e682ddf'e tek sefer taşındı (önceki: 60e9226; arada Paket 19 renkli düğme CSS'i (P19 bloğu), a7-food-v1.js ?v=3 → ?v=4,
//      oz-market-v1.js ?v=10 → ?v=11).
// P19 düzeltme: referans 17d301a'e tek sefer taşındı (önceki: e682ddf; arada P19 düzeltme CSS'i, a7-food-v1.js ?v=4 → ?v=5,
//      oz-market-v1.js ?v=11 → ?v=12).
// P20: referans 31b2f09'e tek sefer taşındı (önceki: 17d301a; arada Paket 20 CSS'i (P20 bloğu), a7-food-v1.js ?v=5 → ?v=6,
//      oz-market-v1.js ?v=12 → ?v=13).
// P20 düzeltme: referans f9496e7'e tek sefer taşındı (önceki: 31b2f09; arada alan hatası CSS'i, oz-market-v1.js ?v=13 → ?v=14).
// P21: referans de9ade4'e tek sefer taşındı (önceki: f9496e7; arada Paket 21 CSS'i (P21 bloğu), a7-food-v1.js ?v=6 → ?v=7, oz-market-v1.js ?v=14 → ?v=15).
// P22: referans e22f3b3'e tek sefer taşındı (önceki: de9ade4; arada Paket 22 CSS'i (P22 bloğu), a7-food-v1.js ?v=7 → ?v=8, oz-market-v1.js ?v=15 → ?v=16).
// P23: referans 6eae19a'e tek sefer taşındı (önceki: e22f3b3; arada Paket 23 CSS'i (P23 bloğu) ve pf-platform-v1.js ?v=4 → ?v=5; oz-market-v1.js ?v=16 aynen).
// P24: referans d439b2a'e tek sefer taşındı (önceki: 6eae19a; arada P24-A platform geri işleyicisi (.pfxOv açık pencere, Yemek panel kaydı),
//      P24-B Hesabım şablonu ve CSS'i, a7-food-v1.js ?v=8 → ?v=10, pf-platform-v1.js ?v=5 → ?v=6, oz-market-v1.js ?v=16 → ?v=18).
// P24b: referans 906e53f'e tek sefer taşındı (önceki: d439b2a; arada Hesabım rol kartlarının arka planda yüklenmesi + CSS, a7-food-v1.js ?v=10 → ?v=11; oz-market-v1.js ?v=18 aynen).
// P25: referans d83bf94'e tek sefer taşındı (önceki: 906e53f; arada Yemek işletme sipariş kartı/sütun CSS'i, a7-food-v1.js ?v=11 → ?v=12; oz-market-v1.js ?v=18 aynen).
// P23b: referans f5881df'e tek sefer taşındı (önceki: d83bf94; arada yönetim bölüm içi çerçeve CSS'i + geri kancası, pf-platform-v1.js ?v=6 → ?v=7, oz-market-v1.js ?v=18 → ?v=19).
// P23c: referans 211e766'e tek sefer taşındı (önceki: f5881df; arada yalnız pf-platform-v1.js ?v=7 → ?v=8; oz-market-v1.js ?v=19 aynen).
// P27: referans 836413a'e tek sefer taşındı (önceki: 211e766; arada Hesabım çıkış düğmesi yeri + CSS, a7-food-v1.js ?v=12 → ?v=13, oz-market-v1.js ?v=19 → ?v=20).
// P26: referans c068d33'e tek sefer taşındı (önceki: 836413a; arada satıcı sipariş kartı/sütun CSS'i, oz-market-v1.js ?v=20 → ?v=21).
// P28: referans e41237e'e tek sefer taşındı (önceki: c068d33; arada ana menü (çekmece) düzeni + CSS, pf-platform-v1.js ?v=8 → ?v=9; oz-market-v1.js ?v=21 aynen).
// P28b: referans 8c775ec'e tek sefer taşındı (önceki: e41237e; arada yalnız menüde Giriş yap / Kayıt ol satırı + CSS; oz-market-v1.js ?v=21 aynen).
// P27b: referans 8c53b8b'e tek sefer taşındı (önceki: 8c775ec; arada yalnız Hesabım profil kartı düzeni + CSS; oz-market-v1.js ?v=21 aynen).
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {chromium,open,enter}=require('./harness.js');
const ROOT=path.resolve(__dirname,'../..');
const cur=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const base=cp.execSync('git show 8c53b8b:index.html',{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20});
const blk=s=>{const a=s.indexOf('/*K21-BASLA*/'),b=s.indexOf('/*K21-BITIS*/');return s.slice(a,b)};
const nocom=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const nover=s=>s.replace(/oz-market-v1\.js\?v=\d+/g,'oz-market-v1.js?v=N');
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 ok(!/TEST/.test(blk(cur)),'Özüne Dön CSS bloğunda "TEST" kalmamalı: '+(blk(cur).match(/.{0,40}TEST.{0,20}/)||[''])[0]);
 ok(/\/\*OZ W2 hero "Sponsorlu" satıcı slaytı[^*]*:/.test(cur),'W2 yorumu nötr biçimde durmalı');
 const v=cur.match(/oz-market-v1\.js\?v=\d+/g)||[];ok(v.length===1&&v[0]==='oz-market-v1.js?v=21','sürüm parametresi tek yerde ?v=21: '+JSON.stringify(v));
 const others=['manifest.json','sw.js','food-sw.js','pf-platform-v1.js','a7-food-v1.js'].filter(f=>fs.existsSync(path.join(ROOT,f))&&/oz-market-v1\.js\?/.test(fs.readFileSync(path.join(ROOT,f),'utf8')));
 ok(!others.length,'başka dosyada sürümlü başvuru olmamalı: '+others);
 ok(nocom(blk(cur))===nocom(blk(base)),'Özüne Dön CSS (yorumsuz) değişmemeli');
 ok(nover(nocom(cur))===nover(nocom(base)),'index.html’de sürüm ve yorum dışında değişiklik olmamalı');
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const {p,st}=await open(br,{w:390,h:844});
 await enter(p);
 const css=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 const src=await p.evaluate(()=>[...document.scripts].map(s=>s.getAttribute('src')||'').filter(s=>/oz-market/.test(s)));
 ok(src.length===1&&src[0]==='./oz-market-v1.js?v=21','modül ?v=21 ile yüklenmeli: '+JSON.stringify(src));
 await p.setContent(base.replace(/<script[\s\S]*?<\/script>/g,''));const css0=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 await p.setContent(cur.replace(/<script[\s\S]*?<\/script>/g,''));const css1=await p.evaluate(()=>{const out=[];for(const sh of document.styleSheets){let r;try{r=sh.cssRules}catch(e){continue}for(const x of r)out.push(x.cssText)}return out.filter(t=>/oz|Oz/.test(t))});
 ok(css1.length>100&&css1.length===css0.length&&css1.join('\n')===css0.join('\n'),'CSS kural sayısı/bildirimleri aynı olmalı: '+css0.length+' → '+css1.length);
 ok(css.length>100,'yüklü sayfada Özüne Dön kuralları var: '+css.length);
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ac4-surum BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ac4-surum: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ac4-surum HATA:',e);process.exit(1)});
