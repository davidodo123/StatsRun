"use client";

import { useState } from "react";
import { bedTimes, recommendedCycles, wakeTimes, type SleepOption } from "@/lib/sleep";
import { Card } from "./ui";
import { intlLocale, translator, type Locale, type T } from "@/lib/i18n";

const now = () => new Date().toTimeString().slice(0, 5);

function Options({ list, best, label, t, locale }: { list: SleepOption[]; best: number[]; label: string; t: T; locale: Locale }) {
  const hours = (min: number) => `${(min / 60).toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })} h`;
  if (!list.length) return null;
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={label}>
      {list.map((o) => {
        const top = best.includes(o.cycles);
        return (
          <li key={o.cycles} className={`rounded-xl border p-3 text-center ${top ? "border-accent bg-surface-2" : "border-line"}`}>
            <div className={`tabular text-2xl font-bold ${top ? "text-accent" : ""}`}>{o.time}</div>
            <div className="text-xs text-ink-2">
              {t("sue.ciclos", { n: o.cycles, h: hours(o.sleepMin) })}
            </div>
            {o.cycles === best[0] && <div className="mt-1 text-[11px] font-semibold text-accent">{t("sue.recomendada")}</div>}
            {o.cycles <= 4 && <div className="mt-1 text-[11px] text-muted">{t("sue.corto")}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Calculadora de sueño: a qué hora despertarse si te acuestas a una hora, o a qué hora acostarte para levantarte a otra. */
export function SleepCalculator({ hardTomorrow, locale = "es" }: { hardTomorrow: boolean; locale?: Locale }) {
  const t = translator(locale);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const best = recommendedCycles(hardTomorrow);
  return (
    <div className="space-y-4">
      <Card title={t("sue.meAcuesto")} subtitle={t("sue.meAcuestoSub")}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="field">
            {t("sue.horaAcostarte")}
            <input className="input w-36" type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => setBed(now())}>
            {t("sue.ahora")}
          </button>
        </div>
        <Options list={wakeTimes(bed)} best={best} label={t("sue.horasDespertar")} t={t} locale={locale} />
      </Card>

      <Card title={t("sue.meLevanto")} subtitle={t("sue.meLevantoSub")}>
        <label className="field">
          {t("sue.horaLevantarte")}
          <input className="input w-36" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </label>
        <Options list={bedTimes(wake)} best={best} label={t("sue.horasAcostarse")} t={t} locale={locale} />
      </Card>

      <p className="text-xs text-muted">
        {t("sue.nota")}
      </p>
    </div>
  );
}
