// KBL 매니저 오프라인 캐시 (PWA 설치 요건 + 오프라인 실행 지원)
const CACHE_NAME = "kbl-manager-v4";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./engine.js",
  "./styles.css",
  "./data/game_players.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/gzmain.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

// stale-while-revalidate: 캐시가 있으면 즉시 응답하고, 백그라운드에서 최신 버전으로 갱신
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
