"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { updateDb, readDbNow as getDb } from "@/lib/db";
import { deauthorize, syncActivities } from "@/lib/strava";
import { generateDemoActivities } from "@/lib/demo";
import { generatePlan } from "@/lib/engine/planner";
import { computeStats } from "@/lib/engine/stats";
import { findRace } from "@/lib/races";
import { parseTime } from "@/lib/format";
import { diffDays, todayLocal } from "@/lib/dates";
import type { Db, Goal, Level, Profile, Sex } from "@/lib/types";

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const num = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").replace(",", ".").trim();
  return v === "" ? undefined : Number(v);
};

export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const age = num(fd, "age");
  const weightKg = num(fd, "weightKg");
  const heightCm = num(fd, "heightCm");
  if (!age || !weightKg || !heightCm || age < 10 || age > 100 || weightKg < 30 || weightKg > 250 || heightCm < 120 || heightCm > 230)
    return { error: "Revisa edad, peso y altura." };

  const raceDist = num(fd, "raceDistanceKm");
  const raceTime = parseTime(String(fd.get("raceTime") ?? ""));
  const profile: Profile = {
    name: String(fd.get("name") ?? "").trim() || "Atleta",
    sex: (fd.get("sex") as Sex) ?? "male",
    age,
    weightKg,
    heightCm,
    hrMax: num(fd, "hrMax"),
    hrRest: num(fd, "hrRest"),
    level: (fd.get("level") as Level) ?? "principiante",
    yearsRunning: num(fd, "yearsRunning") ?? 0,
    weeklyKm: num(fd, "weeklyKm") ?? 0,
    longestRunKm: num(fd, "longestRunKm") ?? 0,
    recentRace: raceDist && raceTime ? { distanceKm: raceDist, timeSec: raceTime } : undefined,
    daysPerWeek: Math.min(7, Math.max(3, num(fd, "daysPerWeek") ?? 4)),
    longRunDay: num(fd, "longRunDay") ?? 6,
    strengthPerWeek: Math.min(2, Math.max(0, num(fd, "strengthPerWeek") ?? 1)),
    injuries: String(fd.get("injuries") ?? "").trim() || undefined,
  };
  await updateDb((db) => {
    db.profile = profile;
  });
  refresh();
  return { ok: true, message: "Perfil guardado." };
}

export async function saveGoal(_: FormState, fd: FormData): Promise<FormState> {
  const race = findRace(String(fd.get("raceId") ?? "") || undefined);
  const date = String(fd.get("date") ?? "");
  const distanceKm = num(fd, "distanceKm") ?? race?.distanceKm;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Indica la fecha de la carrera." };
  if (diffDays(date, todayLocal()) < 3) return { error: "La fecha debe ser al menos dentro de 3 días." };
  if (!distanceKm || distanceKm < 1 || distanceKm > 100) return { error: "Distancia no válida." };
  const target = String(fd.get("targetTime") ?? "").trim();
  const targetTimeSec = target ? parseTime(target) : undefined;
  if (target && !targetTimeSec) return { error: "Tiempo objetivo con formato h:mm:ss o mm:ss." };

  const goal: Goal = {
    raceId: race?.id,
    name: String(fd.get("name") ?? "").trim() || race?.name || `Carrera ${distanceKm} km`,
    distanceKm,
    date,
    targetTimeSec,
    elevationGainM: num(fd, "elevationGainM") ?? race?.elevationGainM,
    temperatureC: num(fd, "temperatureC") ?? race?.temperatureC,
  };
  await updateDb((db) => {
    db.goal = goal;
  });
  const db = await getDb();
  if (db.profile) {
    await rebuildPlan(db);
    redirect("/plan");
  }
  refresh();
  return { ok: true, message: "Objetivo guardado. Completa tu perfil para generar el plan." };
}

async function rebuildPlan(db: Db) {
  if (!db.profile || !db.goal) return;
  const today = todayLocal();
  const stats = computeStats(db.activities, db.profile, today);
  const hasRecentData = stats.totals.avgWeeklyKm6 > 0;
  const longestRecent = Math.max(
    ...db.activities.filter((a) => a.sport === "run" && diffDays(today, a.date) <= 42).map((a) => a.distanceM / 1000),
    0,
  );
  const plan = generatePlan({
    profile: db.profile,
    goal: db.goal,
    currentVdot: stats.vdot.vdot,
    // datos reales de Strava mandan sobre lo declarado en el perfil
    currentWeeklyKm: hasRecentData ? stats.totals.avgWeeklyKm6 : db.profile.weeklyKm,
    longestRecentKm: longestRecent || db.profile.longestRunKm,
    today,
  });
  plan.notes.push(`VDOT tomado de: ${stats.vdot.source}.`);
  if (hasRecentData) plan.notes.push(`Volumen de partida según tus actividades: ${stats.totals.avgWeeklyKm6.toFixed(0)} km/semana (media 6 semanas).`);
  await updateDb((d) => {
    d.plan = plan;
  });
}

export async function regeneratePlan(): Promise<void> {
  const db = await getDb();
  await rebuildPlan(db);
  refresh();
}

