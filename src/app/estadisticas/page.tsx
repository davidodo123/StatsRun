import type { Metadata } from "next";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, Loading, PageHeader, Stat } from "@/components/ui";
import { SimpleBars, TrendLine, WeeklyKmChart } from "@/components/charts";
import { activityLoad } from "@/lib/engine/load";
import { activityKcal } from "@/lib/engine/stats";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { WEEKDAYS, monthLabel, shortDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Estadísticas" subtitle="Todo lo que dicen tus datos, con el porqué de cada métrica." />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

const SPORT: Record<string, string> = { run: "Correr", ride: "Bici", swim: "Natación", walk: "Caminar", strength: "Fuerza", other: "Otros" };

async function Content() {
  const { db, stats } = await getAnalysis();
  if (!db.profile || !stats) return <Empty title="Crea tu perfil para ver estadísticas" href="/perfil" cta="Crear perfil" />;
  if (!db.activities.length)
    return (
      <Empty title="Aún no hay actividades" href="/registrar" cta="Registrar entreno">
        Registra tus entrenos a mano (o carga los datos demo desde «Importar / demo»).
      </Empty>
    );

  const { totals: T } = stats;
  const weeks = stats.weeks.map((w) => ({ week: w.week, km: w.runKm }));
  const zoneTotal = stats.zoneTime.reduce((s, z) => s + z.minutes, 0);
  const zones = stats.zoneTime.map((z) => ({ name: `Z${z.zone} ${z.name}`, pct: zoneTotal ? (z.minutes / zoneTotal) * 100 : 0 }));
  const easyPct = zoneTotal ? ((stats.zoneTime[0].minutes + stats.zoneTime[1].minutes) / zoneTotal) * 100 : 0;
  const recent = [...db.activities].reverse().slice(0, 40);
  const vdotByMonth = stats.vdotTrend.map((v) => ({ month: v.month, vdot: v.vdot }));
  const monthsKm = stats.months.map((m) => ({ month: m.month, km: m.runKm }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Km este año" value={fmtNum(T.yearKm)} unit="km" sub={`${T.yearRuns} carreras`} />
        <Stat label="Km este mes" value={fmtKm(T.monthKm)} unit="km" />
        <Stat label="Km totales" value={fmtNum(T.allKm)} unit="km" sub={`${T.allRuns} carreras`} />
        <Stat label="Horas totales" value={fmtNum(T.allHours)} unit="h" sub="Todos los deportes" />
        <Stat label="Desnivel acumulado" value={fmtNum(T.elevation)} unit="m" />
        <Stat label="Calorías (aprox.)" value={fmtNum(T.kcal / 1000, 1)} unit="mil kcal" />
        <Stat label="Racha actual" value={T.streakDays} unit="días" sub={`Récord: ${T.longestStreak} días`} />
        <Stat label="Constancia" value={`${Math.round(T.consistency)} %`} sub="Semanas activas (12)" />
        <Stat label="Monotonía" value={stats.monotony.toFixed(2)} sub={stats.monotony > 2 ? "Alta: varía más la carga" : "Buena variedad de carga"} hint="Foster: media diaria / desviación de la carga de 7 días" />
        <Stat label="Strain semanal" value={fmtNum(stats.strain)} sub="Carga × monotonía" />
        <Stat label="Tiempo suave (Z1-Z2)" value={`${Math.round(easyPct)} %`} sub="Objetivo ~80 % (8 sem)" />
        <Stat label="Media 6 semanas" value={fmtKm(T.avgWeeklyKm6)} unit="km/sem" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Kilómetros por semana" subtitle="Últimas 26 semanas">
          <WeeklyKmChart data={weeks} />
        </Card>
        <Card title="Kilómetros por mes" subtitle="Últimos 12 meses">
          <SimpleBars data={monthsKm} xKey="month" yKey="km" name="Km" unit="km" xFormat="month" height={220} />
        </Card>
        <Card title="Ritmo medio semanal" subtitle="Media de todas tus carreras (más arriba = más rápido)">
          <TrendLine data={stats.paceTrend} dataKey="pace" name="Ritmo" format="pace" invert />
        </Card>
        <Card title="Frecuencia cardiaca media semanal" subtitle="Si baja con el mismo ritmo, estás mejorando">
          <TrendLine data={stats.paceTrend} dataKey="hr" name="FC media" color="s2" format="int" />
        </Card>
        <Card title="Efficiency Factor" subtitle="Velocidad (m/min) ÷ FC. Más alto = motor aeróbico más eficiente">
          <TrendLine data={stats.paceTrend} dataKey="ef" name="EF" color="s3" format="dec2" />
        </Card>
        <Card title="Cadencia media" subtitle="Pasos por minuto. 170-185 suele ser eficiente">
          <TrendLine data={stats.paceTrend} dataKey="cadence" name="Cadencia" format="int" />
        </Card>
        <Card title="Evolución del VDOT" subtitle="Mejor esfuerzo de cada mes">
          {vdotByMonth.length ? <TrendLine data={vdotByMonth} dataKey="vdot" name="VDOT" format="dec1" xKey="month" xFormat="month" /> : <p className="text-sm text-ink-2">Sin datos suficientes.</p>}
        </Card>
        <Card title="Distribución de intensidad" subtitle="% del tiempo por zona de FC (8 semanas, por FC media de cada actividad)">
          <SimpleBars data={zones} xKey="name" yKey="pct" name="Tiempo" unit="%" horizontal ordinal xFormat="none" height={220} />
        </Card>
        <Card title="¿Qué días corres más?" subtitle="Km por día de la semana (12 semanas)">
          <SimpleBars data={stats.weekdayKm.map((d) => ({ day: WEEKDAYS[d.day].slice(0, 3), km: d.km }))} xKey="day" yKey="km" name="Km" unit="km" xFormat="none" />
        </Card>
        <Card title="Deportes" subtitle="Horas por deporte (90 días)">
          <SimpleBars data={stats.sportSplit.map((s) => ({ sport: s.sport, hours: s.hours }))} xKey="sport" yKey="hours" name="Horas" unit="h" horizontal xFormat="none" height={Math.max(120, stats.sportSplit.length * 40)} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Récords" subtitle="Estimados a partir del ritmo medio de cada actividad">
          <ul className="divide-y divide-line text-sm">
            {stats.records.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="block text-ink-2">{r.label}</span>
                  {r.sub && <span className="block text-xs text-muted">{r.sub}</span>}
                </span>
                <span className="text-right font-semibold tabular">
                  {r.value}
                  {r.date && <span className="block text-[11px] font-normal text-muted">{shortDate(r.date)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Resumen mensual" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm tabular">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Mes</th>
                  <th className="pb-2 text-right font-medium">Km</th>
                  <th className="pb-2 text-right font-medium">Carreras</th>
                  <th className="pb-2 text-right font-medium">Ritmo</th>
                  <th className="pb-2 text-right font-medium">Horas</th>
                  <th className="pb-2 text-right font-medium">Desnivel</th>
                  <th className="pb-2 text-right font-medium">kcal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="py-1.5">{monthLabel(m.month)}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtKm(m.runKm)}</td>
                    <td className="py-1.5 text-right">{m.runs}</td>
                    <td className="py-1.5 text-right">{m.avgPace ? fmtPace(m.avgPace) : "–"}</td>
                    <td className="py-1.5 text-right">{fmtKm(m.hours)}</td>
                    <td className="py-1.5 text-right">{fmtNum(m.elevation)} m</td>
                    <td className="py-1.5 text-right">{fmtNum(m.kcal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Últimas actividades" subtitle="Carga = puntos de estrés (100 ≈ 1 h a umbral)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm tabular">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Actividad</th>
                <th className="pb-2 text-right font-medium">Distancia</th>
                <th className="pb-2 text-right font-medium">Tiempo</th>
                <th className="pb-2 text-right font-medium">Ritmo</th>
                <th className="pb-2 text-right font-medium">FC</th>
                <th className="pb-2 text-right font-medium">Desnivel</th>
                <th className="pb-2 text-right font-medium">Carga</th>
                <th className="pb-2 text-right font-medium">kcal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap py-1.5 text-ink-2">{shortDate(a.date)}</td>
                  <td className="py-1.5">
                    {a.source === "strava" ? (
                      <a href={`https://www.strava.com/activities/${a.id.replace("strava-", "")}`} target="_blank" rel="noreferrer" className="hover:text-accent">
                        {a.name}
                      </a>
                    ) : (
                      a.name
                    )}
                    <span className="ml-2 text-xs text-muted">{SPORT[a.sport]}</span>
                  </td>
                  <td className="py-1.5 text-right">{a.distanceM ? `${fmtKm(a.distanceM / 1000, 2)} km` : "–"}</td>
                  <td className="py-1.5 text-right">{fmtDuration(a.movingSec)}</td>
                  <td className="py-1.5 text-right">{a.sport === "run" && a.distanceM ? fmtPace(a.movingSec / (a.distanceM / 1000)) : "–"}</td>
                  <td className="py-1.5 text-right">{a.avgHr ? Math.round(a.avgHr) : "–"}</td>
                  <td className="py-1.5 text-right">{Math.round(a.elevationGainM)} m</td>
                  <td className="py-1.5 text-right">{Math.round(activityLoad(a, db.profile!, stats.vdot.vdot))}</td>
                  <td className="py-1.5 text-right">{Math.round(activityKcal(a, db.profile!.weightKg))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
