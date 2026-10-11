import { describe, expect, it } from "vitest";
import { searchStudy, studyFor } from "./knowledge";

const first = (q: string) => searchStudy(q)[0]?.title ?? "";

describe("consulta del estudio", () => {
  it("encuentra el apartado que viene al caso, también con palabras del día a día", () => {
    expect(first("Me duele la rodilla al correr, ¿sigo?")).toMatch(/semáforo de dolor/);
    expect(first("¿Cuántas series por músculo para ganar músculo?")).toMatch(/Helms/);
    expect(first("Tengo fiebre y mocos")).toMatch(/Enfermedad/);
    expect(first("Queda una semana para la carrera, ¿qué hago?")).toMatch(/Afinamiento/);
    expect(first("¿Puedo subir la tirada larga de 14 a 18 km?")).toMatch(/Frandsen/);
    expect(first("Duermo 5 horas")).toMatch(/Sueño/);
    expect(first("¿Es mejor la polarizada?")).toMatch(/Distribución de intensidad/);
  });

  it("sin nada que buscar no manda nada, y respeta el tope", () => {
    expect(searchStudy("hola")).toEqual([]);
    expect(studyFor("")).toBeUndefined();
    const many = searchStudy("dolor fatiga sueño fiebre carrera fuerza series tirada", 3, 2000);
    expect(many.length).toBeLessThanOrEqual(3);
    expect(many.reduce((t, s) => t + s.text.length, 0)).toBeLessThanOrEqual(2000 + 1500);
  });
});
