import { describe, expect, it } from "vitest";
import { generatePlan, keepPastWeeks } from "./planner";
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
