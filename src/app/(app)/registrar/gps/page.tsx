import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { Loading, PageHeader } from "@/components/ui";
import { RunRecorder } from "@/components/RunRecorder";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Grabar con GPS" };

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const { t, locale } = await getT();
  return (
    <>
      <BackLink href="/registrar" label={t("comun.volver")} />
      <PageHeader title={t("reg.gps")} />
      <RunRecorder locale={locale} />
    </>
  );
}
