import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { getDb } from "@/lib/db";
import { activePlace, allExercises, summarize } from "@/lib/strength/catalog";
import { lastSets } from "@/lib/strength/workouts";

export const metadata: Metadata = { title: "Entreno" };

export default function WorkoutPage({ searchParams }: PageProps<"/fuerza/entreno">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/entreno">["searchParams"] }) {
  const [sp, db] = await Promise.all([searchParams, getDb()]);
  const routine = typeof sp.rutina === "string" ? db.routines?.find((r) => r.id === sp.rutina) : undefined;
  return <WorkoutLogger routine={routine} exercises={allExercises(db).map(summarize)} previous={lastSets(db.activities)} available={activePlace(db)?.equipment} bodyKg={db.profile?.weightKg} />;
}
