from pathlib import Path
import re
import subprocess
import tempfile

path = Path('index.html')
s = path.read_text(encoding='utf-8')

css_marker = '/* PLATFORM V1 HOME */'
if css_marker not in s:
    css = r'''
/* PLATFORM V1 HOME */
.platformHome{display:block}.platformHero{background:linear-gradient(145deg,#10332f,#0d1a2b);border:1px solid #2b6f65;border-radius:24px;padding:24px 20px;margin-bottom:16px}.platformHero .eyebrow{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:99px;background:rgba(25,195,125,.12);border:1px solid rgba(25,195,125,.28);color:#6df0b5;font-size:12px;font-weight:800}.platformHero h1{font-size:32px;line-height:1.08;margin:15px 0 9px}.platformHero p{margin:0;color:#b7c7d8}.platformActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.platformAction{display:flex;align-items:center;gap:12px;text-align:left;min-height:96px;padding:15px;border:1px solid #20344d;border-radius:18px;background:#0d1a2b;color:#eef4fb}.platformAction:hover{border-color:#315270}.platformAction .paIcon{font-size:27px}.platformAction strong{display:block;font-size:15px}.platformAction span{display:block;color:#9eb0c5;font-size:11px;line-height:1.4;margin-top:4px}.platformSection{margin-top:18px}.platformSectionHead{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:10px}.platformSectionHead h2{margin:0}.platformQuick{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.platformQuick .card{min-height:108px}.platformMini{display:flex;justify-content:space-between;align-items:center;gap:10px}.platformMiniIcon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#17334d;font-size:20px}.platformHint{font-size:12px;color:#9eb0c5;line-height:1.5}.platformTrust{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.platformTrust span{font-size:11px;color:#b7c7d8;background:#091827;border:1px solid #20344d;padding:7px 9px;border-radius:99px}@media(max-width:430px){.platformHero{padding:20px 16px}.platformHero h1{font-size:28px}.platformActions{grid-template-columns:1fr}.platformQuick{grid-template-columns:1fr 1fr}}
'''
    s = s.replace('</style>', css + '\n</style>', 1)

pattern = re.compile(r'function showHome\(\)\{[\s\S]*?\n\}\n\nfunction showRequest')
match = pattern.search(s)
if not match:
    raise SystemExit('showHome boundary not found; refusing to modify index.html')

new_home = r'''function showHome(){
  setNav("navHome");
  const goHallet=()=>{try{if(window.Hallet&&typeof window.Hallet.showGate==='function'){window.Hallet.showGate();return}openHallet();}catch(e){console.error(e)}};
  const goHalletMenu=()=>{try{if(window.Hallet&&typeof window.Hallet.showIslemMenu==='function'){window.Hallet.showIslemMenu();return}goHallet();}catch(e){console.error(e)}};
  app(`<section class="platformHome">
    <section class="platformHero">
      <span class="eyebrow">✦ TÜRKİYE ODAKLI DİJİTAL İŞ ASİSTANI</span>
      <h1>Bugün ne yapmak istiyorsun?</h1>
      <p>İşlemini hazırla, evrağını oluştur, kuruma başvur veya ihtiyacın olan hizmeti bul. Her adımda ne yapacağını net gör.</p>
      <div class="platformTrust"><span>✓ Adım adım ilerleme</span><span>✓ İşlem dosyası</span><span>✓ Mobil uyumlu</span></div>
    </section>

    <section class="platformActions">
      <button class="platformAction" type="button" onclick="goHalletMenu()"><span class="paIcon">📋</span><span><strong>Bir işlem yap</strong><span>İşlemini seç, bilgilerini tamamla ve dosyanı oluştur.</span></span></button>
      <button class="platformAction" type="button" onclick="goHalletMenu()"><span class="paIcon">📄</span><span><strong>Evrak hazırla</strong><span>Hazırlamak istediğin belgeyi adım adım oluştur.</span></span></button>
      <button class="platformAction" type="button" onclick="goHalletMenu()"><span class="paIcon">🏛️</span><span><strong>Kuruma başvur</strong><span>Başvuru bilgilerini ve gerekli belgeleri hazırla.</span></span></button>
      <button class="platformAction" type="button" onclick="showRequest()"><span class="paIcon">🛠️</span><span><strong>Hizmet bul</strong><span>Yakınındaki usta veya hizmet sağlayıcı için talep oluştur.</span></span></button>
    </section>

    <section class="platformSection">
      <div class="platformSectionHead"><div><h2>İşlem Dosyalarım</h2><div class="platformHint">Kaldığın yerden devam et.</div></div><button class="btn secondary smallBtn" type="button" onclick="goHallet()">Aç →</button></div>
      <div class="platformQuick">
        <div class="card"><div class="platformMini"><div><strong>Kaydet & devam et</strong><div class="platformHint">Yarım kalan işlem dosyalarını Hallet içinden yönet.</div></div><div class="platformMiniIcon">📁</div></div></div>
        <div class="card"><div class="platformMini"><div><strong>Belgelerini takip et</strong><div class="platformHint">Hazır, eksik ve yüklenmiş belgeleri tek akışta gör.</div></div><div class="platformMiniIcon">✓</div></div></div>
      </div>
    </section>

    <section class="platformSection card">
      <div class="platformMini"><div><h3>Hızlı başlangıç</h3><div class="platformHint">Ne yapmak istediğinden emin değilsen önce işlemini anlat.</div></div><div class="platformMiniIcon">💬</div></div>
      <button class="btn primary" type="button" style="margin-top:12px" onclick="showRequest()">İhtiyacımı anlat →</button>
    </section>
  </section>`);
}

function showRequest'''

s = s[:match.start()] + new_home + s[match.end():]

# Verify the expected protected systems are still present.
required = ['function openHallet(){', 'window.Hallet', 'function result(', 'function kurumResult(', 'function evrak(', 'async function supabaseRequest']
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit('Protected markers missing after integration: ' + ', '.join(missing))

path.write_text(s, encoding='utf-8')

# Syntax-check every inline script block without executing the application.
html = s
scripts = re.findall(r'<script(?:\\s[^>]*)?>([\\s\\S]*?)</script>', html, flags=re.I)
with tempfile.TemporaryDirectory() as td:
    for i, code in enumerate(scripts):
        p = Path(td) / f'script-{i}.js'
        p.write_text(code, encoding='utf-8')
        r = subprocess.run(['node','--check',str(p)], capture_output=True, text=True)
        if r.returncode:
            print(r.stdout)
            print(r.stderr)
            raise SystemExit(f'node --check failed for inline script {i}')

print('platform-v1 integration: OK')
print(f'inline scripts checked: {len(scripts)}')
