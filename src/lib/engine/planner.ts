// Generador de planes de entrenamiento periodizados hacia una carrera objetivo.
// Basado en: VDOT de Daniels (ritmos), periodización Lydiard/Pfitzinger (fases),
// regla del 10 % (progresión), semanas de descarga cada 4 y taper según distancia.
import type { Activity, Goal, Level, PaceRange, Phase, Plan, PlannedSession, PlanWeek, Profile, SessionType } from "../types";
import { addDays, diffDays, mondayOf, weekday } from "../dates";
import { fmtDuration, fmtPace, fmtPaceRange } from "../format";
import { bmi, flatEquivalentKm, heatFactor, raceTimeFromVdot, trainingPaces, vdotFromRace, type TrainingPaces } from "./physiology";

export type DistanceCat = "5k" | "10k" | "half" | "marathon";

export function distanceCat(km: number): DistanceCat {
  if (km <= 7) return "5k";
  if (km <= 13) return "10k";
  if (km <= 26) return "half";
  return "marathon";
}

const LEVEL_IDX: Record<Level, number> = { nuevo: 0, principiante: 1, intermedio: 2, avanzado: 3 };

// km/semana en el pico del plan
const PEAK_KM: Record<DistanceCat, number[]> = {
  "5k": [20, 30, 45, 65],
  "10k": [25, 35, 50, 75],
  half: [30, 42, 58, 85],
  marathon: [42, 55, 72, 100],
};
// tope de la tirada larga (km)
const LONG_CAP: Record<DistanceCat, number[]> = {
  "5k": [7, 10, 14, 16],
  "10k": [10, 13, 16, 20],
  half: [16, 18, 21, 24],
  marathon: [28, 30, 32, 34],
};
// volumen mínimo de partida
const MIN_START = [8, 12, 20, 35];
// mejora de VDOT razonable por semana de entrenamiento
const VDOT_GAIN_WEEK = [0.4, 0.35, 0.25, 0.15];
// semanas mínimas recomendadas
const MIN_WEEKS: Record<DistanceCat, number> = { "5k": 4, "10k": 6, half: 8, marathon: 12 };
// taper: fracción del pico para cada semana final (la última es la de la carrera, sin contar la carrera)
const TAPER: Record<DistanceCat, number[]> = {
  "5k": [0.6],
  "10k": [0.85, 0.55],
  half: [0.7, 0.45],
  marathon: [0.75, 0.6, 0.35],
};

// Disposición semanal (lunes = 0) con la tirada larga el domingo; luego se rota al día elegido.
type Slot = "L" | "Q1" | "Q2" | "E" | "R";
const LAYOUT: Record<number, [number, Slot][]> = {
  2: [[2, "Q1"], [6, "L"]],
  3: [[1, "Q1"], [3, "E"], [6, "L"]],
  4: [[1, "Q1"], [3, "Q2"], [5, "E"], [6, "L"]],
  5: [[1, "Q1"], [2, "E"], [3, "Q2"], [5, "E"], [6, "L"]],
  6: [[1, "Q1"], [2, "E"], [3, "Q2"], [4, "E"], [5, "E"], [6, "L"]],
  7: [[0, "R"], [1, "Q1"], [2, "E"], [3, "Q2"], [4, "E"], [5, "E"], [6, "L"]],
};

const HARD: SessionType[] = ["long", "tempo", "intervals", "repetitions", "marathon_pace", "race_pace", "hills", "fartlek"];
export const isHardSession = (t: SessionType) => HARD.includes(t);

