// C-Slian Service Worker v1.0
// Cache tĩnh: HTML/CSS/JS/fonts
// Dữ liệu Supabase: network-first (không cache, luôn fresh)

const CACHE_NAME = 'cslian-v1';
const STATIC_ASSETS = [
  '/cslian-ops/',
  '/cslian-ops/index.html',
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install: cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(e) {
        console.warn('Some assets failed to cache:', e);
      });
    })
  );
  // Kích hoạt ngay không chờ tab cũ đóng
  self.skipWaiting();
});

// Activate: xóa cache cũ
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - Supabase API → Network only (realtime data phải luôn fresh)
// - Google Fonts / CDN → Cache first (tối ưu tốc độ)
// - HTML index → Network first, fallback cache (nhận update mới ngay)
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Supabase: luôn network, không cache
  if (url.includes('supabase.co')) {
    return; // let browser handle normally
  }

  // index.html: network first → fallback cache
  if (url.endsWith('/') || url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Fonts + CDN scripts: cache first
  if (url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Các request khác: network first
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

// Nhận lệnh skip waiting từ app khi có update
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
