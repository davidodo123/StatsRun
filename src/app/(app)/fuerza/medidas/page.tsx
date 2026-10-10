import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { Measurements } from "@/components/Measurements";
import { getDb } from "@/lib/db";
import { todayLocal } from "@/lib/dates";

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
      <Link href="/fuerza" className="text-sm text-ink-2 hover:text-ink">
        ← Fuerza
      </Link>
      <PageHeader title="Medidas corporales" subtitle="Peso, % de grasa y perímetros para ver cómo cambia tu cuerpo." />
      <Measurements list={db.measurements ?? []} today={todayLocal()} />
    </>
  );
}
