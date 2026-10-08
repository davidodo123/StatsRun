import type { Activity, SportKind } from "../types";

/** Fecha UTC → fecha y hora locales del equipo donde corre la app (la del atleta). */
export function localParts(d: Date): { date: string; startLocal: string } {
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return { date, startLocal: `${date}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` };
}

/** Deporte a partir de nombres de Strava (inglés o español), FIT o GPX. */
export function sportFromName(raw: string | undefined): SportKind {
  const s = (raw ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (!s) return "other";
  if (/run|carrera|correr|trail|running|jog/.test(s)) return "run";
  if (/ride|bici|cicl|cycling|bike|mtb|gravel|spinning/.test(s)) return "ride";
  if (/swim|nata/.test(s)) return "swim";
  if (/walk|camin|hike|senderismo|excursi|hiking/.test(s)) return "walk";
  if (/weight|pesas|workout|entrenamiento|crossfit|gym|fuerza|training|fitness|hiit|yoga|pilates/.test(s)) return "strength";
  return "other";
}

/** ¿Es la misma actividad? (mismo inicio ±3 min y distancia parecida) */
export function isSameActivity(a: Activity, b: Activity): boolean {
  if (a.date !== b.date) return false;
  const ta = new Date(`${a.startLocal}Z`).getTime();
  const tb = new Date(`${b.startLocal}Z`).getTime();
  if (Math.abs(ta - tb) > 3 * 60_000) return false;
  const d = Math.max(a.distanceM, b.distanceM);
  return d < 100 || Math.abs(a.distanceM - b.distanceM) / d < 0.05;
}

/** Fusiona actividades nuevas sin duplicar (por id o por inicio+distancia). */
export function mergeActivities(existing: Activity[], incoming: Activity[]): { merged: Activity[]; added: number; skipped: number } {
  const byId = new Map(existing.map((a) => [a.id, a]));
  const byDate = new Map<string, Activity[]>();
  for (const a of existing) byDate.set(a.date, [...(byDate.get(a.date) ?? []), a]);
  let added = 0;
  let skipped = 0;
  for (const a of incoming) {
    if (byId.has(a.id)) {
      byId.set(a.id, { ...byId.get(a.id)!, ...a });
      skipped++;
      continue;
    }
    if ((byDate.get(a.date) ?? []).some((b) => isSameActivity(a, b))) {
      skipped++;
      continue;
    }
    byId.set(a.id, a);
    byDate.set(a.date, [...(byDate.get(a.date) ?? []), a]);
    added++;
  }
  const merged = [...byId.values()].sort((x, y) => x.startLocal.localeCompare(y.startLocal));
  return { merged, added, skipped };
}

/** Hash corto y estable para generar ids a partir del contenido. */
export function shortHash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
