import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { EmomTimer } from "@/components/EmomTimer";
import { getDb } from "@/lib/db";
import { activePlace, customSummaries } from "@/lib/strength/catalog";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "EMOM" };

export default function EmomPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [db, { t, locale }] = await Promise.all([getDb(), getT()]);
  return (
    <>
      <PageHeader title="EMOM" subtitle={t("fh.emomSub")} />
      <EmomTimer custom={customSummaries(db)} available={activePlace(db)?.equipment} bodyKg={db.profile?.weightKg} locale={locale} />
    </>
  );
}
