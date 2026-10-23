import { describe, expect, it } from "vitest";
import { todayMessage } from "./pushMessage";
import type { Plan, PlannedSession } from "./types";

const ses = (p: Partial<PlannedSession>): PlannedSession => ({ id: Math.random().toString(), date: "2026-10-24", type: "easy", title: "Rodaje suave", description: "", steps: [], distanceKm: 8, durationMin: 48, ...p });
const plan = (sessions: PlannedSession[]) => ({ weeks: [{ index: 0, start: "2026-10-19", phase: "base", recovery: false, targetKm: 20, focus: "", sessions }] }) as unknown as Plan;

describe("aviso de lo que toca hoy", () => {
  it("dice la sesión de carrera con km y ritmo, y la fuerza como extra", () => {
    const m = todayMessage({ plan: plan([ses({ type: "long", title: "Tirada larga", distanceKm: 12, pace: { fast: 330, slow: 360 } }), ses({ type: "strength", title: "Fuerza general", distanceKm: 0 })]) }, "2026-10-24")!;
    expect(m.title).toBe("Hoy: Tirada larga · 12 km");
    expect(m.body).toContain("Ritmo 5:30–6:00 /km");
    expect(m.body).toContain("Y además: Fuerza general");
    expect(m.url).toBe("/plan/actual");
  });

  it("no repite los km si ya van en el nombre", () => {
    expect(todayMessage({ plan: plan([ses({ type: "long", title: "Tirada larga 12 km", distanceKm: 12 })]) }, "2026-10-24")?.title).toBe("Hoy: Tirada larga 12 km");
  });

  it("solo fuerza: la fuerza es el título", () => {
    expect(todayMessage({ plan: plan([ses({ type: "strength", title: "Pierna", distanceKm: 0 })]) }, "2026-10-24")?.title).toBe("Hoy: Pierna");
  });

  it("día de carrera", () => {
    expect(todayMessage({ plan: plan([ses({ type: "race", title: "Media de Sevilla", distanceKm: 21.1 })]) }, "2026-10-24")?.body).toMatch(/carrera/);
  });

  it("descanso: nada, salvo que se pidan también esos días", () => {
    const p = plan([ses({ date: "2026-10-25" })]);
    expect(todayMessage({ plan: p }, "2026-10-24")).toBeUndefined();
    expect(todayMessage({ plan: p, push: { subs: [], restDays: true } }, "2026-10-24")?.title).toBe("Hoy: descanso");
    expect(todayMessage({}, "2026-10-24")).toBeUndefined();
  });
});
