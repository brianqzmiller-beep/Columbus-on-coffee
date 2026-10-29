const CACHE = "coc-v8";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./og-image.png",
  "./404.html",
  "./sitemap.xml",
  "./robots.txt",
  "./photos/connecting-grounds.jpg",
];
const CDN_HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages: always try the network so edits show up right away; fall back offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const isGuide = /\/(index\.html)?$/.test(url.pathname);
          if (res.ok && isGuide) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match(/\/(index\.html)?$/.test(url.pathname) ? "./index.html" : "./404.html"))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin || CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then(hit => {
        const fresh = fetch(req)
          .then(res => {
            if (res && (res.ok || res.type === "opaque")) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    );
  }
  // Map tiles and everything else go straight to the network.
});
