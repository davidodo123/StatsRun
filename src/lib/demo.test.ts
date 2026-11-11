import { describe, expect, it } from "vitest";
import { generateDemoActivities, localizeDemo } from "./demo";

describe("datos de ejemplo", () => {
  const acts = generateDemoActivities("2026-11-11", 60, 46);
  it("en español, tal cual", () => {
    expect(localizeDemo(acts, "es")).toBe(acts);
  });
  it("en los otros idiomas, ningún nombre se queda en español", () => {
    for (const locale of ["en", "ca", "pt", "fr"] as const) {
      const names = new Set(localizeDemo(acts, locale).map((a) => a.name));
      for (const es of ["Tirada larga", "Rodaje suave", "Gimnasio", "Carrera 10K popular", "Series 6×1000"]) expect(names.has(es), `${locale}: ${es}`).toBe(false);
    }
    expect(localizeDemo(acts, "en").some((a) => a.name === "Long run")).toBe(true);
  });
});
