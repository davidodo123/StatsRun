// Genera los iconos PNG de la PWA a partir del logotipo (node scripts/generate-icons.mjs).
// iOS no usa iconos SVG en la pantalla de inicio, y Android pide 192/512 y uno "maskable" con margen de seguridad.
import sharp from "sharp";

const ORANGE = "#eb6834";
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
  return `<polygon points="${pts}" fill="#fff"/>`;
};

const svg = ({ rounded, scale }) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="${ORANGE}"/>${mark(scale)}</svg>`,
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