/** Días disponibles del perfil; si no se indicaron, los de la disposición clásica según nº de días y día de tirada. */
export function availableDaysOf(profile: Pick<Profile, "availableDays" | "daysPerWeek" | "longRunDay">): number[] {
  if (profile.availableDays?.length) return [...new Set(profile.availableDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  const n = clamp(Math.round(profile.daysPerWeek), 2, 7);
  return LAYOUT[n].map(([d]) => (d + profile.longRunDay - 6 + 7) % 7).sort((a, b) => a - b);
}

/** Reparte los huecos de la disposición base sobre los días disponibles, con la tirada larga en su día. */
function weekLayout(avail: number[], longRunDay: number): [number, Slot][] {
  const L = avail.includes(longRunDay) ? longRunDay : (avail.find((d) => d >= 5) ?? avail.at(-1)!);
  // orden cíclico empezando el día después de la tirada; la tirada queda la última, como en LAYOUT
  const order = [...avail].sort((a, b) => ((a - L + 6) % 7) - ((b - L + 6) % 7));
  const out: [number, Slot][] = LAYOUT[avail.length].map(([, s], i) => [order[i], s]);
  // evitar calidad el día justo antes de la tirada si hay un hueco suave que pueda intercambiarse
  const before = (L + 6) % 7;
  const qi = out.findIndex(([d, s]) => d === before && (s === "Q1" || s === "Q2"));
  if (qi >= 0) {
    const ei = out.findIndex(([d, s]) => s === "E" && d !== before && d !== (L + 1) % 7);
    if (ei >= 0) [out[qi][1], out[ei][1]] = [out[ei][1], out[qi][1]];
  }
  return out;
}

/**
 * Mueve las sesiones que caen en fechas no disponibles al día libre más cercano de la misma semana
 * (dentro de los días disponibles). Si no hay hueco, la sesión se elimina. Devuelve nº de movidas/eliminadas.
 */
export function applyBlockedDates(plan: Plan, blocked: string[], avail: number[], today: string): { moved: number; dropped: number } {
  const set = new Set(blocked);
  let moved = 0;
  let dropped = 0;
  for (const w of plan.weeks) {
    const affected = w.sessions.filter((s) => set.has(s.date) && s.date >= today && s.type !== "race");
    if (!affected.length) continue;
    // primero las sesiones importantes, que eligen hueco antes
    affected.sort((a, b) => Number(isHardSession(b.type)) - Number(isHardSession(a.type)));
    for (const s of affected) {
      const isStrength = s.type === "strength";
      const busy = (d: string) => w.sessions.some((x) => x !== s && x.date === d && (x.type === "strength") === isStrength);
      const hardNear = (d: string) => w.sessions.some((x) => x !== s && isHardSession(x.type) && Math.abs(diffDays(x.date, d)) <= 1);
      const raceDate = plan.goal.date;
      const candidates = avail
        .map((d) => addDays(w.start, d))
        .filter((d) => d >= today && !set.has(d) && !busy(d) && diffDays(raceDate, d) >= 2)
        .sort(
          (a, b) =>
            Number(isHardSession(s.type) && hardNear(a)) - Number(isHardSession(s.type) && hardNear(b)) ||
            Math.abs(diffDays(a, s.date)) - Math.abs(diffDays(b, s.date)),
        );
      // sin hueco libre: una sesión clave ocupa el lugar del rodaje suave más cercano, que es la que se pierde
      const easy = !candidates.length && isHardSession(s.type)
        ? w.sessions
            .filter((x) => ["easy", "recovery", "strides", "run_walk"].includes(x.type) && x.date >= today && !set.has(x.date) && diffDays(raceDate, x.date) >= 2)
            .sort((a, b) => Math.abs(diffDays(a.date, s.date)) - Math.abs(diffDays(b.date, s.date)))[0]
        : undefined;
      if (candidates.length) {
        s.date = candidates[0];
        moved++;
      } else if (easy) {
        s.date = easy.date;
        w.sessions = w.sessions.filter((x) => x !== easy);
        moved++;
        dropped++;
      } else {
        w.sessions = w.sessions.filter((x) => x !== s);
        dropped++;
      }
    }
    w.sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.type === "strength" ? 1 : -1));
    w.targetKm = Math.round(w.sessions.reduce((x, y) => x + y.distanceKm, 0));
  }
  return { moved, dropped };
}

const PHASE_FOCUS: Record<Phase, string> = {
  base: "Base aeróbica: volumen suave, técnica y fuerza. Construir el motor.",
  construccion: "Construcción: umbral y VO2max. Subir la cilindrada.",
  especifico: "Específico: ritmo de carrera y tiradas largas de calidad.",
  taper: "Afinado: menos volumen, mantener chispa. Llegar fresco.",
};

const avg = (r: PaceRange) => (r.fast + r.slow) / 2;
const round1 = (x: number) => Math.round(x * 2) / 2; // a 0,5 km
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export interface PlanInput {
  profile: Profile;
  goal: Goal;
  currentVdot: number;
  currentWeeklyKm: number;
  longestRecentKm: number;
  today: string;
}

