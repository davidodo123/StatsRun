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
import { translator, type Key, type Locale } from "@/lib/i18n";

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
  notes: string;
  linkNext: boolean; // en superserie con el siguiente
}

const toRow = (s: RoutineSet): Row => ({ type: s.type ?? "normal", kg: s.kg?.toString() ?? "", reps: s.reps?.toString() ?? "" });
let keySeq = 0;

/** Crear o editar una rutina: ejercicios con sus series (kg y repeticiones) y el descanso. */
export function RoutineEditor({ routine, custom, available, folders = [], locale }: { routine?: Routine; custom: ExerciseSummary[]; available?: Equipment[]; folders?: string[]; locale: Locale }) {
  const t = translator(locale);
  const exercises = useMemo(() => withCustom(custom), [custom]);
  const byId = useMemo(() => new Map(exercises.map((x) => [x.id, x])), [exercises]);
  const [name, setName] = useState(routine?.name ?? "");
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [folder, setFolder] = useState(routine?.folder ?? "");
  const [items, setItems] = useState<Item[]>(
    () =>
      routine?.exercises.map((e, i, all) => ({
        key: keySeq++,
        exerciseId: e.exerciseId,
        restSec: e.restSec ?? 90,
        bw: Boolean(e.bw),
        sets: e.sets.map(toRow),
        notes: e.notes ?? "",
        linkNext: Boolean(e.superset && all[i + 1]?.superset === e.superset),
      })) ?? [],
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
  // nº de superserie de cada ejercicio: los enlazados seguidos comparten número
  const group: (number | undefined)[] = [];
  items.forEach((it, i) => {
    const prev = items[i - 1];
    group.push(prev?.linkNext ? group[i - 1] : it.linkNext && i < items.length - 1 ? i + 1 : undefined);
  });
  const save = () =>
    start(async () => {
      const res = await saveRoutine({
        id: routine?.id,
        name,
        notes,
        folder,
        exercises: items.map((it, i) => ({ exerciseId: it.exerciseId, restSec: it.restSec, bw: it.bw, sets: it.sets, notes: it.notes, superset: group[i] })),
      });
      if (res?.error) setError(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={routine ? `/fuerza/rutinas/${routine.id}` : "/fuerza"} className="text-sm text-ink-2">
          {t("re.cancelar")}
        </Link>
        <strong>{routine ? t("re.editar") : t("re.nueva")}</strong>
        <button type="button" className="btn px-4 py-1.5" onClick={save} disabled={pending}>
          {pending ? t("wl.guardando") : t("re.guardar")}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
      <input className="input text-lg font-semibold" placeholder={t("re.nombrePh")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label={t("re.nombrePh")} />
      <textarea className="input min-h-16 text-sm" placeholder={t("re.notasPh")} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} aria-label={t("re.notasAria")} />
      <label className="flex items-center gap-2">
        <Icon name="folder" className="h-4 w-4 text-muted" />
        <input className="input text-sm" list="carpetas" placeholder={t("re.carpetaPh")} value={folder} onChange={(e) => setFolder(e.target.value)} maxLength={30} aria-label={t("re.carpetaAria")} />
        <datalist id="carpetas">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>

      {items.map((it, i) => {
        const x = byId.get(it.exerciseId);
        const inSet = group[i] !== undefined;
        const last = i === items.length - 1;
        return (
          <div key={it.key}>
            <section className={`rounded-2xl border bg-surface p-3 ${inSet ? "border-accent" : "border-line"}`}>
              <div className="flex items-center gap-3">
                {x && <ExerciseThumb x={x} className="h-11 w-11" />}
                <strong className="min-w-0 flex-1 truncate text-accent">{x?.name ?? it.exerciseId}</strong>
                <button type="button" className="px-1 text-muted disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("re.subir")}>
                  ↑
                </button>
                <button type="button" className="px-1 text-muted disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={t("re.bajar")}>
                  ↓
                </button>
                <button type="button" className="px-1 text-muted hover:text-critical" onClick={() => setItems((l) => l.filter((y) => y.key !== it.key))} aria-label={t("wl.quitarEjercicio")}>
                  ✕
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RestChip locale={locale} value={it.restSec} onChange={(restSec) => update(it.key, (y) => ({ ...y, restSec }))} />
                <LoadSwitch locale={locale} bw={it.bw} onChange={(bw) => update(it.key, (y) => ({ ...y, bw }))} />
              </div>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="w-14 py-1 text-left font-medium">{t("tab.serie")}</th>
                    {it.bw && <th className="w-16 py-1 font-medium">{t("tab.peso")}</th>}
                    <th className="py-1 font-medium">{it.bw ? t("tab.lastre") : t("tab.kg")}</th>
                    <th className="py-1 font-medium">{t("tab.reps")}</th>
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
                          <SetBadge locale={locale} type={s.type} n={n} onClick={() => setRow({ type: SET_TYPES[(SET_TYPES.indexOf(s.type) + 1) % SET_TYPES.length] })} />
                        </td>
                        {it.bw && (
                          <td className="px-1 py-1">
                            <BodyChip locale={locale} />
                          </td>
                        )}
                        <td className="px-1 py-1">
                          <input className="input py-1.5 text-center" inputMode="decimal" placeholder={it.bw ? "+0" : "–"} value={s.kg} onChange={(e) => setRow({ kg: e.target.value })} aria-label={t(it.bw ? "wl.lastreSerie" : "wl.kgSerie", { n: j + 1 })} />
                        </td>
                        <td className="px-1 py-1">
                          <input className="input py-1.5 text-center" inputMode="numeric" placeholder="–" value={s.reps} onChange={(e) => setRow({ reps: e.target.value })} aria-label={t("wl.repsSerie", { n: j + 1 })} />
                        </td>
                        <td className="text-center">
                          <button type="button" className="text-muted hover:text-critical disabled:opacity-30" disabled={it.sets.length === 1} onClick={() => update(it.key, (y) => ({ ...y, sets: y.sets.filter((_, k) => k !== j) }))} aria-label={t("re.quitarSerie")}>
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
                {t("wl.anadirSerie")}
              </button>
              <input className="input mt-2 py-1.5 text-sm" placeholder={t("re.notaEjPh")} value={it.notes} onChange={(e) => update(it.key, (y) => ({ ...y, notes: e.target.value }))} maxLength={200} aria-label={t("wl.notaAria")} />
            </section>
            {!last && (
              <div className="flex justify-center py-1.5">
                <button
                  type="button"
                  onClick={() => update(it.key, (y) => ({ ...y, linkNext: !y.linkNext }))}
                  aria-pressed={it.linkNext}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${it.linkNext ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
                >
                  <Icon name="link" className="h-3.5 w-3.5" />
                  {it.linkNext ? t("re.enSuperserie") : t("re.hacerSuperserie")}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className="btn w-full" onClick={() => setPicking(true)}>
        {t("wl.anadirEjercicio")}
      </button>
      <p className="text-center text-xs text-muted">{t("re.ayuda", { c: t("set.c"), d: t("set.d"), f: t("set.f") })}</p>

      {picking && (
        <ExercisePicker
          locale={locale}
          exercises={exercises}
          available={available}
          onClose={() => setPicking(false)}
          onAdd={(ids) => {
            setItems((l) => [...l, ...ids.map((exerciseId) => ({ key: keySeq++, exerciseId, restSec: 90, bw: onlyBody(byId.get(exerciseId)), sets: [0, 1, 2].map(() => ({ type: "normal" as SetType, kg: "", reps: "" })), notes: "", linkNext: false }))]);
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
export function LoadSwitch({ bw, onChange, locale = "es" }: { bw: boolean; onChange: (bw: boolean) => void; locale?: Locale }) {
  const t = translator(locale);
  const opt = (on: boolean, label: string, value: boolean) => (
    <button type="button" onClick={() => onChange(value)} aria-pressed={on} className={`rounded-full px-3 py-1 font-semibold transition ${on ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink"}`}>
      {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-2 p-0.5 text-xs" role="group" aria-label={t("re.tipoCarga")}>
      {opt(!bw, t("re.kg"), false)}
      {opt(bw, t("re.pesoCorporal"), true)}
    </div>
  );
}

/** Descanso entre series: chip que abre un panel con las opciones (el desplegable nativo no se puede estilizar). */
function RestChip({ value, onChange, locale }: { value: number; onChange: (sec: number) => void; locale: Locale }) {
  const t = translator(locale);
  const label = (s: number) => restLabel(s, t("re.sinDescanso"));
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("re.descansoAria")}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-accent"
      >
        <Icon name="timer" className="h-3.5 w-3.5" /> {label(value)}
        <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          {/* capa invisible: tocar fuera cierra */}
          <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label={t("re.cerrar")} tabIndex={-1} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl" role="listbox" aria-label={t("re.descanso")}>
            <p className="mb-2 text-xs font-semibold text-muted">{t("re.descansoAria")}</p>
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
                  {label(s)}
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
export function BodyChip({ kg, locale = "es" }: { kg?: number; locale?: Locale }) {
  const t = translator(locale);
  return (
    <span className="block rounded-lg border border-dashed border-line py-1.5 text-center text-xs font-semibold leading-tight text-ink-2" title={t("re.pcTitle")}>
      {t("re.pc")}
      {kg ? <span className="block text-[10px] font-normal text-muted">{kg} kg</span> : null}
    </span>
  );
}

const BADGE: Record<SetType, string> = { normal: "", calentamiento: "text-warning", descendente: "text-s2", fallo: "text-critical" };

/** Número de serie (o C/D/F según el tipo); al tocarlo cambia de tipo. */
export function SetBadge({ type, n, onClick, locale = "es" }: { type: SetType; n: number; onClick?: () => void; locale?: Locale }) {
  const t = translator(locale);
  const short = type === "normal" ? "" : t(`set.${SET_TYPE_SHORT[type].toLowerCase()}` as Key);
  return (
    <button type="button" onClick={onClick} className={`w-10 rounded-md py-1 text-center font-bold ${BADGE[type]} ${onClick ? "hover:bg-surface-2" : ""}`} aria-label={t("re.serieTipo", { tipo: short || n })}>
      {short || n}
    </button>
  );
}
