// Datos raros o malintencionados (llegan del navegador) y cálculos sin datos: nada debe romper.
import { describe, expect, it } from "vitest";
import { cleanRoutineExercises, cleanWorkout, exerciseHistory, lastSets, muscleSets, nextTarget, platesFor, strengthRecords, workoutVolume } from "./strength/workouts";
import { chatReplyFromAi } from "./strength/chat";
import { routinesFromAi } from "./strength/aiRoutines";
import { computeStats, estimateVdot } from "./engine/stats";
import { activityTags } from "./engine/tags";
import type { Profile } from "./types";

const JUNK: unknown[] = [null, undefined, 0, "", "texto", 42, true, [], {}, [null], [{}], { exercises: "no" }, { exercises: [null, 3, "x"] }, NaN, -1, 1e308];

describe("entradas basura", () => {
  it("rutinas y entrenos: nunca rompen y solo guardan lo válido", () => {
    for (const j of JUNK) {
      expect(() => cleanRoutineExercises(j, () => true)).not.toThrow();
      expect(() => cleanWorkout(j, () => "x")).not.toThrow();
      expect(cleanWorkout(j, () => "x").exercises.every((e) => e.sets.length > 0)).toBe(true);
    }
    const w = cleanWorkout(
      {
        routineId: { evil: 1 },
        exercises: [
          { exerciseId: "a", sets: [{ done: true, kg: "1e9", reps: "-3", rir: 99, type: "<script>" }, { done: true, kg: "62,5", reps: "8" }, { done: false, kg: 100, reps: 10 }] },
          { exerciseId: "__proto__", sets: [{ done: true }] },
          { exerciseId: "a", notes: "x".repeat(5000), sets: Array(500).fill({ done: true, kg: 10, reps: 10 }) },
        ],
      },
      (id) => (id === "a" ? "Ejercicio" : undefined),
    );
    expect(w.routineId).toBeUndefined();
    expect(w.exercises).toHaveLength(2);
    expect(w.exercises[0].sets).toEqual([{}, { kg: 62.5, reps: 8 }]); // fuera de rango → vacío; no hecha → fuera
    expect(w.exercises[1].sets.length).toBeLessThanOrEqual(20);
    expect(w.exercises[1].notes!.length).toBeLessThanOrEqual(200);
    expect(Number.isFinite(workoutVolume(w))).toBe(true);
  });

  it("respuestas de la IA mal formadas no rompen ni cuelan ejercicios inventados", () => {
    for (const j of JUNK) {
      expect(() => chatReplyFromAi(j as never, ["corporal"], "t")).not.toThrow();
      expect(() => routinesFromAi(j as never, "t")).not.toThrow();
    }
    const r = chatReplyFromAi({ reply: 7, routines: [{ name: 5, exercises: [{ id: "Pushups", sets: "muchas", reps: "mil" }, { id: "Pullups", sets: 99, kg: -5 }] }] }, ["corporal", "dominadas"], "t");
    expect(r.routines[0].name).toBe("Rutina 1");
    expect(r.routines[0].exercises.every((e) => e.sets.length >= 1 && e.sets.length <= 6)).toBe(true);
    expect(r.text).toBe("Te propongo estas rutinas:");
  });

  it("discos y progresión con valores extremos", () => {
    expect(platesFor(0)).toEqual({ side: [], left: 0 });
    expect(platesFor(-50)).toEqual({ side: [], left: 0 });
    expect(platesFor(1000).side.length).toBeGreaterThan(10);
    expect(nextTarget({ exerciseId: "x", name: "x", sets: [{ type: "calentamiento", kg: 20, reps: 5 }] }, undefined, undefined, [])).toBeUndefined();
    expect(nextTarget({ exerciseId: "x", name: "x", sets: [{ kg: 20 }] }, undefined, undefined, [])).toBeUndefined();
  });
});

describe("sin datos (usuario nuevo)", () => {
  const profile: Profile = { name: "Nueva", sex: "female", age: 30, weightKg: 60, heightCm: 165, level: "nuevo", yearsRunning: 0, weeklyKm: 0, longestRunKm: 0, daysPerWeek: 3, longRunDay: 6, strengthPerWeek: 0 };
  it("estadísticas, VDOT y etiquetas con cero actividades", () => {
    expect(() => computeStats([], profile, "2026-10-10")).not.toThrow();
    const s = computeStats([], profile, "2026-10-10");
    expect(Number.isFinite(s.vdot.vdot)).toBe(true);
    expect(Number.isFinite(estimateVdot([], undefined, "2026-10-10").vdot)).toBe(true);
    expect(activityTags([]).size).toBe(0);
  });
  it("fuerza sin entrenos", () => {
    expect(lastSets([])).toEqual({});
    expect(strengthRecords([]).size).toBe(0);
    expect(exerciseHistory([], "x")).toEqual([]);
    expect(muscleSets([], "2026-10-01", () => undefined)).toEqual({});
  });
});
