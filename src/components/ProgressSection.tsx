"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { addSuggestedTarget, addTarget, deleteTarget, loadOldEfforts } from "@/app/progress-actions";
import type { FormState } from "@/app/actions";
import type { BestTime, WeekEffort, WeekSummary } from "@/lib/engine/progress";
import { fmtDuration } from "@/lib/format";
import { dayMonth, intlLocale, translator, type Key, type Locale, type T } from "@/lib/i18n";
import type { SportKind, Target } from "@/lib/types";
import { TrendLine, WeeklyProgressChart } from "./charts";
import { Icon } from "./icons";
import { Card } from "./ui";

export interface ProgressData {
  weeks: Record<string, WeekSummary[]>; // por deporte y «all»
  sports: SportKind[];
  effort?: WeekEffort;
  prediction: { km: number; label: string; trend: { date: string; sec: number }[] };
  best: BestTime[];
  oldPending: number; // carreras de Strava sin mejores esfuerzos todavía
  targets: { target: Target; done: number }[];
  suggested?: Target;
}

const num = (v: number, d: number, locale: Locale) => v.toLocaleString(intlLocale(locale), { maximumFractionDigits: d });

/** «20 km a la semana · Correr» */
export function targetLabel(x: Target, t: T, locale: Locale) {
  const sport = x.sport === "all" ? t("pg.todos") : t(`sport.${x.sport}` as Key);
  return `${num(x.value, 1, locale)} ${t(`pg.m.${x.metric}` as Key)} ${t(`pg.per.${x.period}` as Key)} · ${sport}`;
}

/** Progreso (como en Strava): la semana y las 12 anteriores, esfuerzo, predicción, mejores tiempos y objetivos. */
export function ProgressSection({ data, locale }: { data: ProgressData; locale: Locale }) {
  const t = translator(locale);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WeeksCard data={data} t={t} locale={locale} />
      <div className="space-y-4">
        {data.effort && <EffortCard e={data.effort} t={t} locale={locale} />}
        <PredictionCard p={data.prediction} t={t} locale={locale} />
      </div>
      <BestCard best={data.best} pending={data.oldPending} t={t} />
      <TargetsCard targets={data.targets} suggested={data.suggested} sports={data.sports} t={t} locale={locale} />
    </div>
  );
}

function WeeksCard({ data, t, locale }: { data: ProgressData; t: T; locale: Locale }) {
  const [sport, setSport] = useState<string>(data.sports.includes("run") ? "run" : "all");
  const weeks = data.weeks[sport] ?? data.weeks.all;
  const [sel, setSel] = useState(weeks.length - 1);
  const w = weeks[sel] ?? weeks.at(-1)!;
  const end = new Date(`${w.week}T12:00:00`);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);
  const chips: string[] = ["all", ...data.sports];
  return (
    <Card title={t("pg.progreso")}>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === sport}
            onClick={() => {
              setSport(s);
              setSel((data.weeks[s] ?? data.weeks.all).length - 1);
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${s === sport ? "border-accent text-accent" : "border-line text-ink-2"}`}
          >
            {s === "all" ? t("pg.todos") : t(`sport.${s}` as Key)}
          </button>
        ))}
      </div>
      <p className="text-lg font-bold text-ink">
        {dayMonth(w.week, locale)} – {dayMonth(endStr, locale)}
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {[
          [t("pg.distancia"), `${num(w.km, 1, locale)} km`],
          [t("pg.tiempo"), fmtDuration(w.sec)],
          [t("pg.desnivel"), `${num(w.elev, 0, locale)} m`],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-display text-xl text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 mb-1 text-xs text-muted">{t("pg.ult12")}</p>
      <WeeklyProgressChart data={weeks} selected={sel} onSelect={setSel} metric="km" locale={locale} />
    </Card>
  );
}

function EffortCard({ e, t, locale }: { e: WeekEffort; t: T; locale: Locale }) {
  const [lo, hi] = e.range;
  // sin semanas anteriores (recién llegado) no hay rango con el que comparar: salía «Recomendado: 0–0» y «Por encima»
  const noBase = hi === 0;
  const state = e.score < lo ? "debajo" : e.score > hi ? "encima" : "enRango";
  const max = Math.max(hi * 1.3, e.score, 1);
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <Card title={t("pg.esfuerzo")} subtitle={t("pg.esfuerzoSub")}>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl text-ink tabular">{num(e.score, 0, locale)}</span>
        {!noBase && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state === "enRango" ? "bg-good/15 text-good-ink" : state === "encima" ? "bg-warning/15 text-warning" : "bg-surface-2 text-ink-2"}`}>
          {t(`pg.${state}` as Key)}
        </span>}
      </div>
      {noBase ? (
        <p className="mt-2 text-xs text-muted">{t("pg.sinBase")}</p>
      ) : (
        <>
      {/* barra: franja del rango recomendado y la marca de esta semana */}
      <div className="relative mt-3 h-2 rounded-full bg-surface-2" aria-hidden>
        <span className="absolute inset-y-0 rounded-full bg-accent/25" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
        <span className="absolute -top-1 h-4 w-1 rounded-full bg-accent" style={{ left: `calc(${pos(e.score)} - 2px)` }} />
      </div>
      <p className="mt-2 flex justify-between text-xs text-muted">
        <span>{t("pg.rango", { a: num(lo, 0, locale), b: num(hi, 0, locale) })}</span>
        <span>{t("pg.semanaPasada", { n: num(e.lastWeek, 0, locale) })}</span>
      </p>
        </>
      )}
    </Card>
  );
}

