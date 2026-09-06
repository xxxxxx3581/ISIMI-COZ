(function () {
  "use strict";

  let state = {
    step: 0,
    answers: {}
  };

  const questions = [
    {
      id: "seller_type",
      title: "Satıcı kim?",
      desc: "Satış işlemini hangi kişi veya yapı adına yapıyorsunuz?",
      type: "choice",
      options: [
        { value: "real_person", label: "Gerçek kişi", icon: "👤" },
        { value: "company", label: "Şirket / tüzel kişi", icon: "🏢" }
      ]
    },

    {
      id: "property_location",
      title: "Taşınmaz nerede?",
      desc: "Satışa konu taşınmaz Türkiye'de mi?",
      type: "choice",
      options: [
        { value: "turkey", label: "Türkiye'de", icon: "🇹🇷" },
        { value: "foreign", label: "Türkiye dışında", icon: "🌍" }
      ]
    },

    {
      id: "title_deed",
      title: "Tapu mevcut mu?",
      desc: "Satışa konu taşınmaz için tapu kaydı bulunuyor mu?",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "📄" },
        { value: "no", label: "Hayır / Emin değilim", icon: "❓" }
      ]
    },

    {
      id: "multiple_owners",
      title: "Birden fazla malik var mı?",
      desc: "Taşınmaz tapuda birden fazla kişinin adına kayıtlı mı?",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "👥" },
        { value: "no", label: "Hayır", icon: "👤" },
        { value: "unknown", label: "Bilmiyorum", icon: "❓" }
      ]
    },

    {
      id: "encumbrance",
      title: "Tapuda kısıtlayıcı bir kayıt var mı?",
      desc: "İpotek, haciz, şerh, beyan veya benzeri bir kayıt biliyor musunuz?",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "⚠️" },
        { value: "no", label: "Hayır", icon: "✓" },
        { value: "unknown", label: "Bilmiyorum", icon: "❓" }
      ]
    },

    {
      id: "representation",
      title: "Vekâlet veya temsil var mı?",
      desc: "Satış işlemini siz yerine başka biri mi yürütecek?",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "📝" },
        { value: "no", label: "Hayır", icon: "👤" }
      ]
    },

    {
      id: "acquisition_date",
      title: "Taşınmazı ne zaman edindiniz?",
      desc: "Bu bilgi, satış sonrası vergi durumunun değerlendirilmesinde kullanılacaktır.",
      type: "date"
    },

    {
      id: "acquisition_type",
      title: "Taşınmazı nasıl edindiniz?",
      desc: "Edinim şekli değer artış kazancı değerlendirmesinde önem taşıyabilir.",
      type: "choice",
      options: [
        { value: "purchase", label: "Satın alarak", icon: "🏠" },
        { value: "inheritance", label: "Miras yoluyla", icon: "📜" },
        { value: "gift", label: "Bağış / bedelsiz", icon: "🎁" },
        { value: "other", label: "Diğer", icon: "❓" }
      ]
    },

    {
      id: "buyer_ready",
      title: "Alıcı belli mi?",
      desc: "Satış yapacağınız alıcı şu anda belli mi?",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "🤝" },
        { value: "no", label: "Hayır", icon: "🔎" }
      ]
    },

    {
      id: "sale_price",
      title: "Satış bedeli belli mi?",
      desc: "Satış için üzerinde anlaşılan bir bedel var mı?",
      type: "number",
      placeholder: "TL olarak girin"
    },

    {
      id: "building",
      title: "Taşınmaz üzerinde bina/konut var mı?",
      desc: "Konut satışında bina niteliği ve sigorta gibi konular önem taşıyabilir.",
      type: "choice",
      options: [
        { value: "yes", label: "Evet", icon: "🏠" },
        { value: "no", label: "Hayır", icon: "🌳" }
      ]
    }
  ];

  function getRoot() {
    return document.querySelector("main") ||
           document.querySelector(".container") ||
           document.body;
  }

  function paint(html) {
    const root = getRoot();

    const old = document.getElementById("hallet-screen");

    if (old) {
      old.innerHTML = html;
    } else {
      const screen = document.createElement("div");
      screen.id = "hallet-screen";
      screen.innerHTML = html;
      root.prepend(screen);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backButton() {
    return `
      <button id="hallet-back"
        style="
          border:0;
          background:transparent;
          color:#aaa;
          padding:8px 0;
          font-size:14px;
          cursor:pointer;
        ">
        ← Geri
      </button>
    `;
  }

  function showGate() {
    paint(`
      <div class="hallet-gate">
        <div class="hallet-gate-badge">İŞİNİ HALLET</div>

        <h1 class="hallet-gate-title">
          Ne yapmak istiyorsun?
        </h1>

        <p class="hallet-gate-sub">
          İşlemini seç, gerekli adımları birlikte tamamlayalım.
        </p>

        <div class="hallet-gate-list">

          <button class="hallet-gate-card" id="hallet-process">
            <span class="hallet-gate-card-icon">📋</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Bir işlem yapmak istiyorum
              </strong>
              <small class="hallet-gate-card-desc">
                Tapu, araç ve diğer işlemler
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card" id="hallet-document">
            <span class="hallet-gate-card-icon">📄</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Evrak hazırlamak istiyorum
              </strong>
              <small class="hallet-gate-card-desc">
                Dilekçe, başvuru ve belgeler
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card" id="hallet-application">
            <span class="hallet-gate-card-icon">🏛️</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Bir kuruma başvuracağım
              </strong>
              <small class="hallet-gate-card-desc">
                Kurum işlemlerini adım adım tamamla
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card" id="hallet-isimi-coz">
            <span class="hallet-gate-card-icon">🛠️</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Hizmet / usta bulmam gerekiyor
              </strong>
              <small class="hallet-gate-card-desc">
                İşimi Çöz ile hizmet bul
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>
      </div>
    `);

    document
      .getElementById("hallet-process")
      ?.addEventListener("click", showIslemMenu);

    document
      .getElementById("hallet-isimi-coz")
      ?.addEventListener("click", goIsimiCoz);

    document
      .getElementById("hallet-document")
      ?.addEventListener("click", function () {
        showMessage("Evrak hazırlama modülü sıradaki aşamada açılacak.");
      });

    document
      .getElementById("hallet-application")
      ?.addEventListener("click", function () {
        showMessage("Kurum başvuru modülü sıradaki aşamada açılacak.");
      });
  }

  function showIslemMenu() {
    paint(`
      <div class="hallet-gate">
        ${backButton()}

        <div class="hallet-gate-badge">İŞLEM SEÇ</div>

        <h1 class="hallet-gate-title">
          Hangi işlemi yapmak istiyorsun?
        </h1>

        <div class="hallet-gate-list">

          <button class="hallet-gate-card" id="tasinmaz">
            <span class="hallet-gate-card-icon">🏠</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Taşınmaz / Ev işlemleri
              </strong>
              <small class="hallet-gate-card-desc">
                Ev, arsa ve diğer taşınmaz işlemleri
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card" id="arac">
            <span class="hallet-gate-card-icon">🚗</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Araç işlemleri
              </strong>
              <small class="hallet-gate-card-desc">
                Araç satış ve diğer işlemler
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>
      </div>
    `);

    document
      .getElementById("hallet-back")
      ?.addEventListener("click", showGate);

    document
      .getElementById("tasinmaz")
      ?.addEventListener("click", showTasinmazMenu);

    document
      .getElementById("arac")
      ?.addEventListener("click", function () {
        showMessage("Araç işlemleri sıradaki işlem ailesi olarak hazırlanacak.");
      });
  }

  function showTasinmazMenu() {
    paint(`
      <div class="hallet-gate">
        ${backButton()}

        <div class="hallet-gate-badge">TAŞINMAZ</div>

        <h1 class="hallet-gate-title">
          Taşınmazla ne yapmak istiyorsun?
        </h1>

        <div class="hallet-gate-list">

          <button class="hallet-gate-card" id="konut-satis">
            <span class="hallet-gate-card-icon">🏠</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Konut satışı
              </strong>
              <small class="hallet-gate-card-desc">
                Ev satış işlemini adım adım hazırla
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card">
            <span class="hallet-gate-card-icon">🛒</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Konut alımı
              </strong>
              <small class="hallet-gate-card-desc">
                Yakında
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

          <button class="hallet-gate-card">
            <span class="hallet-gate-card-icon">📑</span>
            <span class="hallet-gate-card-body">
              <strong class="hallet-gate-card-title">
                Diğer taşınmaz işlemleri
              </strong>
              <small class="hallet-gate-card-desc">
                Yakında
              </small>
            </span>
            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>
      </div>
    `);

    document
      .getElementById("hallet-back")
      ?.addEventListener("click", showIslemMenu);

    document
      .getElementById("konut-satis")
      ?.addEventListener("click", showKonutSatis);
  }

  function showKonutSatis() {
    state = {
      step: 0,
      answers: {}
    };

    showQuestion();
  }

  function showQuestion() {
    const q = questions[state.step];

    if (!q) {
      showResult();
      return;
    }

    const total = questions.length;
    const current = state.step + 1;
    const percent = Math.round((state.step / total) * 100);

    let control = "";

    if (q.type === "choice") {
      control = `
        <div style="display:grid;gap:12px;margin-top:22px;">
          ${q.options.map(function (option) {
            return `
              <button
                class="hallet-gate-card hallet-answer"
                data-value="${option.value}"
                style="width:100%;text-align:left;"
              >
                <span class="hallet-gate-card-icon">
                  ${option.icon}
                </span>

                <span class="hallet-gate-card-body">
                  <strong class="hallet-gate-card-title">
                    ${option.label}
                  </strong>
                </span>

                <span class="hallet-gate-card-arrow">›</span>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }

    if (q.type === "date") {
      control = `
        <input
          id="hallet-input"
          type="date"
          style="
            width:100%;
            box-sizing:border-box;
            padding:15px;
            border-radius:12px;
            border:1px solid #444;
            background:#171717;
            color:#fff;
            font-size:16px;
            margin-top:22px;
          "
        >

        <button
          id="hallet-next"
          style="
            width:100%;
            margin-top:14px;
            padding:15px;
            border:0;
            border-radius:12px;
            background:#0e5c53;
            color:#fff;
            font-size:16px;
            font-weight:700;
          "
        >
          Devam et →
        </button>
      `;
    }

    if (q.type === "number") {
      control = `
        <input
          id="hallet-input"
          type="number"
          min="0"
          inputmode="decimal"
          placeholder="${q.placeholder || ""}"
          style="
            width:100%;
            box-sizing:border-box;
            padding:15px;
            border-radius:12px;
            border:1px solid #444;
            background:#171717;
            color:#fff;
            font-size:16px;
            margin-top:22px;
          "
        >

        <button
          id="hallet-next"
          style="
            width:100%;
            margin-top:14px;
            padding:15px;
            border:0;
            border-radius:12px;
            background:#0e5c53;
            color:#fff;
            font-size:16px;
            font-weight:700;
          "
        >
          Devam et →
        </button>
      `;
    }

    paint(`
      <div class="hallet-gate">

        ${backButton()}

        <div style="margin-top:12px;color:#999;font-size:13px;">
          KONUT SATIŞI · ${current}/${total}
        </div>

        <div
          style="
            height:5px;
            background:#292929;
            border-radius:10px;
            overflow:hidden;
            margin:10px 0 25px;
          "
        >
          <div
            style="
              width:${percent}%;
              height:100%;
              background:#0e5c53;
            "
          ></div>
        </div>

        <h1 class="hallet-gate-title">
          ${q.title}
        </h1>

        <p class="hallet-gate-sub">
          ${q.desc}
        </p>

        ${control}

      </div>
    `);

    document
      .getElementById("hallet-back")
      ?.addEventListener("click", function () {
        if (state.step > 0) {
          state.step--;
          showQuestion();
        } else {
          showTasinmazMenu();
        }
      });

    document.querySelectorAll(".hallet-answer").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers[q.id] = button.dataset.value;
        state.step++;
        showQuestion();
      });
    });

    document
      .getElementById("hallet-next")
      ?.addEventListener("click", function () {
        const input = document.getElementById("hallet-input");

        if (!input || !input.value) {
          alert("Lütfen bir değer girin.");
          return;
        }

        state.answers[q.id] = input.value;
        state.step++;
        showQuestion();
      });
  }

  function showResult() {
    const a = state.answers;

    const warnings = [];

    if (a.encumbrance === "yes") {
      warnings.push(
        "Taşınmaz üzerinde ipotek, haciz veya başka bir kayıt bulunduğunu belirttiniz. Satıştan önce kaydın niteliği ve satışa etkisi kontrol edilmelidir."
      );
    }

    if (a.encumbrance === "unknown") {
      warnings.push(
        "Tapu kaydındaki şerh, beyan ve ipoteklerin kontrol edilmesi gerekiyor."
      );
    }

    if (a.multiple_owners === "yes") {
      warnings.push(
        "Birden fazla malik bulunduğu için tüm maliklerin ve temsil durumlarının ayrıca değerlendirilmesi gerekiyor."
      );
    }

    if (a.representation === "yes") {
      warnings.push(
        "Temsil/vekalet bulunduğu için temsil belgesinin işlem açısından uygunluğu kontrol edilmelidir."
      );
    }

    if (a.property_location === "foreign") {
      warnings.push(
        "Taşınmaz Türkiye dışında olduğundan bu konut satış akışı uygun olmayabilir."
      );
    }

    if (a.acquisition_type === "inheritance" ||
        a.acquisition_type === "gift") {
      warnings.push(
        "Taşınmazın bedelsiz/miras yoluyla edinildiğini belirttiniz. Değer artış kazancı değerlendirmesi farklı olabilir."
      );
    }

    const basicDocs = [
      "Satıcı kimlik belgesi",
      "Alıcı kimlik belgesi",
      "Varsa temsil / vekâlet belgesi"
    ];

    if (a.building === "yes") {
      basicDocs.push("Konut için gerekli sigorta durumunun kontrolü");
    }

    if (a.title_deed === "yes") {
      basicDocs.push("Varsa tapu senedi / taşınmaz bilgilerinin hazırlanması");
    }

    paint(`
      <div class="hallet-gate">

        <div class="hallet-gate-badge">
          İŞLEM DOSYASI
        </div>

        <h1 class="hallet-gate-title">
          İlk değerlendirme tamamlandı
        </h1>

        <p class="hallet-gate-sub">
          Verdiğiniz cevaplara göre konut satış dosyanızın ilk kontrolünü oluşturduk.
        </p>

        <div style="
          margin-top:24px;
          padding:18px;
          border-radius:14px;
          background:#171717;
          border:1px solid #333;
        ">
          <h3 style="margin:0 0 14px;color:#fff;">
            📄 Temel belgeler
          </h3>

          ${basicDocs.map(function (doc) {
            return `
              <div style="
                padding:10px 0;
                border-bottom:1px solid #292929;
                color:#ddd;
              ">
                ✓ ${doc}
              </div>
            `;
          }).join("")}
        </div>

        ${
          warnings.length
            ? `
              <div style="
                margin-top:16px;
                padding:18px;
                border-radius:14px;
                background:#241d12;
                border:1px solid #6b5123;
              ">
                <h3 style="margin:0 0 12px;color:#e2b96b;">
                  ⚠️ Dikkat edilmesi gerekenler
                </h3>

                ${warnings.map(function (warning) {
                  return `
                    <div style="
                      padding:10px 0;
                      color:#ddd;
                      line-height:1.5;
                    ">
                      • ${warning}
                    </div>
                  `;
                }).join("")}
              </div>
            `
            : `
              <div style="
                margin-top:16px;
                padding:18px;
                border-radius:14px;
                background:#10201d;
                border:1px solid #24574f;
                color:#d8eee9;
              ">
                ✓ İlk cevaplarınızda özel bir uyarı tespit edilmedi.
              </div>
            `
        }

        <div style="
          margin-top:18px;
          padding:14px;
          color:#999;
          font-size:12px;
          line-height:1.5;
        ">
          Bu ekran ön değerlendirmedir. Kesin belge, harç ve vergi sonucu
          işlem sırasında güncel resmî kaynaklar üzerinden doğrulanacaktır.
        </div>

        <button
          id="hallet-restart"
          style="
            width:100%;
            margin-top:10px;
            padding:15px;
            border:0;
            border-radius:12px;
            background:#0e5c53;
            color:#fff;
            font-size:16px;
            font-weight:700;
          "
        >
          İşlem Dosyasını Yeniden Başlat
        </button>

        <button
          id="hallet-home"
          style="
            width:100%;
            margin-top:10px;
            padding:13px;
            border:1px solid #444;
            border-radius:12px;
            background:transparent;
            color:#ddd;
            font-size:15px;
          "
        >
          İşini Hallet Ana Sayfası
        </button>

      </div>
    `);

    document
      .getElementById("hallet-restart")
      ?.addEventListener("click", showKonutSatis);

    document
      .getElementById("hallet-home")
      ?.addEventListener("click", showGate);
  }

  function showMessage(message) {
    paint(`
      <div class="hallet-gate">
        <div class="hallet-gate-badge">İŞİNİ HALLET</div>

        <h1 class="hallet-gate-title">
          Yakında
        </h1>

        <p class="hallet-gate-sub">
          ${message}
        </p>

        <button
          id="hallet-message-back"
          style="
            width:100%;
            margin-top:20px;
            padding:15px;
            border:0;
            border-radius:12px;
            background:#0e5c53;
            color:#fff;
            font-size:16px;
            font-weight:700;
          "
        >
          ← Geri
        </button>
      </div>
    `);

    document
      .getElementById("hallet-message-back")
      ?.addEventListener("click", showGate);
  }

  function goIsimiCoz() {
    const selectors = [
      "#homeScreen",
      "#home",
      ".home-screen",
      "[data-screen='home']"
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);

      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    if (typeof window.showHome === "function") {
      window.showHome();
    }
  }

  window.Hallet = {
    showGate,
    showIslemMenu,
    showTasinmazMenu,
    showKonutSatis,
    goIsimiCoz
  };

})();
