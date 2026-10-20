import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { StrengthChat } from "@/components/StrengthChat";
import { getDb } from "@/lib/db";
import { findExercise } from "@/lib/strength/catalog";
import { AiMemory } from "@/components/AiMemory";

export const metadata: Metadata = { title: "Entrenador IA" };
// la respuesta con rutinas o el ajuste del plan pueden tardar (modelo grande): margen para las acciones del chat
export const maxDuration = 180;

export default function CoachPage() {
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
      <PageHeader title="Entrenador IA" />
      <StrengthChat messages={messages} names={names} ratings={Object.fromEntries((db.aiFeedback ?? []).filter((f) => f.area === "chat").map((f) => [f.ref, f.rating]))} />
      <Card title="Lo que la IA sabe de ti" subtitle="Lo tiene en cuenta en el chat, en tus rutinas y al ajustar el plan" className="mt-6">
        <AiMemory list={db.aiPreferences ?? []} />
      </Card>
    </div>
  );
}
