"use client";

import { useState } from "react";
import { Card } from "./ui";
import { PlateCalc } from "./PlateCalc";
import { hrZones, raceTimeFromVdot, riegel, trainingPaces, vdotFromRace, flatEquivalentKm, heatFactor } from "@/lib/engine/physiology";
import { fmtDuration, fmtPace, fmtPaceRange, parseTime } from "@/lib/format";
import { translator, type Key, type Locale } from "@/lib/i18n";

const DISTANCES = [
  { km: 1.609, l: "calc.milla" },
  { km: 5, l: "5K" },
  { km: 10, l: "10K" },
  { km: 15, l: "15K" },
  { km: 21.0975, l: "calc.media" },
  { km: 42.195, l: "calc.maraton" },
];

export function Calculators({ locale = "es" }: { locale?: Locale }) {
  const t = translator(locale);
  // «Milla», «Media», «Maratón» van traducidas; «5K», «10K», «15K» igual en todos
  const dl = (l: string) => (l.startsWith("calc.") ? t(l as Key) : l);
  const [dist, setDist] = useState("10");
  const [time, setTime] = useState("45:00");
  const [age, setAge] = useState("35");
  const [rest, setRest] = useState("60");
  const [max, setMax] = useState("");
  const [pace, setPace] = useState("5:00");
  const [gain, setGain] = useState("300");
  const [temp, setTemp] = useState("20");

  const km = Number(dist);
  const sec = parseTime(time);
  const vdot = sec && km ? vdotFromRace(km, sec) : undefined;
  const p = vdot ? trainingPaces(vdot) : undefined;
  const hrMax = Number(max) || Math.round(208 - 0.7 * Number(age || 35));
  const zones = hrZones(hrMax, Number(rest) || 60);
  const paceSec = parseTime(pace);
  const speed = paceSec ? 3600 / paceSec : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title={t("calc.vdot")} subtitle={t("calc.vdotSub")}>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            {t("calc.distancia")}
            <select className="input" value={dist} onChange={(e) => setDist(e.target.value)}>
              {DISTANCES.map((d) => (
                <option key={d.l} value={d.km}>
                  {dl(d.l)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("calc.tiempo")}
            <input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="h:mm:ss" />
          </label>
        </div>
        {vdot && p ? (
          <>
            <p className="mt-4 text-sm text-ink-2">
              VDOT <span className="text-3xl font-bold text-ink tabular">{vdot.toFixed(1)}</span>
            </p>
            <table className="mt-3 w-full text-sm tabular">
              <tbody className="divide-y divide-line">
                {(
                  [
                    [t("calc.E"), p.easy],
                    [t("calc.M"), p.marathon],
                    [t("calc.T"), p.threshold],
                    [t("calc.I"), p.interval],
                    [t("calc.R"), p.repetition],
                  ] as const
                ).map(([l, r]) => (
                  <tr key={l}>
                    <td className="py-1.5">{l}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtPaceRange(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="mt-4 text-sm text-critical">{t("calc.tiempoMal")}</p>
        )}
      </Card>

      <Card title={t("calc.pred")} subtitle={t("calc.predSub")}>
        {vdot && sec ? (
          <table className="w-full text-sm tabular">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">{t("calc.distancia")}</th>
                <th className="pb-2 text-right font-medium">VDOT</th>
                <th className="pb-2 text-right font-medium">Riegel</th>
                <th className="pb-2 text-right font-medium">{t("calc.ritmo")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DISTANCES.map((d) => {
                const time = raceTimeFromVdot(vdot, d.km);
                return (
                  <tr key={d.l}>
                    <td className="py-1.5">{dl(d.l)}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtDuration(time)}</td>
                    <td className="py-1.5 text-right">{fmtDuration(riegel(km, sec, d.km))}</td>
                    <td className="py-1.5 text-right text-ink-2">{fmtPace(time / d.km)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ink-2">{t("calc.marcaValida")}</p>
        )}
        <p className="mt-3 text-xs text-muted">{t("calc.predNota")}</p>
      </Card>

      <Card title={t("calc.zonas")} subtitle={t("calc.zonasSub")}>
        <div className="grid grid-cols-3 gap-3">
          <label className="field">
            {t("calc.edad")}
            <input className="input" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="field">
            {t("calc.fcReposo")}
            <input className="input" type="number" value={rest} onChange={(e) => setRest(e.target.value)} />
          </label>
          <label className="field">
            {t("calc.fcMax")}
            <input className="input" type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder={String(hrMax)} />
          </label>
        </div>
        <table className="mt-3 w-full text-sm tabular">
          <tbody className="divide-y divide-line">
            {zones.map((z) => (
              <tr key={z.zone}>
                <td className="py-1.5 font-semibold">Z{z.zone}</td>
                <td className="py-1.5">{t(`zone.${z.zone}` as Key)}</td>
                <td className="py-1.5 text-right">
                  {z.min}–{z.max} {t("u.pulso")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={t("calc.recorrido")}>
        <div className="grid grid-cols-3 gap-3">
          <label className="field">
            {t("calc.ritmoMinKm")}
            <input className="input" value={pace} onChange={(e) => setPace(e.target.value)} />
          </label>
          <label className="field">
            {t("calc.desnivel")}
            <input className="input" type="number" value={gain} onChange={(e) => setGain(e.target.value)} />
          </label>
          <label className="field">
            {t("calc.temp")}
            <input className="input" type="number" value={temp} onChange={(e) => setTemp(e.target.value)} />
          </label>
        </div>
        {paceSec && speed ? (
          <ul className="mt-3 space-y-1 text-sm tabular">
            <li>
              {t("calc.velocidad")} <strong>{speed.toFixed(2)} km/h</strong> · {fmtPace(paceSec * 1.60934)} {t("calc.milla2")}
            </li>
            {DISTANCES.slice(1).map((d) => {
              const f = (flatEquivalentKm(d.km, Number(gain) * (d.km / 42.195)) / d.km) * heatFactor(Number(temp), d.km);
              return (
                <li key={d.l} className="text-ink-2">
                  {dl(d.l)}: <strong className="text-ink">{fmtDuration(paceSec * d.km)}</strong> {t("calc.llano")} · {fmtDuration(paceSec * d.km * f)} {t("calc.conDesnivel")}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-critical">{t("calc.ritmoMal")}</p>
        )}
        <p className="mt-3 text-xs text-muted">{t("calc.desnivelNota")}</p>
      </Card>

      <PlateCalc locale={locale} />
    </div>
  );
}
