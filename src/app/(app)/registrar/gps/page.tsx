import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/ui";
import { RunRecorder } from "@/components/RunRecorder";

export const metadata: Metadata = { title: "Grabar con GPS" };

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/registrar" />
      <PageHeader title="Grabar con GPS" />
      <RunRecorder />
    </div>
  );
}
