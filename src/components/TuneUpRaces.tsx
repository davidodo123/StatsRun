import { Card, Pill } from "@/components/ui";
import { TuneUpRaceForm } from "@/components/TuneUpRaceForm";
import { removeTuneUpRace } from "@/app/actions";
import { recoveryDaysAfter } from "@/lib/engine/planner";
import { fmtDuration, fmtKm } from "@/lib/format";
import { diffDays } from "@/lib/dates";
import { dayMonth, shortWeekdayDate, translator, type Locale } from "@/lib/i18n";
import type { Goal, TuneUpRace } from "@/lib/types";

// «lun 26 oct» → «Lun 26 oct»
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PILL: Record<TuneUpRace["priority"], string> = { A: "bg-ink text-surface", B: "bg-accent text-accent-ink", C: "bg-surface-2 text-ink-2" };

/** Temporada: la carrera principal, otros objetivos (A) y las de preparación (B y C), todas en orden. */
export function TuneUpRaces({ goal, races, today, locale = "es" }: { goal: Goal; races: TuneUpRace[]; today: string; locale?: Locale }) {
  const t = translator(locale);
  const upcoming = races.filter((r) => r.date >= today);
  const past = races.filter((r) => r.date < today);
  // el plan llega hasta el último objetivo: las B y C de después se quedan fuera
  const lastA = [goal.date, ...upcoming.filter((r) => r.priority === "A").map((r) => r.date)].sort().at(-1)!;
  const items = [{ main: true as const, date: goal.date }, ...upcoming.map((r) => ({ main: false as const, date: r.date, r }))].sort((a, b) => a.date.localeCompare(b.date));
  const when = (date: string, km: number) => `${cap(shortWeekdayDate(date, locale))} · ${fmtKm(km, 1, locale)} km`;
  return (
    <Card title={t("car.temporada")} subtitle={t("car.temporadaSub")}>
      <div className="space-y-3">
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {items.map((it) =>
            it.main ? (
              <li key="main" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-2 p-3">
                <Pill className={PILL.A}>A</Pill>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{goal.name}</strong>
                  <span className="text-xs text-muted">
                    {when(goal.date, goal.distanceKm)} · {t("car.principal")} · {t("car.enDias", { n: diffDays(goal.date, today) })}
                  </span>
                </span>
              </li>
            ) : (
              <li key={it.r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 p-3 ${it.r.priority === "A" ? "bg-surface-2" : ""}`}>
                <Pill className={PILL[it.r.priority]}>{it.r.priority}</Pill>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{it.r.name}</strong>
                  <span className="text-xs text-muted">
                    {when(it.r.date, it.r.distanceKm)}
                    {it.r.targetTimeSec ? ` · ${t("car.objetivo", { t: fmtDuration(it.r.targetTimeSec) })}` : ""} · {t("car.enDias", { n: diffDays(it.r.date, today) })}
                  </span>
                  <span className="block text-xs text-ink-2">
                    {it.r.priority === "A"
                      ? t("car.expA", { n: recoveryDaysAfter(it.r.distanceKm) })
                      : it.r.date >= lastA
                        ? t("car.expTarde")
                        : it.r.priority === "B"
                          ? t("car.expB", { n: recoveryDaysAfter(it.r.distanceKm) })
                          : t("car.expC")}
                  </span>
                </span>
                <form action={removeTuneUpRace}>
                  <input type="hidden" name="id" value={it.r.id} />
                  <button className="text-xs text-muted underline hover:text-critical" aria-label={t("car.quitarAria", { nombre: it.r.name })}>
                    {t("car.quitar")}
                  </button>
                </form>
              </li>
            ),
          )}
        </ul>
        {past.length > 0 && <p className="text-xs text-muted">{t("car.yaCorridas", { lista: past.map((r) => `${r.name} (${dayMonth(r.date, locale)})`).join(", ") })}</p>}
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">{t("car.anadir")}</summary>
          <div className="mt-3">
            <TuneUpRaceForm today={today} maxDate={lastA} locale={locale} />
          </div>
        </details>
      </div>
    </Card>
  );
}
