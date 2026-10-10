import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Pill, Stat } from "@/components/ui";
import { ExerciseAnimation } from "@/components/ExerciseMedia";
import { deleteCustomExercise } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { ExerciseChart } from "@/components/ExerciseChart";
import { Icon } from "@/components/icons";
import { shortDate, todayLocal } from "@/lib/dates";
import { fmtNum } from "@/lib/format";
import { CATALOG, activePlace, findExercise } from "@/lib/strength/catalog";
import { exerciseHistory, fmtLoad, strengthRecords, type ExercisePoint } from "@/lib/strength/workouts";
import { CATEGORY_LABEL, EQUIPMENT, MUSCLE_LABEL, canDo } from "@/lib/strength/labels";

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
  const [{ id }, db] = await Promise.all([params, getDb()]);
  const x = findExercise(db, decodeURIComponent(id));
  if (!x) notFound();
  const place = activePlace(db);
  const ok = place && canDo(x.eq, place.equipment);
  const history = exerciseHistory(db.activities, x.id);
  const records = strengthRecords(db.activities);

  return (
    <>
      <Link href="/fuerza/ejercicios" className="text-sm text-ink-2 hover:text-ink">
        ← Ejercicios
      </Link>
      <PageHeader
        title={x.name}
        subtitle={
          <>
            {CATEGORY_LABEL[x.cat]}
            {!x.custom && ` · nivel ${x.level}`}
            {x.mech && ` · ${x.mech === "compuesto" ? "multiarticular" : "aislamiento"}`}
            {x.nameEn && <span className="text-muted"> · {x.nameEn}</span>}
          </>
        }
        action={
          x.custom && (
            <div className="flex gap-2">
              <Link href={`/fuerza/ejercicios/nuevo?editar=${x.id}`} className="btn btn-ghost">
                Editar
              </Link>
              <form action={deleteCustomExercise}>
                <input type="hidden" name="id" value={x.id} />
                <button className="btn btn-ghost text-critical">Borrar</button>
              </form>
            </div>
          )
        }
      />
      {history.length > 0 && <Progress history={history} records={(id) => records.get(id)?.some((r) => r.exerciseId === x.id)} />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ExerciseAnimation x={x} />
          <Card title="Músculos">
            <div className="flex flex-wrap gap-1.5">
              {x.muscles.map((m) => (
                <Pill key={m} className="bg-accent text-accent-ink">
                  {MUSCLE_LABEL[m]}
                </Pill>
              ))}
              {x.secondary.map((m) => (
                <Pill key={m} className="bg-surface-2 text-ink-2">
                  {MUSCLE_LABEL[m]}
                </Pill>
              ))}
            </div>
            {x.secondary.length > 0 && <p className="mt-2 text-xs text-muted">En color, los principales; en gris, los que ayudan.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card
            title="Material"
            subtitle={place ? (ok ? `✓ Lo puedes hacer en ${place.name}.` : `✕ En ${place.name} te falta algo.`) : undefined}
          >
            <ul className="flex flex-wrap gap-1.5">
              {x.eq.map((e) => {
                const it = EQUIPMENT.find((q) => q.id === e)!;
                const has = !place || e === "corporal" || place.equipment.includes(e);
                return (
                  <li key={e} className={`rounded-full px-2.5 py-1 text-xs ${has ? "bg-surface-2" : "border border-critical text-critical"}`}>
                    {it.label}
                  </li>
                );
              })}
            </ul>
          </Card>
          {x.steps.length > 0 && (
            <Card title="Cómo se hace">
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
const setText = (p: ExercisePoint, s: ExercisePoint["sets"][number]) => `${p.bw || s.kg ? `${fmtLoad(p.bw, s.kg)} × ` : ""}${s.reps}`;

/** Récords, evolución e historial de un ejercicio. */
function Progress({ history, records }: { history: ExercisePoint[]; records: (activityId: string) => boolean | undefined }) {
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
            {rm.oneRm ? <Stat label="1RM estimado" value={fmtNum(rm.oneRm, 1)} unit="kg" sub={shortDate(rm.date)} hint="Fórmula de Epley con tu mejor serie de 1-12 repeticiones" /> : null}
            <Stat label="Más peso" value={fmtLoad(heavy.bw, heavy.topKg)} sub={`× ${heavySet.reps} · ${shortDate(heavy.date)}`} />
            <Stat label="Mejor volumen" value={fmtNum(vol.volume)} unit="kg" sub={shortDate(vol.date)} />
          </>
        ) : (
          <>
            <Stat label="Mejor serie" value={reps.maxReps} unit="reps" sub={shortDate(reps.date)} />
            <Stat label="Más repeticiones en una sesión" value={maxBy(history, (p) => p.reps).reps} unit="reps" />
          </>
        )}
        <Stat label="Sesiones" value={history.length} sub={`Última: ${shortDate(last.date)}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Evolución">
          <ExerciseChart points={history} today={todayLocal()} />
        </Card>
        <Card title="Historial" subtitle={history.length > 10 ? "Las 10 últimas sesiones" : undefined}>
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
                    {p.oneRm ? <span className="text-xs text-muted">1RM est. {fmtNum(p.oneRm, 1)} kg</span> : null}
                  </div>
                  <p className="tabular text-xs text-ink-2">{p.sets.map((s) => setText(p, s)).join(" · ")}</p>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

