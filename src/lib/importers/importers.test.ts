import { describe, expect, it } from "vitest";
import { FitBaseType, FitEncoder } from "fit-file-parser";
import { parseCsv, parseStravaActivitiesCsv, parseStravaDate } from "./stravaCsv";
import { parseFit, parseGpx, parseTcx } from "./trackFiles";
import { mergeActivities, sportFromName } from "./common";
import { decodePolyline } from "../route";

// Cabecera real de la exportación de Strava (recortada), con columnas repetidas
const HEADER =
  'Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Activity Private Note,Activity Gear,Filename,Athlete Weight,Bike Weight,Elapsed Time,Moving Time,Distance,Max Speed,Average Speed,Elevation Gain,Elevation Loss,Elevation Low,Elevation High,Max Grade,Average Grade,Average Positive Grade,Average Negative Grade,Max Cadence,Average Cadence,Max Heart Rate,Average Heart Rate,Max Watts,Average Watts,Calories';

describe("CSV de Strava", () => {
  it("parsea campos con comillas, comas y saltos de línea", () => {
    expect(parseCsv('a,"b, c","d ""x"""\n1,"2\n3",4')).toEqual([
      ["a", "b, c", 'd "x"'],
      ["1", "2\n3", "4"],
    ]);
  });

  it("fechas en inglés y español (UTC)", () => {
    expect(parseStravaDate("Mar 15, 2024, 6:45:12 PM")?.toISOString()).toBe("2024-03-15T18:45:12.000Z");
    expect(parseStravaDate("15 mar 2024, 6:45:12")?.toISOString()).toBe("2024-03-15T06:45:12.000Z");
    expect(parseStravaDate("2 de ene. de 2025, 7:05:00")?.toISOString()).toBe("2025-01-02T07:05:00.000Z");
    expect(parseStravaDate("Dec 1, 2023, 12:10:00 AM")?.toISOString()).toBe("2023-12-01T00:10:00.000Z");
  });

  it("usa la segunda columna Distance (metros) y Moving Time", () => {
    const row =
      '12345678,"Mar 15, 2024, 6:45:12 AM",Rodaje por el río,Run,"Buen día, sin viento",3700,10.02,175,45,false,,,activities/1.fit.gz,72,,3700,3600,10020.5,4.1,2.78,55,50,10,40,5,0.1,1,1,90,84,175,148,,,700';
    const { activities, errors } = parseStravaActivitiesCsv(`${HEADER}\n${row}\n`);
    expect(errors).toEqual([]);
    expect(activities).toHaveLength(1);
    const a = activities[0];
    expect(a.id).toBe("strava-12345678");
    expect(a.sport).toBe("run");
    expect(a.distanceM).toBe(10021);
    expect(a.movingSec).toBe(3600);
    expect(a.elevationGainM).toBe(55);
    expect(a.avgHr).toBe(148);
    expect(a.avgCadence).toBe(168); // 84 por pierna → 168 ppm
    expect(a.name).toBe("Rodaje por el río");
  });

  it("tipos de actividad en español", () => {
    expect(sportFromName("Carrera")).toBe("run");
    expect(sportFromName("Bicicleta")).toBe("ride");
    expect(sportFromName("Entrenamiento con pesas")).toBe("strength");
    expect(sportFromName("Weight Training")).toBe("strength");
    expect(sportFromName("Natación")).toBe("swim");
    expect(sportFromName("Senderismo")).toBe("walk");
  });

  it("rechaza un CSV que no es de Strava", () => {
    expect(parseStravaActivitiesCsv("a,b\n1,2").errors[0]).toMatch(/Activity ID/);
  });
});

function gpx(withHr = true) {
  const start = Date.parse("2024-05-01T06:00:00Z");
  const pts = Array.from({ length: 121 }, (_, i) => {
    const t = new Date(start + i * 10_000).toISOString();
    // ~ 30 m cada 10 s hacia el norte (3 m/s) y subida de 0,5 m por punto
    const lat = 40 + (i * 30) / 111_195;
    const hr = withHr ? `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr><gpxtpx:cad>85</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>` : "";
    return `<trkpt lat="${lat}" lon="-3.7"><ele>${600 + i * 0.5}</ele><time>${t}</time>${hr}</trkpt>`;
  }).join("");
  return `<?xml version="1.0"?><gpx><metadata><time>x</time></metadata><trk><name>Rodaje GPX</name><type>running</type><trkseg>${pts}</trkseg></trk></gpx>`;
}

