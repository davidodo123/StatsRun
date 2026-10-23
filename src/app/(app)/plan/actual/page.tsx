import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, FoldCard, Loading, MoreMenu, Notice, PageHeader, Stat, StatGroup } from "@/components/ui";
import { SessionCard } from "@/components/SessionCard";
import { AiCoachButton } from "@/components/AiCoachButton";
import { StrengthCoachCard } from "@/components/StrengthCoachCard";
import { ReadinessCard } from "@/components/ReadinessCard";
import { RaceCard } from "@/components/RaceCard";
import { assessReadiness } from "@/lib/engine/readiness";
import { UnavailableForm } from "@/components/UnavailableForm";
import { adaptIfMissed, coachConfig, strengthModel } from "@/lib/coach";
import { availableDaysOf, planTitle } from "@/lib/engine/planner";
import { after } from "next/server";
import { requireViewerId } from "@/lib/session";
import { trainingPaces } from "@/lib/engine/physiology";
import { fmtDuration, fmtPaceRange } from "@/lib/format";
import { WEEKDAYS, addDays, diffDays, mondayOf, shortDate, weekday } from "@/lib/dates";
import type { Phase } from "@/lib/types";
import { clearPlan, clearUnavailable } from "@/app/actions";
import { AdaptPlanButton } from "@/components/AdaptPlanButton";
import { UndoSkip } from "@/components/UndoSkip";
import { AiRating } from "@/components/AiRating";
import { feedbackFor } from "@/lib/aiMemory";

export const metadata: Metadata = { title: "Plan" };
// crear las rutinas con IA puede tardar un minuto (las acciones de la página heredan este límite)
export const maxDuration = 180;

const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };
const PHASE_BG: Record<Phase, string> = { base: "bg-s3", construccion: "bg-s1", especifico: "bg-s2", taper: "bg-muted" };

