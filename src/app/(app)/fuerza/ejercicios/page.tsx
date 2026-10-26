import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { ExerciseBrowser, type BrowserFilters } from "@/components/ExerciseBrowser";
import { getDb } from "@/lib/db";
import { activePlace, customSummaries } from "@/lib/strength/catalog";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Ejercicios" };

export default function ExercisesPage({ searchParams }: PageProps<"/fuerza/ejercicios">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/ejercicios">["searchParams"] }) {
  const [sp, db, { t, locale }] = await Promise.all([searchParams, getDb(), getT()]);
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const places = db.places ?? [];
  // el texto con el enlace a la fuente en medio
  const credits = t("eb.creditos").split("{fuente}");
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
      <BackLink href="/fuerza" label={t("comun.volver")} />
      <PageHeader
        title={t("nav.ejercicios")}
        subtitle={places.length ? undefined : <>{t("eb.filtra")} <Link href="/fuerza/material" className="text-accent">{t("eb.anadeMaterial")}</Link>.</>}
        action={
          <Link href="/fuerza/ejercicios/nuevo" className="btn">
            {t("eb.crear")}
          </Link>
        }
      />
      <ExerciseBrowser custom={customSummaries(db)} places={places} initial={initial} locale={locale} />
      <p className="mt-4 text-xs text-muted">
        {credits[0]}
        <a href="https://github.com/yuhonas/free-exercise-db" className="underline" target="_blank" rel="noreferrer">
          free-exercise-db
        </a>
        {credits[1]}
      </p>
    </>
  );
}
