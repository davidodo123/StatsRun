import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { Loading, PageHeader } from "@/components/ui";
import { InstantWorkoutsPicker, type InstantCard } from "@/components/InstantWorkouts";
import { getAnalysis, viewToday } from "@/lib/analysis";
import { instantWorkouts, type InstantMode } from "@/lib/engine/planner";
import { getT } from "@/lib/i18n/server";
import { addDays } from "@/lib/dates";
import { planText } from "@/lib/i18n/planText";

export const metadata: Metadata = { title: "Entreno al momento" };

export default function InstantPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [{ db, stats }, { t, locale }, today] = await Promise.all([getAnalysis(), getT(), viewToday()]);
  const all = instantWorkouts(db.activities, db.profile, stats?.vdot.vdot ?? 35, today);
  // los textos, ya traducidos (son los mismos que los del plan)
  const cards = Object.fromEntries(
    Object.entries(all).map(([mode, list]) => [
      mode,
      list.map(({ session: s, level }): InstantCard => ({
        title: planText(s.title, locale),
        description: planText(s.description, locale),
        steps: s.steps.map((x) => planText(x, locale)),
        km: s.distanceKm,
        min: s.durationMin,
        level,
      })),
    ]),
  ) as Record<InstantMode, InstantCard[]>;
  // se puede poner en el plan si tiene la semana de hoy
  const hasToday = Boolean(db.plan?.weeks.some((w) => w.start <= today && addDays(w.start, 6) >= today));
  return (
    <>
      <BackLink href="/plan/actual" label={t("comun.volver")} />
      <PageHeader title={t("im.titulo")} subtitle={t("im.sub")} />
      <InstantWorkoutsPicker cards={cards} canAdd={hasToday} locale={locale} />
    </>
  );
}
