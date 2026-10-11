import { describe, expect, it } from "vitest";
import { healthSummary, mergeHealth, parseHealthDate, parseHealthNumber, parseHealthPayload, recoverySignals, todayMadrid } from "./health";
import { addDays } from "./dates";
import type { DailyHealth } from "./types";

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
    expect(s.last30.at(-1)).toEqual({ date: today, steps: 2000, kcal: 0, sleep: null, hrv: null, rhr: null });
    expect(s.hasRecovery).toBe(false);
    expect(healthSummary([], today)).toBeUndefined();
  });

  it("hoy en España aunque el servidor vaya en UTC", () => {
    expect(todayMadrid(new Date("2026-10-08T22:30:00Z"))).toBe("2026-10-09");
  });

  it("VFC, pulso en reposo y sueño: claves en español o inglés, sueño en horas, minutos o segundos", () => {
    const one = (o: object) => {
      const r = parseHealthPayload(o, today);
      return "days" in r ? r.days[0] : r.error;
    };
    expect(one({ vfc: "52,4", pulsoReposo: 51, sueno: "7,5" })).toMatchObject({ hrvMs: 52, restingHr: 51, sleepHours: 7.5 });
    expect(one({ hrv: 60, restingHr: "48 ppm", sleep: 450 })).toMatchObject({ hrvMs: 60, restingHr: 48, sleepHours: 7.5 }); // minutos
    expect(one({ sueño: 27000 })).toMatchObject({ sleepHours: 7.5 }); // segundos
    expect((one({ sueno: 0, pasos: 100 }) as DailyHealth).sleepHours).toBeUndefined(); // 0 h = sin registro
    expect(one({ vfc: 900 })).toMatch(/VFC fuera de rango/);
    expect(one({ pulsoReposo: 10 })).toMatch(/Pulso en reposo fuera de rango/);
    expect(one({})).toMatch(/No llega ningún dato/);
    const merged = mergeHealth([{ date: today, steps: 5000, hrvMs: 50, updatedAt: "a" }], [{ date: today, steps: 6000, updatedAt: "b" }], today);
    expect(merged[0]).toMatchObject({ steps: 6000, hrvMs: 50 });
  });

  it("alertas de recuperación frente a la línea base de 30 días (y sin línea base, ninguna)", () => {
    const days = (n: number, f: (i: number) => Partial<DailyHealth>) => Array.from({ length: n }, (_, i) => ({ date: addDays(today, -i), updatedAt: "", ...f(i) }));
    // 30 días normales: VFC 60 ± 4, pulso 50, sueño 7,5
    const normal = days(30, (i) => ({ hrvMs: 60 + (i % 3) * 4 - 4, restingHr: 50, sleepHours: 7.5 }));
    const ok = recoverySignals(normal, today);
    expect(ok).toMatchObject({ shortSleep: false, highRestingHr: false, lowHrv: false });
    // los últimos días: duerme 5,5 h, pulso 57 y VFC 45
    const tired = normal.map((d, i) => (i < 7 ? { ...d, hrvMs: 45, sleepHours: i < 3 ? 5.5 : 7.5, restingHr: i < 3 ? 57 : 50 } : d));
    const r = recoverySignals(tired, today);
    expect(r).toMatchObject({ shortSleep: true, highRestingHr: true, lowHrv: true, sleepAvg3: 5.5, restingHrAvg3: 57, restingHrBase: 50 });
    // con solo una semana de datos no hay línea base: no salta el pulso ni la VFC
    expect(recoverySignals(tired.slice(0, 7), today)).toMatchObject({ highRestingHr: false, lowHrv: false, shortSleep: true });
    expect(recoverySignals(undefined, today)).toMatchObject({ shortSleep: false, highRestingHr: false, lowHrv: false });
  });

  it("punto decimal o de miles según lo que tenga sentido para cada dato", () => {
    expect(parseHealthNumber("269.714", 20_000)).toBe(269.714); // calorías con decimales
    expect(parseHealthNumber("9.120", 200_000)).toBe(9120); // pasos con punto de miles
    expect(parseHealthNumber("1.234", 20_000)).toBe(1234);
    expect(parseHealthNumber("1.234.567", 20_000)).toBe(1234567);
    expect(parseHealthNumber("512,7", 20_000)).toBe(512.7);
  });

  it("fechas tal como las manda Atajos", () => {
    expect(parseHealthDate("2026-10-11")).toBe("2026-10-11");
    expect(parseHealthDate("2026-10-10T22:00:00Z")).toBe("2026-10-11"); // medianoche en España
    expect(parseHealthDate("2026-10-11T00:00:00+02:00")).toBe("2026-10-11");
    expect(parseHealthDate("2026-10-11T08:15:00")).toBe("2026-10-11");
    expect(parseHealthDate("11/10/2026")).toBe("2026-10-11");
    expect(parseHealthDate("11 oct 2026, 0:00")).toBe("2026-10-11");
    expect(parseHealthDate("11 de octubre de 2026")).toBe("2026-10-11");
    expect(parseHealthDate("Oct 11, 2026 at 12:00 AM")).toBe("2026-10-11");
    expect(parseHealthDate("ayer")).toBeUndefined();
    expect(parseHealthDate(42)).toBeUndefined();
  });

  it("listas de los últimos días (sin bucles en el atajo): se juntan por fecha y no se pierde ningún día", () => {
    const r = parseHealthPayload({ fechas: ["2026-10-07", "2026-10-08", "2026-10-09"], pasos: ["8.234", 10000, 2000], kcalActivas: [300, 500, 120] }, today, now);
    expect("days" in r && r.days.map((d) => [d.date, d.steps, d.activeKcal])).toEqual([
      ["2026-10-07", 8234, 300],
      ["2026-10-08", 10000, 500],
      ["2026-10-09", 2000, 120],
    ]);
    // con fechas propias por dato (un día sin calorías no descuadra)
    const r2 = parseHealthPayload({ fechasPasos: ["8/10/2026", "9/10/2026"], pasos: [9000, 3000], fechasKcal: ["9/10/2026"], kcalActivas: [200] }, today, now);
    expect("days" in r2 && r2.days.map((d) => [d.date, d.steps, d.activeKcal])).toEqual([
      ["2026-10-08", 9000, undefined],
      ["2026-10-09", 3000, 200],
    ]);
    // como lo manda Atajos con variables de lista en campos de texto: un elemento por línea
    const r4 = parseHealthPayload({ fechasPasos: "8 oct 2026, 0:00\n9 oct 2026, 0:00", pasos: "9.120\n3.400", fechasKcal: "9 oct 2026, 0:00", kcalActivas: "210" }, today, now);
    expect("days" in r4 && r4.days.map((d) => [d.date, d.steps, d.activeKcal])).toEqual([
      ["2026-10-08", 9120, undefined],
      ["2026-10-09", 3400, 210],
    ]);
    // listas de pasos + VFC y sueño sueltos de hoy
    const r3 = parseHealthPayload({ fechas: ["2026-10-08", today], pasos: [9000, 3000], vfc: 55, sueno: "7,2" }, today, now);
    expect("days" in r3 && r3.days.find((d) => d.date === today)).toMatchObject({ steps: 3000, hrvMs: 55, sleepHours: 7.2 });
    expect(parseHealthPayload({ fechas: ["2026-10-08"], pasos: [1, 2] }, today, now)).toEqual({ error: "La lista «pasos» tiene 2 valores y 1 fechas." });
    expect(parseHealthPayload({ fechas: ["mañana"], pasos: [1] }, today, now)).toEqual({ error: "No entiendo la fecha «mañana»." });
    // un día que llega otra vez con más pasos se actualiza; los que no llegan se conservan
    const merged = mergeHealth([{ date: "2026-10-06", steps: 7000, updatedAt: "a" }, { date: "2026-10-09", steps: 1500, updatedAt: "a" }], "days" in r ? r.days : [], today);
    expect(merged.map((d) => [d.date, d.steps])).toEqual([
      ["2026-10-06", 7000],
      ["2026-10-07", 8234],
      ["2026-10-08", 10000],
      ["2026-10-09", 2000],
    ]);
  });
});

