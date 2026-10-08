import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RACES, findRace, PROFILE_TONE, type Race } from "@/lib/races";
import { getAnalysis } from "@/lib/analysis";
import { GoalForm } from "@/components/GoalForm";
import { Card, Notice, PageHeader, Pill, Stat } from "@/components/ui";
import { flatEquivalentKm, heatFactor } from "@/lib/engine/physiology";
import { fmtDuration, fmtPace } from "@/lib/format";
import { addDays, diffDays } from "@/lib/dates";

export function generateStaticParams() {
  return [...RACES.map((r) => ({ id: r.id })), { id: "personalizada" }];
}

export async function generateMetadata({ params }: PageProps<"/carreras/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: findRace(id)?.name ?? "Carrera personalizada" };
}

const MONTHS = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function RacePage({ params }: PageProps<"/carreras/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
      <RaceBody params={params} />
    </Suspense>
  );
}

async function RaceBody({ params }: { params: PageProps<"/carreras/[id]">["params"] }) {
  const { id } = await params;
  const race = findRace(id);
  if (!race && id !== "personalizada") notFound();

  return (
    <>
      <Link href="/carreras" className="text-sm text-ink-2 hover:text-ink">
        ← Carreras
      </Link>
      <PageHeader
        title={race ? `${race.flag} ${race.name}` : "Carrera personalizada"}
        subtitle={race ? `${race.city}, ${race.country} · normalmente en ${MONTHS[race.month] || "cualquier fecha"}` : "Introduce los datos de tu carrera."}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {race && <RaceInfo race={race} />}
          <Card title="Preparar esta carrera" subtitle="Generamos un plan periodizado desde hoy hasta el día de la carrera.">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface-2" />}>
              <GoalFormLoader race={race} />
            </Suspense>
          </Card>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
          <Prediction race={race} />
        </Suspense>
      </div>
    </>
  );
}

function RaceInfo({ race }: { race: Race }) {
  const eq = flatEquivalentKm(race.distanceKm, race.elevationGainM, race.elevationLossM);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Distancia" value={race.distanceKm.toLocaleString("es-ES", { maximumFractionDigits: 3 })} unit="km" />
        <Stat label="Desnivel +/−" value={`+${race.elevationGainM}`} unit={`/ −${race.elevationLossM} m`} />
        <Stat label="Temperatura típica" value={race.temperatureC} unit="°C" />
        <Stat label="Equivale en llano a" value={eq.toFixed(1)} unit="km" sub="Por coste del desnivel" />
      </div>
      <Card
        title="Sobre el recorrido"
        action={<Pill className={PROFILE_TONE[race.profile]}>{race.profile}</Pill>}
      >
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-2">
          {race.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <a href={race.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent">
          Web oficial ↗
        </a>
      </Card>
    </>
  );
}

async function GoalFormLoader({ race }: { race?: Race }) {
  const { db, today } = await getAnalysis();
  let date = race?.typicalDate && race.typicalDate > addDays(today, 7) ? race.typicalDate : addDays(today, race && race.distanceKm > 30 ? 16 * 7 : 10 * 7);
  if (db.goal && db.goal.raceId === race?.id) date = db.goal.date;
  return (
    <>
      {!db.profile && (
        <div className="mb-4">
          <Notice tone="warn">
            Completa primero <Link href="/perfil" className="font-semibold text-accent">tu perfil</Link> para que el plan se ajuste a tu peso y experiencia.
          </Notice>
        </div>
      )}
      <GoalForm race={race} defaultDate={date} hasProfile={Boolean(db.profile)} />
    </>
  );
}

async function Prediction({ race }: { race?: Race }) {
  const { stats, today } = await getAnalysis();
  if (!stats || !race) return <div />;
  const base = stats.predictions.find((p) => Math.abs(p.km - race.distanceKm) < 0.5);
  const flat = base?.timeSec ?? (stats.predictions[stats.predictions.length - 1].timeSec * race.distanceKm) / 42.195;
  const factor = (flatEquivalentKm(race.distanceKm, race.elevationGainM, race.elevationLossM) / race.distanceKm) * heatFactor(race.temperatureC, race.distanceKm);
  const t = flat * factor;
  const weeks = race.typicalDate ? Math.floor(diffDays(race.typicalDate, today) / 7) : undefined;
  return (
    <div className="space-y-4">
      <Card title="Tu predicción hoy" subtitle="Con tu forma actual, sin preparación específica">
        <p className="text-4xl font-bold tracking-tight tabular">{fmtDuration(t)}</p>
        <p className="mt-1 text-sm text-ink-2 tabular">{fmtPace(t / race.distanceKm)} /km de media</p>
        <ul className="mt-4 space-y-1 text-xs text-ink-2">
          <li>En llano y fresco: {fmtDuration(flat)}</li>
          <li>Efecto del recorrido y clima: +{((factor - 1) * 100).toFixed(1)} %</li>
          {weeks !== undefined && weeks > 0 && <li>Semanas hasta la próxima edición: {weeks}</li>}
        </ul>
      </Card>
      {weeks !== undefined && weeks > 0 && weeks < 8 && race.distanceKm > 30 && (
        <Notice tone="warn">Menos de 8 semanas para un maratón: el plan priorizará llegar sano.</Notice>
      )}
    </div>
  );
}
