// Memoria de la IA: preferencias del atleta (que se mandan siempre) y sus valoraciones de las respuestas.
import type { AiArea, AiFeedback, AiPreference, Db } from "./types";

export const MAX_PREFERENCES = 40;
export const MAX_FEEDBACK = 200;

/** Regla común para las instrucciones de las tres IA. */
export const PREFERENCES_RULE = `PREFERENCIAS DEL ATLETA ("preferencias"): lo que te ha pedido o corregido otras veces. Respétalas SIEMPRE, por encima de tu criterio, salvo que choquen con la seguridad (dolor, enfermedad, diagnóstico de fatiga): en ese caso explícalo.`;

/** Texto de una preferencia, limpio: una frase, sin saltos y con tope de largo. */
export const cleanPreference = (raw: unknown) =>
  typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 200) : "";

/** Preferencias que recibe cada IA (las de su área y las de todas), de la más reciente a la más antigua. */
export function preferencesFor(db: Pick<Db, "aiPreferences">, area: "plan" | "fuerza"): string[] {
  return (db.aiPreferences ?? [])
    .filter((p) => p.area === "todas" || p.area === area)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((p) => p.text);
}

/** Añade preferencias sin repetir (ignora mayúsculas y puntos) y con tope: se quedan las más recientes. */
export function addPreferences(list: AiPreference[] = [], items: Omit<AiPreference, "id">[], newId: () => string): AiPreference[] {
  const key = (t: string) => t.toLowerCase().replace(/[.¡!¿?,;:\s]+/g, " ").trim();
  const out = [...list];
  for (const it of items) {
    const text = cleanPreference(it.text);
    if (text.length < 3 || out.some((p) => key(p.text) === key(text))) continue;
    out.push({ ...it, text, id: newId() });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_PREFERENCES);
}

/** La valoración que tiene una respuesta (la última). */
export const feedbackFor = (db: Pick<Db, "aiFeedback">, area: AiArea, ref: string | undefined): AiFeedback | undefined =>
  ref ? [...(db.aiFeedback ?? [])].reverse().find((f) => f.area === area && f.ref === ref) : undefined;

/** Regla común: cómo usar las respuestas que valoró. */
export const EXAMPLES_RULE = `VALORACIONES ("valoraciones", si vienen): respuestas tuyas anteriores que le gustaron ("gustaron": imita su tono, su longitud y su nivel de detalle) y que no ("noGustaron", con el motivo: no repitas ese error).`;

/** Las dos últimas respuestas de esa IA que le gustaron y las dos que no (con el motivo), para usarlas de ejemplo. */
export function ratedExamples(db: Pick<Db, "aiFeedback">, area: AiArea) {
  const list = (db.aiFeedback ?? []).filter((f) => f.area === area && f.response).reverse();
  const gustaron = list.filter((f) => f.rating === 1).slice(0, 2).map((f) => f.response!.slice(0, 600));
  const noGustaron = list
    .filter((f) => f.rating === -1)
    .slice(0, 2)
    .map((f) => ({ respuesta: f.response!.slice(0, 300), ...(f.reason ? { motivo: f.reason } : {}) }));
  return gustaron.length || noGustaron.length ? { gustaron, noGustaron } : undefined;
}

