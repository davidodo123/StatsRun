"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { updateDb, readDbNow as getDb } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { deauthorize, syncActivities } from "@/lib/strava";
import { generateDemoActivities } from "@/lib/demo";
import { applyBlockedDates, applyTuneUpRaces, availableDaysOf, generatePlan } from "@/lib/engine/planner";
import { computeStats } from "@/lib/engine/stats";
import { profileAverages } from "@/lib/engine/profile";
import { areFriends, getFriends } from "@/lib/auth";import { findRace } from "@/lib/races";
import { adaptWithAI, coachConfig } from "@/lib/coach";
import { parseTime } from "@/lib/format";
import { createHealthToken, revokeHealthToken } from "@/lib/healthToken";
import { addDays, diffDays, todayLocal } from "@/lib/dates";
import type { Db, Feel, Goal, Level, Profile, Sex, TuneUpRace } from "@/lib/types";

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/** Tras cambiar datos, la IA reajusta los próximos entrenos en segundo plano. */
async function scheduleAiAdapt() {
  if (!coachConfig().configured) return;
  // el usuario se resuelve ahora: dentro de after() ya no hay petición de la que leer la sesión
  const uid = await requireUserId();
  after(() => adaptWithAI(uid).then(() => undefined));
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

  const availableDays = [...new Set(fd.getAll("availableDays").map(Number))].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (availableDays.length < 2) return { error: "Marca al menos 2 días en los que puedas entrenar." };
  const longRunDay = num(fd, "longRunDay") ?? 6;
  if (!availableDays.includes(longRunDay)) return { error: "El día de la tirada larga tiene que ser uno de tus días disponibles." };

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
    daysPerWeek: availableDays.length,
    availableDays,
    longRunDay,
    strengthPerWeek: Math.min(2, Math.max(0, num(fd, "strengthPerWeek") ?? 1)),
    injuries: String(fd.get("injuries") ?? "").trim() || undefined,
  };
  const prev = (await getDb()).profile;
  await updateDb((db) => {
    db.profile = profile;
  });
  // si cambia la disponibilidad, rehacer el plan sobre los nuevos días
  const db = await getDb();
  const sameSchedule =
    prev && availableDaysOf(prev).join() === availableDays.join() && prev.longRunDay === longRunDay && prev.strengthPerWeek === profile.strengthPerWeek;
  if (db.plan && !sameSchedule) {
    await rebuildPlan(db);
    await scheduleAiAdapt();
    refresh();
    return { ok: true, message: "Perfil guardado. Plan reorganizado con tus nuevos días; la IA lo está ajustando." };
  }
  refresh();
  return { ok: true, message: "Perfil guardado." };
}

/** Actualiza los km/semana y la tirada más larga del perfil con la media real de las últimas 6 semanas. */
export async function syncProfileAverages(): Promise<void> {
  const today = todayLocal();
  await updateDb((db) => {
    const avg = profileAverages(db.activities, today);
    if (!db.profile || !avg) return;
    db.profile = { ...db.profile, weeklyKm: avg.weeklyKm, longestRunKm: avg.longestRunKm };
  });
  refresh();
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
    // misma carrera (cambio de fecha u objetivo): se conserva el recorrido subido
    const prev = db.goal;
    const same = prev && (goal.raceId ? prev.raceId === goal.raceId : prev.name === goal.name);
    db.goal = same && prev.course ? { ...goal, course: prev.course } : goal;
  });
  const db = await getDb();
  if (db.profile) {
    await rebuildPlan(db);
    await scheduleAiAdapt();
    redirect("/plan");
  }
  refresh();
  return { ok: true, message: "Objetivo guardado. Completa tu perfil para generar el plan." };
}

/** Usa el desnivel del recorrido subido para la carrera objetivo y rehace el plan (cambia el ritmo previsto). */
export async function applyCourseToPlan(): Promise<void> {
  await updateDb((db) => {
    const c = db.goal?.course;
    if (db.goal && c?.elevationGainM !== undefined) db.goal = { ...db.goal, elevationGainM: c.elevationGainM };
  });
  const db = await getDb();
  if (db.profile && db.goal) {
    await rebuildPlan(db);
    await scheduleAiAdapt();
  }
  refresh();
}

