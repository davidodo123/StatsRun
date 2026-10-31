// Muñeco realista para la imagen de compartir: la misma imagen y los mismos músculos que en la app (MuscleMap),
// compuestos en el servidor con sharp (Satori no sabe mezclar colores). Delante y detrás, uno al lado del otro.
import "server-only";
import path from "node:path";
import sharp from "sharp";
import type { Muscle } from "./strength/labels";
import type { Sex } from "./types";
import { PHOTO_BACK, PHOTO_FRONT, PHOTO_H, PHOTO_MIRROR, PHOTO_W, photoPath, type PhotoShape } from "./strength/bodyPhoto";

const ACCENT = "#d4ff3a";
// sin el aire de los lados ni de arriba y abajo (los puños llegan a x ≈ 165 y 525)
const CROP = { left: 150, top: 30, width: 387, height: 970 };
const GAP = 40;

async function side(file: string, shapes: PhotoShape[], sets: Partial<Record<Muscle, number>>, full: number): Promise<Buffer> {
  const base = await sharp(path.join(process.cwd(), "public", "cuerpo", file)).png().toBuffer();
  const paths = shapes
    .filter((s) => (sets[s.m] ?? 0) > 0)
    .map((s) => `<path d="${photoPath(s.pts)}" fill="${ACCENT}" fill-opacity="${(0.35 + 0.65 * Math.min(1, sets[s.m]! / full)).toFixed(2)}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_W}" height="${PHOTO_H}"><defs><filter id="b"><feGaussianBlur stdDeviation="4"/></filter></defs><g filter="url(#b)"><g>${paths}</g><g transform="${PHOTO_MIRROR}">${paths}</g></g></svg>`;
  // el lima, recortado con la silueta (fuera del cuerpo la imagen es transparente) y mezclado con las sombras del músculo
  const lime = await sharp(Buffer.from(svg)).composite([{ input: base, blend: "dest-in" }]).png().toBuffer();
  // sharp recorta antes de mezclar si va en la misma cadena: primero la mezcla y luego el recorte
  const mixed = await sharp(base).composite([{ input: lime, blend: "overlay" }]).png().toBuffer();
  return sharp(mixed).extract(CROP).png().toBuffer();
}

/** PNG (data URI) con el cuerpo de delante y de detrás; color pleno en el músculo con más series. */
export async function bodyPng(sets: Partial<Record<Muscle, number>>, sex: Sex = "male"): Promise<string> {
  const body = sex === "female" ? "mujer" : "hombre";
  const full = Math.max(1, ...Object.values(sets).map((n) => n ?? 0));
  const [front, back] = await Promise.all([side(`${body}-delante.webp`, PHOTO_FRONT, sets, full), side(`${body}-detras.webp`, PHOTO_BACK, sets, full)]);
  const png = await sharp({ create: { width: CROP.width * 2 + GAP, height: CROP.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: front, left: 0, top: 0 },
      { input: back, left: CROP.width + GAP, top: 0 },
    ])
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Ancho / alto de la imagen que devuelve bodyPng. */
export const BODY_PNG_RATIO = (CROP.width * 2 + GAP) / CROP.height;
