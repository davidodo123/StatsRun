import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { RoutineEditor } from "@/components/RoutineEditor";
import { getDb } from "@/lib/db";
import { viewLocale } from "@/lib/i18n/server";
import { activePlace, customSummaries } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "Nueva rutina" };

export default function NewRoutinePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [db, locale] = await Promise.all([getDb(), viewLocale()]);
  return <RoutineEditor locale={locale} custom={customSummaries(db)} available={activePlace(db)?.equipment} folders={[...new Set((db.routines ?? []).flatMap((r) => (r.folder ? [r.folder] : [])))]} />;
}
