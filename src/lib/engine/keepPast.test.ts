import { describe, expect, it } from "vitest";
import { generatePlan, generateSeason, keepPastWeeks } from "./planner";
import type { Profile } from "../types";

// lunes 26 oct 2026 a domingo 1 nov; se rehace el jueves 29
const profile: Profile = {
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
  availableDays: [0, 1, 2, 4, 6],
  longRunDay: 4,
  strengthPerWeek: 3,
};
const goal = { name: "Media", distanceKm: 21.0975, date: "2027-01-10" };
const make = (today: string) => generatePlan({ profile, goal, currentVdot: 35, currentWeeklyKm: 20, longestRecentKm: 10, today });

describe("rehacer el plan a mitad de semana", () => {
  const old = make("2026-10-19"); // empezó la semana anterior
  const fresh = make("2026-10-29");
  const merged = keepPastWeeks(old, fresh, "2026-10-29");
  const weekOf = (p: typeof old, start: string) => p.weeks.find((w) => w.start === start)!;

  it("conserva las semanas ya pasadas", () => {
    expect(merged.weeks[0].start).toBe("2026-10-19");
    expect(weekOf(merged, "2026-10-19").sessions).toEqual(weekOf(old, "2026-10-19").sessions);
    expect(merged.weeks.map((w) => w.index)).toEqual(merged.weeks.map((_, i) => i));
  });

  it("los días pasados de esta semana se quedan como estaban (no salen como descanso)", () => {
    const before = weekOf(old, "2026-10-26").sessions.filter((s) => s.date < "2026-10-29");
    expect(before.length).toBeGreaterThan(0);
    expect(weekOf(merged, "2026-10-26").sessions.filter((s) => s.date < "2026-10-29")).toEqual(before);
  });

  it("no mete en los días que quedan más fuerza de la que quedaba", () => {
    const left = (p: typeof old) => weekOf(p, "2026-10-26").sessions.filter((s) => s.date >= "2026-10-29" && s.type === "strength").length;
    expect(left(merged)).toBeLessThanOrEqual(left(old));
  });

  it("de la semana que viene en adelante, el plan nuevo", () => {
    expect(weekOf(merged, "2026-11-02").sessions).toEqual(weekOf(fresh, "2026-11-02").sessions);
  });

  it("sin plan anterior, el nuevo tal cual", () => {
    expect(keepPastWeeks(undefined, fresh, "2026-10-29")).toBe(fresh);
  });
});

describe("fuerza ya hecha esta semana", () => {
  const old = generatePlan({ profile, goal, currentVdot: 35, currentWeeklyKm: 20, longestRecentKm: 10, today: "2026-10-29" }); // un plan que ya perdió el lunes-miércoles
  const fresh = generatePlan({ profile, goal, currentVdot: 35, currentWeeklyKm: 20, longestRecentKm: 10, today: "2026-10-29" });
  const left = (p: typeof old) => p.weeks[0].sessions.filter((s) => s.type === "strength").length;

  it("con las 3 de la semana hechas, no queda ninguna", () => {
    expect(left(keepPastWeeks(old, fresh, "2026-10-29", { perWeek: 3, doneThisWeek: 3 }))).toBe(0);
  });

  it("con 1 hecha de 3, quedan como mucho 2", () => {
    expect(left(keepPastWeeks(old, fresh, "2026-10-29", { perWeek: 3, doneThisWeek: 1 }))).toBeLessThanOrEqual(2);
  });
});

describe("dos objetivos muy seguidos", () => {
  it("la segunda carrera se queda en su día aunque caiga en la recuperación de la primera", () => {
    const main = { name: "Ultra", distanceKm: 50, date: "2027-03-20" };
    const plan = generateSeason({ profile, goal: main, currentVdot: 40, currentWeeklyKm: 40, longestRecentKm: 15, today: "2026-10-29" }, [{ name: "Media", distanceKm: 21.0975, date: "2027-03-16" }]);
    const races = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type === "race").map((s) => s.date);
    expect(races).toEqual(["2027-03-16", "2027-03-20"]);
    expect(plan.warnings.some((w) => w.includes("Ultra"))).toBe(true);
  });
});

describe("no da tiempo a preparar la carrera", () => {
  it("quien no corre y tiene un 10K en 4 semanas: solo rodajes, sin series ni ritmos de carrera", () => {
    const novato: Profile = { ...profile, level: "nuevo", weeklyKm: 0, longestRunKm: 0 };
    const plan = generatePlan({ profile: novato, goal: { name: "10K", distanceKm: 10, date: "2026-11-26" }, currentVdot: 30, currentWeeklyKm: 0, longestRecentKm: 0, today: "2026-10-29" });
    const quality = plan.weeks.flatMap((w) => w.sessions).filter((s) => ["tempo", "intervals", "repetitions", "race_pace", "hills", "fartlek", "marathon_pace"].includes(s.type));
    expect(quality).toEqual([]);
    expect(plan.notes.some((n) => n.startsWith("No da tiempo"))).toBe(true);
  });
});

describe("rehacer el plan con la carrera ya corrida", () => {
  it("la carrera no se duplica cada vez que se rehace", () => {
    const race = { name: "15K", distanceKm: 15, date: "2026-10-04" };
    const input = (today: string) => ({ profile, goal: race, currentVdot: 38, currentWeeklyKm: 25, longestRecentKm: 12, today });
    let plan = generatePlan(input("2026-08-20"));
    for (const today of ["2026-10-06", "2026-10-07", "2026-10-08"]) plan = keepPastWeeks(plan, generatePlan(input(today)), today);
    const races = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type === "race");
    expect(races.map((s) => s.date)).toEqual(["2026-10-04"]);
  });
});

describe("planes que ya traían la carrera repetida", () => {
  it("al rehacer, se queda una", () => {
    const race = { name: "15K", distanceKm: 15, date: "2026-10-04" };
    const input = (today: string) => ({ profile, goal: race, currentVdot: 38, currentWeeklyKm: 25, longestRecentKm: 12, today });
    const old = generatePlan(input("2026-08-20"));
    const week = old.weeks.find((w) => w.sessions.some((s) => s.type === "race"))!;
    week.sessions.push(...week.sessions.filter((s) => s.type === "race"));
    const plan = keepPastWeeks(old, generatePlan(input("2026-10-06")), "2026-10-06");
    expect(plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type === "race")).toHaveLength(1);
  });
});

describe("carrera principal pocos días después de otra A", () => {
  it("su día queda solo con la carrera (sin el rodaje que había)", () => {
    // como prueba-1792 (semilla 303): todos los días, 90 km/semana, 50 km tres días después de un 5K A
    const main = { name: "Ultra", distanceKm: 50, date: "2026-11-13" };
    const all: Profile = { ...profile, sex: "female", age: 48, weightKg: 95, heightCm: 174, weeklyKm: 90, longestRunKm: 22, availableDays: [0, 1, 2, 3, 4, 5, 6], daysPerWeek: 7, strengthPerWeek: 2 };
    const plan = generateSeason({ profile: all, goal: main, currentVdot: 40, currentWeeklyKm: 90, longestRecentKm: 22, today: "2026-11-03" }, [{ name: "5K", distanceKm: 5, date: "2026-11-10" }, { name: "5K b", distanceKm: 5, date: "2026-12-21" }]);
    const that = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date === "2026-11-13");
    expect(that.map((s) => s.type)).toEqual(["race"]);
  });
});
