import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat, StatGroup } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { ActivityPhotoButtons } from "@/components/ActivityPhoto";
import { activityPhotoUrl } from "@/lib/photos";
import { TagChips, withText } from "@/components/ActivityItem";
import { RouteReplay } from "@/components/RouteReplay";
import { ShareActivityButton } from "@/components/ShareActivityButton";
import { shareVideo } from "@/lib/shareCard";
import { tagsForDb } from "@/lib/engine/tags";
import { estimateVdot } from "@/lib/engine/stats";
import { decouplingLabel } from "@/lib/engine/decoupling";
import { viewAreFriends, viewFriends, viewUser } from "@/lib/authView";
import { getDb } from "@/lib/db";
import { publicActivity } from "@/lib/feed";
import { requireViewerId } from "@/lib/session";
import { viewToday } from "@/lib/analysis";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { SetBadge } from "@/components/RoutineEditor";
import { emomTitle, estimate1RM, fmtLoad, muscleSets, setLoad, strengthRecords, type StrengthRecord, workoutReps, workoutSets, workoutVolume } from "@/lib/strength/workouts";
import { exerciseName, findExercise } from "@/lib/strength/catalog";
import { MUSCLES } from "@/lib/strength/labels";
import { MuscleMap } from "@/components/MuscleMap";
import type { Activity, Db, Workout } from "@/lib/types";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";
import { intlLocale, weekdayDate, type Key, type Locale, type T } from "@/lib/i18n";

export const metadata: Metadata = { title: "Sesión" };

