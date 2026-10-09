"use client";

import Link from "next/link";
import { useState } from "react";
import { PROFILE_TONE, type Race } from "@/lib/races";

const FILTERS = [
  { id: "all", label: "Todas", test: () => true },
  { id: "42", label: "Maratón", test: (r: Race) => r.distanceKm > 40 },
  { id: "21", label: "Media", test: (r: Race) => r.distanceKm > 19 && r.distanceKm < 25 },
  { id: "10", label: "10K", test: (r: Race) => r.distanceKm === 10 },
  { id: "5", label: "5K", test: (r: Race) => r.distanceKm === 5 },
];
const MONTHS = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function RaceList({ races }: { races: Race[] }) {
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const filter = FILTERS.find((x) => x.id === f)!;
  const shown = races.filter((r) => filter.test(r) && `${r.name} ${r.city} ${r.country}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            onClick={() => setF(x.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${f === x.id ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2 hover:bg-surface-2"}`}
          >
            {x.label}
          </button>
        ))}
        <input className="input ml-auto max-w-56" placeholder="Buscar ciudad o carrera…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/carreras/personalizada" className="flex flex-col justify-center rounded-2xl border border-dashed border-line bg-surface p-4 text-center hover:bg-surface-2">
          <span className="text-2xl">＋</span>
          <span className="font-semibold">Otra carrera</span>
          <span className="text-xs text-ink-2">Cualquier distancia, fecha y recorrido</span>
        </Link>
        {shown.map((r) => (
          <Link key={r.id} href={`/carreras/${r.id}`} className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl" aria-hidden>
                {r.flag}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROFILE_TONE[r.profile]}`}>{r.profile}</span>
            </div>
            <h3 className="mt-2 font-semibold leading-snug group-hover:text-accent">{r.name}</h3>
            <p className="text-xs text-ink-2">
              {r.city} · {r.month ? MONTHS[r.month] : "todo el año"}
            </p>
            <p className="mt-2 text-xs text-muted tabular">
              {r.distanceKm.toLocaleString("es-ES", { maximumFractionDigits: 3 })} km · +{r.elevationGainM} m · ~{r.temperatureC} °C
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
