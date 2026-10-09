import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline, routeFromPoints, routeView, simplify, type LatLon } from "./route";

describe("Recorrido", () => {
  it("codifica y decodifica como Google/Strava", () => {
    // ejemplo de la documentación de Google
    const pts: LatLon[] = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    expect(encodePolyline(pts)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual(pts);
  });

  it("simplifica una línea recta larga a sus extremos y respeta el máximo", () => {
    const line: LatLon[] = Array.from({ length: 1000 }, (_, i) => [40 + i * 1e-4, -3]);
    expect(simplify(line, 400)).toEqual([line[0], line[999]]);
    const zigzag: LatLon[] = Array.from({ length: 2000 }, (_, i) => [40 + i * 1e-4, -3 + (i % 2) * 1e-3]);
    expect(simplify(zigzag, 400).length).toBeLessThanOrEqual(400);
  });

  it("ignora puntos sin GPS", () => {
    expect(routeFromPoints([{ lat: 0, lon: 0 }, {}, { lat: 40.4, lon: -3.7 }])).toBeUndefined();
    const r = routeFromPoints([{ lat: 40.4, lon: -3.7 }, { lat: NaN, lon: 1 }, { lat: 40.41, lon: -3.71 }]);
    expect(decodePolyline(r!)).toHaveLength(2);
  });

  it("encaja el recorrido dentro del lienzo con teselas que lo cubren", () => {
    const v = routeView(
      [
        [40.41, -3.71],
        [40.42, -3.69],
        [40.43, -3.7],
      ],
      600,
      300,
    )!;
    for (const [x, y] of v.path) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(600);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
    expect(v.tiles.length).toBeGreaterThan(0);
    expect(v.tiles.every((t) => t.left > -256 && t.top > -256 && t.left < 600 && t.top < 300)).toBe(true);
  });
});
