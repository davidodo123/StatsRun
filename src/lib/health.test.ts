import { describe, expect, it } from "vitest";
import { healthSummary, mergeHealth, parseHealthNumber, parseHealthPayload, todayMadrid } from "./health";

const today = "2026-10-09";
const now = "2026-10-09T20:00:00.000Z";

describe("salud del iPhone", () => {
  it("lee números de Atajos en formato español", () => {
    expect(parseHealthNumber(8234)).toBe(8234);
    expect(parseHealthNumber("8.234")).toBe(8234);
    expect(parseHealthNumber("8.234 pasos")).toBe(8234);
    expect(parseHealthNumber("512,7")).toBe(512.7);
    expect(parseHealthNumber("1.234,5 kcal")).toBe(1234.5);
    expect(parseHealthNumber("abc")).toBeUndefined();
    expect(parseHealthNumber(null)).toBeUndefined();
  });

  it("un día suelto sin fecha es hoy; claves en español o inglés", () => {
    const r = parseHealthPayload({ pasos: "8.234", kcalActivas: 512.4, kcalReposo: "1.650" }, today, now);
    expect(r).toEqual({ days: [{ date: today, steps: 8234, activeKcal: 512, restingKcal: 1650, updatedAt: now }] });
    const en = parseHealthPayload({ date: "2026-10-08", steps: 100 }, today, now);
    expect("days" in en && en.days[0].date).toBe("2026-10-08");
  });

  it("varios días y errores", () => {
    const r = parseHealthPayload({ dias: [{ fecha: "2026-10-07", pasos: 5000 }, { fecha: "2026-10-08", pasos: 7000 }] }, today, now);
    expect("days" in r && r.days.map((d) => d.steps)).toEqual([5000, 7000]);
    expect(parseHealthPayload({}, today)).toHaveProperty("error");
    expect(parseHealthPayload({ pasos: -5 }, today)).toHaveProperty("error");
    expect(parseHealthPayload({ pasos: 10, fecha: "2026-12-01" }, today)).toHaveProperty("error");
    expect(parseHealthPayload("x", today)).toHaveProperty("error");
  });

  it("un nuevo envío del mismo día actualiza lo que trae y conserva lo demás", () => {
    const a = mergeHealth([], [{ date: today, steps: 3000, activeKcal: 200, updatedAt: "1" }], today);
    const b = mergeHealth(a, [{ date: today, steps: 9000, updatedAt: "2" }], today);
    expect(b).toEqual([{ date: today, steps: 9000, activeKcal: 200, restingKcal: undefined, updatedAt: "2" }]);
  });

  it("resumen: hoy, media de 7 días sin hoy y 30 días", () => {
    const list = [
      { date: "2026-10-07", steps: 6000, activeKcal: 300, updatedAt: "" },
      { date: "2026-10-08", steps: 10000, activeKcal: 500, updatedAt: "" },
      { date: today, steps: 2000, updatedAt: "" },
    ];
    const s = healthSummary(list, today)!;
    expect(s.today?.steps).toBe(2000);
    expect(s.avgSteps7).toBe(8000);
    expect(s.avgActiveKcal7).toBe(400);
    expect(s.last30).toHaveLength(30);
    expect(s.last30.at(-1)).toEqual({ date: today, steps: 2000, kcal: 0 });
    expect(healthSummary([], today)).toBeUndefined();
  });

  it("hoy en España aunque el servidor vaya en UTC", () => {
    expect(todayMadrid(new Date("2026-10-08T22:30:00Z"))).toBe("2026-10-09");
  });
});
