// AE3: hata ve boş durum metinleri — 390px, sahte RPC/depolama. Çalıştırma: node tests/oz-ui/ae3-hata-metin.test.js
// Doğrulanan: tanınmayan İngilizce sunucu hatası → "Bir sorun oluştu. Lütfen biraz sonra tekrar dene." (ham metin ekranda yok, console.warn'da var);
// önekli (OZ_/PF_) ve öneksiz Türkçe sunucu mesajı aynen geçer; Türkçe olsa da teknik (SQL) metin geneline döner; bulunamayan RPC →
// "Bu özellik şu an açık değil. Biraz sonra tekrar dene."; platform katmanı yok → "Bağlantı kurulamadı. Sayfayı yenileyip tekrar dene.";
// fotoğraf yüklemede depolama hatası (İngilizce) → "Fotoğraf yüklenemedi. İnternetini kontrol edip tekrar dene."; dosyada eski metinler
// yok, yeni metinler var ("Belge açılamadı…", "Satıcı hesabın bulunamadı…", index.html "Özüne Dön açılamadı…"); "Ödeme yöntemi çok yakında" aynen.
const fs=require('fs'),path=require('path');
const {chromium,open,enter,overflow}=require('./harness.js');
const ROOT=path.resolve(__dirname,'../..');
const GEN='Bir sorun oluştu. Lütfen biraz sonra tekrar dene.';
(async()=>{
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
 const js=fs.readFileSync(path.join(ROOT,'oz-market-v1.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 ok(!/Platform katmanı yüklenemedi|Belge yolu bulunamadı|Satıcı kaydın bulunamadı|şu anda kullanılamıyor/.test(js),'oz-market-v1.js eski teknik metinler kalmamalı');
 ok(/Belge açılamadı\. Lütfen tekrar dene\./.test(js)&&/Satıcı hesabın bulunamadı\. Çıkış yapıp tekrar giriş yapmayı dene\./.test(js),'yeni metinler (belge, satıcı hesabı)');
 ok(!/Özüne Dön yüklenemedi\./.test(html)&&(html.match(/Özüne Dön açılamadı\. Sayfayı yenileyip tekrar dene\./g)||[]).length===2,'index.html ozLoad metni yenilendi');
 const base=require('child_process').execSync('git show abc68cf:oz-market-v1.js',{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20});
 ok((js.match(/Ödeme yöntemi çok yakında/g)||[]).length===(base.match(/Ödeme yöntemi çok yakında/g)||[]).length,'"Ödeme yöntemi çok yakında" metinlerine dokunulmadı');
 const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const {p,st}=await open(br,{w:390,h:844,visible:true});
 const warns=[];p.on('console',m=>{if(m.type()==='warning')warns.push(m.text())});
 await enter(p);
 const show=async(msg)=>{await p.evaluate(m=>{window.__OZ_FX.fail={oz_my_orders:m}},msg);await p.evaluate(()=>OZ.go('orders',{}));await p.waitForTimeout(1200);
  return p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozErrBox p');return b?b.textContent:null})};
 let t=await show('duplicate key value violates unique constraint "oz_orders_pkey"');
 ok(t===GEN,'İngilizce ham hata → genel Türkçe: '+t);
 ok(!(await p.evaluate(()=>/duplicate key|constraint/.test(document.body.innerText))),'ham metin ekranda görünmemeli');
 ok(warns.some(w=>/duplicate key value/.test(w)),'ayrıntı console.warn ile kaydedilmeli');
 t=await show('Internal Server Error');ok(t===GEN,'öneksiz İngilizce → genel: '+t);
 t=await show('OZ_STATE: Bu sipariş artık iptal edilemez.');ok(t==='Bu sipariş artık iptal edilemez.','önekli Türkçe sunucu mesajı aynen: '+t);
 t=await show('Sepetteki ürün stokta kalmadı.');ok(t==='Sepetteki ürün stokta kalmadı.','öneksiz Türkçe mesaj aynen: '+t);
 t=await show('sütun "x" için geçersiz değer: invalid input syntax for type uuid');ok(t===GEN,'Türkçe harfli ama teknik metin → genel: '+t);
 t=await show({message:'Could not find the function public.oz_my_orders',code:'PGRST202'});ok(t==='Bu özellik şu an açık değil. Biraz sonra tekrar dene.','bulunamayan RPC metni: '+t);
 // platform katmanı yok
 await p.evaluate(()=>{window.__OZ_FX.fail={};window.__pfr=window.PF.rpc;window.PF.rpc=null});await p.evaluate(()=>OZ.go('orders',{}));await p.waitForTimeout(800);
 t=await p.evaluate(()=>{const b=document.querySelector('#ozRoot .ozErrBox p');return b?b.textContent:null});
 ok(t==='Bağlantı kurulamadı. Sayfayı yenileyip tekrar dene.','platform katmanı yok metni: '+t);
 await p.evaluate(()=>{window.PF.rpc=window.__pfr});
 // depolama hatası: fotoğraf yükleme (yeni ürün formu)
 await p.route('**/storage/v1/object/oz-images/**',r=>r.fulfill({status:413,contentType:'application/json',body:JSON.stringify({statusCode:'413',error:'Payload too large',message:'The object exceeded the maximum allowed size'})}));
 await p.evaluate(()=>OZ.go('sellerProduct',{}));await p.waitForTimeout(1500);
 const inp=await p.$('#ozRoot input[type=file][data-file=pimg]');ok(!!inp,'fotoğraf ekle alanı');
 if(inp){await inp.setInputFiles(path.join(ROOT,'assets/oz-cat/recel.jpg'));await p.waitForTimeout(1500);
  const tt=await p.evaluate(()=>[...document.querySelectorAll('.ozToast')].map(x=>x.textContent).join(' | '));
  ok(/Fotoğraf yüklenemedi\. İnternetini kontrol edip tekrar dene\./.test(tt)&&!/Payload|exceeded|maximum/i.test(tt+(await p.evaluate(()=>document.body.innerText))),'depolama hatası Türkçe, ham metin yok: '+tt);
  ok(warns.some(w=>/exceeded the maximum/.test(w)),'depolama ayrıntısı console.warn');}
 ok(await overflow(p)<=0,'390px taşma yok');
 ok(!st.errors.length,'sayfa hatası: '+st.errors.join(' | '));
 await br.close();
 if(fails.length){console.error('ae3-hata-metin BAŞARISIZ:\n - '+fails.join('\n - '));process.exit(1)}
 console.log('ae3-hata-metin: tüm kontroller geçti');process.exit(0);
})().catch(e=>{console.error('ae3-hata-metin HATA:',e);process.exit(1)});
