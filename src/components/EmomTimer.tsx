"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ExercisePicker } from "./ExercisePicker";
import { onlyBody } from "./RoutineEditor";
import { finishWorkout } from "@/app/strength-actions";
import { withCustom } from "@/lib/strength/exerciseList";
import type { Equipment, ExerciseSummary } from "@/lib/strength/labels";
import { MAX_EMOM_ROUNDS, emomTitle, fmtLoad } from "@/lib/strength/workouts";
import { Icon } from "./icons";
import { translator, type Locale } from "@/lib/i18n";

interface Slot {
  key: number;
  exerciseId: string;
  reps: string;
  kg: string;
  bw: boolean;
}
interface Setup {
  intervalSec: number;
  rounds: number;
  slots: Slot[];
}
interface Run {
  startedAt: number; // epoch ms (incluye la cuenta atrás)
  pausedMs: number;
  pausedAt?: number;
  failed: number[]; // rondas no completadas (desde 0)
  endedAt?: number; // terminado antes de tiempo
}
interface Saved {
  setup: Setup;
  run?: Run;
}

const INTERVALS = [
  [30, "30 s"],
  [45, "45 s"],
  [60, "1 min (EMOM)"],
  [90, "1:30 min"],
  [120, "2 min (E2MOM)"],
  [180, "3 min (E3MOM)"],
] as const;
const PREP_SEC = 10;

// el EMOM en curso (y la última configuración) se guarda en el navegador: si se bloquea el móvil, sigue donde estaba
const STORAGE = "rio-emom";
const load = (): Saved | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Saved) : undefined;
  } catch {
    return undefined;
  }
};
const store = (s: Saved) => {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(s));
  } catch {}
};

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : undefined;
};
const localIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
let keySeq = 0;

