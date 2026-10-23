// Texto de la notificación de cada mañana: lo que toca hoy en el plan (carrera y fuerza).
import type { Db, PlannedSession } from "./types";
import { fmtPaceRange } from "./format";

export interface PushMessage {
  title: string;
  body: string;
  url: string; // dónde se abre al tocarla
}

const what = (s: PlannedSession) => {
  const km = s.distanceKm > 0 ? `${s.distanceKm.toLocaleString("es-ES")} km` : `${s.durationMin} min`;
  // si el nombre ya lleva los km («Tirada larga 12 km»), no se repiten
  return s.type === "strength" || s.title.includes(km) ? s.title : `${s.title} · ${km}`;
};

/** Lo que toca hoy; sin plan, o en día de descanso sin aviso, nada. */
export function todayMessage(db: Pick<Db, "plan" | "push">, today: string): PushMessage | undefined {
  if (!db.plan) return;
  const sessions = db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date === today);
  if (!sessions.length) {
    if (!db.push?.restDays) return;
    return { title: "Hoy: descanso", body: "Hoy no toca entrenar. Recuperar también es entrenar.", url: "/plan/actual" };
  }
  const run = sessions.find((s) => s.type !== "strength");
  const race = sessions.find((s) => s.type === "race");
  if (race) return { title: `Hoy: ${race.title}`, body: "¡Día de carrera! Sal tranquilo y disfruta. Mucha suerte.", url: "/plan/actual" };
  const main = run ?? sessions[0];
  const extra = sessions.filter((s) => s !== main);
  const pace = main.pace && main.type !== "strength" ? `Ritmo ${fmtPaceRange(main.pace)}.` : "";
  const body = [pace, main.description, ...extra.map((s) => `Y además: ${what(s)}.`)].filter(Boolean).join(" ") || "Ábrelo para ver los pasos.";
  return { title: `Hoy: ${what(main)}`, body: body.length > 180 ? `${body.slice(0, 177)}…` : body, url: "/plan/actual" };
}
