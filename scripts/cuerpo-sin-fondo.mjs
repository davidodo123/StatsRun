// Quita el fondo negro de las imágenes del muñeco (de Gemini) y las deja en public/cuerpo como WebP con transparencia.
//   node scripts/cuerpo-sin-fondo.mjs <imagen.png> <nombre>     p. ej. hombre-delante
import sharp from "sharp";

const [src, name] = process.argv.slice(2);
if (!src || !name) throw new Error("Uso: node scripts/cuerpo-sin-fondo.mjs <imagen.png> <nombre>");
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const l = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
  out[j] = data[i];
  out[j + 1] = data[i + 1];
  out[j + 2] = data[i + 2];
  // el fondo es casi negro (≤ ~22) y el cuerpo gris claro: transición suave en el borde
  out[j + 3] = Math.max(0, Math.min(255, Math.round((l - 22) * 6)));
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 84, alphaQuality: 90 }).toFile(`public/cuerpo/${name}.webp`);
console.log(name, info.width, info.height);
