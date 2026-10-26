import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis, viewTodayMadrid } from "@/lib/analysis";
import { Card, Empty, Loading, PageHeader, Stat, StatGroup } from "@/components/ui";
import { FitnessChart, FormChart, WeeklyKmChart } from "@/components/charts";
import { SessionCard } from "@/components/SessionCard";
import { UndoSkip } from "@/components/UndoSkip";
import { acwrStatus, tsbStatus } from "@/lib/engine/load";
import { vo2maxLabel } from "@/lib/engine/physiology";
import { fmtDuration, fmtKm, fmtNum } from "@/lib/format";
import { healthSummary } from "@/lib/health";
import { addDays, diffDays, mondayOf } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { dayMonth, weekdayDate } from "@/lib/i18n";
import { TodayHero } from "@/components/TodayHero";
import { loadDemo } from "@/app/actions";
import { StrengthHome } from "@/components/StrengthHome";
import { focusOf } from "@/lib/types";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [{ db, stats, matches, today }, { locale, t: tr }] = await Promise.all([getAnalysis(), getT()]);
  // quien solo hace fuerza ve su fuerza al entrar
  if (db.profile && focusOf(db.profile) === "fuerza") return <StrengthHome title={tr("inicio.hola", { nombre: db.profile.name.split(" ")[0] })} />;

  if (!db.profile || !stats)
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Run-In-Out</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{tr("inicio.bienvenida")}</h1>
        <p className="mt-3 text-ink-2">{tr("inicio.bienvenidaTexto")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/perfil" className="btn">
            {tr("inicio.quieroCorrer")}
          </Link>
          <Link href="/perfil?foco=fuerza" className="btn">
            {tr("inicio.soloFuerza")}
          </Link>
          <Link href="/registrar" className="btn btn-ghost">
            {tr("inicio.registrarEntreno")}
          </Link>
          <form action={loadDemo}>
            <button className="btn btn-ghost">{tr("inicio.probarDemo")}</button>
          </form>
        </div>
      </div>
    );

  const { profile, plan, goal } = db;
  const t = stats.today;
  const acwrS = acwrStatus(stats.acwr);
  const tsbS = tsbStatus(t.tsb);

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
  const weekPlanKm = plannedByWeek.get(mondayOf(today));
  const health = healthSummary(db.health, await viewTodayMadrid());

  return (
    <>
      {plan ? (
        <>
          <p className="mb-5 flex justify-between text-xs font-semibold tracking-widest text-muted uppercase">
            <span>{weekdayDate(today, locale)}</span>
            <span>{tr("inicio.hola", { nombre: profile.name.split(" ")[0] })}</span>
          </p>
          <TodayHero plan={plan} matches={matches} today={today} goal={goal} locale={locale} />
        </>
      ) : (
      <PageHeader
        title={tr("inicio.hola", { nombre: profile.name.split(" ")[0] })}
        subtitle={
          goal && daysToRace !== undefined && daysToRace >= 0 ? (
            <>
              <strong className="text-ink">{tr("inicio.diasPara", { dias: daysToRace })}</strong> {tr("inicio.paraCarrera", { carrera: goal.name, fecha: dayMonth(goal.date, locale) })}
            </>
          ) : (
            tr("inicio.sinCarrera")
          )
        }
        action={
          <div className="flex gap-2">
            <Link href="/registrar" className="btn hidden md:inline-flex">
              {tr("inicio.registrarBoton")}
            </Link>
            {!plan && (
              <Link href="/carreras" className="btn btn-ghost">
                {tr("inicio.elegirCarrera")}
              </Link>
            )}
          </div>
        }
      />
      )}
      <UndoSkip db={db} today={today} />

      <StatGroup className="md:grid-cols-3 lg:grid-cols-6">
        <Stat label="VDOT" value={stats.vdot.vdot.toFixed(1)} sub={vo2maxLabel(stats.vdot.vdot, profile.sex, profile.age)} hint={stats.vdot.source} />
        <Stat label={tr("inicio.forma")} value={t.ctl.toFixed(0)} sub={tr("inicio.dias42")} />
        <Stat label={tr("inicio.fatiga")} value={t.atl.toFixed(0)} sub={tr("inicio.dias7")} />
        <Stat label={tr("inicio.frescura")} value={t.tsb.toFixed(0)} status={tsbS} />
        <Stat label={tr("inicio.carga")} value={stats.acwr ? stats.acwr.toFixed(2) : "–"} status={acwrS} />
        <Stat
          label={tr("inicio.estaSemana")}
          value={fmtKm(stats.totals.weekKm)}
          unit="km"
          accent
          progress={weekPlanKm ? stats.totals.weekKm / weekPlanKm : undefined}
          sub={weekPlanKm ? tr("inicio.dePlan", { km: fmtKm(weekPlanKm) }) : tr("inicio.media6", { km: fmtKm(stats.totals.avgWeeklyKm6) })}
        />
      </StatGroup>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={tr("inicio.volumen")} subtitle={plan ? tr("inicio.realPlan") : undefined}>
            <WeeklyKmChart data={weekly} height={190} />
          </Card>
          <Card title={tr("inicio.formaFatiga")} subtitle={tr("inicio.ultimos120")}>
            <FitnessChart data={fitness} height={200} />
            <p className="mb-1 mt-4 text-xs font-medium text-muted">{tr("inicio.frescura")}</p>
            <FormChart data={fitness} height={120} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title={tr("inicio.pasosCalorias")}
            subtitle={health ? tr("inicio.hoySalud") : undefined}
            action={
              <Link href="/perfil?tab=salud" className="text-xs font-semibold text-accent">
                {health ? tr("inicio.verMas") : tr("inicio.conectar")}
              </Link>
            }
          >
            {health ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">{tr("inicio.pasos")}</dt>
                  <dd className="text-2xl font-bold tabular">{health.today?.steps !== undefined ? fmtNum(health.today.steps) : "–"}</dd>
                  {health.avgSteps7 !== undefined && <dd className="text-xs text-ink-2">{tr("inicio.media7", { valor: fmtNum(health.avgSteps7) })}</dd>}
                </div>
                <div>
                  <dt className="text-xs text-muted">{tr("inicio.caloriasActivas")}</dt>
                  <dd className="text-2xl font-bold tabular">
                    {health.today?.activeKcal !== undefined ? fmtNum(health.today.activeKcal) : "–"}
                    <span className="ml-1 text-sm font-normal text-muted">kcal</span>
                  </dd>
                  {health.avgActiveKcal7 !== undefined && <dd className="text-xs text-ink-2">{tr("inicio.media7", { valor: `${fmtNum(health.avgActiveKcal7)} kcal` })}</dd>}
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ink-2">{tr("inicio.conectaSalud")}</p>
            )}
          </Card>

          <Card
            title={tr("inicio.proximos7")}
            action={
              plan && (
                <Link href="/plan/actual" className="text-xs font-semibold text-accent">
                  {tr("inicio.verPlan")}
                </Link>
              )
            }
          >
            {plan ? (
              upcoming.length ? (
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <SessionCard key={s.id} s={s} match={matches?.get(s.id)} compact today={today} locale={locale} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-2">{tr("inicio.sinSesiones")}</p>
              )
            ) : (
              <Empty title={tr("inicio.sinPlan")} href="/carreras" cta={tr("inicio.crearPlan")}>
                {tr("inicio.eligeCarrera")}
              </Empty>
            )}
          </Card>

          <Card title={tr("inicio.predicciones")}>
            <ul className="divide-y divide-line text-sm">
              {stats.predictions.map((p) => (
                <li key={p.label} className="flex items-center justify-between py-2">
                  <span className="text-ink-2">{p.label}</span>
                  <span className="text-right">
                    <span className="font-semibold tabular">{fmtDuration(p.timeSec)}</span>
                    {p.shape < 0.97 && <span className="block text-[11px] text-muted">{tr("inicio.conMasVolumen", { tiempo: fmtDuration(p.pureSec) })}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

        </div>
      </div>
    </>
  );
}