export async function syncStrava(): Promise<FormState> {
  const db = await getDb();
  if (!db.strava) return { error: "Strava no está conectado." };
  try {
    const r = await syncActivities(db.strava, db.activities);
    refresh();
    return {
      ok: true,
      message: `${r.imported} actividades nuevas.${r.rateLimited ? " Límite de Strava alcanzado: vuelve a sincronizar en 15 min para traer el resto." : ""}`,
    };
  } catch (e) {
    return { error: `Error al sincronizar: ${(e as Error).message}` };
  }
}

export async function disconnectStrava(): Promise<void> {
  const db = await getDb();
  if (db.strava) await deauthorize(db.strava);
  await updateDb((d) => {
    d.strava = undefined;
  });
  refresh();
}

export async function loadDemo(): Promise<void> {
  await updateDb((db) => {
    db.activities = [...db.activities.filter((a) => a.source !== "demo"), ...generateDemoActivities(todayLocal())].sort((a, b) =>
      a.startLocal.localeCompare(b.startLocal),
    );
    db.profile ??= {
      name: "Atleta demo",
      sex: "male",
      age: 32,
      weightKg: 72,
      heightCm: 178,
      level: "intermedio",
      yearsRunning: 3,
      weeklyKm: 40,
      longestRunKm: 18,
      daysPerWeek: 5,
      longRunDay: 6,
      strengthPerWeek: 1,
    };
  });
  refresh();
}

export async function clearDemo(): Promise<void> {
  await updateDb((db) => {
    db.activities = db.activities.filter((a) => a.source !== "demo");
  });
  refresh();
}

export async function clearPlan(): Promise<void> {
  await updateDb((db) => {
    db.plan = undefined;
    db.goal = undefined;
  });
  refresh();
}

// ---------- Registro manual de actividades ----------

const SPORTS = ["run", "ride", "swim", "walk", "strength", "other"] as const;

export async function saveActivity(_: FormState, fd: FormData): Promise<FormState> {
  const date = String(fd.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Indica la fecha." };
  if (date > todayLocal()) return { error: "La fecha no puede ser futura." };
  const sport = String(fd.get("sport") ?? "run") as (typeof SPORTS)[number];
  if (!SPORTS.includes(sport)) return { error: "Deporte no válido." };
  const durationSec = parseTime(String(fd.get("duration") ?? ""));
  if (!durationSec || durationSec < 60 || durationSec > 24 * 3600) return { error: "Duración con formato h:mm:ss o mm:ss (mínimo 1 minuto)." };
  const distanceKm = num(fd, "distanceKm") ?? 0;
  if (distanceKm < 0 || distanceKm > 400) return { error: "Distancia no válida." };
  if (sport === "run" && distanceKm > 0 && durationSec / distanceKm < 150) return { error: "Ese ritmo es más rápido que 2:30 /km: revisa distancia y tiempo." };
  const avgHr = num(fd, "avgHr");
  if (avgHr !== undefined && (avgHr < 40 || avgHr > 230)) return { error: "FC media fuera de rango (40-230)." };
  const maxHr = num(fd, "maxHr");
  if (maxHr !== undefined && (maxHr < 40 || maxHr > 240)) return { error: "FC máxima fuera de rango." };
  const rpe = num(fd, "rpe");
  const time = String(fd.get("time") ?? "07:00") || "07:00";
  const existingId = String(fd.get("id") ?? "") || undefined;
  const sessionId = String(fd.get("sessionId") ?? "") || undefined;
  const label: Record<string, string> = { run: "Carrera", ride: "Bici", swim: "Natación", walk: "Caminata", strength: "Fuerza", other: "Entrenamiento" };

  await updateDb((db) => {
    const id = existingId ?? `manual-${Date.now().toString(36)}`;
    const prev = db.activities.find((a) => a.id === id);
    const act = {
      ...prev,
      id,
      source: prev?.source ?? ("manual" as const),
      name: String(fd.get("name") ?? "").trim() || label[sport],
      sport,
      sportRaw: prev?.sportRaw ?? sport,
      date,
      startLocal: `${date}T${/^\d{2}:\d{2}$/.test(time) ? time : "07:00"}:00`,
      distanceM: Math.round(distanceKm * 1000),
      movingSec: durationSec,
      elapsedSec: Math.max(durationSec, prev?.elapsedSec ?? 0),
      elevationGainM: num(fd, "elevationGainM") ?? 0,
      avgHr,
      maxHr,
      avgCadence: num(fd, "avgCadence"),
      rpe: rpe && rpe >= 1 && rpe <= 10 ? rpe : undefined,
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      sessionId,
    };
    db.activities = [...db.activities.filter((a) => a.id !== id), act].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  });
  // nuevo: volver con el formulario limpio para no registrarlo dos veces
  if (!existingId) redirect(sessionId ? "/plan?registrado=1" : "/registrar?guardado=1");
  refresh();
  return { ok: true, message: "Entreno actualizado." };
}

export async function deleteActivity(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.activities = db.activities.filter((a) => a.id !== id);
  });
  redirect("/registrar");
}
