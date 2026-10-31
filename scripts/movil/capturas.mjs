// Capturas del móvil con Chrome sin ventana (protocolo de depuración, sin Playwright) contra `npx next start -p 3005`.
//
//   node scripts/movil/capturas.mjs <carpeta> <cookie.txt> "ruta|archivo.png[|js]" …
//
// Variables (opcionales): IDIOMA=es|en|ca|pt|fr · TAM=390x844x2 (ancho × alto × escala; para Google Play, 360x640x3)
// · PAGINA=1 (página entera en vez de lo que se ve) · BASE=http://localhost:3005
// El js de cada captura se ejecuta antes de sacarla (p. ej. window.scrollTo(0,400)); si contiene «esperar», espera 7 s más.
// En Git Bash, antes: export MSYS_NO_PATHCONV=1 (si no, convierte «/» en una ruta de Windows).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const [dir, cookieFile, ...shots] = process.argv.slice(2);
if (!dir || !cookieFile || !shots.length) throw new Error('Uso: node scripts/movil/capturas.mjs <carpeta> <cookie.txt> "ruta|archivo.png[|js]" …');
const BASE = process.env.BASE ?? "http://localhost:3005";
const [width, height, scale] = (process.env.TAM ?? "390x844x2").split("x").map(Number);
const full = process.env.PAGINA === "1";
mkdirSync(dir, { recursive: true });
const profile = path.join(dir, ".chrome");
const port = 9300 + Math.floor(Math.random() * 600);

const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 60 && !targets; i++) {
  await wait(250);
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  } catch {}
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result ?? m.error);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) => new Promise((r) => (pending.set(++id, r), ws.send(JSON.stringify({ id, method, params }))));

const host = new URL(BASE).hostname;
await send("Network.enable");
await send("Network.setCookie", { name: "sr_session", value: readFileSync(cookieFile, "utf8").trim(), domain: host, path: "/" });
await send("Network.setCookie", { name: "rio_lang", value: process.env.IDIOMA ?? "es", domain: host, path: "/" });
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: true });
await send("Page.enable");
// sin avisos encima: instalar la app, métricas y notificaciones
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: 'try { localStorage.setItem("rio-avisos-luego", String(Date.now() + 864e5)); localStorage.setItem("pacelab-install-dismissed", "1"); localStorage.setItem("rio-metricas", "no"); } catch {}',
});

for (const s of shots) {
  const [route, file, js] = s.split("|");
  const nav = await send("Page.navigate", { url: `${BASE}${route}` });
  if (nav?.message) throw new Error(`${route}: ${nav.message}`);
  await wait(7000);
  if (js) {
    await send("Runtime.evaluate", { expression: js });
    await wait(js.includes("esperar") ? 7000 : 800);
  }
  const h = full ? Math.min(6000, (await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value) : height;
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full, clip: { x: 0, y: 0, width, height: h, scale: 1 } });
  writeFileSync(path.join(dir, file), Buffer.from(data, "base64"));
  console.log(file);
}
ws.close();
chrome.kill();
await wait(500);
rmSync(profile, { recursive: true, force: true });
