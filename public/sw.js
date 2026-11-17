// Service worker de Zancavolt.
// - Páginas: siempre de la red (los datos son personales y cambian); sin conexión, una pantalla propia.
// - Estáticos de Next (_next/static, con hash en el nombre) e iconos: de la caché primero, para abrir rápido.
// No se guarda en caché ninguna página con datos del usuario.
// subir la versión al cambiar offline.html o los iconos: renueva la caché en los móviles con la app instalada
const VERSION = "v5"; // v5 (2026-11-17): la página no se queda esperando para siempre y la caché no crece sin fin
const STATIC = `pacelab-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
// cada versión publicada trae estáticos con otro nombre: se guardan los más recientes y se borran los viejos
const MAX_STATIC = 160;
// si la página no llega en este tiempo (cobertura mala, el iPhone recién despertado), pantalla propia que reintenta sola
const NAV_TIMEOUT_MS = 12_000;
// la petición adelantada (navigation preload) a veces no llega nunca en Safari al volver a la app: pasado esto, otra normal
const PRELOAD_WAIT_MS = 4_000;

const later = (ms) => new Promise((r) => setTimeout(() => r(undefined), ms));

async function trimStatic() {
  const c = await caches.open(STATIC);
  const keys = await c.keys();
  const keep = new Set(PRECACHE.map((p) => new URL(p, self.location.origin).href));
  const old = keys.filter((k) => !keep.has(k.url));
  await Promise.all(old.slice(0, Math.max(0, old.length - MAX_STATIC)).map((k) => c.delete(k)));
}

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
        // la pantalla sin conexión, en la misma dirección (al reintentar se recarga la página que se pedía);
        // «lento»: la página no ha llegado a tiempo, y lo vuelve a intentar sola
        const offline = async (slow) => {
          const page = await caches.match("/offline.html");
          if (!page || !slow) return page;
          const html = (await page.text()).replace("<head>", "<head><script>window.LENTO = true</script>");
          return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        };
        const network = (async () => {
          const pre = await Promise.race([Promise.resolve(event.preloadResponse).catch(() => undefined), later(PRELOAD_WAIT_MS)]);
          return pre || fetch(req);
        })();
        try {
          const res = await Promise.race([network, later(NAV_TIMEOUT_MS)]);
          return res || (await offline(true));
        } catch {
          return offline(false);
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
              event.waitUntil(caches.open(STATIC).then((c) => c.put(req, copy)).then(trimStatic));
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
