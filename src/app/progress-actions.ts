"use server";
import { say } from "@/lib/i18n/server";
// «Progreso» de Estadísticas: objetivos de semana, mes o año y mejores esfuerzos de las carreras antiguas de Strava.

import { refresh } from "next/cache";
import { readDbNow, updateDb } from "@/lib/db";
import { bestEfforts } from "@/lib/engine/streams";
import { suggestedTarget } from "@/lib/engine/progress";
import { fetchStream } from "@/lib/strava";
import { getStream, putStream } from "@/lib/streamStore";
import { requireUserId } from "@/lib/session";
import { todayLocal } from "@/lib/dates";
import type { SportKind, Target } from "@/lib/types";
import type { FormState } from "./actions";

const PERIODS: Target["period"][] = ["week", "month", "year"];
const METRICS: Target["metric"][] = ["km", "hours", "elev", "count"];
const SPORTS: (SportKind | "all")[] = ["all", "run", "ride", "swim", "walk", "strength", "other"];
const MAX_TARGETS = 6;

export async function addTarget(_: FormState, fd: FormData): Promise<FormState> {
  const period = PERIODS.find((p) => p === fd.get("period"));
  const metric = METRICS.find((m) => m === fd.get("metric"));
  const sport = SPORTS.find((s) => s === fd.get("sport")) ?? "run";
  const value = Number(String(fd.get("value") ?? "").replace(",", "."));
  if (!period || !metric || !Number.isFinite(value) || value <= 0 || value > 100_000) return { error: await say("Revisa el objetivo.") };
  return saveTarget({ id: crypto.randomUUID().slice(0, 8), period, metric, sport, value: Math.round(value * 10) / 10 });
}

/** El objetivo que se le sugiere («3 carreras a la semana»), de un toque. */
export async function addSuggestedTarget(): Promise<FormState> {
  const db = await readDbNow();
  return saveTarget({ ...suggestedTarget(db.activities, todayLocal()), id: crypto.randomUUID().slice(0, 8) });
}

async function saveTarget(target: Target): Promise<FormState> {
  let full = false;
  await updateDb((db) => {
    const list = (db.targets ?? []).filter((x) => !(x.period === target.period && x.metric === target.metric && x.sport === target.sport));
    full = list.length >= MAX_TARGETS;
    if (!full) db.targets = [...list, target];
  });
  if (full) return { error: await say("Como mucho 6 objetivos.") };
  refresh();
  return { ok: true };
}

export async function deleteTarget(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.targets = (db.targets ?? []).filter((x) => x.id !== id);
  });
  refresh();
}

// cada carrera es una lectura de la API de Strava (límite de la app: 100 cada 15 min entre todos)
const EFFORTS_PER_CALL = 8;

/**
 * Trae de Strava la serie de unas cuantas carreras antiguas que aún no tienen sus mejores esfuerzos
 * (las más recientes primero) para los mejores tiempos con medalla. Devuelve cuántas quedan.
 */
export async function loadOldEfforts(): Promise<{ done: number; left: number }> {
  const uid = await requireUserId();
  const db = await readDbNow(uid);
  const pending = db.activities
    .filter((a) => a.sport === "run" && a.source === "strava" && a.efforts === undefined && a.distanceM >= 400)
    .sort((x, y) => y.startLocal.localeCompare(x.startLocal));
  if (!db.strava || !pending.length) return { done: 0, left: 0 };
  const found = new Map<string, Partial<Record<number, number>>>();
  for (const a of pending.slice(0, EFFORTS_PER_CALL)) {
    let s = await getStream(uid, a.id);
    if (s === undefined) {
      const got = await fetchStream(db.strava, a.id).catch(() => "limite" as const);
      if (got === "limite") break;
      await putStream(uid, a.id, got);
      s = got;
    }
    // sin serie (cinta, sin GPS): vacío, para no volver a pedirla
    found.set(a.id, s ? bestEfforts(s) : {});
  }
  if (found.size) {
    await updateDb((d) => {
      for (const a of d.activities) if (found.has(a.id)) a.efforts = found.get(a.id);
    }, uid);
    refresh();
  }
  return { done: found.size, left: pending.length - found.size };
}