export async function removeCourse(): Promise<void> {
  await updateDb((db) => {
    if (db.goal) delete db.goal.course;
  });
  refresh();
}

async function rebuildPlan(db: Db) {
  if (!db.profile || !db.goal) return;
  const today = todayLocal();
  const stats = computeStats(db.activities, db.profile, today);
  const hasRecentData = stats.totals.avgWeeklyKm6 > 0;
  const longestRecent = Math.max(
    // ventana de 30 días, como el tope de pico por sesión (Frandsen 2025)
    ...db.activities.filter((a) => a.sport === "run" && diffDays(today, a.date) < 30).map((a) => a.distanceM / 1000),
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
  // primero las carreras secundarias, para que lo que se mueva por días no disponibles las respete
  applyTuneUpRaces(plan, db.races ?? [], today);
  applyBlockedDates(plan, db.unavailableDates ?? [], availableDaysOf(db.profile), today);
  plan.notes.push(`VDOT tomado de: ${stats.vdot.source}.`);
  if (hasRecentData) plan.notes.push(`Volumen de partida según tus actividades: ${stats.totals.avgWeeklyKm6.toFixed(0)} km/semana (media 6 semanas).`);
  await updateDb((d) => {
    d.plan = plan;
  });
}

export async function regeneratePlan(): Promise<void> {
  const db = await getDb();
  await rebuildPlan(db);
  await scheduleAiAdapt();
  refresh();
}

export async function adaptPlanWithAI(): Promise<FormState> {
  const r = await adaptWithAI(await requireUserId());
  refresh();
  return r.ok ? { ok: true, message: `${r.changed} sesiones ajustadas. ${r.message}` } : { error: r.message };
}

export async function syncStrava(): Promise<FormState> {
  const db = await getDb();
  if (!db.strava) return { error: "Strava no está conectado." };
  try {
    const r = await syncActivities(db.strava, db.activities, 365, 10, !db.routesSynced);
    if (r.imported > 0) await scheduleAiAdapt();
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

// ---------- Carreras secundarias de la temporada ----------

export async function addTuneUpRace(_: FormState, fd: FormData): Promise<FormState> {
  const today = todayLocal();
  const date = String(fd.get("date") ?? "");
  const distanceKm = num(fd, "distanceKm");
  const priority: TuneUpRace["priority"] = fd.get("priority") === "C" ? "C" : "B";
  const target = String(fd.get("targetTime") ?? "").trim();
  const targetTimeSec = target ? parseTime(target) : undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today) return { error: "Indica una fecha a partir de mañana." };
  if (!distanceKm || distanceKm < 1 || distanceKm > 100) return { error: "Distancia no válida." };
  if (target && !targetTimeSec) return { error: "Tiempo objetivo con formato h:mm:ss o mm:ss." };
  const db = await getDb();
  if (!db.goal) return { error: "Primero elige la carrera principal." };
  if (date >= db.goal.date) return { error: `Tiene que ser antes de ${db.goal.name} (${db.goal.date}).` };
  if ((db.races ?? []).some((r) => r.date === date)) return { error: "Ya hay otra carrera ese día." };
  if ((db.races ?? []).filter((r) => r.date >= today).length >= 8) return { error: "Como máximo 8 carreras secundarias." };

  await updateDb((d) => {
    d.races = [
      ...(d.races ?? []),
      { id: crypto.randomUUID().slice(0, 8), name: String(fd.get("name") ?? "").trim().slice(0, 80) || `Carrera ${distanceKm} km`, distanceKm, date, priority, targetTimeSec },
    ].sort((a, b) => a.date.localeCompare(b.date));
  });
  await rebuildPlan(await getDb());
  await scheduleAiAdapt();
  refresh();
  return { ok: true, message: "Carrera añadida. El plan se ha reorganizado a su alrededor." };
}

export async function removeTuneUpRace(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.races = (db.races ?? []).filter((r) => r.id !== id);
  });
  await rebuildPlan(await getDb());
  await scheduleAiAdapt();
  refresh();
}

// ---------- Salud del iPhone (atajo) ----------

export interface HealthKeyState extends FormState {
  token?: string;
}

