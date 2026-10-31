import type { Metadata } from "next";
import { planText } from "@/lib/i18n/planText";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, ChipLink, Empty, FoldCard, Loading, MoreMenu, Notice, PageHeader, Stat, StatGroup } from "@/components/ui";
import { SessionCard } from "@/components/SessionCard";
import { AiCoachButton } from "@/components/AiCoachButton";
import { StrengthCoachCard } from "@/components/StrengthCoachCard";
import { ReadinessCard } from "@/components/ReadinessCard";
import { RaceCard } from "@/components/RaceCard";
import { assessReadiness } from "@/lib/engine/readiness";
import { UnavailableForm } from "@/components/UnavailableForm";
import { coachConfig, strengthModel } from "@/lib/coach";
import { AutoAdapt } from "@/components/AutoAdapt";
import { AI_LIMITS, aiLeft } from "@/lib/aiPlan";
import { viewAiUnlimited } from "@/lib/authView";
import { availableDaysOf, planTitle } from "@/lib/engine/planner";
import { requireViewerId } from "@/lib/session";
import { trainingPaces } from "@/lib/engine/physiology";
import { fmtDuration, fmtPaceRange } from "@/lib/format";
import { addDays, diffDays, mondayOf } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { dayMonth, intlLocale, shortWeekdayDate, weekdayDate, type Key } from "@/lib/i18n";
import type { Phase } from "@/lib/types";
import { clearPlan, clearUnavailable } from "@/app/actions";
import { AdaptPlanButton } from "@/components/AdaptPlanButton";
import { UndoSkip } from "@/components/UndoSkip";
import { AiRating } from "@/components/AiRating";
import { feedbackFor } from "@/lib/aiMemory";

export const metadata: Metadata = { title: "Plan" };
// crear las rutinas con IA puede tardar un minuto (las acciones de la página heredan este límite)
export const maxDuration = 180;

