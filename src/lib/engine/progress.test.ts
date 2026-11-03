import { describe, expect, it } from "vitest";
import { bestTimes, predictionTrend, suggestedTarget, targetProgress, weekEffort, weeklyProgress } from "./progress";
import type { Activity, Profile } from "../types";

const profile: Profile = { name: "D", sex: "male", age: 30, weightKg: 70, heightCm: 175, level: "intermedio", yearsRunning: 2, weeklyKm: 25, longestRunKm: 12, daysPerWeek: 4, availableDays: [0, 2, 4, 6], longRunDay: 6, strengthPerWeek: 0 };
const run = (date: string, km: number, min: number, extra: Partial<Activity> = {}): Activity => ({
  id: `r-${date}-${km}`,
  source: "manual",
  name: `Carrera ${date}`,
  sport: "run",
  sportRaw: "run",
  date,
  startLocal: `${date}T08:00:00`,
  distanceM: km * 1000,
  movingSec: min * 60,
  elapsedSec: min * 60,
  elevationGainM: 20,
  ...extra,
});

// martes 3 nov 2026; la semana va del lunes 2 al domingo 8
const today = "2026-11-03";
const acts: Activity[] = [
  run("2026-10-06", 5, 30), run("2026-10-08", 5, 30), run("2026-10-13", 6, 36), run("2026-10-15", 5, 30),
  run("2026-10-20", 6, 35), run("2026-10-22", 5, 29), run("2026-10-27", 8, 46), run("2026-10-29", 5, 28),
  run("2026-11-02", 3, 18, { efforts: { 1000: 330, 1609: 545 } }),
  run("2026-11-03", 5, 28, { efforts: { 1000: 320, 1609: 530, 5000: 1680 } }),
  { ...run("2026-11-01", 0, 45), sport: "strength", id: "fuerza" },
];

describe("progreso de la semana", () => {
  it("12 semanas, la última la actual, con km, tiempo y desnivel", () => {
    const w = weeklyProgress(acts, today, "run");
    expect(w).toHaveLength(12);
    expect(w.at(-1)).toMatchObject({ week: "2026-11-02", km: 8, sec: 46 * 60, elev: 40, count: 2 });
    expect(w.at(-2)).toMatchObject({ week: "2026-10-26", km: 13, count: 2 });
  });
  it("con «todos los deportes» cuenta también la fuerza", () => {
    expect(weeklyProgress(acts, today, "all").at(-2)!.count).toBe(3);
  });
});

describe("mejores tiempos", () => {
  it("récord y segundo mejor de cada distancia", () => {
    const b = bestTimes(acts);
    expect(b.filter((x) => x.distance === 1000).map((x) => [x.sec, x.medal])).toEqual([[320, 1], [330, 2]]);
    expect(b.filter((x) => x.distance === 5000)).toHaveLength(1);
  });
});

describe("esfuerzo de la semana", () => {
  const e = weekEffort(acts, profile, 40, today);
  it("rango con la media de las 4 semanas anteriores", () => {
    expect(e.range[0]).toBeGreaterThan(0);
    expect(e.range[1]).toBeGreaterThan(e.range[0]);
    expect(e.lastWeek).toBeGreaterThan(0);
  });
  it("acumulado día a día hasta hoy", () => {
    expect(e.daily).toHaveLength(2);
    expect(e.daily[1]).toBe(e.score);
  });
});

describe("tendencia de la predicción", () => {
  it("un punto por semana y hoy al final", () => {
    const p = predictionTrend(acts, profile, today, 10);
    expect(p).toHaveLength(7);
    expect(p.at(-1)!.date).toBe(today);
    expect(p.every((x) => x.sec > 1800 && x.sec < 5400)).toBe(true);
  });
});

describe("objetivos", () => {
  it("semana: carreras desde el lunes", () => {
    expect(targetProgress(acts, { id: "a", period: "week", metric: "count", sport: "run", value: 3 }, today).done).toBe(2);
  });
  it("mes: km de octubre", () => {
    const r = targetProgress(acts, { id: "b", period: "month", metric: "km", sport: "run", value: 100 }, "2026-10-20");
    expect(r).toMatchObject({ from: "2026-10-01", to: "2026-10-31", done: 45 });
  });
  it("sugerido: carreras por semana con lo de las últimas 4", () => {
    expect(suggestedTarget(acts, today)).toMatchObject({ period: "week", metric: "count", value: 2 });
  });
});
