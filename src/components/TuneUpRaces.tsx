import { Card, Pill } from "@/components/ui";
import { TuneUpRaceForm } from "@/components/TuneUpRaceForm";
import { removeTuneUpRace } from "@/app/actions";
import { recoveryDaysAfter } from "@/lib/engine/planner";
import { fmtDuration, fmtKm } from "@/lib/format";
import { WEEKDAYS, diffDays, shortDate, weekday } from "@/lib/dates";
import type { Goal, TuneUpRace } from "@/lib/types";

/** Temporada: la carrera principal y las secundarias (B y C) que se meten en su plan. */
export function TuneUpRaces({ goal, races, today }: { goal: Goal; races: TuneUpRace[]; today: string }) {
  const upcoming = races.filter((r) => r.date >= today);
  const past = races.filter((r) => r.date < today);
  return (
    <Card className="mt-4" title="Temporada" subtitle="Otras carreras antes de la principal. El plan las mete con su afinamiento y su recuperación.">
      <div className="space-y-3">
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {upcoming.map((r) => {
            const out = r.date >= goal.date;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <Pill className={r.priority === "B" ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2"}>{r.priority}</Pill>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{r.name}</strong>
                  <span className="text-xs text-muted">
                    {WEEKDAYS[weekday(r.date)].slice(0, 3)} {shortDate(r.date)} · {fmtKm(r.distanceKm, 1)} km
                    {r.targetTimeSec ? ` · objetivo ${fmtDuration(r.targetTimeSec)}` : ""} · en {diffDays(r.date, today)} días
                  </span>
                  <span className="block text-xs text-ink-2">
                    {out
                      ? "Es después de la carrera principal: no entra en este plan."
                      : r.priority === "B"
                        ? `A tope: afinamiento corto antes y ${recoveryDaysAfter(r.distanceKm)} días suaves después.`
                        : "Como entreno de calidad: solo el día antes y el de después suaves."}
                  </span>
                </span>
                <form action={removeTuneUpRace}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-muted underline hover:text-critical" aria-label={`Quitar ${r.name}`}>
                    Quitar
                  </button>
                </form>
              </li>
            );
          })}
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-2 p-3">
            <Pill className="bg-ink text-surface">A</Pill>
            <span className="min-w-0 flex-1">
              <strong className="block truncate">{goal.name}</strong>
              <span className="text-xs text-muted">
                {WEEKDAYS[weekday(goal.date)].slice(0, 3)} {shortDate(goal.date)} · {fmtKm(goal.distanceKm, 1)} km · carrera principal
              </span>
            </span>
          </li>
        </ul>
        {past.length > 0 && <p className="text-xs text-muted">Ya corridas: {past.map((r) => `${r.name} (${shortDate(r.date)})`).join(", ")}.</p>}
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">+ Añadir carrera</summary>
          <div className="mt-3">
            <TuneUpRaceForm today={today} maxDate={goal.date} />
          </div>
        </details>
      </div>
    </Card>
  );
}
