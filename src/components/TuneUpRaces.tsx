import { Card, Pill } from "@/components/ui";
import { TuneUpRaceForm } from "@/components/TuneUpRaceForm";
import { removeTuneUpRace } from "@/app/actions";
import { recoveryDaysAfter } from "@/lib/engine/planner";
import { fmtDuration, fmtKm } from "@/lib/format";
import { WEEKDAYS, diffDays, shortDate, weekday } from "@/lib/dates";
import type { Goal, TuneUpRace } from "@/lib/types";

const PILL: Record<TuneUpRace["priority"], string> = { A: "bg-ink text-surface", B: "bg-accent text-accent-ink", C: "bg-surface-2 text-ink-2" };

/** Temporada: la carrera principal, otros objetivos (A) y las de preparación (B y C), todas en orden. */
export function TuneUpRaces({ goal, races, today }: { goal: Goal; races: TuneUpRace[]; today: string }) {
  const upcoming = races.filter((r) => r.date >= today);
  const past = races.filter((r) => r.date < today);
  // el plan llega hasta el último objetivo: las B y C de después se quedan fuera
  const lastA = [goal.date, ...upcoming.filter((r) => r.priority === "A").map((r) => r.date)].sort().at(-1)!;
  const items = [{ main: true as const, date: goal.date }, ...upcoming.map((r) => ({ main: false as const, date: r.date, r }))].sort((a, b) => a.date.localeCompare(b.date));
  const when = (date: string, km: number) => `${WEEKDAYS[weekday(date)].slice(0, 3)} ${shortDate(date)} · ${fmtKm(km, 1)} km`;
  return (
    <Card title="Tu temporada" subtitle="A: objetivo · B: a tope · C: como entreno">
      <div className="space-y-3">
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {items.map((it) =>
            it.main ? (
              <li key="main" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-2 p-3">
                <Pill className={PILL.A}>A</Pill>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{goal.name}</strong>
                  <span className="text-xs text-muted">
                    {when(goal.date, goal.distanceKm)} · carrera principal · en {diffDays(goal.date, today)} días
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
                    {it.r.targetTimeSec ? ` · objetivo ${fmtDuration(it.r.targetTimeSec)}` : ""} · en {diffDays(it.r.date, today)} días
                  </span>
                  <span className="block text-xs text-ink-2">
                    {it.r.priority === "A"
                      ? `Objetivo: su propia preparación y afinamiento; después, ${recoveryDaysAfter(it.r.distanceKm)} días de recuperación.`
                      : it.r.date >= lastA
                        ? "Es después de tu último objetivo: no entra en este plan."
                        : it.r.priority === "B"
                          ? `A tope: afinamiento corto antes y ${recoveryDaysAfter(it.r.distanceKm)} días suaves después.`
                          : "Como entreno de calidad: solo el día antes y el de después suaves."}
                  </span>
                </span>
                <form action={removeTuneUpRace}>
                  <input type="hidden" name="id" value={it.r.id} />
                  <button className="text-xs text-muted underline hover:text-critical" aria-label={`Quitar ${it.r.name}`}>
                    Quitar
                  </button>
                </form>
              </li>
            ),
          )}
        </ul>
        {past.length > 0 && <p className="text-xs text-muted">Ya corridas: {past.map((r) => `${r.name} (${shortDate(r.date)})`).join(", ")}.</p>}
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">+ Añadir carrera</summary>
          <div className="mt-3">
            <TuneUpRaceForm today={today} maxDate={lastA} />
          </div>
        </details>
      </div>
    </Card>
  );
}
