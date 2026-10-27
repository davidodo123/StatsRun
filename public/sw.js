// Service worker de Zancavolt.
// - Páginas: siempre de la red (los datos son personales y cambian); sin conexión, una pantalla propia.
// - Estáticos de Next (_next/static, con hash en el nombre) e iconos: de la caché primero, para abrir rápido.
// No se guarda en caché ninguna página con datos del usuario.
// subir la versión al cambiar offline.html o los iconos: renueva la caché en los móviles con la app instalada
const VERSION = "v3";
const STATIC = `pacelab-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pacelab-") && k !== STATIC).map((k) => caches.delete(k))))
      // la petición de la página sale a la vez que arranca el service worker, sin esperarle
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(req));
        } catch {
          return caches.match("/offline.html");
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// Aviso de cada mañana (Web Push): { title, body, url }
self.addEventListener("push", (event) => {
  let msg = { title: "Zancavolt", body: "", url: "/plan" };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {}
  event.waitUntil(self.registration.showNotification(msg.title, { body: msg.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "hoy", data: { url: msg.url } }));
});

// al tocarlo, a la app (si ya está abierta, a esa ventana)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      return win ? win.navigate(url).then((w) => (w || win).focus()) : self.clients.openWindow(url);
    }),
  );
});
