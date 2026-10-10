"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseMedia";
import { saveRoutine } from "@/app/strength-actions";
import { withCustom } from "@/lib/strength/exerciseList";
import type { Equipment, ExerciseSummary } from "@/lib/strength/labels";
import { REST_OPTIONS, SET_TYPES, SET_TYPE_SHORT, restLabel } from "@/lib/strength/workouts";
import type { Routine, RoutineSet, SetType } from "@/lib/types";
import { Icon } from "./icons";

interface Row {
  type: SetType;
  kg: string;
  reps: string;
}
interface Item {
  key: number;
  exerciseId: string;
  restSec: number;
  bw: boolean; // con peso corporal (los kg son lastre)
  sets: Row[];
}

const toRow = (s: RoutineSet): Row => ({ type: s.type ?? "normal", kg: s.kg?.toString() ?? "", reps: s.reps?.toString() ?? "" });
let keySeq = 0;

/** Crear o editar una rutina: ejercicios con sus series (kg y repeticiones) y el descanso. */
export function RoutineEditor({ routine, custom, available }: { routine?: Routine; custom: ExerciseSummary[]; available?: Equipment[] }) {
  const exercises = useMemo(() => withCustom(custom), [custom]);
  const byId = useMemo(() => new Map(exercises.map((x) => [x.id, x])), [exercises]);
  const [name, setName] = useState(routine?.name ?? "");
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [items, setItems] = useState<Item[]>(
    () => routine?.exercises.map((e) => ({ key: keySeq++, exerciseId: e.exerciseId, restSec: e.restSec ?? 90, bw: Boolean(e.bw), sets: e.sets.map(toRow) })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const update = (key: number, fn: (it: Item) => Item) => setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));
  const move = (i: number, d: number) =>
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const save = () =>
    start(async () => {
      const res = await saveRoutine({
        id: routine?.id,
        name,
        notes,
        exercises: items.map((it) => ({ exerciseId: it.exerciseId, restSec: it.restSec, bw: it.bw, sets: it.sets })),
      });
      if (res?.error) setError(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={routine ? `/fuerza/rutinas/${routine.id}` : "/fuerza"} className="text-sm text-ink-2">
          Cancelar
        </Link>
        <strong>{routine ? "Editar rutina" : "Nueva rutina"}</strong>
        <button type="button" className="btn px-4 py-1.5" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
      <input className="input text-lg font-semibold" placeholder="Nombre de la rutina" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Nombre de la rutina" />
      <textarea className="input min-h-16 text-sm" placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} aria-label="Notas" />

      {items.map((it, i) => {
        const x = byId.get(it.exerciseId);
        return (
          <section key={it.key} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center gap-3">
              {x && <ExerciseThumb x={x} className="h-11 w-11" />}
              <strong className="min-w-0 flex-1 truncate text-accent">{x?.name ?? it.exerciseId}</strong>
              <button type="button" className="px-1 text-muted disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                ↑
              </button>
              <button type="button" className="px-1 text-muted disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar">
                ↓
              </button>
              <button type="button" className="px-1 text-muted hover:text-critical" onClick={() => setItems((l) => l.filter((y) => y.key !== it.key))} aria-label="Quitar ejercicio">
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RestChip value={it.restSec} onChange={(restSec) => update(it.key, (y) => ({ ...y, restSec }))} />
              <LoadSwitch bw={it.bw} onChange={(bw) => update(it.key, (y) => ({ ...y, bw }))} />
            </div>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="w-14 py-1 text-left font-medium">SERIE</th>
                  {it.bw && <th className="w-16 py-1 font-medium">PESO</th>}
                  <th className="py-1 font-medium">{it.bw ? "LASTRE" : "KG"}</th>
                  <th className="py-1 font-medium">REPS</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {it.sets.map((s, j) => {
                  const n = it.sets.slice(0, j + 1).filter((y) => y.type !== "calentamiento").length;
                  const setRow = (patch: Partial<Row>) => update(it.key, (y) => ({ ...y, sets: y.sets.map((r, k) => (k === j ? { ...r, ...patch } : r)) }));
                  return (
                    <tr key={j} className={j % 2 ? "bg-surface-2" : ""}>
                      <td className="py-1">
                        <SetBadge type={s.type} n={n} onClick={() => setRow({ type: SET_TYPES[(SET_TYPES.indexOf(s.type) + 1) % SET_TYPES.length] })} />
                      </td>
                      {it.bw && (
                        <td className="px-1 py-1">
                          <BodyChip />
                        </td>
                      )}
                      <td className="px-1 py-1">
                        <input className="input py-1.5 text-center" inputMode="decimal" placeholder={it.bw ? "+0" : "–"} value={s.kg} onChange={(e) => setRow({ kg: e.target.value })} aria-label={`${it.bw ? "Lastre" : "Kg"} serie ${j + 1}`} />
                      </td>
                      <td className="px-1 py-1">
                        <input className="input py-1.5 text-center" inputMode="numeric" placeholder="–" value={s.reps} onChange={(e) => setRow({ reps: e.target.value })} aria-label={`Repeticiones serie ${j + 1}`} />
                      </td>
                      <td className="text-center">
                        <button type="button" className="text-muted hover:text-critical disabled:opacity-30" disabled={it.sets.length === 1} onClick={() => update(it.key, (y) => ({ ...y, sets: y.sets.filter((_, k) => k !== j) }))} aria-label="Quitar serie">
                          −
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              type="button"
              className="btn btn-ghost mt-2 w-full py-1.5 text-sm"
              onClick={() => update(it.key, (y) => ({ ...y, sets: [...y.sets, { ...(y.sets.at(-1) ?? { kg: "", reps: "" }), type: "normal" }] }))}
            >
              + Añadir serie
            </button>
          </section>
        );
      })}

      <button type="button" className="btn w-full" onClick={() => setPicking(true)}>
        + Añadir ejercicio
      </button>
      <p className="text-center text-xs text-muted">Toca el número de serie para marcarla como calentamiento (C), descendente (D) o al fallo (F).</p>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          available={available}
          onClose={() => setPicking(false)}
          onAdd={(ids) => {
            setItems((l) => [...l, ...ids.map((exerciseId) => ({ key: keySeq++, exerciseId, restSec: 90, bw: onlyBody(byId.get(exerciseId)), sets: [0, 1, 2].map(() => ({ type: "normal" as SetType, kg: "", reps: "" })) }))]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

/** Ejercicios que solo usan el cuerpo (flexiones, dominadas…): empiezan con peso corporal. */
export const onlyBody = (x?: ExerciseSummary) => Boolean(x?.eq.every((e) => e === "corporal" || e === "dominadas" || e === "banco" || e === "cajon"));

/** Carga en kg o con el peso corporal (más lastre opcional): control segmentado. */
export function LoadSwitch({ bw, onChange }: { bw: boolean; onChange: (bw: boolean) => void }) {
  const opt = (on: boolean, label: string, value: boolean) => (
    <button type="button" onClick={() => onChange(value)} aria-pressed={on} className={`rounded-full px-3 py-1 font-semibold transition ${on ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink"}`}>
      {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-2 p-0.5 text-xs" role="group" aria-label="Tipo de carga">
      {opt(!bw, "Kg", false)}
      {opt(bw, "Peso corporal", true)}
    </div>
  );
}

/** Descanso entre series: chip que abre un panel con las opciones (el desplegable nativo no se puede estilizar). */
export function RestChip({ value, onChange }: { value: number; onChange: (sec: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Descanso entre series"
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-accent"
      >
        <Icon name="timer" className="h-3.5 w-3.5" /> {restLabel(value)}
        <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          {/* capa invisible: tocar fuera cierra */}
          <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar" tabIndex={-1} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl" role="listbox" aria-label="Descanso">
            <p className="mb-2 text-xs font-semibold text-muted">Descanso entre series</p>
            <div className="grid grid-cols-3 gap-1.5">
              {REST_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={s === value}
                  onClick={() => (onChange(s), setOpen(false))}
                  className={`rounded-lg px-1 py-2 text-xs font-semibold ${s === value ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink hover:bg-line"} ${s === 0 ? "col-span-3" : ""}`}
                >
                  {restLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Celda fija «PC»: el peso corporal (sale del perfil). */
export function BodyChip({ kg }: { kg?: number }) {
  return (
    <span className="block rounded-lg border border-dashed border-line py-1.5 text-center text-xs font-semibold leading-tight text-ink-2" title="Peso corporal del perfil">
      PC
      {kg ? <span className="block text-[10px] font-normal text-muted">{kg} kg</span> : null}
    </span>
  );
}

const BADGE: Record<SetType, string> = { normal: "", calentamiento: "text-warning", descendente: "text-s2", fallo: "text-critical" };

/** Número de serie (o C/D/F según el tipo); al tocarlo cambia de tipo. */
export function SetBadge({ type, n, onClick }: { type: SetType; n: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`w-10 rounded-md py-1 text-center font-bold ${BADGE[type]} ${onClick ? "hover:bg-surface-2" : ""}`} aria-label={`Serie ${type}`}>
      {SET_TYPE_SHORT[type] || n}
    </button>
  );
}