const PHASE_LABEL: Record<Phase, Key> = { base: "plan.fase.base", construccion: "plan.fase.construccion", especifico: "plan.fase.especifico", taper: "plan.fase.taper" };
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
  const { t } = await getT();
  return (
    <div className="mb-4">
      <Notice tone="good">{t("plan.registrada")}</Notice>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/plan/actual">["searchParams"] }) {
  const [{ db, matches, today, stats }, { locale, t }] = await Promise.all([getAnalysis(), getT()]);
  const plan = db.plan;
  if (!plan)
    return (
      <>
        <PageHeader title={t("plan.titulo")} />
        <Empty title={t("plan.aunNo")} href="/carreras" cta={t("plan.elegirObjetivo")}>
          {db.profile ? t("plan.eligeCarreraFecha") : t("plan.primeroPerfil")}
        </Empty>
      </>
    );

  const uid = await requireViewerId();
  const aiUnlimited = await viewAiUnlimited(uid);
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
      <AutoAdapt />
      <BackLink href="/plan" label={t("comun.volver")} />
      <PageHeader
        title={planTitle(plan)}
        subtitle={t("plan.subtitulo", { fecha: dayMonth(plan.goal.date, locale), n: plan.weeks.length, creado: dayMonth(plan.createdAt.slice(0, 10), locale) })}
        action={
          <div className="flex max-w-md flex-wrap gap-2">
            <AdaptPlanButton locale={locale} />
            <MoreMenu label={t("comun.masOpciones")}>
              <form action={clearPlan}>
                <button title={t("plan.pasaAnteriores")}>{t("plan.terminarPlan")}</button>
              </form>
            </MoreMenu>
          </div>
        }
      />

      <UndoSkip db={db} today={today} locale={locale} />
      <Suspense fallback={null}>
        <SavedNotice searchParams={searchParams} />
      </Suspense>
      <StatGroup className="md:grid-cols-5">
        <Stat label={t("plan.diasCarrera")} value={Math.max(0, days)} accent />
        <Stat
          label={t("plan.tiempoPrevisto")}
          value={race ? fmtDuration(race.durationMin * 60) : "–"}
          sub={plan.goal.targetTimeSec ? t("plan.objetivoMayus", { tiempo: fmtDuration(plan.goal.targetTimeSec) }) : t("plan.objetivoTerminar")}
        />
        <Stat label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub={stats ? t("plan.hoyVdot", { vdot: stats.vdot.vdot.toFixed(1) }) : undefined} />
        <Stat label={t("plan.kmTotales")} value={Math.round(totalKm)} unit="km" />
        <Stat
          label={t("plan.cumplimiento")}
          value={compliance !== undefined ? `${Math.round(compliance * 100)} %` : "–"}
          sub={past.length ? t(past.length === 1 ? "plan.sesionHastaHoy" : "plan.sesionesHastaHoy", { n: past.length }) : t("plan.sinPasadas")}
        />
      </StatGroup>

      {/* los avisos, plegados: solo se leen si se quiere */}
      {plan.warnings.length > 0 && (
        <details className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold">
            {plan.warnings.length === 1 ? t("plan.unAviso") : t("plan.avisos", { n: plan.warnings.length })}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
            {plan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      {db.goal && <RaceCard goal={db.goal} t={t} />}

      {/* Línea temporal de fases */}
      <Card className="mt-4" title={t("plan.periodizacion")}>
        <div className="flex gap-1" role="img" aria-label={t("plan.semanasPorFase")}>
          {plan.weeks.map((w) => (
            <a
              key={w.index}
              href={`#semana-${w.index + 1}`}
              title={`${t("plan.semana", { n: w.index + 1 })} · ${t(PHASE_LABEL[w.phase])}${w.recovery ? ` (${t("plan.descarga")})` : ""} · ${w.targetKm} km`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="flex h-20 w-full items-end">
                <span
                  className={`w-full rounded-t ${PHASE_BG[w.phase]} ${w.recovery ? "opacity-50" : ""}`}
                  style={{ height: `${Math.max(8, (w.targetKm / Math.max(...plan.weeks.map((x) => x.targetKm))) * 100)}%` }}
                />
              </span>
              {/* la semana en curso, con un punto debajo (un borde se juntaba con las barras de al lado del mismo color) */}
              <span className={`h-1.5 w-1.5 rounded-full ${w.start === thisWeek ? "bg-ink" : "bg-transparent"}`} />
              <span className="hidden text-[10px] text-muted sm:block">{w.index + 1}</span>
            </a>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
          {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${PHASE_BG[p]}`} />
              {t(PHASE_LABEL[p])}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted opacity-50" /> {t("plan.descargaMayus")}
          </span>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {plan.weeks.map((w) => {
            const current = w.start === thisWeek;
            const ended = addDays(w.start, 6) < today;
            // lejos de hoy (antes de la semana pasada o después de las 3 siguientes), sesiones resumidas: con planes de
            // muchos meses la página pesaba más de 1 MB; la IA solo ajusta los próximos 14 días y los pasos pueden cambiar
            const far = w.start < addDays(thisWeek, -7) || w.start > addDays(thisWeek, 21);
            const done = w.sessions.map((s) => matches?.get(s.id)).filter((m) => m && m.session.type !== "strength");
            const doneKm = done.reduce((s, m) => s + (m?.doneKm ?? 0), 0);
            return (
              <details key={w.index} id={`semana-${w.index + 1}`} open={current} className="group rounded-2xl border border-line bg-surface">
                {/* a la izquierda la semana (fechas y fase debajo); a la derecha, siempre en su sitio, los km y la flecha */}
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${PHASE_BG[w.phase]}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{t("plan.semana", { n: w.index + 1 })}</span>
                      <span className="text-sm text-ink-2">
                        {dayMonth(w.start, locale)} – {dayMonth(addDays(w.start, 6), locale)}
                      </span>
                    </span>
                    <span className="block text-xs text-muted">
                      {t(PHASE_LABEL[w.phase])}
                      {w.recovery && ` · ${t("plan.descarga")}`}
                      {current && ` · ${t("plan.estaSemana")}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular">
                    {(ended || current) && doneKm > 0 && <span className="text-ink-2">{doneKm.toFixed(0)} / </span>}
                    <strong>{w.targetKm} km</strong>
                  </span>
                  <span className="shrink-0 text-muted transition group-open:rotate-90">›</span>
                </summary>
                <div className="space-y-2 border-t border-line p-4">
                  <p className="text-sm text-ink-2">{planText(w.focus, locale)}</p>
                  {/* los días marcados como «no puedo» de esta semana: así se ve por qué falta una sesión */}
                  {(db.unavailableDates ?? [])
                    .filter((d) => d >= w.start && d <= addDays(w.start, 6))
                    .map((d) => (
                      <form key={d} action={clearUnavailable} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line px-3 py-2 text-sm">
                        <input type="hidden" name="date" value={d} />
                        <span className="text-ink-2">
                          <strong className="text-ink">{weekdayDate(d, locale)}</strong> · {t("plan.marcadoNoPuedo")}
                        </span>
                        {d >= today && <button className="text-xs font-semibold text-accent">{t("plan.vuelvoDisponible")}</button>}
                      </form>
                    ))}
                  {w.sessions.map((s) => (
                    <SessionCard key={s.id} s={s} match={matches?.get(s.id)} today={today} locale={locale} compact={far} />
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
              t={t}
            />
          )}
          <Card title={t("plan.entrenadorIA")} subtitle={coachConfig().configured ? t("plan.modelo", { modelo: coachConfig().model }) : t("plan.desactivado")}>
            {coachConfig().configured ? (
              <div className="space-y-3 text-sm text-ink-2">
                {db.coach?.summary ? <p>{db.coach.summary}</p> : <p>{t("plan.aunNoReviso")}</p>}
                {db.coach?.summary && <AiRating area="plan" refId={db.coach.updatedAt} rating={feedbackFor(db, "plan", db.coach.updatedAt)?.rating} locale={locale} />}
                {db.coach?.updatedAt && (
                  <p className="text-xs text-muted">
                    {t("plan.ultimaRevision", { fecha: new Date(db.coach.updatedAt).toLocaleString(intlLocale(locale)), n: db.coach.changed })}
                  </p>
                )}
                {db.coach?.error && <Notice tone="warn">{t("plan.ultimoFallo", { error: db.coach.error })}</Notice>}
                <p className="text-xs text-muted">
                  {aiUnlimited
                    ? t("plan.iaSinLimite")
                    : t("plan.teQuedan", { reajustes: aiLeft(db, "adapt", today), maxReajustes: AI_LIMITS.adapt, mensajes: aiLeft(db, "chat", today), maxMensajes: AI_LIMITS.chat })}
                </p>
                <AiCoachButton locale={locale} />
                <ChipLink href="/entrenador">{t("plan.pideCambio")}</ChipLink>
              </div>
            ) : (
              <p className="text-sm text-ink-2">{t("plan.sinIA", { clave: "OPENROUTER_API_KEY" })}</p>
            )}
          </Card>
          <Card title={t("plan.fuerzaIA")} subtitle={t("plan.rutinasMaterial")}>
            <StrengthCoachCard
              material={db.strengthCoach?.material}
              ability={db.strengthCoach?.ability}
              summary={db.strengthCoach?.summary}
              refId={db.strengthCoach?.summary ? db.strengthCoach.updatedAt : undefined}
              rating={feedbackFor(db, "fuerza", db.strengthCoach?.updatedAt)?.rating}
              routines={(db.routines ?? []).filter((r) => r.source === "ia").map((r) => ({ id: r.id, name: r.name }))}
              model={strengthModel()}
              locale={locale}
            />
          </Card>
          <FoldCard
            title={t("plan.disponibilidad")}
            subtitle={
              blockedSoon.length
                ? t(blockedSoon.length === 1 ? "plan.diaMarcado" : "plan.diasMarcados", { n: blockedSoon.length })
                : db.profile
                  ? t("plan.entrenas", {
                      // 2024-01-01 es lunes: el día d de la semana (0 = lunes)
                      dias: availableDaysOf(db.profile)
                        .map((d) => new Date(Date.UTC(2024, 0, 1 + d)).toLocaleDateString(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).replace(/\.$/, ""))
                        .join(", "),
                    })
                  : undefined
            }
          >
            <div className="space-y-3 text-sm">
              <p className="text-ink-2">{t("plan.imprevisto")}</p>
              <UnavailableForm today={today} locale={locale} />
              {blockedSoon.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {blockedSoon.map((d) => (
                    <li key={d}>
                      <form action={clearUnavailable} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs">
                        <input type="hidden" name="date" value={d} />
                        {shortWeekdayDate(d, locale)}
                        <button className="text-muted hover:text-critical" title={t("plan.vuelvoDisponible")} aria-label={t("plan.quitar", { fecha: d })}>
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FoldCard>
          <FoldCard title={t("plan.tusRitmos")} subtitle={t("plan.ritmosSub", { inicio: plan.startVdot.toFixed(1), final: plan.targetVdot.toFixed(1) })}>
            <table className="w-full text-sm tabular">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">{t("plan.ritmo")}</th>
                  <th className="pb-2 font-medium">{t("plan.ahora")}</th>
                  <th className="pb-2 font-medium">{t("plan.final")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(
                  [
                    ["plan.ritmo.easy", "easy"],
                    ["plan.ritmo.marathon", "marathon"],
                    ["plan.ritmo.threshold", "threshold"],
                    ["plan.ritmo.interval", "interval"],
                    ["plan.ritmo.repetition", "repetition"],
                  ] as const
                ).map(([l, k]) => (
                  <tr key={k}>
                    <td className="py-2">{t(l)}</td>
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
