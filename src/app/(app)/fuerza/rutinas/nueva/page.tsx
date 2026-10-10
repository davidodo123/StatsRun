import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { RoutineEditor } from "@/components/RoutineEditor";
import { getDb } from "@/lib/db";
import { activePlace, allExercises, summarize } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "Nueva rutina" };

export default function NewRoutinePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  return <RoutineEditor exercises={allExercises(db).map(summarize)} available={activePlace(db)?.equipment} />;
}
