const STATIC_CACHE = "business-ai-static-v1";
const SAFE_STATIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/assets/icons/business-ai-icon.svg",
  "/assets/icons/business-ai-192.png",
  "/assets/icons/business-ai-512.png"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([...SAFE_STATIC_PATHS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Owner data is always fetched through the authenticated application. This
// worker never caches navigations, API responses, access tokens or customer data.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.mode === "navigate" || url.pathname.startsWith("/api/")) return;
  if (!SAFE_STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
