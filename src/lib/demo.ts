// Generador de actividades de ejemplo para probar la app sin Strava.
import type { Activity } from "./types";
import { addDays, weekday } from "./dates";
import { raceTimeFromVdot, trainingPaces } from "./engine/physiology";

/** PRNG determinista (mulberry32) para que la demo sea reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoActivities(today: string, days = 180, endVdot = 46): Activity[] {
  const r = rng(42);
  const out: Activity[] = [];
  const startVdot = endVdot - 4;
  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i);
    const wd = weekday(date);
    const progress = 1 - i / days;
    const vdot = startVdot + (endVdot - startVdot) * progress;
    const p = trainingPaces(vdot);
    const weekScale = 0.75 + 0.35 * progress * (Math.floor(i / 7) % 4 === 2 ? 0.7 : 1);
    const base = { source: "demo" as const, elevationGainM: 0, sportRaw: "Run" };
    let a: Partial<Activity> | undefined;

    if (r() < 0.06) continue; // días saltados al azar
    if (wd === 1) {
      // series
      const km = 9 * weekScale;
      const pace = (p.interval.fast + p.easy.slow) / 2;
      a = { name: "Series 6×1000", distanceM: km * 1000, movingSec: km * pace, avgHr: 158 + r() * 6, elevationGainM: 20 };
    } else if (wd === 3) {
      const km = 10 * weekScale;
      const pace = (p.threshold.slow * 0.6 + p.easy.fast * 0.4);
      a = { name: "Tempo", distanceM: km * 1000, movingSec: km * pace, avgHr: 152 + r() * 5, elevationGainM: 35 };
    } else if (wd === 6) {
      const km = (12 + 8 * progress) * weekScale + r() * 2;
      a = { name: "Tirada larga", distanceM: km * 1000, movingSec: km * (p.easy.fast + 15), avgHr: 142 + r() * 6, elevationGainM: 80 + r() * 80 };
    } else if (wd === 2 || wd === 5) {
      const km = (7 + r() * 3) * weekScale;
      a = { name: "Rodaje suave", distanceM: km * 1000, movingSec: km * (p.easy.fast + 10 + r() * 15), avgHr: 136 + r() * 6, elevationGainM: 30 + r() * 40 };
    } else if (wd === 4 && r() < 0.6) {
      out.push(mkAct(date, i, { ...base, sport: "strength", sportRaw: "WeightTraining", name: "Gimnasio", distanceM: 0, movingSec: 2400 + r() * 900, avgHr: 110 }));
      continue;
    } else if (wd === 0 && r() < 0.35) {
      const h = 1 + r();
      out.push(mkAct(date, i, { ...base, sport: "ride", sportRaw: "Ride", name: "Bici", distanceM: h * 26000, movingSec: h * 3600, avgHr: 128 + r() * 8, elevationGainM: 300 * h }));
      continue;
    }
    if (!a) continue;
    out.push(mkAct(date, i, { ...base, sport: "run", avgCadence: 168 + r() * 10 + progress * 4, ...a }));
  }
  // Una carrera de 10K hace 5 semanas
  const raceDate = addDays(today, -35);
  const t = raceTimeFromVdot(endVdot - 1, 10);
  out.push(mkAct(raceDate, 999, { source: "demo", sport: "run", sportRaw: "Run", name: "Carrera 10K popular", distanceM: 10000, movingSec: t, avgHr: 172, elevationGainM: 25, avgCadence: 182 }));
  return out.sort((a, b) => a.startLocal.localeCompare(b.startLocal));
}

function mkAct(date: string, i: number, a: Partial<Activity>): Activity {
  const moving = Math.round(a.movingSec ?? 0);
  return {
    id: `demo-${date}-${i}-${a.sport}`,
    source: "demo",
    name: a.name ?? "Actividad",
    sport: a.sport ?? "run",
    sportRaw: a.sportRaw ?? "Run",
    date,
    startLocal: `${date}T07:30:00`,
    distanceM: Math.round(a.distanceM ?? 0),
    movingSec: moving,
    elapsedSec: Math.round(moving * 1.03),
    elevationGainM: Math.round(a.elevationGainM ?? 0),
    avgHr: a.avgHr ? Math.round(a.avgHr) : undefined,
    maxHr: a.avgHr ? Math.round(a.avgHr + 12) : undefined,
    avgCadence: a.avgCadence ? Math.round(a.avgCadence) : undefined,
  };
}