export function generatePlan(input: PlanInput): Plan {
  const { profile, goal, today } = input;
  const lvl = LEVEL_IDX[profile.level];
  const cat = distanceCat(goal.distanceKm);
  const bodyMass = bmi(profile.weightKg, profile.heightCm);
  const heavy = bodyMass >= 30;
  const warnings: string[] = [];
  const notes: string[] = [];

  // ---- Calendario ----
  // de lunes a viernes el plan arranca esta misma semana (solo los días que quedan)
  let start = weekday(today) <= 4 ? mondayOf(today) : addDays(mondayOf(today), 7);
  const raceWeek = mondayOf(goal.date);
  let nWeeks = diffDays(raceWeek, start) / 7 + 1;
  if (nWeeks < 1) {
    start = raceWeek;
    nWeeks = 1;
  }
  if (nWeeks > 30) {
    start = addDays(raceWeek, -7 * 29);
    notes.push(`La carrera está lejos: el plan arranca el ${start}. Hasta entonces mantén rodajes suaves y fuerza.`);
    nWeeks = 30;
  }
  if (nWeeks < MIN_WEEKS[cat])
    warnings.push(
      `Quedan ${nWeeks} semanas; para esta distancia se recomiendan al menos ${MIN_WEEKS[cat]}. El plan prioriza llegar sano sobre mejorar marca.`,
    );
  if (cat === "marathon" && profile.level === "nuevo")
    warnings.push("Un maratón partiendo de cero es muy exigente: lo ideal es 6+ meses y haber hecho antes una media maratón.");
  if (heavy)
    warnings.push(
      `IMC ${bodyMass.toFixed(1)}: progresión más conservadora y bloques de caminar-correr para cuidar articulaciones. Consulta con tu médico antes de empezar.`,
    );
  if (profile.injuries?.trim())
    warnings.push(`Lesiones indicadas ("${profile.injuries.trim()}"): ante dolor, cambia la sesión por bici/elíptica y consulta a un fisio.`);

  const taperFr = TAPER[cat].slice(-Math.max(1, Math.min(TAPER[cat].length, nWeeks - 1)));
  const taperWeeks = nWeeks === 1 ? 1 : taperFr.length;
  const buildWeeks = nWeeks - taperWeeks;

  // ---- VDOT: actual, realista y objetivo ----
  const current = input.currentVdot;
  const realistic = current + Math.min(buildWeeks * VDOT_GAIN_WEEK[lvl], 6);
  const courseFactor = (flatEquivalentKm(goal.distanceKm, goal.elevationGainM ?? 0) / goal.distanceKm) * heatFactor(goal.temperatureC, goal.distanceKm);
  let raceVdot = realistic;
  if (goal.targetTimeSec) {
    const required = vdotFromRace(goal.distanceKm, goal.targetTimeSec / courseFactor);
    if (required > realistic + 0.5) {
      const realTime = raceTimeFromVdot(realistic, goal.distanceKm) * courseFactor;
      warnings.push(
        `Objetivo ambicioso: ${fmtDuration(goal.targetTimeSec)} exige VDOT ${required.toFixed(1)} y tu proyección es ${realistic.toFixed(1)} (≈ ${fmtDuration(realTime)}). Los ritmos se ajustan a lo realista; si mejoras más rápido, regenera el plan.`,
      );
      raceVdot = realistic;
    } else {
      raceVdot = required;
      if (required < current - 1) notes.push("Tu objetivo es conservador para tu forma actual: buen margen para disfrutar la carrera o apuntar más alto.");
    }
  }
  const finalVdot = Math.max(current, raceVdot);
  const vdotAt = (i: number) => current + (finalVdot - current) * clamp(i / Math.max(1, buildWeeks - 1), 0, 1);
  const raceTimeFlat = goal.targetTimeSec && raceVdot !== realistic ? goal.targetTimeSec / courseFactor : raceTimeFromVdot(raceVdot, goal.distanceKm);
  const racePaceFlat = raceTimeFlat / goal.distanceKm;
  const predictedRace = raceTimeFlat * courseFactor;
  if (courseFactor > 1.005)
    notes.push(
      `El recorrido/clima añade ≈ ${((courseFactor - 1) * 100).toFixed(1)} % al tiempo en llano. Tiempo previsto en ese circuito: ${fmtDuration(predictedRace)}.`,
    );

  // ---- Volumen ----
  const startKm = Math.max(input.currentWeeklyKm, MIN_START[lvl]);
  let peak = PEAK_KM[cat][lvl] * (heavy ? 0.8 : 1);
  peak = Math.max(peak, Math.min(startKm * 1.1, peak * 1.3));
  const ramp = heavy || lvl === 0 ? 0.07 : 0.1;
  const vols: number[] = [];
  {
    let v = startKm;
    for (let i = 0; i < buildWeeks; i++) {
      const isRecovery = buildWeeks >= 6 && i % 4 === 3 && i < buildWeeks - 1;
      if (isRecovery) {
        vols.push(v * 0.75);
        continue;
      }
      if (i > 0) v = Math.min(peak, v * (1 + ramp));
      vols.push(v);
    }
    const reached = Math.max(...vols, startKm);
    if (reached < peak * 0.92 && buildWeeks > 0)
      notes.push(`Volumen máximo ${Math.round(reached)} km/sem (respetando +${Math.round(ramp * 100)} %/semana). Ideal para la distancia: ~${Math.round(peak)} km.`);
    const top = buildWeeks ? Math.max(...vols) : startKm;
    for (const f of taperFr) vols.push(top * f);
  }

  // ---- Fases ----
  const phases: Phase[] = [];
  {
    const shares = lvl === 0 ? [0.5, 0.3] : [0.35, 0.35];
    const nBase = buildWeeks >= 4 ? Math.max(1, Math.round(buildWeeks * shares[0])) : buildWeeks >= 2 ? 1 : 0;
    const nBuild = buildWeeks >= 3 ? Math.max(1, Math.round(buildWeeks * shares[1])) : 0;
    for (let i = 0; i < buildWeeks; i++) phases.push(i < nBase ? "base" : i < nBase + nBuild ? "construccion" : "especifico");
    for (let i = 0; i < taperWeeks; i++) phases.push("taper");
  }

  // ---- Semanas ----
  const maxVol = Math.max(...vols);
  const avail = availableDaysOf(profile);
  const days = avail.length;
  const runWalkWeeks = lvl === 0 ? Math.min(6, Math.ceil(buildWeeks / 2)) : heavy && lvl === 1 ? 3 : 0;
  let longKmPrev = Math.max(input.longestRecentKm, lvl === 0 ? 3 : 5);
  const weeks: PlanWeek[] = [];

  for (let w = 0; w < nWeeks; w++) {
    const phase = phases[w];
    const weekStart = addDays(start, 7 * w);
    const vol = vols[w];
    const recovery = phase !== "taper" && w > 0 && vols[w] < vols[w - 1] * 0.85;
    const vdot = phase === "taper" ? finalVdot : vdotAt(w);
    const paces = trainingPaces(vdot);
    const isRaceWeek = w === nWeeks - 1;
    const phaseIdx = phases.slice(0, w).filter((p) => p === phase).length; // nº de semana dentro de la fase
    const runWalk = w < runWalkWeeks;

    const q2Active =
      lvl >= 2 || (lvl === 1 && days >= 5 && (phase === "construccion" || phase === "especifico"));

    const layout = weekLayout(avail, profile.longRunDay);
    const slots = layout.map(([d, s]) => [d, s === "Q2" && (!q2Active || recovery || (isRaceWeek && cat !== "5k")) ? "E" : s] as [number, Slot]);

    // Tirada larga
    // el maratón necesita tiradas de 28-32 km aunque el volumen semanal sea moderado
    const longPct = (days <= 2 ? 0.45 : days <= 3 ? 0.4 : days === 4 ? 0.36 : days === 5 ? 0.32 : 0.28) + (cat === "marathon" ? 0.06 : 0);
    let longKm: number;
    if (phase === "taper") longKm = isRaceWeek ? 0 : Math.min(longKmPrev * (vol / maxVol) * 1.1, vol * 0.4);
    else if (recovery) longKm = longKmPrev * 0.75;
    else {
      longKm = Math.min(vol * longPct, LONG_CAP[cat][lvl], longKmPrev + (lvl <= 1 ? 1.5 : 2));
      longKmPrev = Math.max(longKmPrev, longKm);
    }
    longKm = Math.max(longKm, isRaceWeek ? 0 : 3);

    const nQ = slots.filter(([, s]) => s === "Q1" || s === "Q2").length;
    const qKm = clamp(vol * 0.2, lvl === 0 ? 3 : 5, 16);
    const easySlots = slots.filter(([, s]) => s === "E" || s === "R").length;
    const easyKm = Math.max(3, (vol - longKm - nQ * qKm) / Math.max(1, easySlots));

    const sessions: PlannedSession[] = [];
    const ctx: SessionCtx = { paces, cat, lvl, phase, phaseIdx, recovery, racePaceFlat, runWalk, weekIdx: w };

    for (const [d, slot] of slots) {
      const date = addDays(weekStart, d);
      if (date < today) continue;
      if (isRaceWeek && date >= goal.date) continue;
      if (isRaceWeek && diffDays(goal.date, date) === 1) continue; // descanso el día antes
      if (isRaceWeek && diffDays(goal.date, date) === 2) {
        sessions.push(shakeout(date, paces));
        continue;
      }
      let s: PlannedSession;
      if (slot === "L") s = longRun(date, round1(longKm), ctx);
      else if (slot === "Q1") s = quality1(date, round1(qKm), ctx);
      else if (slot === "Q2") s = quality2(date, round1(qKm), ctx);
      else if (slot === "R") s = recoveryRun(date, round1(Math.max(3, easyKm * 0.7)), paces);
      else s = runWalk ? runWalkSession(date, round1(easyKm), w, paces) : easyRun(date, round1(easyKm), paces, phase);
      sessions.push(s);
    }

    if (isRaceWeek) sessions.push(raceSession(goal, racePaceFlat * courseFactor, predictedRace));

    // Fuerza tras las sesiones de calidad (días duros, duros; días suaves, suaves)
    const nStrength = isRaceWeek ? 0 : phase === "taper" ? Math.min(1, profile.strengthPerWeek) : profile.strengthPerWeek;
    const hosts = [
      ...sessions.filter((s) => s.type !== "long" && s.type !== "easy" && s.type !== "recovery" && s.type !== "race"),
      ...sessions.filter((s) => s.type === "easy"),
    ];
    for (let k = 0; k < nStrength && k < hosts.length; k++) sessions.push(strengthSession(hosts[k].date, phase, k));

    sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.type === "strength" ? 1 : -1));
    weeks.push({
      index: w,
      start: weekStart,
      phase,
      recovery,
      targetKm: Math.round(sessions.reduce((s, x) => s + x.distanceKm, 0)),
      sessions,
      focus: recovery ? "Semana de descarga: asimilar el trabajo. Menos volumen, misma constancia." : isRaceWeek ? "Semana de carrera: descansa, hidrátate y confía en el trabajo hecho." : PHASE_FOCUS[phase],
    });
  }

  notes.unshift(
    `VDOT actual ${current.toFixed(1)} → objetivo de entrenamiento ${finalVdot.toFixed(1)}. Ritmo de carrera (en llano): ${fmtPace(racePaceFlat)} /km.`,
  );

  return {
    createdAt: today,
    goal,
    startVdot: current,
    targetVdot: finalVdot,
    realisticVdot: realistic,
    warnings,
    notes,
    weeks,
  };
}

