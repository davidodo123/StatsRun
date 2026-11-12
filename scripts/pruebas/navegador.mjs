// Recorre la app en un Chrome de verdad (sin ventana, a 390 px como un iPhone) con los usuarios de prueba
// (scripts/pruebas/usuarios.ts) contra `npx next start -p 3005`, en los cinco idiomas. Lo que el recorrido con fetch
// no ve: errores de JavaScript del navegador (también los de hidratación), peticiones que fallan, imágenes rotas,
// pantallas que se salen por los lados y la pantalla «Algo ha fallado».
//
//   node scripts/pruebas/navegador.mjs <informe.json> [usuarios=60] [chromes a la vez=4]
//   NAV_COMPROBAR=1 delante: comprueba que el detector ve los fallos (tienen que salir excepcion-js, consola-error y se-sale-por-el-lado)
import { spawn } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [OUT = "informe-navegador.json", MAX = "60", PAR = "4"] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3005";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LANGS = ["es", "en", "ca", "pt", "fr"];

// cookie de sesión firmada como src/lib/session.ts (el secreto, de .env.local; no se imprime)
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const base = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? env.GOOGLE_CLIENT_SECRET ?? env.OPENROUTER_API_KEY;
const secret = env.AUTH_SECRET || createHash("sha256").update(`statsrun-session:${base ?? "statsrun-dev"}`).digest("hex");
const cookieFor = (uid) => {
  const payload = `${uid}.${Math.floor(Date.now() / 1000) + 86400}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
};

// usuarios repartidos por toda la tanda (no solo los primeros), cada uno con un idioma
const all = readdirSync("data")
  .filter((f) => /^db_prueba-\d+\.json$/.test(f))
  .map((f) => f.slice(3, -5))
  .sort();
const step = Math.max(1, Math.floor(all.length / Number(MAX)));
const ids = all.filter((_, i) => i % step === 0).slice(0, Number(MAX));

function pagesFor(id) {
  const db = JSON.parse(readFileSync(`data/db_${id}.json`, "utf8"));
  const pages = ["/", "/plan", "/plan/actual", "/plan/al-momento", "/fuerza", "/fuerza/ejercicios", "/fuerza/ejercicios/Pushups", "/perfil", "/perfil?tab=running", "/perfil?tab=fuerza", "/perfil?tab=actividades", "/perfil?tab=salud", "/registrar", "/estadisticas", "/amigos", "/entrenador", "/carreras", "/sueno", "/premium", "/ajustes"];
  const routine = db.routines?.[0]?.id;
  if (routine) pages.push(`/fuerza/entreno?rutina=${encodeURIComponent(routine)}`);
  const act = db.activities?.find((a) => a.sport === "run")?.id ?? db.activities?.[0]?.id;
  if (act) pages.push(`/actividad/${encodeURIComponent(act)}`);
  return pages;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const seen = new Set();
let pagesDone = 0;
const t0 = Date.now();
const bad = (id, lang, page, kind, detail) => {
  // cada fallo una vez por pantalla y tipo (si no, uno repetido llena el informe)
  const key = `${page.replace(/\/(actividad)\/.*/, "/$1/…").replace(/rutina=.*/, "rutina=…")}|${kind}|${String(detail).slice(0, 80)}`;
  if (seen.has(key)) return;
  seen.add(key);
  problems.push({ id, lang, page, kind, detail: String(detail).slice(0, 300) });
};

/** Un Chrome con su perfil: sus cookies no se mezclan con las de los otros. */
async function openChrome() {
  const profile = mkdtempSync(path.join(tmpdir(), "zv-nav-"));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 80 && !targets; i++) {
    await wait(250);
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {}
  }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result ?? m.error);
      pending.delete(m.id);
    } else if (m.method) for (const l of listeners) l(m);
  };
  const send = (method, params = {}) => new Promise((r) => (pending.set(++n, r), ws.send(JSON.stringify({ id: n, method, params }))));
  for (const d of ["Network", "Page", "Runtime", "Log"]) await send(`${d}.enable`);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  // sin avisos encima (instalar la app, métricas, notificaciones)
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'try { localStorage.setItem("rio-avisos-luego", String(Date.now() + 864e5)); localStorage.setItem("pacelab-install-dismissed", "1"); localStorage.setItem("rio-metricas", "no"); } catch {}',
  });
  // NAV_COMPROBAR=1: mete en cada página un error de JavaScript y algo que se sale por el lado (el informe tiene que verlos)
  if (process.env.NAV_COMPROBAR) await send("Page.addScriptToEvaluateOnNewDocument", { source: "setTimeout(() => { throw new Error('prueba del detector') }, 50); addEventListener('load', () => setTimeout(() => { const d = document.createElement('div'); d.style.cssText = 'width:700px;height:4px'; (document.querySelector('main') ?? document.body).appendChild(d); console.error('error de prueba'); }, 600))" });
  const close = async () => {
    ws.close();
    proc.kill();
    await wait(300);
    rmSync(profile, { recursive: true, force: true });
  };
  return { send, listeners, close };
}

// ruido de fuera de la app (analítica que no llega a internet en local, extensiones…)
const NOISE = /posthog|i\.posthog|vercel-insights|_vercel\/(insights|speed)|favicon|ERR_ABORTED|net::ERR_NETWORK_CHANGED|Download the React DevTools/i;

async function worker(queue) {
  const c = await openChrome();
  const host = new URL(BASE).hostname;
  let current = { id: "", lang: "", page: "" };
  const reqs = new Map();
  c.listeners.add((m) => {
    const { id, lang, page } = current;
    if (!id) return;
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      bad(id, lang, page, "excepcion-js", `${d.exception?.description ?? d.text}`.split("\n")[0]);
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      const txt = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (!NOISE.test(txt)) bad(id, lang, page, "consola-error", txt.split("\n")[0]);
    } else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
      const e = m.params.entry;
      if (!NOISE.test(`${e.text} ${e.url ?? ""}`)) bad(id, lang, page, "navegador-error", `${e.text} ${e.url ?? ""}`);
    } else if (m.method === "Network.requestWillBeSent") reqs.set(m.params.requestId, m.params.request.url);
    else if (m.method === "Network.responseReceived") {
      const r = m.params.response;
      if (r.status >= 400 && !NOISE.test(r.url) && r.url.startsWith(BASE)) bad(id, lang, page, `http-${r.status}`, r.url.replace(BASE, ""));
    } else if (m.method === "Network.loadingFailed" && !m.params.canceled) {
      const url = reqs.get(m.params.requestId) ?? "";
      if (!NOISE.test(`${url} ${m.params.errorText}`) && url.startsWith(BASE)) bad(id, lang, page, "peticion-fallida", `${m.params.errorText} ${url.replace(BASE, "")}`);
    }
  });
  while (queue.length) {
    const id = queue.shift();
    const lang = LANGS[ids.indexOf(id) % LANGS.length];
    await c.send("Network.clearBrowserCookies");
    await c.send("Network.setCookie", { name: "sr_session", value: cookieFor(id), domain: host, path: "/" });
    await c.send("Network.setCookie", { name: "rio_lang", value: lang, domain: host, path: "/" });
    for (const page of pagesFor(id)) {
      current = { id, lang, page };
      const loaded = new Promise((r) => {
        const l = (m) => m.method === "Page.loadEventFired" && (c.listeners.delete(l), r());
        c.listeners.add(l);
        setTimeout(() => (c.listeners.delete(l), r()), 15000);
      });
      const nav = await c.send("Page.navigate", { url: BASE + page });
      if (nav?.errorText) bad(id, lang, page, "no-abre", nav.errorText);
      await loaded;
      await wait(1500); // que acabe de hidratar y de cargar lo de después (Suspense, imágenes)
      const r = await c.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          // el ancho de la página, no innerWidth: con el móvil emulado, la ventana se ensancha hasta lo que sobresale
          const w = document.documentElement.clientWidth;
          const wide = [...document.querySelectorAll("body *")].filter((el) => {
            const b = el.getBoundingClientRect();
            if (!b.width || b.right <= w + 1) return false;
            // dentro de algo que se desplaza a lo ancho a propósito (carruseles, tablas): no cuenta
            // (html y body lo recortan todo para que no haya desplazamiento lateral: ahí lo que sobresale queda cortado, y eso sí cuenta)
            for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return false; }
            return true;
          }).slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 3).join(".") : "") + " " + Math.round(el.getBoundingClientRect().right) + "px");
          const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src") && !i.getAttribute("src").startsWith("data:")).map((i) => i.getAttribute("src")).slice(0, 3);
          const text = document.body.innerText;
          return { scroll: document.documentElement.scrollWidth, w, wide, imgs, broken: /Algo ha fallado|Something went wrong/.test(text), login: location.pathname === "/login", len: text.length };
        })()`,
      });
      const v = r?.result?.value;
      pagesDone++;
      if (!v) {
        bad(id, lang, page, "sin-evaluar", JSON.stringify(r).slice(0, 200));
        continue;
      }
      if (v.scroll > v.w + 1 || v.wide.length) bad(id, lang, page, "se-sale-por-el-lado", `${v.scroll}px en ${v.w}px · ${v.wide.join(" | ")}`);
      if (v.imgs.length) bad(id, lang, page, "imagen-rota", v.imgs.join(" "));
      if (v.broken) bad(id, lang, page, "algo-ha-fallado", "");
      if (v.login) bad(id, lang, page, "manda-al-login", "");
      if (v.len < 40) bad(id, lang, page, "pantalla-vacia", `${v.len} caracteres`);
    }
    current = { id: "", lang: "", page: "" };
  }
  await c.close();
}

const queue = [...ids];
const progress = setInterval(() => console.log(`${pagesDone} pantallas · ${problems.length} problemas · ${Math.round((Date.now() - t0) / 1000)} s`), 60000);
await Promise.all(Array.from({ length: Number(PAR) }, () => worker(queue)));
clearInterval(progress);
const byKind = {};
for (const p of problems) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
writeFileSync(OUT, JSON.stringify({ usuarios: ids.length, pantallas: pagesDone, segundos: Math.round((Date.now() - t0) / 1000), porTipo: byKind, problemas: problems }, null, 2));
console.log(`Hecho: ${ids.length} usuarios, ${pagesDone} pantallas en el navegador en ${Math.round((Date.now() - t0) / 1000)} s · ${problems.length} problemas distintos`);
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`);
