// Genera los iconos PNG de la PWA a partir del logotipo (node scripts/generate-icons.mjs).
// iOS no usa iconos SVG en la pantalla de inicio, y Android pide 192/512 y uno "maskable" con margen de seguridad.
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const FONDO = "#d4ff3a"; // lima del estilo Volt
const mark = (scale) => {
  // el triángulo del logo, centrado y escalado (scale = fracción del lienzo que ocupa)
  const s = 64 * scale;
  const o = (64 - s) / 2;
  const k = scale;
  const pts = [
    [14, 46],
    [26, 26],
    [34, 38],
    [40, 30],
    [50, 46],
  ]
    .map(([x, y]) => `${(o + (x - 32) * k + s / 2).toFixed(2)},${(o + (y - 36) * k + s / 2).toFixed(2)}`)
    .join(" ");
  return `<polygon points="${pts}" fill="#000"/>`;
};

const svg = ({ rounded, scale }) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="${FONDO}"/>${mark(scale)}</svg>`,
  );

const out = [
  // "any": esquinas redondeadas como el favicon
  { file: "public/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "public/icon-512.png", size: 512, rounded: true, scale: 1 },
  // "maskable": fondo a sangre y logo dentro del 80 % central (Android recorta en círculo o squircle)
  { file: "public/icon-maskable-512.png", size: 512, rounded: false, scale: 0.75 },
  // iOS redondea solo las esquinas: fondo a sangre
  { file: "public/apple-touch-icon.png", size: 180, rounded: false, scale: 0.9 },
];

for (const o of out) {
  await sharp(svg(o), { density: 600 }).resize(o.size, o.size).png().toFile(o.file);
  console.log("ok", o.file);
}

// ---- App de Android (android/app/src/main/res) ----
const RES = "android/app/src/main/res";
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const markOnly = (scale) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark(scale)}</svg>`);
const circle = (scale) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${FONDO}"/>${mark(scale)}</svg>`);

for (const [d, k] of Object.entries(DENSITIES)) {
  // icono adaptable: el logo en blanco (fondo transparente) dentro de la zona segura de 66/108 dp; el fondo naranja va en ic_launcher_background
  await sharp(markOnly(0.6), { density: 600 }).resize(108 * k, 108 * k).png().toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
  // Android 7 y anteriores (sin icono adaptable): cuadrado redondeado y redondo
  await sharp(svg({ rounded: true, scale: 0.9 }), { density: 600 }).resize(48 * k, 48 * k).png().toFile(`${RES}/mipmap-${d}/ic_launcher.png`);
  await sharp(circle(0.85), { density: 600 }).resize(48 * k, 48 * k).png().toFile(`${RES}/mipmap-${d}/ic_launcher_round.png`);
}
await writeFile(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${FONDO.toUpperCase()}</color>\n</resources>\n`);

// pantalla de carga: el logo en su cuadrado naranja sobre el fondo oscuro de la app
const SPLASH = { "": [480, 320], "land-mdpi": [480, 320], "land-hdpi": [800, 480], "land-xhdpi": [1280, 720], "land-xxhdpi": [1600, 960], "land-xxxhdpi": [1920, 1280] };
for (const [dir, [w, h]] of Object.entries(SPLASH)) {
  for (const [name, [W, H]] of dir === "" ? [["drawable", [w, h]]] : [[`drawable-${dir}`, [w, h]], [`drawable-${dir.replace("land", "port")}`, [h, w]]]) {
    const side = Math.round(Math.min(W, H) * 0.28);
    const logo = await sharp(svg({ rounded: true, scale: 1 }), { density: 600 }).resize(side, side).png().toBuffer();
    await sharp({ create: { width: W, height: H, channels: 4, background: "#000000" } })
      .composite([{ input: logo, gravity: "centre" }])
      .png()
      .toFile(`${RES}/${name}/splash.png`);
  }
}
console.log("ok android");
