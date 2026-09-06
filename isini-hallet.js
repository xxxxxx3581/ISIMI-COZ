/* =========================================================
   İŞİNİ HALLET — Gate
   Mevcut İşimi Çöz sistemine dokunmaz.
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

  function showSoon(label) {
    var box = document.getElementById("halletGateSoon");

    if (!box) return;

    box.hidden = false;

    box.textContent =
      "“" +
      label +
      "” yakında. Şimdilik hizmet / usta bulmak için 4. seçeneği kullanabilirsiniz.";
  }

  function goIsimiCoz() {
    if (typeof window.showHome === "function") {
      window.showHome();
      return;
    }

    console.warn("[Hallet] showHome() bulunamadı");
  }

  function makeCard(key, icon, title, desc, handler) {
    var button = document.createElement("button");

    button.type = "button";
    button.className = "hallet-gate-card";
    button.setAttribute("data-hallet-gate", key);

    var iconEl = document.createElement("span");

    iconEl.className = "hallet-gate-card-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = icon;

    var body = document.createElement("span");

    body.className = "hallet-gate-card-body";

    var titleEl = document.createElement("span");

    titleEl.className = "hallet-gate-card-title";
    titleEl.textContent = title;

    var descEl = document.createElement("span");

    descEl.className = "hallet-gate-card-desc";
    descEl.textContent = desc;

    var arrow = document.createElement("span");

    arrow.className = "hallet-gate-card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    body.appendChild(titleEl);
    body.appendChild(descEl);

    button.appendChild(iconEl);
    button.appendChild(body);
    button.appendChild(arrow);

    button.addEventListener("click", handler);

    return button;
  }

  function showGate() {
    var wrapper = document.createElement("section");

    wrapper.className = "hallet-gate";
    wrapper.setAttribute(
      "aria-label",
      "İşini Hallet giriş"
    );

    var badge = document.createElement("span");

    badge.className = "hallet-gate-badge";
    badge.textContent = "İŞİNİ HALLET";

    var title = document.createElement("h1");

    title.className = "hallet-gate-title";
    title.textContent = "Ne yapmak istiyorsun?";

    var sub = document.createElement("p");

    sub.className = "hallet-gate-sub";

    sub.textContent =
      "İşlem, evrak ve kurum adımları için asistan; usta ve hizmet için İşimi Çöz.";

    var list = document.createElement("div");

    list.className = "hallet-gate-list";

    list.appendChild(
      makeCard(
        "islem",
        "📋",
        "Bir işlem yapmak istiyorum",
        "Tapu, başvuru ve resmi süreç rehberi",
        function () {
          showSoon("Bir işlem yapmak istiyorum");
        }
      )
    );

    list.appendChild(
      makeCard(
        "evrak",
        "📄",
        "Evrak hazırlamak istiyorum",
        "Belge listesi ve taslak desteği",
        function () {
          showSoon("Evrak hazırlamak istiyorum");
        }
      )
    );

    list.appendChild(
      makeCard(
        "kurum",
        "🏛️",
        "Bir kuruma başvuracağım",
        "Hangi kurum, hangi adım",
        function () {
          showSoon("Bir kuruma başvuracağım");
        }
      )
    );

    list.appendChild(
      makeCard(
        "hizmet",
        "🛠️",
        "Hizmet / usta bulmam gerekiyor",
        "Mevcut İşimi Çöz platformuna git",
        goIsimiCoz
      )
    );

    var soon = document.createElement("div");

    soon.id = "halletGateSoon";
    soon.className = "hallet-gate-soon";
    soon.hidden = true;

    soon.setAttribute("role", "status");
    soon.setAttribute("aria-live", "polite");

    wrapper.appendChild(badge);
    wrapper.appendChild(title);
    wrapper.appendChild(sub);
    wrapper.appendChild(list);
    wrapper.appendChild(soon);

    if (typeof window.nav === "function") {
      try {
        window.nav("navHome");
      } catch (_) {}
    }

    paint(wrapper.outerHTML);
  }

  window.Hallet = {
    showGate: showGate,
    showSoon: showSoon,
    goIsimiCoz: goIsimiCoz
  };

})();
