import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { ExerciseThumb } from "@/components/ExerciseMedia";
import { RoutineChart } from "@/components/RoutineChart";
import { SetBadge } from "@/components/RoutineEditor";
import { getDb } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { requireUserId } from "@/lib/session";
import { findExercise } from "@/lib/strength/catalog";
import { fmtLoad, restLabel, routineHistory, supersetLetters } from "@/lib/strength/workouts";
import { addDays, todayLocal } from "@/lib/dates";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Rutina" };

export default function RoutinePage({ params }: PageProps<"/fuerza/rutinas/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fuerza/rutinas/[id]">["params"] }) {
  const [{ id }, db, uid] = await Promise.all([params, getDb(), requireUserId()]);
  const routine = db.routines?.find((r) => r.id === id);
  if (!routine) notFound();
  const user = await getUser(uid);
  const today = todayLocal();

  const letters = supersetLetters(routine.exercises);
  return (
    <>
      <Link href="/fuerza" className="text-sm text-ink-2 hover:text-ink">
        ← Fuerza
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{routine.name}</h1>
      <p className="mt-1 text-sm text-muted">Creada por {user?.username ?? user?.name ?? "ti"}</p>
      {routine.folder && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
          <Icon name="folder" className="h-3.5 w-3.5" /> {routine.folder}
        </p>
      )}
      {routine.notes && <p className="mt-2 text-sm text-ink-2">{routine.notes}</p>}
      <Link href={`/fuerza/entreno?rutina=${routine.id}`} className="btn mt-4 w-full text-base">
        Comenzar rutina
      </Link>

      <div className="mt-5">
        <RoutineChart points={routineHistory(db.activities, routine.id, addDays(today, -366))} today={today} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-muted">Ejercicios</span>
        <Link href={`/fuerza/rutinas/${routine.id}/editar`} className="text-sm font-medium text-accent">
          Editar rutina
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
                  <Icon name="link" className="h-3.5 w-3.5" /> Superserie {letter}
                </p>
              )}
              <Link href={`/fuerza/ejercicios/${e.exerciseId}`} className="flex items-center gap-3">
                {x && <ExerciseThumb x={x} className="h-12 w-12 rounded-full" />}
                <span className="min-w-0">
                  <strong className="block truncate text-accent">{x?.name ?? "Ejercicio borrado"}</strong>
                  {e.restSec ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Icon name="timer" className="h-3.5 w-3.5" /> {restLabel(e.restSec)} de descanso</span> : null}
                </span>
              </Link>
              {e.notes && <p className="mt-1 text-xs text-ink-2">{e.notes}</p>}
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="w-16 py-1 text-left font-medium">SERIE</th>
                    <th className="py-1 text-left font-medium">{e.bw ? "PESO" : "KG"}</th>
                    <th className="py-1 text-left font-medium">REPS</th>
                  </tr>
                </thead>
                <tbody>
                  {e.sets.map((s, j) => (
                    <tr key={j} className={j % 2 ? "bg-surface-2" : ""}>
                      <td className="py-2">
                        <SetBadge type={s.type ?? "normal"} n={e.sets.slice(0, j + 1).filter((y) => y.type !== "calentamiento").length} />
                      </td>
                      <td className="tabular py-2">{e.bw ? fmtLoad(true, s.kg) : (s.kg ?? "–")}</td>
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
