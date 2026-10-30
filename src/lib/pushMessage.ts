// Notificación de cada mañana, corta: «Hoy toca» y lo del plan de hoy (carrera y fuerza), sin pasos ni ritmos.
import type { Db, PlannedSession } from "./types";
import { intlLocale, isLocale, translator, type Locale, type T } from "./i18n";
import { planText } from "./i18n/planText";

export interface PushMessage {
  title: string;
  body: string;
  url: string; // dónde se abre al tocarla
}

const what = (s: PlannedSession, locale: Locale) => {
  const title = planText(s.title, locale);
  const km = s.distanceKm > 0 ? `${s.distanceKm.toLocaleString(intlLocale(locale))} km` : `${s.durationMin} min`;
  // si el nombre ya lleva los km («Tirada larga 12 km»), no se repiten
  return s.type === "strength" || title.includes(km) ? title : `${title} · ${km}`;
};

/** Lo que toca hoy; sin plan, o en día de descanso sin aviso, nada. */
export function todayMessage(db: Pick<Db, "plan" | "push" | "lang">, today: string): PushMessage | undefined {
  if (!db.plan) return;
  const locale: Locale = isLocale(db.lang) ? db.lang : "es";
  const t: T = translator(locale);
  const sessions = db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date === today);
  if (!sessions.length) {
    if (!db.push?.restDays) return;
    return { title: t("push.descanso"), body: t("push.descansoTexto"), url: "/plan/actual" };
  }
  const race = sessions.find((s) => s.type === "race");
  if (race) return { title: t("push.hoyToca"), body: t("push.carrera", { que: planText(race.title, locale) }), url: "/plan/actual" };
  // primero la carrera y luego la fuerza
  const ordered = [...sessions.filter((s) => s.type !== "strength"), ...sessions.filter((s) => s.type === "strength")];
  return { title: t("push.hoyToca"), body: ordered.map((s) => what(s, locale)).join(" + "), url: "/plan/actual" };
}
