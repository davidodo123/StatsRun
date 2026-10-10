import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { StrengthChat } from "@/components/StrengthChat";
import { getDb } from "@/lib/db";
import { findExercise } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "Entrenador de fuerza" };
// la respuesta con rutinas puede tardar (modelo grande): margen para la acción del chat
export const maxDuration = 120;

export default function StrengthCoachPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  const messages = db.strengthChat ?? [];
  const ids = new Set(messages.flatMap((m) => m.routines?.flatMap((r) => r.exercises.map((e) => e.exerciseId)) ?? []));
  const names = Object.fromEntries([...ids].map((id) => [id, findExercise(db, id)?.name ?? id]));
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/fuerza" className="text-sm text-ink-2 hover:text-ink">
        ← Fuerza
      </Link>
      <PageHeader title="Entrenador de fuerza" subtitle="Rutinas, dudas y progresión, con IA y base científica." />
      <StrengthChat messages={messages} names={names} />
    </div>
  );
}
