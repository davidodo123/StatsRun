import { describe, expect, it } from "vitest";
import { cleanRoutineExercises, cleanWorkout, estimate1RM, fmtLoad, exerciseHistory, lastSets, muscleSets, nextTarget, platesFor, routineHistory, strengthRecords, workoutReps, workoutSets, workoutVolume } from "./workouts";
import type { Activity } from "../types";

const act = (id: string, date: string, workout: Activity["workout"], movingSec = 3600): Activity => ({
  id,
  source: "manual",
  name: "Fuerza",
  sport: "strength",
  sportRaw: "strength",
  date,
  startLocal: `${date}T18:00:00`,
  distanceM: 0,
  movingSec,
  elapsedSec: movingSec,
  elevationGainM: 0,
  workout,
});

describe("rutinas y entrenos", () => {
  it("limpia la rutina del editor: ejercicios que existen, números válidos y como mucho 20 series", () => {
    const out = cleanRoutineExercises(
      [
        { exerciseId: "Barbell_Squat", sets: [{ kg: "80,5", reps: "5", type: "calentamiento" }, { kg: -3, reps: 6 }, ...Array(30).fill({})], restSec: 120 },
        { exerciseId: "no-existe", sets: [{}] },
        { exerciseId: "Pushups", sets: [] },
      ],
      (id) => id !== "no-existe",
    );
    expect(out).toHaveLength(2);
    expect(out[0].sets[0]).toEqual({ type: "calentamiento", kg: 80.5, reps: 5 });
    expect(out[0].sets[1]).toEqual({ reps: 6 });
    expect(out[0].sets).toHaveLength(20);
    expect(out[0].restSec).toBe(120);
    expect(out[1].sets).toEqual([{}]);
  });

  it("guarda del entreno solo las series hechas (también sin datos)", () => {
    const w = cleanWorkout(
      {
        routineId: "r1",
        exercises: [
          { exerciseId: "Barbell_Squat", sets: [{ kg: 60, reps: 8, done: true, type: "calentamiento" }, { kg: 100, reps: 5, done: true, rir: 2 }, { kg: 100, reps: 5, done: false }] },
          { exerciseId: "Pushups", sets: [{ done: true }] },
          { exerciseId: "x", sets: [{ reps: 3, done: true }] },
        ],
      },
      (id) => ({ Barbell_Squat: "Sentadilla", Pushups: "Flexiones" })[id],
    );
    expect(w.routineId).toBe("r1");
    expect(w.exercises).toHaveLength(2);
    expect(w.exercises[0].sets).toEqual([{ type: "calentamiento", kg: 60, reps: 8 }, { kg: 100, reps: 5, rir: 2 }]);
    expect(w.exercises[1].sets).toEqual([{}]);
    // el calentamiento no cuenta en el volumen
    expect(workoutVolume(w)).toBe(500);
    expect(workoutReps(w)).toBe(5);
    expect(workoutSets(w)).toBe(2);
  });

  it("con peso corporal la carga es el peso del perfil más el lastre", () => {
    const w = cleanWorkout({ exercises: [{ exerciseId: "Pushups", bw: true, sets: [{ reps: 10, done: true }, { kg: 10, reps: 5, done: true }] }] }, () => "Flexiones", 70);
    expect(w.exercises[0]).toMatchObject({ bw: true, bodyKg: 70 });
    expect(workoutVolume(w)).toBe(70 * 10 + 80 * 5);
    expect(fmtLoad(true, 10)).toBe("PC + 10 kg");
    expect(fmtLoad(true)).toBe("PC");
    expect(fmtLoad(false, 80)).toBe("80 kg");
    expect(fmtLoad(false, 62.5)).toBe("62,5 kg");
    expect(cleanRoutineExercises([{ exerciseId: "Pushups", bw: true, sets: [{}] }], () => true)[0].bw).toBe(true);
  });

  it("1RM de Epley solo hasta 12 repeticiones", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(113.3, 1);
    expect(estimate1RM(100, 20)).toBeUndefined();
  });

  it("«anterior» es la última vez que se hizo cada ejercicio y el historial va por rutina", () => {
    const acts = [
      act("a", "2026-10-01", { routineId: "r1", exercises: [{ exerciseId: "Barbell_Squat", name: "S", sets: [{ kg: 90, reps: 5 }] }] }),
      act("b", "2026-10-05", { routineId: "r1", exercises: [{ exerciseId: "Barbell_Squat", name: "S", sets: [{ kg: 95, reps: 5 }] }] }, 2700),
      act("c", "2026-10-07", { exercises: [{ exerciseId: "Pushups", name: "F", sets: [{ reps: 20 }] }] }),
    ];
    expect(lastSets(acts).Barbell_Squat.sets).toEqual([{ kg: 95, reps: 5 }]);
    expect(lastSets(acts).Pushups.sets).toEqual([{ reps: 20 }]);
    expect(routineHistory(acts, "r1", "2026-10-02")).toEqual([{ date: "2026-10-05", volume: 475, reps: 5, minutes: 45 }]);
  });

  it("progresión doble: sube el peso al llegar al tope del rango en todas las series", () => {
    const ex = (reps: number[], kg = 60, bw = false) => ({ exerciseId: "Barbell_Squat", name: "Sentadilla", bw, sets: [{ type: "calentamiento" as const, kg: 40, reps: 5 }, ...reps.map((r) => ({ kg, reps: r }))] });
    expect(nextTarget(ex([12, 12, 12]), { reps: 8, kg: 60 }, undefined, ["barra"])).toMatchObject({ kg: 62.5, reps: 8, up: true });
    expect(nextTarget(ex([10, 9, 8]), { reps: 8, kg: 60 }, undefined, ["barra"])).toMatchObject({ kg: 60, reps: 9 });
    expect(nextTarget(ex([6, 6, 6]), { reps: 4 }, "Rango 4-6: …", ["mancuernas"])).toMatchObject({ kg: 62, reps: 4, up: true });
    expect(nextTarget(ex([10, 10], 0, true), undefined, undefined, ["dominadas"])).toMatchObject({ reps: 11 });
    expect(nextTarget(ex([12, 12]), { reps: 8, kg: 70 }, undefined, ["barra"])).toBeUndefined(); // la rutina ya pide más
    expect(nextTarget(undefined, { reps: 8 }, undefined, ["barra"])).toBeUndefined();
  });

  it("récord al subir de peso; la primera vez no cuenta", () => {
    const sq = (kg: number) => ({ exercises: [{ exerciseId: "Barbell_Squat", name: "Sentadilla", sets: [{ type: "calentamiento" as const, kg: kg + 50, reps: 1 }, { kg, reps: 5 }] }] });
    const pull = (reps: number) => ({ exercises: [{ exerciseId: "Pullups", name: "Dominadas", bw: true, sets: [{ reps }] }] });
    const recs = strengthRecords([act("a", "2026-10-01", sq(60)), act("b", "2026-10-03", sq(60)), act("c", "2026-10-05", sq(62.5)), act("d", "2026-10-06", pull(8)), act("e", "2026-10-08", pull(9))]);
    expect(recs.has("a")).toBe(false);
    expect(recs.has("b")).toBe(false);
    expect(recs.get("c")).toEqual([{ exerciseId: "Barbell_Squat", name: "Sentadilla", kind: "peso", value: 62.5, prev: 60 }]);
    expect(recs.get("e")?.[0]).toMatchObject({ kind: "reps", value: 9, prev: 8 });
  });

  it("historial de un ejercicio: 1RM, más peso, volumen y repeticiones por sesión", () => {
    const sq = (sets: { kg: number; reps: number }[]) => ({ exercises: [{ exerciseId: "Barbell_Squat", name: "Sentadilla", sets: [{ type: "calentamiento" as const, kg: 100, reps: 3 }, ...sets] }] });
    const h = exerciseHistory([act("b", "2026-10-05", sq([{ kg: 62.5, reps: 8 }, { kg: 60, reps: 12 }])), act("a", "2026-10-01", sq([{ kg: 60, reps: 10 }])), act("c", "2026-10-06", { exercises: [] })], "Barbell_Squat");
    expect(h.map((p) => p.activityId)).toEqual(["a", "b"]);
    expect(h[1]).toMatchObject({ topKg: 62.5, volume: 1220, reps: 20, maxReps: 12, oneRm: 82 });
    expect(h[1].best).toEqual({ kg: 60, reps: 12 });
  });

  it("series por músculo: 1 por principal y ½ por los que ayudan, sin calentamientos ni fechas viejas", () => {
    const w = (sets: number) => ({ exercises: [{ exerciseId: "Barbell_Squat", name: "Sentadilla", sets: [{ type: "calentamiento" as const }, ...Array(sets).fill({ kg: 60, reps: 5 })] }] });
    const info = () => ({ muscles: ["cuadriceps" as const], secondary: ["gluteos" as const, "isquios" as const] });
    expect(muscleSets([act("a", "2026-10-01", w(3)), act("b", "2026-10-08", w(4))], "2026-10-04", info)).toEqual({ cuadriceps: 4, gluteos: 2, isquios: 2 });
  });

  it("discos por lado", () => {
    expect(platesFor(100)).toEqual({ side: [25, 15], left: 0 });
    expect(platesFor(62.5)).toEqual({ side: [20, 1.25], left: 0 });
    expect(platesFor(61)).toEqual({ side: [20], left: 0.5 });
    expect(platesFor(20)).toEqual({ side: [], left: 0 });
    expect(platesFor(50, 15)).toEqual({ side: [15, 2.5], left: 0 });
  });
});

