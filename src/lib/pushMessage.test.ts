import { describe, expect, it } from "vitest";
import { todayMessage } from "./pushMessage";
import type { Plan, PlannedSession } from "./types";

const ses = (p: Partial<PlannedSession>): PlannedSession => ({ id: Math.random().toString(), date: "2026-10-24", type: "easy", title: "Rodaje suave", description: "", steps: [], distanceKm: 8, durationMin: 48, ...p });
const plan = (sessions: PlannedSession[]) => ({ weeks: [{ index: 0, start: "2026-10-19", phase: "base", recovery: false, targetKm: 20, focus: "", sessions }] }) as unknown as Plan;

describe("aviso de lo que toca hoy", () => {
  it("corto: «Hoy toca» y lo de hoy, la carrera primero y la fuerza después", () => {
    const m = todayMessage({ plan: plan([ses({ type: "strength", title: "Superior · Fuerza", distanceKm: 0 }), ses({ type: "long", title: "Tirada larga", distanceKm: 12, pace: { fast: 330, slow: 360 } })]) }, "2026-10-24")!;
    expect(m.title).toBe("Hoy toca");
    expect(m.body).toBe("Tirada larga · 12 km + Superior · Fuerza");
    expect(m.url).toBe("/plan/actual");
  });

  it("no repite los km si ya van en el nombre", () => {
    expect(todayMessage({ plan: plan([ses({ type: "long", title: "Tirada larga 12 km", distanceKm: 12 })]) }, "2026-10-24")?.body).toBe("Tirada larga 12 km");
  });

  it("solo fuerza: el nombre de la rutina", () => {
    expect(todayMessage({ plan: plan([ses({ type: "strength", title: "Pierna", distanceKm: 0 })]) }, "2026-10-24")?.body).toBe("Pierna");
  });

  it("día de carrera", () => {
    expect(todayMessage({ plan: plan([ses({ type: "race", title: "Media de Sevilla", distanceKm: 21.1 })]) }, "2026-10-24")?.body).toBe("Media de Sevilla · ¡Mucha suerte!");
  });

  it("descanso: nada, salvo que se pidan también esos días", () => {
    const p = plan([ses({ date: "2026-10-25" })]);
    expect(todayMessage({ plan: p }, "2026-10-24")).toBeUndefined();
    expect(todayMessage({ plan: p, push: { subs: [], restDays: true } }, "2026-10-24")?.title).toBe("Hoy toca descanso");
    expect(todayMessage({}, "2026-10-24")).toBeUndefined();
  });
});