function PredictionCard({ p, t, locale }: { p: ProgressData["prediction"]; t: T; locale: Locale }) {
  const now = p.trend.at(-1)?.sec ?? 0;
  // solo si hay datos de hace un mes (4 semanas antes): si no, sin comparación
  const monthAgo = p.trend.length >= 5 ? p.trend.at(-5)!.sec : undefined;
  const diff = monthAgo === undefined ? 0 : monthAgo - now; // > 0: más rápido
  return (
    <Card title={t("pg.prediccion")} subtitle={t("pg.prediccionSub")}>
      <p className="text-sm text-ink-2">{p.label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-4xl text-ink tabular">{fmtDuration(now)}</span>
        {Math.abs(diff) >= 5 ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${diff > 0 ? "bg-good/15 text-good-ink" : "bg-surface-2 text-ink-2"}`}>
            {diff > 0 ? "▼" : "▲"} {t(diff > 0 ? "pg.mejora" : "pg.empeora", { t: fmtDuration(Math.abs(diff)) })}
          </span>
        ) : monthAgo !== undefined ? (
          <span className="text-xs text-muted">{t("pg.igual")}</span>
        ) : null}
      </div>
      {p.trend.length >= 2 && <div className="mt-2">
        <TrendLine data={p.trend} dataKey="sec" name={p.label} format="time" invert xKey="date" height={150} locale={locale} />
      </div>}
    </Card>
  );
}

function BestCard({ best, pending, t }: { best: BestTime[]; pending: number; t: T }) {
  const [left, setLeft] = useState(pending);
  const [busy, start] = useTransition();
  const firsts = best.filter((b) => b.medal === 1);
  const load = () =>
    start(async () => {
      // de 8 en 8 hasta que no queden o Strava pida esperar
      for (let i = 0; i < 10; i++) {
        const r = await loadOldEfforts();
        setLeft(r.left);
        if (!r.done || !r.left) break;
      }
    });
  return (
    <Card title={t("pg.mejores")} subtitle={t("pg.mejoresSub")}>
      {firsts.length ? (
        <ul className="divide-y divide-line">
          {firsts.map((b) => {
            const second = best.find((x) => x.distance === b.distance && x.medal === 2);
            return (
              <li key={b.distance} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-ink">{t(`ra.d${b.distance}` as Key)}</span>
                <span className="flex items-center gap-3 text-right">
                  {second && (
                    <Link href={`/actividad/${encodeURIComponent(second.activityId)}`} className="inline-flex items-center gap-1 text-xs text-muted tabular" title={second.name}>
                      <Icon name="medal" className="h-3.5 w-3.5" />
                      {fmtDuration(second.sec)}
                    </Link>
                  )}
                  <Link href={`/actividad/${encodeURIComponent(b.activityId)}`} className="inline-flex items-center gap-1.5 font-bold text-ink tabular" title={b.name}>
                    <Icon name="trophy" className="h-4 w-4 text-accent" />
                    {fmtDuration(b.sec)}
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">{t("pg.sinMejores")}</p>
      )}
      {left > 0 && (
        <button type="button" className="btn btn-ghost mt-3 w-full" onClick={load} disabled={busy}>
          {busy ? t("pg.cargando", { n: left }) : t("pg.cargarViejas", { n: left })}
        </button>
      )}
      {left > 0 && <p className="mt-2 text-xs text-muted">{t("pg.mejoresNota")}</p>}
    </Card>
  );
}

function TargetsCard({ targets, suggested, sports, t, locale }: { targets: ProgressData["targets"]; suggested?: Target; sports: SportKind[]; t: T; locale: Locale }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addTarget, {});
  const [sugState, sugAction, sugPending] = useActionState<FormState, FormData>(() => addSuggestedTarget(), {});
  const [open, setOpen] = useState(false);
  return (
    <Card title={t("pg.objetivos")} subtitle={t("pg.objetivosSub")}>
      <ul className="space-y-3">
        {targets.map(({ target: x, done }) => {
          const pct = Math.min(100, (done / x.value) * 100);
          return (
            <li key={x.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">{targetLabel(x, t, locale)}</span>
                <form action={deleteTarget}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="text-xs text-muted hover:text-critical" aria-label={t("pg.quitar")}>
                    ✕
                  </button>
                </form>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface-2">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(pct, done ? 2 : 0)}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-2 tabular">
                {pct >= 100 ? <strong className="text-good-ink">{t("pg.conseguido")} </strong> : null}
                {num(done, 1, locale)} / {num(x.value, 1, locale)} {t(`pg.m.${x.metric}` as Key)} · {t(`pg.p.${x.period}` as Key)}
              </p>
            </li>
          );
        })}
      </ul>
      {suggested && !targets.length && (
        <form action={sugAction} className="mt-2">
          <button className="btn w-full" disabled={sugPending}>
            {t("pg.sugerido", { txt: targetLabel(suggested, t, locale) })}
          </button>
          {sugState.error && <p className="mt-1 text-sm text-critical">✕ {sugState.error}</p>}
        </form>
      )}
      {open ? (
        <form action={action} className="mt-3 grid grid-cols-2 gap-2">
          <label className="field">
            {t("pg.periodo")}
            <select className="input" name="period" defaultValue="week">
              {(["week", "month", "year"] as const).map((p) => (
                <option key={p} value={p}>{t(`pg.p.${p}` as Key)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("pg.que")}
            <select className="input" name="metric" defaultValue="km">
              {(["km", "hours", "elev", "count"] as const).map((m) => (
                <option key={m} value={m}>{t(`pg.m.${m}` as Key)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("pg.deporte")}
            <select className="input" name="sport" defaultValue={sports.includes("run") ? "run" : "all"}>
              <option value="all">{t("pg.todos")}</option>
              {sports.map((s) => (
                <option key={s} value={s}>{t(`sport.${s}` as Key)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("pg.cuanto")}
            <input className="input" name="value" inputMode="decimal" required placeholder="20" />
          </label>
          <button className="btn col-span-2" disabled={pending}>{t("pg.guardar")}</button>
          {state.error && <p className="col-span-2 text-sm text-critical">✕ {state.error}</p>}
        </form>
      ) : (
        <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => setOpen(true)}>
          {t("pg.anadir")}
        </button>
      )}
    </Card>
  );
}
