// Genera src/lib/strength/catalog.json: free-exercise-db (dominio público) traducida al español + ejercicios propios.
// Uso: node scripts/build-exercises.mjs [ruta/a/exercises.json]  (sin ruta, la descarga del commit fijado)
import { readFile, writeFile } from "node:fs/promises";

export const UPSTREAM_COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
const SOURCE_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${UPSTREAM_COMMIT}/dist/exercises.json`;

const EQUIPMENT = {
  "body only": "corporal",
  dumbbell: "mancuernas",
  barbell: "barra",
  "e-z curl bar": "barraZ",
  kettlebells: "kettlebell",
  machine: "maquinas",
  cable: "poleas",
  bands: "bandas",
  "medicine ball": "balon",
  "exercise ball": "fitball",
  "foam roll": "rodillo",
  other: "otro",
};
// códigos cortos de es.json (material corregido a mano)
const CODES = { pc: "corporal", mc: "mancuernas", ba: "barra", bz: "barraZ", kb: "kettlebell", mq: "maquinas", po: "poleas", bn: "bandas", bm: "balon", fb: "fitball", ro: "rodillo", be: "banco", bd: "dominadas", cj: "cajon", ja: "jaula", ot: "otro" };
const MUSCLES = {
  abdominals: "abdomen",
  abductors: "abductores",
  adductors: "aductores",
  biceps: "biceps",
  calves: "gemelos",
  chest: "pecho",
  forearms: "antebrazos",
  glutes: "gluteos",
  hamstrings: "isquios",
  lats: "dorsal",
  "lower back": "lumbar",
  "middle back": "espalda",
  neck: "cuello",
  quadriceps: "cuadriceps",
  shoulders: "hombros",
  traps: "trapecio",
  triceps: "triceps",
};
const CATEGORY = { strength: "fuerza", stretching: "estiramiento", plyometrics: "pliometria", powerlifting: "powerlifting", "olympic weightlifting": "halterofilia", strongman: "strongman", cardio: "cardio" };
const LEVEL = { beginner: "principiante", intermediate: "intermedio", expert: "avanzado" };
const MECHANIC = { compound: "compuesto", isolation: "aislamiento" };

const source = process.argv[2] ? JSON.parse(await readFile(process.argv[2], "utf8")) : await (await fetch(SOURCE_URL)).json();
const es = JSON.parse(await readFile(new URL("./exercises/es.json", import.meta.url), "utf8"));
const extra = JSON.parse(await readFile(new URL("./exercises/extra.json", import.meta.url), "utf8"));

const out = source.map((x) => {
  const t = es[x.id];
  if (!t) throw new Error(`Falta la traducción de ${x.id}`);
  const [name, steps, codes] = t;
  const eq = codes ? codes.map((c) => CODES[c]) : [EQUIPMENT[x.equipment] ?? "corporal"];
  if (eq.some((e) => !e)) throw new Error(`Material desconocido en ${x.id}`);
  return {
    id: x.id,
    name,
    nameEn: x.name,
    cat: CATEGORY[x.category],
    eq,
    level: LEVEL[x.level],
    ...(x.mechanic ? { mech: MECHANIC[x.mechanic] } : {}),
    muscles: x.primaryMuscles.map((m) => MUSCLES[m]),
    secondary: x.secondaryMuscles.map((m) => MUSCLES[m]),
    steps,
    img: x.images.length,
  };
});
// sin foto propia: la de un ejercicio parecido del catálogo (imgId)
const PHOTO_FROM = { Kettlebell_Overhead_Triceps_Extension: "Standing_Dumbbell_Triceps_Extension", Kettlebell_Halo_With_Overhead_Extension: "Standing_Dumbbell_Triceps_Extension" };
const imgCount = new Map(source.map((x) => [x.id, x.images.length]));
for (const x of out) if (!x.img && PHOTO_FROM[x.id]) Object.assign(x, { img: imgCount.get(PHOTO_FROM[x.id]) ?? 0, imgId: PHOTO_FROM[x.id] });
for (const { imgFrom, ...x } of extra) out.push({ ...x, img: imgFrom ? (imgCount.get(imgFrom) ?? 0) : 0, ...(imgFrom ? { imgId: imgFrom } : {}) });
out.sort((a, b) => a.name.localeCompare(b.name, "es"));

await writeFile(new URL("../src/lib/strength/catalog.json", import.meta.url), JSON.stringify(out) + "\n");
// lo justo para listar en el navegador: va en el JS (que el móvil guarda en caché), no en cada página
const summaries = out.map(({ id, name, cat, eq, muscles, img, imgId }) => ({ id, name, cat, eq, muscles, img, ...(imgId ? { imgId } : {}) }));
await writeFile(new URL("../src/lib/strength/summaries.json", import.meta.url), JSON.stringify(summaries) + "\n");
console.log(`${out.length} ejercicios`);
