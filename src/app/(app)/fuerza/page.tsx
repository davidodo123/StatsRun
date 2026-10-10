import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { CATALOG, activePlace } from "@/lib/strength/catalog";
import { EQUIPMENT, canDo } from "@/lib/strength/labels";

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
  const doable = place ? CATALOG.filter((x) => canDo(x.eq, place.equipment)).length : CATALOG.length;
  const custom = db.customExercises?.length ?? 0;

  return (
    <>
      <PageHeader title="Fuerza" subtitle="Tus ejercicios, tu material y, pronto, tus rutinas y entrenos en vivo." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Mi material" subtitle="Dónde entrenas y qué tienes. Los ejercicios y las rutinas se adaptan a ello." action={<Link href="/fuerza/material" className="text-sm font-medium text-accent">Gestionar →</Link>}>
          {place ? (
            <>
              <p className="text-sm">
                Ahora: <strong>{place.name}</strong>
                {db.places!.length > 1 && <span className="text-muted"> · {db.places!.length} lugares</span>}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {place.equipment.map((e) => {
                  const it = EQUIPMENT.find((q) => q.id === e)!;
                  return (
                    <li key={e} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                      {it.icon} {it.label}
                    </li>
                  );
                })}
              </ul>
              {place.notes && <p className="mt-2 text-xs text-ink-2">{place.notes}</p>}
            </>
          ) : (
            <p className="text-sm text-ink-2">
              Aún no has dicho con qué entrenas. <Link href="/fuerza/material" className="font-medium text-accent">Añade tu casa, tu gimnasio o «sin material»</Link>.
            </p>
          )}
        </Card>
        <Card title="Ejercicios" subtitle="Biblioteca con fotos e instrucciones en español, más los que crees tú." action={<Link href="/fuerza/ejercicios" className="text-sm font-medium text-accent">Ver todos →</Link>}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Count n={CATALOG.length + custom} label="en total" />
            <Count n={doable + custom} label={place ? `en ${place.name}` : "con cualquier material"} />
            <Count n={custom} label="propios" />
          </div>
          <Link href="/fuerza/ejercicios/nuevo" className="btn btn-ghost mt-3 w-full">
            + Crear ejercicio
          </Link>
        </Card>
      </div>
      <Card className="mt-4" title="Próximamente">
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-2">
          <li>Rutinas propias y entreno en vivo: series, kilos, repeticiones y descanso.</li>
          <li>Progreso por ejercicio, récords y mapa de músculos.</li>
          <li>Entrenador IA de fuerza que te monta un programa con tu material y tu plan de carrera.</li>
        </ul>
      </Card>
    </>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="tabular text-xl font-bold">{n}</div>
      <div className="truncate text-[11px] text-muted">{label}</div>
    </div>
  );
}
