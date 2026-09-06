(() => {
  "use strict";

  const state = {
    step: 0,
    answers: {},
    caseId: null,
    createdAt: null
  };

  const questions = [
    {
      key: "seller_type",
      title: "Satıcı kim?",
      type: "choice",
      options: [
        ["real_person", "Gerçek kişi"],
        ["company", "Şirket / tüzel kişi"]
      ]
    },
    {
      key: "property_location",
      title: "Taşınmaz nerede?",
      type: "choice",
      options: [
        ["turkey", "Türkiye'de"],
        ["abroad", "Yurt dışında"]
      ]
    },
    {
      key: "title_deed",
      title: "Taşınmaza ait tapu bilgileri mevcut mu?",
      type: "choice",
      options: [
        ["yes", "Evet, mevcut"],
        ["no", "Hayır / emin değilim"]
      ]
    },
    {
      key: "multiple_owners",
      title: "Taşınmazın birden fazla maliki var mı?",
      type: "choice",
      options: [
        ["no", "Hayır, tek malik"],
        ["yes", "Evet, birden fazla malik"],
        ["unknown", "Bilmiyorum"]
      ]
    },
    {
      key: "encumbrance",
      title: "Tapu kaydında ipotek, haciz, şerh veya benzeri bir kayıt var mı?",
      type: "choice",
      options: [
        ["no", "Hayır"],
        ["yes", "Evet"],
        ["unknown", "Bilmiyorum"]
      ]
    },
    {
      key: "representation",
      title: "Satışta vekil, vasi veya başka bir temsilci olacak mı?",
      type: "choice",
      options: [
        ["no", "Hayır"],
        ["yes", "Evet"]
      ]
    },
    {
      key: "acquisition_date",
      title: "Taşınmazı hangi tarihte edindiniz?",
      type: "date"
    },
    {
      key: "acquisition_type",
      title: "Taşınmazı nasıl edindiniz?",
      type: "choice",
      options: [
        ["purchase", "Satın alarak"],
        ["inheritance", "Miras yoluyla"],
        ["gift", "Bağış / bedelsiz edinim"],
        ["other", "Diğer"]
      ]
    },
    {
      key: "buyer_ready",
      title: "Alıcı belli mi?",
      type: "choice",
      options: [
        ["yes", "Evet"],
        ["no", "Hayır"]
      ]
    },
    {
      key: "sale_price",
      title: "Planlanan satış bedeli nedir?",
      type: "number",
      placeholder: "TL"
    },
    {
      key: "building",
      title: "Taşınmaz üzerinde bina / konut / bağımsız bölüm var mı?",
      type: "choice",
      options: [
        ["yes", "Evet"],
        ["no", "Hayır"]
      ]
    }
  ];

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Belirtilmedi";

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0
    }).format(n);
  }

  function dateText(value) {
    if (!value) return "Belirtilmedi";

    const d = new Date(`${value}T12:00:00`);

    if (Number.isNaN(d.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("tr-TR").format(d);
  }

  function answerLabel(key, value) {
    const q = questions.find(x => x.key === key);

    if (!q || !q.options) {
      return value || "Belirtilmedi";
    }

    const item = q.options.find(x => x[0] === value);

    return item ? item[1] : (value || "Belirtilmedi");
  }

  function createCaseId() {
    const d = new Date();

    const p = n => String(n).padStart(2, "0");

    return `IH-KS-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function root() {
    return (
      document.getElementById("hallet-root") ||
      document.getElementById("app") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function styles() {
    if (document.getElementById("hallet-file-style")) return;

    const s = document.createElement("style");

    s.id = "hallet-file-style";

    s.textContent = `
      .hf-wrap {
        max-width: 760px;
        margin: 0 auto;
        padding-bottom: 30px;
      }

      .hf-card {
        background: #fff;
        border: 1px solid #e4eae8;
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 12px;
        box-shadow: 0 4px 18px rgba(0,0,0,.04);
      }

      .hf-head {
        background: linear-gradient(135deg,#0E5C53,#174f49);
        color: white;
        border-radius: 18px;
        padding: 22px;
        margin-bottom: 12px;
      }

      .hf-kicker {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .14em;
        opacity: .75;
      }

      .hf-title {
        margin: 6px 0;
        font-size: 26px;
        font-weight: 800;
      }

      .hf-meta {
        font-size: 12px;
        line-height: 1.6;
        opacity: .9;
      }

      .hf-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 15px;
      }

      .hf-stat {
        background: rgba(255,255,255,.1);
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 11px;
        padding: 10px;
      }

      .hf-stat-label {
        font-size: 10px;
        opacity: .7;
      }

      .hf-stat-value {
        font-size: 13px;
        font-weight: 700;
        margin-top: 3px;
      }

      .hf-card h3 {
        margin: 0 0 10px;
        font-size: 17px;
      }

      .hf-item {
        display: flex;
        gap: 10px;
        padding: 11px 0;
        border-bottom: 1px solid #edf0ef;
      }

      .hf-item:last-child {
        border-bottom: 0;
      }

      .hf-icon {
        width: 27px;
        height: 27px;
        min-width: 27px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
      }

      .hf-ok {
        background: #e7f4ed;
        color: #176947;
      }

      .hf-warn {
        background: #fff1d7;
        color: #875d12;
      }

      .hf-info {
        background: #e9f1f7;
        color: #245a78;
      }

      .hf-danger {
        background: #fde9e7;
        color: #9b3028;
      }

      .hf-text strong {
        display: block;
        font-size: 14px;
        margin-bottom: 3px;
      }

      .hf-text span {
        display: block;
        font-size: 13px;
        color: #606c69;
        line-height: 1.5;
      }

      .hf-disclaimer {
        background: #f5f7f6;
        border-radius: 11px;
        padding: 12px;
        margin-top: 10px;
        font-size: 12px;
        color: #65716e;
        line-height: 1.55;
      }

      .hf-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 15px;
      }

      .hf-btn {
        border: 0;
        border-radius: 11px;
        padding: 12px 15px;
        font-weight: 700;
        cursor: pointer;
      }

      .hf-primary {
        background: #0E5C53;
        color: white;
      }

      .hf-secondary {
        background: #edf2f0;
        color: #17413c;
      }

      .hf-back {
        border: 0;
        background: transparent;
        color: #5b6966;
        cursor: pointer;
        padding: 4px 0;
      }

      .hf-choice {
        width: 100%;
        text-align: left;
        border: 1px solid #dfe7e4;
        background: white;
        border-radius: 12px;
        padding: 14px;
        margin: 7px 0;
        font-weight: 650;
        cursor: pointer;
      }

      .hf-choice:hover {
        border-color: #0E5C53;
      }

      .hf-input {
        width: 100%;
        box-sizing: border-box;
        padding: 14px;
        border: 1px solid #dfe7e4;
        border-radius: 12px;
        font-size: 16px;
        margin: 10px 0;
      }

      .hf-progress {
        height: 7px;
        background: #e9eeec;
        border-radius: 10px;
        overflow: hidden;
        margin: 8px 0 20px;
      }

      .hf-progress div {
        height: 100%;
        background: #0E5C53;
      }

      @media(max-width:560px) {
        .hf-grid {
          grid-template-columns: 1fr;
        }

        .hf-title {
          font-size: 22px;
        }
      }
    `;

    document.head.appendChild(s);
  }

  function render(html) {
    styles();
    root().innerHTML = html;
  }

  function showGate() {
    render(`
      <div class="hf-wrap">
        <div class="hf-card" style="text-align:center;">
          <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#0E5C53;">
            İŞİNİ HALLET
          </div>

          <h1>Ne yapmak istiyorsun?</h1>

          <p style="color:#65716f;">
            İşlemini seç, gerekli adımları birlikte çıkaralım.
          </p>

          <button class="hf-choice" onclick="Hallet.showIslemMenu()">
            📋 Bir işlem yapmak istiyorum
          </button>

          <button class="hf-choice" onclick="Hallet.showMessage('Evrak hazırlama modülü sonraki aşamada açılacak.')">
            📄 Evrak hazırlamak istiyorum
          </button>

          <button class="hf-choice" onclick="Hallet.showMessage('Kurum başvuru modülü sonraki aşamada açılacak.')">
            🏛️ Bir kuruma başvuracağım
          </button>

          <button class="hf-choice" onclick="Hallet.goIsimiCoz()">
            🛠️ Hizmet / usta bulmam gerekiyor
          </button>
        </div>
      </div>
    `);
  }

  function showIslemMenu() {
    render(`
      <div class="hf-wrap">
        <button class="hf-back" onclick="Hallet.showGate()">← Geri</button>

        <div class="hf-card">
          <h2>Hangi işlemi yapmak istiyorsun?</h2>

          <button class="hf-choice" onclick="Hallet.showTasinmazMenu()">
            🏠 Taşınmaz işlemleri
          </button>

          <button class="hf-choice" onclick="Hallet.showMessage('Diğer işlem türleri sonraki aşamada eklenecek.')">
            📑 Diğer işlemler
          </button>
        </div>
      </div>
    `);
  }

  function showTasinmazMenu() {
    render(`
      <div class="hf-wrap">
        <button class="hf-back" onclick="Hallet.showIslemMenu()">← Geri</button>

        <div class="hf-card">
          <h2>Taşınmaz işlemi</h2>

          <button class="hf-choice" onclick="Hallet.showKonutSatis()">
            🏠 Konut / taşınmaz satışı
          </button>

          <button class="hf-choice" onclick="Hallet.showMessage('Taşınmaz satın alma akışı sonraki aşamada eklenecek.')">
            🏡 Taşınmaz satın alma
          </button>
        </div>
      </div>
    `);
  }

  function showKonutSatis() {
    state.step = 0;
    state.answers = {};
    state.caseId = createCaseId();
    state.createdAt = new Date();

    showQuestion();
  }

  function showQuestion() {
    const q = questions[state.step];

    if (!q) {
      showResult();
      return;
    }

    const percent = Math.round(
      ((state.step + 1) / questions.length) * 100
    );

    let input = "";

    if (q.type === "choice") {
      input = q.options.map(([value, label]) => `
        <button
          class="hf-choice"
          onclick="Hallet.choose('${esc(value)}')">
          ${esc(label)}
        </button>
      `).join("");
    }

    if (q.type === "date") {
      input = `
        <input
          id="hf-input"
          class="hf-input"
          type="date"
          value="${esc(state.answers[q.key] || "")}"
        >

        <button class="hf-choice" onclick="Hallet.submitInput()">
          Devam et →
        </button>
      `;
    }

    if (q.type === "number") {
      input = `
        <input
          id="hf-input"
          class="hf-input"
          type="number"
          min="0"
          step="1"
          placeholder="${esc(q.placeholder)}"
          value="${esc(state.answers[q.key] || "")}"
        >

        <button class="hf-choice" onclick="Hallet.submitInput()">
          Devam et →
        </button>
      `;
    }

    render(`
      <div class="hf-wrap">

        <button class="hf-back" onclick="Hallet.back()">
          ← Geri
        </button>

        <div class="hf-card">

          <div style="font-size:13px;color:#687572;">
            Adım ${state.step + 1} / ${questions.length}
          </div>

          <div class="hf-progress">
            <div style="width:${percent}%"></div>
          </div>

          <h2>${esc(q.title)}</h2>

          ${input}

        </div>

      </div>
    `);
  }

  function choose(value) {
    const q = questions[state.step];

    state.answers[q.key] = value;

    state.step++;

    showQuestion();
  }

  function submitInput() {
    const q = questions[state.step];
    const input = document.getElementById("hf-input");

    if (!input || !input.value) {
      input?.focus();
      return;
    }

    if (
      q.type === "number" &&
      (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)
    ) {
      input.focus();
      return;
    }

    state.answers[q.key] = input.value;

    state.step++;

    showQuestion();
  }

  function back() {
    if (state.step <= 0) {
      showTasinmazMenu();
      return;
    }

    state.step--;

    showQuestion();
  }

  function withinFiveYears(value) {
    if (!value) return null;

    const acquired = new Date(`${value}T12:00:00`);

    if (Number.isNaN(acquired.getTime())) {
      return null;
    }

    const limit = new Date(acquired);

    limit.setFullYear(limit.getFullYear() + 5);

    return new Date() < limit;
  }

  function taxAssessment() {
    const a = state.answers;

    if (
      a.acquisition_type === "inheritance" ||
      a.acquisition_type === "gift"
    ) {
      return {
        type: "info",
        title: "Miras / bedelsiz edinim",
        text:
          "Miras veya bedelsiz edinim seçildi. GİB açıklamalarına göre bu tür edinimlerde değer artış kazancı bakımından farklı kural uygulanır."
      };
    }

    const fiveYears = withinFiveYears(a.acquisition_date);

    if (
      a.acquisition_type === "purchase" &&
      fiveYears === true
    ) {
      return {
        type: "warn",
        title: "5 yıllık süre dolmamış görünüyor",
        text:
          "Edinim tarihine göre satış 5 yıllık süre içinde görünüyor. Değer artış kazancı ve beyan durumu ayrıca hesaplanmalı."
      };
    }

    if (
      a.acquisition_type === "purchase" &&
      fiveYears === false
    ) {
      return {
        type: "ok",
        title: "5 yıllık süre aşılmış görünüyor",
        text:
          "Edinim tarihine göre 5 yıllık süre aşılmış görünüyor. Satış tarihi ve edinim tarihi resmî hesaplamayla doğrulanmalı."
      };
    }

    return {
      type: "info",
      title: "Vergi incelemesi gerekli",
      text:
        "Kesin vergi sonucu bu bilgilerle otomatik olarak çıkarılmadı."
    };
  }

  function item(icon, cls, title, text) {
    return `
      <div class="hf-item">
        <div class="hf-icon ${cls}">
          ${icon}
        </div>

        <div class="hf-text">
          <strong>${esc(title)}</strong>
          <span>${esc(text)}</span>
        </div>
      </div>
    `;
  }

  function showResult() {
    const a = state.answers;
    const tax = taxAssessment();

    const completed = [];
    const warnings = [];

    completed.push([
      "✓",
      "Satıcı",
      answerLabel("seller_type", a.seller_type)
    ]);

    if (a.property_location === "turkey") {
      completed.push([
        "✓",
        "Taşınmaz konumu",
        "Türkiye'de"
      ]);
    } else {
      warnings.push([
        "!",
        "Taşınmaz konumu",
        "Bu akış Türkiye'deki tapu işlemleri için hazırlanmıştır."
      ]);
    }

    if (a.title_deed === "yes") {
      completed.push([
        "✓",
        "Tapu bilgileri",
        "Mevcut olarak belirtildi."
      ]);
    } else {
      warnings.push([
        "!",
        "Tapu bilgileri",
        "Tapu bilgileri/senedi işlem öncesinde doğrulanmalı."
      ]);
    }

    if (a.multiple_owners === "no") {
      completed.push([
        "✓",
        "Malik durumu",
        "Tek malik."
      ]);
    } else {
      warnings.push([
        "!",
        "Malik durumu",
        a.multiple_owners === "yes"
          ? "Birden fazla malik var. Maliklerin veya geçerli temsilcilerinin durumu ayrıca kontrol edilmeli."
          : "Malik sayısı güncel tapu kaydından kontrol edilmeli."
      ]);
    }

    if (a.encumbrance === "no") {
      completed.push([
        "✓",
        "Tapu kaydı",
        "Bilinen bir ipotek/haciz/şerh olmadığı belirtildi."
      ]);
    } else {
      warnings.push([
        "!",
        "Tapu kaydı",
        a.encumbrance === "yes"
          ? "İpotek, haciz, şerh veya benzeri kayıt bulunduğu belirtildi."
          : "Güncel tapu kaydındaki ipotek, haciz, şerh ve beyanlar kontrol edilmeli."
      ]);
    }

    if (a.representation === "no") {
      completed.push([
        "✓",
        "Temsil",
        "Vekil/vasi/başka temsilci yok."
      ]);
    } else {
      warnings.push([
        "!",
        "Temsil belgesi",
        "Vekâletname, vasi kararı veya diğer temsil belgesi kontrol edilmeli."
      ]);
    }

    if (a.acquisition_date) {
      completed.push([
        "✓",
        "Edinim tarihi",
        dateText(a.acquisition_date)
      ]);
    }

    completed.push([
      "✓",
      "Edinim şekli",
      answerLabel("acquisition_type", a.acquisition_type)
    ]);

    if (a.buyer_ready === "yes") {
      completed.push([
        "✓",
        "Alıcı",
        "Alıcı belli."
      ]);
    } else {
      warnings.push([
        "!",
        "Alıcı",
        "Alıcı henüz belli değil."
      ]);
    }

    if (a.sale_price) {
      completed.push([
        "✓",
        "Planlanan satış bedeli",
        money(a.sale_price)
      ]);
    } else {
      warnings.push([
        "!",
        "Satış bedeli",
        "Satış bedeli girilmedi."
      ]);
    }

    if (a.building === "yes") {
      warnings.push([
        "!",
        "DASK",
        "Bina/konut için geçerli DASK poliçesi kontrol edilmeli."
      ]);
    }

    if (a.seller_type === "company") {
      warnings.push([
        "!",
        "Tüzel kişi belgeleri",
        "Şirket yetkisi, temsil ve şirket belgeleri için ayrı kontrol gerekir."
      ]);
    }

    const steps = [
      "Kimlik belgelerini hazırla.",
      "Tapu bilgilerini/senedini hazır bulundur.",
      "Güncel tapu kaydındaki şerh, beyan, ipotek ve hacizleri kontrol et.",
      "Emlak beyan değeri / belediye verisini kontrol et.",
      "Bina veya konut ise DASK poliçesini kontrol et.",
      "Temsil varsa temsil belgesini hazırla.",
      "Web Tapu üzerinden başvuru sürecini başlat ve başvuru bildirimlerini takip et."
    ];

    const taxClass =
      tax.type === "ok"
        ? "hf-ok"
        : tax.type === "warn"
          ? "hf-warn"
          : "hf-info";

    const taxIcon =
      tax.type === "ok"
        ? "✓"
        : tax.type === "warn"
          ? "!"
          : "i";

    render(`
      <div class="hf-wrap">

        <div class="hf-head">

          <div class="hf-kicker">
            İŞLEM DOSYASI
          </div>

          <div class="hf-title">
            Konut / Taşınmaz Satışı
          </div>

          <div class="hf-meta">
            Ön kontrol tamamlandı<br>
            Dosya No: ${esc(state.caseId)}<br>
            Oluşturulma: ${esc(dateText(new Date(state.createdAt).toISOString().slice(0,10)))}
          </div>

          <div class="hf-grid">

            <div class="hf-stat">
              <div class="hf-stat-label">SATICI</div>
              <div class="hf-stat-value">
                ${esc(answerLabel("seller_type", a.seller_type))}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">TAŞINMAZ</div>
              <div class="hf-stat-value">
                ${esc(answerLabel("property_location", a.property_location))}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">EDİNİM</div>
              <div class="hf-stat-value">
                ${esc(answerLabel("acquisition_type", a.acquisition_type))}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">SATIŞ BEDELİ</div>
              <div class="hf-stat-value">
                ${esc(money(a.sale_price))}
              </div>
            </div>

          </div>

        </div>

        <div class="hf-card">
          <h3>✓ Tamamlananlar</h3>

          ${
            completed.length
              ? completed.map(x =>
                  item(x[0], "hf-ok", x[1], x[2])
                ).join("")
              : item("i", "hf-info", "Henüz yok", "Kontroller tamamlanmadı.")
          }
        </div>

        <div class="hf-card">
          <h3>⚠ Kontrol Edilmesi Gerekenler</h3>

          ${
            warnings.length
              ? warnings.map(x =>
                  item(x[0], "hf-warn", x[1], x[2])
                ).join("")
              : item(
                  "✓",
                  "hf-ok",
                  "Kritik uyarı bulunmadı",
                  "Yine de işlem öncesinde resmî kayıtlar doğrulanmalı."
                )
          }
        </div>

        <div class="hf-card">

          <h3>₺ Vergi Kontrolü</h3>

          ${item(
            taxIcon,
            taxClass,
            tax.title,
            tax.text
          )}

          ${
            a.sale_price
              ? item(
                  "₺",
                  "hf-info",
                  "Planlanan satış bedeli",
                  money(a.sale_price)
                )
              : ""
          }

          <div class="hf-disclaimer">
            2026 yılında değer artış kazancı istisna tutarı 150.000 TL'dir.
            Ancak vergi sonucu yalnızca satış bedeline bakılarak belirlenmez;
            edinim tarihi, edinim bedeli, satış bedeli, giderler ve gerekli
            endeksleme gibi unsurlar dikkate alınır.
            Bu ekran kesin vergi hesabı yapmaz.
          </div>

        </div>

        <div class="hf-card">

          <h3>→ Sonraki Adımlar</h3>

          ${steps.map((text, i) =>
            item(
              String(i + 1),
              "hf-info",
              `Adım ${i + 1}`,
              text
            )
          ).join("")}

        </div>

        <div class="hf-card">

          <h3>📌 Dosya Özeti</h3>

          ${item(
            "•",
            "hf-info",
            "Edinim tarihi",
            dateText(a.acquisition_date)
          )}

          ${item(
            "•",
            "hf-info",
            "Edinim şekli",
            answerLabel("acquisition_type", a.acquisition_type)
          )}

          ${item(
            "•",
            "hf-info",
            "Alıcı durumu",
            answerLabel("buyer_ready", a.buyer_ready)
          )}

          ${item(
            "•",
            "hf-info",
            "Bina durumu",
            answerLabel("building", a.building)
          )}

        </div>

        <div class="hf-disclaimer">
          <b>Önemli:</b> Bu İşlem Dosyası, verdiğin cevaplara göre hazırlanmış
          bir ön değerlendirmedir. Kesin belge, harç, vergi ve işlem sonucu
          güncel TKGM, GİB ve ilgili kurum kayıtları üzerinden doğrulanmalıdır.
        </div>

        <div class="hf-actions">

          <button
            class="hf-btn hf-primary"
            onclick="Hallet.showMessage('İşlem Dosyası kayıt altyapısı bir sonraki aşamada Supabase\\'e bağlanacak.')">
            💾 Dosyayı Kaydet
          </button>

          <button
            class="hf-btn hf-secondary"
            onclick="Hallet.showKonutSatis()">
            ↺ Cevapları Düzenle
          </button>

          <button
            class="hf-btn hf-secondary"
            onclick="Hallet.showGate()">
            Ana Menü
          </button>

        </div>

      </div>
    `);
  }

  function showMessage(message) {
    render(`
      <div class="hf-wrap">
        <div class="hf-card" style="text-align:center;padding:35px 20px;">

          <div style="font-size:40px;">✓</div>

          <h2>${esc(message)}</h2>

          <button
            class="hf-choice"
            onclick="Hallet.showGate()">
            Ana menüye dön
          </button>

        </div>
      </div>
    `);
  }

  function goIsimiCoz() {
    if (typeof window.showHome === "function") {
      window.showHome();
      return;
    }

    if (typeof window.renderCategories === "function") {
      window.renderCategories();
      return;
    }

    showMessage(
      "İşimi Çöz modülü mevcut uygulamanın ana ekranından açılabilir."
    );
  }

  window.Hallet = {
    showGate,
    showIslemMenu,
    showTasinmazMenu,
    showKonutSatis,
    showQuestion,
    showResult,
    showMessage,
    goIsimiCoz,
    choose,
    submitInput,
    back
  };

})();
