/* =========================================================
   ISIMI-COZ MARKETPLACE 2.0
   Frontend foundation
   ========================================================= */

(function () {
  "use strict";

  const Marketplace = {

    categories: {
      digital: [
        ["💻", "Web Sitesi", "Web sitesi ve kurumsal web projeleri"],
        ["🧑‍💻", "Yazılım", "Web, mobil ve özel yazılım"],
        ["🎨", "Tasarım", "Grafik, UI/UX ve marka tasarımı"],
        ["🎬", "Video", "Video kurgu, reklam ve içerik"],
        ["📈", "SEO", "Arama motoru optimizasyonu"],
        ["📱", "Sosyal Medya", "Sosyal medya yönetimi"],
        ["📣", "Reklam", "Dijital reklam ve kampanyalar"],
        ["📊", "Veri Analizi", "Veri işleme ve raporlama"],
        ["🌍", "Çeviri", "Metin ve dil hizmetleri"]
      ],

      physical: [
        ["⚡", "Elektrik", "Elektrik arıza ve montaj"],
        ["🚰", "Tesisat", "Su ve sıhhi tesisat"],
        ["❄️", "Klima", "Klima bakım ve teknik servis"],
        ["🧹", "Temizlik", "Ev, ofis ve işletme temizliği"],
        ["🔩", "Montaj", "Mobilya ve ürün montajı"],
        ["🚚", "Taşıma", "Nakliye ve taşıma"],
        ["🔧", "Bakım", "Bakım ve onarım"],
        ["🛠️", "Teknik Servis", "Cihaz ve ekipman servisi"]
      ],

      professional: [
        ["🧾", "Muhasebe", "Muhasebe ve finans desteği"],
        ["⚖️", "Hukuk Ön Hazırlığı", "Belge ve araştırma desteği"],
        ["💼", "Danışmanlık", "İş ve uzmanlık danışmanlığı"],
        ["🎓", "Eğitim", "Özel ders ve eğitim"],
        ["🔎", "Araştırma", "Araştırma ve raporlama"],
        ["📢", "Pazarlama", "Pazarlama stratejileri"]
      ]
    },

    init: function () {
      this.bindEvents();
      this.renderCategories();
    },

    bindEvents: function () {
      document.addEventListener("click", (event) => {

        const role = event.target.closest("[data-marketplace-role]");

        if (role) {
          const type = role.dataset.marketplaceRole;

          if (type === "customer") {
            this.focusJobInput();
          }

          if (type === "provider") {
            this.openProviderMode();
          }
        }

        const category = event.target.closest("[data-marketplace-category]");

        if (category) {
          this.selectCategory(category.dataset.marketplaceCategory);
        }

        if (event.target.closest("[data-marketplace-analyze]")) {
          this.analyzeJob();
        }
      });
    },

    renderCategories: function () {
      const container = document.querySelector(
        "[data-marketplace-categories]"
      );

      if (!container) return;

      const groups = [
        ["digital", "💻 Dijital İşler"],
        ["physical", "🔧 Fiziksel İşler"],
        ["professional", "👔 Profesyonel İşler"]
      ];

      container.innerHTML = groups.map(([key, title]) => {

        const items = this.categories[key];

        return `
          <div class="marketplace-section">
            <h2 class="marketplace-section-title">${title}</h2>

            <div class="marketplace-category-grid">
              ${items.map(item => `
                <button
                  type="button"
                  class="marketplace-card marketplace-category-card"
                  data-marketplace-category="${this.escape(item[1])}"
                >
                  <div class="icon">${item[0]}</div>
                  <h3>${this.escape(item[1])}</h3>
                  <p>${this.escape(item[2])}</p>
                </button>
              `).join("")}
            </div>
          </div>
        `;

      }).join("");
    },

    focusJobInput: function () {
      const input = document.querySelector(
        "[data-marketplace-job-input]"
      );

      if (!input) return;

      input.focus();

      input.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    },

    openProviderMode: function () {
      const status = document.querySelector(
        "[data-marketplace-status]"
      );

      if (!status) return;

      status.textContent =
        "Hizmet sağlayıcı kayıt modülü hazırlanıyor. Bir sonraki aşamada uzmanlık, konum, çalışma alanı ve portföy bilgileri eklenecek.";

      status.classList.add("visible");
    },

    selectCategory: function (category) {
      const input = document.querySelector(
        "[data-marketplace-job-input]"
      );

      if (!input) return;

      const current = input.value.trim();

      input.value = current
        ? `${current} ${category}`
        : `${category} hizmeti istiyorum.`;

      input.focus();

      this.focusJobInput();
    },

    analyzeJob: function () {
      const input = document.querySelector(
        "[data-marketplace-job-input]"
      );

      const result = document.querySelector(
        "[data-marketplace-result]"
      );

      const status = document.querySelector(
        "[data-marketplace-status]"
      );

      if (!input || !result) return;

      const text = input.value.trim();

      if (!text) {
        if (status) {
          status.textContent =
            "Önce yapmak istediğiniz işi kısaca anlatın.";
          status.classList.add("visible");
        }

        input.focus();
        return;
      }

      const detected = this.detectSkills(text);

      result.innerHTML = `
        <div class="marketplace-card">
          <span class="marketplace-match-score">
            AI ön analizi tamamlandı
          </span>

          <h3>İşinizi analiz ettik</h3>

          <p>
            Talebiniz aşağıdaki hizmet alanlarıyla eşleşiyor:
          </p>

          <div class="marketplace-provider-meta">
            ${detected.map(skill => `
              <span class="marketplace-tag">
                ${this.escape(skill)}
              </span>
            `).join("")}
          </div>

          <p style="margin-top:14px;">
            Sonraki aşamada sistem bu ihtiyaçlara göre
            gerçek hizmet sağlayıcılarını mesafe,
            uzmanlık, puan, fiyat ve müsaitlik kriterleriyle
            eşleştirecek.
          </p>
        </div>
      `;

      result.classList.add("visible");
      result.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    },

    detectSkills: function (text) {
      const normalized = text.toLocaleLowerCase("tr-TR");

      const rules = [
        {
          words: ["web sitesi", "website", "internet sitesi"],
          skill: "Web Sitesi"
        },
        {
          words: ["yazılım", "uygulama", "program"],
          skill: "Yazılım"
        },
        {
          words: ["seo", "google'da", "arama motoru"],
          skill: "SEO"
        },
        {
          words: ["instagram", "facebook", "sosyal medya"],
          skill: "Sosyal Medya"
        },
        {
          words: ["reklam", "google ads", "meta ads"],
          skill: "Reklam"
        },
        {
          words: ["video", "kurgu", "montaj video"],
          skill: "Video"
        },
        {
          words: ["logo", "tasarım", "grafik"],
          skill: "Tasarım"
        },
        {
          words: ["elektrik", "sigorta", "priz"],
          skill: "Elektrik"
        },
        {
          words: ["tesisat", "su kaçağı", "musluk"],
          skill: "Tesisat"
        },
        {
          words: ["klima", "klima bakım"],
          skill: "Klima"
        },
        {
          words: ["temizlik", "ev temizliği", "ofis temizliği"],
          skill: "Temizlik"
        },
        {
          words: ["taşıma", "nakliye", "ev taşıma"],
          skill: "Taşıma"
        }
      ];

      const matches = rules
        .filter(rule =>
          rule.words.some(word =>
            normalized.includes(word)
          )
        )
        .map(rule => rule.skill);

      return matches.length
        ? [...new Set(matches)]
        : ["Genel hizmet"];
    },

    escape: function (value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };

  window.ISIMICOZ_MARKETPLACE = Marketplace;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => Marketplace.init()
    );
  } else {
    Marketplace.init();
  }

})();