describe("archivos de actividad", () => {
  it("GPX: distancia, tiempo, desnivel, FC y cadencia", () => {
    const a = parseGpx(gpx(), "x.gpx")!;
    expect(a.name).toBe("Rodaje GPX");
    expect(a.sport).toBe("run");
    expect(Math.abs(a.distanceM - 3600)).toBeLessThan(20);
    expect(a.movingSec).toBe(1200);
    expect(Math.abs(a.elevationGainM - 60)).toBeLessThan(4);
    expect(a.avgHr).toBe(150);
    expect(a.avgCadence).toBe(170);
    // recorrido guardado (121 puntos: por debajo del máximo, no se simplifica)
    const route = decodePolyline(a.route!);
    expect(route).toHaveLength(121);
    expect(route[0]).toEqual([40, -3.7]);
    expect(route[120][0]).toBeCloseTo(40.03238, 4);
  });

  it("TCX con distancia acumulada", () => {
    const start = Date.parse("2024-05-02T07:00:00Z");
    const tps = Array.from({ length: 61 }, (_, i) => `<Trackpoint><Time>${new Date(start + i * 10_000).toISOString()}</Time><DistanceMeters>${i * 28}</DistanceMeters><HeartRateBpm><Value>140</Value></HeartRateBpm></Trackpoint>`).join("");
    const a = parseTcx(`<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap><Track>${tps}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`, "carrera.tcx")!;
    expect(a.distanceM).toBe(1680);
    expect(a.movingSec).toBe(600);
    expect(a.avgHr).toBe(140);
  });

  it("FIT: lee el resumen de sesión del reloj", async () => {
    const start = new Date("2024-05-03T06:30:00Z");
    const ts = FitEncoder.toFitTimestamp(start);
    const enc = new FitEncoder();
    enc.writeMessage(0, [{ number: 0, size: 1, baseType: FitBaseType.Enum, value: 4 }]); // file_id: activity
    enc.writeMessage(18, [
      { number: 253, size: 4, baseType: FitBaseType.Uint32, value: ts + 3000 },
      { number: 2, size: 4, baseType: FitBaseType.Uint32, value: ts }, // start_time
      { number: 5, size: 1, baseType: FitBaseType.Enum, value: 1 }, // sport running
      { number: 7, size: 4, baseType: FitBaseType.Uint32, value: 3100 * 1000 }, // total_elapsed_time
      { number: 8, size: 4, baseType: FitBaseType.Uint32, value: 3000 * 1000 }, // total_timer_time
      { number: 9, size: 4, baseType: FitBaseType.Uint32, value: 10000 * 100 }, // total_distance
      { number: 16, size: 1, baseType: FitBaseType.Uint8, value: 152 },
      { number: 17, size: 1, baseType: FitBaseType.Uint8, value: 178 },
      { number: 18, size: 1, baseType: FitBaseType.Uint8, value: 86 },
      { number: 22, size: 2, baseType: FitBaseType.Uint16, value: 120 },
    ]);
    const acts = await parseFit(enc.close(), "Garmin-run.fit");
    expect(acts).toHaveLength(1);
    const a = acts[0];
    expect(a.sport).toBe("run");
    expect(a.distanceM).toBe(10000);
    expect(a.movingSec).toBe(3000);
    expect(a.elevationGainM).toBe(120);
    expect(a.avgHr).toBe(152);
    expect(a.avgCadence).toBe(172);
  });

  it("no duplica: misma actividad del CSV y del GPX", () => {
    const fromFile = parseGpx(gpx(), "x.gpx")!;
    const fromCsv = { ...fromFile, id: "strava-1", source: "strava" as const, distanceM: fromFile.distanceM + 40 };
    const r1 = mergeActivities([], [fromCsv]);
    const r2 = mergeActivities(r1.merged, [fromFile]);
    expect(r2.added).toBe(0);
    expect(r2.skipped).toBe(1);
    expect(r2.merged).toHaveLength(1);
    // reimportar el mismo CSV actualiza, no duplica
    expect(mergeActivities(r2.merged, [fromCsv]).merged).toHaveLength(1);
  });
});
