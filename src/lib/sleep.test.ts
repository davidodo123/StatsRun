import { describe, expect, it } from "vitest";
import { bedTimes, wakeTimes } from "./sleep";

describe("calculadora de sueño", () => {
  it("al acostarse: 15 min para dormirse y ciclos de 90 min, pasando la medianoche", () => {
    expect(wakeTimes("23:00").map((o) => o.time)).toEqual(["08:15", "06:45", "05:15", "03:45"]);
    expect(wakeTimes("00:30")[1]).toEqual({ cycles: 5, time: "08:15", sleepMin: 450 });
  });

  it("para levantarse a una hora: cuándo acostarse (también el día anterior)", () => {
    expect(bedTimes("07:00").map((o) => o.time)).toEqual(["21:45", "23:15", "00:45", "02:15"]);
  });

  it("horas no válidas", () => {
    expect(wakeTimes("25:00")).toEqual([]);
    expect(bedTimes("abc")).toEqual([]);
  });
});