// ---------------- Sesiones ----------------

interface SessionCtx {
  paces: TrainingPaces;
  cat: DistanceCat;
  lvl: number;
  phase: Phase;
  phaseIdx: number;
  recovery: boolean;
  racePaceFlat: number;
  runWalk: boolean;
  weekIdx: number;
}

function mk(
  date: string,
  type: SessionType,
  title: string,
  description: string,
  steps: string[],
  distanceKm: number,
  durationMin: number,
  pace?: PaceRange,
  zone?: string,
): PlannedSession {
  return { id: `${date}-${type}`, date, type, title, description, steps, distanceKm, durationMin: Math.round(durationMin), pace, zone };
}

const WU = 2; // km calentamiento
const CD = 2; // km vuelta a la calma

function easyRun(date: string, km: number, p: TrainingPaces, phase: Phase): PlannedSession {
  const strides = phase !== "taper" && km >= 6;
  return mk(
    date,
    "easy",
    `Rodaje suave ${km} km`,
    "Ritmo conversacional. Si la FC sube de zona 2, baja el ritmo sin miedo.",
    [`${km} km a ritmo E (${fmtPaceRange(p.easy)})`, ...(strides ? ["Al final: 4 rectas de 20″ progresivas, recuperando andando"] : [])],
    km,
    km * avg(p.easy) / 60,
    p.easy,
    "Z2",
  );
}

