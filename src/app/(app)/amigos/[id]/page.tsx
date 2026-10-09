import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { FitnessChart, WeeklyKmChart } from "@/components/charts";
import { SessionCard } from "@/components/SessionCard";
import { areFriends, getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { athleteSummary, type AthleteSummary } from "@/lib/summary";
import { shortDate, todayLocal } from "@/lib/dates";
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
  const { id } = await params;
  const uid = await requireUserId();
  // solo se ven las estadísticas de los amigos
  if (!(await areFriends(uid, id))) notFound();
  const friend = await getUser(id);
  if (!friend) notFound();
  const [fDb, myDb] = await Promise.all([getDb(id), getDb(uid)]);
  // la fecha, después de leer datos de la petición (con cacheComponents no puede ir antes)
  const today = todayLocal();
  const f = athleteSummary(fDb, today);
  const me = athleteSummary(myDb, today);
  const first = friend.name.split(" ")[0];
  const names = new Map<string, string>([[uid, "ti"], [friend.id, friend.name]]);
  const tags = tagsForDb(fDb, f.stats?.vdot.vdot);

  return (
    <>
      <PageHeader
        title={friend.name}
        subtitle={
          f.goal ? (
            <>
              Prepara <strong className="text-ink">{f.goal.name}</strong> ({shortDate(f.goal.date)})
              {f.daysToRace !== undefined && f.daysToRace >= 0 && ` · faltan ${f.daysToRace} días`}
            </>
          ) : (
            `@${friend.username} · sin carrera objetivo`
          )
        }
        action={
          <Link href="/amigos" className="btn btn-ghost">
            ← Amigos
          </Link>
        }
      />

      {!f.stats ? (
        <Card>
          <p className="text-sm text-ink-2">{first} todavía no ha completado su perfil.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="VDOT" value={f.stats.vdot.vdot.toFixed(1)} hint={f.stats.vdot.source} />
            <Stat label="Esta semana" value={fmtKm(f.stats.totals.weekKm)} unit="km" sub={`Media 6 sem: ${fmtKm(f.stats.totals.avgWeeklyKm6)} km`} />
            <Stat label="Forma (CTL)" value={f.stats.today.ctl.toFixed(0)} />
            <Stat label="Frescura (TSB)" value={f.stats.today.tsb.toFixed(0)} />
            <Stat label="Cumplimiento" value={f.compliance !== undefined ? `${Math.round(f.compliance * 100)} %` : "–"} sub={f.pastSessions ? `${f.pastSessions} sesiones` : "Sin sesiones pasadas"} />
            <Stat
              label={f.prediction ? `Predicción ${f.prediction.label}` : "Predicción"}
              value={f.prediction ? fmtDuration(f.prediction.timeSec) : "–"}
              sub={f.goal?.targetTimeSec ? `Objetivo ${fmtDuration(f.goal.targetTimeSec)}` : undefined}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card title={`Tú vs ${first}`} subtitle="Cómo vais los dos de cara a la carrera">
                <Comparison me={me} friend={f} friendName={first} />
              </Card>
              <Card title="Volumen semanal" subtitle={`Kilómetros de ${first}${fDb.plan ? " frente a su plan" : ""}`}>
                <WeeklyKmChart data={f.weekly} />
              </Card>
              <Card title="Forma y fatiga" subtitle="Últimos 120 días">
                <FitnessChart data={f.stats.fitness.slice(-120).map((p) => ({ date: p.date, ctl: p.ctl, atl: p.atl }))} />
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Su semana" subtitle={fDb.plan ? "Sesiones planificadas y si las ha hecho" : undefined}>
                {f.weekSessions.length ? (
                  <div className="space-y-2">
                    {f.weekSessions.map((s) => (
                      <SessionCard key={s.id} s={s} match={f.matches?.get(s.id)} compact readOnly />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-2">{fDb.plan ? "Sin sesiones esta semana." : `${first} no tiene plan activo.`}</p>
                )}
              </Card>
              <Card title="Últimos entrenos">
                {f.recent.length ? (
                  <ul className="divide-y divide-line">
                    {f.recent.map((a) => (
                      <ActivityItem key={a.id} a={publicActivity(a)} href={`/actividad/${encodeURIComponent(a.id)}?de=${friend.id}`} names={names} tags={tags.get(a.id)} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-2">Aún no ha registrado entrenos.</p>
                )}
              </Card>
              <Card title="Récords">
                <ul className="divide-y divide-line text-sm">
                  {f.stats.records.slice(0, 8).map((r) => (
                    <li key={r.label} className="flex justify-between gap-2 py-2">
                      <span className="text-ink-2">{r.label}</span>
                      <span className="font-semibold tabular">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <form action={unfriend} className="px-1">
                <input type="hidden" name="id" value={friend.id} />
                <button className="text-xs text-ink-2 underline hover:text-critical">Dejar de compartir estadísticas con {first}</button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Comparison({ me, friend, friendName }: { me: AthleteSummary; friend: AthleteSummary; friendName: string }) {
  const pct = (x?: number) => (x === undefined ? "–" : `${Math.round(x * 100)} %`);
  const rows: [string, string, string][] = [
    ["Carrera objetivo", me.goal ? `${me.goal.name} (${shortDate(me.goal.date)})` : "–", friend.goal ? `${friend.goal.name} (${shortDate(friend.goal.date)})` : "–"],
    ["Días para la carrera", me.daysToRace !== undefined && me.daysToRace >= 0 ? String(me.daysToRace) : "–", friend.daysToRace !== undefined && friend.daysToRace >= 0 ? String(friend.daysToRace) : "–"],
    ["VDOT", me.stats?.vdot.vdot.toFixed(1) ?? "–", friend.stats?.vdot.vdot.toFixed(1) ?? "–"],
    ["Km esta semana", fmtKm(me.stats?.totals.weekKm ?? 0), fmtKm(friend.stats?.totals.weekKm ?? 0)],
    ["Media km/semana (6 sem)", fmtKm(me.stats?.totals.avgWeeklyKm6 ?? 0), fmtKm(friend.stats?.totals.avgWeeklyKm6 ?? 0)],
    ["Forma (CTL)", me.stats?.today.ctl.toFixed(0) ?? "–", friend.stats?.today.ctl.toFixed(0) ?? "–"],
    ["Frescura (TSB)", me.stats?.today.tsb.toFixed(0) ?? "–", friend.stats?.today.tsb.toFixed(0) ?? "–"],
    ["Cumplimiento del plan", pct(me.compliance), pct(friend.compliance)],
    ["Racha (días seguidos)", String(me.stats?.totals.streakDays ?? 0), String(friend.stats?.totals.streakDays ?? 0)],
    [
      "Predicción para su carrera",
      me.prediction ? `${me.prediction.label}: ${fmtDuration(me.prediction.timeSec)}` : "–",
      friend.prediction ? `${friend.prediction.label}: ${fmtDuration(friend.prediction.timeSec)}` : "–",
    ],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm tabular">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2 font-medium" />
            <th className="pb-2 font-medium">Tú</th>
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
