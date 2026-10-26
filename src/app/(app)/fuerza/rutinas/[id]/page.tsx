import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { ExerciseThumb } from "@/components/ExerciseMedia";
import { RoutineChart } from "@/components/RoutineChart";
import { SetBadge } from "@/components/RoutineEditor";
import { getDb } from "@/lib/db";
import { RoutinePlanSlot } from "@/components/RoutinePlanSlot";
import { viewUser } from "@/lib/authView";
import { requireViewerId } from "@/lib/session";
import { findExercise } from "@/lib/strength/catalog";
import { fmtLoad, restLabel, routineHistory, supersetLetters } from "@/lib/strength/workouts";
import { addDays } from "@/lib/dates";
import { viewToday } from "@/lib/analysis";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Rutina" };

export default function RoutinePage({ params }: PageProps<"/fuerza/rutinas/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fuerza/rutinas/[id]">["params"] }) {
  const [{ id }, db, uid] = await Promise.all([params, getDb(), requireViewerId()]);
  const routine = db.routines?.find((r) => r.id === id);
  if (!routine) notFound();
  const [user, { t, locale }] = await Promise.all([viewUser(uid), getT()]);
  const today = (await viewToday());

  const letters = supersetLetters(routine.exercises);
  const planSessions = (db.plan?.weeks.flatMap((w) => w.sessions) ?? []).filter((s) => s.type === "strength" && s.date >= today);
  const planKinds = [...new Set(planSessions.map((s) => s.strengthKind).filter((k): k is NonNullable<typeof k> => Boolean(k)))];
  return (
    <>
      <BackLink href="/fuerza" label={t("comun.volver")} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{routine.name}</h1>
      <p className="mt-1 text-sm text-muted">{t("rut.creadaPor", { nombre: user?.username ?? user?.name ?? t("rut.ti") })}</p>
      {routine.folder && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
          <Icon name="folder" className="h-3.5 w-3.5" /> {routine.folder}
        </p>
      )}
      {routine.notes && <p className="mt-2 text-sm text-ink-2">{routine.notes}</p>}
      <Link href={`/fuerza/entreno?rutina=${routine.id}`} className="btn mt-4 w-full text-base">
        {t("rut.comenzar")}
      </Link>
      {db.plan && (
        <RoutinePlanSlot
          id={routine.id}
          slot={routine.planSlot}
          // los días de fuerza que tiene tu plan (si aún no tiene, todos)
          kinds={[...new Set([...(planKinds.length ? planKinds : ["pierna", "posterior", "superior", "completo", "pecho", "espalda", "hombro"]), ...(routine.planSlot && routine.planSlot !== "no" ? [routine.planSlot] : [])])]}
          uses={planSessions.filter((s) => s.routineId === routine.id).length}
          locale={locale}
        />
      )}

      <div className="mt-5">
        <RoutineChart points={routineHistory(db.activities, routine.id, addDays(today, -366))} today={today} locale={locale} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-muted">{t("rut.ejercicios")}</span>
        <Link href={`/fuerza/rutinas/${routine.id}/editar`} className="text-sm font-medium text-accent">
          {t("fh.editarRutina")}
        </Link>
      </div>
      <div className="mt-2 space-y-5">
        {routine.exercises.map((e, i) => {
          const x = findExercise(db, e.exerciseId);
          const letter = letters[i];
          return (
            <section key={i} className={letter ? "border-l-2 border-accent pl-3" : ""}>
              {letter && (
                <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  <Icon name="link" className="h-3.5 w-3.5" /> {t("rut.superserie", { letra: letter })}
                </p>
              )}
              <Link href={`/fuerza/ejercicios/${e.exerciseId}`} className="flex items-center gap-3">
                {x && <ExerciseThumb x={x} className="h-12 w-12 rounded-full" />}
                <span className="min-w-0">
                  <strong className="block truncate text-accent">{x?.name ?? t("rut.borrado")}</strong>
                  {e.restSec ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Icon name="timer" className="h-3.5 w-3.5" /> {t("rut.descanso", { tiempo: restLabel(e.restSec, t("re.sinDescanso")) })}</span> : null}
                </span>
              </Link>
              {e.notes && <p className="mt-1 text-xs text-ink-2">{e.notes}</p>}
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="w-16 py-1 text-left font-medium">{t("tab.serie")}</th>
                    <th className="py-1 text-left font-medium">{e.bw ? t("tab.peso") : t("tab.kg")}</th>
                    <th className="py-1 text-left font-medium">{t("tab.reps")}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.sets.map((s, j) => (
                    <tr key={j} className={j % 2 ? "bg-surface-2" : ""}>
                      <td className="py-2">
                        <SetBadge locale={locale} type={s.type ?? "normal"} n={e.sets.slice(0, j + 1).filter((y) => y.type !== "calentamiento").length} />
                      </td>
                      <td className="tabular py-2">{e.bw ? fmtLoad(true, s.kg, t("re.pc")) : (s.kg ?? "–")}</td>
                      <td className="tabular py-2">{s.reps ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </>
  );
}