function recoveryRun(date: string, km: number, p: TrainingPaces): PlannedSession {
  const pace = { fast: p.easy.slow, slow: p.easy.slow + 25 };
  return mk(date, "recovery", `Recuperación ${km} km`, "Muy suave, para soltar piernas.", [`${km} km muy suave (${fmtPaceRange(pace)})`], km, km * avg(pace) / 60, pace, "Z1");
}

function runWalkSession(date: string, km: number, w: number, p: TrainingPaces): PlannedSession {
  const run = Math.min(1 + w, 6);
  const walk = run >= 4 ? 1 : 1.5;
  const reps = Math.max(4, Math.round(30 / (run + walk)));
  const minutes = reps * (run + walk) + 10;
  return mk(
    date,
    "run_walk",
    `Correr-caminar ${reps}×(${run}′+${walk}′)`,
    "Método Galloway: alternar correr suave y caminar rápido. Construye base sin castigar articulaciones.",
    ["5′ caminando a buen ritmo", `${reps} × (${run}′ trote muy suave + ${walk}′ caminando)`, "5′ caminando"],
    Math.min(km, round1(minutes / (avg(p.easy) / 60) * 0.75)),
    minutes,
    p.easy,
    "Z1-Z2",
  );
}

function shakeout(date: string, p: TrainingPaces): PlannedSession {
  return mk(date, "easy", "Activación pre-carrera", "Soltar piernas, sin cansarse.", ["20′ muy suave", "4 rectas de 15″ a ritmo carrera"], 4, 24, p.easy, "Z2");
}

