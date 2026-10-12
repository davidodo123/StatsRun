"use client";

import { useState } from "react";
import { bedTimes, recommendedCycles, wakeTimes, type SleepOption } from "@/lib/sleep";
import { Card } from "./ui";

const hours = (min: number) => `${(min / 60).toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`;
const now = () => new Date().toTimeString().slice(0, 5);

function Options({ list, best, label }: { list: SleepOption[]; best: number[]; label: string }) {
  if (!list.length) return null;
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={label}>
      {list.map((o) => {
        const top = best.includes(o.cycles);
        return (
          <li key={o.cycles} className={`rounded-xl border p-3 text-center ${top ? "border-accent bg-surface-2" : "border-line"}`}>
            <div className={`tabular text-2xl font-bold ${top ? "text-accent" : ""}`}>{o.time}</div>
            <div className="text-xs text-ink-2">
              {o.cycles} ciclos · {hours(o.sleepMin)}
            </div>
            {o.cycles === best[0] && <div className="mt-1 text-[11px] font-semibold text-accent">Recomendada</div>}
            {o.cycles <= 4 && <div className="mt-1 text-[11px] text-muted">Se queda corto</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Calculadora de sueño: a qué hora despertarse si te acuestas a una hora, o a qué hora acostarte para levantarte a otra. */
export function SleepCalculator({ hardTomorrow }: { hardTomorrow: boolean }) {
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const best = recommendedCycles(hardTomorrow);
  return (
    <div className="space-y-4">
      <Card title="Me acuesto a las…" subtitle="Pon la alarma a una de estas horas: te despertarás al acabar un ciclo">
        <div className="flex flex-wrap items-end gap-2">
          <label className="field">
            Hora de acostarte
            <input className="input w-36" type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => setBed(now())}>
            Ahora
          </button>
        </div>
        <Options list={wakeTimes(bed)} best={best} label="Horas para despertarse" />
      </Card>

      <Card title="Me tengo que levantar a las…" subtitle="Acuéstate a una de estas horas">
        <label className="field">
          Hora de levantarte
          <input className="input w-36" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </label>
        <Options list={bedTimes(wake)} best={best} label="Horas para acostarse" />
      </Card>

      <p className="text-xs text-muted">
        Cuenta 15 minutos para dormirte y ciclos de 90 minutos. Cada ciclo dura entre 70 y 120 minutos según la persona y la noche, así que son horas orientativas. Para
        recuperar bien del entreno, lo que más cuenta es dormir 7-9 horas.
      </p>
    </div>
  );
}
