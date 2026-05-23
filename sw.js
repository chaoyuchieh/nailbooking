const CACHE_NAME = 'nc-admin-v1';
const STATIC_ASSETS = [
  '/admin.html',
  '/js/config.js',
  '/js/common.js',
  '/js/admin.js',
  '/css/styles.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 安裝：快取靜態資源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 啟動：清除舊快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 請求攔截：網路優先，失敗才用快取
self.addEventListener('fetch', e => {
  // API 請求不快取，直接走網路
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 成功就順便更新快取
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
