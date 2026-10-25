import "server-only";
// Datos del panel de administración (/admin): todos los usuarios con sus documentos y la última copia de seguridad.
import { allUsersForAdmin, isAdmin } from "./auth";
import { BACKUP_STATUS_KEY, kvGet, userDbKey } from "./db";
import { adminRow, adminTotals, type AdminRow, type AdminTotals } from "./adminStats";
import { viewCache } from "./session";
import type { Db } from "./types";

export interface BackupStatus {
  at: string;
  ok: boolean;
  keys?: number;
  bytes?: number;
  error?: string;
}

export interface AdminOverview {
  rows: AdminRow[];
  totals: AdminTotals;
  backup?: BackupStatus;
  ai: { openrouter: boolean };
}

export async function adminOverview(today: string): Promise<AdminOverview> {
  const users = await allUsersForAdmin();
  const docs = await Promise.all(users.map(async (u) => [u, (await kvGet(userDbKey(u.id))) ?? '{"activities":[]}'] as const));
  const dbs: Db[] = docs.map(([, raw]) => ({ activities: [], ...(JSON.parse(raw) as Partial<Db>) }));
  const rows = docs.map(([u, raw], i) => adminRow(u, dbs[i], raw, today)).sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  const backupRaw = await kvGet(BACKUP_STATUS_KEY);
  return {
    rows,
    totals: adminTotals(rows, dbs, today),
    backup: backupRaw ? (JSON.parse(backupRaw) as BackupStatus) : undefined,
    ai: { openrouter: Boolean(process.env.OPENROUTER_API_KEY) },
  };
}

/** Para pintar páginas: en la caché privada, como el resto de vistas. */
export async function viewIsAdmin(uid: string) {
  "use cache: private";
  viewCache();
  return isAdmin(uid);
}

export async function viewAdminOverview(today: string) {
  "use cache: private";
  viewCache();
  return adminOverview(today);
}
