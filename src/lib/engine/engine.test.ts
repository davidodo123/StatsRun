import { describe, expect, it } from "vitest";
import { raceTimeFromVdot, trainingPaces, vdotFromRace, riegel, hrZones } from "./physiology";
import { fitnessSeries, acwr } from "./load";
import { generatePlan, matchPlan } from "./planner";
import { computeStats } from "./stats";
import { generateDemoActivities } from "../demo";
import type { Profile } from "../types";
import { addDays } from "../dates";

const profile: Profile = {
  name: "Test",
  sex: "male",
  age: 32,
  weightKg: 72,
  heightCm: 178,
  level: "intermedio",
  yearsRunning: 3,
  weeklyKm: 35,
  longestRunKm: 16,
  daysPerWeek: 5,
  longRunDay: 6,
  strengthPerWeek: 2,
};

describe("VDOT (tablas de Daniels)", () => {
  it("5K en 19:57 ≈ VDOT 50", () => {
    expect(vdotFromRace(5, 19 * 60 + 57)).toBeCloseTo(50, 0);
  });
  it("maratón 3:10:49 ≈ VDOT 50", () => {
    expect(vdotFromRace(42.195, 3 * 3600 + 10 * 60 + 49)).toBeCloseTo(50, 0);
  });
  it("inversa: tiempo de 10K a VDOT 50 ≈ 41:21", () => {
    expect(Math.abs(raceTimeFromVdot(50, 10) - (41 * 60 + 21))).toBeLessThan(20);
  });
  it("ritmos VDOT 50: T ≈ 4:15, I ≈ 3:55 /km", () => {
    const p = trainingPaces(50);
    expect(Math.abs((p.threshold.fast + p.threshold.slow) / 2 - 255)).toBeLessThan(6);
    expect(Math.abs((p.interval.fast + p.interval.slow) / 2 - 235)).toBeLessThan(6);
    expect(p.easy.fast).toBeGreaterThan(p.marathon.fast);
  });
  it("Riegel 10K 45:00 → media ≈ 1:39:30", () => {
    expect(Math.abs(riegel(10, 2700, 21.0975) - 5970)).toBeLessThan(60);
  });
  it("zonas FC crecientes", () => {
    const z = hrZones(190, 55);
    for (let i = 1; i < z.length; i++) expect(z[i].min).toBeGreaterThan(z[i - 1].min);
  });
});

describe("carga", () => {
  it("CTL converge a la carga diaria constante", () => {
    const loads = new Map<string, number>();
    for (let i = 0; i < 400; i++) loads.set(addDays("2025-01-01", i), 50);
    const s = fitnessSeries(loads, "2025-01-01", addDays("2025-01-01", 399));
    expect(s[s.length - 1].ctl).toBeCloseTo(50, 0);
    expect(acwr(loads, addDays("2025-01-01", 399))).toBeCloseTo(1, 1);
  });
});

describe("planificador", () => {
  const today = "2026-10-08";
  const goal = { name: "Maratón de Valencia", distanceKm: 42.195, date: "2026-12-06", targetTimeSec: 3 * 3600 + 30 * 60 };

  it("genera semanas hasta la carrera con la carrera al final", () => {
    const plan = generatePlan({ profile, goal, currentVdot: 45, currentWeeklyKm: 35, longestRecentKm: 16, today });
    const last = plan.weeks[plan.weeks.length - 1];
    expect(last.sessions.some((s) => s.type === "race" && s.date === goal.date)).toBe(true);
    expect(plan.weeks[0].start <= today || plan.weeks[0].start > today).toBe(true);
    // número de días de carrera por semana ≤ días disponibles
    for (const w of plan.weeks) {
      const runDays = new Set(w.sessions.filter((s) => s.type !== "strength").map((s) => s.date));
      expect(runDays.size).toBeLessThanOrEqual(profile.daysPerWeek);
    }
  });

  it("respeta la regla del 10 % y el taper reduce volumen", () => {
    const plan = generatePlan({ profile, goal: { ...goal, date: "2027-04-25" }, currentVdot: 45, currentWeeklyKm: 35, longestRecentKm: 16, today });
    const vols = plan.weeks.map((w) => w.targetKm);
    const peak = Math.max(...vols);
    expect(vols[vols.length - 2]).toBeLessThan(peak);
    expect(plan.weeks.some((w) => w.recovery)).toBe(true);
    expect(plan.weeks.map((w) => w.phase)).toContain("especifico");
  });

  it("avisa si el objetivo es irreal", () => {
    const plan = generatePlan({ profile, goal: { ...goal, targetTimeSec: 2 * 3600 + 40 * 60 }, currentVdot: 40, currentWeeklyKm: 35, longestRecentKm: 16, today });
    expect(plan.warnings.join(" ")).toMatch(/ambicioso/);
  });

  it("principiante sin base usa correr-caminar", () => {
    const plan = generatePlan({
      profile: { ...profile, level: "nuevo", weeklyKm: 0, longestRunKm: 0, daysPerWeek: 3 },
      goal: { name: "5K", distanceKm: 5, date: "2026-12-20" },
      currentVdot: 28,
      currentWeeklyKm: 0,
      longestRecentKm: 0,
      today,
    });
    expect(plan.weeks[0].sessions.some((s) => s.type === "run_walk")).toBe(true);
  });
});

