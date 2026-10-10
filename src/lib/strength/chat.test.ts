import { describe, expect, it } from "vitest";
import { chatContext, chatEquipment, chatExerciseList, chatReplyFromAi } from "./chat";
import type { Db } from "../types";

describe("chat de fuerza", () => {
  it("valida las rutinas propuestas: ejercicios que existen y que puede hacer con su material", () => {
    const out = chatReplyFromAi(
      {
        reply: "Aquí tienes.",
        routines: [
          { name: "Torso", exercises: [{ id: "Pushups", sets: 3, reps: "8-12", superset: 1 }, { id: "Barbell_Bench_Press_-_Medium_Grip", sets: 3, reps: "5" }, { id: "Dumbbell_Bench_Press", sets: 3, reps: "10", kg: 20, superset: 1 }, { id: "inventado" }] },
          { name: "Vacía", exercises: [{ id: "Pushups" }] },
        ],
      },
      ["corporal", "mancuernas", "banco"],
      "2026-10-10T00:00:00Z",
    );
    expect(out.text).toBe("Aquí tienes.");
    expect(out.routines).toHaveLength(1);
    expect(out.routines[0]).toMatchObject({ name: "Torso", folder: "Entrenador IA" });
    expect(out.routines[0].exercises.map((e) => [e.exerciseId, e.superset])).toEqual([
      ["Pushups", 1],
      ["Dumbbell_Bench_Press", 1],
    ]);
  });

  it("sin lugares apuntados se le ofrece todo el catálogo; con lugares, solo lo que puede hacer", () => {
    expect(chatEquipment({})).toContain("maquinas");
    const home = chatExerciseList(chatEquipment({ places: [{ id: "c", name: "Casa", equipment: ["corporal", "mancuernas"] }] }));
    expect(home).toContain("Dumbbell_Bicep_Curl |");
    expect(home).not.toContain("Barbell_Squat |");
  });

  it("el contexto resume lo entrenado las últimas 4 semanas con la mejor serie", () => {
    const db: Db = {
      activities: [
        { id: "a", source: "manual", name: "F", sport: "strength", sportRaw: "strength", date: "2026-10-01", startLocal: "2026-10-01T18:00:00", distanceM: 0, movingSec: 1, elapsedSec: 1, elevationGainM: 0, workout: { exercises: [{ exerciseId: "Barbell_Squat", name: "Sentadilla", sets: [{ kg: 60, reps: 10 }, { kg: 70, reps: 5 }] }] } },
        { id: "b", source: "manual", name: "F", sport: "strength", sportRaw: "strength", date: "2026-08-01", startLocal: "2026-08-01T18:00:00", distanceM: 0, movingSec: 1, elapsedSec: 1, elevationGainM: 0, workout: { exercises: [{ exerciseId: "Pushups", name: "Flexiones", sets: [{ reps: 10 }] }] } },
      ],
    };
    const ctx = chatContext(db, "2026-10-10");
    expect(ctx.entrenosUltimas4Semanas).toEqual([{ nombre: "Sentadilla", sesiones: 1, mejorSerie: "70 kg × 5", ultimaVez: "2026-10-01" }]);
    expect(ctx.corre).toBe(false);
  });
});
