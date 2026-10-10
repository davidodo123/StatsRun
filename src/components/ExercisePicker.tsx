"use client";

import { useMemo, useState } from "react";
import { ExerciseThumb } from "./ExerciseMedia";
import { MUSCLES, MUSCLE_LABEL, canDo, type Equipment, type ExerciseSummary } from "@/lib/strength/labels";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const PAGE = 50;

/** Selector de ejercicios a pantalla completa (varios a la vez), para rutinas y entrenos. */
export function ExercisePicker({
  exercises,
  available,
  onAdd,
  onClose,
}: {
  exercises: ExerciseSummary[];
  available?: Equipment[]; // material del lugar activo: filtro activado por defecto
  onAdd: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [onlyMine, setOnlyMine] = useState(Boolean(available));
  const [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);
  const index = useMemo(() => exercises.map((x) => ({ x, key: norm(x.name) })), [exercises]);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const list = index
    .filter(({ x, key }) => words.every((w) => key.includes(w)) && (!muscle || x.muscles.includes(muscle as ExerciseSummary["muscles"][number])) && (!onlyMine || !available || canDo(x.eq, available)))
    .map(({ x }) => x);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal aria-label="Añadir ejercicios">
      <div className="space-y-2 border-b border-line p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-sm text-ink-2" onClick={onClose}>
            Cancelar
          </button>
          <strong className="text-sm">Añadir ejercicios</strong>
          <span className="w-16" />
        </div>
        <input className="input" type="search" placeholder="Buscar ejercicio…" value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} autoFocus aria-label="Buscar" />
        <div className="flex gap-2">
          <select className="input flex-1 text-sm" value={muscle} onChange={(e) => (setMuscle(e.target.value), setShown(PAGE))} aria-label="Músculo">
            <option value="">Todos los músculos</option>
            {MUSCLES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {available && (
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs has-checked:border-accent">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Mi material
            </label>
          )}
        </div>
      </div>
      <ul className="flex-1 divide-y divide-line overflow-y-auto">
        {list.slice(0, shown).map((x) => {
          const on = picked.includes(x.id);
          return (
            <li key={x.id}>
              <button type="button" onClick={() => toggle(x.id)} className={`flex w-full items-center gap-3 p-2.5 text-left ${on ? "bg-surface-2" : ""}`} aria-pressed={on}>
                <span className={`h-10 w-1 shrink-0 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                <ExerciseThumb x={x} className="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{x.name}</span>
                  <span className="block truncate text-xs text-muted">{x.muscles.map((m) => MUSCLE_LABEL[m]).join(", ")}</span>
                </span>
                {on && <span className="text-accent">✓</span>}
              </button>
            </li>
          );
        })}
        {list.length > shown && (
          <li className="p-3">
            <button type="button" className="btn btn-ghost w-full" onClick={() => setShown((n) => n + PAGE)}>
              Mostrar más ({list.length - shown})
            </button>
          </li>
        )}
        {!list.length && <li className="p-4 text-sm text-ink-2">Nada con esa búsqueda.</li>}
      </ul>
      <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" className="btn w-full" disabled={!picked.length} onClick={() => onAdd(picked)}>
          {picked.length ? `Añadir ${picked.length} ${picked.length === 1 ? "ejercicio" : "ejercicios"}` : "Elige ejercicios"}
        </button>
      </div>
    </div>
  );
}
