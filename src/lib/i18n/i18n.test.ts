import { describe, expect, it } from "vitest";
import { LOCALES, dayMonth, translator, weekdayDate, weekdayInitials } from "./index";
import { es } from "./es";
import { en } from "./en";
import { ca } from "./ca";
import { pt } from "./pt";
import { fr } from "./fr";
import { AREAS } from "./areas";

describe("idiomas", () => {
  it("cada idioma tiene todas las claves y ninguna vacía", () => {
    for (const d of [en, ca, pt, fr]) {
      expect(Object.keys(d).sort()).toEqual(Object.keys(es).sort());
      expect(Object.values(d).every((v) => v.trim().length > 0)).toBe(true);
    }
  });

  it("los huecos {x} de cada texto son los mismos que en español", () => {
    const huecos = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const d of [en, ca, pt, fr]) for (const k of Object.keys(es) as (keyof typeof es)[]) expect(huecos(d[k])).toBe(huecos(es[k]));
  });

  it("cada zona: mismas claves, sin textos vacíos y los mismos huecos en los cinco idiomas", () => {
    const huecos = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const a of AREAS) {
      const base = a.es as Record<string, string>;
      for (const l of ["en", "ca", "pt", "fr"] as const) {
        const d = a[l] as Record<string, string>;
        expect(Object.keys(d).sort()).toEqual(Object.keys(base).sort());
        for (const k of Object.keys(base)) {
          expect(d[k].trim().length, `${l} ${k}`).toBeGreaterThan(0);
          expect(huecos(d[k]), `${l} ${k}`).toBe(huecos(base[k]));
        }
      }
    }
  });

  it("ninguna clave se repite entre zonas", () => {
    const todas = [Object.keys(es), ...AREAS.map((a) => Object.keys(a.es))].flat();
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("sustituye los huecos", () => {
    expect(translator("es")("inicio.hola", { nombre: "David" })).toBe("Hola, David");
    expect(translator("en")("inicio.hola", { nombre: "David" })).toBe("Hi, David");
  });

  it("fechas en cada idioma", () => {
    expect(weekdayInitials("es")).toEqual(["L", "M", "X", "J", "V", "S", "D"]);
    expect(weekdayDate("2026-10-25", "es")).toBe("domingo 25 oct");
    expect(weekdayDate("2026-10-25", "en")).toBe("Sunday 25 Oct");
    expect(dayMonth("2026-11-15", "fr")).toMatch(/^15 nov/);
    expect(LOCALES).toHaveLength(5);
  });
});
