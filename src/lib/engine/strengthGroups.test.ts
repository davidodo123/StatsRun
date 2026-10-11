import { describe, expect, it } from "vitest";
import { generatePlan, legDayOf } from "./planner";
import { applyStrengthRoutines } from "../strength/routinePlan";
import type { Profile } from "../types";

const profile = (p: Partial<Profile> = {}): Profile => ({
  name: "D",
  sex: "male",
  age: 22,
  weightKg: 80,
  heightCm: 177,
  level: "principiante",
  yearsRunning: 1,
  weeklyKm: 20,
  longestRunKm: 10,
  daysPerWeek: 5,
  availableDays: [0, 1, 2, 3, 4],
  longRunDay: 4,
  strengthPerWeek: 3,
  ...p,
});
const goal = { name: "Media", distanceKm: 21.0975, date: "2026-12-20" };
const plan = (p: Partial<Profile> = {}) => generatePlan({ profile: profile(p), goal, currentVdot: 35, currentWeeklyKm: 20, longestRecentKm: 10, today: "2026-10-11" });
const week = (pl: ReturnType<typeof plan>, i: number) => {
  const w = pl.weeks[i];
  const day = (s: { date: string }) => (Date.parse(s.date) - Date.parse(w.start)) / 864e5;
  return {
    run: w.sessions.filter((s) => s.type !== "strength").map(day),
    strength: w.sessions.filter((s) => s.type === "strength").map((s) => [day(s), s.strengthKind]),
  };
};

describe("fuerza por grupos", () => {
  it("lunes pecho, martes espalda, miércoles pierna sin correr; 4 días de carrera con la tirada el viernes", () => {
    const w = week(plan({ strengthStyle: "grupos" }), 0);
    expect(w.run).toEqual([0, 1, 3, 4]);
    expect(w.strength).toEqual([
      [0, "pecho"],
      [1, "espalda"],
      [2, "pierna"],
    ]);
    expect(plan({ strengthStyle: "grupos" }).weeks[0].sessions.find((s) => s.date.endsWith("-14"))?.description).toMatch(/hoy no se corre/);
  });

  it("fuerza general: se corre los 5 días", () => {
    const w = week(plan(), 0);
    expect(w.run).toEqual([0, 1, 2, 3, 4]);
    expect(w.strength).toHaveLength(3);
  });

  it("el día de pierna, dos días antes de la tirada; con 3 días o menos no se quita ninguno", () => {
    expect(legDayOf([0, 1, 2, 3, 4, 5, 6], 6)).toBe(4);
    expect(legDayOf([0, 2, 4, 6], 6)).toBe(4);
    expect(legDayOf([1, 3, 5, 6], 6)).toBe(3);
    expect(legDayOf([1, 3, 6], 6)).toBeUndefined();
    const w = week(plan({ strengthStyle: "grupos", availableDays: [1, 3, 6], longRunDay: 6 }), 0);
    expect(w.run).toEqual([1, 3, 6]);
  });

  it("con 4 días de fuerza, el cuarto es hombro; en afinamiento y semana de carrera se corre todos los días", () => {
    const pl = plan({ strengthStyle: "grupos", strengthPerWeek: 4, availableDays: [0, 1, 2, 3, 4, 5, 6], longRunDay: 6 });
    expect(week(pl, 1).strength.map(([, k]) => k).sort()).toEqual(["espalda", "hombro", "pecho", "pierna"]);
    expect(week(pl, 1).run).not.toContain(4);
    const taper = pl.weeks.findIndex((w) => w.phase === "taper");
    expect(week(pl, taper).strength.map(([, k]) => k)).toEqual(["completo"]);
  });

  it("al rehacer la fuerza con las rutinas, el día de pierna sigue diciendo que no se corre", () => {
    const pl = plan({ strengthStyle: "grupos" });
    applyStrengthRoutines(pl, [], "2026-10-11");
    const leg = pl.weeks[0].sessions.find((s) => s.strengthKind === "pierna")!;
    expect(leg.description).toMatch(/hoy no se corre/);
    const chest = pl.weeks[0].sessions.find((s) => s.strengthKind === "pecho")!;
    expect(chest.title).toBe("Pecho y tríceps");
  });

  it("una rutina propia de pecho va el día de pecho, no el de espalda", () => {
    const pl = plan({ strengthStyle: "grupos" });
    const mine = { id: "r1", name: "Mi pecho", zone: "superior" as const, group: "pecho" as const, steps: ["3 × 10 Press de banca a 60 kg"], durationMin: 30, covers: ["empuje" as const] };
    applyStrengthRoutines(pl, [mine], "2026-10-11");
    const byKind = Object.fromEntries(pl.weeks[0].sessions.filter((s) => s.type === "strength").map((s) => [s.strengthKind, s.routineId]));
    expect(byKind).toEqual({ pecho: "r1", espalda: undefined, pierna: undefined });
  });
});
