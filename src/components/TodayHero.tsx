import Link from "next/link";
import type { ReactNode } from "react";
import type { Goal, Plan, PlannedSession } from "@/lib/types";
import type { SessionMatch } from "@/lib/engine/planner";
import { addDays, diffDays, mondayOf } from "@/lib/dates";
import { fmtKm, fmtPace } from "@/lib/format";
import { dayMonth, intlLocale, translator, weekdayDate, type Locale } from "@/lib/i18n";
import { Icon } from "./icons";
import { HeroWeek } from "./HeroWeek";
import type { WeekBarDay } from "./WeekBars";
import { RestStretches } from "./RestStretches";
import { planText } from "@/lib/i18n/planText";

// el nombre sin los km del final («Tirada larga 12 km»): los km ya van debajo, en grande
// «7×(3′+1.5′)» no se parte en dos líneas: unión invisible antes del «+»
const heroTitle = (s: PlannedSession, locale: Locale) => {
  const title = planText(s.title, locale);
  return ((s.type === "strength" ? title : title.replace(/\s*·?\s*\d+([.,]\d+)?\s*km$/i, "")) || title).replace(/(['′])\+/g, "$1⁠+");
};
// cuanto más largo el nombre, más pequeña la letra (que no ocupe media pantalla)
const titleSize = (t: string) => (t.length <= 14 ? "text-6xl md:text-7xl" : t.length <= 22 ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl");

// a dónde lleva «Empezar»: correr, con el GPS; fuerza, al entreno de esa sesión
const startHref = (s: PlannedSession) => (s.type === "strength" ? `/fuerza/entreno?sesion=${encodeURIComponent(s.id)}` : "/registrar/gps");

// «jueves 6 nov» → «Jueves 6 nov»
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Lo primero de Inicio, estilo Volt: «Hoy toca» con la sesión en grande, los km en lima, «Empezar»,
 * la semana en barras (hecho en blanco, hoy en lima) y la cuenta atrás de la carrera.
 * Al tocar otro día de la semana, lo grande de arriba pasa a ser ese día (con «Volver a hoy»).
 */
export function TodayHero({ plan, matches, today, goal, locale }: { plan: Plan; matches?: Map<string, SessionMatch>; today: string; goal?: Goal; locale: Locale }) {
  const t = translator(locale);
  const week = plan.weeks.find((w) => today >= w.start && today <= addDays(w.start, 6));
  const sessions = plan.weeks.flatMap((w) => w.sessions);

  // barras: km de carrera planeados por día; los días de solo fuerza, una barra corta
  const start = week?.start ?? mondayOf(today);
  const days: WeekBarDay[] = week
    ? Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const ofDay = week.sessions.filter((s) => s.date === date);
        const km = ofDay.reduce((t, s) => t + s.distanceKm, 0);
        const status = ofDay.map((s) => matches?.get(s.id)?.status);
        return {
          date,
          km,
          any: ofDay.length > 0,
          done: status.includes("done") || status.includes("partial"),
          // lo que se ve al tocar la barra de ese día
          sessions: ofDay.map((s) => ({
            id: s.id,
            title: planText(s.title, locale),
            km: s.distanceKm,
            min: s.durationMin,
            strength: s.type === "strength",
            routine: Boolean(s.routineId),
            status: matches?.get(s.id)?.status,
          })),
        };
      })
    : [];
  const doneKm = (week?.sessions ?? []).filter((s) => s.type !== "strength").reduce((t, s) => t + (matches?.get(s.id)?.doneKm ?? 0), 0);
  const daysToRace = goal ? diffDays(goal.date, today) : undefined;

  // lo grande de cada día de la semana (y de hoy, aunque el plan no tenga esta semana)
  const heroes: Record<string, ReactNode> = {};
  for (const date of new Set([today, ...days.map((d) => d.date)])) heroes[date] = <DayHero date={date} sessions={sessions} matches={matches} today={today} locale={locale} />;

  return (
    <section className="mb-6" aria-label={t("hoy.aria")}>
      <HeroWeek
        heroes={heroes}
        days={days}
        today={today}
        locale={locale}
        backLabel={t("hoy.volverHoy")}
        weekHeader={
          week && (
            <div className="flex justify-between text-xs font-semibold tracking-wider text-muted uppercase">
              <span>{t("hoy.semana")}</span>
              <span>
                <span className="text-ink">{Math.round(doneKm)}</span> / {week.targetKm} km
              </span>
            </div>
          )
        }
      />

      {goal && daysToRace !== undefined && daysToRace >= 0 && (
        <Link href="/plan/actual" className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
          <span className="min-w-0">
            <span className="block text-xs font-semibold tracking-wider text-muted uppercase">{goal.name}</span>
            <span className="font-bold">
              {fmtKm(goal.distanceKm, 1, locale)} km · {dayMonth(goal.date, locale)}
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

/** Lo grande de un día: su sesión principal (km o minutos en lima, ritmo, zona), lo demás de ese día y el botón. */
function DayHero({ date, sessions, matches, today, locale }: { date: string; sessions: PlannedSession[]; matches?: Map<string, SessionMatch>; today: string; locale: Locale }) {
  const t = translator(locale);
  const isToday = date === today;
  const ofDay = sessions.filter((s) => s.date === date);
  const main = ofDay.find((s) => s.type !== "strength") ?? ofDay[0];
  const extra = ofDay.filter((s) => s !== main);
  const status = main ? matches?.get(main.id)?.status : undefined;
  const done = status === "done";
  const STATUS: Partial<Record<NonNullable<typeof status>, string>> = { done: t("sesion.hecho"), partial: t("sesion.parcial"), missed: t("sesion.noRealizado") };
  // hoy: «Hoy toca» / «Hecho hoy»; otro día: «Jueves 6 nov», y si ya pasó, cómo fue
  const eyebrow = isToday ? (main ? (done ? t("hoy.hechoHoy") : t("hoy.hoyToca")) : t("hoy.hoy")) : [cap(weekdayDate(date, locale)), status && STATUS[status]].filter(Boolean).join(" · ");

  if (!main) {
    const next = isToday ? sessions.find((s) => s.date > today) : undefined;
    return (
      <>
        <p className="text-sm font-bold tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
        <h2 className="mt-1 font-display text-6xl leading-none tracking-[0.03em] uppercase">{t("hoy.descanso")}</h2>
        {next && (
          <p className="mt-3 text-ink-2">
            {next.date === addDays(today, 1) ? t("hoy.manana") : t("hoy.elDia", { dia: weekdayDate(next.date, locale) })}: <strong className="text-ink">{planText(next.title, locale)}</strong>
          </p>
        )}
        {isToday && <RestStretches locale={locale} />}
      </>
    );
  }

  return (
    <>
      <p className="text-sm font-bold tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
      <h2 className={`mt-1 font-display leading-none tracking-[0.03em] uppercase ${titleSize(heroTitle(main, locale))}`}>{heroTitle(main, locale)}</h2>
      {main.type !== "strength" && main.distanceKm > 0 ? (
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-[110px] leading-[0.85] text-accent tabular">{main.distanceKm.toLocaleString(intlLocale(locale))}</span>
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
            <dd className="text-xl font-bold text-ink">{planText(main.zone, locale)}</dd>
            <dt>{t("hoy.zona")}</dt>
          </div>
        )}
      </dl>
      {extra.length > 0 && (
        <div className="mt-4 space-y-2">
          {/* la fuerza de ese día, en una fila (con su botón corto solo hoy; el grande es para la carrera); lo demás, en texto */}
          {extra.map((s) =>
            s.type === "strength" && matches?.get(s.id)?.status !== "done" ? (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <Icon name="dumbbell" className="h-5 w-5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">{t("hoy.ademas")}</span>
                  <strong className="block truncate text-sm text-ink">{planText(s.title, locale)}</strong>
                </span>
                {isToday && (
                  <Link href={startHref(s)} className="btn btn-ghost shrink-0 px-4 py-2 text-sm" aria-label={t(s.routineId ? "hoy.empezarRutina" : "hoy.empezarFuerza", { nombre: planText(s.title, locale) })}>
                    {t("hoy.empezar")}
                  </Link>
                )}
              </div>
            ) : (
              <p key={s.id} className="text-sm text-ink-2">
                {t("hoy.yAdemas", { sesiones: planText(s.title, locale) })}
              </p>
            ),
          )}
        </div>
      )}
      {/* «Empezar» solo hoy; los demás días (y lo ya hecho), al plan */}
      {isToday && !done ? (
        <Link href={startHref(main)} className="btn mt-5 w-full py-4 text-base tracking-wider uppercase">
          {t("hoy.empezar")}
        </Link>
      ) : (
        <Link href="/plan/actual" className="btn btn-ghost mt-5 w-full py-4 text-base tracking-wider uppercase">
          {t("hoy.verEnPlan")}
        </Link>
      )}
    </>
  );
}
