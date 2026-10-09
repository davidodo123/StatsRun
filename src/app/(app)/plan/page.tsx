import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, Loading, Notice, PageHeader, Stat } from "@/components/ui";
import { SessionCard } from "@/components/SessionCard";
import { AiCoachButton } from "@/components/AiCoachButton";
import { UnavailableForm } from "@/components/UnavailableForm";
import { adaptIfMissed, coachConfig } from "@/lib/coach";
import { availableDaysOf } from "@/lib/engine/planner";
import { after } from "next/server";
import { requireUserId } from "@/lib/session";
import { trainingPaces } from "@/lib/engine/physiology";
import { fmtDuration, fmtPaceRange } from "@/lib/format";
import { WEEKDAYS, addDays, diffDays, mondayOf, shortDate, weekday } from "@/lib/dates";
import type { Phase } from "@/lib/types";
import { clearPlan, clearUnavailable, regeneratePlan } from "@/app/actions";

export const metadata: Metadata = { title: "Plan" };

const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };
const PHASE_BG: Record<Phase, string> = { base: "bg-s3", construccion: "bg-s1", especifico: "bg-s2", taper: "bg-muted" };

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/plan">["searchParams"] }) {
  const sp = await searchParams;
  const { db, matches, today, stats } = await getAnalysis();
  const plan = db.plan;
  if (!plan)
    return (
      <>
        <PageHeader title="Plan de entrenamiento" />
        <Empty title="Aún no tienes plan" href="/carreras" cta="Elegir carrera objetivo">
          {db.profile ? "Elige la carrera que quieres preparar y la fecha." : "Primero completa tu perfil y después elige tu carrera."}
        </Empty>
      </>
    );

  // si se han quedado sesiones sin hacer, la IA reprograma en segundo plano (máx. 1 vez al día)
  const uid = await requireUserId();
  after(() => adaptIfMissed(uid));
  const thisWeek = mondayOf(today);
  const blockedSoon = (db.unavailableDates ?? []).filter((d) => d >= today);
  const allSessions = [...(matches?.values() ?? [])];
  // sesiones ya pasadas + las de hoy que ya están registradas
  const past = allSessions.filter((m) => m.session.type !== "strength" && (m.session.date < today || (m.session.date === today && m.status !== "today")));
  const compliance = past.length ? past.reduce((s, m) => s + m.compliance, 0) / past.length : undefined;
  const paces = trainingPaces(plan.targetVdot);
  const curPaces = trainingPaces(plan.startVdot);
  const totalKm = plan.weeks.reduce((s, w) => s + w.targetKm, 0);
  const days = diffDays(plan.goal.date, today);
  const race = plan.weeks.at(-1)?.sessions.find((s) => s.type === "race");

  return (
    <>
      <PageHeader
        title={plan.goal.name}
        subtitle={`${shortDate(plan.goal.date)} · ${plan.weeks.length} semanas · creado el ${shortDate(plan.createdAt)}`}
        action={
          <div className="flex gap-2">
            <form action={regeneratePlan}>
              <button className="btn" title="Recalcula con tus últimos datos de Strava y tu perfil">
                ↻ Adaptar con mis datos
              </button>
            </form>
            <form action={clearPlan}>
              <button className="btn btn-ghost">Borrar</button>
            </form>
          </div>
        }
      />

      {sp.registrado && (
        <div className="mb-4">
          <Notice tone="good">Sesión registrada. El cumplimiento y tu forma ya están actualizados.</Notice>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Días para la carrera" value={Math.max(0, days)} />
        <Stat label="Tiempo previsto" value={race ? fmtDuration(race.durationMin * 60) : "–"} sub={plan.goal.targetTimeSec ? `Objetivo ${fmtDuration(plan.goal.targetTimeSec)}` : "Objetivo: terminar"} />
        <Stat label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub={stats ? `Hoy: ${stats.vdot.vdot.toFixed(1)}` : undefined} />
        <Stat label="Km totales del plan" value={Math.round(totalKm)} unit="km" />
        <Stat
          label="Cumplimiento"
          value={compliance !== undefined ? `${Math.round(compliance * 100)} %` : "–"}
          sub={past.length ? `${past.length} ${past.length === 1 ? "sesión" : "sesiones"} hasta hoy` : "Aún no hay sesiones pasadas"}
        />
      </div>

      {(plan.warnings.length > 0 || plan.notes.length > 0) && (
        <div className="mt-4 space-y-2">
          {plan.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          {plan.notes.map((n) => (
            <Notice key={n}>{n}</Notice>
          ))}
        </div>
      )}

      {/* Línea temporal de fases */}
      <Card className="mt-4" title="Periodización">
        <div className="flex gap-0.5" role="img" aria-label="Semanas del plan por fase">
          {plan.weeks.map((w) => (
            <a
              key={w.index}
              href={`#semana-${w.index + 1}`}
              title={`Semana ${w.index + 1} · ${PHASE_LABEL[w.phase]}${w.recovery ? " (descarga)" : ""} · ${w.targetKm} km`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="flex h-20 w-full items-end">
                <span
                  className={`w-full rounded-t ${PHASE_BG[w.phase]} ${w.recovery ? "opacity-50" : ""} ${w.start === thisWeek ? "ring-2 ring-accent" : ""}`}
                  style={{ height: `${Math.max(8, (w.targetKm / Math.max(...plan.weeks.map((x) => x.targetKm))) * 100)}%` }}
                />
              </span>
              <span className="hidden text-[10px] text-muted sm:block">{w.index + 1}</span>
            </a>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
          {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${PHASE_BG[p]}`} />
              {PHASE_LABEL[p]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted opacity-50" /> Descarga
          </span>
          <span>Altura = km de la semana</span>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {plan.weeks.map((w) => {
            const current = w.start === thisWeek;
            const ended = addDays(w.start, 6) < today;
            const done = w.sessions.map((s) => matches?.get(s.id)).filter((m) => m && m.session.type !== "strength");
            const doneKm = done.reduce((s, m) => s + (m?.doneKm ?? 0), 0);
            return (
              <details key={w.index} id={`semana-${w.index + 1}`} open={current} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-4">
                  <span className={`h-3 w-3 rounded-sm ${PHASE_BG[w.phase]}`} aria-hidden />
                  <span className="font-semibold">Semana {w.index + 1}</span>
                  <span className="text-sm text-ink-2">
                    {shortDate(w.start)} – {shortDate(addDays(w.start, 6))}
                  </span>
                  <span className="text-xs text-muted">
                    {PHASE_LABEL[w.phase]}
                    {w.recovery && " · descarga"}
                    {current && " · esta semana"}
                  </span>
                  <span className="ml-auto text-sm tabular">
                    {(ended || current) && doneKm > 0 && <span className="text-ink-2">{doneKm.toFixed(0)} / </span>}
                    <strong>{w.targetKm} km</strong>
                  </span>
                  <span className="text-muted transition group-open:rotate-90">›</span>
                </summary>
                <div className="space-y-2 border-t border-line p-4">
                  <p className="text-sm text-ink-2">{w.focus}</p>
                  {w.sessions.map((s) => (
                    <SessionCard key={s.id} s={s} match={matches?.get(s.id)} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card title="Entrenador IA" subtitle={coachConfig().configured ? `Modelo ${coachConfig().model}` : "Desactivado"}>
            {coachConfig().configured ? (
              <div className="space-y-3 text-sm text-ink-2">
                {db.coach?.summary ? <p>{db.coach.summary}</p> : <p>Aún no ha revisado tu plan.</p>}
                {db.coach?.updatedAt && (
                  <p className="text-xs text-muted">
                    Última revisión: {new Date(db.coach.updatedAt).toLocaleString("es-ES")} · {db.coach.changed} sesiones ajustadas
                  </p>
                )}
                {db.coach?.error && <Notice tone="warn">Último intento falló: {db.coach.error}</Notice>}
                <p className="text-xs text-muted">Se ejecuta solo cada vez que registras o importas un entreno, marcas días sin poder entrenar, dejas sesiones sin hacer o adaptas el plan. Reajusta y reprograma carrera y fuerza de los próximos 14 días.</p>
                <AiCoachButton />
              </div>
            ) : (
              <p className="text-sm text-ink-2">
                Añade <code>OPENROUTER_API_KEY</code> en <code>.env.local</code> para que la IA adapte tus entrenos.
              </p>
            )}
          </Card>
          <Card title="Disponibilidad" subtitle={db.profile ? `Entrenas: ${availableDaysOf(db.profile).map((d) => WEEKDAYS[d].slice(0, 3)).join(", ")}` : undefined}>
            <div className="space-y-3 text-sm">
              <p className="text-ink-2">
                ¿Un viaje, turno o imprevisto? Marca los días y las sesiones se mueven a tus días libres; la IA rehace la rutina. Para cambiar tus días fijos, ve a tu{" "}
                <Link href="/perfil" className="text-accent">
                  perfil
                </Link>
                .
              </p>
              <UnavailableForm today={today} />
              {blockedSoon.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {blockedSoon.map((d) => (
                    <li key={d}>
                      <form action={clearUnavailable} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs">
                        <input type="hidden" name="date" value={d} />
                        {WEEKDAYS[weekday(d)].slice(0, 3)} {shortDate(d)}
                        <button className="text-muted hover:text-critical" title="Vuelvo a estar disponible" aria-label={`Quitar ${d}`}>
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card title="Tus ritmos de entrenamiento" subtitle={`VDOT ${plan.startVdot.toFixed(1)} (inicio) → ${plan.targetVdot.toFixed(1)} (final)`}>
            <table className="w-full text-sm tabular">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Ritmo</th>
                  <th className="pb-2 font-medium">Ahora</th>
                  <th className="pb-2 font-medium">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(
                  [
                    ["E · Suave", "easy"],
                    ["M · Maratón", "marathon"],
                    ["T · Umbral", "threshold"],
                    ["I · Intervalos", "interval"],
                    ["R · Repeticiones", "repetition"],
                  ] as const
                ).map(([l, k]) => (
                  <tr key={k}>
                    <td className="py-2">{l}</td>
                    <td className="py-2">{fmtPaceRange(curPaces[k])}</td>
                    <td className="py-2">{fmtPaceRange(paces[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Ritmos de Jack Daniels. Cada vez que pulses «Adaptar con mis datos» se recalculan con tus mejores esfuerzos recientes.</p>
          </Card>
          <Card title="Cómo se adapta tu plan">
            <ul className="space-y-2 text-sm text-ink-2">
              <li>• Cada actividad de Strava se empareja con la sesión del día y calcula el % cumplido.</li>
              <li>• Al adaptar, el VDOT se recalcula con tus mejores esfuerzos de 90 días y el volumen con tu media real de 6 semanas.</li>
              <li>• El plan nunca sube más de un 10 % por semana e incluye descarga cada 4 semanas.</li>
              <li>
                • Revisa las alertas de carga en el <Link href="/" className="text-accent">inicio</Link>.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
