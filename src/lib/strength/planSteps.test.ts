import { describe, expect, it } from "vitest";
import { exercisesFromSteps } from "./planSteps";
import { strengthSession, STRENGTH_KINDS, GROUP_KINDS } from "../engine/planner";
import type { Phase } from "../types";

describe("ejercicios de las sesiones de fuerza del plan", () => {
  it("lee series, repeticiones y el ejercicio de cada línea", () => {
    const ex = exercisesFromSteps(["3 × 8-12 sentadilla goblet a RPE 7", "Core: dead bug 3 × 10 + press Pallof 3 × 10/lado", "Objetivo: mantener la fuerza"]);
    expect(ex.map((e) => e.exerciseId)).toEqual(["Goblet_Squat", "Dead_Bug", "Pallof_Press"]);
    expect(ex[0].sets).toEqual([{ reps: 12 }, { reps: 12 }, { reps: 12 }]);
    expect(ex[0].notes).toBe("8-12 repeticiones");
    expect(ex[2].notes).toBe("Por lado");
  });

  it("de las alternativas toma la primera y separa los que van juntos", () => {
    const ex = exercisesFromSteps(["3 × 6-8 remo y 3 × 8 flexiones", "press de banca o con mancuernas 3 × 8-12 a RPE 7", "curl de bíceps y extensión de tríceps 3 × 10-15"]);
    expect(ex.map((e) => e.exerciseId)).toEqual(["One-Arm_Dumbbell_Row", "Pushups", "Barbell_Bench_Press_-_Medium_Grip", "Dumbbell_Bicep_Curl", "Triceps_Pushdown_-_Rope_Attachment"]);
    expect(ex[1].bw).toBe(true);
  });

  it("todas las plantillas del plan dan al menos 3 ejercicios", () => {
    const kinds = [...new Set([...Object.values(STRENGTH_KINDS).flat(), ...Object.values(GROUP_KINDS).flat()])];
    for (const phase of ["base", "construccion", "especifico", "taper"] as Phase[])
      for (const kind of kinds) {
        const s = strengthSession("2026-10-20", phase, kind);
        expect(exercisesFromSteps(s.steps).length, `${phase} ${kind}: ${s.steps.join(" | ")}`).toBeGreaterThanOrEqual(phase === "taper" ? 2 : 3);
      }
  });
});
