import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { RunRecorder } from "@/components/RunRecorder";

export const metadata: Metadata = { title: "Grabar con GPS" };

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/registrar" className="text-sm text-ink-2 hover:text-ink">
        ← Registrar
      </Link>
      <PageHeader title="Grabar con GPS" />
      <RunRecorder />
    </div>
  );
}
