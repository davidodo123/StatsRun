"use client";

import { useEffect, useState } from "react";
import type { StreamResponse } from "@/app/api/serie/[uid]/[id]/route";
import { gradeAdjustedPace, paceProfile, zoneTimes } from "@/lib/engine/streams";
import { runSummary, type SummaryContext } from "@/lib/engine/runSummary";
import { fmtDuration, fmtPace } from "@/lib/format";
import { translator, type Key, type Locale } from "@/lib/i18n";
import { RunProfileCharts } from "./charts";
import { Icon } from "./icons";
import { Card } from "./ui";

// Z1 tenue → Z6 pleno: un solo color, de menos a más intensidad
const ZONE_OPACITY = [0.3, 0.42, 0.55, 0.68, 0.84, 1];

/**
 * Análisis de una carrera con su serie (Strava, «Grabar con GPS» o archivo): ritmo y desnivel a lo largo
 * de la carrera, ritmo ajustado a la pendiente, tiempo en cada zona y mejores esfuerzos (con medalla si es récord).
 */
export function RunAnalysis({ uid, id, context, locale }: { uid: string; id: string; context: SummaryContext; locale: Locale }) {
  const t = translator(locale);
  const [data, setData] = useState<StreamResponse | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetch(`/api/serie/${encodeURIComponent(uid)}/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<StreamResponse>) : null))
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [uid, id]);

  if (data === undefined) return <div className="h-64 animate-pulse rounded-2xl bg-surface" aria-busy aria-label={t("ra.cargando")} />;
  const s = data?.stream;
  if (!s || !data) return null;

  const profile = paceProfile(s);
  const gap = gradeAdjustedPace(s);
  const zones = data.zones.length ? zoneTimes(s, data.zones) : [];
  const zoneTotal = zones.reduce((a, b) => a + b, 0);
  const efforts = Object.entries(data.efforts).map(([d, sec]) => ({ d: Number(d), sec, rank: data.ranks[Number(d)] }));

  const totalSec = s.t[s.t.length - 1];
  const km = s.d[s.d.length - 1] / 1000;
  const moving = zones.reduce((a, b) => a + b, 0) || totalSec;
  const summary = runSummary(
    { paceSec: moving / km, distanceKm: km, gapSec: gap, zones, records: efforts.filter((e) => e.rank === 1).map((e) => e.d) },
    context,
    fmtPace,
  );

  return (
    <>
      {summary.length > 0 && (
        <Card title={t("ra.resumen")}>
          <p className="flex gap-2 text-sm leading-relaxed text-ink">
            <Icon name="sparkle" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              {summary
                .map((p) => {
                  const key = p.key === "ra.s.record" && p.params?.n === 1 ? "ra.s.record1" : p.key;
                  return t(key as Key, { ...p.params, ...(p.key === "ra.s.zona" ? { nombre: t(`ra.z${p.params!.z}` as Key) } : {}) });
                })
                .join(" ")}
            </span>
          </p>
        </Card>
      )}
      {profile.length > 0 && (
        <Card title={t("ra.titulo")}>
          {gap && (
            <p className="mb-3 text-sm text-ink-2">
              {t("ra.rap")}: <strong className="text-ink tabular">{fmtPace(gap)} /km</strong>
              <span className="block text-xs text-muted">{t("ra.rapHint")}</span>
            </p>
          )}
          <RunProfileCharts data={profile} locale={locale} />
        </Card>
      )}
      {zoneTotal > 0 && (
        <Card title={t("ra.zonas")} subtitle={t("ra.zonasSub")}>
          <ul className="space-y-2">
            {[5, 4, 3, 2, 1, 0].map((z) => {
              const pct = Math.round((zones[z] / zoneTotal) * 100);
              // límites de más lento a más rápido: Z1 más lento que el primero, Z6 más rápido que el último
              const range = z === 0 ? `> ${fmtPace(data.zones[0])}` : z === 5 ? `< ${fmtPace(data.zones[4])}` : `${fmtPace(data.zones[z])}–${fmtPace(data.zones[z - 1])}`;
              return (
                <li key={z} className="grid grid-cols-[2rem_1fr_2.75rem] items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">Z{z + 1}</span>
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2 text-xs text-ink-2">
                      <span className="truncate">{t(`ra.z${z + 1}` as Key)}</span>
                      <span className="shrink-0 text-muted tabular">{range}</span>
                    </span>
                    <span className="mt-1 block h-2 rounded-full bg-surface-2">
                      <span className="block h-2 rounded-full bg-accent" style={{ width: `${Math.max(pct, pct ? 2 : 0)}%`, opacity: ZONE_OPACITY[z] }} />
                    </span>
                  </span>
                  <span className="text-right font-semibold text-ink tabular">{pct} %</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {efforts.length > 0 && (
        <Card title={t("ra.esfuerzos")} subtitle={t("ra.esfuerzosSub")}>
          <ul className="divide-y divide-line">
            {efforts.map((e) => (
              <li key={e.d} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-ink">{t(`ra.d${e.d}` as Key)}</span>
                <span className="flex items-center gap-3">
                  {e.rank === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                      <Icon name="trophy" className="h-3.5 w-3.5" />
                      {t("ra.record")}
                    </span>
                  )}
                  {e.rank === 2 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-2">
                      <Icon name="medal" className="h-3.5 w-3.5" />
                      {t("ra.segundo")}
                    </span>
                  )}
                  <span className="text-right tabular">
                    <strong className="text-ink">{fmtDuration(e.sec)}</strong>
                    <span className="ml-2 text-xs text-muted">{fmtPace((e.sec / e.d) * 1000)} /km</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
