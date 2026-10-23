import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { PushSettings } from "@/components/PushSettings";
import { getDb } from "@/lib/db";
import { pushPublicKey } from "@/lib/push";

export const metadata: Metadata = { title: "Avisos" };

export default function AvisosPage() {
  return (
    <>
      <PageHeader title="Avisos" subtitle="Cada mañana, una notificación con lo que te toca hoy en tu plan." />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const db = await getDb();
  return (
    <div className="max-w-xl space-y-4">
      <Card title="Lo que te toca hoy" subtitle="Hacia las 7-8 de la mañana (hora de España)">
        <PushSettings publicKey={pushPublicKey()} endpoints={(db.push?.subs ?? []).map((s) => s.endpoint)} restDays={Boolean(db.push?.restDays)} />
      </Card>
      {!db.plan && <p className="text-sm text-ink-2">Aún no tienes plan: el aviso empezará a llegar cuando tengas uno.</p>}
    </div>
  );
}
