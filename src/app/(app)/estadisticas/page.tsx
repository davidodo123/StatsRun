import type { Metadata } from "next";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { Card, Empty, FoldCard, Loading, PageHeader, Stat, StatGroup } from "@/components/ui";
import { SimpleBars, TrendLine, WeeklyKmChart } from "@/components/charts";
import { activityLoad } from "@/lib/engine/load";
import { activityKcal } from "@/lib/engine/stats";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { dayMonth, intlLocale, type Key } from "@/lib/i18n";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [{ db, stats }, { t, locale }] = await Promise.all([getAnalysis(), getT()]);
  const header = <PageHeader title={t("nav.estadisticas")} />;
  if (!db.profile || !stats)
    return (
      <>
        {header}
        <Empty title={t("st.sinPerfil")} href="/perfil" cta={t("st.crearPerfil")} />
      </>
    );
  if (!db.activities.length)
    return (
      <>
        {header}
        <Empty title={t("st.sinActs")} href="/registrar" cta={t("st.registrar")}>
          {t("st.sinActsTexto")}
        </Empty>
      </>
    );
  const intl = intlLocale(locale);
  const shortDate = (d: string) => dayMonth(d, locale);
  // «octubre de 2026» → «Octubre de 2026»
  const monthLabel = (m: string) => {
    const s = new Date(`${m}-01T00:00:00Z`).toLocaleDateString(intl, { month: "long", year: "numeric", timeZone: "UTC" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const weekdayShort = (i: number) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(intl, { weekday: "short", timeZone: "UTC" }).replace(".", "");

  const { totals: T } = stats;
  const weeks = stats.weeks.map((w) => ({ week: w.week, km: w.runKm }));
  const zoneTotal = stats.zoneTime.reduce((s, z) => s + z.minutes, 0);
  const zones = stats.zoneTime.map((z) => ({ name: `Z${z.zone} ${t(`zone.${z.zone}` as Key)}`, pct: zoneTotal ? (z.minutes / zoneTotal) * 100 : 0 }));
  const easyPct = zoneTotal ? ((stats.zoneTime[0].minutes + stats.zoneTime[1].minutes) / zoneTotal) * 100 : 0;
  const recent = [...db.activities].reverse().slice(0, 40);
  const vdotByMonth = stats.vdotTrend.map((v) => ({ month: v.month, vdot: v.vdot }));
  const monthsKm = stats.months.map((m) => ({ month: m.month, km: m.runKm }));

  return (
    <div className="space-y-4">
      {header}
      <StatGroup className="md:grid-cols-4 lg:grid-cols-6">
        <Stat label={t("st.kmAno")} value={fmtNum(T.yearKm, 0, locale)} unit="km" sub={t("st.carreras", { n: T.yearRuns })} />
        <Stat label={t("st.kmMes")} value={fmtKm(T.monthKm, 1, locale)} unit="km" />
        <Stat label={t("st.kmTotales")} value={fmtNum(T.allKm, 0, locale)} unit="km" sub={t("st.carreras", { n: T.allRuns })} />
        <Stat label={t("st.horas")} value={fmtNum(T.allHours, 0, locale)} unit="h" sub={t("st.todosDeportes")} />
        <Stat label={t("st.desnivel")} value={fmtNum(T.elevation, 0, locale)} unit="m" />
        <Stat label={t("st.kcal")} value={fmtNum(T.kcal / 1000, 1, locale)} unit={t("st.milKcal")} />
        <Stat label={t("st.racha")} value={T.streakDays} unit={t("st.dias")} sub={t("st.recordDias", { n: T.longestStreak })} />
        <Stat label={t("st.constancia")} value={`${Math.round(T.consistency)} %`} sub={t("st.semanasActivas")} />
        <Stat label={t("st.monotonia")} value={stats.monotony.toFixed(2)} sub={stats.monotony > 2 ? t("st.monoAlta") : t("st.monoBuena")} hint={t("st.monoHint")} />
        <Stat label={t("st.strain")} value={fmtNum(stats.strain, 0, locale)} sub={t("st.strainSub")} />
        <Stat label={t("st.suave")} value={`${Math.round(easyPct)} %`} sub={t("st.suaveSub")} />
        <Stat label={t("st.media6")} value={fmtKm(T.avgWeeklyKm6, 1, locale)} unit={t("st.kmSem")} />
      </StatGroup>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("st.kmSemana")} subtitle={t("st.ult26")}>
          <WeeklyKmChart data={weeks} locale={locale} />
        </Card>
        <FoldCard title={t("st.kmMesCard")} subtitle={t("st.ult12")}>
          <SimpleBars data={monthsKm} xKey="month" yKey="km" name="Km" unit="km" xFormat="month" height={220} locale={locale} />
        </FoldCard>
        <Card title={t("st.ritmoSem")} subtitle={t("st.ritmoSub")}>
          <TrendLine data={stats.paceTrend} dataKey="pace" name={t("st.ritmo")} format="pace" invert locale={locale} />
        </Card>
        <FoldCard title={t("st.fcMedia")} subtitle={t("st.fcSub")}>
          <TrendLine data={stats.paceTrend} dataKey="hr" name={t("act.fc")} color="s2" format="int" locale={locale} />
        </FoldCard>
        <FoldCard title={t("st.ef")} subtitle={t("st.efSub")}>
          <TrendLine data={stats.paceTrend} dataKey="ef" name="EF" color="s3" format="dec2" locale={locale} />
        </FoldCard>
        <FoldCard title={t("st.cadMedia")} subtitle={t("st.cadSub")}>
          <TrendLine data={stats.paceTrend} dataKey="cadence" name={t("act.cadencia")} format="int" locale={locale} />
        </FoldCard>
        <Card title={t("st.vdot")} subtitle={t("st.vdotSub")}>
          {vdotByMonth.length ? <TrendLine data={vdotByMonth} dataKey="vdot" name="VDOT" format="dec1" xKey="month" xFormat="month" locale={locale} /> : <p className="text-sm text-ink-2">{t("st.sinDatos")}</p>}
        </Card>
        <FoldCard title={t("st.intensidad")} subtitle={t("st.intensidadSub")}>
          <SimpleBars data={zones} xKey="name" yKey="pct" name={t("st.tiempo")} unit="%" horizontal ordinal xFormat="none" height={220} />
        </FoldCard>
        <FoldCard title={t("st.queDias")} subtitle={t("st.queDiasSub")}>
          <SimpleBars data={stats.weekdayKm.map((d) => ({ day: weekdayShort(d.day), km: d.km }))} xKey="day" yKey="km" name="Km" unit="km" xFormat="none" />
        </FoldCard>
        <FoldCard title={t("st.deportes")} subtitle={t("st.deportesSub")}>
          <SimpleBars data={stats.sportSplit.map((s) => ({ sport: t(`sport.${s.sport}` as Key), hours: s.hours }))} xKey="sport" yKey="hours" name={t("st.horasName")} unit="h" horizontal xFormat="none" height={Math.max(120, stats.sportSplit.length * 40)} />
        </FoldCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={t("st.records")} subtitle={t("st.recordsSub")}>
          <ul className="divide-y divide-line text-sm">
            {stats.records.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="block text-ink-2">{t(`st.rec.${r.id}`)}</span>
                  {r.sub && <span className="block text-xs text-muted">{r.sub}</span>}
                </span>
                <span className="text-right font-semibold tabular">
                  {r.id === "streak" ? t("st.diasN", { n: T.longestStreak }) : r.value}
                  {r.date && <span className="block text-[11px] font-normal text-muted">{shortDate(r.date)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <FoldCard title={t("st.resumenMensual")} className="lg:col-span-2">
          {/* en el móvil caben mes, km, carreras y ritmo; el resto, desde tableta */}
          <div>
            <table className="w-full text-sm tabular">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">{t("st.mes")}</th>
                  <th className="pb-2 text-right font-medium">Km</th>
                  <th className="pb-2 text-right font-medium">{t("st.carrerasCol")}</th>
                  <th className="pb-2 text-right font-medium">{t("st.ritmo")}</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("st.horasCol")}</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("st.desnivelCol")}</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">kcal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="py-1.5">{monthLabel(m.month)}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtKm(m.runKm, 1, locale)}</td>
                    <td className="py-1.5 text-right">{m.runs}</td>
                    <td className="py-1.5 text-right">{m.avgPace ? fmtPace(m.avgPace) : "–"}</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtKm(m.hours, 1, locale)}</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtNum(m.elevation, 0, locale)} m</td>
                    <td className="hidden py-1.5 text-right sm:table-cell">{fmtNum(m.kcal, 0, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FoldCard>
      </div>

      <FoldCard title={t("st.ultimas")} subtitle={t("st.cargaSub")}>
        {/* en el móvil: fecha, actividad, distancia y ritmo; tiempo y FC desde tableta; lo demás en el ordenador */}
        <div>
          <table className="w-full text-sm tabular">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">{t("st.fecha")}</th>
                <th className="pb-2 font-medium">{t("st.actividad")}</th>
                <th className="pb-2 text-right font-medium">{t("act.distancia")}</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("st.tiempoCol")}</th>
                <th className="pb-2 text-right font-medium">{t("st.ritmo")}</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("st.fcCol")}</th>
                <th className="hidden pb-2 text-right font-medium lg:table-cell">{t("st.desnivelCol")}</th>
                <th className="hidden pb-2 text-right font-medium lg:table-cell">{t("st.carga")}</th>
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
                    <span className="ml-2 text-xs text-muted">{t(`sport.${a.sport}`)}</span>
                  </td>
                  <td className="py-1.5 text-right">{a.distanceM ? `${fmtKm(a.distanceM / 1000, 2, locale)} km` : "–"}</td>
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
