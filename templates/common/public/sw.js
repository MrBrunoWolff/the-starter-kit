// Increment this version when changing the offline page or cached public assets.
const CACHE_PREFIX = "starter-public-";
const CACHE = `${CACHE_PREFIX}v1`;
const ASSETS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (request.mode === "navigate") {
    // Never persist page HTML: future apps may render private account data.
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/offline.html");
        // Workers Assets canonicalizes .html URLs. A redirected cached response
        // cannot satisfy a navigation with redirect mode "manual" in Chromium.
        return cached
          ? new Response(cached.body, { status: cached.status, headers: cached.headers })
          : Response.error();
      }),
    );
    return;
  }
  if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
