import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Pill, Stat } from "@/components/ui";
import { ExerciseAnimation } from "@/components/ExerciseMedia";
import { deleteCustomExercise } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { ExerciseChart } from "@/components/ExerciseChart";
import { Icon } from "@/components/icons";
import { viewToday } from "@/lib/analysis";
import { fmtNum } from "@/lib/format";
import { CATALOG, activePlace, exerciseName, findExercise } from "@/lib/strength/catalog";
import { exerciseHistory, fmtLoad, strengthRecords, type ExercisePoint } from "@/lib/strength/workouts";
import { canDo } from "@/lib/strength/labels";
import { getT } from "@/lib/i18n/server";
import { dayMonth, type Key, type Locale, type T } from "@/lib/i18n";

const BY_ID = new Map(CATALOG.map((x) => [x.id, x.name]));

export async function generateMetadata({ params }: PageProps<"/fuerza/ejercicios/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: BY_ID.get(decodeURIComponent(id)) ?? "Ejercicio" };
}

export default function ExercisePage({ params }: PageProps<"/fuerza/ejercicios/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fuerza/ejercicios/[id]">["params"] }) {
  const [{ id }, db, { t, locale }] = await Promise.all([params, getDb(), getT()]);
  const x = findExercise(db, decodeURIComponent(id));
  if (!x) notFound();
  const place = activePlace(db);
  const ok = place && canDo(x.eq, place.equipment);
  const history = exerciseHistory(db.activities, x.id);
  const records = strengthRecords(db.activities);

  return (
    <>
      <BackLink href="/fuerza/ejercicios" label={t("comun.volver")} />
      <PageHeader
        title={exerciseName(x, locale)}
        subtitle={
          <>
            {t(`categoria.${x.cat}` as Key)}
            {!x.custom && ` · ${t("ex.nivel", { nivel: t(`ex.nivel.${x.level}` as Key) })}`}
            {x.mech && ` · ${x.mech === "compuesto" ? t("ex.multi") : t("ex.aislamiento")}`}
            {x.nameEn && locale !== "en" && <span className="text-muted"> · {x.nameEn}</span>}
          </>
        }
        action={
          x.custom && (
            <div className="flex gap-2">
              <Link href={`/fuerza/ejercicios/nuevo?editar=${x.id}`} className="btn btn-ghost">
                {t("ex.editar")}
              </Link>
              <form action={deleteCustomExercise}>
                <input type="hidden" name="id" value={x.id} />
                <button className="btn btn-ghost text-critical">{t("fh.borrar")}</button>
              </form>
            </div>
          )
        }
      />
      {history.length > 0 && <Progress history={history} records={(id) => records.get(id)?.some((r) => r.exerciseId === x.id)} t={t} locale={locale} />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ExerciseAnimation x={x} locale={locale} />
          <Card title={t("ex.musculos")}>
            <div className="flex flex-wrap gap-1.5">
              {x.muscles.map((m) => (
                <Pill key={m} className="bg-accent text-accent-ink">
                  {t(`musculo.${m}` as Key)}
                </Pill>
              ))}
              {x.secondary.map((m) => (
                <Pill key={m} className="bg-surface-2 text-ink-2">
                  {t(`musculo.${m}` as Key)}
                </Pill>
              ))}
            </div>
            {x.secondary.length > 0 && <p className="mt-2 text-xs text-muted">{t("ex.leyenda")}</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card
            title={t("eb.material")}
            subtitle={place ? (ok ? t("ex.puedes", { lugar: place.name }) : t("ex.falta", { lugar: place.name })) : undefined}
          >
            <ul className="flex flex-wrap gap-1.5">
              {x.eq.map((e) => {
                const has = !place || e === "corporal" || place.equipment.includes(e);
                return (
                  <li key={e} className={`rounded-full px-2.5 py-1 text-xs ${has ? "bg-surface-2" : "border border-critical text-critical"}`}>
                    {t(`equipo.${e}` as Key)}
                  </li>
                );
              })}
            </ul>
          </Card>
          {x.steps.length > 0 && (
            <Card title={t("ex.comoSeHace")}>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                {x.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

const maxBy = (h: ExercisePoint[], f: (p: ExercisePoint) => number) => h.reduce((b, p) => (f(p) > f(b) ? p : b));
const setText = (p: ExercisePoint, s: ExercisePoint["sets"][number], pc: string) => `${p.bw || s.kg ? `${fmtLoad(p.bw, s.kg, pc)} × ` : ""}${s.reps}`;

/** Récords, evolución e historial de un ejercicio. */
async function Progress({ history, records, t, locale }: { history: ExercisePoint[]; records: (activityId: string) => boolean | undefined; t: T; locale: Locale }) {
  const shortDate = (d: string) => dayMonth(d, locale);
  const weighted = history.some((p) => p.topKg > 0);
  const last = history[history.length - 1];
  const rm = maxBy(history, (p) => p.oneRm ?? 0);
  const heavy = maxBy(history, (p) => p.topKg);
  const vol = maxBy(history, (p) => p.volume);
  const reps = maxBy(history, (p) => p.maxReps);
  const heavySet = heavy.sets.filter((s) => (s.kg ?? 0) === heavy.topKg).reduce((b, s) => ((s.reps ?? 0) > (b.reps ?? 0) ? s : b));
  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {weighted ? (
          <>
            {rm.oneRm ? <Stat label={t("ech.rm")} value={fmtNum(rm.oneRm, 1)} unit="kg" sub={shortDate(rm.date)} hint={t("ex.epley")} /> : null}
            <Stat label={t("ech.masPeso")} value={fmtLoad(heavy.bw, heavy.topKg, t("re.pc"))} sub={`× ${heavySet.reps} · ${shortDate(heavy.date)}`} />
            <Stat label={t("ex.mejorVolumen")} value={fmtNum(vol.volume)} unit="kg" sub={shortDate(vol.date)} />
          </>
        ) : (
          <>
            <Stat label={t("ech.mejorSerie")} value={reps.maxReps} unit="reps" sub={shortDate(reps.date)} />
            <Stat label={t("ex.masRepsSesion")} value={maxBy(history, (p) => p.reps).reps} unit="reps" />
          </>
        )}
        <Stat label={t("ex.sesiones")} value={history.length} sub={t("ex.ultima", { fecha: shortDate(last.date) })} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("ex.evolucion")}>
          <ExerciseChart points={history} today={(await viewToday())} locale={locale} />
        </Card>
        <Card title={t("ex.historial")} subtitle={history.length > 10 ? t("ex.ultimas10") : undefined}>
          <ul className="divide-y divide-line">
            {history
              .slice(-10)
              .reverse()
              .map((p) => (
                <li key={p.activityId} className="py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/actividad/${p.activityId}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:text-accent">
                      {shortDate(p.date)}
                      {records(p.activityId) && <Icon name="trophy" className="h-3.5 w-3.5 text-accent" />}
                    </Link>
                    {p.oneRm ? <span className="text-xs text-muted">{t("ex.rmEst", { kg: fmtNum(p.oneRm, 1) })}</span> : null}
                  </div>
                  <p className="tabular text-xs text-ink-2">{p.sets.map((s) => setText(p, s, t("re.pc"))).join(" · ")}</p>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

