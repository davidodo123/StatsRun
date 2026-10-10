import { describe, expect, it } from "vitest";
import { cleanRoutineExercises, cleanWorkout, estimate1RM, fmtLoad, lastSets, routineHistory, workoutReps, workoutSets, workoutVolume } from "./workouts";
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
});
