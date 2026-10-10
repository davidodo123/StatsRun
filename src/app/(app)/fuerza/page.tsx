import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { deleteRoutine, duplicateRoutine } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { activePlace, findExercise } from "@/lib/strength/catalog";
import { workoutSets, workoutVolume } from "@/lib/strength/workouts";
import { fmtDuration } from "@/lib/format";
import { WEEKDAYS, shortDate, weekday } from "@/lib/dates";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Fuerza" };

export default function StrengthPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  const place = activePlace(db);
  const routines = db.routines ?? [];
  const recent = db.activities
    .filter((a) => a.workout)
    .sort((a, b) => b.startLocal.localeCompare(a.startLocal))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Fuerza" />
      <Link href="/fuerza/entreno" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold hover:bg-surface-2">
        <span className="text-2xl leading-none">+</span> Empezar entrenamiento vacío
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Rutinas</h2>
        <Link href="/fuerza/material" className="text-xs text-ink-2 hover:text-ink">
          <Icon name="pin" className="mr-1 h-3.5 w-3.5 align-[-2px]" />
          {place ? `${place.name} · cambiar` : "Añadir mi material"}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/fuerza/rutinas/nueva" className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-3 font-medium hover:bg-surface-2">
          <Icon name="list" /> Nueva rutina
        </Link>
        <Link href="/fuerza/ejercicios" className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-3 font-medium hover:bg-surface-2">
          <Icon name="search" /> Explorar
        </Link>
      </div>

      <p className="mt-5 text-sm text-muted">Mis rutinas ({routines.length})</p>
      <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {routines.map((r) => (
          <section key={r.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/fuerza/rutinas/${r.id}`} className="min-w-0 text-lg font-bold hover:text-accent">
                {r.name}
              </Link>
              <details className="relative">
                <summary className="cursor-pointer list-none px-2 text-xl leading-none text-ink-2" aria-label={`Opciones de ${r.name}`}>
                  ⋯
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-lg">
                  <Link href={`/fuerza/rutinas/${r.id}/editar`} className="block px-3 py-2 hover:bg-surface-2">
                    Editar rutina
                  </Link>
                  <form action={duplicateRoutine}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="w-full px-3 py-2 text-left hover:bg-surface-2">Duplicar</button>
                  </form>
                  <form action={deleteRoutine}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="w-full px-3 py-2 text-left text-critical hover:bg-surface-2">Borrar</button>
                  </form>
                </div>
              </details>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-2">{r.exercises.map((e) => findExercise(db, e.exerciseId)?.name ?? "¿?").join(", ")}</p>
            <Link href={`/fuerza/entreno?rutina=${r.id}`} className="btn mt-3 w-full">
              Empezar rutina
            </Link>
          </section>
        ))}
        {!routines.length && (
          <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
            Aún no tienes rutinas. Crea una con tus ejercicios, series, kilos y repeticiones, o empieza un entreno vacío y ve añadiendo.
          </p>
        )}
      </div>

      {recent.length > 0 && (
        <>
          <p className="mt-6 text-sm text-muted">Últimos entrenos</p>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
            {recent.map((a) => (
              <li key={a.id}>
                <Link href={`/actividad/${encodeURIComponent(a.id)}`} className="flex items-center justify-between gap-3 p-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{a.name}</strong>
                    <span className="text-xs text-muted">
                      {WEEKDAYS[weekday(a.date)].slice(0, 3)} {shortDate(a.date)} · {fmtDuration(a.movingSec)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink-2">
                    {workoutVolume(a.workout!).toLocaleString("es-ES")} kg
                    <br />
                    {workoutSets(a.workout!)} series
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
