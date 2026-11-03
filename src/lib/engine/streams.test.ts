import { describe, expect, it } from "vitest";
import { bestEfforts, compactStream, gradeAdjustedPace, gradeCost, paceProfile, streamFromPoints, zoneLimits, zoneTimes, type Stream } from "./streams";
import { trainingPaces } from "./physiology";

// 10 km: 5 km a 5:00 /km y 5 km a 4:30 /km, un punto por segundo; del km 2 al 3 sube 50 m
function run(): Stream {
  const t: number[] = [];
  const d: number[] = [];
  const alt: number[] = [];
  let dist = 0;
  for (let sec = 0; dist < 10000; sec++) {
    t.push(sec);
    d.push(dist);
    alt.push(600 + (dist < 2000 ? 0 : dist < 3000 ? ((dist - 2000) / 1000) * 50 : 50));
    dist += dist < 5000 ? 1000 / 300 : 1000 / 270;
  }
  return { t, d, alt };
}

describe("serie de una carrera", () => {
  const s = compactStream(run())!;

  it("se reduce a como mucho 1.500 puntos y conserva el final", () => {
    expect(s.t.length).toBeLessThanOrEqual(1501);
    expect(s.d.at(-1)).toBeGreaterThan(9990);
    expect(s.alt).toHaveLength(s.t.length);
  });

  it("ritmo por tramos: más lento al principio que al final", () => {
    const p = paceProfile(s, 20);
    expect(p).toHaveLength(20);
    expect(p[3].pace).toBeGreaterThan(295);
    expect(p[3].pace).toBeLessThan(305);
    expect(p[17].pace).toBeGreaterThan(265);
    expect(p[17].pace).toBeLessThan(275);
  });

  it("mejores esfuerzos: el km más rápido es de la segunda mitad", () => {
    const e = bestEfforts(s);
    expect(e[1000]).toBeGreaterThanOrEqual(268);
    expect(e[1000]).toBeLessThanOrEqual(272);
    expect(e[5000]).toBeGreaterThanOrEqual(1345);
    expect(e[5000]).toBeLessThanOrEqual(1355);
    expect(e[21097]).toBeUndefined();
  });

  it("ritmo ajustado a la pendiente: con la subida, más rápido que el real", () => {
    const real = (s.t.at(-1)! / s.d.at(-1)!) * 1000;
    const gap = gradeAdjustedPace(s)!;
    expect(gap).toBeLessThan(real);
    expect(gap).toBeGreaterThan(real - 15);
  });

  it("sin altitud, no hay ritmo ajustado", () => {
    expect(gradeAdjustedPace({ t: s.t, d: s.d })).toBeUndefined();
  });

  it("zonas: todo el tiempo repartido en ellas", () => {
    const z = zoneTimes(s, zoneLimits(trainingPaces(45)));
    expect(z.reduce((a, b) => a + b, 0)).toBeGreaterThan(2800);
    expect(z).toHaveLength(6);
  });

  it("subir cuesta más que bajar, y en llano el coste es 1", () => {
    expect(gradeCost(0)).toBeCloseTo(1);
    expect(gradeCost(0.1)).toBeGreaterThan(1.4);
    expect(gradeCost(-0.05)).toBeLessThan(1);
  });
});

describe("serie desde el GPS", () => {
  it("calcula la distancia entre puntos", () => {
    // 0,001° de latitud ≈ 111 m
    const pts = Array.from({ length: 11 }, (_, i) => ({ t: i * 30_000, lat: 37.2 + i * 0.001, lon: -3.6, alt: 630 }));
    const s = streamFromPoints(pts)!;
    expect(s.d.at(-1)).toBeGreaterThan(1100);
    expect(s.d.at(-1)).toBeLessThan(1125);
    expect(s.t.at(-1)).toBe(300);
  });
});
