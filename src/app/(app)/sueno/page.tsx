import type { Metadata } from "next";
import { Suspense } from "react";
import { SleepCalculator } from "@/components/SleepCalculator";
import { Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { viewToday } from "@/lib/analysis";
import { isHardSession } from "@/lib/engine/planner";
import { getT } from "@/lib/i18n/server";
import { planText } from "@/lib/i18n/planText";

export const metadata: Metadata = { title: "Sueño" };

export default function SleepPage() {
  return (
    <Suspense fallback={<SleepCalculator hardTomorrow={false} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [db, { t, locale }] = await Promise.all([getDb(), getT()]);
  const tomorrow = addDays((await viewToday()), 1);
  // lo que toca mañana en el plan: con algo duro, mejor dormir más
  const next = (db.plan?.weeks.flatMap((w) => w.sessions) ?? []).filter((s) => s.date === tomorrow && s.type !== "strength");
  const hard = next.some((s) => isHardSession(s.type) || s.type === "race");
  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.sueno")} subtitle={t("sue.sub")} />
      {next.length > 0 && (
        <Notice tone={hard ? "warn" : "neutral"}>
          {t("sue.manana")} <strong className="text-ink">{next.map((s) => planText(s.title, locale)).join(" + ")}</strong>. {hard ? t("sue.duro") : t("sue.normal")}
        </Notice>
      )}
      <SleepCalculator hardTomorrow={hard} locale={locale} />
    </div>
  );
}
