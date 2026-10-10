"use client";

import { useState } from "react";
import { Card } from "./ui";
import { platesFor } from "@/lib/strength/workouts";

// colores de competición: el tamaño y el color ayudan a reconocer cada disco de un vistazo
const PLATE_STYLE: Record<number, { color: string; h: number }> = {
  25: { color: "#dc2626", h: 100 },
  20: { color: "#2563eb", h: 100 },
  15: { color: "#eab308", h: 88 },
  10: { color: "#16a34a", h: 76 },
  5: { color: "#e5e7eb", h: 60 },
  2.5: { color: "#dc2626", h: 48 },
  1.25: { color: "#9ca3af", h: 40 },
};
const BARS = [
  { kg: 20, label: "20 kg" },
  { kg: 15, label: "15 kg" },
  { kg: 10, label: "10 kg" },
  { kg: 7, label: "7 kg (Z)" },
];
const kg = (n: number) => n.toLocaleString("es-ES");

/** Dibujo de los discos de un lado de la barra. */
export function PlateStack({ side }: { side: number[] }) {
  return (
    <div className="flex h-16 items-center" aria-hidden>
      <span className="h-2 w-6 rounded-l bg-muted" />
      <span className="h-5 w-1.5 bg-muted" />
      {side.map((p, i) => (
        <span key={i} className="mx-px w-3 rounded-sm border border-black/20" style={{ height: `${PLATE_STYLE[p]?.h ?? 50}%`, background: PLATE_STYLE[p]?.color }} title={`${kg(p)} kg`} />
      ))}
      <span className="h-2 w-8 rounded-r bg-muted" />
    </div>
  );
}

/** Calculadora de discos: qué poner en cada lado para un peso total. */
export function PlateCalc() {
  const [total, setTotal] = useState("60");
  const [bar, setBar] = useState(20);
  const t = Number(total.replace(",", "."));
  const r = Number.isFinite(t) && t > 0 ? platesFor(t, bar) : undefined;
  return (
    <Card title="Discos para la barra" subtitle="Qué poner en cada lado para llegar a un peso">
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Peso total (kg)
          <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
        <label className="field">
          Barra
          <select className="input" value={bar} onChange={(e) => setBar(Number(e.target.value))}>
            {BARS.map((b) => (
              <option key={b.kg} value={b.kg}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {r && t >= bar ? (
        <div className="mt-4">
          <PlateStack side={r.side} />
          <p className="mt-2 text-sm">
            <strong>Por lado:</strong> {r.side.length ? r.side.map(kg).join(" + ") + " kg" : "nada, solo la barra"}
          </p>
          {r.left > 0 && <p className="mt-1 text-xs text-warning">Con discos estándar no se llega exacto: faltan {kg(r.left)} kg por lado ({kg(t - r.left * 2)} kg en total).</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-critical">El peso tiene que ser al menos el de la barra ({bar} kg).</p>
      )}
      <p className="mt-3 text-xs text-muted">Discos de 25, 20, 15, 10, 5, 2,5 y 1,25 kg.</p>
    </Card>
  );
}