function longRun(date: string, km: number, c: SessionCtx): PlannedSession {
  const { paces: p, cat, phase, phaseIdx, recovery, racePaceFlat } = c;
  if (c.runWalk)
    return mk(date, "long", `Tirada larga correr-caminar ${km} km`, "Lo importante es el tiempo en pie, no el ritmo.", [`${km} km alternando 4′ trote / 1′ caminar`], km, km * (avg(p.easy) + 40) / 60, p.easy, "Z2");

  const specific = phase === "especifico" && !recovery && (cat === "marathon" || cat === "half");
  if (specific && phaseIdx % 2 === 1) {
    const fastKm = cat === "marathon" ? Math.min(14, Math.round(km * 0.4)) : Math.min(6, Math.round(km * 0.3));
    const pace = { fast: racePaceFlat - 2, slow: racePaceFlat + 3 };
    return mk(
      date,
      "long",
      `Tirada larga ${km} km con ${fastKm} km a ritmo carrera`,
      "Tirada específica: practica ritmo, geles e hidratación del día de la carrera.",
      [`${km - fastKm} km a ritmo E (${fmtPaceRange(p.easy)})`, `${fastKm} km a ritmo carrera (${fmtPaceRange(pace)})`],
      km,
      ((km - fastKm) * avg(p.easy) + fastKm * racePaceFlat) / 60,
      p.easy,
      "Z2→Z3",
    );
  }
  const progressive = phase === "construccion" && phaseIdx % 2 === 1 && !recovery && km >= 10;
  if (progressive)
    return mk(
      date,
      "long",
      `Tirada larga progresiva ${km} km`,
      "Empieza muy suave y termina a ritmo maratón los últimos 3 km.",
      [`${km - 3} km a ritmo E (${fmtPaceRange(p.easy)})`, `3 km a ritmo M (${fmtPaceRange(p.marathon)})`],
      km,
      ((km - 3) * avg(p.easy) + 3 * p.marathon.fast) / 60,
      p.easy,
      "Z2→Z3",
    );
  return mk(
    date,
    "long",
    `Tirada larga ${km} km`,
    "Ritmo cómodo y constante. Lleva agua si pasa de 75′.",
    [`${km} km a ritmo E (${fmtPaceRange(p.easy)})`],
    km,
    km * avg(p.easy) / 60,
    p.easy,
    "Z2",
  );
}

function workout(
  date: string,
  type: SessionType,
  title: string,
  description: string,
  main: string,
  mainKm: number,
  totalKm: number,
  pace: PaceRange,
  p: TrainingPaces,
  zone: string,
): PlannedSession {
  const total = Math.max(totalKm, mainKm + WU + CD);
  const easyPart = total - mainKm;
  return mk(
    date,
    type,
    title,
    description,
    [`Calentamiento ${WU} km suave + movilidad + 3 rectas`, main, `Vuelta a la calma: ${round1(easyPart - WU)} km suave`],
    round1(total),
    (easyPart * avg(p.easy) + mainKm * avg(pace)) / 60,
    pace,
    zone,
  );
}

function quality1(date: string, km: number, c: SessionCtx): PlannedSession {
  const { paces: p, cat, phase, phaseIdx, recovery, racePaceFlat, lvl } = c;
  if (c.runWalk) return runWalkSession(date, km, c.weekIdx, p);

  if (phase === "base" || recovery) {
    if (lvl <= 1 || recovery)
      return mk(
        date,
        "strides",
        `Rodaje + rectas ${km} km`,
        "Técnica y economía de carrera sin fatiga.",
        [`${km} km a ritmo E (${fmtPaceRange(p.easy)})`, "6 rectas de 20″ a ritmo R, recuperación andando 1′"],
        km,
        km * avg(p.easy) / 60 + 6,
        p.easy,
        "Z2",
      );
    return phaseIdx % 2 === 0
      ? workout(date, "hills", "Cuestas cortas", "Fuerza específica: subidas explosivas con buena técnica.", `${8 + phaseIdx} × 30″ en cuesta (6-8 %) fuerte, bajada trotando`, 2, km, p.repetition, p, "Z4-Z5")
      : workout(date, "fartlek", "Fartlek", "Cambios de ritmo por sensaciones.", `${6 + phaseIdx} × (1′ rápido a ritmo T-I + 1′ suave)`, 3, km, p.threshold, p, "Z3-Z4");
  }

  if (phase === "construccion") {
    const tKm = clamp(3 + phaseIdx, 3, lvl >= 3 ? 10 : 8);
    if (phaseIdx % 2 === 0)
      return workout(date, "tempo", `Tempo ${Math.round(tKm * avg(p.threshold) / 60)}′`, "Umbral: «cómodamente duro». Podrías decir frases cortas.", `${tKm} km continuos a ritmo T (${fmtPaceRange(p.threshold)})`, tKm, km, p.threshold, p, "Z4");
    const reps = Math.max(3, Math.round(tKm / 1.6));
    return workout(date, "tempo", `Cruceros ${reps}×1,6 km`, "Intervalos a umbral con recuperación corta.", `${reps} × 1,6 km a ritmo T (${fmtPaceRange(p.threshold)}), rec 1′ trote`, reps * 1.6, km, p.threshold, p, "Z4");
  }

  const rp = { fast: racePaceFlat - 2, slow: racePaceFlat + 2 };
  if (phase === "taper") {
    const reps = cat === "marathon" ? 3 : 4;
    const len = cat === "5k" || cat === "10k" ? 1 : 2;
    return workout(date, "race_pace", `Afinado ${reps}×${len} km a ritmo carrera`, "Mantener chispa sin acumular fatiga.", `${reps} × ${len} km a ritmo carrera (${fmtPaceRange(rp)}), rec 2′`, reps * len, km, rp, p, "Z3-Z4");
  }

  // Específico
  switch (cat) {
    case "marathon": {
      const mKm = clamp(6 + phaseIdx * 2, 6, 16);
      return workout(date, "marathon_pace", `${mKm} km a ritmo maratón`, "La sesión clave del maratón: automatizar el ritmo.", `${mKm} km a ritmo M (${fmtPaceRange(rp)})`, mKm, Math.max(km, mKm + 4), rp, p, "Z3");
    }
    case "half": {
      const reps = clamp(3 + Math.floor(phaseIdx / 2), 3, 5);
      return workout(date, "race_pace", `${reps}×3 km a ritmo media`, "Ritmo específico de media maratón.", `${reps} × 3 km a ritmo carrera (${fmtPaceRange(rp)}), rec 2′ trote`, reps * 3, km, rp, p, "Z3-Z4");
    }
    case "10k": {
      const reps = clamp(4 + Math.floor(phaseIdx / 2), 4, 6);
      return workout(date, "race_pace", `${reps}×1,6 km a ritmo 10K`, "Ritmo específico de 10K.", `${reps} × 1,6 km a ritmo carrera (${fmtPaceRange(rp)}), rec 90″`, reps * 1.6, km, rp, p, "Z4");
    }
    default: {
      const reps = clamp(4 + Math.floor(phaseIdx / 2), 4, 6);
      return workout(date, "intervals", `${reps}×1000 m a ritmo 5K`, "Ritmo específico de 5K.", `${reps} × 1000 m a ritmo carrera (${fmtPaceRange(rp)}), rec 2′ trote`, reps, km, rp, p, "Z5");
    }
  }
}

