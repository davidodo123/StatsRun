import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Status } from "@/components/ui";
import { FriendCodeForm } from "@/components/FriendCodeForm";
import { ActivityItem } from "@/components/ActivityItem";
import { getFriends, getRequests, getUser, searchUsers, type PublicUser, type SearchResult } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { tagsForDb } from "@/lib/engine/tags";
import { requireUserId } from "@/lib/session";
import { athleteSummary } from "@/lib/summary";
import { todayLocal, shortDate } from "@/lib/dates";
import { fmtDuration, fmtKm } from "@/lib/format";
import { answerRequest, cancelRequest, newFriendCode, requestFriend } from "@/app/auth-actions";
import { copySharedActivity, dismissSharedActivity } from "@/app/actions";

export const metadata: Metadata = { title: "Amigos" };

export default function AmigosPage({ searchParams }: PageProps<"/amigos">) {
  return (
    <>
      <PageHeader title="Amigos" subtitle="Preparad la carrera juntos: mirad cómo va el otro, sus entrenos y su forma." />
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/amigos">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  const uid = await requireUserId();
  const today = todayLocal();
  const [me, friends, requests, results, myDb] = await Promise.all([getUser(uid), getFriends(uid), getRequests(uid), q ? searchUsers(uid, q) : Promise.resolve([]), getDb()]);
  const dbs = await Promise.all(friends.map(async (f) => ({ f, db: await getDb(f.id) })));
  const summaries = dbs.map(({ f, db }) => ({ f, s: athleteSummary(db, today) }));
  const feed = buildFeed(
    uid,
    myDb,
    dbs.map(({ f, db }) => ({ person: { id: f.id, name: f.name }, db })),
    today,
  );
  const names = new Map<string, string>([...friends.map((f) => [f.id, f.name] as [string, string]), [uid, "ti"]]);
  const tagsByOwner = new Map(dbs.map(({ f, db }, i) => [f.id, tagsForDb(db, summaries[i].s.stats?.vdot.vdot)]));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {requests.received.length > 0 && (
          <Card title="Solicitudes de amistad" subtitle="Si aceptas, os veréis las estadísticas y entrenos">
            <ul className="divide-y divide-line">
              {requests.received.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Person u={u} />
                  <form action={answerRequest} className="ml-auto flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <button name="accept" value="1" className="btn">
                      Aceptar
                    </button>
                    <button name="accept" value="0" className="btn btn-ghost">
                      Rechazar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {feed.sharedWithMe.length > 0 && (
          <Card title="Entrenasteis juntos" subtitle="Un amigo te ha añadido a su sesión. Añádela a tus entrenos para que cuente en tu plan.">
            <ul className="divide-y divide-line">
              {feed.sharedWithMe.map(({ owner, activity: a }) => (
                <ActivityItem
                  key={`${owner.id}:${a.id}`}
                  a={a}
                  href={`/actividad/${encodeURIComponent(a.id)}?de=${owner.id}`}
                  names={names}
                  owner={owner.name}
                  tags={tagsByOwner.get(owner.id)?.get(a.id)}
                  action={
                    <span className="flex shrink-0 flex-col gap-1">
                      <form action={copySharedActivity}>
                        <input type="hidden" name="owner" value={owner.id} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="btn w-full px-3 py-1 text-xs">Añadir</button>
                      </form>
                      <form action={dismissSharedActivity}>
                        <input type="hidden" name="owner" value={owner.id} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="w-full text-[11px] text-muted underline">No, gracias</button>
                      </form>
                    </span>
                  }
                />
              ))}
            </ul>
          </Card>
        )}

        <Card title="Actividad de tus amigos" subtitle="Últimos 14 días">
          {feed.items.length ? (
            <ul className="divide-y divide-line">
              {feed.items.map(({ owner, activity: a }) => (
                <ActivityItem key={`${owner.id}:${a.id}`} a={a} href={`/actividad/${encodeURIComponent(a.id)}?de=${owner.id}`} names={names} owner={owner.name} tags={tagsByOwner.get(owner.id)?.get(a.id)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">{friends.length ? "Tus amigos no han entrenado en los últimos 14 días." : "Cuando tengas amigos, aquí verás sus entrenos."}</p>
          )}
        </Card>

        <Card title={`Tus amigos (${friends.length})`}>
          {summaries.length === 0 && <p className="text-sm text-ink-2">Aún no tienes amigos añadidos. Búscalos por su nombre o usa su código.</p>}
          <div className="space-y-3">
            {summaries.map(({ f, s }) => (
              <Link key={f.id} href={`/amigos/${f.id}`} className="block rounded-xl border border-line p-3 transition hover:border-accent">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{f.name}</span>
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
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular">
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
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Buscar perfiles" subtitle="Por nombre o @usuario">
          <form action="/amigos" className="flex gap-2">
            <input className="input min-w-0 flex-1" name="q" defaultValue={q} placeholder="Ej.: Ana o @ana" minLength={2} aria-label="Buscar perfiles" />
            <button className="btn">Buscar</button>
          </form>
          {q && <SearchResults q={q} results={results} />}
        </Card>

        {requests.sent.length > 0 && (
          <Card title="Solicitudes enviadas">
            <ul className="divide-y divide-line">
              {requests.sent.map((u) => (
                <li key={u.id} className="flex items-center gap-2 py-2">
                  <Person u={u} />
                  <form action={cancelRequest} className="ml-auto">
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-xs text-ink-2 underline">Retirar</button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Tu código de amigo" subtitle="Quien lo tenga puede añadirte sin solicitud">
          <p className="select-all rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em]">{me?.friendCode}</p>
          <form action={newFriendCode} className="mt-2 text-center">
            <button className="text-xs text-ink-2 underline">Cambiar código</button>
          </form>
        </Card>
        <Card title="Añadir con código" subtitle="Escribe el código de tu amigo">
          <FriendCodeForm />
        </Card>
        <p className="px-1 text-xs text-muted">Tu amigo necesita su propia cuenta: que entre en la app con su cuenta de Google.</p>
      </div>
    </div>
  );
}

function Person({ u }: { u: Pick<PublicUser, "name" | "username" | "picture"> }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {u.picture ? (
        // foto de Google: dominio externo, sin optimizar
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u.picture} alt="" className="h-8 w-8 shrink-0 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold" aria-hidden>
          {u.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{u.name}</span>
        <span className="block truncate text-xs text-muted">@{u.username}</span>
      </span>
    </span>
  );
}

function SearchResults({ q, results }: { q: string; results: SearchResult[] }) {
  if (q.replace(/^@/, "").trim().length < 2) return <p className="mt-3 text-xs text-muted">Escribe al menos 2 letras.</p>;
  if (!results.length) return <p className="mt-3 text-sm text-ink-2">Nadie coincide con «{q}».</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {results.map((u) => (
        <li key={u.id} className="flex items-center gap-2 py-2">
          <Person u={u} />
          <span className="ml-auto shrink-0">
            {u.relation === "amigo" ? (
              <Link href={`/amigos/${u.id}`} className="text-xs font-semibold text-accent">
                Amigos ✓
              </Link>
            ) : u.relation === "enviada" ? (
              <span className="text-xs text-muted">Solicitud enviada</span>
            ) : (
              <form action={requestFriend}>
                <input type="hidden" name="id" value={u.id} />
                <button className="btn px-3 py-1 text-xs">{u.relation === "recibida" ? "Aceptar" : "Añadir"}</button>
              </form>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
