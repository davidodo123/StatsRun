import { describe, expect, it } from "vitest";
import { PLAN_WARNING_PATTERNS, planWarningText } from "./planWarningText";

// un ejemplo de cada aviso, tal como lo escribe lib/engine/planner.ts
const SAMPLES = [
  "10K de Getafe está a 6 días de Maratón de Sevilla: competir a tope tan cerca resta frescura. Mejor córrela como C (entreno).",
  "Quedan 5 semanas; para esta distancia se recomiendan al menos 8. El plan prioriza llegar sano sobre mejorar marca.",
  "Un maratón partiendo de cero es muy exigente: lo ideal es 6+ meses y haber hecho antes una media maratón.",
  "IMC 31.2: progresión más conservadora y bloques de caminar-correr para cuidar articulaciones. Consulta con tu médico antes de empezar.",
  'Lesiones indicadas ("tendinitis rotuliana"): ante dolor, cambia la sesión por bici/elíptica y consulta a un fisio.',
  "Objetivo ambicioso: 45:00 exige VDOT 45.3 y tu proyección es 43.8 (≈ 46:20). Los ritmos se ajustan a lo realista; si mejoras más rápido, regenera el plan.",
  "Media de Valencia es muy poco después de otra carrera: entre las dos, solo recuperar.",
];

describe("avisos del plan traducidos", () => {
  it("un ejemplo por aviso", () => {
    expect(SAMPLES).toHaveLength(PLAN_WARNING_PATTERNS.length);
  });
  for (const locale of ["en", "ca", "pt", "fr"] as const)
    it(`en ${locale}, ninguno se queda en español`, () => {
      for (const s of SAMPLES) expect(planWarningText(s, locale)).not.toBe(s);
    });
  it("con sus partes en su sitio", () => {
    expect(planWarningText(SAMPLES[5], "en")).toBe("Ambitious goal: 45:00 needs a VDOT of 45.3 and your projection is 43.8 (≈ 46:20). Paces are set to what's realistic; if you improve faster, regenerate the plan.");
    expect(planWarningText(SAMPLES[0], "fr")).toContain("10K de Getafe est à 6 jours de Maratón de Sevilla");
  });
});
