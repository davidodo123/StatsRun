import type { Metadata } from "next";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, FoldCard, Loading, PageHeader, Stat, StatGroup } from "@/components/ui";
import { SimpleBars, TrendLine, WeeklyKmChart } from "@/components/charts";
import { activityLoad } from "@/lib/engine/load";
import { activityKcal } from "@/lib/engine/stats";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { WEEKDAYS, monthLabel, shortDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Estadísticas" />
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
      <StatGroup className="md:grid-cols-4 lg:grid-cols-6">
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
      </StatGroup>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Kilómetros por semana" subtitle="Últimas 26 semanas">
          <WeeklyKmChart data={weeks} />
        </Card>
        <FoldCard title="Kilómetros por mes" subtitle="Últimos 12 meses">
          <SimpleBars data={monthsKm} xKey="month" yKey="km" name="Km" unit="km" xFormat="month" height={220} />
        </FoldCard>
        <Card title="Ritmo medio semanal" subtitle="Más arriba = más rápido">
          <TrendLine data={stats.paceTrend} dataKey="pace" name="Ritmo" format="pace" invert />
        </Card>
        <FoldCard title="Frecuencia cardiaca media" subtitle="Si baja al mismo ritmo, mejoras">
          <TrendLine data={stats.paceTrend} dataKey="hr" name="FC media" color="s2" format="int" />
        </FoldCard>
        <FoldCard title="Efficiency Factor" subtitle="Velocidad ÷ FC: más alto, más eficiente">
          <TrendLine data={stats.paceTrend} dataKey="ef" name="EF" color="s3" format="dec2" />
        </FoldCard>
        <FoldCard title="Cadencia media" subtitle="170-185 ppm suele ser eficiente">
          <TrendLine data={stats.paceTrend} dataKey="cadence" name="Cadencia" format="int" />
        </FoldCard>
        <Card title="Evolución del VDOT" subtitle="Mejor esfuerzo de cada mes">
          {vdotByMonth.length ? <TrendLine data={vdotByMonth} dataKey="vdot" name="VDOT" format="dec1" xKey="month" xFormat="month" /> : <p className="text-sm text-ink-2">Sin datos suficientes.</p>}
        </Card>
        <FoldCard title="Distribución de intensidad" subtitle="% del tiempo por zona de FC (8 semanas)">
          <SimpleBars data={zones} xKey="name" yKey="pct" name="Tiempo" unit="%" horizontal ordinal xFormat="none" height={220} />
        </FoldCard>
        <FoldCard title="¿Qué días corres más?" subtitle="Km por día (12 semanas)">
          <SimpleBars data={stats.weekdayKm.map((d) => ({ day: WEEKDAYS[d.day].slice(0, 3), km: d.km }))} xKey="day" yKey="km" name="Km" unit="km" xFormat="none" />
        </FoldCard>
        <FoldCard title="Deportes" subtitle="Horas por deporte (90 días)">
          <SimpleBars data={stats.sportSplit.map((s) => ({ sport: s.sport, hours: s.hours }))} xKey="sport" yKey="hours" name="Horas" unit="h" horizontal xFormat="none" height={Math.max(120, stats.sportSplit.length * 40)} />
        </FoldCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Récords" subtitle="Estimados por el ritmo medio">
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
        <FoldCard title="Resumen mensual" className="lg:col-span-2">
          {/* en el móvil caben mes, km, carreras y ritmo; el resto, desde tableta */}
          <div>
            <table className="w-full text-sm tabular">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Mes</th>
                  <th className="pb-2 text-right font-medium">Km</th>
                  <th className="pb-2 text-right font-medium">Carreras</th>
                  <th className="pb-2 text-right font-medium">Ritmo</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Horas</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Desnivel</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">kcal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="py-1.5">{monthLabel(m.month)}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtKm(m.runKm)}</td>
                    <td className="py-1.5 text-right">{m.runs}</td>
                    <td className="py-1.5 text-right">{m.avgPace ? fmtPace(m.avgPace) : "–"}</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtKm(m.hours)}</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtNum(m.elevation)} m</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtNum(m.kcal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FoldCard>
      </div>

      <FoldCard title="Últimas actividades" subtitle="Carga: 100 ≈ 1 h a umbral">
        {/* en el móvil: fecha, actividad, distancia y ritmo; tiempo y FC desde tableta; lo demás en el ordenador */}
        <div>
          <table className="w-full text-sm tabular">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Actividad</th>
                <th className="pb-2 text-right font-medium">Distancia</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">Tiempo</th>
                <th className="pb-2 text-right font-medium">Ritmo</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">FC</th>
                <th className="hidden pb-2 text-right font-medium lg:table-cell">Desnivel</th>
                <th className="hidden pb-2 text-right font-medium lg:table-cell">Carga</th>
                <th className="hidden pb-2 text-right font-medium lg:table-cell">kcal</th>
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
                  <td className="hidden py-1.5 text-right sm:table-cell">{fmtDuration(a.movingSec)}</td>
                  <td className="py-1.5 text-right">{a.sport === "run" && a.distanceM ? fmtPace(a.movingSec / (a.distanceM / 1000)) : "–"}</td>
                  <td className="hidden py-1.5 text-right sm:table-cell">{a.avgHr ? Math.round(a.avgHr) : "–"}</td>
                  <td className="hidden py-1.5 text-right lg:table-cell">{Math.round(a.elevationGainM)} m</td>
                  <td className="hidden py-1.5 text-right lg:table-cell">{Math.round(activityLoad(a, db.profile!, stats.vdot.vdot))}</td>
                  <td className="hidden py-1.5 text-right lg:table-cell">{Math.round(activityKcal(a, db.profile!.weightKg))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FoldCard>
    </div>
  );
}
