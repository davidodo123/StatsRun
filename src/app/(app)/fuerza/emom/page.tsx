import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { EmomTimer } from "@/components/EmomTimer";
import { getDb } from "@/lib/db";
import { activePlace, customSummaries } from "@/lib/strength/catalog";

export const metadata: Metadata = { title: "EMOM" };

export default function EmomPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  return (
    <>
      <PageHeader title="EMOM" subtitle="Cada minuto, al minuto" />
      <EmomTimer custom={customSummaries(db)} available={activePlace(db)?.equipment} bodyKg={db.profile?.weightKg} />
    </>
  );
}
