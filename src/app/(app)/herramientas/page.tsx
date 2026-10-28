import type { Metadata } from "next";
import { Suspense } from "react";
import { Calculators } from "@/components/Calculators";
import { Loading, PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Calculadoras" };

export default function ToolsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { t, locale } = await getT();
  return (
    <>
      <PageHeader title={t("nav.calculadoras")} subtitle={t("calc.sub")} />
      <Calculators locale={locale} />
    </>
  );
}
