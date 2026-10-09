import { describe, expect, it } from "vitest";
import { assessReadiness, type ReadinessInput } from "./readiness";
import type { Activity } from "../types";

const today = "2026-10-09";

function run(date: string, extra: Partial<Activity> = {}): Activity {
  return {
    id: `${date}-${Math.random()}`,
    source: "manual",
    name: "Rodaje",
    sport: "run",
    sportRaw: "Run",
    date,
    startLocal: `${date}T08:00:00`,
    distanceM: 8000,
    movingSec: 2700,
    elapsedSec: 2700,
    elevationGainM: 0,
    ...extra,
  };
}

function input(over: Partial<ReadinessInput> & { acwr?: number; tsb?: number } = {}): ReadinessInput {
  const { acwr = 1.0, tsb = -5, ...rest } = over;
  return {
    stats: { acwr, today: { date: today, load: 50, ctl: 50, atl: 55, tsb }, monotony: 1.2, paceTrend: [] },
    activities: [],
    today,
    missed14d: 0,
    ...rest,
  };
}

describe("Diagnóstico de estado de forma", () => {
  it("carga controlada y entrenos fáciles → progresar en fase de adaptación", () => {
    const r = assessReadiness(input({ activities: [run("2026-10-08", { feel: "facil" })] }));
    expect(r.phase).toBe("adaptacion");
    expect(r.verdict).toBe("progresar");
    expect(r.limits.maxSessionKmFactor).toBeGreaterThan(1);
  });

  it("subida brusca de carga → alarma y mantener", () => {
    const r = assessReadiness(input({ acwr: 1.4 }));
    expect(r.phase).toBe("alarma");
    expect(r.verdict).toBe("mantener");
    expect(r.limits.maxSessionKmFactor).toBe(1);
  });

  it("dos señales de mala recuperación (checklist de Helms) → agotamiento y descarga", () => {
    const r = assessReadiness(
      input({
        activities: [
          run("2026-10-07", { feel: "duro", feelings: "He dormido fatal esta semana" }),
          run("2026-10-08", { feel: "muy_duro", feelings: "piernas cargadas" }),
        ],
      }),
    );
    expect(r.check.malDescanso).toBe(true);
    expect(r.check.rendimientoBaja).toBe(true);
    expect(r.phase).toBe("agotamiento");
    expect(r.verdict).toBe("descargar");
    expect(r.limits.maxSessionKmFactor).toBeLessThan(1);
  });

  it("solo molestias → recuperar sin calidad", () => {
    const r = assessReadiness(input({ activities: [run("2026-10-08", { feel: "bien", feelings: "Molestia en el gemelo derecho" })] }));
    expect(r.check.molestias).toBe(true);
    expect(r.verdict).toBe("recuperar");
    expect(r.limits.qualityAllowed).toBe(false);
  });

  it("carga baja lejos de la carrera → desentrenamiento; cerca de la carrera es afinamiento", () => {
    expect(assessReadiness(input({ acwr: 0.6, raceDate: "2026-12-20" })).phase).toBe("desentrenamiento");
    expect(assessReadiness(input({ acwr: 0.6, tsb: 10, raceDate: "2026-10-15" })).phase).toBe("supercompensacion");
  });

  it("caída de eficiencia (más pulsaciones al mismo ritmo) cuenta como bajada de rendimiento", () => {
    const paceTrend = [1.1, 1.1, 1.1, 1.1, 1.0, 1.0].map((ef, i) => ({ week: `w${i}`, ef }));
    const r = assessReadiness({ ...input(), stats: { ...input().stats, paceTrend } });
    expect(r.signals.efChangePct).toBeLessThan(-5);
    expect(r.check.rendimientoBaja).toBe(true);
  });

  it("tope por sesión: tirada más larga de 30 días + 10 % (Frandsen 2025)", () => {
    const r = assessReadiness(
      input({
        activities: [
          run("2026-10-08", { distanceM: 8000 }),
          run("2026-09-20", { distanceM: 14000 }),
          run("2026-08-20", { distanceM: 25000 }), // fuera de la ventana de 30 días
        ],
      }),
    );
    expect(r.signals.longestRun30dKm).toBe(14);
    expect(r.limits.maxSessionKm).toBe(15.4);
  });

  it("síntomas de enfermedad → recuperar sin calidad", () => {
    const r = assessReadiness(input({ activities: [run("2026-10-08", { feel: "bien", feelings: "Algo de fiebre y catarro" })] }));
    expect(r.signals.illness).toBe(true);
    expect(r.verdict).toBe("recuperar");
    expect(r.limits.qualityAllowed).toBe(false);
  });
});
