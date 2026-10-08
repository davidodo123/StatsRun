import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, Loading, PageHeader, Stat, Status } from "@/components/ui";
import { FitnessChart, FormChart, WeeklyKmChart } from "@/components/charts";
import { SessionCard } from "@/components/SessionCard";
import { acwrStatus, tsbStatus } from "@/lib/engine/load";
import { buildInsights } from "@/lib/engine/insights";
import { vo2maxLabel } from "@/lib/engine/physiology";
import { fmtDuration, fmtKm } from "@/lib/format";
import { addDays, diffDays, mondayOf, shortDate } from "@/lib/dates";
import { loadDemo } from "./actions";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { db, stats, matches, today } = await getAnalysis();

  if (!db.profile || !stats)
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">PaceLab</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Tu entrenador de running, con datos de verdad</h1>
        <p className="mt-3 text-ink-2">
          Planes periodizados según tu peso, experiencia y carrera objetivo, que se adaptan con tus actividades de Strava. Ritmos VDOT, forma y fatiga, predicciones y
          decenas de estadísticas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/perfil" className="btn">
            Crear mi perfil
          </Link>
          <Link href="/registrar" className="btn btn-ghost">
            Registrar un entreno
          </Link>
          <form action={loadDemo}>
            <button className="btn btn-ghost">Probar con datos demo</button>
          </form>
        </div>
      </div>
    );

  const { profile, plan, goal } = db;
  const t = stats.today;
  const acwrS = acwrStatus(stats.acwr);
  const tsbS = tsbStatus(t.tsb);
  const insights = buildInsights(stats, profile, plan, matches, today);

  const upcoming = plan?.weeks.flatMap((w) => w.sessions).filter((s) => s.date >= today && s.date <= addDays(today, 6)) ?? [];
  const plannedByWeek = new Map(plan?.weeks.map((w) => [w.start, w.targetKm]) ?? []);
  const weekly = stats.weeks.slice(-12).map((w) => ({ week: w.week, km: w.runKm, planned: plannedByWeek.get(w.week) }));
  // incluir semanas futuras del plan en la gráfica
  for (let i = 1; i <= 3; i++) {
    const wk = addDays(mondayOf(today), 7 * i);
    if (plannedByWeek.has(wk)) weekly.push({ week: wk, km: 0, planned: plannedByWeek.get(wk) });
  }
  const fitness = stats.fitness.slice(-120).map((p) => ({ date: p.date, ctl: p.ctl, atl: p.atl, tsb: p.tsb }));
  const daysToRace = goal ? diffDays(goal.date, today) : undefined;

  return (
    <>
      <PageHeader
        title={`Hola, ${profile.name.split(" ")[0]}`}
        subtitle={
          goal && daysToRace !== undefined && daysToRace >= 0 ? (
            <>
              <strong className="text-ink">{daysToRace} días</strong> para {goal.name} ({shortDate(goal.date)})
            </>
          ) : (
            "Sin carrera objetivo todavía"
          )
        }
        action={
          <div className="flex gap-2">
            <Link href="/registrar" className="btn">
              + Registrar entreno
            </Link>
            {!plan && (
              <Link href="/carreras" className="btn btn-ghost">
                Elegir carrera
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="VDOT" value={stats.vdot.vdot.toFixed(1)} sub={vo2maxLabel(stats.vdot.vdot, profile.sex, profile.age)} hint={stats.vdot.source} />
        <Stat label="Forma (CTL)" value={t.ctl.toFixed(0)} sub="Media de carga 42 días" />
        <Stat label="Fatiga (ATL)" value={t.atl.toFixed(0)} sub="Media de carga 7 días" />
        <Stat label="Frescura (TSB)" value={t.tsb.toFixed(0)} status={tsbS} />
        <Stat label="Carga aguda/crónica" value={stats.acwr ? stats.acwr.toFixed(2) : "–"} status={acwrS} />
        <Stat label="Esta semana" value={fmtKm(stats.totals.weekKm)} unit="km" sub={`Media 6 sem: ${fmtKm(stats.totals.avgWeeklyKm6)} km`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Volumen semanal" subtitle={plan ? "Kilómetros reales frente a los planificados" : "Kilómetros de carrera por semana"}>
            <WeeklyKmChart data={weekly} />
          </Card>
          <Card title="Forma y fatiga" subtitle="Modelo de rendimiento de Banister (CTL/ATL), últimos 120 días">
            <FitnessChart data={fitness} />
            <p className="mb-1 mt-4 text-xs font-medium text-muted">Frescura (TSB = forma − fatiga). Franja gris: zona de entrenamiento productivo.</p>
            <FormChart data={fitness} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title="Próximos 7 días"
            action={
              plan && (
                <Link href="/plan" className="text-xs font-semibold text-accent">
                  Ver plan →
                </Link>
              )
            }
          >
            {plan ? (
              upcoming.length ? (
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <SessionCard key={s.id} s={s} match={matches?.get(s.id)} compact />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-2">Sin sesiones esta semana.</p>
              )
            ) : (
              <Empty title="Sin plan activo" href="/carreras" cta="Crear plan">
                Elige una carrera y fecha, y generamos tu plan.
              </Empty>
            )}
          </Card>

          <Card title="Predicciones" subtitle="Según tu VDOT y tu volumen reciente">
            <ul className="divide-y divide-line text-sm">
              {stats.predictions.map((p) => (
                <li key={p.label} className="flex items-center justify-between py-2">
                  <span className="text-ink-2">{p.label}</span>
                  <span className="text-right">
                    <span className="font-semibold tabular">{fmtDuration(p.timeSec)}</span>
                    {p.shape < 0.97 && <span className="block text-[11px] text-muted">Con más volumen: {fmtDuration(p.pureSec)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recomendaciones">
            <ul className="space-y-3">
              {insights.map((i) => (
                <li key={i.title}>
                  <Status tone={i.tone}>
                    <span className="font-semibold text-ink">{i.title}</span>
                  </Status>
                  <p className="mt-1 pl-6 text-xs text-ink-2">{i.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
