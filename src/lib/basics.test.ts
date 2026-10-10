import { describe, expect, it, vi } from "vitest";
import { addDays, diffDays, mondayOf, monthLabel, shortDate, weekday } from "./dates";
import { fmtDuration, fmtKm, fmtNum, fmtPace, fmtPaceRange, parseTime } from "./format";
import { bmi, bmiLabel, flatEquivalentKm, heatFactor, hrMaxOf, hrZones, raceTimeFromVdot, riegel, vdotFromRace, vo2maxLabel, zoneOfHr } from "./engine/physiology";
import { acwrStatus, tsbStatus } from "./engine/load";
import { isSameActivity, mergeActivities, shortHash, sportFromName } from "./importers/common";
import type { Activity } from "./types";

vi.mock("server-only", () => ({}));

const act = (id: string, startLocal: string, distanceM: number): Activity => ({
  id,
  source: "manual",
  name: "x",
  sport: "run",
  sportRaw: "Run",
  date: startLocal.slice(0, 10),
  startLocal,
  distanceM,
  movingSec: 1800,
  elapsedSec: 1800,
  elevationGainM: 0,
});

describe("fechas", () => {
  it("suma días cruzando meses, años, bisiestos y cambios de hora", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // cambio de hora en España
    expect(addDays("2026-10-25", -1)).toBe("2026-10-24");
    expect(addDays("2026-10-10", 0)).toBe("2026-10-10");
  });
  it("diferencia de días, día de la semana y lunes", () => {
    expect(diffDays("2026-10-10", "2026-10-01")).toBe(9);
    expect(diffDays("2026-03-30", "2026-03-28")).toBe(2);
    expect(weekday("2026-10-12")).toBe(0); // lunes
    expect(weekday("2026-10-11")).toBe(6); // domingo
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
  });
  it("textos cortos", () => {
    expect(shortDate("2026-10-07")).toBe("7 oct");
    expect(monthLabel("2026-01")).toBe("ene 26");
  });
});

describe("formatos", () => {
  it("duraciones y ritmos", () => {
    expect(fmtDuration(59)).toBe("0:59");
    expect(fmtDuration(3600)).toBe("1:00:00");
    expect(fmtDuration(3599.6)).toBe("1:00:00");
    expect(fmtPace(275)).toBe("4:35");
    expect(fmtPace(0)).toBe("–");
    expect(fmtPace(Infinity)).toBe("–");
    expect(fmtPace(299.6)).toBe("5:00"); // nunca «4:60»
    expect(fmtPaceRange({ fast: 300, slow: 301 })).toBe("5:00 /km");
    expect(fmtPaceRange({ fast: 290, slow: 310 })).toBe("4:50–5:10 /km");
  });
  it("números con coma decimal", () => {
    expect(fmtKm(10.25, 1)).toMatch(/^10,[23]$/);
    expect(fmtNum(1234.5, 1)).toMatch(/^1\.?234,5$/);
  });
  it("lee tiempos escritos a mano y rechaza lo que no lo es", () => {
    expect(parseTime("45")).toBe(2700);
    expect(parseTime("45:30")).toBe(2730);
    expect(parseTime("1:23:45")).toBe(5025);
    expect(parseTime(" 3:30:00 ")).toBe(12600);
    expect(parseTime("")).toBeUndefined();
    expect(parseTime("abc")).toBeUndefined();
    expect(parseTime("1::2")).toBeUndefined();
    expect(parseTime("1:2:3:4")).toBeUndefined();
    expect(parseTime("-5")).toBeUndefined();
    expect(parseTime("45:75")).toBeUndefined();
  });
});

