/* İşimi Çöz · Yemek · Bildirim service worker
   Yalnızca push bildirimlerini gösterir ve dokununca ilgili ekranı açar.
   fetch/önbellek dinleyicisi YOKTUR: sitenin ağ davranışını değiştirmez. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'İşimi Çöz Yemek', body: e.data ? e.data.text() : '' }; }
  var title = d.title || 'İşimi Çöz Yemek';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    tag: d.order_id ? 'food-' + d.order_id : (d.id || 'food'),
    renotify: true,
    data: { id: d.id || null, order_id: d.order_id || null, type: d.type || '' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  var t = String(d.type || '');
  var dest = t.indexOf('venue') === 0 ? 'business' : t.indexOf('courier') === 0 ? 'courier' : (d.order_id ? 'order' : 'home');
  var url = self.registration.scope + '?food=' + dest + (d.order_id ? '&order=' + encodeURIComponent(d.order_id) : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if ('focus' in c) { c.postMessage({ foodNav: { dest: dest, order_id: d.order_id || null } }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
