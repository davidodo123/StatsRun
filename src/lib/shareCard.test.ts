import { describe, expect, it } from "vitest";
import { shareCard } from "./shareCard";
import { encodePolyline } from "./route";
import type { Activity } from "./types";

const base: Activity = { id: "a", source: "manual", name: "Entreno", sport: "run", sportRaw: "Run", date: "2026-10-17", startLocal: "2026-10-17T09:00:00", distanceM: 10230, movingSec: 3120, elapsedSec: 3120, elevationGainM: 84 };

describe("imagen para compartir", () => {
  it("carrera: distancia, ritmo, tiempo, desnivel y el recorrido", () => {
    const route = encodePolyline([
      [37.18, -3.6],
      [37.19, -3.61],
      [37.2, -3.6],
    ]);
    const c = shareCard({ activities: [] }, { ...base, route });
    expect(c.kind).toBe("carrera");
    expect(c.stats.map((s) => s.value)).toEqual(["10,23 km", "5:05 /km", "52:00", "84 m"]);
    expect(c.image?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("fuerza: series, repeticiones, volumen y ejercicios con su mejor peso", () => {
    const c = shareCard(
      { activities: [] },
      {
        ...base,
        sport: "strength",
        distanceM: 0,
        workout: {
          exercises: [{ exerciseId: "Barbell_Squat", name: "Sentadilla", sets: [{ type: "calentamiento", kg: 40, reps: 10 }, { kg: 70, reps: 8 }, { kg: 72.5, reps: 6 }] }],
          emom: { intervalSec: 60, rounds: 12, done: 11 },
        },
      },
    );
    expect(c.kind).toBe("fuerza");
    expect(c.lines).toEqual(["Sentadilla · 2 × 6-8 · 72,5 kg"]);
    expect(c.stats.find((s) => s.label === "Series")?.value).toBe("2");
    expect(c.subtitle).toBe("EMOM 12 min · 11/12 rondas");
    // los cuádriceps salen en naranja en el cuerpo
    expect(Buffer.from(c.image!.split(",")[1], "base64").toString()).toContain('fill="#');
  });
});