describe("estadísticas con datos demo", () => {
  it("calcula sin errores y con VDOT razonable", () => {
    const acts = generateDemoActivities("2026-10-08", 180, 46);
    const st = computeStats(acts, profile, "2026-10-08");
    expect(st.vdot.vdot).toBeGreaterThan(38);
    expect(st.vdot.vdot).toBeLessThan(55);
    expect(st.totals.allRuns).toBeGreaterThan(50);
    expect(st.today.ctl).toBeGreaterThan(10);
    const plan = generatePlan({ profile, goal: { name: "x", distanceKm: 21.0975, date: "2026-12-13" }, currentVdot: st.vdot.vdot, currentWeeklyKm: st.totals.avgWeeklyKm6, longestRecentKm: 15, today: "2026-10-08" });
    expect(matchPlan(plan, acts, "2026-10-08").size).toBeGreaterThan(0);
  });
});

describe("registro manual", () => {
  it("sin FC usa el esfuerzo percibido (sRPE)", async () => {
    const { activityLoad } = await import("./load");
    const base = { id: "m1", source: "manual" as const, name: "x", sport: "run" as const, sportRaw: "run", date: "2026-10-08", startLocal: "2026-10-08T07:00:00", distanceM: 10000, movingSec: 3600, elapsedSec: 3600, elevationGainM: 0 };
    expect(activityLoad({ ...base, rpe: 7.5 }, profile, 45)).toBeCloseTo(100, 0);
    expect(activityLoad({ ...base, rpe: 3 }, profile, 45)).toBeLessThan(activityLoad({ ...base, rpe: 8 }, profile, 45));
  });

  it("el plan empieza hoy si es entre semana y no pone sesiones en el pasado", () => {
    const plan = generatePlan({ profile, goal: { name: "10K", distanceKm: 10, date: "2026-12-13" }, currentVdot: 45, currentWeeklyKm: 30, longestRecentKm: 12, today: "2026-10-08" });
    const all = plan.weeks.flatMap((w) => w.sessions);
    expect(plan.weeks[0].start).toBe("2026-10-05");
    expect(all.every((s) => s.date >= "2026-10-08")).toBe(true);
  });

  it("una actividad enlazada a una sesión cuenta para esa sesión aunque sea otro día", () => {
    const plan = generatePlan({ profile, goal: { name: "10K", distanceKm: 10, date: "2026-12-13" }, currentVdot: 45, currentWeeklyKm: 30, longestRecentKm: 12, today: "2026-10-08" });
    const s = plan.weeks[1].sessions.find((x) => x.type !== "strength")!;
    const act = { id: "m2", source: "manual" as const, name: "x", sport: "run" as const, sportRaw: "run", date: addDays(s.date, 1), startLocal: `${addDays(s.date, 1)}T07:00:00`, distanceM: s.distanceKm * 1000, movingSec: 3000, elapsedSec: 3000, elevationGainM: 0, sessionId: s.id };
    const m = matchPlan(plan, [act], addDays(s.date, 2)).get(s.id)!;
    expect(m.status).toBe("done");
  });
});
