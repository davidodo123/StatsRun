import { describe, expect, it } from "vitest";
import { READINESS_PATTERNS, readinessText } from "./readinessText";

// un ejemplo de cada motivo, tal como lo escribe lib/engine/readiness.ts
const SAMPLES = [
  "Carga aguda muy por encima de la crónica (ACWR 1,62 > 1,5): riesgo de lesión.",
  "Subida de carga reciente (ACWR 1,41): el cuerpo está en fase de alarma.",
  "Carga reciente baja respecto a tu base (ACWR 0,62).",
  "Frescura muy negativa (TSB -34): fatiga acumulada alta.",
  "Semana muy monótona (monotonía 2,3 > 2): alterna días duros y suaves.",
  "Rendimiento a la baja: entrenos que se hacen duros, piernas cargadas o más pulsaciones al mismo ritmo.",
  "Duermes poco: 5,8 h de media las últimas noches (menos de 6,5 h).",
  "Mencionas mal descanso.",
  "Pulso en reposo alto: 58 ppm frente a tus 52 habituales.",
  "VFC por debajo de tu rango normal: 41,5 ms de media en 7 días (lo normal para ti, más de 48).",
  "Mencionas estrés fuera del entrenamiento: también cuenta como carga.",
  "Varias sesiones sin hacer (4 en 14 días).",
  "Mencionas falta de ganas.",
  "Hay molestias o dolor anotados.",
  "Mencionas síntomas de enfermedad: con fiebre o malestar general, descanso hasta 24 h sin fiebre.",
  "Los entrenos se te están haciendo fáciles: hay margen para progresar.",
  "Ninguna sesión por encima de 8,8 km (tu tirada más larga en 30 días + 10 %).",
];

describe("motivos de «Estado de forma» traducidos", () => {
  it("un ejemplo por motivo", () => {
    expect(SAMPLES).toHaveLength(READINESS_PATTERNS.length);
  });

  for (const locale of ["en", "ca", "pt", "fr"] as const)
    it(`en ${locale}, ninguno se queda en español`, () => {
      for (const s of SAMPLES) expect(readinessText(s, locale)).not.toBe(s);
    });

  it("en inglés, con punto decimal y los números en su sitio", () => {
    expect(readinessText(SAMPLES[16], "en")).toBe("No session over 8.8 km (your longest run in 30 days + 10%).");
    expect(readinessText(SAMPLES[8], "en")).toBe("High resting heart rate: 58 bpm vs your usual 52.");
  });

  it("en español, tal cual", () => {
    expect(readinessText(SAMPLES[0], "es")).toBe(SAMPLES[0]);
  });
});
