import { describe, expect, it } from "vitest";
import { AI_LIMITS, aiLeft, aiLimitMessage, countAiUse } from "./aiPlan";
import type { Db } from "./types";

const db = (): Db => ({ activities: [] });

describe("límite de la IA", () => {
  it("cuenta por día y se reinicia al día siguiente", () => {
    const d = db();
    for (let i = 0; i < AI_LIMITS.chat; i++) countAiUse(d, "chat", "2026-10-24");
    expect(aiLeft(d, "chat", "2026-10-24")).toBe(0);
    expect(aiLeft(d, "adapt", "2026-10-24")).toBe(AI_LIMITS.adapt);
    expect(aiLeft(d, "chat", "2026-10-25")).toBe(AI_LIMITS.chat);
  });

  it("sin límite para las cuentas de pruebas", () => {
    const d = db();
    for (let i = 0; i < AI_LIMITS.chat + 5; i++) countAiUse(d, "chat", "2026-10-24");
    expect(aiLeft(d, "chat", "2026-10-24", true)).toBe(Infinity);
  });

  it("las rutinas cuentan por semana (de lunes a domingo)", () => {
    const d = db();
    for (let i = 0; i < AI_LIMITS.routines; i++) countAiUse(d, "routines", "2026-10-20"); // martes
    expect(aiLeft(d, "routines", "2026-10-25")).toBe(0); // domingo, misma semana
    expect(aiLeft(d, "routines", "2026-10-26")).toBe(AI_LIMITS.routines); // lunes
  });

  it("el aviso dice cuándo vuelve", () => {
    expect(aiLimitMessage("chat")).toContain("Vuelve mañana");
    expect(aiLimitMessage("routines")).toContain("Vuelve el lunes");
  });
});
