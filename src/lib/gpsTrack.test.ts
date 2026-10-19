import { describe, expect, it } from "vitest";
import { acceptPoint, haversine, trackStats, type GpsPoint } from "./gpsTrack";

// carrera en línea recta hacia el norte a `v` m/s, un punto cada `step` s
const line = (sec: number, v = 3, step = 2, t0 = 0, lat0 = 37.18): GpsPoint[] =>
  Array.from({ length: Math.floor(sec / step) + 1 }, (_, i) => ({ t: t0 + i * step * 1000, lat: lat0 + (i * step * v) / 111_195, lon: -3.6, acc: 5 }));

describe("carrera con GPS", () => {
  it("distancia, tiempo y parciales de 2 km a 5:33 /km", () => {
    const s = trackStats(line(668));
    expect(s.distanceM).toBeGreaterThan(1990);
    expect(s.distanceM).toBeLessThan(2010);
    expect(s.movingSec).toBe(668);
    expect(s.splits).toHaveLength(2);
    expect(s.splits[0]).toBeGreaterThan(330);
    expect(s.splits[0]).toBeLessThan(337);
    expect(s.paceNow).toBeGreaterThan(330);
    expect(s.paceNow).toBeLessThan(337);
  });

  it("parado no cuenta como tiempo en movimiento", () => {
    const run = line(300);
    const last = run.at(-1)!;
    const stopped = Array.from({ length: 6 }, (_, i) => ({ ...last, t: last.t + (i + 1) * 10_000 }));
    expect(trackStats([...run, ...stopped]).movingSec).toBe(300);
  });

  it("tras una pausa, el tramo de la pausa no cuenta", () => {
    const a = line(100);
    const b = line(100, 3, 2, a.at(-1)!.t + 600_000, a.at(-1)!.lat + 0.01).map((p, i) => (i ? p : { ...p, b: 1 as const }));
    const s = trackStats([...a, ...b]);
    expect(s.distanceM).toBeLessThan(620);
    expect(s.movingSec).toBe(200);
  });

  it("desnivel: suma subidas de más de 4 m e ignora el baile del GPS", () => {
    const pts = line(100).map((p, i) => ({ ...p, alt: 600 + (i % 2) * 2 + i * 0.5 }));
    const s = trackStats(pts);
    expect(s.elevationGainM).toBeGreaterThan(20);
    expect(s.elevationGainM).toBeLessThan(30);
  });

  it("descarta puntos imprecisos y saltos imposibles", () => {
    const a = { t: 0, lat: 37.18, lon: -3.6, acc: 5 };
    expect(acceptPoint(a, { ...a, t: 2000, lat: 37.18003, acc: 80 })).toBe(false);
    expect(acceptPoint(a, { ...a, t: 2000, lat: 37.181 })).toBe(false); // 111 m en 2 s
    expect(acceptPoint(a, { ...a, t: 2000, lat: 37.18006 })).toBe(true); // 6,7 m
    expect(acceptPoint(a, { ...a, t: 2000, lat: 37.180005 })).toBe(false); // quieto
    expect(haversine(a, { lat: 37.19, lon: -3.6 })).toBeCloseTo(1112, -1);
  });
});
