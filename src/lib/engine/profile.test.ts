import { describe, expect, it } from "vitest";
import { achievements, bestTimes, periodAverages, profileAverages, strengthSummary } from "./profile";
import type { Activity } from "../types";

const today = "2026-10-09";

let n = 0;
function act(date: string, km: number, min: number, extra: Partial<Activity> = {}): Activity {
  return {
    id: `a${n++}`,
    source: "manual",
    name: "Rodaje",
    sport: "run",
    sportRaw: "Run",
    date,
    startLocal: `${date}T08:00:00`,
    distanceM: km * 1000,
    movingSec: min * 60,
    elapsedSec: min * 60,
    elevationGainM: 0,
    ...extra,
  };
}

describe("Perfil", () => {
  it("mejores tiempos: mejor ritmo en carreras de esa distancia o más, marcando si es estimado", () => {
    const acts = [act("2026-09-01", 5, 27), act("2026-09-10", 10, 52), act("2026-09-20", 5.02, 30)];
    const bt = bestTimes(acts);
    const k5 = bt.find((b) => b.label === "5K")!;
    expect(k5.timeSec).toBe(26 * 60); // el 10K a 5:12/km es mejor ritmo que el 5K a 5:24/km
    expect(k5.exact).toBe(false);
    const k10 = bt.find((b) => b.label === "10K")!;
    expect(k10.timeSec).toBe(52 * 60);
    expect(k10.exact).toBe(true);
    expect(bt.find((b) => b.label === "Maratón")).toBeUndefined();
  });

  it("medias por bloques de 4 semanas", () => {
    const acts = [
      act("2026-10-08", 10, 50, { avgHr: 150 }),
      act("2026-10-01", 10, 50, { avgHr: 150 }),
      act("2026-09-05", 8, 48, { avgHr: 160 }),
      act("2026-10-07", 0, 40, { sport: "strength", sportRaw: "WeightTraining" }),
    ];
    const [now, prev] = periodAverages(acts, today);
    expect(now.kmPerWeek).toBe(5);
    expect(now.avgPace).toBe(300);
    expect(now.longestKm).toBe(10);
    expect(now.strengthPerWeek).toBe(0.25);
    expect(prev.avgPace).toBe(360);
    expect(now.ef!).toBeGreaterThan(prev.ef!);
  });

  it("resumen de fuerza y promedios de 6 semanas", () => {
    const acts = [
      act("2026-10-07", 0, 40, { sport: "strength", sportRaw: "WeightTraining" }),
      act("2026-09-30", 0, 30, { sport: "strength", sportRaw: "WeightTraining" }),
      act("2026-10-05", 12, 70),
      act("2026-09-20", 18, 110),
    ];
    const s = strengthSummary(acts, today);
    expect(s.total).toBe(2);
    expect(s.min28).toBe(70);
    expect(s.weeks).toHaveLength(12);
    expect(s.weeks.at(-1)).toEqual({ week: "2026-10-05", count: 1 });
    const avg = profileAverages(acts, today)!;
    expect(avg.weeklyKm).toBe(5);
    expect(avg.longestRunKm).toBe(18);
    expect(profileAverages([], today)).toBeUndefined();
  });

  it("logros: desbloqueados con fecha y progreso de los pendientes", () => {
    const acts = [act("2026-09-01", 5, 29, { startLocal: "2026-09-01T06:30:00" }), act("2026-09-02", 10, 60), act("2026-09-03", 6, 33)];
    const list = achievements(acts);
    const get = (id: string) => list.find((a) => a.id === id)!;
    expect(get("first-run")).toMatchObject({ unlocked: true, date: "2026-09-01" });
    expect(get("dist-10")).toMatchObject({ unlocked: true, date: "2026-09-02" });
    expect(get("dist-21.0975").unlocked).toBe(false);
    expect(get("dist-21.0975").progress).toBeCloseTo(10 / 21.0975);
    expect(get("pace-5K-1800")).toMatchObject({ unlocked: true, date: "2026-09-01" });
    expect(get("early").unlocked).toBe(true);
    expect(get("total-50").progress).toBeCloseTo(21 / 50);
    expect(get("streak-7").progress).toBeCloseTo(3 / 7);
  });
});
