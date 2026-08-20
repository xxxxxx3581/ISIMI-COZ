// İşimi Çöz - minimal service worker (PWA kurulabilirliği için)
self.addEventListener("install", (e) => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  // Basit pass-through: özel bir önbellekleme yapılmıyor, her istek doğrudan ağa gider.
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
