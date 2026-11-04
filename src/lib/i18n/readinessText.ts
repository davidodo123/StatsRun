// Motivos de «Estado de forma» (lib/engine/readiness.ts): el motor los escribe en español (también los lee la IA)
// y aquí se traducen al pintarlos. $1, $2… son los números del motivo; en inglés, con punto decimal.
import type { Locale } from "./index";

type Tr = Record<Exclude<Locale, "es">, string>;

const REASONS: [RegExp, Tr][] = [
  [/^Carga aguda muy por encima de la crónica \(ACWR ([\d.,]+) > 1,5\): riesgo de lesión\.$/, {
    en: "Acute load well above chronic (ACWR $1 > 1.5): injury risk.",
    ca: "Càrrega aguda molt per sobre de la crònica (ACWR $1 > 1,5): risc de lesió.",
    pt: "Carga aguda muito acima da crónica (ACWR $1 > 1,5): risco de lesão.",
    fr: "Charge aiguë bien au-dessus de la chronique (ACWR $1 > 1,5) : risque de blessure.",
  }],
  [/^Subida de carga reciente \(ACWR ([\d.,]+)\): el cuerpo está en fase de alarma\.$/, {
    en: "Recent load increase (ACWR $1): your body is in the alarm phase.",
    ca: "Pujada de càrrega recent (ACWR $1): el cos és en fase d'alarma.",
    pt: "Subida de carga recente (ACWR $1): o corpo está em fase de alarme.",
    fr: "Hausse de charge récente (ACWR $1) : le corps est en phase d'alarme.",
  }],
  [/^Carga reciente baja respecto a tu base \(ACWR ([\d.,]+)\)\.$/, {
    en: "Recent load is low compared with your base (ACWR $1).",
    ca: "Càrrega recent baixa respecte a la teva base (ACWR $1).",
    pt: "Carga recente baixa em relação à tua base (ACWR $1).",
    fr: "Charge récente faible par rapport à ta base (ACWR $1).",
  }],
  [/^Frescura muy negativa \(TSB (-?[\d.,]+)\): fatiga acumulada alta\.$/, {
    en: "Very negative freshness (TSB $1): high accumulated fatigue.",
    ca: "Frescor molt negatiu (TSB $1): fatiga acumulada alta.",
    pt: "Frescura muito negativa (TSB $1): fadiga acumulada alta.",
    fr: "Fraîcheur très négative (TSB $1) : fatigue accumulée élevée.",
  }],
  [/^Semana muy monótona \(monotonía ([\d.,]+) > 2\): alterna días duros y suaves\.$/, {
    en: "Very monotonous week (monotony $1 > 2): alternate hard and easy days.",
    ca: "Setmana molt monòtona (monotonia $1 > 2): alterna dies durs i suaus.",
    pt: "Semana muito monótona (monotonia $1 > 2): alterna dias duros e suaves.",
    fr: "Semaine très monotone (monotonie $1 > 2) : alterne jours durs et faciles.",
  }],
  [/^Rendimiento a la baja: entrenos que se hacen duros, piernas cargadas o más pulsaciones al mismo ritmo\.$/, {
    en: "Performance dropping: workouts feel hard, heavy legs or a higher heart rate at the same pace.",
    ca: "Rendiment a la baixa: entrenaments que es fan durs, cames carregades o més pulsacions al mateix ritme.",
    pt: "Rendimento em baixa: treinos que custam, pernas carregadas ou mais pulsações ao mesmo ritmo.",
    fr: "Performance en baisse : séances difficiles, jambes lourdes ou plus de pulsations à la même allure.",
  }],
  [/^Duermes poco: ([\d.,]+) h de media las últimas noches \(menos de 6,5 h\)\.$/, {
    en: "You're sleeping little: $1 h on average over the last nights (under 6.5 h).",
    ca: "Dorms poc: $1 h de mitjana les últimes nits (menys de 6,5 h).",
    pt: "Dormes pouco: $1 h de média nas últimas noites (menos de 6,5 h).",
    fr: "Tu dors peu : $1 h en moyenne ces dernières nuits (moins de 6,5 h).",
  }],
  [/^Mencionas mal descanso\.$/, { en: "You mention poor rest.", ca: "Esmentes mal descans.", pt: "Mencionas mau descanso.", fr: "Tu mentionnes un mauvais repos." }],
  [/^Pulso en reposo alto: ([\d.,]+) ppm frente a tus ([\d.,]+) habituales\.$/, {
    en: "High resting heart rate: $1 bpm vs your usual $2.",
    ca: "Pols en repòs alt: $1 ppm davant dels teus $2 habituals.",
    pt: "Pulsação em repouso alta: $1 ppm face às tuas $2 habituais.",
    fr: "Pouls au repos élevé : $1 bpm contre tes $2 habituels.",
  }],
  [/^VFC por debajo de tu rango normal: ([\d.,]+) ms de media en 7 días \(lo normal para ti, más de ([\d.,]+)\)\.$/, {
    en: "HRV below your normal range: $1 ms on average over 7 days (normal for you is above $2).",
    ca: "VFC per sota del teu rang normal: $1 ms de mitjana en 7 dies (el normal per a tu, més de $2).",
    pt: "VFC abaixo do teu intervalo normal: $1 ms de média em 7 dias (o normal para ti, mais de $2).",
    fr: "VFC sous ta plage normale : $1 ms en moyenne sur 7 jours (normal pour toi : plus de $2).",
  }],
  [/^Mencionas estrés fuera del entrenamiento: también cuenta como carga\.$/, {
    en: "You mention stress outside training: it counts as load too.",
    ca: "Esmentes estrès fora de l'entrenament: també compta com a càrrega.",
    pt: "Mencionas stress fora do treino: também conta como carga.",
    fr: "Tu mentionnes du stress en dehors de l'entraînement : ça compte aussi comme charge.",
  }],
  [/^Varias sesiones sin hacer \((\d+) en 14 días\)\.$/, {
    en: "Several sessions missed ($1 in 14 days).",
    ca: "Diverses sessions sense fer ($1 en 14 dies).",
    pt: "Várias sessões por fazer ($1 em 14 dias).",
    fr: "Plusieurs séances manquées ($1 en 14 jours).",
  }],
  [/^Mencionas falta de ganas\.$/, { en: "You mention low motivation.", ca: "Esmentes falta de ganes.", pt: "Mencionas falta de vontade.", fr: "Tu mentionnes un manque d'envie." }],
  [/^Hay molestias o dolor anotados\.$/, { en: "Niggles or pain have been noted.", ca: "Hi ha molèsties o dolor anotats.", pt: "Há incómodos ou dor anotados.", fr: "Des gênes ou douleurs ont été notées." }],
  [/^Mencionas síntomas de enfermedad: con fiebre o malestar general, descanso hasta 24 h sin fiebre\.$/, {
    en: "You mention symptoms of illness: with fever or feeling unwell, rest until 24 h without fever.",
    ca: "Esmentes símptomes de malaltia: amb febre o malestar general, descans fins a 24 h sense febre.",
    pt: "Mencionas sintomas de doença: com febre ou mal-estar geral, descanso até 24 h sem febre.",
    fr: "Tu mentionnes des symptômes de maladie : avec fièvre ou malaise général, repos jusqu'à 24 h sans fièvre.",
  }],
  [/^Los entrenos se te están haciendo fáciles: hay margen para progresar\.$/, {
    en: "Workouts are feeling easy: there's room to progress.",
    ca: "Els entrenaments se't fan fàcils: hi ha marge per progressar.",
    pt: "Os treinos estão a custar pouco: há margem para progredir.",
    fr: "Les séances te semblent faciles : il y a de la marge pour progresser.",
  }],
  [/^Ninguna sesión por encima de ([\d.,]+) km \(tu tirada más larga en 30 días \+ 10 %\)\.$/, {
    en: "No session over $1 km (your longest run in 30 days + 10%).",
    ca: "Cap sessió per sobre de $1 km (la teva tirada més llarga en 30 dies + 10 %).",
    pt: "Nenhuma sessão acima de $1 km (o teu longo mais comprido em 30 dias + 10 %).",
    fr: "Aucune séance au-delà de $1 km (ta sortie la plus longue sur 30 jours + 10 %).",
  }],
];

/** Un motivo en el idioma de la app (si no está en la tabla, tal cual). */
export function readinessText(reason: string, locale: Locale): string {
  if (locale === "es") return reason;
  for (const [re, tr] of REASONS) {
    const m = reason.match(re);
    if (!m) continue;
    // en inglés, coma decimal → punto
    const nums = m.slice(1).map((x) => (locale === "en" ? x.replace(",", ".") : x));
    return tr[locale].replace(/\$(\d)/g, (_, i) => nums[Number(i) - 1] ?? "");
  }
  return reason;
}

/** Para las pruebas: cada patrón tiene un ejemplo que tiene que traducirse. */
export const READINESS_PATTERNS = REASONS.map(([re]) => re);
