import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Pill } from "@/components/ui";
import { ExerciseAnimation } from "@/components/ExerciseMedia";
import { deleteCustomExercise } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { CATALOG, activePlace, findExercise } from "@/lib/strength/catalog";
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
                    {it.icon} {it.label}
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
