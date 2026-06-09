/* Service Worker for 電験1電力 PWA
   Strategy: Cache-First (network-falling). 完全オフラインを最優先する。
   バージョンは中身が変わるたびに必ず上げること（古いキャッシュの強制無効化のため）。
*/
const CACHE = "denken1-power-v3";

// プリキャッシュ対象。アプリの「コア」だけを入れる。
// data/ 配下は使われたタイミングで動的にキャッシュへ追加してもよいが、
// 完全オフラインを保証するため初回にまとめて取りに行く。
const PRECACHE = [
  "./",
  "./denken1_power.html",
  "./manifest.webmanifest",
  "./data/official_texts.js",
  "./data/extended_questions.js",
  "./data/questions_legacy.js",
  "./data/topic_frequency_extended.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // GET 以外と http/https 以外（chrome-extension など）は素通り
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // 同一オリジン・成功レスポンスのみキャッシュ
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // オフラインで未キャッシュなら HTML はアプリトップにフォールバック
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./denken1_power.html");
        }
        return Response.error();
      });
    })
  );
});
