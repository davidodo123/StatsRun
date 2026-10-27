import type { Metadata } from "next";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { RACES } from "@/lib/races";
import { RaceList } from "@/components/RaceList";
import { CmRaceList } from "@/components/CmRaceList";
import { Card, PageHeader } from "@/components/ui";
import { cmCacheStale, readCmCache, refreshCmRaces } from "@/lib/cruzandolametaStore";
import { TuneUpRaces } from "@/components/TuneUpRaces";
import { getDb } from "@/lib/db";
import { viewToday } from "@/lib/analysis";
import { getT } from "@/lib/i18n/server";
import { intlLocale, type Locale, type T } from "@/lib/i18n";

export const metadata: Metadata = { title: "Carreras" };

export default function CarrerasPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { t, locale } = await getT();
  return (
    <>
      <PageHeader title={t("nav.carreras")} subtitle={t("car.sub")} />
      <Suspense fallback={null}>
        <Season locale={locale} />
      </Suspense>
      <Card title={t("car.cm")} className="mb-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface-2" />}>
          <CmSection t={t} locale={locale} />
        </Suspense>
      </Card>
      <h2 className="mb-3 text-lg font-bold">{t("car.grandes")}</h2>
      <RaceList races={RACES} locale={locale} />
      <p className="mt-6 text-xs text-muted">{t("car.aviso")}</p>
    </>
  );
}

/** Tu temporada (si ya tienes plan): objetivo principal y carreras de preparación. */
async function Season({ locale }: { locale: Locale }) {
  const db = await getDb();
  const goal = db.goal ?? db.plan?.goal;
  if (!goal) return null;
  return (
    <div className="mb-6">
      <TuneUpRaces goal={goal} races={db.races ?? []} today={await viewToday()} locale={locale} />
    </div>
  );
}

async function CmSection({ t, locale }: { t: T; locale: Locale }) {
  await connection();
  const cache = await readCmCache();
  // se renueva en segundo plano (como mucho cada 12 h): la página no espera a su web
  if (cmCacheStale(cache)) after(() => refreshCmRaces().catch(() => undefined));
  if (!cache.races.length) return <p className="text-sm text-ink-2">{t("car.trayendo")}</p>;
  return (
    <>
      <CmRaceList races={cache.races} locale={locale} />
      {cache.updatedAt && (
        <p className="mt-3 text-xs text-muted">
          {t("car.actualizado", { fecha: new Date(cache.updatedAt).toLocaleString(intlLocale(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) })}
        </p>
      )}
    </>
  );
}
