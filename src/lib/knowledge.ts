// Consulta del Estudio de entrenamiento (diario/Estudio entrenamiento.md, troceado por scripts/build-knowledge.mjs):
// se buscan los apartados que vienen al caso y se le pasan a la IA. Búsqueda por palabras con raíces y sinónimos.
import sections from "./knowledge/estudio.json";

export interface StudySection {
  id: string;
  title: string;
  text: string;
}

/** Regla común para las instrucciones de las tres IA. */
export const STUDY_RULE = `BASE CIENTÍFICA ("estudio", si viene): apartados del estudio de entrenamiento del propio atleta que vienen al caso. Si traen una regla concreta para su caso (el semáforo de dolor, el tope de la tirada, la regla del cuello…), APLÍCALA tal cual y nómbrala en una frase («según el semáforo de dolor, con un 4…», «según Helms…»). Están por encima de tu conocimiento general.`;

const STOP = new Set(
  "que los las del para con por una unos unas como mas pero sus les este esta esto estos estas ese esa eso hay muy sin sobre entre cuando donde desde hasta tambien porque cual todo toda todos todas otro otra otros solo cada ser son fue han hace hacer tengo tiene quiero puedo debo".split(" "),
);
const norm = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
// raíz corta: «doler», «dolor» y «dolores» se parecen; «series» y «serie» también
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w.replace(/(es|s)$/, ""));
const tokens = (t: string) =>
  norm(t)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);

// cómo lo dice el atleta → cómo lo dice el estudio
const SYNONYMS: [RegExp, string][] = [
  [/duel|dolor|molest|lesion|rodilla|tendon|fascitis|tobillo|cadera|espalda|pinchazo/, "dolor semaforo molestia vuelta"],
  [/fiebre|gripe|catarro|resfria|enferm|mocos|garganta|covid/, "enfermedad fiebre cuello"],
  [/dormi|sueno|insomn|duermo/, "sueno lesiones"],
  [/cansad|fatiga|agotad|reventad|sin energia|pesadez|piernas cargadas|estancad/, "fatiga sobreentrenamiento recuperacion alarma"],
  [/carrera|competi|afina|taper|ultima semana|dia de la/, "afinamiento taper"],
  [/fuerza|pesas|gimnasio|sentadilla|rutina|musculo|hipertrofia|series|repeticion|\brir\b|\brpe\b|press|peso muerto|mancuern/, "fuerza piramide helms volumen intensidad progresion"],
  [/tirada|larga|kilometr|km|volumen semanal|subir/, "progresion pico sesion semanal"],
  [/suave|zona|ritmo|intensidad|80\/20|polariz|umbral/, "distribucion intensidad"],
  [/carga|acwr|aguda|cronica/, "carga aguda cronica acwr"],
];

const DOCS = (sections as StudySection[]).map((s) => ({ ...s, title_t: tokens(s.title), body_t: tokens(s.text) }));
const DF = new Map<string, number>();
for (const d of DOCS) for (const w of new Set([...d.title_t, ...d.body_t])) DF.set(w, (DF.get(w) ?? 0) + 1);
const idf = (w: string) => Math.log(1 + DOCS.length / (DF.get(w) ?? DOCS.length));
// los apartados largos repiten más palabras: se compensa (como en BM25) para que no ganen siempre
const AVG = DOCS.reduce((t, d) => t + d.body_t.length, 0) / Math.max(1, DOCS.length);

/** Los apartados del estudio que más tienen que ver con la consulta (como mucho `k` y `maxChars` en total). */
export function searchStudy(query: string, k = 3, maxChars = 3500): StudySection[] {
  const q = norm(query);
  const terms = new Set([...tokens(q), ...SYNONYMS.filter(([re]) => re.test(q)).flatMap(([, s]) => tokens(s))]);
  if (!terms.size) return [];
  const scored = DOCS.map((d) => {
    let score = 0;
    for (const w of terms) {
      const body = d.body_t.filter((x) => x === w).length / (0.4 + 0.6 * (d.body_t.length / AVG));
      const tf = body + 3 * d.title_t.filter((x) => x === w).length;
      if (tf) score += ((tf * 2.2) / (tf + 1.2)) * idf(w);
    }
    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const out: StudySection[] = [];
  let used = 0;
  for (const { d, score } of scored) {
    // lo que puntúa muy por debajo del mejor es ruido: mejor no mandarlo
    if (out.length >= k || score < scored[0].score * 0.45) break;
    const text = d.text.slice(0, 1500);
    if (used + text.length > maxChars && out.length) break;
    out.push({ id: d.id, title: d.title, text });
    used += text.length;
  }
  return out;
}

/** Formato para el contexto de la IA. */
export const studyFor = (query: string, k?: number) => {
  const found = searchStudy(query, k);
  return found.length ? found.map((s) => ({ apartado: s.title, texto: s.text })) : undefined;
};
