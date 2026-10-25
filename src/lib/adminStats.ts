// Panel de administración: el resumen de cada usuario y el total, a partir de sus documentos (función pura, con tests).
import type { Db } from "./types";
import { addDays, mondayOf } from "./dates";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  createdAt: string;
  friends: number;
}

export interface AdminRow {
  id: string;
  name: string;
  username: string;
  email?: string;
  since: string; // AAAA-MM-DD de alta
  lastActivity?: string; // fecha del último entreno
  activities: number;
  last7: number; // entrenos en los últimos 7 días
  goal?: string; // carrera objetivo
  plan: boolean;
  aiToday: { chat: number; adapt: number };
  aiError?: string; // último fallo de la IA al ajustar su plan
  health?: "iPhone" | "Android"; // de dónde le llegan pasos y sueño
  push: boolean; // avisos de cada mañana activados
  friends: number;
  kb: number; // tamaño de su documento
}

export interface AdminTotals {
  users: number;
  active7: number; // con algún entreno en los últimos 7 días
  newThisWeek: number;
  activitiesWeek: number; // entrenos de esta semana (desde el lunes)
  aiChatToday: number;
  aiAdaptToday: number;
  kb: number;
}

const used = (db: Db, use: "chat" | "adapt", today: string) => {
  const u = db.aiUsage?.[use];
  return u && u.period === today ? u.n : 0;
};

export function adminRow(u: AdminUser, db: Db, raw: string, today: string): AdminRow {
  const weekAgo = addDays(today, -6);
  const dates = db.activities.map((a) => a.date).sort();
  const lastHealth = db.health?.at(-1)?.updatedAt;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    since: u.createdAt.slice(0, 10),
    lastActivity: dates.at(-1),
    activities: dates.length,
    last7: dates.filter((d) => d >= weekAgo && d <= today).length,
    goal: db.goal?.name,
    plan: Boolean(db.plan),
    aiToday: { chat: used(db, "chat", today), adapt: used(db, "adapt", today) },
    aiError: db.coach?.error,
    health: db.healthConnectAt && (!lastHealth || db.healthConnectAt >= lastHealth) ? "Android" : db.healthTokenHash ? "iPhone" : undefined,
    push: Boolean(db.push?.subs.length),
    friends: u.friends,
    kb: Math.round(raw.length / 1024),
  };
}

export function adminTotals(rows: AdminRow[], dbs: Db[], today: string): AdminTotals {
  const monday = mondayOf(today);
  return {
    users: rows.length,
    active7: rows.filter((r) => r.last7 > 0).length,
    newThisWeek: rows.filter((r) => r.since >= monday).length,
    activitiesWeek: dbs.reduce((t, db) => t + db.activities.filter((a) => a.date >= monday && a.date <= today).length, 0),
    aiChatToday: rows.reduce((t, r) => t + r.aiToday.chat, 0),
    aiAdaptToday: rows.reduce((t, r) => t + r.aiToday.adapt, 0),
    kb: rows.reduce((t, r) => t + r.kb, 0),
  };
}