export default function PlanPage({ searchParams }: PageProps<"/plan/actual">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

// el aviso depende de la dirección: aparte, para que el resto del plan no espere a ella (y se pueda precargar)
async function SavedNotice({ searchParams }: { searchParams: PageProps<"/plan/actual">["searchParams"] }) {
  if (!(await searchParams).registrado) return null;
  return (
    <div className="mb-4">
      <Notice tone="good">Sesión registrada. El cumplimiento y tu forma ya están actualizados.</Notice>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/plan/actual">["searchParams"] }) {
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
  const uid = await requireViewerId();
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
  const race = plan.weeks.at(-1)?.sessions.find((s) => s.type === "race" && s.date === plan.goal.date);

  return (
    <>
      <BackLink href="/plan" />
      <PageHeader
        title={planTitle(plan)}
        subtitle={`${shortDate(plan.goal.date)} · ${plan.weeks.length} semanas · creado el ${shortDate(plan.createdAt)}`}
        action={
          <div className="flex max-w-md flex-wrap gap-2">
            <AdaptPlanButton />
            <MoreMenu>
              <form action={clearPlan}>
                <button title="Pasa a «Planes anteriores»">Terminar plan</button>
              </form>
            </MoreMenu>
          </div>
        }
      />

      <UndoSkip db={db} today={today} />
      <Suspense fallback={null}>
        <SavedNotice searchParams={searchParams} />
      </Suspense>
      <StatGroup className="md:grid-cols-5">
        <Stat label="Días para la carrera" value={Math.max(0, days)} accent />
        <Stat label="Tiempo previsto" value={race ? fmtDuration(race.durationMin * 60) : "–"} sub={plan.goal.targetTimeSec ? `Objetivo ${fmtDuration(plan.goal.targetTimeSec)}` : "Objetivo: terminar"} />
        <Stat label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub={stats ? `Hoy: ${stats.vdot.vdot.toFixed(1)}` : undefined} />
        <Stat label="Km totales del plan" value={Math.round(totalKm)} unit="km" />
        <Stat
          label="Cumplimiento"
          value={compliance !== undefined ? `${Math.round(compliance * 100)} %` : "–"}
          sub={past.length ? `${past.length} ${past.length === 1 ? "sesión" : "sesiones"} hasta hoy` : "Aún no hay sesiones pasadas"}
        />
      </StatGroup>

      {/* los avisos, plegados: solo se leen si se quiere */}
      {plan.warnings.length > 0 && (
        <details className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold">
            {plan.warnings.length === 1 ? "1 aviso del plan" : `${plan.warnings.length} avisos del plan`}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
            {plan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      {db.goal && <RaceCard goal={db.goal} />}

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
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                  {/* los días marcados como «no puedo» de esta semana: así se ve por qué falta una sesión */}
                  {(db.unavailableDates ?? [])
                    .filter((d) => d >= w.start && d <= addDays(w.start, 6))
                    .map((d) => (
                      <form key={d} action={clearUnavailable} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line px-3 py-2 text-sm">
                        <input type="hidden" name="date" value={d} />
                        <span className="text-ink-2">
                          <strong className="text-ink">
                            {WEEKDAYS[weekday(d)]} {shortDate(d)}
                          </strong>{" "}
                          · marcado como «no puedo»
                        </span>
                        {d >= today && <button className="text-xs font-semibold text-accent">Vuelvo a estar disponible</button>}
                      </form>
                    ))}
                  {w.sessions.map((s) => (
                    <SessionCard key={s.id} s={s} match={matches?.get(s.id)} today={today} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>

        <div className="space-y-4">
          {stats && (
            <ReadinessCard
              r={assessReadiness({
                stats,
                activities: db.activities,
                today,
                missed14d: [...(matches?.values() ?? [])].filter((m) => m.status === "missed" && m.session.date < today && diffDays(today, m.session.date) <= 14).length,
                raceDate: plan.goal.date,
                health: db.health,
              })}
            />
          )}
          <Card title="Entrenador IA" subtitle={coachConfig().configured ? `Modelo ${coachConfig().model}` : "Desactivado"}>
            {coachConfig().configured ? (
              <div className="space-y-3 text-sm text-ink-2">
                {db.coach?.summary ? <p>{db.coach.summary}</p> : <p>Aún no ha revisado tu plan.</p>}
                {db.coach?.summary && <AiRating area="plan" refId={db.coach.updatedAt} rating={feedbackFor(db, "plan", db.coach.updatedAt)?.rating} />}
                {db.coach?.updatedAt && (
                  <p className="text-xs text-muted">
                    Última revisión: {new Date(db.coach.updatedAt).toLocaleString("es-ES")} · {db.coach.changed} sesiones ajustadas
                  </p>
                )}
                {db.coach?.error && <Notice tone="warn">Último intento falló: {db.coach.error}</Notice>}
                <AiCoachButton />
                <Link href="/entrenador" className="block text-xs font-semibold text-accent">
                  Pídele un cambio del plan en el chat →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-ink-2">
                Añade <code>OPENROUTER_API_KEY</code> en <code>.env.local</code> para que la IA adapte tus entrenos.
              </p>
            )}
          </Card>
          <Card title="Fuerza con IA" subtitle="Rutinas con tu material">
            <StrengthCoachCard
              material={db.strengthCoach?.material}
              ability={db.strengthCoach?.ability}
              summary={db.strengthCoach?.summary}
              refId={db.strengthCoach?.summary ? db.strengthCoach.updatedAt : undefined}
              rating={feedbackFor(db, "fuerza", db.strengthCoach?.updatedAt)?.rating}
              routines={(db.routines ?? []).filter((r) => r.source === "ia").map((r) => ({ id: r.id, name: r.name }))}
              model={strengthModel()}
            />
          </Card>
          <FoldCard
            title="Disponibilidad"
            subtitle={
              blockedSoon.length
                ? `${blockedSoon.length} ${blockedSoon.length === 1 ? "día marcado" : "días marcados"} sin entrenar`
                : db.profile
                  ? `Entrenas: ${availableDaysOf(db.profile).map((d) => WEEKDAYS[d].slice(0, 3)).join(", ")}`
                  : undefined
            }
          >
            <div className="space-y-3 text-sm">
              <p className="text-ink-2">¿Un imprevisto? Marca los días y las sesiones se mueven solas.</p>
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
          </FoldCard>
          <FoldCard title="Tus ritmos de entrenamiento" subtitle={`VDOT ${plan.startVdot.toFixed(1)} (inicio) → ${plan.targetVdot.toFixed(1)} (final)`}>
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
          </FoldCard>
        </div>
      </div>
    </>
  );
}
