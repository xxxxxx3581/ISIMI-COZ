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

  /* =========================================================
     TEMEL YARDIMCILAR
     ========================================================= */

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

    if (!Number.isFinite(n)) {
      return "Belirtilmedi";
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0
    }).format(n);
  }

  function dateText(value) {
    if (!value) {
      return "Belirtilmedi";
    }

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

    return item
      ? item[1]
      : (value || "Belirtilmedi");
  }

  function createCaseId() {
    const d = new Date();

    const p = n => String(n).padStart(2, "0");

    return `IH-KS-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  /* =========================================================
     İZOLE HALLET KÖKÜ
     ========================================================= */

  function getRoot() {
    let el = document.getElementById("hallet-root");

    if (!el) {
      el = document.createElement("div");
      el.id = "hallet-root";
      document.body.appendChild(el);
    }

    /*
     * Hallet kökünün body'nin doğrudan çocuğu olmasını sağlıyoruz.
     * Böylece #app/main gibi eski ekranların CSS katmanlarından
     * mümkün olduğunca ayrılır.
     */
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }

    el.setAttribute("aria-live", "polite");

    return el;
  }

  function openRoot() {
    const el = getRoot();

    el.style.display = "block";
    el.style.visibility = "visible";
    el.style.opacity = "1";

    document.body.classList.add("hallet-open");

    /*
     * Eski uygulamanın body scroll'unu devre dışı bırakıyoruz.
     * Hallet kendi içinde scroll olacak.
     */
    document.body.style.overflow = "hidden";

    return el;
  }

  function closeRoot() {
    const el = document.getElementById("hallet-root");

    if (el) {
      el.style.display = "none";
    }

    document.body.classList.remove("hallet-open");
    document.body.style.overflow = "";
  }

  /* =========================================================
     TAMAMEN İZOLE CSS
     ========================================================= */

  function styles() {
    if (document.getElementById("hallet-file-style-v2")) {
      return;
    }

    const s = document.createElement("style");

    s.id = "hallet-file-style-v2";

    s.textContent = `
      /* =====================================================
         ANA HALLET KATMANI
         ===================================================== */

      #hallet-root {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;

        z-index: 2147483647 !important;

        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;

        margin: 0 !important;
        padding: 0 !important;

        background: #f4f7f6 !important;
        color: #17201e !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        box-sizing: border-box !important;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          Arial,
          sans-serif !important;

        isolation: isolate !important;
      }

      #hallet-root,
      #hallet-root *,
      #hallet-root *::before,
      #hallet-root *::after {
        box-sizing: border-box !important;
      }

      /* =====================================================
         İZOLE UYGULAMA
         ===================================================== */

      #hallet-root .hf-app {
        all: initial !important;

        display: block !important;

        width: 100% !important;
        min-height: 100% !important;

        margin: 0 !important;
        padding: 24px 16px 48px !important;

        background: #f4f7f6 !important;
        color: #17201e !important;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          Arial,
          sans-serif !important;
      }

      #hallet-root .hf-app *,
      #hallet-root .hf-app *::before,
      #hallet-root .hf-app *::after {
        box-sizing: border-box !important;
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          Arial,
          sans-serif !important;
      }

      /* =====================================================
         GENEL
         ===================================================== */

      #hallet-root h1,
      #hallet-root h2,
      #hallet-root h3,
      #hallet-root p {
        display: block !important;
      }

      #hallet-root h1,
      #hallet-root h2,
      #hallet-root h3,
      #hallet-root p {
        margin-top: 0 !important;
      }

      #hallet-root button {
        appearance: none !important;
        -webkit-appearance: none !important;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          Arial,
          sans-serif !important;

        text-transform: none !important;
        letter-spacing: normal !important;
      }

      /* =====================================================
         ANA KONTEYNER
         ===================================================== */

      #hallet-root .hf-wrap {
        position: relative !important;

        width: 100% !important;
        max-width: 760px !important;

        margin: 0 auto !important;
        padding: 0 0 30px !important;

        display: block !important;

        z-index: 1 !important;
      }

      /* =====================================================
         KART
         ===================================================== */

      #hallet-root .hf-card {
        position: relative !important;

        display: block !important;

        width: 100% !important;

        margin: 0 0 14px !important;
        padding: 20px !important;

        background: #ffffff !important;
        color: #17201e !important;

        border: 1px solid #dfe7e4 !important;
        border-radius: 16px !important;

        box-shadow: 0 6px 22px rgba(0, 0, 0, 0.06) !important;

        overflow: visible !important;

        z-index: 2 !important;
      }

      /* =====================================================
         BAŞLIK
         ===================================================== */

      #hallet-root .hf-card h1,
      #hallet-root .hf-card h2 {
        position: relative !important;

        display: block !important;

        margin: 0 0 12px !important;
        padding: 0 !important;

        color: #17201e !important;

        font-size: 25px !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;

        text-align: left !important;

        background: transparent !important;

        z-index: 5 !important;
      }

      #hallet-root .hf-card h3 {
        display: block !important;

        margin: 0 0 10px !important;
        padding: 0 !important;

        color: #17201e !important;

        font-size: 17px !important;
        font-weight: 800 !important;
        line-height: 1.35 !important;
      }

      /* =====================================================
         ANA BAŞLIK
         ===================================================== */

      #hallet-root .hf-main-title {
        margin: 8px 0 10px !important;

        color: #17201e !important;

        font-size: 29px !important;
        font-weight: 850 !important;
        line-height: 1.2 !important;

        text-align: center !important;
      }

      #hallet-root .hf-main-subtitle {
        margin: 0 0 22px !important;

        color: #65716e !important;

        font-size: 14px !important;
        line-height: 1.55 !important;

        text-align: center !important;
      }

      /* =====================================================
         ÜST BAŞLIK / SONUÇ
         ===================================================== */

      #hallet-root .hf-head {
        position: relative !important;

        display: block !important;

        width: 100% !important;

        margin: 0 0 14px !important;
        padding: 22px !important;

        background: linear-gradient(
          135deg,
          #0E5C53,
          #174f49
        ) !important;

        color: #ffffff !important;

        border-radius: 18px !important;

        overflow: hidden !important;

        z-index: 2 !important;
      }

      #hallet-root .hf-kicker {
        display: block !important;

        margin: 0 !important;

        color: #ffffff !important;

        font-size: 11px !important;
        font-weight: 800 !important;

        letter-spacing: .14em !important;
      }

      #hallet-root .hf-title {
        display: block !important;

        margin: 6px 0 !important;

        color: #ffffff !important;

        font-size: 26px !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
      }

      #hallet-root .hf-meta {
        display: block !important;

        color: rgba(255,255,255,.92) !important;

        font-size: 12px !important;
        line-height: 1.6 !important;
      }

      /* =====================================================
         İSTATİSTİK
         ===================================================== */

      #hallet-root .hf-grid {
        display: grid !important;

        grid-template-columns: 1fr 1fr !important;

        gap: 8px !important;

        width: 100% !important;

        margin: 15px 0 0 !important;
      }

      #hallet-root .hf-stat {
        display: block !important;

        min-width: 0 !important;

        padding: 10px !important;

        background: rgba(255,255,255,.1) !important;

        border: 1px solid rgba(255,255,255,.15) !important;
        border-radius: 11px !important;
      }

      #hallet-root .hf-stat-label {
        display: block !important;

        color: rgba(255,255,255,.72) !important;

        font-size: 10px !important;
      }

      #hallet-root .hf-stat-value {
        display: block !important;

        margin-top: 3px !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 700 !important;
      }

      /* =====================================================
         SORU EKRANI
         ===================================================== */

      #hallet-root .hf-question-card {
        position: relative !important;

        display: block !important;

        width: 100% !important;

        margin: 0 !important;
        padding: 22px !important;

        background: #ffffff !important;
        color: #17201e !important;

        border: 1px solid #dfe7e4 !important;
        border-radius: 18px !important;

        box-shadow: 0 6px 22px rgba(0,0,0,.06) !important;

        z-index: 10 !important;

        overflow: visible !important;
      }

      #hallet-root .hf-step {
        position: relative !important;

        display: block !important;

        margin: 0 0 8px !important;

        color: #687572 !important;

        font-size: 13px !important;
        font-weight: 600 !important;

        line-height: 1.4 !important;

        z-index: 20 !important;
      }

      #hallet-root .hf-question-title {
        position: relative !important;

        display: block !important;

        width: 100% !important;

        margin: 0 0 20px !important;
        padding: 0 !important;

        color: #17201e !important;

        background: #ffffff !important;

        font-size: 24px !important;
        font-weight: 800 !important;

        line-height: 1.3 !important;

        text-align: left !important;

        z-index: 20 !important;

        opacity: 1 !important;
        visibility: visible !important;
      }

      #hallet-root .hf-options {
        position: relative !important;

        display: block !important;

        width: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        z-index: 30 !important;
      }

      /* =====================================================
         SEÇENEK BUTONLARI
         ===================================================== */

      #hallet-root .hf-choice {
        position: relative !important;

        display: block !important;
        clear: both !important;

        width: 100% !important;
        min-height: 56px !important;

        margin: 8px 0 !important;
        padding: 15px 16px !important;

        border: 1px solid #d8e2df !important;
        border-radius: 13px !important;

        background: #ffffff !important;
        color: #173f3a !important;

        font-size: 15px !important;
        font-weight: 700 !important;

        line-height: 1.35 !important;

        text-align: left !important;

        cursor: pointer !important;

        box-shadow: none !important;

        white-space: normal !important;

        overflow: visible !important;

        z-index: 40 !important;

        opacity: 1 !important;
        visibility: visible !important;
      }

      #hallet-root .hf-choice:hover {
        background: #f4f9f7 !important;
        border-color: #0E5C53 !important;
      }

      #hallet-root .hf-choice:active {
        transform: translateY(1px) !important;
      }

      #hallet-root .hf-choice:focus {
        outline: 3px solid rgba(14,92,83,.18) !important;
        outline-offset: 1px !important;
      }

      /* =====================================================
         INPUT
         ===================================================== */

      #hallet-root .hf-input {
        display: block !important;

        width: 100% !important;
        min-height: 54px !important;

        margin: 10px 0 12px !important;
        padding: 14px !important;

        background: #ffffff !important;
        color: #17201e !important;

        border: 1px solid #d8e2df !important;
        border-radius: 12px !important;

        font-size: 16px !important;
        line-height: 1.3 !important;

        outline: none !important;
      }

      #hallet-root .hf-input:focus {
        border-color: #0E5C53 !important;

        box-shadow:
          0 0 0 3px rgba(14,92,83,.12) !important;
      }

      /* =====================================================
         İLERLEME ÇUBUĞU
         ===================================================== */

      #hallet-root .hf-progress {
        position: relative !important;

        display: block !important;

        width: 100% !important;
        height: 8px !important;

        margin: 8px 0 22px !important;

        background: #e8eeeb !important;

        border-radius: 999px !important;

        overflow: hidden !important;

        z-index: 15 !important;
      }

      #hallet-root .hf-progress div {
        display: block !important;

        height: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        background: #0E5C53 !important;

        border-radius: 999px !important;
      }

      /* =====================================================
         GERİ
         ===================================================== */

      #hallet-root .hf-back {
        position: relative !important;

        display: inline-block !important;

        margin: 0 0 12px !important;
        padding: 7px 0 !important;

        border: 0 !important;

        background: transparent !important;
        color: #5b6966 !important;

        font-size: 14px !important;
        font-weight: 700 !important;

        cursor: pointer !important;

        z-index: 50 !important;
      }

      /* =====================================================
         SONUÇ İÇERİĞİ
         ===================================================== */

      #hallet-root .hf-item {
        display: flex !important;

        align-items: flex-start !important;

        gap: 10px !important;

        width: 100% !important;

        padding: 11px 0 !important;

        border-bottom: 1px solid #edf0ef !important;
      }

      #hallet-root .hf-item:last-child {
        border-bottom: 0 !important;
      }

      #hallet-root .hf-icon {
        display: flex !important;

        align-items: center !important;
        justify-content: center !important;

        flex: 0 0 27px !important;

        width: 27px !important;
        height: 27px !important;

        border-radius: 50% !important;

        font-size: 13px !important;
        font-weight: 800 !important;
      }

      #hallet-root .hf-ok {
        background: #e7f4ed !important;
        color: #176947 !important;
      }

      #hallet-root .hf-warn {
        background: #fff1d7 !important;
        color: #875d12 !important;
      }

      #hallet-root .hf-info {
        background: #e9f1f7 !important;
        color: #245a78 !important;
      }

      #hallet-root .hf-danger {
        background: #fde9e7 !important;
        color: #9b3028 !important;
      }

      #hallet-root .hf-text {
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      #hallet-root .hf-text strong {
        display: block !important;

        margin: 0 0 3px !important;

        color: #17201e !important;

        font-size: 14px !important;
        font-weight: 800 !important;
      }

      #hallet-root .hf-text span {
        display: block !important;

        margin: 0 !important;

        color: #606c69 !important;

        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      /* =====================================================
         UYARI / AÇIKLAMA
         ===================================================== */

      #hallet-root .hf-disclaimer {
        display: block !important;

        width: 100% !important;

        margin: 10px 0 0 !important;
        padding: 12px !important;

        background: #f5f7f6 !important;
        color: #65716e !important;

        border-radius: 11px !important;

        font-size: 12px !important;
        line-height: 1.55 !important;
      }

      #hallet-root .hf-disclaimer b {
        font-weight: 800 !important;
      }

      /* =====================================================
         AKSİYON BUTONLARI
         ===================================================== */

      #hallet-root .hf-actions {
        display: flex !important;

        flex-wrap: wrap !important;

        gap: 8px !important;

        width: 100% !important;

        margin: 15px 0 0 !important;
      }

      #hallet-root .hf-btn {
        display: inline-block !important;

        border: 0 !important;
        border-radius: 11px !important;

        padding: 12px 15px !important;

        font-size: 14px !important;
        font-weight: 700 !important;

        cursor: pointer !important;
      }

      #hallet-root .hf-primary {
        background: #0E5C53 !important;
        color: #ffffff !important;
      }

      #hallet-root .hf-secondary {
        background: #edf2f0 !important;
        color: #17413c !important;
      }

      /* =====================================================
         MOBİL
         ===================================================== */

      @media (max-width: 560px) {

        #hallet-root .hf-app {
          padding: 14px 12px 35px !important;
        }

        #hallet-root .hf-card {
          padding: 17px !important;
          border-radius: 14px !important;
        }

        #hallet-root .hf-question-card {
          padding: 18px !important;
          border-radius: 15px !important;
        }

        #hallet-root .hf-question-title {
          font-size: 21px !important;
          line-height: 1.32 !important;
          margin-bottom: 18px !important;
        }

        #hallet-root .hf-choice {
          min-height: 54px !important;

          margin: 7px 0 !important;
          padding: 14px !important;

          font-size: 15px !important;
        }

        #hallet-root .hf-grid {
          grid-template-columns: 1fr !important;
        }

        #hallet-root .hf-title {
          font-size: 22px !important;
        }

        #hallet-root .hf-main-title {
          font-size: 25px !important;
        }

        #hallet-root .hf-actions {
          flex-direction: column !important;
        }

        #hallet-root .hf-btn {
          width: 100% !important;
        }
      }
    `;

    document.head.appendChild(s);
  }

  /* =========================================================
     RENDER
     ========================================================= */

  function render(html) {
    styles();

    const el = openRoot();

    /*
     * Burada çok önemli bir nokta:
     * Eski root'un içeriğini tamamen temizliyoruz.
     */
    el.innerHTML = `
      <div class="hf-app">
        ${html}
      </div>
    `;
  }

  /* =========================================================
     ANA GİRİŞ
     ========================================================= */

  function showGate() {
    render(`
      <div class="hf-wrap">

        <div class="hf-card">

          <div
            style="
              margin:0 0 6px;
              color:#0E5C53;
              font-size:12px;
              font-weight:800;
              letter-spacing:.12em;
              text-align:center;
            "
          >
            İŞİNİ HALLET
          </div>

          <div class="hf-main-title">
            Ne yapmak istiyorsun?
          </div>

          <div class="hf-main-subtitle">
            İşlemini seç, gerekli adımları birlikte çıkaralım.
          </div>

          <div class="hf-options">

            <button
              class="hf-choice"
              onclick="Hallet.showIslemMenu()"
            >
              📋 Bir işlem yapmak istiyorum
            </button>

            <button
              class="hf-choice"
              onclick="Hallet.showMessage('Evrak hazırlama modülü sonraki aşamada açılacak.')"
            >
              📄 Evrak hazırlamak istiyorum
            </button>

            <button
              class="hf-choice"
              onclick="Hallet.showMessage('Kurum başvuru modülü sonraki aşamada açılacak.')"
            >
              🏛️ Bir kuruma başvuracağım
            </button>

            <button
              class="hf-choice"
              onclick="Hallet.goIsimiCoz()"
            >
              🛠️ Hizmet / usta bulmam gerekiyor
            </button>

          </div>

        </div>

      </div>
    `);
  }

  /* =========================================================
     İŞLEM MENÜSÜ
     ========================================================= */

  function showIslemMenu() {
    render(`
      <div class="hf-wrap">

        <button
          class="hf-back"
          onclick="Hallet.showGate()"
        >
          ← Geri
        </button>

        <div class="hf-card">

          <h2>
            Hangi işlemi yapmak istiyorsun?
          </h2>

          <div class="hf-options">

            <button
              class="hf-choice"
              onclick="Hallet.showTasinmazMenu()"
            >
              🏠 Taşınmaz işlemleri
            </button>

            <button
              class="hf-choice"
              onclick="Hallet.showMessage('Diğer işlem türleri sonraki aşamada eklenecek.')"
            >
              📑 Diğer işlemler
            </button>

          </div>

        </div>

      </div>
    `);
  }

  /* =========================================================
     TAŞINMAZ MENÜSÜ
     ========================================================= */

  function showTasinmazMenu() {
    render(`
      <div class="hf-wrap">

        <button
          class="hf-back"
          onclick="Hallet.showIslemMenu()"
        >
          ← Geri
        </button>

        <div class="hf-card">

          <h2>
            Taşınmaz işlemi
          </h2>

          <div class="hf-options">

            <button
              class="hf-choice"
              onclick="Hallet.showKonutSatis()"
            >
              🏠 Konut / taşınmaz satışı
            </button>

            <button
              class="hf-choice"
              onclick="Hallet.showMessage('Taşınmaz satın alma akışı sonraki aşamada eklenecek.')"
            >
              🏡 Taşınmaz satın alma
            </button>

          </div>

        </div>

      </div>
    `);
  }

  /* =========================================================
     KONUT SATIŞI
     ========================================================= */

  function showKonutSatis() {
    state.step = 0;
    state.answers = {};
    state.caseId = createCaseId();
    state.createdAt = new Date();

    showQuestion();
  }

  /* =========================================================
     SORU EKRANI
     ========================================================= */

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
      input = `
        <div class="hf-options">
          ${q.options.map(([value, label]) => `
            <button
              type="button"
              class="hf-choice"
              onclick="Hallet.choose('${esc(value)}')"
            >
              ${esc(label)}
            </button>
          `).join("")}
        </div>
      `;
    }

    if (q.type === "date") {
      input = `
        <div class="hf-options">

          <input
            id="hf-input"
            class="hf-input"
            type="date"
            value="${esc(state.answers[q.key] || "")}"
          >

          <button
            type="button"
            class="hf-choice"
            onclick="Hallet.submitInput()"
          >
            Devam et →
          </button>

        </div>
      `;
    }

    if (q.type === "number") {
      input = `
        <div class="hf-options">

          <input
            id="hf-input"
            class="hf-input"
            type="number"
            min="0"
            step="1"
            inputmode="decimal"
            placeholder="${esc(q.placeholder)}"
            value="${esc(state.answers[q.key] || "")}"
          >

          <button
            type="button"
            class="hf-choice"
            onclick="Hallet.submitInput()"
          >
            Devam et →
          </button>

        </div>
      `;
    }

    render(`
      <div class="hf-wrap">

        <button
          type="button"
          class="hf-back"
          onclick="Hallet.back()"
        >
          ← Geri
        </button>

        <div class="hf-question-card">

          <div class="hf-step">
            Adım ${state.step + 1} / ${questions.length}
          </div>

          <div class="hf-progress">
            <div style="width:${percent}%"></div>
          </div>

          <h2 class="hf-question-title">
            ${esc(q.title)}
          </h2>

          ${input}

        </div>

      </div>
    `);

    /*
     * Input varsa otomatik odak.
     */
    if (q.type === "date" || q.type === "number") {
      setTimeout(() => {
        const inputEl = document.getElementById("hf-input");

        if (inputEl) {
          inputEl.focus();
        }
      }, 50);
    }
  }

  /* =========================================================
     CEVAP
     ========================================================= */

  function choose(value) {
    const q = questions[state.step];

    if (!q) {
      return;
    }

    state.answers[q.key] = value;

    state.step++;

    showQuestion();
  }

  /* =========================================================
     INPUT CEVABI
     ========================================================= */

  function submitInput() {
    const q = questions[state.step];

    if (!q) {
      return;
    }

    const input = document.getElementById("hf-input");

    if (!input || !input.value) {
      if (input) {
        input.focus();
      }

      return;
    }

    if (
      q.type === "number" &&
      (
        !Number.isFinite(Number(input.value)) ||
        Number(input.value) < 0
      )
    ) {
      input.focus();
      return;
    }

    state.answers[q.key] = input.value;

    state.step++;

    showQuestion();
  }

  /* =========================================================
     GERİ
     ========================================================= */

  function back() {
    if (state.step <= 0) {
      showTasinmazMenu();
      return;
    }

    state.step--;

    showQuestion();
  }

  /* =========================================================
     5 YIL KONTROLÜ
     ========================================================= */

  function withinFiveYears(value) {
    if (!value) {
      return null;
    }

    const acquired = new Date(`${value}T12:00:00`);

    if (Number.isNaN(acquired.getTime())) {
      return null;
    }

    const limit = new Date(acquired);

    limit.setFullYear(
      limit.getFullYear() + 5
    );

    return new Date() < limit;
  }

  /* =========================================================
     VERGİ DEĞERLENDİRMESİ
     ========================================================= */

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

    const fiveYears = withinFiveYears(
      a.acquisition_date
    );

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

  /* =========================================================
     SONUÇ SATIRI
     ========================================================= */

  function item(icon, cls, title, text) {
    return `
      <div class="hf-item">

        <div class="hf-icon ${cls}">
          ${esc(icon)}
        </div>

        <div class="hf-text">
          <strong>${esc(title)}</strong>
          <span>${esc(text)}</span>
        </div>

      </div>
    `;
  }

  /* =========================================================
     İŞLEM DOSYASI
     ========================================================= */

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
      answerLabel(
        "acquisition_type",
        a.acquisition_type
      )
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
            Oluşturulma:
            ${esc(
              state.createdAt
                ? new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short"
                  }).format(state.createdAt)
                : "Belirtilmedi"
            )}
          </div>

          <div class="hf-grid">

            <div class="hf-stat">
              <div class="hf-stat-label">
                SATICI
              </div>

              <div class="hf-stat-value">
                ${esc(
                  answerLabel(
                    "seller_type",
                    a.seller_type
                  )
                )}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">
                TAŞINMAZ
              </div>

              <div class="hf-stat-value">
                ${esc(
                  answerLabel(
                    "property_location",
                    a.property_location
                  )
                )}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">
                EDİNİM
              </div>

              <div class="hf-stat-value">
                ${esc(
                  answerLabel(
                    "acquisition_type",
                    a.acquisition_type
                  )
                )}
              </div>
            </div>

            <div class="hf-stat">
              <div class="hf-stat-label">
                SATIŞ BEDELİ
              </div>

              <div class="hf-stat-value">
                ${esc(money(a.sale_price))}
              </div>
            </div>

          </div>

        </div>

        <div class="hf-card">

          <h3>
            ✓ Tamamlananlar
          </h3>

          ${
            completed.length
              ? completed.map(x =>
                  item(
                    x[0],
                    "hf-ok",
                    x[1],
                    x[2]
                  )
                ).join("")
              : item(
                  "i",
                  "hf-info",
                  "Henüz yok",
                  "Kontroller tamamlanmadı."
                )
          }

        </div>

        <div class="hf-card">

          <h3>
            ⚠ Kontrol Edilmesi Gerekenler
          </h3>

          ${
            warnings.length
              ? warnings.map(x =>
                  item(
                    x[0],
                    "hf-warn",
                    x[1],
                    x[2]
                  )
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

          <h3>
            ₺ Vergi Kontrolü
          </h3>

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
            2026 yılında değer artış kazancı istisna tutarı
            150.000 TL'dir. Ancak vergi sonucu yalnızca satış
            bedeline bakılarak belirlenmez; edinim tarihi, edinim
            bedeli, satış bedeli, giderler ve gerekli endeksleme
            gibi unsurlar dikkate alınır. Bu ekran kesin vergi
            hesabı yapmaz.
          </div>

        </div>

        <div class="hf-card">

          <h3>
            → Sonraki Adımlar
          </h3>

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

          <h3>
            📌 Dosya Özeti
          </h3>

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
            answerLabel(
              "acquisition_type",
              a.acquisition_type
            )
          )}

          ${item(
            "•",
            "hf-info",
            "Alıcı durumu",
            answerLabel(
              "buyer_ready",
              a.buyer_ready
            )
          )}

          ${item(
            "•",
            "hf-info",
            "Bina durumu",
            answerLabel(
              "building",
              a.building
            )
          )}

        </div>

        <div class="hf-disclaimer">

          <b>Önemli:</b>
          Bu İşlem Dosyası, verdiğin cevaplara göre hazırlanmış
          bir ön değerlendirmedir. Kesin belge, harç, vergi ve
          işlem sonucu güncel TKGM, GİB ve ilgili kurum kayıtları
          üzerinden doğrulanmalıdır.

        </div>

        <div class="hf-actions">

          <button
            type="button"
            class="hf-btn hf-primary"
            onclick="Hallet.showMessage('İşlem Dosyası kayıt altyapısı bir sonraki aşamada Supabase\\'e bağlanacak.')"
          >
            💾 Dosyayı Kaydet
          </button>

          <button
            type="button"
            class="hf-btn hf-secondary"
            onclick="Hallet.showKonutSatis()"
          >
            ↺ Cevapları Düzenle
          </button>

          <button
            type="button"
            class="hf-btn hf-secondary"
            onclick="Hallet.showGate()"
          >
            Ana Menü
          </button>

        </div>

      </div>
    `);
  }

  /* =========================================================
     MESAJ
     ========================================================= */

  function showMessage(message) {
    render(`
      <div class="hf-wrap">

        <div
          class="hf-card"
          style="
            text-align:center;
            padding:35px 20px !important;
          "
        >

          <div
            style="
              font-size:40px;
              line-height:1;
              margin-bottom:15px;
            "
          >
            ✓
          </div>

          <h2
            style="
              text-align:center !important;
              font-size:20px !important;
            "
          >
            ${esc(message)}
          </h2>

          <div class="hf-options">

            <button
              type="button"
              class="hf-choice"
              onclick="Hallet.showGate()"
            >
              Ana menüye dön
            </button>

          </div>

        </div>

      </div>
    `);
  }

  /* =========================================================
     İŞİMİ ÇÖZ'E GERİ DÖNÜŞ
     ========================================================= */

  function goIsimiCoz() {
    closeRoot();

    /*
     * Önce mevcut uygulamanın ana ekran fonksiyonlarını
     * kullanıyoruz.
     */

    if (typeof window.showHome === "function") {
      window.showHome();
      return;
    }

    if (typeof window.renderCategories === "function") {
      window.renderCategories();
      return;
    }

    /*
     * Hiçbiri yoksa kullanıcıya bilgi göster.
     */
    openRoot();

    showMessage(
      "İşimi Çöz modülü mevcut uygulamanın ana ekranından açılabilir."
    );
  }

  /* =========================================================
     DIŞ API
     ========================================================= */

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
