import { describe, expect, it } from "vitest";
import { generatePlan, isHardSession } from "../engine/planner";
import { applyStrengthRoutines, routineZone, routinesForPlan } from "./routinePlan";
import { diffDays } from "../dates";
import type { Db, Profile } from "../types";

const profile: Profile = {
  name: "Test",
  sex: "male",
  age: 30,
  weightKg: 70,
  heightCm: 178,
  level: "intermedio",
  yearsRunning: 3,
  weeklyKm: 35,
  longestRunKm: 16,
  daysPerWeek: 5,
  longRunDay: 6,
  strengthPerWeek: 3,
};
const today = "2026-10-08";
const goal = { name: "Media", distanceKm: 21.0975, date: "2027-01-24" };
const plan = () => generatePlan({ profile, goal, currentVdot: 45, currentWeeklyKm: 35, longestRecentKm: 16, today });

describe("fuerza en el plan", () => {
  it("con 3 a la semana: pierna, posterior y tren superior, nunca de pierna el día antes de la tirada larga o de una clave", () => {
    const p = plan();
    const week = p.weeks.find((w) => w.phase === "construccion" && !w.recovery)!;
    const strength = week.sessions.filter((s) => s.type === "strength");
    expect(strength.map((s) => s.strengthKind).sort()).toEqual(["pierna", "posterior", "superior"]);
    expect(new Set(strength.map((s) => s.date)).size).toBe(3);
    const keys = week.sessions.filter((s) => s.type === "long" || isHardSession(s.type)).map((s) => s.date);
    for (const s of strength.filter((x) => x.strengthKind !== "superior")) expect(keys.some((k) => diffDays(k, s.date) === 1)).toBe(false);
    // la de pliometría no cae el día de series, repeticiones o cuestas
    const posterior = strength.find((s) => s.strengthKind === "posterior")!;
    expect(week.sessions.some((s) => s.date === posterior.date && ["intervals", "repetitions", "hills"].includes(s.type))).toBe(false);
  });

  it("clasifica las rutinas por la zona que trabajan", () => {
    expect(routineZone([["cuadriceps"], ["isquios"], ["abdomen"]])).toBe("inferior");
    expect(routineZone([["pecho"], ["hombros"], ["triceps"]])).toBe("superior");
    expect(routineZone([["pecho"], ["cuadriceps"]])).toBe("completo");
  });

  it("mete las rutinas del usuario en los huecos de su zona", () => {
    const db: Pick<Db, "routines" | "customExercises"> = {
      routines: [
        { id: "r_pecho", name: "Pecho", createdAt: "", updatedAt: "", exercises: [{ exerciseId: "Pushups", bw: true, sets: [{ reps: 15 }, { reps: 12 }] }, { exerciseId: "Dumbbell_Bench_Press", sets: [{ kg: 20, reps: 10 }] }] },
        { id: "r_pierna", name: "Pierna", createdAt: "", updatedAt: "", exercises: [{ exerciseId: "Barbell_Squat", sets: [{ kg: 80, reps: 5 }, { kg: 80, reps: 5 }] }] },
      ],
    };
    const routines = routinesForPlan(db);
    expect(routines.map((r) => r.zone)).toEqual(["superior", "inferior"]);
    expect(routines[1].steps[0]).toBe("2 × 5 Sentadilla trasera con barra a 80 kg");
    expect(routines[0].steps[0]).toBe("2 × 12-15 Flexiones con peso corporal");

    const p = plan();
    applyStrengthRoutines(p, routines, today);
    const week = p.weeks.find((w) => w.phase === "construccion" && !w.recovery)!;
    const byKind = Object.fromEntries(week.sessions.filter((s) => s.type === "strength").map((s) => [s.strengthKind, s]));
    expect(byKind.superior.routineId).toBe("r_pecho");
    expect(byKind.pierna.routineId).toBe("r_pierna");
    expect(byKind.pierna.title).toBe("Pierna");
    // rutina corta de pecho: se completa con remo, hombro, dominadas y core, sin repetir el empuje
    const sup: string[] = byKind.superior.steps;
    expect(sup[0]).toBe("2 × 12-15 Flexiones con peso corporal");
    expect(sup.some((x) => x.startsWith("+ ") && /remo/i.test(x))).toBe(true);
    expect(sup.some((x) => x.startsWith("+ ") && /dominada/i.test(x))).toBe(true);
    expect(sup.some((x) => x.startsWith("+ ") && /press de banca|flexiones/i.test(x))).toBe(false);
    // en afinamiento se queda la activación, sin rutina
    const taper = p.weeks.find((w) => w.phase === "taper")!;
    expect(taper.sessions.filter((s) => s.type === "strength").every((s) => !s.routineId)).toBe(true);
    // sin rutinas, vuelven las plantillas
    applyStrengthRoutines(p, [], today);
    expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.routineId)).toBe(false);
  });

  it("usa cada rutina de la IA en su hueco y su fase", () => {
    const mk = (id: string, kind: "pierna" | "superior", phases: ("base" | "construccion" | "especifico")[]) => ({
      id, name: id, kind, phases, source: "ia" as const, createdAt: "", updatedAt: "",
      exercises: [{ exerciseId: kind === "pierna" ? "Goblet_Squat" : "Pushups", sets: [{ reps: 10 }] }, { exerciseId: kind === "pierna" ? "rio_pogo_jumps" : "Pullups", sets: [{ reps: 5 }] }],
    });
    const db: Pick<Db, "routines"> = { routines: [mk("pb", "pierna", ["base"]), mk("pf", "pierna", ["construccion", "especifico"]), mk("sb", "superior", ["base"]), mk("sf", "superior", ["construccion", "especifico"])] };
    const p = plan();
    applyStrengthRoutines(p, routinesForPlan(db), today);
    const pick = (phase: string, kind: string) => p.weeks.find((w) => w.phase === phase && !w.recovery)!.sessions.find((s) => s.strengthKind === kind)?.routineId;
    expect(pick("base", "pierna")).toBe("pb");
    expect(pick("construccion", "pierna")).toBe("pf");
    expect(pick("base", "superior")).toBe("sb");
    expect(pick("especifico", "superior")).toBe("sf");
  });

  it("también rellena las sesiones de planes antiguos (sin tipo de fuerza)", () => {
    const p = plan();
    for (const w of p.weeks) for (const s of w.sessions) delete s.strengthKind;
    const db: Pick<Db, "routines"> = {
      routines: [{ id: "sup", name: "Superior", createdAt: "", updatedAt: "", exercises: [{ exerciseId: "Pushups", sets: [{ reps: 10 }] }, { exerciseId: "Pullups", sets: [{ reps: 5 }] }] }],
    };
    applyStrengthRoutines(p, routinesForPlan(db), today);
    const week = p.weeks.find((w) => w.phase === "base" && !w.recovery && w.start > today)!;
    const strength = week.sessions.filter((s) => s.type === "strength");
    expect(strength.map((s) => s.strengthKind)).toEqual(["pierna", "posterior", "superior"]);
    expect(strength.find((s) => s.strengthKind === "superior")?.routineId).toBe("sup");
  });
});