/** EMOM: cada intervalo empieza una ronda; con varios ejercicios se van turnando. Pita al empezar cada ronda. */
export function EmomTimer({ custom, available, bodyKg, locale }: { custom: ExerciseSummary[]; available?: Equipment[]; bodyKg?: number; locale: Locale }) {
  const t = translator(locale);
  // «EMOM 12 min» vale en todos los idiomas; con segundos sueltos va traducido
  const title = (e: Setup) => (e.intervalSec % 60 === 0 ? emomTitle(e) : t("emom.tituloSeg", { s: e.intervalSec, n: e.rounds }));
  const exercises = useMemo(() => withCustom(custom), [custom]);
  const byId = useMemo(() => new Map(exercises.map((x) => [x.id, x])), [exercises]);
  const [s, setS] = useState<Saved>();
  const [now, setNow] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const audio = useRef<AudioContext | undefined>(undefined);
  const [sound, setSound] = useState(false);
  const lastBeep = useRef("");
  const saved = useRef(false);

  useEffect(() => {
    const stored = load();
    // un EMOM empezado hace más de 3 h ya no sigue en curso
    const fresh = stored?.run && Date.now() - stored.run.startedAt < 3 * 3600_000;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
    setS(stored?.setup ? { setup: stored.setup, run: fresh ? stored.run : undefined } : { setup: { intervalSec: 60, rounds: 12, slots: [] } });
  }, []);
  useEffect(() => {
    if (s && !saved.current) store(s);
  }, [s]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const run = s?.run;
  const setup = s?.setup;
  const running = Boolean(run && !run.endedAt);
  // pantalla encendida mientras corre el EMOM (si el navegador lo permite)
  useEffect(() => {
    if (!running) return;
    let lock: { release: () => Promise<void> } | undefined;
    const ask = () => {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      wl?.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    const onVisible = () => document.visibilityState === "visible" && ask();
    ask();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [running]);

  // tiempo de EMOM transcurrido (negativo durante la cuenta atrás)
  const elapsedMs = run ? (run.endedAt ?? run.pausedAt ?? now) - run.startedAt - run.pausedMs - PREP_SEC * 1000 : 0;
  const interval = setup?.intervalSec ?? 60;
  const totalRounds = setup?.rounds ?? 0;
  const round = Math.max(0, Math.floor(elapsedMs / (interval * 1000)));
  const over = Boolean(run) && round >= totalRounds;
  const secLeft = elapsedMs < 0 ? Math.ceil(-elapsedMs / 1000) : Math.ceil(interval - (elapsedMs / 1000) % interval);
  // rondas que ya han pasado del todo (al terminar antes, la que estaba en marcha no cuenta)
  const finishedRounds = Math.min(totalRounds, run?.endedAt ? round : over ? totalRounds : round);
  const doneRounds = Array.from({ length: finishedRounds }, (_, r) => r).filter((r) => !run?.failed.includes(r)).length;

  const beep = (freq: number, ms: number) => {
    const ctx = audio.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  };
  // pitidos: 3-2-1 cortos y uno largo al empezar cada ronda
  useEffect(() => {
    if (!running || run?.pausedAt || over) return;
    const startOfRound = elapsedMs >= 0 && secLeft === interval;
    const key = startOfRound ? `r${round}` : secLeft <= 3 ? `${elapsedMs < 0 ? "p" : round}:${secLeft}` : "";
    if (!key || key === lastBeep.current) return;
    lastBeep.current = key;
    if (startOfRound) {
      beep(990, 500);
      try {
        navigator.vibrate?.(300);
      } catch {}
    } else beep(660, 150);
  });
  // al acabar la última ronda: pitido final y a guardar
  useEffect(() => {
    if (running && over && !finishing) {
      beep(990, 900);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el EMOM acaba por tiempo
      setFinishing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cruzar el final
  }, [running, over]);

  if (!s || !setup) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  const editSetup = (fn: (cur: Setup) => Setup) => setS((cur) => cur && { ...cur, setup: fn(cur.setup) });
  const editRun = (fn: (cur: Run) => Run) => setS((cur) => cur?.run && { ...cur, run: fn(cur.run) });
  const updateSlot = (key: number, patch: Partial<Slot>) => editSetup((cur) => ({ ...cur, slots: cur.slots.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  const slotAt = (r: number) => setup.slots[r % Math.max(1, setup.slots.length)];
  const slotText = (x?: Slot) => {
    if (!x) return "";
    const kg = num(x.kg);
    return [x.reps && t("emom.reps", { n: x.reps }), (x.bw || kg) && fmtLoad(x.bw, kg, t("re.pc"))].filter(Boolean).join(" · ");
  };
  const name = (x?: Slot) => (x ? (byId.get(x.exerciseId)?.name ?? t("emom.ejercicio")) : "");

  // el audio solo se puede activar con un toque (iPhone)
  const enableSound = () => {
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      setSound(true);
    } catch {}
  };
  const begin = () => {
    enableSound();
    lastBeep.current = "";
    setError(undefined);
    setS((cur) => cur && { ...cur, run: { startedAt: Date.now(), pausedMs: 0, failed: [] } });
  };
  const togglePause = () => editRun((cur) => (cur.pausedAt ? { ...cur, pausedMs: cur.pausedMs + Date.now() - cur.pausedAt, pausedAt: undefined } : { ...cur, pausedAt: Date.now() }));
  const toggleFailed = (r: number) => editRun((cur) => ({ ...cur, failed: cur.failed.includes(r) ? cur.failed.filter((x) => x !== r) : [...cur.failed, r] }));
  const endEarly = () => {
    editRun((cur) => ({ ...cur, endedAt: cur.pausedAt ?? Date.now() }));
    setFinishing(true);
  };
  const discard = () => {
    if (!confirm(t("emom.descartarConfirm"))) return;
    setFinishing(false);
    setS((cur) => cur && { setup: cur.setup });
  };
  const finish = (fd: FormData) =>
    start(async () => {
      if (!run) return;
      // las series: una por ronda completada, en el ejercicio que tocaba
      const groups = new Map<string, { exerciseId: string; bw: boolean; sets: { kg: string; reps: string; done: boolean }[] }>();
      for (let r = 0; r < finishedRounds; r++) {
        const x = slotAt(r);
        const g = groups.get(x.exerciseId) ?? { exerciseId: x.exerciseId, bw: x.bw, sets: [] };
        g.sets.push({ kg: x.kg, reps: x.reps, done: !run.failed.includes(r) });
        groups.set(x.exerciseId, g);
      }
      // se deja la configuración para la próxima vez antes de guardar, porque la acción redirige
      saved.current = true;
      store({ setup });
      const res = await finishWorkout({
        name: String(fd.get("name") ?? ""),
        startLocal: localIso(run.startedAt + PREP_SEC * 1000),
        durationSec: Math.round(Math.max(0, Math.min(elapsedMs / 1000, totalRounds * interval))),
        rpe: Number(fd.get("rpe")) || undefined,
        feelings: String(fd.get("feelings") ?? ""),
        workout: { exercises: [...groups.values()], emom: { intervalSec: interval, rounds: totalRounds, done: doneRounds } },
      });
      // si se guardó, la acción redirige y no vuelve aquí
      if (res?.error) {
        saved.current = false;
        store(s);
        setError(res.error);
      }
    });

  // ---------- Configuración ----------
  if (!run)
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">
          {t("emom.explica")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            {t("emom.cada")}
            <select className="input" value={setup.intervalSec} onChange={(e) => editSetup((cur) => ({ ...cur, intervalSec: Number(e.target.value) }))}>
              {INTERVALS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("emom.rondas")}
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_EMOM_ROUNDS}
              value={setup.rounds || ""}
              onChange={(e) => editSetup((cur) => ({ ...cur, rounds: Math.min(MAX_EMOM_ROUNDS, Math.max(0, Math.round(Number(e.target.value) || 0))) }))}
            />
          </label>
        </div>
        {setup.rounds > 0 && <p className="text-sm text-ink-2">{t("emom.total", { titulo: title(setup), tiempo: fmtClock(setup.rounds * setup.intervalSec) })}</p>}

        <div className="space-y-2">
          {setup.slots.map((x, i) => (
            <section key={x.key} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="min-w-0 truncate">
                  <span className="mr-2 text-xs text-muted">{setup.slots.length > 1 ? t("emom.rondasN", { a: i + 1, b: i + 1 + setup.slots.length }) : t("emom.cadaRonda")}</span>
                  {name(x)}
                </strong>
                <button type="button" className="text-xs text-muted hover:text-critical" onClick={() => editSetup((cur) => ({ ...cur, slots: cur.slots.filter((y) => y.key !== x.key) }))}>
                  {t("emom.quitar")}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="field">
                  {t("rc.reps")}
                  <input className="input" inputMode="numeric" value={x.reps} onChange={(e) => updateSlot(x.key, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="10" />
                </label>
                <label className="field">
                  {x.bw ? t("emom.lastreKg") : t("emom.pesoKg")}
                  <input className="input" inputMode="decimal" value={x.kg} onChange={(e) => updateSlot(x.key, { kg: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })} placeholder={x.bw ? "0" : "–"} />
                </label>
              </div>
            </section>
          ))}
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-3 font-medium hover:bg-surface-2" onClick={() => setPicking(true)}>
            {t("wl.anadirEjercicio")}
          </button>
        </div>
        {bodyKg === undefined && setup.slots.some((x) => x.bw) && <p className="text-xs text-muted">{t("emom.ponPeso")}</p>}
        <button type="button" className="btn w-full py-3 text-base" disabled={!setup.slots.length || !setup.rounds} onClick={begin}>
          <Icon name="play" className="mr-1 h-4 w-4 align-[-2px]" /> {t("emom.empezar")}
        </button>

        {picking && (
          <ExercisePicker
            locale={locale}
            exercises={exercises}
            available={available}
            onClose={() => setPicking(false)}
            onAdd={(ids) => {
              editSetup((cur) => ({ ...cur, slots: [...cur.slots, ...ids.map((exerciseId) => ({ key: keySeq++, exerciseId, reps: "", kg: "", bw: onlyBody(byId.get(exerciseId)) }))] }));
              setPicking(false);
            }}
          />
        )}
      </div>
    );

  // ---------- En marcha ----------
  const prep = elapsedMs < 0;
  const current = slotAt(round);
  const next = slotAt(round + 1);
  const paused = Boolean(run.pausedAt);
  const progress = prep ? 0 : 1 - secLeft / interval;
  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="text-sm text-critical" onClick={discard}>
          {t("wl.descartar")}
        </button>
        <strong className="truncate">{title(setup)}</strong>
        <button type="button" className="btn px-4 py-1.5" onClick={endEarly} disabled={Boolean(run.endedAt)}>
          {t("wl.terminar")}
        </button>
      </div>

      {!sound && (
        <button type="button" className="w-full rounded-xl border border-line bg-surface p-3 text-sm font-semibold" onClick={enableSound}>
          {t("emom.pitidos")}
        </button>
      )}
      <section className={`rounded-3xl border p-6 text-center ${prep ? "border-line bg-surface" : "border-accent bg-accent/10"}`}>
        <p className="text-sm font-semibold text-ink-2">{prep ? t("emom.preparate") : over ? t("emom.hecho") : t("emom.rondaDe", { n: round + 1, total: totalRounds })}</p>
        <p className={`tabular my-2 text-7xl font-bold tracking-tight ${secLeft <= 3 && !over ? "text-accent" : ""}`} aria-live="off">
          {over ? fmtClock(totalRounds * interval) : prep ? secLeft : fmtClock(secLeft)}
        </p>
        <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        {!over && (
          <div className="mt-4">
            <p className="text-2xl font-bold">{name(current)}</p>
            <p className="text-lg text-ink-2">{slotText(current) || " "}</p>
            {setup.slots.length > 1 && round + 1 < totalRounds && (
              <p className="mt-2 text-sm text-muted">
                {t("emom.despues", { nombre: name(next) })} {slotText(next) && `· ${slotText(next)}`}
              </p>
            )}
          </div>
        )}
      </section>

      {!over && !run.endedAt && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={togglePause} className={`btn ${paused ? "" : "btn-ghost"}`} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} className="mr-1 h-4 w-4 align-[-2px]" />
            {paused ? t("wl.reanudar") : t("wl.pausa")}
          </button>
          <button type="button" className="btn btn-ghost" disabled={prep} onClick={() => toggleFailed(round)}>
            {run.failed.includes(round) ? t("emom.siCompletada") : t("emom.noLlego")}
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs text-muted">
          {t("emom.completadas", { n: doneRounds })}
          {run.failed.length ? t("emom.sinCompletar", { n: run.failed.length }) : ""}. {t("emom.tocaRonda")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: totalRounds }, (_, r) => {
            const failed = run.failed.includes(r);
            const past = r < finishedRounds;
            const now_ = r === round && !over && !run.endedAt && !prep;
            return (
              <button
                key={r}
                type="button"
                disabled={!past && !now_}
                onClick={() => toggleFailed(r)}
                aria-label={t("emom.ronda", { n: r + 1 }) + (failed ? t("emom.ariaSin") : past ? t("emom.ariaHecha") : "")}
                className={`tabular grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  failed ? "bg-critical/20 text-critical" : past ? "bg-good/25 text-good-ink" : now_ ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted"
                }`}
              >
                {r + 1}
              </button>
            );
          })}
        </div>
      </div>

      {finishing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center" role="dialog" aria-modal aria-label={t("emom.guardar")}>
          <form action={finish} className="w-full space-y-3 rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
            <strong className="block text-lg">{t("emom.guardar")}</strong>
            <p className="text-sm text-ink-2">
              {t("emom.deRondas", { n: doneRounds, total: totalRounds })}
            </p>
            <label className="field">
              {t("wl.nombre")}
              <input className="input" name="name" defaultValue={title(setup)} maxLength={80} />
            </label>
            <label className="field">
              {t("wl.rpe")}
              <select className="input" name="rpe" defaultValue="8">
                <option value="">{t("wl.sinIndicar")}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("wl.comoTeSentiste")}
              <textarea className="input min-h-16" name="feelings" maxLength={1000} placeholder={t("wl.sentiPh")} />
            </label>
            {!doneRounds && <p className="text-sm text-ink-2">{t("emom.nada")}</p>}
            {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={discard}>
                {t("wl.descartar")}
              </button>
              <button className="btn flex-1" disabled={pending || !doneRounds}>
                {pending ? t("wl.guardando") : t("re.guardar")}
              </button>
            </div>
            {run.endedAt && !over && (
              <button type="button" className="w-full text-xs text-muted underline" onClick={() => (editRun((cur) => ({ ...cur, endedAt: undefined, pausedAt: cur.pausedAt ?? cur.endedAt })), setFinishing(false))}>
                {t("emom.seguir")}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