function quality2(date: string, km: number, c: SessionCtx): PlannedSession {
  const { paces: p, cat, phase, phaseIdx } = c;
  if (phase === "base") {
    const mKm = Math.min(5, 2 + phaseIdx);
    return mk(
      date,
      "easy",
      `Rodaje progresivo ${km} km`,
      "Empieza suave y termina a ritmo maratón: enseña a acabar fuerte sin fatiga.",
      [`${round1(km - mKm)} km a ritmo E (${fmtPaceRange(p.easy)})`, `${mKm} km a ritmo M (${fmtPaceRange(p.marathon)})`],
      km,
      ((km - mKm) * avg(p.easy) + mKm * avg(p.marathon)) / 60,
      p.easy,
      "Z2→Z3",
    );
  }

  if (phase === "construccion") {
    if ((cat === "marathon" || cat === "half") && phaseIdx % 2 === 1)
      return workout(date, "hills", "Cuestas largas", "Potencia aeróbica y fuerza.", `${5 + Math.floor(phaseIdx / 2)} × 90″ en cuesta fuerte, bajada trotando`, 3, km, p.interval, p, "Z4-Z5");
    const reps = clamp(4 + Math.floor(phaseIdx / 2), 4, 6);
    const len = cat === "marathon" ? 800 : 1000;
    return workout(date, "intervals", `${reps}×${len} m a ritmo I`, "VO2max: duro pero controlado, todas las series iguales.", `${reps} × ${len} m a ritmo I (${fmtPaceRange(p.interval)}), rec trote igual de largo`, (reps * len) / 1000, km, p.interval, p, "Z5");
  }

  if (phase === "taper" && cat === "5k")
    return workout(date, "repetitions", "6×200 m ágiles", "Velocidad sin fatiga.", `6 × 200 m a ritmo R (${fmtPaceRange(p.repetition)}), rec 200 m andando`, 1.2, km, p.repetition, p, "Z5");

  // Específico
  if (cat === "5k") {
    const reps = 8 + Math.min(4, phaseIdx);
    return workout(date, "repetitions", `${reps}×400 m a ritmo R`, "Velocidad y economía.", `${reps} × 400 m a ritmo R (${fmtPaceRange(p.repetition)}), rec 400 m trote`, reps * 0.4, km, p.repetition, p, "Z5");
  }
  if (cat === "10k") {
    const reps = clamp(5 + Math.floor(phaseIdx / 2), 5, 6);
    return workout(date, "intervals", `${reps}×1000 m a ritmo I`, "VO2max para tener margen a ritmo 10K.", `${reps} × 1000 m a ritmo I (${fmtPaceRange(p.interval)}), rec 2′30″`, reps, km, p.interval, p, "Z5");
  }
  const tKm = clamp(4 + phaseIdx, 4, 8);
  return workout(date, "tempo", `2×${tKm / 2} km a umbral`, "Mantener el umbral alto durante el bloque específico.", `2 × ${tKm / 2} km a ritmo T (${fmtPaceRange(p.threshold)}), rec 2′`, tKm, km, p.threshold, p, "Z4");
}

