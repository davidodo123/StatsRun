import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GoalForm } from "@/components/GoalForm";
import { Card, Loading, Notice, PageHeader, Stat } from "@/components/ui";
import { getAnalysis } from "@/lib/analysis";
import { findCmRace } from "@/lib/cruzandolametaStore";
import { diffDays } from "@/lib/dates";
import { weekdayDate } from "@/lib/i18n";
import { fmtKm } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Carrera" };

export default function CmRacePage({ params }: PageProps<"/carreras/cm/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/carreras/cm/[id]">["params"] }) {
  const [{ id }, { db, today }, { t, locale }] = await Promise.all([params, getAnalysis(), getT()]);
  const r = await findCmRace(id);
  if (!r) notFound();
  const days = diffDays(r.date, today);
  return (
    <>
      <BackLink href="/carreras" label={t("comun.volver")} />
      <PageHeader title={r.name} subtitle={`${weekdayDate(r.date, locale)}${r.time ? ` · ${r.time}` : ""} · ${r.place}`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("cf.faltan")} value={days} unit={t("cf.dias")} />
            <Stat
              label={t("cf.distancias")}
              value={r.distancesKm.length ? r.distancesKm.map((d) => fmtKm(d, d % 1 ? 1 : 0, locale)).join(" · ") : "–"}
              unit={r.distancesKm.length ? "km" : undefined}
              sub={r.distanceText}
            />
            <Stat label={t("cf.tipo")} value={<span className="text-base">{r.type || "–"}</span>} />
            <Stat label={t("cf.salida")} value={<span className="text-base">{r.startPlace || r.place}</span>} />
          </div>
          <Card title={t("cf.preparar")} subtitle={t("cf.prepararSub")}>
            {days < 3 ? (
              <Notice tone="warn">{t("cf.tarde")}</Notice>
            ) : (
              <>
                {!db.profile && (
                  <div className="mb-4">
                    <Notice tone="warn">
                      {t("cf.perfilAntes")}
                      <Link href="/perfil" className="font-semibold text-accent">
                        {t("cf.perfilLink")}
                      </Link>
                      {t("cf.perfilDespuesCm")}
                    </Notice>
                  </div>
                )}
                <GoalForm preset={{ raceId: `cm-${r.id}`, name: r.name, distances: r.distancesKm, date: r.date }} defaultDate={r.date} hasProfile={Boolean(db.profile)} locale={locale} />
                {r.courseUrl && <p className="mt-3 text-xs text-muted">{t("cf.recorridoSolo")}</p>}
              </>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          {r.image && (
            // eslint-disable-next-line @next/next/no-img-element -- cartel de su web, sin optimizar
            <img src={r.image} alt={t("cf.cartel", { nombre: r.name })} referrerPolicy="no-referrer" className="w-full rounded-2xl border border-line" />
          )}
          <Card title={t("cf.info")}>
            <ul className="space-y-2 text-sm">
              {r.registration && <li>{t("cf.inscripciones", { texto: r.registration })}</li>}
              <li>
                <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-accent">
                  {t("cf.ficha")}
                </a>
              </li>
              {r.website && (
                <li>
                  <a href={r.website} target="_blank" rel="noreferrer" className="text-accent">
                    {t("cf.web")}
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
                    {t("cf.mapa")}
                  </a>
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-muted">{t("cf.datosCm")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
