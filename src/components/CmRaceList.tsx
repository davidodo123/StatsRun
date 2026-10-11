"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isRunning, type CmRace } from "@/lib/cruzandolameta";
import { fmtKm } from "@/lib/format";
import { WEEKDAYS, shortDate, weekday } from "@/lib/dates";

/** Próximas carreras de Cruzando la Meta, con filtro por provincia y por si son a pie. */
export function CmRaceList({ races }: { races: CmRace[] }) {
  const [province, setProvince] = useState("");
  const [all, setAll] = useState(false);
  const [shown, setShown] = useState(12);
  const provinces = useMemo(() => [...new Set(races.map((r) => r.province).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, "es")), [races]);
  const list = races.filter((r) => (all || isRunning(r)) && (!province || r.province === province));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="select-chip text-sm" value={province} onChange={(e) => (setProvince(e.target.value), setShown(12))} aria-label="Provincia">
          <option value="">Todas las provincias</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[var(--accent)]" />
          Ver también bici, natación, triatlón e infantiles
        </label>
      </div>
      {list.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, shown).map((r) => (
            <li key={r.id}>
              <Link href={`/carreras/cm/${r.id}`} className="flex h-full gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-accent">
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- cartel de su web, sin optimizar
                  <img src={r.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-24 w-20 shrink-0 rounded-lg bg-surface-2 object-cover" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-accent">
                    {WEEKDAYS[weekday(r.date)].slice(0, 3)} {shortDate(r.date)}
                    {r.time ? ` · ${r.time}` : ""}
                  </span>
                  <strong className="mt-0.5 line-clamp-2 block text-sm leading-snug">{r.name}</strong>
                  <span className="mt-1 block truncate text-xs text-ink-2">{r.place}</span>
                  <span className="block truncate text-xs text-muted">
                    {r.distancesKm.length ? r.distancesKm.map((d) => `${fmtKm(d, d % 1 ? 1 : 0)} km`).join(" · ") : r.distanceText}
                    {r.type ? ` · ${r.type}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">No hay carreras con ese filtro.</p>
      )}
      {list.length > shown && (
        <button type="button" className="btn btn-ghost w-full" onClick={() => setShown((n) => n + 12)}>
          Ver más ({list.length - shown})
        </button>
      )}
    </div>
  );
}
