import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { FitnessChart, WeeklyKmChart } from "@/components/charts";
import { SessionCard } from "@/components/SessionCard";
import { viewAreFriends, viewUser } from "@/lib/authView";
import { getDb } from "@/lib/db";
import { requireViewerId } from "@/lib/session";
import { athleteSummary, type AthleteSummary } from "@/lib/summary";
import { getT } from "@/lib/i18n/server";
import { dayMonth, type Key, type Locale, type T } from "@/lib/i18n";
import { viewToday } from "@/lib/analysis";
import { fmtDuration, fmtKm } from "@/lib/format";
import { unfriend } from "@/app/auth-actions";
import { ActivityItem } from "@/components/ActivityItem";
import { publicActivity } from "@/lib/feed";
import { tagsForDb } from "@/lib/engine/tags";

export const metadata: Metadata = { title: "Stats de tu amigo" };

export default function FriendPage({ params }: PageProps<"/amigos/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/amigos/[id]">["params"] }) {
  const [{ id }, { t, locale }] = await Promise.all([params, getT()]);
  const shortDate = (d: string) => dayMonth(d, locale);
  const uid = await requireViewerId();
  // solo se ven las estadísticas de los amigos
  if (!(await viewAreFriends(uid, id))) notFound();
  const friend = await viewUser(id);
  if (!friend) notFound();
  const [fDb, myDb] = await Promise.all([getDb(id), getDb(uid)]);
  // la fecha, después de leer datos de la petición (con cacheComponents no puede ir antes)
  const today = (await viewToday());
  const f = athleteSummary(fDb, today);
  const me = athleteSummary(myDb, today);
  const first = friend.name.split(" ")[0];
  const names = new Map<string, string>([[uid, t("act.ti")], [friend.id, friend.name]]);
  const tags = tagsForDb(fDb, f.stats?.vdot.vdot);

  return (
    <>
      <PageHeader
        title={friend.name}
        subtitle={
          f.goal ? (
            <>
              {t("amf.prepara")} <strong className="text-ink">{f.goal.name}</strong> ({shortDate(f.goal.date)})
              {f.daysToRace !== undefined && f.daysToRace >= 0 && t("amf.faltan", { n: f.daysToRace })}
            </>
          ) : (
            t("amf.sinCarrera", { usuario: friend.username })
          )
        }
        action={
          <BackLink href="/amigos" className="btn btn-ghost" label={t("comun.volver")} />
        }
      />

      {!f.stats ? (
        <Card>
          <p className="text-sm text-ink-2">{t("amf.sinPerfil", { nombre: first })}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="VDOT" value={f.stats.vdot.vdot.toFixed(1)} hint={f.stats.vdot.source} />
            <Stat label={t("amf.estaSemana")} value={fmtKm(f.stats.totals.weekKm, 1, locale)} unit="km" sub={t("amf.media6", { km: fmtKm(f.stats.totals.avgWeeklyKm6, 1, locale) })} />
            <Stat label={t("inicio.forma")} value={f.stats.today.ctl.toFixed(0)} />
            <Stat label={t("inicio.frescura")} value={f.stats.today.tsb.toFixed(0)} />
            <Stat label={t("amf.cumplimiento")} value={f.compliance !== undefined ? `${Math.round(f.compliance * 100)} %` : "–"} sub={f.pastSessions ? t("amf.sesiones", { n: f.pastSessions }) : t("amf.sinPasadas")} />
            <Stat
              label={f.prediction ? `${t("amf.prediccion")} · ${t(`pr.d.${f.prediction.label}` as Key)}` : t("amf.prediccion")}
              value={f.prediction ? fmtDuration(f.prediction.timeSec) : "–"}
              sub={f.goal?.targetTimeSec ? t("amf.objetivo", { t: fmtDuration(f.goal.targetTimeSec) }) : undefined}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card title={t("amf.vs", { nombre: first })} subtitle={t("amf.vsSub")}>
                <Comparison me={me} friend={f} friendName={first} t={t} locale={locale} />
              </Card>
              <Card title={t("amf.volumen")} subtitle={t(fDb.plan ? "amf.volumenPlan" : "amf.volumenSub", { nombre: first })}>
                <WeeklyKmChart data={f.weekly} locale={locale} />
              </Card>
              <Card title={t("amf.forma")} subtitle={t("amf.ult120")}>
                <FitnessChart data={f.stats.fitness.slice(-120).map((p) => ({ date: p.date, ctl: p.ctl, atl: p.atl }))} locale={locale} />
              </Card>
            </div>

            <div className="space-y-4">
              <Card title={t("amf.suSemana")} subtitle={fDb.plan ? t("amf.suSemanaSub") : undefined}>
                {f.weekSessions.length ? (
                  <div className="space-y-2">
                    {f.weekSessions.map((s) => (
                      <SessionCard key={s.id} s={s} match={f.matches?.get(s.id)} compact readOnly locale={locale} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-2">{fDb.plan ? t("amf.sinSesiones") : t("amf.sinPlan", { nombre: first })}</p>
                )}
              </Card>
              <Card title={t("fh.ultimos")}>
                {f.recent.length ? (
                  <ul className="divide-y divide-line">
                    {f.recent.map((a) => (
                      <ActivityItem key={a.id} a={publicActivity(a)} href={`/actividad/${encodeURIComponent(a.id)}?de=${friend.id}`} names={names} ownerId={friend.id} tags={tags.get(a.id)} locale={locale} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-2">{t("amf.sinEntrenos")}</p>
                )}
              </Card>
              <Card title={t("st.records")}>
                <ul className="divide-y divide-line text-sm">
                  {f.stats.records.slice(0, 8).map((r) => (
                    <li key={r.label} className="flex justify-between gap-2 py-2">
                      <span className="text-ink-2">{t(`st.rec.${r.id}`)}</span>
                      <span className="font-semibold tabular">{r.id === "streak" ? t("st.diasN", { n: f.stats!.totals.longestStreak }) : r.value}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <form action={unfriend} className="px-1">
                <input type="hidden" name="id" value={friend.id} />
                <button className="text-xs text-ink-2 underline hover:text-critical">{t("amf.dejar", { nombre: first })}</button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Comparison({ me, friend, friendName, t, locale }: { me: AthleteSummary; friend: AthleteSummary; friendName: string; t: T; locale: Locale }) {
  const shortDate = (d: string) => dayMonth(d, locale);
  const dist = (label: string) => t(`pr.d.${label}` as Key);
  const pct = (x?: number) => (x === undefined ? "–" : `${Math.round(x * 100)} %`);
  const rows: [string, string, string][] = [
    [t("amf.r.carrera"), me.goal ? `${me.goal.name} (${shortDate(me.goal.date)})` : "–", friend.goal ? `${friend.goal.name} (${shortDate(friend.goal.date)})` : "–"],
    [t("amf.r.dias"), me.daysToRace !== undefined && me.daysToRace >= 0 ? String(me.daysToRace) : "–", friend.daysToRace !== undefined && friend.daysToRace >= 0 ? String(friend.daysToRace) : "–"],
    ["VDOT", me.stats?.vdot.vdot.toFixed(1) ?? "–", friend.stats?.vdot.vdot.toFixed(1) ?? "–"],
    [t("amf.r.km"), fmtKm(me.stats?.totals.weekKm ?? 0, 1, locale), fmtKm(friend.stats?.totals.weekKm ?? 0, 1, locale)],
    [t("amf.r.media"), fmtKm(me.stats?.totals.avgWeeklyKm6 ?? 0, 1, locale), fmtKm(friend.stats?.totals.avgWeeklyKm6 ?? 0, 1, locale)],
    [t("inicio.forma"), me.stats?.today.ctl.toFixed(0) ?? "–", friend.stats?.today.ctl.toFixed(0) ?? "–"],
    [t("inicio.frescura"), me.stats?.today.tsb.toFixed(0) ?? "–", friend.stats?.today.tsb.toFixed(0) ?? "–"],
    [t("amf.r.cumplimiento"), pct(me.compliance), pct(friend.compliance)],
    [t("amf.r.racha"), String(me.stats?.totals.streakDays ?? 0), String(friend.stats?.totals.streakDays ?? 0)],
    [
      t("amf.r.prediccion"),
      me.prediction ? `${dist(me.prediction.label)}: ${fmtDuration(me.prediction.timeSec)}` : "–",
      friend.prediction ? `${dist(friend.prediction.label)}: ${fmtDuration(friend.prediction.timeSec)}` : "–",
    ],
  ];
  return (
    <div>
      <table className="w-full text-sm tabular">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2 font-medium" />
            <th className="pb-2 font-medium">{t("amf.tu")}</th>
            <th className="pb-2 font-medium">{friendName}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([l, a, b]) => (
            <tr key={l}>
              <td className="py-2 pr-3 text-ink-2">{l}</td>
              <td className="py-2 pr-3 font-semibold">{a}</td>
              <td className="py-2 font-semibold">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
