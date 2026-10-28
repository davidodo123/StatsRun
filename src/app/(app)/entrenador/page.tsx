import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { StrengthChat } from "@/components/StrengthChat";
import { getDb } from "@/lib/db";
import { exerciseName, findExercise } from "@/lib/strength/catalog";
import { AiMemory } from "@/components/AiMemory";
import { getT } from "@/lib/i18n/server";

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
  const [db, { t, locale }] = await Promise.all([getDb(), getT()]);
  const messages = db.strengthChat ?? [];
  const ids = new Set(messages.flatMap((m) => m.routines?.flatMap((r) => r.exercises.map((e) => e.exerciseId)) ?? []));
  const names = Object.fromEntries([...ids].map((id) => [id, (() => { const x = findExercise(db, id); return x ? exerciseName(x, locale) : id; })()]));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("nav.entrenadorIA")} />
      <StrengthChat locale={locale} messages={messages} names={names} ratings={Object.fromEntries((db.aiFeedback ?? []).filter((f) => f.area === "chat").map((f) => [f.ref, f.rating]))} />
      <Card title={t("mem.titulo")} subtitle={t("mem.sub")} className="mt-6">
        <AiMemory list={db.aiPreferences ?? []} locale={locale} />
      </Card>
    </div>
  );
}
