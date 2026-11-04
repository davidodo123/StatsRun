import { readDbNow, updateDb } from "@/lib/db";
import { mergeHealth, parseHealthPayload, todayMadrid } from "@/lib/health";
import { userForHealthToken } from "@/lib/healthToken";

const reply = (body: { ok: boolean; message?: string; error?: string }, status = 200) => Response.json(body, { status });

/**
 * Recibe los pasos y las calorías del día desde el atajo de Salud del iPhone.
 * Autenticación: cabecera "Authorization: Bearer rio_…" (la clave de Perfil → Pasos y calorías), sin cookie de sesión.
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const uid = token ? await userForHealthToken(token) : undefined;
  if (!uid) return reply({ ok: false, error: "Clave no válida. Crea una nueva en Zancavolt → Perfil → Pasos y calorías." }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > 200_000) return reply({ ok: false, error: "Demasiados datos." }, 413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "El cuerpo tiene que ser JSON." }, 400);
  }
  const today = todayMadrid();
  const parsed = parseHealthPayload(body, today);
  if ("error" in parsed) return reply({ ok: false, error: parsed.error }, 400);
  if (!(await readDbNow(uid)).healthTokenHash) return reply({ ok: false, error: "Clave revocada." }, 401);

  const saved = await updateDb((db) => {
    db.health = mergeHealth(db.health ?? [], parsed.days, today);
  }, uid);
  const days = [...parsed.days].sort((x, y) => x.date.localeCompare(y.date));
  return reply({ ok: true, message: savedMessage(days, saved.lang) });
}

// lo que sale en la notificación del atajo del iPhone, en el idioma de la app (antes, siempre en español)
const WORDS = {
  es: { steps: "pasos", kcal: "kcal activas", and: "y", day: "datos del día", saved: (n: number, a: string, b: string) => `${n} días guardados (del ${a} al ${b}). ` },
  en: { steps: "steps", kcal: "active kcal", and: "and", day: "day's data", saved: (n: number, a: string, b: string) => `${n} days saved (${a} to ${b}). ` },
  ca: { steps: "passos", kcal: "kcal actives", and: "i", day: "dades del dia", saved: (n: number, a: string, b: string) => `${n} dies desats (del ${a} al ${b}). ` },
  pt: { steps: "passos", kcal: "kcal ativas", and: "e", day: "dados do dia", saved: (n: number, a: string, b: string) => `${n} dias guardados (de ${a} a ${b}). ` },
  fr: { steps: "pas", kcal: "kcal actives", and: "et", day: "données du jour", saved: (n: number, a: string, b: string) => `${n} jours enregistrés (du ${a} au ${b}). ` },
} as const;

function savedMessage(days: { date: string; steps?: number; activeKcal?: number }[], lang?: string): string {
  const w = WORDS[(lang ?? "es") as keyof typeof WORDS] ?? WORDS.es;
  const intl = { es: "es-ES", en: "en-GB", ca: "ca-ES", pt: "pt-PT", fr: "fr-FR" }[(lang ?? "es") as keyof typeof WORDS] ?? "es-ES";
  const d = days.at(-1)!;
  const what = [d.steps !== undefined && `${d.steps.toLocaleString(intl)} ${w.steps}`, d.activeKcal !== undefined && `${d.activeKcal} ${w.kcal}`].filter(Boolean).join(` ${w.and} `);
  const range = days.length > 1 ? w.saved(days.length, days[0].date, d.date) : "";
  return `${range}${d.date}: ${what || w.day}.`;
}
