/* =========================================================
   İŞİNİ HALLET — Ana Giriş ve İşlem Menüsü
   Mevcut İŞİMİ ÇÖZ sistemine dokunmaz.
   ========================================================= */

(function () {
  "use strict";

  function paint(html) {
    if (typeof window.app === "function") {
      window.app(html);
      return;
    }

    var el = document.getElementById("app");

    if (!el) {
      console.warn("[Hallet] #app bulunamadı");
      return;
    }

    el.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function showMessage(message) {
    var box = document.getElementById("halletMessage");

    if (!box) return;

    box.hidden = false;
    box.textContent = message;
  }

  function goIsimiCoz() {
    if (typeof window.showHome === "function") {
      window.showHome();
      return;
    }

    console.warn("[Hallet] showHome() bulunamadı");
  }

  function showGate() {
    paint(`
      <section class="hallet-gate" aria-label="İşini Hallet giriş">

        <span class="hallet-gate-badge">
          İŞİNİ HALLET
        </span>

        <h1 class="hallet-gate-title">
          Ne yapmak istiyorsun?
        </h1>

        <p class="hallet-gate-sub">
          İşlem, evrak ve kurum adımları için asistan; usta ve hizmet için İşimi Çöz.
        </p>

        <div class="hallet-gate-list">

          <button
            type="button"
            class="hallet-gate-card"
            id="halletIslemBtn"
          >
            <span class="hallet-gate-card-icon">📋</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Bir işlem yapmak istiyorum
              </span>

              <span class="hallet-gate-card-desc">
                Tapu, araç, vergi ve resmi işlem rehberi
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletEvrakBtn"
          >
            <span class="hallet-gate-card-icon">📄</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Evrak hazırlamak istiyorum
              </span>

              <span class="hallet-gate-card-desc">
                Gerekli belgeleri belirle ve evrak taslağı oluştur
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletKurumBtn"
          >
            <span class="hallet-gate-card-icon">🏛️</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Bir kuruma başvuracağım
              </span>

              <span class="hallet-gate-card-desc">
                Hangi kuruma, hangi belgelerle ve hangi adımlarla?
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletHizmetBtn"
          >
            <span class="hallet-gate-card-icon">🛠️</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Hizmet / usta bulmam gerekiyor
              </span>

              <span class="hallet-gate-card-desc">
                Mevcut İşimi Çöz platformuna git
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>

        <div
          id="halletMessage"
          class="hallet-gate-soon"
          hidden
          role="status"
          aria-live="polite"
        ></div>

      </section>
    `);

    if (typeof window.nav === "function") {
      try {
        window.nav("navHome");
      } catch (_) {}
    }

    var islemBtn = document.getElementById("halletIslemBtn");
    var evrakBtn = document.getElementById("halletEvrakBtn");
    var kurumBtn = document.getElementById("halletKurumBtn");
    var hizmetBtn = document.getElementById("halletHizmetBtn");

    if (islemBtn) {
      islemBtn.addEventListener("click", showIslemMenu);
    }

    if (evrakBtn) {
      evrakBtn.addEventListener("click", function () {
        showMessage(
          "Evrak hazırlama bölümü bir sonraki aşamada açılacak."
        );
      });
    }

    if (kurumBtn) {
      kurumBtn.addEventListener("click", function () {
        showMessage(
          "Kurum başvuruları bölümü bir sonraki aşamada açılacak."
        );
      });
    }

    if (hizmetBtn) {
      hizmetBtn.addEventListener("click", goIsimiCoz);
    }
  }


  function showIslemMenu() {
    paint(`
      <section class="hallet-gate" aria-label="İşlem seçimi">

        <button
          type="button"
          class="hallet-gate-card"
          id="halletBackBtn"
        >
          <span class="hallet-gate-card-icon">←</span>

          <span class="hallet-gate-card-body">
            <span class="hallet-gate-card-title">
              İşini Hallet ana ekranı
            </span>

            <span class="hallet-gate-card-desc">
              İşlem türü seçimine geri dön
            </span>
          </span>
        </button>

        <span class="hallet-gate-badge">
          İŞLEM
        </span>

        <h1 class="hallet-gate-title">
          Hangi işlemi yapmak istiyorsun?
        </h1>

        <p class="hallet-gate-sub">
          İşlem türünü seç. Sana gerekli adımları ve belgeleri tek tek göstereceğiz.
        </p>

        <div class="hallet-gate-list">

          <button
            type="button"
            class="hallet-gate-card"
            id="halletTasinmazBtn"
          >
            <span class="hallet-gate-card-icon">🏠</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Taşınmaz / Ev işlemleri
              </span>

              <span class="hallet-gate-card-desc">
                Ev, arsa ve diğer taşınmaz işlemleri
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletAracBtn"
          >
            <span class="hallet-gate-card-icon">🚗</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Araç işlemleri
              </span>

              <span class="hallet-gate-card-desc">
                Araç alım, satım ve ilgili işlemler
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletResmiBtn"
          >
            <span class="hallet-gate-card-icon">🏛️</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Resmî kurum işlemleri
              </span>

              <span class="hallet-gate-card-desc">
                Devlet kurumlarıyla ilgili işlemler
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletVergiBtn"
          >
            <span class="hallet-gate-card-icon">💰</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Vergi ve ödeme işlemleri
              </span>

              <span class="hallet-gate-card-desc">
                Vergi, harç ve kamu ödemeleri
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>

        <div
          id="halletMessage"
          class="hallet-gate-soon"
          hidden
          role="status"
          aria-live="polite"
        ></div>

      </section>
    `);

    var backBtn = document.getElementById("halletBackBtn");
    var tasinmazBtn = document.getElementById("halletTasinmazBtn");
    var aracBtn = document.getElementById("halletAracBtn");
    var resmiBtn = document.getElementById("halletResmiBtn");
    var vergiBtn = document.getElementById("halletVergiBtn");

    if (backBtn) {
      backBtn.addEventListener("click", showGate);
    }

    if (tasinmazBtn) {
      tasinmazBtn.addEventListener("click", showTasinmazMenu);
    }

    if (aracBtn) {
      aracBtn.addEventListener("click", function () {
        showMessage(
          "Araç işlemleri bölümü hazırlanıyor."
        );
      });
    }

    if (resmiBtn) {
      resmiBtn.addEventListener("click", function () {
        showMessage(
          "Resmî kurum işlemleri bölümü hazırlanıyor."
        );
      });
    }

    if (vergiBtn) {
      vergiBtn.addEventListener("click", function () {
        showMessage(
          "Vergi ve ödeme işlemleri bölümü hazırlanıyor."
        );
      });
    }
  }


  function showTasinmazMenu() {
    paint(`
      <section class="hallet-gate" aria-label="Taşınmaz işlemleri">

        <button
          type="button"
          class="hallet-gate-card"
          id="halletTasinmazBackBtn"
        >
          <span class="hallet-gate-card-icon">←</span>

          <span class="hallet-gate-card-body">
            <span class="hallet-gate-card-title">
              İşlem seçimine dön
            </span>

            <span class="hallet-gate-card-desc">
              Önceki ekrana geri dön
            </span>
          </span>
        </button>

        <span class="hallet-gate-badge">
          TAŞINMAZ
        </span>

        <h1 class="hallet-gate-title">
          Taşınmaz işlemleri
        </h1>

        <p class="hallet-gate-sub">
          Yapmak istediğin taşınmaz işlemini seç.
        </p>

        <div class="hallet-gate-list">

          <button
            type="button"
            class="hallet-gate-card"
            id="halletKonutSatisBtn"
          >
            <span class="hallet-gate-card-icon">🏠</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Konut satışı
              </span>

              <span class="hallet-gate-card-desc">
                Ev satış sürecini adım adım hazırlayalım
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletKonutAlisBtn"
          >
            <span class="hallet-gate-card-icon">🔑</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Konut alımı
              </span>

              <span class="hallet-gate-card-desc">
                Ev satın alma süreci
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>


          <button
            type="button"
            class="hallet-gate-card"
            id="halletDigerTasinmazBtn"
          >
            <span class="hallet-gate-card-icon">📑</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                Diğer taşınmaz işlemleri
              </span>

              <span class="hallet-gate-card-desc">
                Arsa, tarla ve diğer işlemler
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>

        <div
          id="halletMessage"
          class="hallet-gate-soon"
          hidden
          role="status"
          aria-live="polite"
        ></div>

      </section>
    `);

    var backBtn = document.getElementById("halletTasinmazBackBtn");
    var satisBtn = document.getElementById("halletKonutSatisBtn");
    var alisBtn = document.getElementById("halletKonutAlisBtn");
    var digerBtn = document.getElementById("halletDigerTasinmazBtn");

    if (backBtn) {
      backBtn.addEventListener("click", showIslemMenu);
    }

    if (satisBtn) {
      satisBtn.addEventListener("click", showKonutSatis);
    }

    if (alisBtn) {
      alisBtn.addEventListener("click", function () {
        showMessage(
          "Konut alımı bölümü hazırlanıyor."
        );
      });
    }

    if (digerBtn) {
      digerBtn.addEventListener("click", function () {
        showMessage(
          "Diğer taşınmaz işlemleri bölümü hazırlanıyor."
        );
      });
    }
  }


  function showKonutSatis() {
    paint(`
      <section class="hallet-gate" aria-label="Konut satışı">

        <button
          type="button"
          class="hallet-gate-card"
          id="halletSatisBackBtn"
        >
          <span class="hallet-gate-card-icon">←</span>

          <span class="hallet-gate-card-body">
            <span class="hallet-gate-card-title">
              Taşınmaz işlemlerine dön
            </span>

            <span class="hallet-gate-card-desc">
              Önceki ekrana geri dön
            </span>
          </span>
        </button>

        <span class="hallet-gate-badge">
          İŞLEM DOSYASI
        </span>

        <h1 class="hallet-gate-title">
          Konut satışı
        </h1>

        <p class="hallet-gate-sub">
          Satış işlemini senin için adım adım hazırlayacağız.
        </p>

        <div class="hallet-gate-list">

          <button
            type="button"
            class="hallet-gate-card"
            id="halletSatisBaslaBtn"
          >
            <span class="hallet-gate-card-icon">▶️</span>

            <span class="hallet-gate-card-body">
              <span class="hallet-gate-card-title">
                İşlem dosyasını başlat
              </span>

              <span class="hallet-gate-card-desc">
                Sana birkaç soru sorarak gerekli belgeleri ve adımları belirleyeceğiz.
              </span>
            </span>

            <span class="hallet-gate-card-arrow">›</span>
          </button>

        </div>

        <div
          id="halletMessage"
          class="hallet-gate-soon"
          hidden
          role="status"
          aria-live="polite"
        ></div>

      </section>
    `);

    var backBtn = document.getElementById("halletSatisBackBtn");
    var baslaBtn = document.getElementById("halletSatisBaslaBtn");

    if (backBtn) {
      backBtn.addEventListener("click", showTasinmazMenu);
    }

    if (baslaBtn) {
      baslaBtn.addEventListener("click", function () {
        showMessage(
          "İşlem Dosyası altyapısı hazırlanıyor. Bir sonraki aşamada soru ağacı başlayacak."
        );
      });
    }
  }


  window.Hallet = {
    showGate: showGate,
    showIslemMenu: showIslemMenu,
    showTasinmazMenu: showTasinmazMenu,
    showKonutSatis: showKonutSatis,
    goIsimiCoz: goIsimiCoz
  };

})();
