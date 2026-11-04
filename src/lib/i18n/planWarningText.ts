// Avisos del plan (lib/engine/planner.ts): el motor los escribe en español (también los lee la IA) y aquí se traducen al
// pintarlos. $1, $2… son las partes variables (nombres, números, tiempos).
import type { Locale } from "./index";

type Tr = Record<Exclude<Locale, "es">, string>;

const WARNINGS: [RegExp, Tr][] = [
  [/^(.+) está a (\d+) días de (.+): competir a tope tan cerca resta frescura\. Mejor córrela como C \(entreno\)\.$/, {
    en: "$1 is $2 days from $3: racing all-out that close costs freshness. Better run it as a C race (training).",
    ca: "$1 és a $2 dies de $3: competir a fons tan a prop resta frescor. Millor corre-la com a C (entrenament).",
    pt: "$1 está a $2 dias de $3: competir a fundo tão perto tira frescura. Melhor corrê-la como C (treino).",
    fr: "$1 est à $2 jours de $3 : courir à fond si près coûte de la fraîcheur. Mieux vaut la courir en C (entraînement).",
  }],
  [/^Quedan (\d+) semanas; para esta distancia se recomiendan al menos (\d+)\. El plan prioriza llegar sano sobre mejorar marca\.$/, {
    en: "$1 weeks left; at least $2 are recommended for this distance. The plan puts arriving healthy before a faster time.",
    ca: "Queden $1 setmanes; per a aquesta distància se'n recomanen almenys $2. El pla prioritza arribar sa per sobre de millorar marca.",
    pt: "Faltam $1 semanas; para esta distância recomendam-se pelo menos $2. O plano dá prioridade a chegar são em vez de melhorar a marca.",
    fr: "Il reste $1 semaines ; pour cette distance, on en conseille au moins $2. Le plan privilégie d'arriver en forme plutôt que le chrono.",
  }],
  [/^Un maratón partiendo de cero es muy exigente: lo ideal es 6\+ meses y haber hecho antes una media maratón\.$/, {
    en: "A marathon from scratch is very demanding: ideally 6+ months and a half marathon done first.",
    ca: "Una marató partint de zero és molt exigent: l'ideal és 6+ mesos i haver fet abans una mitja marató.",
    pt: "Uma maratona a partir do zero é muito exigente: o ideal são 6+ meses e ter feito antes uma meia maratona.",
    fr: "Un marathon en partant de zéro est très exigeant : l'idéal, c'est 6 mois et plus et avoir déjà couru un semi.",
  }],
  [/^IMC ([\d.,]+): progresión más conservadora y bloques de caminar-correr para cuidar articulaciones\. Consulta con tu médico antes de empezar\.$/, {
    en: "BMI $1: more conservative progression and walk-run blocks to look after your joints. Check with your doctor before starting.",
    ca: "IMC $1: progressió més conservadora i blocs de caminar-córrer per cuidar les articulacions. Consulta el teu metge abans de començar.",
    pt: "IMC $1: progressão mais conservadora e blocos de caminhar-correr para cuidar das articulações. Consulta o teu médico antes de começar.",
    fr: "IMC $1 : progression plus prudente et blocs marche-course pour ménager les articulations. Consulte ton médecin avant de commencer.",
  }],
  [/^Lesiones indicadas \("(.+)"\): ante dolor, cambia la sesión por bici\/elíptica y consulta a un fisio\.$/, {
    en: 'Injuries noted ("$1"): if it hurts, swap the session for bike/elliptical and see a physio.',
    ca: 'Lesions indicades ("$1"): davant de dolor, canvia la sessió per bici/el·líptica i consulta un fisio.',
    pt: 'Lesões indicadas ("$1"): perante dor, troca a sessão por bicicleta/elíptica e consulta um fisioterapeuta.',
    fr: 'Blessures indiquées (« $1 ») : en cas de douleur, remplace la séance par du vélo/elliptique et consulte un kiné.',
  }],
  [/^Objetivo ambicioso: (\S+) exige VDOT ([\d.,]+) y tu proyección es ([\d.,]+) \(≈ (\S+)\)\. Los ritmos se ajustan a lo realista; si mejoras más rápido, regenera el plan\.$/, {
    en: "Ambitious goal: $1 needs a VDOT of $2 and your projection is $3 (≈ $4). Paces are set to what's realistic; if you improve faster, regenerate the plan.",
    ca: "Objectiu ambiciós: $1 demana VDOT $2 i la teva projecció és $3 (≈ $4). Els ritmes s'ajusten al que és realista; si millores més de pressa, regenera el pla.",
    pt: "Objetivo ambicioso: $1 exige VDOT $2 e a tua projeção é $3 (≈ $4). Os ritmos ajustam-se ao realista; se melhorares mais depressa, regenera o plano.",
    fr: "Objectif ambitieux : $1 demande un VDOT de $2 et ta projection est de $3 (≈ $4). Les allures sont réglées sur le réaliste ; si tu progresses plus vite, régénère le plan.",
  }],
  [/^(.+) es muy poco después de otra carrera: entre las dos, solo recuperar\.$/, {
    en: "$1 comes very soon after another race: in between, just recover.",
    ca: "$1 és molt poc després d'una altra cursa: entre les dues, només recuperar.",
    pt: "$1 é muito pouco depois de outra prova: entre as duas, só recuperar.",
    fr: "$1 arrive très peu après une autre course : entre les deux, récupération uniquement.",
  }],
];

/** Un aviso del plan en el idioma de la app (si no está en la tabla, tal cual). */
export function planWarningText(text: string, locale: Locale): string {
  if (locale === "es") return text;
  for (const [re, tr] of WARNINGS) {
    const m = text.match(re);
    if (!m) continue;
    const parts = m.slice(1).map((x) => (locale === "en" && /^[\d.,]+$/.test(x) ? x.replace(",", ".") : x));
    return tr[locale].replace(/\$(\d)/g, (_, i) => parts[Number(i) - 1] ?? "");
  }
  return text;
}

export const PLAN_WARNING_PATTERNS = WARNINGS.map(([re]) => re);
