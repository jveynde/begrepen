// Offline support: pages are network-first (so updates arrive), everything
// else (scripts, styles, icons, audio) is cache-first after the first visit.
// Paths are relative to the service worker's scope, so the app works both at
// the site root and in a sub-folder (GitHub Pages: /begrepen/).
const CACHE = "begrepen-v2";
const BASE = new URL(self.registration.scope).pathname; // e.g. "/begrepen/"
const PAGES = ["", "practice/", "board/", "family/", "helper/", "checkin/", "print/"].map((p) => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled([...PAGES, BASE + "manifest.webmanifest"].map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(BASE))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
