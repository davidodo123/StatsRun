import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { ExerciseBrowser, type BrowserFilters } from "@/components/ExerciseBrowser";
import { getDb } from "@/lib/db";
import { activePlace, allExercises, summarize } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "Ejercicios" };

export default function ExercisesPage({ searchParams }: PageProps<"/fuerza/ejercicios">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/ejercicios">["searchParams"] }) {
  const [sp, db] = await Promise.all([searchParams, getDb()]);
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const places = db.places ?? [];
  // sin filtro de lugar en la URL, se filtra por el lugar activo; «todo» = cualquier material
  const placeParam = str("place");
  const initial: BrowserFilters = {
    q: str("q"),
    muscle: str("muscle"),
    cat: str("cat"),
    eq: str("eq"),
    place: placeParam === "todo" ? "" : places.some((p) => p.id === placeParam) ? placeParam : (activePlace(db)?.id ?? ""),
  };

  return (
    <>
      <Link href="/fuerza" className="text-sm text-ink-2 hover:text-ink">
        ← Fuerza
      </Link>
      <PageHeader
        title="Ejercicios"
        subtitle={places.length ? undefined : <>Filtra por lo que tienes: <Link href="/fuerza/material" className="text-accent">añade tu material</Link>.</>}
        action={
          <Link href="/fuerza/ejercicios/nuevo" className="btn">
            + Crear
          </Link>
        }
      />
      <ExerciseBrowser exercises={allExercises(db).map(summarize)} places={places} initial={initial} />
      <p className="mt-4 text-xs text-muted">
        Fotos e instrucciones originales de{" "}
        <a href="https://github.com/yuhonas/free-exercise-db" className="underline" target="_blank" rel="noreferrer">
          free-exercise-db
        </a>{" "}
        (dominio público), traducidas al español.
      </p>
    </>
  );
}
