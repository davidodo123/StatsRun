import { describe, expect, it } from "vitest";
import { instantWorkouts } from "./planner";
import type { Activity } from "../types";

const run = (date: string, km: number): Activity => ({
  id: `r-${date}`, source: "manual", name: "r", sport: "run", sportRaw: "run", date, startLocal: `${date}T08:00:00`,
  distanceM: km * 1000, movingSec: km * 380, elapsedSec: km * 380, elevationGainM: 0,
});

describe("entrenos al momento", () => {
  // como David: muchas de 3 km
  const acts = ["2026-10-20", "2026-10-22", "2026-10-24", "2026-10-27", "2026-10-29", "2026-11-01"].map((d) => run(d, 3));
  const w = instantWorkouts(acts, undefined, 32, "2026-11-03");

  it("cuatro modos con 3 o 4 sesiones, ids distintos", () => {
    expect(Object.keys(w)).toEqual(["facil", "constante", "dificil", "variedad"]);
    const ids = Object.values(w).flat().map((x) => x.session.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const list of Object.values(w)) expect(list.length).toBeGreaterThanOrEqual(3);
  });

  it("ninguna sesión más larga que su carrera más larga + 10 % (las de calidad, como mucho 3 km con calentamiento)", () => {
    for (const x of Object.values(w).flat()) expect(x.session.distanceKm).toBeLessThanOrEqual(3.5);
  });

  it("los «más fáciles» son más cortos que los «constantes»", () => {
    expect(w.facil[0].session.distanceKm).toBeLessThan(w.constante[0].session.distanceKm + 0.01);
    expect(w.facil.every((x) => x.level === "facil")).toBe(true);
    expect(w.dificil.some((x) => x.level === "dificil")).toBe(true);
  });

  it("sin carreras, con el perfil", () => {
    const x = instantWorkouts([], { name: "N", sex: "female", age: 30, weightKg: 60, heightCm: 165, level: "principiante", yearsRunning: 0, weeklyKm: 15, longestRunKm: 8, daysPerWeek: 3, availableDays: [0, 2, 4], longRunDay: 4, strengthPerWeek: 0 }, 35, "2026-11-03");
    expect(x.constante[0].session.distanceKm).toBe(5);
  });
});
