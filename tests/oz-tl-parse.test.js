// Özüne Dön TL girişi → kuruş testi. Çalıştır: node tests/oz-tl-parse.test.js
// oz-market-v1.js'teki tlToKurus fonksiyonunu dosyadan alıp dener (bağımlılık yok).
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','oz-market-v1.js'),'utf8');
const m=src.match(/function tlToKurus\(v\)\{[\s\S]*?Math\.round\(n\*100\):NaN\}/);
assert(m,'tlToKurus bulunamadı');
const tlToKurus=new Function(m[0]+';return tlToKurus;')();
const ok=[['1000',100000],['1.000',100000],['1.000,50',100050],['1000,5',100050],['1000,50',100050],['49,90',4990],['0,5',50],['12',1200],
  ['1.234.567,89',123456789],[' 1.000 ₺',100000],['1000 TL',100000],['65.90',6590],['1.5',150],['0',0]];
const bad=['abc','1,234','1.00.0','12,345','1.0000','-5','1,','5a','',' ','1.000,505','1e3'];
let n=0;
for(const [i,e] of ok){const g=tlToKurus(i);assert.strictEqual(g,e,`"${i}" → ${g}, beklenen ${e}`);n++}
for(const i of bad){const g=tlToKurus(i);assert(Number.isNaN(g),`"${i}" geçersiz olmalıydı, ${g} döndü`);n++}
console.log('tlToKurus: '+n+' durum geçti');
