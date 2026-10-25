import Link from "next/link";
import type { Goal, Plan, PlannedSession } from "@/lib/types";
import type { SessionMatch } from "@/lib/engine/planner";
import { addDays, diffDays, mondayOf } from "@/lib/dates";
import { fmtKm, fmtPace } from "@/lib/format";
import { dayMonth, translator, weekdayDate, weekdayInitials, type Locale } from "@/lib/i18n";

// el nombre sin los km del final («Tirada larga 12 km»): los km ya van debajo, en grande
const heroTitle = (s: PlannedSession) => (s.type === "strength" ? s.title : s.title.replace(/\s*·?\s*\d+([.,]\d+)?\s*km$/i, "")) || s.title;
// cuanto más largo el nombre, más pequeña la letra (que no ocupe media pantalla)
const titleSize = (t: string) => (t.length <= 14 ? "text-6xl md:text-7xl" : t.length <= 22 ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl");

// a dónde lleva «Empezar»: correr, con el GPS; fuerza, al entreno de esa sesión
const startHref = (s: PlannedSession) => (s.type === "strength" ? `/fuerza/entreno?sesion=${encodeURIComponent(s.id)}` : "/registrar/gps");

/**
 * Lo primero de Inicio, estilo Volt: «Hoy toca» con la sesión en grande, los km en lima, «Empezar»,
 * la semana en barras (hecho en blanco, hoy en lima) y la cuenta atrás de la carrera.
 */
export function TodayHero({ plan, matches, today, goal, locale }: { plan: Plan; matches?: Map<string, SessionMatch>; today: string; goal?: Goal; locale: Locale }) {
  const t = translator(locale);
  const initials = weekdayInitials(locale);
  const week = plan.weeks.find((w) => today >= w.start && today <= addDays(w.start, 6));
  const sessions = plan.weeks.flatMap((w) => w.sessions);
  const todays = sessions.filter((s) => s.date === today);
  const main = todays.find((s) => s.type !== "strength") ?? todays[0];
  const extra = todays.filter((s) => s !== main);
  const done = main && matches?.get(main.id)?.status === "done";
  const next = main ? undefined : sessions.find((s) => s.date > today);

  // barras: km de carrera planeados por día; los días de solo fuerza, una barra corta
  const start = week?.start ?? mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const ofDay = (week?.sessions ?? []).filter((s) => s.date === date);
    const km = ofDay.reduce((t, s) => t + s.distanceKm, 0);
    const status = ofDay.map((s) => matches?.get(s.id)?.status);
    return { date, km, any: ofDay.length > 0, done: status.includes("done") || status.includes("partial") };
  });
  const maxKm = Math.max(1, ...days.map((d) => d.km));
  const doneKm = (week?.sessions ?? []).filter((s) => s.type !== "strength").reduce((t, s) => t + (matches?.get(s.id)?.doneKm ?? 0), 0);
  const daysToRace = goal ? diffDays(goal.date, today) : undefined;

  return (
    <section className="mb-6" aria-label={t("hoy.aria")}>
      {main ? (
        <>
          <p className="text-sm font-bold tracking-[0.2em] text-accent uppercase">{done ? t("hoy.hechoHoy") : t("hoy.hoyToca")}</p>
          <h2 className={`mt-1 font-display leading-[0.92] uppercase ${titleSize(heroTitle(main))}`}>{heroTitle(main)}</h2>
          {main.type !== "strength" && main.distanceKm > 0 ? (
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-[110px] leading-[0.85] text-accent tabular">{main.distanceKm.toLocaleString("es-ES")}</span>
              <span className="font-display text-4xl uppercase">km</span>
            </p>
          ) : (
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-[110px] leading-[0.85] text-accent tabular">{main.durationMin}</span>
              <span className="font-display text-4xl uppercase">min</span>
            </p>
          )}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            {main.pace && main.type !== "strength" && (
              <div>
                <dd className="text-xl font-bold text-ink tabular">{fmtPace((main.pace.fast + main.pace.slow) / 2)}</dd>
                <dt>{t("hoy.minKm")}</dt>
              </div>
            )}
            {main.type !== "strength" && (
              <div>
                <dd className="text-xl font-bold text-ink tabular">~{main.durationMin}</dd>
                <dt>{t("hoy.minutos")}</dt>
              </div>
            )}
            {main.zone && (
              <div>
                <dd className="text-xl font-bold text-ink">{main.zone}</dd>
                <dt>{t("hoy.zona")}</dt>
              </div>
            )}
          </dl>
          {extra.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink-2">{t("hoy.yAdemas", { sesiones: extra.map((s) => s.title).join(", ") })}</p>
              {/* la rutina de fuerza de hoy también se empieza desde aquí (el botón grande es para la carrera) */}
              {extra
                .filter((s) => s.type === "strength" && matches?.get(s.id)?.status !== "done")
                .map((s) => (
                  <Link key={s.id} href={startHref(s)} className="btn btn-ghost w-full py-3 text-sm tracking-wider uppercase">
                    {t(s.routineId ? "hoy.empezarRutina" : "hoy.empezarFuerza", { nombre: s.title })}
                  </Link>
                ))}
            </div>
          )}
          {done ? (
            <Link href="/plan/actual" className="btn btn-ghost mt-5 w-full py-4 text-base tracking-wider uppercase">
              {t("hoy.verEnPlan")}
            </Link>
          ) : (
            <Link href={startHref(main)} className="btn mt-5 w-full py-4 text-base tracking-wider uppercase">
              {t("hoy.empezar")}
            </Link>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-bold tracking-[0.2em] text-accent uppercase">{t("hoy.hoy")}</p>
          <h2 className="mt-1 font-display text-6xl leading-[0.92] uppercase">{t("hoy.descanso")}</h2>
          {next && (
            <p className="mt-3 text-ink-2">
              {next.date === addDays(today, 1) ? t("hoy.manana") : t("hoy.elDia", { dia: weekdayDate(next.date, locale) })}: <strong className="text-ink">{next.title}</strong>
            </p>
          )}
        </>
      )}

      {week && (
        <div className="mt-7 border-t border-line pt-4">
          <div className="flex justify-between text-xs font-semibold tracking-wider text-muted uppercase">
            <span>{t("hoy.semana")}</span>
            <span>
              <span className="text-ink">{Math.round(doneKm)}</span> / {week.targetKm} km
            </span>
          </div>
          <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden>
            {days.map((d) => (
              <div
                key={d.date}
                className={`flex-1 rounded-sm ${d.date === today ? "bg-accent" : d.done ? "bg-ink" : "bg-surface-2"}`}
                style={{ height: `${d.km > 0 ? Math.max(14, (d.km / maxKm) * 100) : d.any ? 10 : 4}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
            {days.map((d, i) => (
              <span key={d.date} className={d.date === today ? "font-bold text-accent" : ""}>
                {initials[i]}
              </span>
            ))}
          </div>
        </div>
      )}

      {goal && daysToRace !== undefined && daysToRace >= 0 && (
        <Link href="/plan/actual" className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
          <span className="min-w-0">
            <span className="block text-xs font-semibold tracking-wider text-muted uppercase">{goal.name}</span>
            <span className="font-bold">
              {fmtKm(goal.distanceKm, 1)} km · {dayMonth(goal.date, locale)}
            </span>
          </span>
          {/* número y «días» siempre juntos en una línea: con un nombre de carrera largo, «días» bajaba a otra */}
          <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-display text-4xl leading-none">{daysToRace}</span>
            <span className="text-base text-muted">{t("hoy.dias")}</span>
          </span>
        </Link>
      )}
    </section>
  );
}
