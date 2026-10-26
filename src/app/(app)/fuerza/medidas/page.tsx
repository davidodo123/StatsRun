import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { Measurements } from "@/components/Measurements";
import { getDb } from "@/lib/db";
import { viewToday } from "@/lib/analysis";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Medidas" };

export default function MeasurementsPage() {
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
      <BackLink href="/fuerza" label={t("comun.volver")} />
      <PageHeader title={t("med.titulo")} subtitle={t("med.sub")} />
      <Measurements list={db.measurements ?? []} today={(await viewToday())} locale={locale} />
    </>
  );
}
