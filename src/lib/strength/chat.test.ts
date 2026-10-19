import { describe, expect, it } from "vitest";
import { activityFromAi, chatContext, chatEquipment, chatExerciseList, chatReplyFromAi, unavailableFromText } from "./chat";
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
    expect(chatEquipment({}).equipment).toContain("maquinas");
    const home = chatExerciseList(chatEquipment({ places: [{ id: "c", name: "Casa", equipment: ["corporal", "mancuernas"] }] }).equipment);
    expect(home).toContain("Dumbbell_Bicep_Curl |");
    expect(home).not.toContain("Barbell_Squat |");
  });

  it("el material de este mensaje manda sobre sus lugares", () => {
    const db = { places: [{ id: "c", name: "Casa", equipment: ["corporal" as const, "mancuernas" as const] }, { id: "g", name: "Gimnasio", equipment: ["corporal" as const, "barra" as const, "maquinas" as const] }] };
    expect(chatEquipment(db, "Hoy entreno en casa").equipment).toEqual(["corporal", "mancuernas"]);
    expect(chatEquipment(db, "Estoy en mi casa, ¿qué hago?").from).toContain("Casa");
    expect(chatEquipment(db, "Me he casado y...").from).toBeUndefined(); // «casado» no es «casa»
    expect(chatEquipment(db, "Hoy sin material, solo mi cuerpo").equipment).toEqual(["corporal"]);
    expect(chatEquipment(db, "Solo tengo una kettlebell y bandas").equipment.sort()).toEqual(["bandas", "corporal", "kettlebell"]);
    expect(chatEquipment(db, "¿Cómo progreso en sentadilla?")).toEqual({ equipment: ["corporal", "mancuernas", "barra", "maquinas"] });
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

describe("entrenos y cambios del plan desde el chat", () => {
  const today = "2026-10-18";

  it("deja lista una carrera con lo que contó", () => {
    const a = activityFromAi({ tipo: "run", fecha: today, nombre: "Rodaje", km: "8", tiempo: "45:00", sensacion: "duro", comoSeSintio: "Me ha costado", rpe: 7 }, {}, today);
    expect(a).toEqual({ sport: "run", date: today, name: "Rodaje", distanceKm: 8, durationSec: 2700, rpe: 7, feel: "duro", feelings: "Me ha costado" });
  });

  it("fuerza: ejercicios que existen y tiempo estimado por series", () => {
    const a = activityFromAi({ tipo: "strength", fecha: "2026-10-17", ejercicios: [{ id: "Barbell_Squat", series: [{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }, { kg: 60, reps: 10 }] }, { id: "no-existe", series: [{ reps: 5 }] }] }, {}, today)!;
    expect(a.exercises).toHaveLength(1);
    expect(a.exercises![0].sets).toEqual([{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }, { kg: 60, reps: 10 }]);
    expect(a.durationSec).toBe(3 * 240);
  });

  it("no registra sin tiempo, en el futuro ni con ritmos imposibles", () => {
    expect(activityFromAi({ tipo: "run", fecha: today, km: 8 }, {}, today)).toBeUndefined();
    expect(activityFromAi({ tipo: "run", fecha: "2026-10-19", km: 8, tiempo: "45:00" }, {}, today)).toBeUndefined();
    expect(activityFromAi({ tipo: "run", fecha: today, km: 20, tiempo: "40:00" }, {}, today)).toBeUndefined();
  });

  it("el cambio del plan solo se ofrece si tiene plan", () => {
    const raw = { reply: "Te dejo 3 días esta semana.", ajustarPlan: "Esta semana (del 2026-10-19 al 2026-10-25) solo puede entrenar 3 días" };
    expect(chatReplyFromAi(raw, ["corporal"], `${today}T10:00:00Z`, {}).planRequest).toBeUndefined();
    const plan = { goal: { name: "10K", distanceKm: 10, date: "2026-12-01" } } as never;
    expect(chatReplyFromAi(raw, ["corporal"], `${today}T10:00:00Z`, { plan }).planRequest).toContain("3 días");
  });
});

describe("ejercicios por nombre", () => {
  it("acepta el nombre del ejercicio si la IA no pone el id", () => {
    const a = activityFromAi({ tipo: "strength", fecha: "2026-10-17", tiempo: "40:00", ejercicios: [{ id: "Sentadilla con barra", series: [{ kg: 70, reps: 8 }] }, { id: "press de banca", series: [{ kg: 50, reps: 10 }] }] }, {}, "2026-10-18")!;
    expect(a.exercises?.map((e) => e.exerciseId)).toEqual(["Barbell_Squat", "Barbell_Bench_Press_-_Medium_Grip"]);
    expect(a.durationSec).toBe(2400);
  });
});

describe("días sin entrenar desde el chat", () => {
  it("solo fechas de hoy a 30 días y solo con plan", () => {
    const plan = { goal: { name: "10K", distanceKm: 10, date: "2026-12-01" } } as never;
    const raw = { reply: "Hecho.", diasSinEntrenar: ["2026-10-21", "2026-10-19", "2026-10-10", "mañana", "2026-10-19"] };
    expect(chatReplyFromAi(raw, ["corporal"], "2026-10-18T10:00:00Z", { plan }).planDays).toEqual(["2026-10-19", "2026-10-21"]);
    expect(chatReplyFromAi(raw, ["corporal"], "2026-10-18T10:00:00Z", {}).planDays).toBeUndefined();
  });
});

describe("días sin entrenar sacados del mensaje", () => {
  // 2026-10-18 es domingo; 2026-10-15, jueves
  it("«solo puedo» marca los demás días de la semana que viene", () => {
    expect(unavailableFromText("La semana que viene solo puedo entrenar 3 días: el martes, el jueves y el sábado", "2026-10-18")).toEqual(["2026-10-19", "2026-10-21", "2026-10-23", "2026-10-25"]);
  });
  it("«esta semana» es lo que queda de semana", () => {
    expect(unavailableFromText("Esta semana solo puedo el sábado", "2026-10-15")).toEqual(["2026-10-15", "2026-10-16", "2026-10-18"]);
  });
  it("«no puedo» marca solo esos días", () => {
    expect(unavailableFromText("El jueves y el viernes no puedo", "2026-10-15")).toEqual(["2026-10-15", "2026-10-16"]);
    // domingo: «el miércoles» es el de la semana que viene
    expect(unavailableFromText("el miércoles no puedo entrenar", "2026-10-18")).toEqual(["2026-10-21"]);
  });
  it("sin días o sin «puedo», nada", () => {
    expect(unavailableFromText("¿Qué hago el martes?", "2026-10-18")).toBeUndefined();
    expect(unavailableFromText("No puedo más con las agujetas", "2026-10-18")).toBeUndefined();
  });
});