describe("fisiología", () => {
  it("VDOT y tiempo de carrera son inversos", () => {
    for (const km of [5, 10, 21.0975, 42.195]) {
      const t = raceTimeFromVdot(48, km);
      expect(vdotFromRace(km, t)).toBeCloseTo(48, 0);
    }
  });
  it("más rápido = más VDOT; Riegel escala tiempos", () => {
    expect(vdotFromRace(10, 40 * 60)).toBeGreaterThan(vdotFromRace(10, 50 * 60));
    expect(riegel(10, 3000, 10)).toBeCloseTo(3000);
    expect(riegel(10, 3000, 21.0975)).toBeGreaterThan(3000 * 2.1);
  });
  it("zonas de FC contiguas y crecientes, y cada pulso cae en su zona", () => {
    const z = hrZones(190, 50);
    for (let i = 1; i < z.length; i++) expect(z[i].min).toBe(z[i - 1].max);
    expect(z[4].max).toBe(190);
    expect(zoneOfHr(40, z)).toBe(1);
    expect(zoneOfHr(z[2].min, z)).toBe(3);
    expect(zoneOfHr(200, z)).toBe(5);
    expect(hrMaxOf({ age: 40 })).toBe(180);
    expect(hrMaxOf({ age: 40, hrMax: 192 })).toBe(192);
  });
  it("IMC, etiquetas de VO2max, desnivel y calor", () => {
    expect(bmi(70, 175)).toBeCloseTo(22.9, 1);
    expect(bmiLabel(17)).toBe("Bajo peso");
    expect(bmiLabel(31)).toBe("Obesidad");
    expect(vo2maxLabel(60, "male", 30)).toBe("Superior");
    expect(vo2maxLabel(30, "female", 30)).toBe("Aceptable");
    expect(flatEquivalentKm(10, 0)).toBe(10);
    expect(flatEquivalentKm(10, 500)).toBeGreaterThan(10);
    expect(heatFactor(undefined, 42)).toBe(1);
    expect(heatFactor(10, 42)).toBe(1);
    expect(heatFactor(25, 42)).toBeGreaterThan(heatFactor(25, 10));
  });
  it("semáforos de carga", () => {
    expect(acwrStatus(1.0).tone).toBe("good");
    expect(acwrStatus(1.8).tone).toBe("bad");
    expect(["good", "warn", "bad", "neutral"]).toContain(tsbStatus(-40).tone);
    expect(["good", "warn", "bad", "neutral"]).toContain(tsbStatus(30).tone);
  });
});

describe("importación", () => {
  it("reconoce el deporte por el nombre en inglés o español", () => {
    expect(sportFromName("Run")).toBe("run");
    expect(sportFromName("Trail Run")).toBe("run");
    expect(sportFromName("Carrera")).toBe("run");
    expect(sportFromName("Ride")).toBe("ride");
    expect(sportFromName("Swim")).toBe("swim");
    expect(sportFromName("Hike")).toBe("walk");
    expect(sportFromName("WeightTraining")).toBe("strength");
    expect(sportFromName("Yoga")).toBe("strength");
    expect(sportFromName("")).toBe("other");
    expect(sportFromName(undefined)).toBe("other");
  });
  it("no duplica la misma sesión que llega por dos vías", () => {
    const a = act("strava-1", "2026-10-01T08:00:00", 10000);
    const same = act("file-x", "2026-10-01T08:02:00", 10050); // reloj y Strava
    const other = act("file-y", "2026-10-01T19:00:00", 5000);
    expect(isSameActivity(a, same)).toBe(true);
    expect(isSameActivity(a, other)).toBe(false);
    const r = mergeActivities([a], [same, other, { ...a, name: "renombrada" }]);
    expect(r.added).toBe(1);
    expect(r.skipped).toBe(2);
    expect(r.merged.map((x) => x.id)).toEqual(["strava-1", "file-y"]);
    expect(r.merged[0].name).toBe("renombrada");
  });
  it("hash estable y distinto para contenidos distintos", () => {
    expect(shortHash("abc")).toBe(shortHash("abc"));
    expect(shortHash("abc")).not.toBe(shortHash("abd"));
  });
});

describe("sesión firmada", () => {
  it("acepta su token y rechaza manipulados, caducados o mal formados", async () => {
    const { createToken, verifyToken, sealValue, unsealValue } = await import("./session");
    const t = createToken("user-1");
    expect(verifyToken(t)).toBe("user-1");
    const [uid, exp, sig] = t.split(".");
    expect(verifyToken(`otro.${exp}.${sig}`)).toBeUndefined(); // cambiar el usuario invalida la firma
    expect(verifyToken(`${uid}.${Number(exp) + 999}.${sig}`)).toBeUndefined();
    expect(verifyToken(`${uid}.${exp}`)).toBeUndefined();
    expect(verifyToken("")).toBeUndefined();
    expect(verifyToken(undefined)).toBeUndefined();
    expect(verifyToken("a.b.c.d")).toBeUndefined();
    expect(unsealValue<{ a: number }>(sealValue({ a: 1 }, 60))).toEqual({ a: 1 });
    expect(unsealValue(sealValue({ a: 1 }, -10))).toBeUndefined();
    expect(unsealValue("basura")).toBeUndefined();
    expect(unsealValue("bm8.firma")).toBeUndefined();
  });
});
