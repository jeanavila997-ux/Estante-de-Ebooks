// Service worker do PWA — app shell + cache de ebooks abertos.
// Só é registrado em contexto seguro (HTTPS ou localhost); na rede Wi-Fi via
// http a "Adicionar à Tela de Início" do iPhone funciona mesmo sem ele.
const CACHE = "estante-mobile-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstWithOfflineCache(req, url) {
  const cache = await caches.open(CACHE);
  try {
    const network = await fetch(req);
    if (network.ok) {
      cache.put(req, network.clone());
    }
    return network;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // API sempre rede; se falhar, devolve erro JSON offline.
  if (url.pathname.startsWith("/api/")) return;
  // Arquivos de ebook: tenta rede primeiro, mas guarda cache para ler offline depois.
  if (/^\/api\/ebooks\/\d+\/file/.test(url.pathname) || url.pathname.endsWith(".pdf")) {
    e.respondWith(networkFirstWithOfflineCache(e.request, url));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => new Response("", { status: 503 })))
  );
});
