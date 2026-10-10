"use client";

import { useState } from "react";
import { Card } from "./ui";
import { PlateCalc } from "./PlateCalc";
import { hrZones, raceTimeFromVdot, riegel, trainingPaces, vdotFromRace, flatEquivalentKm, heatFactor } from "@/lib/engine/physiology";
import { fmtDuration, fmtPace, fmtPaceRange, parseTime } from "@/lib/format";

const DISTANCES = [
  { km: 1.609, l: "Milla" },
  { km: 5, l: "5K" },
  { km: 10, l: "10K" },
  { km: 15, l: "15K" },
  { km: 21.0975, l: "Media" },
  { km: 42.195, l: "Maratón" },
];

export function Calculators() {
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
      <Card title="VDOT y ritmos" subtitle="Introduce una marca reciente (Jack Daniels)">
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Distancia
            <select className="input" value={dist} onChange={(e) => setDist(e.target.value)}>
              {DISTANCES.map((d) => (
                <option key={d.l} value={d.km}>
                  {d.l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tiempo
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
                    ["E · Suave", p.easy],
                    ["M · Maratón", p.marathon],
                    ["T · Umbral", p.threshold],
                    ["I · Intervalos", p.interval],
                    ["R · Repeticiones", p.repetition],
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
          <p className="mt-4 text-sm text-critical">Formato de tiempo no válido.</p>
        )}
      </Card>

      <Card title="Predicción de marcas" subtitle="Con el mismo VDOT y con la fórmula de Riegel">
        {vdot && sec ? (
          <table className="w-full text-sm tabular">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Distancia</th>
                <th className="pb-2 text-right font-medium">VDOT</th>
                <th className="pb-2 text-right font-medium">Riegel</th>
                <th className="pb-2 text-right font-medium">Ritmo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DISTANCES.map((d) => {
                const t = raceTimeFromVdot(vdot, d.km);
                return (
                  <tr key={d.l}>
                    <td className="py-1.5">{d.l}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtDuration(t)}</td>
                    <td className="py-1.5 text-right">{fmtDuration(riegel(km, sec, d.km))}</td>
                    <td className="py-1.5 text-right text-ink-2">{fmtPace(t / d.km)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ink-2">Introduce una marca válida.</p>
        )}
        <p className="mt-3 text-xs text-muted">Las predicciones largas asumen que has hecho el volumen de entrenamiento adecuado para la distancia.</p>
      </Card>

      <Card title="Zonas de frecuencia cardiaca" subtitle="Método Karvonen (FC de reserva)">
        <div className="grid grid-cols-3 gap-3">
          <label className="field">
            Edad
            <input className="input" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="field">
            FC reposo
            <input className="input" type="number" value={rest} onChange={(e) => setRest(e.target.value)} />
          </label>
          <label className="field">
            FC máx
            <input className="input" type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder={String(hrMax)} />
          </label>
        </div>
        <table className="mt-3 w-full text-sm tabular">
          <tbody className="divide-y divide-line">
            {zones.map((z) => (
              <tr key={z.zone}>
                <td className="py-1.5 font-semibold">Z{z.zone}</td>
                <td className="py-1.5">{z.name}</td>
                <td className="py-1.5 text-right">
                  {z.min}–{z.max} ppm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Ritmo, velocidad y efecto del recorrido">
        <div className="grid grid-cols-3 gap-3">
          <label className="field">
            Ritmo (min/km)
            <input className="input" value={pace} onChange={(e) => setPace(e.target.value)} />
          </label>
          <label className="field">
            Desnivel + (m)
            <input className="input" type="number" value={gain} onChange={(e) => setGain(e.target.value)} />
          </label>
          <label className="field">
            Temperatura (°C)
            <input className="input" type="number" value={temp} onChange={(e) => setTemp(e.target.value)} />
          </label>
        </div>
        {paceSec && speed ? (
          <ul className="mt-3 space-y-1 text-sm tabular">
            <li>
              Velocidad: <strong>{speed.toFixed(2)} km/h</strong> · {fmtPace(paceSec * 1.60934)} /milla
            </li>
            {DISTANCES.slice(1).map((d) => {
              const f = (flatEquivalentKm(d.km, Number(gain) * (d.km / 42.195)) / d.km) * heatFactor(Number(temp), d.km);
              return (
                <li key={d.l} className="text-ink-2">
                  {d.l}: <strong className="text-ink">{fmtDuration(paceSec * d.km)}</strong> en llano · {fmtDuration(paceSec * d.km * f)} con desnivel y calor
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-critical">Ritmo no válido.</p>
        )}
        <p className="mt-3 text-xs text-muted">El desnivel indicado se refiere a un maratón y se escala para cada distancia.</p>
      </Card>

      <PlateCalc />
    </div>
  );
}
