"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseThumb } from "./ExerciseMedia";
import { CATEGORIES, EQUIPMENT, MUSCLES, MUSCLE_LABEL, canDo, type Equipment, type ExerciseSummary } from "@/lib/strength/labels";
import type { GymPlace } from "@/lib/types";

export interface BrowserFilters {
  q: string;
  muscle: string;
  cat: string; // "" | categoría | "propios"
  place: string; // "" = cualquier material | id de lugar
  eq: string; // "" | material concreto
}

const PAGE = 40;
// sin tildes ni mayúsculas: «sentadilla bulgara» encuentra «Sentadilla búlgara»
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Lista de ejercicios con búsqueda y filtros (los filtros se guardan en la URL para volver atrás sin perderlos). */
export function ExerciseBrowser({ exercises, places, initial }: { exercises: ExerciseSummary[]; places: GymPlace[]; initial: BrowserFilters }) {
  const [f, setF] = useState(initial);
  const [shown, setShown] = useState(PAGE);
  const index = useMemo(() => exercises.map((x) => ({ x, key: norm(x.name) })), [exercises]);

  const set = (patch: Partial<BrowserFilters>) => {
    const next = { ...f, ...patch };
    setF(next);
    setShown(PAGE);
    const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    if (!next.place) params.set("place", "todo");
    window.history.replaceState(null, "", `?${params}`);
  };

  const available = places.find((p) => p.id === f.place)?.equipment;
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  const list = index
    .filter(
      ({ x, key }) =>
        words.every((w) => key.includes(w)) &&
        (!f.muscle || x.muscles.includes(f.muscle as ExerciseSummary["muscles"][number])) &&
        (!f.cat || (f.cat === "propios" ? x.custom : x.cat === f.cat)) &&
        (!available || canDo(x.eq, available)) &&
        (!f.eq || x.eq.includes(f.eq as Equipment)),
    )
    .map(({ x }) => x);

  return (
    <div className="space-y-3">
      <input className="input" type="search" placeholder="Buscar ejercicio…" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Buscar ejercicio" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <select className="input text-sm" value={f.muscle} onChange={(e) => set({ muscle: e.target.value })} aria-label="Músculo">
          <option value="">Músculo: todos</option>
          {MUSCLES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select className="input text-sm" value={f.cat} onChange={(e) => set({ cat: e.target.value })} aria-label="Tipo">
          <option value="">Tipo: todos</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="propios">Mis ejercicios</option>
        </select>
        <select className="input text-sm" value={f.place} onChange={(e) => set({ place: e.target.value })} aria-label="Lugar">
          <option value="">Lugar: cualquiera</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              En {p.name}
            </option>
          ))}
        </select>
        <select className="input text-sm" value={f.eq} onChange={(e) => set({ eq: e.target.value })} aria-label="Material">
          <option value="">Material: todo</option>
          {EQUIPMENT.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted">
        {list.length} {list.length === 1 ? "ejercicio" : "ejercicios"}
        {available && ` que puedes hacer en ${places.find((p) => p.id === f.place)?.name}`}
      </p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {list.slice(0, shown).map((x) => (
          <li key={x.id}>
            <Link href={`/fuerza/ejercicios/${x.id}`} className="flex items-center gap-3 p-2.5 hover:bg-surface-2">
              <ExerciseThumb x={x} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {x.name}
                  {x.custom && <span className="ml-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">Propio</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  {x.muscles.map((m) => MUSCLE_LABEL[m]).join(", ")} · {x.eq.map((e) => EQUIPMENT.find((q) => q.id === e)?.icon).join(" ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {!list.length && <li className="p-4 text-sm text-ink-2">Ningún ejercicio con estos filtros.</li>}
      </ul>
      {list.length > shown && (
        <button type="button" className="btn btn-ghost w-full" onClick={() => setShown((n) => n + PAGE)}>
          Mostrar más ({list.length - shown})
        </button>
      )}
    </div>
  );
}
