import { describe, expect, it } from "vitest";
import { CATALOG, activePlace, allExercises, findExercise } from "./catalog";
import { CATEGORIES, EQUIPMENT, MUSCLES, canDo } from "./labels";
import type { CustomExercise } from "../types";

describe("catálogo de ejercicios", () => {
  it("tiene los ejercicios traducidos con ids únicos y datos válidos", () => {
    expect(CATALOG.length).toBeGreaterThan(850);
    expect(new Set(CATALOG.map((x) => x.id)).size).toBe(CATALOG.length);
    const eq = new Set<string>(EQUIPMENT.map((e) => e.id));
    const mus = new Set<string>(MUSCLES.map((m) => m.id));
    const cats = new Set<string>(CATEGORIES.map((c) => c.id));
    for (const x of CATALOG) {
      expect(x.name.length, x.id).toBeGreaterThan(2);
      expect(x.steps.length, x.id).toBeGreaterThan(0);
      expect(cats.has(x.cat), x.id).toBe(true);
      expect(x.eq.length, x.id).toBeGreaterThan(0);
      expect(x.eq.every((e) => eq.has(e)), x.id).toBe(true);
      expect([...x.muscles, ...x.secondary].every((m) => mus.has(m)), x.id).toBe(true);
    }
  });

  it("incluye los ejercicios de corredor añadidos", () => {
    expect(CATALOG.find((x) => x.id === "rio_copenhagen_plank")?.muscles).toEqual(["aductores"]);
    expect(CATALOG.find((x) => x.id === "rio_pogo_jumps")?.cat).toBe("pliometria");
  });

  it("filtra por material: el peso corporal siempre vale", () => {
    expect(canDo(["corporal"], [])).toBe(true);
    expect(canDo(["mancuernas", "banco"], ["mancuernas"])).toBe(false);
    expect(canDo(["mancuernas", "banco"], ["mancuernas", "banco"])).toBe(true);
    const sinMaterial = CATALOG.filter((x) => canDo(x.eq, ["corporal"]) && x.cat === "fuerza");
    expect(sinMaterial.length).toBeGreaterThan(40);
  });

  it("mezcla los ejercicios propios con el catálogo", () => {
    const mine: CustomExercise = { id: "c_1", name: "Aaa mi ejercicio", cat: "fuerza", eq: ["corporal"], muscles: ["gluteos"], secondary: [], steps: [], createdAt: "2026-10-10" };
    const all = allExercises({ customExercises: [mine] });
    expect(all[0].id).toBe("c_1");
    expect(all[0].custom).toBe(true);
    expect(findExercise({ customExercises: [mine] }, "c_1")?.name).toBe("Aaa mi ejercicio");
    expect(findExercise({}, "Barbell_Squat")?.name).toBe("Sentadilla trasera con barra");
  });

  it("elige el lugar activo o el primero", () => {
    const places = [
      { id: "a", name: "Casa", equipment: ["mancuernas" as const] },
      { id: "b", name: "Gimnasio", equipment: ["barra" as const] },
    ];
    expect(activePlace({ places })?.id).toBe("a");
    expect(activePlace({ places, activePlaceId: "b" })?.id).toBe("b");
    expect(activePlace({})).toBeUndefined();
  });
});
