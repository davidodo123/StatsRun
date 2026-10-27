// Capturas y vídeos para el vídeo promocional, con el usuario DEMO (scripts/demo-video/seed.ts) en un servidor local.
// Playwright no es dependencia del proyecto: se instala aparte y se indica su carpeta en PW_DIR.
//
//   npx next start -p 3005
//   DEMO_LANG=en (opcional, en inglés) DEMO_PASS=... PW_DIR=<carpeta con node_modules/playwright> node scripts/demo-video/capture.mjs <carpeta de salida>
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const { chromium } = createRequire(path.join(process.env.PW_DIR ?? ".", "package.json"))("playwright");
const OUT = process.argv[2];
const BASE = process.env.BASE ?? "http://localhost:3005";
const EMAIL = "lucia@demo.run-in-out.test";
const PASS = process.env.DEMO_PASS;
if (!OUT || !PASS) throw new Error("Uso: DEMO_PASS=... PW_DIR=... node capture.mjs <salida>");
mkdirSync(OUT, { recursive: true });
const VIEW = { width: 430, height: 932 };

// entrenos para las fichas: la última tirada larga con mapa y el último entreno de fuerza
const db = JSON.parse(readFileSync("data/db_demo-video-lucia.json", "utf8"));
const runs = db.activities.filter((a) => a.sport === "run" && a.route && a.distanceM >= 10000 && a.sessionId?.endsWith("-long"));
const longRun = runs[runs.length - 1];
const lifts = db.activities.filter((a) => a.workout);
const lift = lifts[lifts.length - 1];

// fuera avisos: instalar la app, métricas y notificaciones
const QUIET = `
  localStorage.setItem("pacelab-install-dismissed", "1");
  localStorage.setItem("rio-metricas", "no");
  localStorage.setItem("rio-avisos-luego", String(Date.now() + 365 * 864e5));
`;

const browser = await chromium.launch({ channel: "chrome" });
const base = { viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark", locale: process.env.DEMO_LANG === "en" ? "en-GB" : "es-ES" };

// sesión iniciada una vez; cada pantalla reutiliza las cookies
const login = await browser.newContext(base);
await login.addInitScript(QUIET);
const lp = await login.newPage();
await lp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await lp.fill('input[name="email"]', EMAIL);
await lp.fill('input[name="password"]', PASS);
await Promise.all([lp.waitForURL((u) => !u.pathname.startsWith("/login")), lp.locator("form button.btn").first().click()]);
const state = await login.storageState();
await login.close();

const settle = async (page) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
};
// scroll suave hasta abajo y vuelta un poco
const smoothScroll = async (page, ms = 5000) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.evaluate((y) => scrollTo(0, y), Math.min(h, 2600) * ease);
    await page.waitForTimeout(50);
  }
};

const shots = [
  { n: "01-inicio", url: "/", act: async (p) => (await p.locator("[aria-label='Hoy'] button").nth(2).click().catch(() => {}), await p.waitForTimeout(1200), smoothScroll(p, 4500)) },
  { n: "02-plan", url: "/plan/actual", act: (p) => smoothScroll(p, 6000) },
  { n: "03-entreno-carrera", url: `/actividad/${encodeURIComponent(longRun.id)}`, act: (p) => smoothScroll(p, 6000) },
  { n: "04-entreno-fuerza", url: `/actividad/${encodeURIComponent(lift.id)}`, act: (p) => smoothScroll(p, 5000) },
  { n: "05-estadisticas", url: "/estadisticas", act: (p) => smoothScroll(p, 6500) },
  { n: "06-strava-importar", url: "/ajustes", act: (p) => smoothScroll(p, 4000) },
  { n: "07-amigos", url: "/amigos", act: (p) => smoothScroll(p, 6000) },
  { n: "08-perfil", url: "/perfil", act: async (p) => (await smoothScroll(p, 3500), await p.locator("button[aria-label*='oct'], button[aria-label*='nov']").first().click().catch(() => {}), p.waitForTimeout(1500)) },
  { n: "09-fuerza", url: "/fuerza", act: (p) => smoothScroll(p, 5000) },
  { n: "10-carreras", url: "/carreras", act: (p) => smoothScroll(p, 5000) },
];

for (const s of shots) {
  // captura fija y de página entera
  const ctx = await browser.newContext({ ...base, storageState: state });
  await ctx.addInitScript(QUIET);
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "networkidle" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, `${s.n}.png`) });
  const tall = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 40);
  if (tall) {
    // página entera con la ventana del alto de la página: así la barra de abajo queda al final y no en medio
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: VIEW.width, height: h });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `${s.n}-full.png`) });
    await page.setViewportSize(VIEW);
  }
  await ctx.close();

  // vídeo de 5-8 s con scroll o un toque
  const vdir = path.join(OUT, `.video-${s.n}`);
  const vctx = await browser.newContext({ ...base, storageState: state, recordVideo: { dir: vdir, size: VIEW } });
  await vctx.addInitScript(QUIET);
  const vp = await vctx.newPage();
  await vp.goto(BASE + s.url, { waitUntil: "networkidle" });
  await settle(vp);
  await s.act(vp);
  await vp.waitForTimeout(800);
  const video = vp.video();
  await vctx.close();
  renameSync(await video.path(), path.join(OUT, `${s.n}.webm`));
  rmSync(vdir, { recursive: true, force: true });
  console.log("✓", s.n, tall ? "(con full)" : "");
}

// la pantalla de entrada, sin sesión
{
  const ctx = await browser.newContext(base);
  await ctx.addInitScript(QUIET);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "11-entrar.png") });
  await ctx.close();
  console.log("✓ 11-entrar");
}
await browser.close();
