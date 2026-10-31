// Portada de la sección Fuerza (y Inicio de quien solo hace fuerza).
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { deleteRoutine, duplicateRoutine } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { activePlace, findExercise, exerciseName } from "@/lib/strength/catalog";
import { muscleSets, workoutSets, workoutVolume } from "@/lib/strength/workouts";
import { MUSCLES } from "@/lib/strength/labels";
import { MuscleMap } from "./MuscleMap";
import { fmtDuration } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { intlLocale, shortWeekdayDate, type Key } from "@/lib/i18n";
import { viewToday } from "@/lib/analysis";
import { Icon } from "./icons";

/** Portada de fuerza: rutinas, entrenador, series por músculo y últimos entrenos. También es el Inicio de quien solo hace fuerza. */
export async function StrengthHome({ title, subtitle }: { title?: string; subtitle?: string }) {
  const db = await getDb();
  const { t, locale } = await getT();
  const nf = intlLocale(locale);
  const place = activePlace(db);
  const routines = db.routines ?? [];
  const recent = db.activities
    .filter((a) => a.workout)
    .sort((a, b) => b.startLocal.localeCompare(a.startLocal))
    .slice(0, 5);
  const folders = [...new Set(routines.flatMap((r) => (r.folder ? [r.folder] : [])))].sort((a, b) => a.localeCompare(b, nf));
  const loose = routines.filter((r) => !r.folder);
  const card = (r: (typeof routines)[number]) => (
    <section key={r.id} className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/fuerza/rutinas/${r.id}`} className="min-w-0 text-lg font-bold hover:text-accent">
          {r.name}
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none px-2 text-xl leading-none text-ink-2" aria-label={t("fh.opcionesDe", { nombre: r.name })}>
            ⋯
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-lg">
            <Link href={`/fuerza/rutinas/${r.id}/editar`} className="block px-3 py-2 hover:bg-surface-2">
              {t("fh.editarRutina")}
            </Link>
            <form action={duplicateRoutine}>
              <input type="hidden" name="id" value={r.id} />
              <button className="w-full px-3 py-2 text-left hover:bg-surface-2">{t("fh.duplicar")}</button>
            </form>
            <form action={deleteRoutine}>
              <input type="hidden" name="id" value={r.id} />
              <button className="w-full px-3 py-2 text-left text-critical hover:bg-surface-2">{t("fh.borrar")}</button>
            </form>
          </div>
        </details>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-ink-2">{r.exercises.map((e) => { const x = findExercise(db, e.exerciseId); return x ? exerciseName(x, locale) : "¿?"; }).join(", ")}</p>
      <Link href={`/fuerza/entreno?rutina=${r.id}`} className="btn mt-3 w-full">
        {t("fh.empezarRutina")}
      </Link>
    </section>
  );
  const sets = muscleSets(db.activities, addDays((await viewToday()), -6), (id) => findExercise(db, id));
  const worked = MUSCLES.filter((m) => sets[m.id]).sort((a, b) => sets[b.id]! - sets[a.id]!);

  return (
    <>
      <PageHeader
        title={title ?? t("fh.titulo")}
        subtitle={subtitle}
        action={
          <Link href="/fuerza/medidas" className="btn btn-ghost">
            {t("fh.medidas")}
          </Link>
        }
      />
      <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" aria-label={t("fh.empezar")}>
        {(
          [
            ["/fuerza/entreno", "dumbbell", t("fh.entrenamiento"), t("fh.entrenamientoSub")],
            ["/fuerza/emom", "timer", "EMOM", t("fh.emomSub")],
            ["/entrenador", "sparkle", t("fh.entrenadorIA"), t("fh.entrenadorSub")],
          ] as const
        ).map(([href, icon, title, sub]) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <Icon name={icon} className="h-5 w-5 text-accent" />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{title}</strong>
              <span className="block truncate text-xs text-ink-2">{sub}</span>
            </span>
            <span className="text-muted" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("fh.rutinas")}</h2>
        <Link href="/fuerza/material" className="text-xs text-ink-2 hover:text-ink">
          <Icon name="pin" className="mr-1 h-3.5 w-3.5 align-[-2px]" />
          {place ? t("fh.cambiarLugar", { lugar: place.name }) : t("fh.anadirMaterial")}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/fuerza/rutinas/nueva" className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-3 font-medium hover:bg-surface-2">
          <Icon name="list" /> {t("fh.nuevaRutina")}
        </Link>
        <Link href="/fuerza/ejercicios" className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-3 font-medium hover:bg-surface-2">
          <Icon name="search" /> {t("fh.explorar")}
        </Link>
      </div>

      <p className="mt-5 text-sm text-muted">{t("fh.misRutinas", { n: routines.length })}</p>
      {loose.length > 0 && <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">{loose.map(card)}</div>}
      {folders.map((f) => {
        const list = routines.filter((r) => r.folder === f);
        return (
          <details key={f} open className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <Icon name="folder" className="h-4 w-4 text-muted" />
              {f}
              <span className="font-normal text-muted">({list.length})</span>
              <span className="text-muted transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">{list.map(card)}</div>
          </details>
        );
      })}
      {!routines.length && (
        <p className="mt-2 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
          {t("fh.sinRutinas")}
        </p>
      )}

      {recent.length > 0 && (
        <>
          <p className="mt-6 text-sm text-muted">{t("fh.seriesMusculo")}</p>
          <section className="mt-2 grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface p-4 md:grid-cols-2">
            <MuscleMap sets={sets} locale={locale} sex={db.profile?.sex} />
            <div>
              {worked.length ? (
                <ul className="space-y-1.5">
                  {worked.map((m) => (
                    <li key={m.id} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-xs">
                      <span className="truncate">{t(`musculo.${m.id}` as Key)}</span>
                      {/* escala hasta 20 series; la franja marca 10-20, lo que Helms propone para ganar músculo */}
                      <span className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                        <span className="absolute inset-y-0 left-1/2 right-0 bg-good/20" aria-hidden />
                        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, (sets[m.id]! / 20) * 100)}%` }} />
                      </span>
                      <span className="tabular text-right text-ink-2">{sets[m.id]!.toLocaleString(nf)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-2">{t("fh.sinFuerzaSemana")}</p>
              )}
              <p className="mt-3 text-xs text-muted">
                {t("fh.explicacionSeries")}
              </p>
            </div>
          </section>

          <p className="mt-6 text-sm text-muted">{t("fh.ultimos")}</p>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
            {recent.map((a) => (
              <li key={a.id}>
                <Link href={`/actividad/${encodeURIComponent(a.id)}`} className="flex items-center justify-between gap-3 p-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{a.name}</strong>
                    <span className="text-xs text-muted">
                      {shortWeekdayDate(a.date, locale)} · {fmtDuration(a.movingSec)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink-2">
                    {workoutVolume(a.workout!).toLocaleString(nf)} kg
                    <br />
                    {t("fh.series", { n: workoutSets(a.workout!) })}
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
