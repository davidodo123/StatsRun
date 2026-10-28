// Texto de la notificación de cada mañana: lo que toca hoy en el plan (carrera y fuerza).
import type { Db, PlannedSession } from "./types";
import { fmtPaceRange } from "./format";
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
  const run = sessions.find((s) => s.type !== "strength");
  const race = sessions.find((s) => s.type === "race");
  if (race) return { title: t("push.hoy", { que: race.title }), body: t("push.carrera"), url: "/plan/actual" };
  const main = run ?? sessions[0];
  const extra = sessions.filter((s) => s !== main);
  const pace = main.pace && main.type !== "strength" ? t("push.ritmo", { r: fmtPaceRange(main.pace) }) : "";
  const body = [pace, planText(main.description, locale), ...extra.map((s) => t("push.ademas", { que: what(s, locale) }))].filter(Boolean).join(" ") || t("push.abrir");
  return { title: t("push.hoy", { que: what(main, locale) }), body: body.length > 180 ? `${body.slice(0, 177)}…` : body, url: "/plan/actual" };
}
