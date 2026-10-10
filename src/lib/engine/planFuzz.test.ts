// Planificador con muchas combinaciones: en todas, el plan tiene que cumplir sus reglas básicas.
import { describe, expect, it } from "vitest";
import { availableDaysOf, generatePlan, isLowerKind } from "./planner";
import { addDays, diffDays, weekday } from "../dates";
import type { Level, PlannedSession, Profile } from "../types";

const LEVELS: Level[] = ["nuevo", "principiante", "intermedio", "avanzado"];
const DISTANCES = [5, 10, 21.0975, 42.195];
const TODAYS = ["2026-10-05", "2026-10-08", "2026-10-10", "2026-10-11"]; // lunes, jueves, sábado y domingo

function profileFor(i: number): Profile {
  const level = LEVELS[i % 4];
  const days = 2 + (i % 6); // 2-7
  return {
    name: "Fuzz",
    sex: i % 2 ? "female" : "male",
    age: 20 + (i % 45),
    weightKg: 50 + (i % 60), // también IMC alto
    heightCm: 155 + (i % 40),
    level,
    yearsRunning: i % 10,
    weeklyKm: [0, 10, 30, 60, 90][i % 5],
    longestRunKm: [0, 5, 12, 20, 30][i % 5],
    daysPerWeek: days,
    ...(i % 3 === 0 ? { availableDays: [0, 2, 4, 5, 6].slice(0, Math.max(2, days % 6)) } : {}),
    longRunDay: [6, 5, 0][i % 3],
    strengthPerWeek: i % 5, // 0-4
  };
}

const runOf = (s: PlannedSession) => s.type !== "strength";

describe("planificador con muchas combinaciones", () => {
  let n = 0;
  for (let i = 0; i < 120; i++) {
    const profile = profileFor(i);
    const today = TODAYS[i % TODAYS.length];
    const km = DISTANCES[i % DISTANCES.length];
    const weeksOut = [3, 8, 16, 24][(i >> 2) % 4];
    const goal = { name: "Carrera", distanceKm: km, date: addDays(today, weeksOut * 7 + (i % 7)), targetTimeSec: undefined };
    it(`#${n++} ${profile.level} · ${km} km · ${weeksOut} sem · ${profile.daysPerWeek} días · fuerza ${profile.strengthPerWeek}`, () => {
      const plan = generatePlan({ profile, goal, currentVdot: 30 + (i % 25), currentWeeklyKm: profile.weeklyKm, longestRecentKm: profile.longestRunKm, today });
      const sessions = plan.weeks.flatMap((w) => w.sessions);
      const avail = availableDaysOf(profile);

      // la carrera, el último día y una sola vez
      const races = sessions.filter((s) => s.type === "race");
      expect(races.map((s) => s.date)).toEqual([goal.date]);
      for (const s of sessions) {
        // nada en el pasado ni después de la carrera
        expect(s.date >= today).toBe(true);
        expect(s.date <= goal.date).toBe(true);
        // números y textos válidos
        expect(s.title?.trim().length).toBeGreaterThan(0);
        if (s.distanceKm !== undefined) expect(Number.isFinite(s.distanceKm) && s.distanceKm >= 0).toBe(true);
        if (s.durationMin !== undefined) expect(Number.isFinite(s.durationMin) && s.durationMin >= 0).toBe(true);
      }
      expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length);

      for (const w of plan.weeks) {
        expect(Number.isFinite(w.targetKm) && w.targetKm >= 0).toBe(true);
        // la carrera objetivo cae el día que sea: no cuenta como día de entreno
        const runs = w.sessions.filter((s) => runOf(s) && s.type !== "race");
        const runDays = new Set(runs.map((s) => s.date));
        // como mucho una sesión de carrera por día y nunca más días de los que tiene
        expect(runDays.size).toBe(runs.length);
        expect(runDays.size).toBeLessThanOrEqual(avail.length);
        // solo en sus días (la carrera objetivo cae donde caiga)
        for (const s of runs) if (s.type !== "race") expect(avail).toContain(weekday(s.date));
        // fuerza: no más de lo pedido; nunca la víspera de la carrera, y la de pierna tampoco la víspera de la tirada larga
        // si había otro día libre de esa semana
        const strength = w.sessions.filter((s) => s.type === "strength");
        expect(strength.length).toBeLessThanOrEqual(profile.strengthPerWeek);
        for (const st of strength) {
          const next = sessions.filter((s) => diffDays(s.date, st.date) === 1);
          expect(next.some((s) => s.type === "race")).toBe(false);
          if (isLowerKind(st.strengthKind) && next.some((s) => s.type === "long")) {
            const longDate = next.find((s) => s.type === "long")!.date;
            const otherDays = runs.map((s) => s.date).filter((d) => d !== st.date && diffDays(longDate, d) !== 1 && !w.sessions.some((x) => x.type === "strength" && x.date === d));
            expect(otherDays, `fuerza de pierna el ${st.date}, víspera de la tirada, habiendo otros días`).toEqual([]);
          }
        }
      }
      // el afinamiento nunca carga más que la semana más dura del plan, y no hay sesiones vacías
      const build = plan.weeks.filter((w) => w.phase !== "taper");
      if (build.length) {
        const top = Math.max(...build.map((w) => w.targetKm));
        for (const w of plan.weeks.filter((x) => x.phase === "taper")) {
          const raceKm = w.sessions.filter((s) => s.type === "race").reduce((t, s) => t + (s.distanceKm ?? 0), 0);
          expect(w.targetKm - raceKm).toBeLessThanOrEqual(top + 1);
        }
      }
      for (const s of sessions) if (s.type !== "strength") expect(s.distanceKm ?? s.durationMin ?? 0).toBeGreaterThan(0);
      // la tirada larga no crece más de un 10 % (mín. 0,5 km) sobre la más larga de las 4 semanas anteriores
      const longs = sessions.filter((s) => s.type === "long" && s.distanceKm).sort((a, b) => a.date.localeCompare(b.date));
      for (let k = 0; k < longs.length; k++) {
        // también cuenta la tirada más larga que ya hacía antes del plan
        const prev = [...longs.filter((x) => x.date < longs[k].date && diffDays(longs[k].date, x.date) <= 28).map((x) => x.distanceKm!), ...(diffDays(longs[k].date, today) <= 28 && profile.longestRunKm ? [profile.longestRunKm] : [])];
        if (prev.length) expect(longs[k].distanceKm!).toBeLessThanOrEqual(Math.max(...prev) * 1.1 + 0.51);
      }
    });
  }
});
