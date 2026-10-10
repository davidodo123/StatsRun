import { describe, expect, it } from "vitest";
import { exerciseListForAi, routinesFromAi } from "./aiRoutines";

describe("rutinas de la IA de fuerza", () => {
  it("el catálogo para la IA no incluye halterofilia ni strongman", () => {
    const list = exerciseListForAi();
    expect(list).toContain("Goblet_Squat |");
    expect(list).not.toContain("Atlas_Stones");
    expect(list).not.toContain("Snatch |");
  });

  it("valida la respuesta: material conocido, ejercicios que existen y que puede hacer", () => {
    const out = routinesFromAi(
      {
        equipment: ["kettlebell", "mancuernas", "bandas", "dominadas", "nave espacial"],
        summary: "Unilaterales y pliometría para la media.",
        routines: [
          {
            kind: "pierna",
            block: "fuerza",
            name: "Pierna · Fuerza",
            exercises: [
              { id: "Split_Squat_with_Dumbbells", sets: 4, reps: "5-6", kg: 18, restSec: 150 }, // pide banco: no lo tiene
              { id: "Goblet_Squat", sets: 3, reps: "8-12", kg: 16, restSec: 95 },
              { id: "Barbell_Squat", sets: 4, reps: "5", kg: 100 }, // barra y jaula: no
              { id: "rio_pogo_jumps", sets: 3, reps: "15" },
              { id: "inventado", sets: 3, reps: "10" },
            ],
          },
          { kind: "superior", block: "base", exercises: [{ id: "Pullups", sets: 3, reps: "4-6" }, { id: "Pushups", sets: 9, reps: "10-15" }] },
          { kind: "patas", block: "base", exercises: [] },
        ],
      },
      "2026-10-10T00:00:00Z",
    );
    expect(out.equipment).toEqual(["corporal", "kettlebell", "mancuernas", "bandas", "dominadas"]);
    expect(out.routines).toHaveLength(2);
    const legs = out.routines[0];
    expect(legs).toMatchObject({ id: "r_ia_pierna_fuerza", source: "ia", kind: "pierna", phases: ["construccion", "especifico"] });
    expect(legs.exercises.map((e) => e.exerciseId)).toEqual(["Goblet_Squat", "rio_pogo_jumps"]);
    expect(legs.exercises[0].sets).toEqual([{ reps: 8, kg: 16 }, { reps: 8, kg: 16 }, { reps: 8, kg: 16 }]);
    expect(legs.exercises[0].restSec).toBe(90);
    expect(legs.exercises[0].notes).toContain("Rango 8-12");
    expect(legs.exercises[1].bw).toBe(true);
    const upper = out.routines[1];
    expect(upper.name).toBe("Superior · Base");
    expect(upper.phases).toEqual(["base"]);
    expect(upper.exercises[1].sets).toHaveLength(3); // 9 series no: se queda en 3 por defecto
  });
});
