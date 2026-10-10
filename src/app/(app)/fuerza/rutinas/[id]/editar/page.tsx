import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { RoutineEditor } from "@/components/RoutineEditor";
import { getDb } from "@/lib/db";
import { activePlace, customSummaries } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "Editar rutina" };

export default function EditRoutinePage({ params }: PageProps<"/fuerza/rutinas/[id]/editar">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fuerza/rutinas/[id]/editar">["params"] }) {
  const [{ id }, db] = await Promise.all([params, getDb()]);
  const routine = db.routines?.find((r) => r.id === id);
  if (!routine) notFound();
  return <RoutineEditor routine={routine} custom={customSummaries(db)} available={activePlace(db)?.equipment} />;
}
