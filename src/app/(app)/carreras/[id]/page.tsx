import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RACES, findRace, PROFILE_TONE, type Race } from "@/lib/races";
import { getAnalysis } from "@/lib/analysis";
import { GoalForm } from "@/components/GoalForm";
import { Card, Notice, PageHeader, Pill, Stat } from "@/components/ui";
import { flatEquivalentKm, heatFactor } from "@/lib/engine/physiology";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import { addDays, diffDays } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { intlLocale, type Key, type Locale, type T } from "@/lib/i18n";

export function generateStaticParams() {
  return [...RACES.map((r) => ({ id: r.id })), { id: "personalizada" }];
}

export async function generateMetadata({ params }: PageProps<"/carreras/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: findRace(id)?.name ?? "Carrera personalizada" };
}

// nombre del mes (1-12) en el idioma
const monthName = (m: number, locale: Locale) => new Date(Date.UTC(2026, m - 1, 15)).toLocaleDateString(intlLocale(locale), { month: "long", timeZone: "UTC" });

export default function RacePage({ params }: PageProps<"/carreras/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
      <RaceBody params={params} />
    </Suspense>
  );
}

async function RaceBody({ params }: { params: PageProps<"/carreras/[id]">["params"] }) {
  const [{ id }, { t, locale }] = await Promise.all([params, getT()]);
  const race = findRace(id);
  if (!race && id !== "personalizada") notFound();

  return (
    <>
      <BackLink href="/carreras" label={t("comun.volver")} />
      <PageHeader
        title={race ? race.name : t("cf.personalizada")}
        subtitle={
          race
            ? t("cf.sub", { ciudad: race.city, pais: t(`car.pais.${race.country}` as Key), mes: race.month ? monthName(race.month, locale) : t("cf.cualquierFecha") })
            : t("cf.subPers")
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {race && <RaceInfo race={race} t={t} locale={locale} />}
          <Card title={t("cf.preparar")} subtitle={t("cf.prepararSub")}>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface-2" />}>
              <GoalFormLoader race={race} t={t} locale={locale} />
            </Suspense>
          </Card>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
          <Prediction race={race} t={t} locale={locale} />
        </Suspense>
      </div>
    </>
  );
}

function RaceInfo({ race, t, locale }: { race: Race; t: T; locale: Locale }) {
  const eq = flatEquivalentKm(race.distanceKm, race.elevationGainM, race.elevationLossM);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("cf.distancia")} value={race.distanceKm.toLocaleString(intlLocale(locale), { maximumFractionDigits: 3 })} unit="km" />
        <Stat label={t("cf.desnivel")} value={`+${race.elevationGainM}`} unit={`/ −${race.elevationLossM} m`} />
        <Stat label={t("cf.temp")} value={race.temperatureC} unit="°C" />
        <Stat label={t("cf.llano")} value={fmtKm(eq, 1, locale)} unit="km" sub={t("cf.llanoSub")} />
      </div>
      {/* los puntos fuertes de cada carrera son datos del catálogo, en español */}
      <Card title={t("cf.recorrido")} action={<Pill className={PROFILE_TONE[race.profile]}>{t(`car.perfil.${race.profile}` as Key)}</Pill>}>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-2">
          {race.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <a href={race.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent">
          {t("cf.web")}
        </a>
      </Card>
    </>
  );
}

async function GoalFormLoader({ race, t, locale }: { race?: Race; t: T; locale: Locale }) {
  const { db, today } = await getAnalysis();
  let date = race?.typicalDate && race.typicalDate > addDays(today, 7) ? race.typicalDate : addDays(today, race && race.distanceKm > 30 ? 16 * 7 : 10 * 7);
  if (db.goal && db.goal.raceId === race?.id) date = db.goal.date;
  return (
    <>
      {!db.profile && (
        <div className="mb-4">
          <Notice tone="warn">
            {t("cf.perfilAntes")}
            <Link href="/perfil" className="font-semibold text-accent">
              {t("cf.perfilLink")}
            </Link>
            {t("cf.perfilDespues")}
          </Notice>
        </div>
      )}
      <GoalForm race={race} defaultDate={date} hasProfile={Boolean(db.profile)} locale={locale} />
    </>
  );
}

async function Prediction({ race, t, locale }: { race?: Race; t: T; locale: Locale }) {
  const { stats, today } = await getAnalysis();
  if (!stats || !race) return <div />;
  const base = stats.predictions.find((p) => Math.abs(p.km - race.distanceKm) < 0.5);
  const flat = base?.timeSec ?? (stats.predictions[stats.predictions.length - 1].timeSec * race.distanceKm) / 42.195;
  const factor = (flatEquivalentKm(race.distanceKm, race.elevationGainM, race.elevationLossM) / race.distanceKm) * heatFactor(race.temperatureC, race.distanceKm);
  const time = flat * factor;
  const weeks = race.typicalDate ? Math.floor(diffDays(race.typicalDate, today) / 7) : undefined;
  return (
    <div className="space-y-4">
      <Card title={t("cf.prediccion")} subtitle={t("cf.prediccionSub")}>
        <p className="text-4xl font-bold tracking-tight tabular">{fmtDuration(time)}</p>
        <p className="mt-1 text-sm text-ink-2 tabular">{t("cf.deMedia", { ritmo: fmtPace(time / race.distanceKm) })}</p>
        <ul className="mt-4 space-y-1 text-xs text-ink-2">
          <li>{t("cf.llanoFresco", { t: fmtDuration(flat) })}</li>
          <li>{t("cf.efecto", { pct: fmtKm((factor - 1) * 100, 1, locale) })}</li>
          {weeks !== undefined && weeks > 0 && <li>{t("cf.semanas", { n: weeks })}</li>}
        </ul>
      </Card>
      {weeks !== undefined && weeks > 0 && weeks < 8 && race.distanceKm > 30 && <Notice tone="warn">{t("cf.pocoMaraton")}</Notice>}
    </div>
  );
}