// «domingo 25 oct» → «Domingo 25 oct»
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ActivityPage({ params, searchParams }: PageProps<"/actividad/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: { params: PageProps<"/actividad/[id]">["params"]; searchParams: PageProps<"/actividad/[id]">["searchParams"] }) {
  const [{ id }, sp, uid, { t, locale }] = await Promise.all([params, searchParams, requireViewerId(), getT()]);
  const ownerId = typeof sp.de === "string" && sp.de ? sp.de : uid;
  const mine = ownerId === uid;
  // las sesiones de otro solo se ven si sois amigos
  if (!mine && !(await viewAreFriends(uid, ownerId))) notFound();
  const [db, owner, friends] = await Promise.all([getDb(ownerId), viewUser(ownerId), viewFriends(uid)]);
  const raw = db.activities.find((a) => a.id === decodeURIComponent(id));
  if (!raw || (!mine && !owner)) notFound();
  const a = mine ? raw : publicActivity(raw);
  const names = new Map<string, string>([...friends.map((f) => [f.id, f.name] as [string, string]), [uid, t("act.ti")], [ownerId, mine ? t("act.ti") : owner!.name]]);
  const together = withText(a.with, names, t);
  const dc = typeof a.decoupling === "number" ? decouplingLabel(a.decoupling) : undefined;
  const tags = tagsForDb(db, estimateVdot(db.activities, db.profile, (await viewToday())).vdot).get(a.id) ?? [];
  const pace = a.sport === "run" && a.distanceM > 0 ? a.movingSec / (a.distanceM / 1000) : undefined;
  const speed = a.distanceM > 0 && a.movingSec > 0 ? a.distanceM / 1000 / (a.movingSec / 3600) : undefined;
  const photo = activityPhotoUrl(ownerId, a);

  return (
    <>
      <BackLink href={mine ? "/perfil?tab=actividades" : `/amigos/${ownerId}`} label={t("comun.volver")} />
      <PageHeader
        title={a.name}
        subtitle={
          <>
            {!mine && <strong className="text-ink">{owner!.name} · </strong>}
            {cap(weekdayDate(a.date, locale))} · {a.startLocal.slice(11, 16)} · {t(`sport.${a.sport}`)}
            {together && ` · ${together}`}
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {mine && <ShareActivityButton id={a.id} name={a.name} video={shareVideo(db, raw)} locale={locale} />}
            {mine && (
              <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="btn btn-ghost">
                {t("ex.editar")}
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {tags.length > 0 && <TagChips tags={tags} locale={locale} />}
          {photo && (
            // foto del entreno (servida por /api/foto): sin optimizar
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={t("act.fotoDe", { nombre: a.name })} className="max-h-[70vh] w-full rounded-2xl border border-line object-cover" />
          )}
          {mine && <ActivityPhotoButtons id={a.id} hasPhoto={Boolean(photo)} locale={locale} />}
          {a.workout && <MusclesCard db={db} a={a} t={t} locale={locale} />}
          {a.workout ? (
            <WorkoutCard workout={a.workout} records={strengthRecords(db.activities).get(a.id) ?? []} t={t} name={(id, fallback) => { const x = findExercise(db, id); return x ? exerciseName(x, locale) : fallback; }} />
          ) : a.route ? (
            <RouteReplay route={a.route} distanceKm={a.distanceM / 1000} movingSec={a.movingSec} locale={locale}>
              <RouteMap route={a.route} label={t("act.mapaDe", { nombre: a.name })} />
            </RouteReplay>
          ) : (
            <Card>
              <p className="text-sm text-ink-2">
                {t("act.sinGps")}
              </p>
            </Card>
          )}
          <StatGroup className="md:grid-cols-4">
            {a.distanceM > 0 && <Stat label={t("act.distancia")} value={fmtKm(a.distanceM / 1000, 2)} unit="km" />}
            <Stat label={t("act.tiempoMov")} value={fmtDuration(a.movingSec)} sub={a.elapsedSec > a.movingSec + 30 ? t("act.total", { t: fmtDuration(a.elapsedSec) }) : undefined} />
            {pace ? <Stat label={t("act.ritmo")} value={fmtPace(pace)} unit="/km" /> : speed ? <Stat label={t("act.velocidad")} value={fmtKm(speed)} unit="km/h" /> : null}
            {a.elevationGainM > 0 && <Stat label={t("act.desnivel")} value={fmtNum(a.elevationGainM)} unit="m" sub={a.maxAltitudeM ? t("act.altMax", { m: fmtNum(a.maxAltitudeM) }) : undefined} />}
            {a.avgHr && <Stat label={t("act.fc")} value={Math.round(a.avgHr)} unit={t("u.pulso")} sub={a.maxHr ? t("act.max", { n: Math.round(a.maxHr) }) : undefined} />}
            {typeof a.decoupling === "number" && dc && (
              <Stat
                label={t("act.desacople")}
                value={fmtNum(a.decoupling, 1)}
                unit="%"
                status={{ ...dc, label: t(`act.dc.${dc.tone}`) }}
                hint={t("act.desacopleHint")}
              />
            )}
            {a.avgCadence && <Stat label={t("act.cadencia")} value={Math.round(a.avgCadence)} unit={t("u.cadencia")} />}
            {a.steps && <Stat label={t("act.pasos")} value={fmtNum(a.steps)} />}
            {a.workout && <Stat label={t("wl.volumen")} value={fmtNum(workoutVolume(a.workout))} unit="kg" sub={t("act.seriesReps", { series: workoutSets(a.workout), reps: workoutReps(a.workout) })} />}
            {a.rpe && <Stat label={t("act.rpe")} value={a.rpe} unit="/10" />}
          </StatGroup>
        </div>
        <div className="space-y-4">
          {mine && (a.feel || a.feelings || a.notes) && (
            <Card title={t("act.comoTeSentiste")} subtitle={t("act.soloTu")}>
              {a.feel && <p className="text-sm font-semibold">{t(`feel.${a.feel}` as Key)}</p>}
              {a.feelings && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.feelings}</p>}
              {a.notes && <p className="mt-2 whitespace-pre-line text-xs text-muted">{a.notes}</p>}
            </Card>
          )}
          {a.source === "strava" && (
            <a href={`https://www.strava.com/activities/${a.id.replace("strava-", "")}`} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-accent">
              {t("act.verStrava")}
            </a>
          )}
        </div>
      </div>
    </>
  );
}

/** Músculos que ha trabajado este entreno, en el dibujo del cuerpo (como en la imagen para compartir). */
function MusclesCard({ db, a, t, locale }: { db: Pick<Db, "customExercises">; a: Activity; t: T; locale: Locale }) {
  const sets = muscleSets([{ ...a, date: "0000-00-00" }], "0000-00-00", (id) => findExercise(db, id));
  const worked = MUSCLES.filter((m) => sets[m.id]).sort((x, y) => sets[y.id]! - sets[x.id]!);
  if (!worked.length) return null;
  return (
    <Card title={t("act.musculos")}>
      {/* color pleno en el músculo que más series ha tenido en este entreno */}
      <MuscleMap sets={sets} locale={locale} full={Math.max(...worked.map((m) => sets[m.id]!))} />
      <p className="mt-3 text-xs text-ink-2">
        {worked.map((m) => `${t(`musculo.${m.id}` as Key)} ${sets[m.id]!.toLocaleString(intlLocale(locale))}`).join(" · ")}
      </p>
      <p className="mt-1 text-xs text-muted">{t("act.seriesMusculo")}</p>
    </Card>
  );
}

/** Ejercicios y series de un entreno de fuerza. */
function WorkoutCard({ workout, records, t, name }: { workout: Workout; records: StrengthRecord[]; t: T; name: (exerciseId: string, fallback: string) => string }) {
  const pc = t("re.pc");
  return (
    <Card title={t("rut.ejercicios")} subtitle={workout.emom && t("act.emomRondas", { titulo: emomTitle(workout.emom), n: workout.emom.done, total: workout.emom.rounds })}>
      <div className="space-y-4">
        {workout.exercises.map((e, i) => {
          const rec = records.find((r) => r.exerciseId === e.exerciseId);
          const best = Math.max(0, ...e.sets.filter((s) => s.type !== "calentamiento").map((s) => estimate1RM(setLoad(e, s), s.reps) ?? 0));
          return (
            <section key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/fuerza/ejercicios/${e.exerciseId}`} className="truncate font-semibold text-accent">
                  {name(e.exerciseId, e.name)}
                </Link>
                {best > 0 && <span className="shrink-0 text-xs text-muted">{t("ex.rmEst", { kg: fmtNum(best, 1) })}</span>}
              </div>
              {rec && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                  <Icon name="trophy" className="h-3.5 w-3.5" />{" "}
                  {t("act.record", { txt: rec.kind === "peso" ? t("act.antes", { v: fmtLoad(e.bw, rec.value, pc), p: fmtLoad(e.bw, rec.prev, pc) }) : t("act.antes", { v: t("emom.reps", { n: rec.value }), p: rec.prev }) })}
                </p>
              )}
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {e.sets.map((s, j) => (
                    <tr key={j} className={j % 2 ? "bg-surface-2" : ""}>
                      <td className="w-14 py-1">
                        <SetBadge type={s.type ?? "normal"} n={e.sets.slice(0, j + 1).filter((y) => y.type !== "calentamiento").length} />
                      </td>
                      <td className="tabular py-1">
                        {e.bw || s.kg ? `${fmtLoad(e.bw, s.kg, pc)} × ` : ""}
                        {t("emom.reps", { n: s.reps ?? "–" })}
                      </td>
                      <td className="py-1 text-right text-xs text-muted">{s.rir !== undefined ? `RIR ${s.rir}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {e.notes && <p className="mt-1 text-xs text-ink-2">{e.notes}</p>}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