/** Crea la clave del atajo (la anterior deja de valer). Se enseña una sola vez. */
export async function newHealthKey(): Promise<HealthKeyState> {
  const token = await createHealthToken(await requireUserId());
  refresh();
  return { ok: true, token };
}

export async function revokeHealthKey(): Promise<void> {
  await revokeHealthToken(await requireUserId());
  refresh();
}

// ---------- Disponibilidad puntual ----------

/** Marca un día o rango como no disponible: mueve las sesiones afectadas y la IA rehace la rutina. */
export async function markUnavailable(_: FormState, fd: FormData): Promise<FormState> {
  const from = String(fd.get("from") ?? "");
  const to = String(fd.get("to") ?? "") || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return { error: "Revisa las fechas." };
  if (diffDays(to, from) > 60) return { error: "Como máximo 60 días seguidos." };
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  const today = todayLocal();
  let moved = 0;
  let dropped = 0;
  await updateDb((db) => {
    db.unavailableDates = [...new Set([...(db.unavailableDates ?? []), ...dates])].filter((d) => diffDays(today, d) <= 30).sort();
    if (db.plan && db.profile) ({ moved, dropped } = applyBlockedDates(db.plan, db.unavailableDates, availableDaysOf(db.profile), today));
  });
  await scheduleAiAdapt();
  refresh();
  const what = [moved && `${moved} movidas`, dropped && `${dropped} quitadas`].filter(Boolean).join(", ");
  return { ok: true, message: `Anotado.${what ? ` Sesiones ${what}.` : ""}${coachConfig().configured ? " La IA está rehaciendo tu rutina." : ""}` };
}

/** "No pude hacerla": marca el día de una sesión (pasada o futura) como no disponible. */
export async function skipSession(fd: FormData): Promise<void> {
  const date = String(fd.get("date") ?? "");
  const f = new FormData();
  f.set("from", date);
  await markUnavailable({}, f);
}

export async function clearUnavailable(fd: FormData): Promise<void> {
  const date = String(fd.get("date") ?? "");
  await updateDb((db) => {
    db.unavailableDates = (db.unavailableDates ?? []).filter((d) => d !== date);
  });
  refresh();
}

// ---------- Registro manual de actividades ----------

const SPORTS = ["run", "ride", "swim", "walk", "strength", "other"] as const;
const FEELS: Feel[] = ["muy_facil", "facil", "bien", "duro", "muy_duro"];