function raceSession(goal: Goal, pace: number, predicted: number): PlannedSession {
  const start = { fast: pace + 2, slow: pace + 6 };
  return mk(
    goal.date,
    "race",
    `🏁 ${goal.name}`,
    `Tiempo previsto: ${fmtDuration(predicted)} (${fmtPace(pace)} /km medio).`,
    [
      `Salida: primeros 3-5 km algo más lentos (${fmtPaceRange(start)}) — no te dejes llevar.`,
      `Cuerpo de la carrera a ${fmtPace(pace)} /km, ajustando por esfuerzo en las subidas.`,
      goal.distanceKm > 30 ? "Gel cada 30-40′ y agua en cada avituallamiento desde el km 5." : goal.distanceKm > 15 ? "Un gel hacia la mitad, agua en avituallamientos." : "Sin geles; agua solo si hace calor.",
      "Último 20 %: si vas bien, aprieta. Split negativo = carrera perfecta.",
    ],
    goal.distanceKm,
    predicted / 60,
    { fast: pace, slow: pace },
    "Carrera",
  );
}

const STRENGTH: Record<Phase, { title: string; steps: string[] }> = {
  base: {
    title: "Fuerza general",
    steps: ["3 rondas: sentadilla 12, zancadas 10/pierna, puente glúteo 15, plancha 40″, plancha lateral 30″/lado, elevación gemelos 15", "Movilidad de cadera y tobillo 5′"],
  },
  construccion: {
    title: "Fuerza + pliometría",
    steps: ["3 × 8 sentadilla búlgara (con peso)", "3 × 8 peso muerto rumano", "3 × 10 saltos al cajón / skipping", "3 × 15 gemelo excéntrico", "Core: dead bug 3×10, plancha 3×45″"],
  },
  especifico: {
    title: "Fuerza de mantenimiento",
    steps: ["2 × 8 sentadilla búlgara", "2 × 8 peso muerto rumano", "2 × 15 gemelo", "Core 10′", "Sin llegar al fallo"],
  },
  taper: { title: "Activación ligera", steps: ["2 rondas: puente glúteo 12, plancha 30″, monster walk con banda 10/lado", "Movilidad 10′"] },
};

function strengthSession(date: string, phase: Phase, k: number): PlannedSession {
  const s = STRENGTH[phase];
  return mk(date, "strength", s.title, k === 0 ? "Después de correr o en otro momento del día." : "Sesión complementaria.", s.steps, 0, phase === "taper" ? 20 : 35);
}

// ---------------- Cumplimiento ----------------

export interface SessionMatch {
  session: PlannedSession;
  activities: Activity[];
  doneKm: number;
  compliance: number; // 0-1
  status: "done" | "partial" | "missed" | "upcoming" | "today";
}

/** Empareja las sesiones planificadas con las actividades reales del mismo día. */
export function matchPlan(plan: Plan, acts: Activity[], today: string): Map<string, SessionMatch> {
  const byDate = new Map<string, Activity[]>();
  for (const a of acts) byDate.set(a.date, [...(byDate.get(a.date) ?? []), a]);
  const out = new Map<string, SessionMatch>();
  for (const w of plan.weeks)
    for (const s of w.sessions) {
      // primero lo registrado explícitamente para esta sesión; si no, lo del mismo día
      const linked = acts.filter((a) => a.sessionId === s.id);
      const dayActs = linked.length ? linked : (byDate.get(s.date) ?? []).filter((a) => !a.sessionId);
      const relevant = s.type === "strength" ? dayActs.filter((a) => a.sport === "strength") : dayActs.filter((a) => a.sport === "run" || a.sport === "walk");
      const doneKm = relevant.reduce((x, a) => x + a.distanceM / 1000, 0);
      const compliance = s.type === "strength" ? (relevant.length ? 1 : 0) : s.distanceKm ? Math.min(1, doneKm / s.distanceKm) : relevant.length ? 1 : 0;
      let status: SessionMatch["status"];
      if (s.date > today) status = "upcoming";
      else if (compliance >= 0.8) status = "done";
      else if (compliance > 0) status = "partial";
      else status = s.date === today ? "today" : "missed";
      out.set(s.id, { session: s, activities: relevant, doneKm, compliance, status });
    }
  return out;
}
