import type { Metadata } from "next";
import { Suspense } from "react";
import { SleepCalculator } from "@/components/SleepCalculator";
import { Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { viewToday } from "@/lib/analysis";
import { isHardSession } from "@/lib/engine/planner";

export const metadata: Metadata = { title: "Sueño" };

export default function SleepPage() {
  return (
    <>
      <PageHeader title="Sueño" subtitle="A qué hora poner la alarma para despertarte al acabar un ciclo y no levantarte fatal." />
      <Suspense fallback={<SleepCalculator hardTomorrow={false} />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const db = await getDb();
  const tomorrow = addDays((await viewToday()), 1);
  // lo que toca mañana en el plan: con algo duro, mejor dormir más
  const next = (db.plan?.weeks.flatMap((w) => w.sessions) ?? []).filter((s) => s.date === tomorrow && s.type !== "strength");
  const hard = next.some((s) => isHardSession(s.type) || s.type === "race");
  return (
    <div className="space-y-4">
      {next.length > 0 && (
        <Notice tone={hard ? "warn" : "neutral"}>
          Mañana: <strong className="text-ink">{next.map((s) => s.title).join(" + ")}</strong>.{" "}
          {hard ? "Es una sesión exigente: intenta dormir 6 ciclos (9 h), o al menos 5 (7,5 h)." : "Con 5 ciclos (7,5 h) llegas bien."}
        </Notice>
      )}
      <SleepCalculator hardTomorrow={hard} />
    </div>
  );
}
