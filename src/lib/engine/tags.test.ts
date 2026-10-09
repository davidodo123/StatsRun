import { describe, expect, it } from "vitest";
import { activityTags } from "./tags";
import type { Activity } from "../types";

let n = 0;
const run = (date: string, km: number, min: number, extra: Partial<Activity> = {}): Activity => ({
  id: `r${n++}`,
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
});

const labels = (m: Map<string, { label: string }[]>, a: Activity) => (m.get(a.id) ?? []).map((t) => t.label);

describe("Etiquetas de sesión", () => {
  it("primer 5K, luego récord solo si es más rápido", () => {
    const a = run("2026-09-01", 5, 30);
    const b = run("2026-09-03", 5, 31);
    const c = run("2026-09-05", 5, 28);
    const t = activityTags([c, a, b]);
    expect(labels(t, a)).toEqual(["Primer 5K"]);
    expect(labels(t, b)).toEqual([]);
    expect(labels(t, c)).toContain("Récord 5K");
  });

  it("una carrera de 10K solo marca la mayor distancia que cubre", () => {
    const a = run("2026-09-01", 10, 60);
    expect(labels(activityTags([a]), a)).toEqual(["Primer 10K"]);
  });

  it("más larga, más desnivel y mejor ritmo del mes con historial suficiente", () => {
    const base = [run("2026-09-01", 4, 24), run("2026-09-03", 4, 24, { elevationGainM: 60 }), run("2026-09-05", 4, 24)];
    const big = run("2026-09-07", 8, 44, { elevationGainM: 120 });
    const t = activityTags([...base, big]);
    expect(labels(t, big)).toEqual(expect.arrayContaining(["Tu carrera más larga", "Más desnivel", "Mejor ritmo del mes"]));
    // sin historial no hay «más larga»
    expect(labels(t, base[0])).not.toContain("Tu carrera más larga");
  });

  it("mayor carga cuando se pasa la función de carga", () => {
    const acts = Array.from({ length: 6 }, (_, i) => run(`2026-09-0${i + 1}`, 3 + i, 20 + i * 6));
    const t = activityTags(acts, (a) => a.movingSec);
    expect(labels(t, acts[5])).toContain("Mayor carga");
    expect(labels(t, acts[2])).not.toContain("Mayor carga");
  });
});
