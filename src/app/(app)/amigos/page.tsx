import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, ChipLink, Loading, PageHeader, Status } from "@/components/ui";
import { FriendCodeForm } from "@/components/FriendCodeForm";
import { ActivityItem } from "@/components/ActivityItem";
import { searchUsers, type PublicUser, type SearchResult } from "@/lib/auth";
import { viewFriends, viewRequests, viewUser } from "@/lib/authView";
import { getDb } from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { tagsForDb } from "@/lib/engine/tags";
import { requireViewerId } from "@/lib/session";
import { athleteSummary } from "@/lib/summary";
import { getT } from "@/lib/i18n/server";
import { dayMonth, type Key, type T } from "@/lib/i18n";
import { viewToday } from "@/lib/analysis";
import { fmtDuration, fmtKm } from "@/lib/format";
import { answerRequest, cancelRequest, newFriendCode, requestFriend } from "@/app/auth-actions";
import { copySharedActivity, dismissSharedActivity } from "@/app/actions";

export const metadata: Metadata = { title: "Amigos" };

export default function AmigosPage({ searchParams }: PageProps<"/amigos">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

// «Predicción media maratón»: la distancia de la predicción en el idioma
const distKey = (km: number) => `dist.${km < 7 ? 5 : km < 15 ? 10 : km < 30 ? 21 : 42}` as Key;

async function Content({ searchParams }: { searchParams: PageProps<"/amigos">["searchParams"] }) {
  const [sp, { t, locale }] = await Promise.all([searchParams, getT()]);
  const shortDate = (d: string) => dayMonth(d, locale);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  const uid = await requireViewerId();
  const [me, friends, requests, results, myDb] = await Promise.all([viewUser(uid), viewFriends(uid), viewRequests(uid), q ? searchUsers(uid, q) : Promise.resolve([]), getDb()]);
  // la fecha, después de leer datos de la petición (con cacheComponents no puede ir antes)
  const today = (await viewToday());
  const dbs = await Promise.all(friends.map(async (f) => ({ f, db: await getDb(f.id) })));
  const summaries = dbs.map(({ f, db }) => ({ f, s: athleteSummary(db, today) }));
  const feed = buildFeed(
    uid,
    myDb,
    dbs.map(({ f, db }) => ({ person: { id: f.id, name: f.name }, db })),
    today,
  );
  const names = new Map<string, string>([...friends.map((f) => [f.id, f.name] as [string, string]), [uid, t("act.ti")]]);
  const tagsByOwner = new Map(dbs.map(({ f, db }, i) => [f.id, tagsForDb(db, summaries[i].s.stats?.vdot.vdot)]));

  return (
    <>
    <PageHeader title={t("nav.amigos")} subtitle={t("am.sub")} />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {requests.received.length > 0 && (
          <Card title={t("am.solicitudes")} subtitle={t("am.solicitudesSub")}>
            <ul className="divide-y divide-line">
              {requests.received.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Person u={u} />
                  <form action={answerRequest} className="ml-auto flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <button name="accept" value="1" className="btn">
                      {t("am.aceptar")}
                    </button>
                    <button name="accept" value="0" className="btn btn-ghost">
                      {t("am.rechazar")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {feed.sharedWithMe.length > 0 && (
          <Card title={t("am.juntos")} subtitle={t("am.juntosSub")}>
            <ul className="divide-y divide-line">
              {feed.sharedWithMe.map(({ owner, activity: a }) => (
                <ActivityItem
                  key={`${owner.id}:${a.id}`}
                  a={a}
                  href={`/actividad/${encodeURIComponent(a.id)}?de=${owner.id}`}
                  names={names}
                  owner={owner.name}
                  ownerId={owner.id}
                  tags={tagsByOwner.get(owner.id)?.get(a.id)}
                  locale={locale}
                  action={
                    <span className="flex shrink-0 flex-col gap-1">
                      <form action={copySharedActivity}>
                        <input type="hidden" name="owner" value={owner.id} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="btn w-full px-3 py-1 text-xs">{t("am.anadir")}</button>
                      </form>
                      <form action={dismissSharedActivity}>
                        <input type="hidden" name="owner" value={owner.id} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="w-full text-[11px] text-muted underline">{t("am.noGracias")}</button>
                      </form>
                    </span>
                  }
                />
              ))}
            </ul>
          </Card>
        )}

        <Card title={t("am.actividad")} subtitle={t("am.ult14")}>
          {feed.items.length ? (
            <ul className="divide-y divide-line">
              {feed.items.map(({ owner, activity: a }) => (
                <ActivityItem key={`${owner.id}:${a.id}`} a={a} href={`/actividad/${encodeURIComponent(a.id)}?de=${owner.id}`} names={names} owner={owner.name}
                  ownerId={owner.id} tags={tagsByOwner.get(owner.id)?.get(a.id)} locale={locale} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">{friends.length ? t("am.sinEntrenos") : t("am.sinAmigosFeed")}</p>
          )}
        </Card>

        <Card title={t("am.tusAmigos", { n: friends.length })}>
          {summaries.length === 0 && <p className="text-sm text-ink-2">{t("am.sinAmigos")}</p>}
          <div className="space-y-3">
            {summaries.map(({ f, s }) => (
              <Link key={f.id} href={`/amigos/${f.id}`} className="block rounded-xl border border-line p-3 transition hover:border-accent">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-sm text-muted">@{f.username}</span>
                  <ChipLink className="ml-auto">{t("am.verStats")}</ChipLink>
                </div>
                <p className="mt-1 text-sm text-ink-2">
                  {s.goal ? (
                    <>
                      {s.goal.name} · {shortDate(s.goal.date)}
                      {s.daysToRace !== undefined && s.daysToRace >= 0 && ` · ${t("am.faltan", { n: s.daysToRace })}`}
                    </>
                  ) : (
                    t("am.sinCarrera")
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular">
                  <span>
                    <span className="text-muted">{t("am.semana")} </span>
                    <strong>{fmtKm(s.stats?.totals.weekKm ?? 0)} km</strong>
                  </span>
                  <span>
                    <span className="text-muted">{t("am.media6")} </span>
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
                      <span className="text-muted">{t("am.prediccion", { d: t(distKey(s.prediction.km)) })} </span>
                      <strong>{fmtDuration(s.prediction.timeSec)}</strong>
                    </span>
                  )}
                  {s.compliance !== undefined && (
                    <Status tone={s.compliance >= 0.8 ? "good" : s.compliance >= 0.5 ? "warn" : "bad"}>{t("am.cumple", { n: Math.round(s.compliance * 100) })}</Status>
                  )}
                </div>
                {s.lastActivityDays !== undefined && (
                  <p className="mt-2 text-xs text-muted">{t("am.ultimo", { cuando: s.lastActivityDays === 0 ? t("am.hoy") : s.lastActivityDays === 1 ? t("am.ayer") : t("am.haceDias", { n: s.lastActivityDays }) })}</p>
                )}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card title={t("am.buscar")} subtitle={t("am.buscarSub")}>
          <form action="/amigos" className="flex gap-2">
            <input className="input min-w-0 flex-1" name="q" defaultValue={q} placeholder={t("am.buscarPh")} minLength={2} aria-label={t("am.buscar")} />
            <button className="btn">{t("am.buscarBtn")}</button>
          </form>
          {q && <SearchResults q={q} results={results} t={t} />}
        </Card>

        {requests.sent.length > 0 && (
          <Card title={t("am.enviadas")}>
            <ul className="divide-y divide-line">
              {requests.sent.map((u) => (
                <li key={u.id} className="flex items-center gap-2 py-2">
                  <Person u={u} />
                  <form action={cancelRequest} className="ml-auto">
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-xs text-ink-2 underline">{t("am.retirar")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={t("am.tuCodigo")} subtitle={t("am.tuCodigoSub")}>
          <p className="select-all rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em]">{me?.friendCode}</p>
          <form action={newFriendCode} className="mt-2 text-center">
            <button className="text-xs text-ink-2 underline">{t("am.cambiarCodigo")}</button>
          </form>
        </Card>
        <Card title={t("am.conCodigo")} subtitle={t("am.conCodigoSub")}>
          <FriendCodeForm locale={locale} />
        </Card>
        <p className="px-1 text-xs text-muted">{t("am.cuentaPropia")}</p>
      </div>
    </div>
    </>
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

function SearchResults({ q, results, t }: { q: string; results: SearchResult[]; t: T }) {
  if (q.replace(/^@/, "").trim().length < 2) return <p className="mt-3 text-xs text-muted">{t("am.minLetras")}</p>;
  if (!results.length) return <p className="mt-3 text-sm text-ink-2">{t("am.nadie", { q })}</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {results.map((u) => (
        <li key={u.id} className="flex items-center gap-2 py-2">
          <Person u={u} />
          <span className="ml-auto shrink-0">
            {u.relation === "amigo" ? (
              <Link href={`/amigos/${u.id}`} className="text-xs font-semibold text-accent">
                {t("am.yaAmigos")}
              </Link>
            ) : u.relation === "enviada" ? (
              <span className="text-xs text-muted">{t("am.enviada")}</span>
            ) : (
              <form action={requestFriend}>
                <input type="hidden" name="id" value={u.id} />
                <button className="btn px-3 py-1 text-xs">{u.relation === "recibida" ? t("am.aceptar") : t("am.anadir")}</button>
              </form>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
