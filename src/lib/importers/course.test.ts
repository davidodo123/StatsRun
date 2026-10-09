import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseCourseFile, parseKml } from "./course";
import { decodePolyline } from "../route";

// recorrido de ida y vuelta de ~2 km hacia el norte, con una subida de 20 m (estructura como los KMZ de cruzandolameta)
const line = Array.from({ length: 21 }, (_, i) => {
  const k = i <= 10 ? i : 20 - i;
  return `-3.7,${(37 + (k * 100) / 111_195).toFixed(7)},${600 + k * 2}`;
}).join(" ");
const KML = `<?xml version="1.0"?><kml><Document><name>Carrera de prueba</name>
<Placemark><name>Track</name><LineString><coordinates>${line}</coordinates></LineString></Placemark>
<Placemark><styleUrl>#msn_start-race-2</styleUrl><Point><coordinates>-3.7,37,0</coordinates></Point></Placemark>
<Placemark><styleUrl>#msn_glasswater</styleUrl><Point><coordinates>-3.7,37.009,0</coordinates></Point></Placemark>
<Placemark><TimeSpan><begin>2023-09-21T07:32:05Z</begin></TimeSpan><Point><coordinates>-3.7,37.001,598</coordinates></Point></Placemark>
</Document></kml>`;

describe("Recorridos de carrera", () => {
  it("KML: trazado, distancia, desnivel y marcadores (sin los puntos de traza con hora)", () => {
    const c = parseCourseFile("carrera.kml", strToU8(KML));
    expect(c.distanceKm).toBeCloseTo(2, 1);
    expect(c.elevationGainM).toBe(20); // 600 → 620 en escalones de 2 m: el umbral de 3 m los acumula de 4 en 4
    expect(c.elevationLossM).toBe(20);
    expect(c.markers.map((m) => m.kind)).toEqual(["salida", "agua"]);
    expect(c.name).toBe("Carrera de prueba");
    expect(decodePolyline(c.route).length).toBeGreaterThan(2);
  });

  it("KMZ: lee el doc.kml del zip", () => {
    const kmz = zipSync({ "doc.kml": strToU8(KML), "files/finish.png": new Uint8Array([1, 2, 3]) });
    expect(parseCourseFile("Carrera.KMZ", kmz).distanceKm).toBeCloseTo(2, 1);
  });

  it("GPX de ruta (rtept) sin horas y con puntos de paso", () => {
    const pts = Array.from({ length: 11 }, (_, i) => `<rtept lat="${(40 + (i * 100) / 111_195).toFixed(7)}" lon="-3.7"><ele>650</ele></rtept>`).join("");
    const gpx = `<gpx><wpt lat="40.005" lon="-3.7"><name>Avituallamiento km 5</name></wpt><rte><name>Ruta</name>${pts}</rte></gpx>`;
    const c = parseCourseFile("ruta.gpx", strToU8(gpx));
    expect(c.distanceKm).toBeCloseTo(1, 1);
    expect(c.elevationGainM).toBe(0);
    expect(c.markers).toEqual([{ kind: "agua", lat: 40.005, lon: -3.7, name: "Avituallamiento km 5" }]);
  });

  it("sin línea no hay recorrido; formatos no admitidos se rechazan", () => {
    expect(() => parseCourseFile("x.kml", strToU8("<kml><Document></Document></kml>"))).toThrow(/recorrido/);
    expect(() => parseCourseFile("x.pdf", new Uint8Array())).toThrow(/Formato/);
    expect(parseKml(KML).points).toHaveLength(21);
  });
});
