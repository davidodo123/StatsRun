import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Status } from "@/components/ui";
import { FriendCodeForm } from "@/components/FriendCodeForm";
import { getFriends, getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { athleteSummary } from "@/lib/summary";
import { todayLocal, shortDate } from "@/lib/dates";
import { fmtDuration, fmtKm } from "@/lib/format";
import { newFriendCode } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Amigos" };

export default function AmigosPage() {
  return (
    <>
      <PageHeader title="Amigos" subtitle="Preparad la carrera juntos: mirad cómo va el otro, sus entrenos y su forma." />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const uid = await requireUserId();
  const [me, friends] = await Promise.all([getUser(uid), getFriends(uid)]);
  const today = todayLocal();
  const summaries = await Promise.all(friends.map(async (f) => ({ f, s: athleteSummary(await getDb(f.id), today) })));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {summaries.length === 0 && (
          <Card>
            <p className="text-sm text-ink-2">
              Aún no tienes amigos añadidos. Pásale tu código a tu amigo (o pídele el suyo) y añadidlo aquí: os veréis las estadísticas los dos.
            </p>
          </Card>
        )}
        {summaries.map(({ f, s }) => (
          <Link key={f.id} href={`/amigos/${f.id}`} className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold">{f.name}</span>
              <span className="text-sm text-muted">@{f.username}</span>
              <span className="ml-auto text-sm font-semibold text-accent">Ver stats →</span>
            </div>
            <p className="mt-1 text-sm text-ink-2">
              {s.goal ? (
                <>
                  {s.goal.name} · {shortDate(s.goal.date)}
                  {s.daysToRace !== undefined && s.daysToRace >= 0 && ` · faltan ${s.daysToRace} días`}
                </>
              ) : (
                "Sin carrera objetivo"
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular">
              <span>
                <span className="text-muted">Semana </span>
                <strong>{fmtKm(s.stats?.totals.weekKm ?? 0)} km</strong>
              </span>
              <span>
                <span className="text-muted">Media 6 sem </span>
                <strong>{fmtKm(s.stats?.totals.avgWeeklyKm6 ?? 0)} km</strong>
              </span>
              {s.stats && (
                <span>
                  <span className="text-muted">VDOT </span>
                  <strong>{s.stats.vdot.vdot.toFixed(1)}</strong>
                </span>
              )}
              {s.prediction && (
                <span>
                  <span className="text-muted">Predicción {s.prediction.label} </span>
                  <strong>{fmtDuration(s.prediction.timeSec)}</strong>
                </span>
              )}
              {s.compliance !== undefined && (
                <Status tone={s.compliance >= 0.8 ? "good" : s.compliance >= 0.5 ? "warn" : "bad"}>Cumple el plan al {Math.round(s.compliance * 100)} %</Status>
              )}
            </div>
            {s.lastActivityDays !== undefined && (
              <p className="mt-2 text-xs text-muted">Último entreno: {s.lastActivityDays === 0 ? "hoy" : s.lastActivityDays === 1 ? "ayer" : `hace ${s.lastActivityDays} días`}</p>
            )}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        <Card title="Tu código de amigo" subtitle="Quien lo tenga podrá ver tus estadísticas (y tú las suyas)">
          <p className="select-all rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em]">{me?.friendCode}</p>
          <form action={newFriendCode} className="mt-2 text-center">
            <button className="text-xs text-ink-2 underline">Cambiar código</button>
          </form>
        </Card>
        <Card title="Añadir amigo" subtitle="Escribe el código de tu amigo">
          <FriendCodeForm />
        </Card>
        <p className="px-1 text-xs text-muted">
          Tu amigo necesita su propia cuenta: que se registre con el código de invitación de la app y luego añadíos con vuestros códigos de amigo.
        </p>
      </div>
    </div>
  );
}
