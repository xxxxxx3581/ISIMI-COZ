// Özüne Dön birim fiyat testi (S1). Çalıştır: node tests/oz-birim-fiyat.test.js
// oz-market-v1.js'ten qtyOf + unitPrice fonksiyonlarını alıp dener (bağımlılık yok, gerçek TL biçimi).
// Doğrulanan: 1 lt/90 ₺ → 90 ₺/L; 500 ml/45 ₺ → 90 ₺/L; 1 kg/400 ₺ → 400 ₺/kg; 800 gr/240 ₺ → 300 ₺/kg; 250 g/75 ₺ → 300 ₺/kg;
// 1,5 L/120 ₺ → 80 ₺/L; tek seçenekte miktar net miktardan; birimsiz/adet → gösterilmez; gerçekçi olmayan miktar
// (canlıdaki "1000 lt" süt kaydı gibi) yanıltıcı "≈ 0,09 ₺/L" yerine gösterilmez.
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','oz-market-v1.js'),'utf8');
function grab(n){const i=src.indexOf('function '+n+'(');assert(i>=0,n+' bulunamadı');let d=0;const j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}}
const num=x=>{x=Number(x);return isFinite(x)?x:0},arr=x=>Array.isArray(x)?x:[];
const NF=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});const TL=new Function('NF',grab('TL')+';return TL;')(NF);
const f=new Function('num','arr','TL',grab('qtyOf')+';'+grab('unitPrice')+';return {qtyOf,unitPrice};')(num,arr,TL);
const one=(label,kurus,net)=>{const v={label,price_kurus:kurus};return f.unitPrice({variants:[v],net_content:net},v).replace(/ /g,' ')};
const cases=[
 ['1 lt',9000,null,'≈ 90,00 ₺/L'],['500 ml',4500,null,'≈ 90,00 ₺/L'],['1 kg',40000,null,'≈ 400,00 ₺/kg'],['800 gr',24000,null,'≈ 300,00 ₺/kg'],
 ['250 g',7500,null,'≈ 300,00 ₺/kg'],['1,5 L',12000,null,'≈ 80,00 ₺/L'],['1L',9000,null,'≈ 90,00 ₺/L'],['2 kg',50000,null,'≈ 250,00 ₺/kg'],
 ['Kavanoz',45000,'800 gr','≈ 562,50 ₺/kg'],['3 adet',9000,null,''],['Standart',9000,null,''],['1000',9000,'1000 lt',''],['1000 lt',9000,null,'']];
let n=0;
for(const [l,k,net,e] of cases){const g=one(l,k,net);assert.strictEqual(g,e,`"${l}"${net?' (net '+net+')':''} / ${k/100} ₺ → "${g}", beklenen "${e}"`);n++}
console.log('birim fiyat: '+n+' durum geçti');
