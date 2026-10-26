"use client";

import { useActionState, useRef, useState } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import { focusOf, type Focus, type Profile } from "@/lib/types";
import { availableDaysOf } from "@/lib/engine/planner";
import { intlLocale, translator, weekdayInitials, type Key, type Locale } from "@/lib/i18n";
import { keepForm } from "./keepForm";

type T = ReturnType<typeof translator>;

function fmtT(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const LEVELS = ["nuevo", "principiante", "intermedio", "avanzado"] as const;
const FOCUS: Focus[] = ["ambos", "running", "fuerza"];

// nombre del día (0 = lunes) en el idioma: «sábado», «Saturday»…
const weekdayName = (i: number, locale: Locale) => {
  const w = new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(intlLocale(locale), { weekday: "long", timeZone: "UTC" });
  return w.charAt(0).toUpperCase() + w.slice(1);
};

/**
 * Perfil. Con `steps` (la primera vez, al crear la cuenta) va por pasos con «Siguiente»;
 * si no, todo a la vista para cambiar una cosa rápido (Editar perfil).
 */
export function ProfileForm({ profile, initialFocus, locale, steps = false, defaultName }: { profile?: Profile; initialFocus?: Focus; locale: Locale; steps?: boolean; defaultName?: string }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const [focus, setFocus] = useState<Focus>(initialFocus ?? focusOf(profile));
  const [step, setStep] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const runner = focus !== "fuerza";
  const p = profile;
  const avail = availableDaysOf(p ?? { daysPerWeek: 4, longRunDay: 6 });
  // los pasos que tocan (sin experiencia de carrera si solo hace fuerza)
  const sections = runner ? ["foco", "datos", "experiencia", "disponibilidad"] : ["foco", "datos", "disponibilidad"];
  const last = step >= sections.length - 1;
  // en modo pasos solo se ve uno; los demás siguen en el formulario (ocultos) para guardarse todos juntos
  const box = (id: string) => `rounded-2xl border border-line bg-surface p-4 md:p-5 ${steps && sections[step] !== id ? "hidden" : ""}`;
  const next = () => {
    // antes de pasar, que el paso esté bien rellenado (edad, peso…)
    const fields = form.current?.querySelectorAll<HTMLInputElement>(`[data-step="${sections[step]}"] input, [data-step="${sections[step]}"] select`) ?? [];
    for (const f of fields) if (!f.reportValidity()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // con Intro en un paso que no es el último, pasa al siguiente en vez de guardar
  return (
    <form ref={form} onSubmit={steps && !last ? (e) => (e.preventDefault(), next()) : keepForm(action)} className="space-y-6">
      {steps && (
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">{t("prf.paso", { n: step + 1, total: sections.length })}</p>
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {sections.map((s, i) => (
              <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
            ))}
          </div>
        </div>
      )}

      <fieldset data-step="foco" className={box("foco")}>
        <legend className="px-1 text-sm font-semibold">{t("prf.queEntrenas")}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {FOCUS.map((f) => (
            <label key={f} className="flex cursor-pointer gap-2 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-surface-2">
              <input type="radio" name="focus" value={f} checked={focus === f} onChange={() => setFocus(f)} className="mt-1 accent-[var(--accent)]" />
              <span>
                <span className="block text-sm font-semibold">{t(`prf.${f}` as Key)}</span>
                <span className="block text-xs text-ink-2">{t(`prf.${f}D` as Key)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset data-step="datos" className={box("datos")}>
        <legend className="px-1 text-sm font-semibold">{t("prf.datos")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <label className="field">
            {t("auth.nombre")}
            <input className="input" name="name" defaultValue={p?.name ?? defaultName} placeholder={t("prf.nombrePh")} />
          </label>
          <label className="field">
            {t("prf.sexo")}
            <select className="input" name="sex" defaultValue={p?.sex ?? "male"}>
              <option value="male">{t("prf.hombre")}</option>
              <option value="female">{t("prf.mujer")}</option>
            </select>
          </label>
          <label className="field">
            {t("prf.edad")}
            <input className="input" name="age" type="number" inputMode="numeric" min={10} max={100} required defaultValue={p?.age} />
          </label>
          <label className="field">
            {t("prf.peso")}
            <input className="input" name="weightKg" type="number" inputMode="decimal" step="0.1" required defaultValue={p?.weightKg} />
          </label>
          <label className="field">
            {t("prf.altura")}
            <input className="input" name="heightCm" type="number" inputMode="numeric" required defaultValue={p?.heightCm} />
          </label>
          <div className="hidden md:block" />
          <label className="field">
            {t("prf.fcMax")}
            <input className="input" name="hrMax" type="number" inputMode="numeric" defaultValue={p?.hrMax} placeholder={t("prf.fcMaxPh")} />
          </label>
          <label className="field">
            {t("prf.fcReposo")}
            <input className="input" name="hrRest" type="number" inputMode="numeric" defaultValue={p?.hrRest} placeholder="60" />
          </label>
        </div>
      </fieldset>

      {runner && (
        <fieldset data-step="experiencia" className={box("experiencia")}>
          <legend className="px-1 text-sm font-semibold">{t("prf.experiencia")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((lv) => (
              <label key={lv} className="flex cursor-pointer gap-2 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-surface-2">
                <input type="radio" name="level" value={lv} defaultChecked={(p?.level ?? "principiante") === lv} className="mt-1 accent-[var(--accent)]" />
                <span>
                  <span className="block text-sm font-semibold">{t(`prf.${lv}` as Key)}</span>
                  <span className="block text-xs text-ink-2">{t(`prf.${lv}D` as Key)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="field">
              {t("prf.anos")}
              <input className="input" name="yearsRunning" type="number" inputMode="decimal" step="0.5" defaultValue={p?.yearsRunning ?? 0} />
            </label>
            <label className="field">
              {t("prf.kmSemana")}
              <input className="input" name="weeklyKm" type="number" inputMode="numeric" defaultValue={p?.weeklyKm ?? 0} />
            </label>
            <label className="field">
              {t("prf.tirada")}
              <input className="input" name="longestRunKm" type="number" inputMode="decimal" step="0.5" defaultValue={p?.longestRunKm ?? 0} />
            </label>
            <label className="field">
              {t("prf.marcaDist")}
              <select className="input" name="raceDistanceKm" defaultValue={p?.recentRace?.distanceKm ?? ""}>
                <option value="">{t("prf.ninguna")}</option>
                <option value="5">5K</option>
                <option value="10">10K</option>
                <option value="21.0975">{t("prf.media")}</option>
                <option value="42.195">{t("prf.maraton")}</option>
              </select>
            </label>
            <label className="field">
              {t("prf.marcaTiempo")}
              <input className="input" name="raceTime" placeholder={t("prf.marcaPh")} defaultValue={fmtT(p?.recentRace?.timeSec)} />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">{t("prf.strava")}</p>
        </fieldset>
      )}

      <fieldset data-step="disponibilidad" className={box("disponibilidad")}>
        <legend className="px-1 text-sm font-semibold">{runner ? t("prf.disponibilidad") : t("prf.fuerzaTitulo")}</legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {runner && <Availability initialDays={avail} initialLong={p?.longRunDay ?? 6} t={t} locale={locale} />}
          <div className="sm:col-span-2">
            <p className="field">{runner ? t("prf.sesionesFuerza") : t("prf.diasFuerza")}</p>
            <Stepper key={String(runner)} name="strengthPerWeek" initial={Math.min(runner ? 4 : 6, p?.strengthPerWeek ?? (runner ? 2 : 3))} min={runner ? 0 : 1} max={runner ? 4 : 6} t={t} />
            <p className="mt-1 text-xs text-muted">{runner ? t("prf.fuerzaRunner") : t("prf.fuerzaSolo")}</p>
          </div>
          {runner && (
            <label className="field min-w-0 sm:col-span-2">
              {t("prf.tipoFuerza")}
              <select className="input min-w-0" name="strengthStyle" defaultValue={p?.strengthStyle ?? "general"}>
                <option value="general">{t("prf.general")}</option>
                <option value="grupos">{t("prf.grupos")}</option>
              </select>
              <span className="text-xs font-normal text-muted">{t("prf.tipoExpl")}</span>
            </label>
          )}
          <label className="field sm:col-span-2 md:col-span-3">
            {t("prf.lesiones")}
            <input className="input" name="injuries" defaultValue={p?.injuries} placeholder={t("prf.lesionesPh")} />
          </label>
        </div>
      </fieldset>

      {steps ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>
                {t("prf.atras")}
              </button>
            )}
            {last ? (
              <button className="btn flex-1" disabled={pending}>
                {pending ? t("wl.guardando") : t("prf.empezar")}
              </button>
            ) : (
              <button type="button" className="btn flex-1" onClick={next}>
                {t("prf.siguiente")}
              </button>
            )}
          </div>
          {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn shrink-0" disabled={pending}>
            {pending ? t("wl.guardando") : t("prf.guardar")}
          </button>
          {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
          {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
        </div>
      )}
    </form>
  );
}

/** Días disponibles (chips) y día de la tirada larga, que tiene que ser uno de ellos. */
function Availability({ initialDays, initialLong, t, locale }: { initialDays: number[]; initialLong: number; t: T; locale: Locale }) {
  const [days, setDays] = useState(initialDays);
  const [long, setLong] = useState(initialDays.includes(initialLong) ? initialLong : (initialDays.at(-1) ?? 6));
  const short = weekdayInitials(locale);
  const toggle = (i: number) => {
    const next = days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b);
    setDays(next);
    // si se quita el día de la tirada larga, pasa al último día marcado
    if (!next.includes(long) && next.length) setLong(next.at(-1)!);
  };
  const chip = (on: boolean) =>
    `grid h-11 place-items-center rounded-xl border text-sm font-bold transition ${on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink-2 hover:text-ink"}`;
  return (
    <>
      <div className="sm:col-span-2">
        <p className="field">{t("prf.dias")}</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5" role="group" aria-label={t("prf.dias")}>
          {short.map((s, i) => (
            <label key={i} className={`cursor-pointer ${chip(days.includes(i))}`} title={weekdayName(i, locale)}>
              <input type="checkbox" name="availableDays" value={i} checked={days.includes(i)} onChange={() => toggle(i)} className="sr-only" aria-label={weekdayName(i, locale)} />
              {s}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {days.length === 1 ? t("prf.dia1") : t("prf.diasN", { n: days.length })} {t("prf.diasNota")}
        </p>
      </div>
      <div className="sm:col-span-2">
        <p className="field">{t("prf.tiradaLarga")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("prf.tiradaLarga")}>
          {days.map((i) => (
            <label key={i} className={`cursor-pointer px-3 ${chip(long === i)}`}>
              <input type="radio" name="longRunDay" value={i} checked={long === i} onChange={() => setLong(i)} className="sr-only" />
              {weekdayName(i, locale)}
            </label>
          ))}
          {!days.length && <span className="text-xs text-muted">{t("prf.marcaAntes")}</span>}
        </div>
      </div>
    </>
  );
}

/** Número con botones − y + (y también se puede escribir). */
function Stepper({ name, initial, min, max, t }: { name: string; initial: number; min: number; max: number; t: T }) {
  const [v, setV] = useState(String(initial));
  const n = Math.min(max, Math.max(min, Number(v) || 0));
  const btn = "grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-xl font-bold disabled:opacity-30";
  return (
    <div className="mt-2 flex items-center gap-2">
      <button type="button" className={btn} onClick={() => setV(String(n - 1))} disabled={n <= min} aria-label={t("prf.menos")}>
        −
      </button>
      <input
        className="input no-spin h-11 w-16 text-center text-lg font-bold"
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => setV(String(n))}
        aria-label={t("prf.sesionesFuerza")}
      />
      <button type="button" className={btn} onClick={() => setV(String(n + 1))} disabled={n >= max} aria-label={t("prf.mas")}>
        +
      </button>
    </div>
  );
}
