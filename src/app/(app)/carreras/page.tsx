import type { Metadata } from "next";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { RACES } from "@/lib/races";
import { RaceList } from "@/components/RaceList";
import { CmRaceList } from "@/components/CmRaceList";
import { Card, PageHeader } from "@/components/ui";
import { cmCacheStale, readCmCache, refreshCmRaces } from "@/lib/cruzandolametaStore";

export const metadata: Metadata = { title: "Carreras" };

export default function CarrerasPage() {
  return (
    <>
      <PageHeader title="Elige tu carrera objetivo" subtitle="Consulta el recorrido, el clima típico y genera un plan ajustado a ella." />
      <Card title="Próximas carreras · Cruzando la Meta" subtitle="Las que publica cruzandolameta.es (sobre todo Andalucía), con su ficha, normativa y recorrido." className="mb-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface-2" />}>
          <CmSection />
        </Suspense>
      </Card>
      <h2 className="mb-3 text-lg font-bold">Grandes carreras</h2>
      <RaceList races={RACES} />
      <p className="mt-6 text-xs text-muted">Desnivel, temperatura y fechas son aproximados: confírmalos en la web oficial de cada carrera.</p>
    </>
  );
}

async function CmSection() {
  await connection();
  const cache = await readCmCache();
  // se renueva en segundo plano (como mucho cada 12 h): la página no espera a su web
  if (cmCacheStale(cache)) after(() => refreshCmRaces().catch(() => undefined));
  if (!cache.races.length) return <p className="text-sm text-ink-2">Estamos trayendo las carreras de Cruzando la Meta. Vuelve a entrar en un minuto.</p>;
  return (
    <>
      <CmRaceList races={cache.races} />
      {cache.updatedAt && (
        <p className="mt-3 text-xs text-muted">
          Actualizado el {new Date(cache.updatedAt).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}. Los datos son de
          su web: confírmalos allí antes de inscribirte.
        </p>
      )}
    </>
  );
}
