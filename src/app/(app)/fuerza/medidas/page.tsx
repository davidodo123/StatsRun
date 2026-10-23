import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { Measurements } from "@/components/Measurements";
import { getDb } from "@/lib/db";
import { viewToday } from "@/lib/analysis";

export const metadata: Metadata = { title: "Medidas" };

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  return (
    <>
      <BackLink href="/fuerza" />
      <PageHeader title="Medidas corporales" subtitle="Peso, % de grasa y perímetros para ver cómo cambia tu cuerpo." />
      <Measurements list={db.measurements ?? []} today={(await viewToday())} />
    </>
  );
}
