import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Pill } from "@/components/ui";
import { PlaceForm } from "@/components/PlaceForm";
import { addPresetPlace, deletePlace, setActivePlace } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { CATALOG, activePlace } from "@/lib/strength/catalog";
import { EQUIPMENT, PLACE_PRESETS, canDo } from "@/lib/strength/labels";

export const metadata: Metadata = { title: "Mi material" };

export default function EquipmentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  const places = db.places ?? [];
  const active = activePlace(db);
  const presets = PLACE_PRESETS.filter((p) => !places.some((q) => q.name === p.name));

  return (
    <>
      <Link href="/fuerza" className="text-sm text-ink-2 hover:text-ink">
        ← Fuerza
      </Link>
      <PageHeader title="Mi material" subtitle="Los sitios donde entrenas y lo que hay en cada uno. El marcado como «ahora» filtra los ejercicios." />
      <div className="space-y-3">
        {places.map((p) => {
          const doable = CATALOG.filter((x) => canDo(x.eq, p.equipment)).length;
          const isActive = p.id === active?.id;
          return (
            <Card
              key={p.id}
              title={
                <span className="flex items-center gap-2">
                  {p.name}
                  {isActive && <Pill className="bg-accent text-accent-ink">Ahora</Pill>}
                </span>
              }
              subtitle={`${doable} ejercicios posibles`}
              action={
                <div className="flex items-center gap-3">
                  {!isActive && (
                    <form action={setActivePlace}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs font-medium text-accent">Entreno aquí</button>
                    </form>
                  )}
                  <form action={deletePlace}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-muted underline hover:text-critical" aria-label={`Borrar ${p.name}`}>
                      Borrar
                    </button>
                  </form>
                </div>
              }
            >
              <ul className="flex flex-wrap gap-1.5">
                {p.equipment.map((e) => {
                  const it = EQUIPMENT.find((q) => q.id === e)!;
                  return (
                    <li key={e} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                      {it.label}
                    </li>
                  );
                })}
              </ul>
              {p.notes && <p className="mt-2 text-xs text-ink-2">{p.notes}</p>}
              <details className="mt-3 rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold">Editar</summary>
                <div className="mt-3">
                  <PlaceForm place={p} />
                </div>
              </details>
            </Card>
          );
        })}

        {presets.length > 0 && (
          <Card title={places.length ? "Añadir un lugar rápido" : "Empieza con uno de estos"} subtitle="Luego puedes editar el material.">
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <form key={p.name} action={addPresetPlace}>
                  <input type="hidden" name="preset" value={p.name} />
                  <button className="btn btn-ghost">+ {p.name}</button>
                </form>
              ))}
            </div>
          </Card>
        )}

        <Card title="Nuevo lugar">
          <PlaceForm />
        </Card>
      </div>
    </>
  );
}