export async function saveActivity(_: FormState, fd: FormData): Promise<FormState> {
  const date = String(fd.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Indica la fecha." };
  if (date > todayLocal()) return { error: "La fecha no puede ser futura." };
  const sport = String(fd.get("sport") ?? "run") as (typeof SPORTS)[number];
  if (!SPORTS.includes(sport)) return { error: "Deporte no válido." };
  const distanceKm = num(fd, "distanceKm") ?? 0;
  if (distanceKm < 0 || distanceKm > 400) return { error: "Distancia no válida." };
  // tiempo en movimiento; si no se indica, a partir del ritmo medio y la distancia
  const paceSec = parseTime(String(fd.get("pace") ?? ""));
  const typedSec = parseTime(String(fd.get("duration") ?? ""));
  const durationSec = typedSec ?? (paceSec && distanceKm > 0 ? Math.round(paceSec * distanceKm) : undefined);
  if (!durationSec || durationSec < 60 || durationSec > 24 * 3600)
    return { error: "Indica el tiempo en movimiento (h:mm:ss o mm:ss, mínimo 1 minuto) o la distancia y el ritmo medio." };
  if (sport === "run" && distanceKm > 0 && durationSec / distanceKm < 150) return { error: "Ese ritmo es más rápido que 2:30 /km: revisa distancia y tiempo." };
  const avgHr = num(fd, "avgHr");
  if (avgHr !== undefined && (avgHr < 40 || avgHr > 230)) return { error: "FC media fuera de rango (40-230)." };
  const maxHr = num(fd, "maxHr");
  if (maxHr !== undefined && (maxHr < 40 || maxHr > 240)) return { error: "FC máxima fuera de rango." };
  const steps = num(fd, "steps");
  if (steps !== undefined && (steps < 0 || steps > 200_000)) return { error: "Pasos fuera de rango." };
  const maxAltitudeM = num(fd, "maxAltitudeM");
  if (maxAltitudeM !== undefined && (maxAltitudeM < -500 || maxAltitudeM > 9000)) return { error: "Altitud máxima fuera de rango." };
  // sin cadencia del reloj, se saca de los pasos: pasos por minuto en movimiento
  const stepCadence = steps && (sport === "run" || sport === "walk") ? Math.round(steps / (durationSec / 60)) : undefined;
  const avgCadence = num(fd, "avgCadence") ?? (stepCadence && stepCadence >= 30 && stepCadence <= 260 ? stepCadence : undefined);
  const rpe = num(fd, "rpe");
  const time = String(fd.get("time") ?? "07:00") || "07:00";
  const existingId = String(fd.get("id") ?? "") || undefined;
  const sessionId = String(fd.get("sessionId") ?? "") || undefined;
  const label: Record<string, string> = { run: "Carrera", ride: "Bici", swim: "Natación", walk: "Caminata", strength: "Fuerza", other: "Entrenamiento" };
  // solo se puede añadir a amigos
  const friendIds = new Set((await getFriends(await requireUserId())).map((f) => f.id));
  const withIds = [...new Set(fd.getAll("with").map(String))].filter((x) => friendIds.has(x));

  const id = existingId ?? `manual-${Date.now().toString(36)}`;
  await updateDb((db) => {
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
      avgCadence,
      steps: steps || undefined,
      maxAltitudeM,
      rpe: rpe && rpe >= 1 && rpe <= 10 ? rpe : undefined,
      feel: FEELS.find((f) => f === fd.get("feel")),
      feelings: String(fd.get("feelings") ?? "").trim().slice(0, 1000) || undefined,
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      sessionId,
      with: withIds.length ? withIds : undefined,
    };
    db.activities = [...db.activities.filter((a) => a.id !== id), act].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  });
  await scheduleAiAdapt();
  // nuevo: volver con el formulario limpio para no registrarlo dos veces
  if (!existingId) redirect(sessionId ? "/plan?registrado=1" : `/registrar?guardado=${encodeURIComponent(id)}`);
  refresh();
  return { ok: true, message: "Entreno actualizado." };
}

/** Añade a mis entrenos la sesión en la que me ha incluido un amigo (copia distancia, tiempo, desnivel y recorrido). */
export async function copySharedActivity(fd: FormData): Promise<void> {
  const uid = await requireUserId();
  const ownerId = String(fd.get("owner") ?? "");
  const actId = String(fd.get("id") ?? "");
  if (!(await areFriends(uid, ownerId))) return;
  const src = (await getDb(ownerId)).activities.find((a) => a.id === actId);
  if (!src?.with?.includes(uid)) return;
  const sharedFrom = `${ownerId}:${actId}`;
  await updateDb((db) => {
    if (db.activities.some((a) => a.sharedFrom === sharedFrom)) return;
    db.activities = [
      ...db.activities,
      {
        id: `shared-${Date.now().toString(36)}`,
        source: "manual" as const,
        name: src.name,
        sport: src.sport,
        sportRaw: src.sportRaw,
        date: src.date,
        startLocal: src.startLocal,
        distanceM: src.distanceM,
        movingSec: src.movingSec,
        elapsedSec: src.elapsedSec,
        elevationGainM: src.elevationGainM,
        maxAltitudeM: src.maxAltitudeM,
        route: src.route,
        // el pulso, el RPE y las sensaciones son de cada uno: se rellenan al editarla
        with: [ownerId],
        sharedFrom,
      },
    ].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  });
  await scheduleAiAdapt();
  refresh();
}

/** Descarta una sesión compartida sin añadirla. */
export async function dismissSharedActivity(fd: FormData): Promise<void> {
  const sharedFrom = `${String(fd.get("owner") ?? "")}:${String(fd.get("id") ?? "")}`;
  await updateDb((db) => {
    db.dismissedShared = [...new Set([...(db.dismissedShared ?? []), sharedFrom])].slice(-200);
  });
  refresh();
}

export async function deleteActivity(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.activities = db.activities.filter((a) => a.id !== id);
  });
  // la vuelta a la página de antes la hace el botón (DeleteActivityButton), que sabe de dónde se venía
  refresh();
}
