import { describe, expect, it } from "vitest";
import { EXACT, PATTERNS, planText } from "./planText";
import { PLAN_MORE } from "./planTextMore";

describe("textos del plan en catalán, portugués y francés", () => {
  for (const [lang, more] of Object.entries(PLAN_MORE)) {
    it(`${lang}: los mismos textos fijos que en español, ni uno de más`, () => {
      expect(Object.keys(more.exact).sort()).toEqual(Object.keys(EXACT).sort());
    });
    it(`${lang}: un patrón por cada patrón español, con los mismos huecos`, () => {
      expect(more.patterns).toHaveLength(PATTERNS.length);
      PATTERNS.forEach(([, tr], i) => {
        const holes = (t: string) => (t.match(/\$\d/g) ?? []).sort().join();
        expect(holes(more.patterns[i]), `${lang} patrón ${i}`).toBe(holes(tr.en!));
      });
    });
  }

  it("traduce títulos y pasos con números", () => {
    expect(planText("Tirada larga 14 km", "fr")).toBe("Sortie longue 14 km");
    expect(planText("Rodaje suave 6 km", "ca")).toBe("Rodatge suau 6 km");
    expect(planText("5 × 1,6 km a ritmo T (4:50 /km), rec 1′ trote", "pt")).toBe("5 × 1,6 km a ritmo T (4:50 /km), rec. 1′ trote");
    expect(planText("Fuerza general (cuerpo entero)", "fr")).toBe("Renfo général (corps entier)");
  });

  it("lo que no está, en español", () => {
    expect(planText("Algo nuevo", "ca")).toBe("Algo nuevo");
  });
});
