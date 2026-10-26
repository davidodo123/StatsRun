"use client";

import { useMemo, useState } from "react";
import { ExerciseThumb } from "./ExerciseMedia";
import { MUSCLES, canDo, type Equipment, type ExerciseSummary } from "@/lib/strength/labels";
import { translator, type Key, type Locale } from "@/lib/i18n";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const PAGE = 50;

/** Selector de ejercicios a pantalla completa (varios a la vez), para rutinas y entrenos. */
export function ExercisePicker({
  exercises,
  available,
  onAdd,
  onClose,
  locale = "es",
}: {
  exercises: ExerciseSummary[];
  available?: Equipment[]; // material del lugar activo: filtro activado por defecto
  onAdd: (ids: string[]) => void;
  onClose: () => void;
  locale?: Locale;
}) {
  const t = translator(locale);
  const muscleName = (m: string) => t(`musculo.${m}` as Key);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  // apagado de inicio: con él encendido «desaparecían» los ejercicios que tu lugar no tiene
  const [onlyMine, setOnlyMine] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);
  const index = useMemo(() => exercises.map((x) => ({ x, key: norm(x.name) })), [exercises]);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const matching = index.filter(({ x, key }) => words.every((w) => key.includes(w)) && (!muscle || x.muscles.includes(muscle as ExerciseSummary["muscles"][number])));
  const list = matching.filter(({ x }) => !onlyMine || !available || canDo(x.eq, available)).map(({ x }) => x);
  const hidden = matching.length - list.length;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal aria-label={t("ep.titulo")}>
      <div className="space-y-2 border-b border-line p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-sm text-ink-2" onClick={onClose}>
            {t("re.cancelar")}
          </button>
          <strong className="text-sm">{t("ep.titulo")}</strong>
          <span className="w-16" />
        </div>
        <input className="input" type="search" placeholder={t("eb.buscar")} value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} autoFocus aria-label={t("ep.buscar")} />
        <div className="flex gap-2">
          <select className="input flex-1 text-sm" value={muscle} onChange={(e) => (setMuscle(e.target.value), setShown(PAGE))} aria-label={t("eb.musculo")}>
            <option value="">{t("ep.todos")}</option>
            {MUSCLES.map((m) => (
              <option key={m.id} value={m.id}>
                {muscleName(m.id)}
              </option>
            ))}
          </select>
          {available && (
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs has-checked:border-accent">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              {t("ep.miMaterial")}
            </label>
          )}
        </div>
      </div>
      {hidden > 0 && (
        <button type="button" onClick={() => setOnlyMine(false)} className="border-b border-line bg-surface-2 px-3 py-2 text-left text-xs text-ink-2">
          {t("ep.ocultos", { n: hidden })} <span className="font-semibold text-accent">{t("ep.verTodos")}</span>
        </button>
      )}
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
                  <span className="block truncate text-xs text-muted">{x.muscles.map(muscleName).join(", ")}</span>
                </span>
                {on && <span className="text-accent">✓</span>}
              </button>
            </li>
          );
        })}
        {list.length > shown && (
          <li className="p-3">
            <button type="button" className="btn btn-ghost w-full" onClick={() => setShown((n) => n + PAGE)}>
              {t("eb.mostrarMas", { n: list.length - shown })}
            </button>
          </li>
        )}
        {!list.length && <li className="p-4 text-sm text-ink-2">{t("ep.nada")}</li>}
      </ul>
      <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" className="btn w-full" disabled={!picked.length} onClick={() => onAdd(picked)}>
          {picked.length === 1 ? t("ep.anadir1") : picked.length ? t("ep.anadirN", { n: picked.length }) : t("ep.elige")}
        </button>
      </div>
    </div>
  );
}
