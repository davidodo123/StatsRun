// Trocea diario/Estudio entrenamiento.md en apartados para que la IA consulte solo los que vienen al caso.
// Se ejecuta antes de cada build (prebuild) y de `npm run dev`: editar el estudio en Obsidian basta.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../diario/Estudio entrenamiento.md", import.meta.url);
const OUT = new URL("../src/lib/knowledge/estudio.json", import.meta.url);

const clean = (t) =>
  t
    .replace(/```[\s\S]*?```/g, "") // gráficas mermaid
    .replace(/\[\[[^\]|#]*#?([^\]|]*)\|?([^\]]*)\]\]/g, (_, a, b) => b || a) // enlaces de Obsidian → texto
    .replace(/[\p{Extended_Pictographic}️]/gu, "")
    .replace(/\*\*|`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const slug = (t) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// sin el diario (p. ej. si no se sube al servidor) se deja el último troceado, que va en el repositorio
if (!existsSync(SRC)) {
  console.log("estudio: no está diario/Estudio entrenamiento.md; se mantiene el anterior");
  process.exit(0);
}
const sections = [];
{
  const md = readFileSync(SRC, "utf8").replace(/^---[\s\S]*?---\s*/, "");
  let cur;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      if (cur) sections.push(cur);
      cur = { title: clean(h[2]), lines: [] };
    } else if (cur) cur.lines.push(line);
  }
  if (cur) sections.push(cur);
}
const out = sections
  .map((s) => ({ id: slug(s.title), title: s.title, text: clean(s.lines.join("\n")) }))
  .filter((s) => s.text.length > 40 && !/^fuentes$/i.test(s.title));
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`estudio: ${out.length} apartados`);
