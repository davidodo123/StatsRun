import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GoalForm } from "@/components/GoalForm";
import { Card, Loading, Notice, PageHeader, Stat } from "@/components/ui";
import { getAnalysis } from "@/lib/analysis";
import { findCmRace } from "@/lib/cruzandolametaStore";
import { WEEKDAYS, diffDays, shortDate, weekday } from "@/lib/dates";
import { fmtKm } from "@/lib/format";

export const metadata: Metadata = { title: "Carrera" };

export default function CmRacePage({ params }: PageProps<"/carreras/cm/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/carreras/cm/[id]">["params"] }) {
  const [{ id }, { db, today }] = await Promise.all([params, getAnalysis()]);
  const r = await findCmRace(id);
  if (!r) notFound();
  const days = diffDays(r.date, today);
  return (
    <>
      <BackLink href="/carreras" />
      <PageHeader title={r.name} subtitle={`${WEEKDAYS[weekday(r.date)]} ${shortDate(r.date)}${r.time ? ` · ${r.time}` : ""} · ${r.place}`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Faltan" value={days} unit="días" />
            <Stat
              label="Distancias"
              value={r.distancesKm.length ? r.distancesKm.map((d) => fmtKm(d, d % 1 ? 1 : 0)).join(" · ") : "–"}
              unit={r.distancesKm.length ? "km" : undefined}
              sub={r.distanceText}
            />
            <Stat label="Tipo" value={<span className="text-base">{r.type || "–"}</span>} />
            <Stat label="Salida" value={<span className="text-base">{r.startPlace || r.place}</span>} />
          </div>
          <Card title="Preparar esta carrera" subtitle="Generamos un plan periodizado desde hoy hasta el día de la carrera.">
            {days < 3 ? (
              <Notice tone="warn">Es dentro de menos de 3 días: ya no da tiempo a preparar un plan.</Notice>
            ) : (
              <>
                {!db.profile && (
                  <div className="mb-4">
                    <Notice tone="warn">
                      Completa primero{" "}
                      <Link href="/perfil" className="font-semibold text-accent">
                        tu perfil
                      </Link>{" "}
                      para que el plan se ajuste a ti.
                    </Notice>
                  </div>
                )}
                <GoalForm preset={{ raceId: `cm-${r.id}`, name: r.name, distances: r.distancesKm, date: r.date }} defaultDate={r.date} hasProfile={Boolean(db.profile)} />
                {r.courseUrl && <p className="mt-3 text-xs text-muted">Su recorrido se carga solo en tu plan (mapa, distancia y desnivel).</p>}
              </>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          {r.image && (
            // eslint-disable-next-line @next/next/no-img-element -- cartel de su web, sin optimizar
            <img src={r.image} alt={`Cartel de ${r.name}`} referrerPolicy="no-referrer" className="w-full rounded-2xl border border-line" />
          )}
          <Card title="Información">
            <ul className="space-y-2 text-sm">
              {r.registration && <li>Inscripciones {r.registration}</li>}
              <li>
                <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-accent">
                  Ficha e inscripción en Cruzando la Meta ↗
                </a>
              </li>
              {r.website && (
                <li>
                  <a href={r.website} target="_blank" rel="noreferrer" className="text-accent">
                    Web oficial ↗
                  </a>
                </li>
              )}
              {r.downloads?.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-accent">
                    {d.label} ↗
                  </a>
                </li>
              ))}
              {r.lat !== undefined && r.lon !== undefined && (
                <li>
                  <a href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=16/${r.lat}/${r.lon}`} target="_blank" rel="noreferrer" className="text-accent">
                    Ver la salida en el mapa ↗
                  </a>
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-muted">Datos de cruzandolameta.es: confírmalos allí antes de inscribirte.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
