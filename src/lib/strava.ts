import "server-only";
// Cliente de la API de Strava (OAuth 2.0 + importación de actividades).
// Docs: https://developers.strava.com/docs/reference/
import type { Activity, SportKind, StravaAuth } from "./types";
import { updateDb } from "./db";

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";
export const STRAVA_SCOPE = "read,activity:read_all,profile:read_all";

export function stravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return { clientId, clientSecret, appUrl, configured: Boolean(clientId && clientSecret) };
}

export function authorizeUrl(state: string): string {
  const { clientId, appUrl } = stravaConfig();
  const params = new URLSearchParams({
    client_id: clientId ?? "",
    redirect_uri: `${appUrl}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `${OAUTH}/authorize?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: { id: number; firstname: string; lastname: string };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = stravaConfig();
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava token ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function exchangeCode(code: string, scope: string): Promise<StravaAuth> {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
    athleteId: t.athlete?.id ?? 0,
    athleteName: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" "),
    scope,
  };
}

/** Devuelve un access token válido, refrescándolo si caduca en < 5 min. */
async function validToken(auth: StravaAuth): Promise<string> {
  if (auth.expiresAt - 300 > Date.now() / 1000) return auth.accessToken;
  const t = await tokenRequest({ refresh_token: auth.refreshToken, grant_type: "refresh_token" });
  await updateDb((db) => {
    if (!db.strava) return;
    db.strava.accessToken = t.access_token;
    db.strava.refreshToken = t.refresh_token;
    db.strava.expiresAt = t.expires_at;
  });
  return t.access_token;
}

interface StravaSummaryActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  kilojoules?: number;
  suffer_score?: number;
  pr_count?: number;
}

const SPORT_MAP: Record<string, SportKind> = {
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  Ride: "ride",
  VirtualRide: "ride",
  GravelRide: "ride",
  MountainBikeRide: "ride",
  EBikeRide: "ride",
  Swim: "swim",
  Walk: "walk",
  Hike: "walk",
  WeightTraining: "strength",
  Crossfit: "strength",
  Workout: "strength",
  HighIntensityIntervalTraining: "strength",
};

export function mapActivity(a: StravaSummaryActivity): Activity {
  const sport = SPORT_MAP[a.sport_type] ?? SPORT_MAP[a.type] ?? "other";
  // start_date_local viene como "2024-05-01T07:30:00Z" pero ya en hora local
  const local = a.start_date_local.replace("Z", "");
  return {
    id: `strava-${a.id}`,
    source: "strava",
    name: a.name,
    sport,
    sportRaw: a.sport_type ?? a.type,
    date: local.slice(0, 10),
    startLocal: local,
    distanceM: a.distance,
    movingSec: a.moving_time,
    elapsedSec: a.elapsed_time,
    elevationGainM: a.total_elevation_gain ?? 0,
    avgHr: a.average_heartrate,
    maxHr: a.max_heartrate,
    // Strava da la cadencia de carrera en zancadas/min (una pierna)
    avgCadence: a.average_cadence ? (sport === "run" ? a.average_cadence * 2 : a.average_cadence) : undefined,
    kilojoules: a.kilojoules,
    sufferScore: a.suffer_score,
    prCount: a.pr_count,
  };
}

export interface SyncResult {
  imported: number;
  pages: number;
  rateLimited: boolean;
}

/**
 * Importa actividades nuevas desde la última sincronizada (o los últimos `initialDays`).
 * Límite de Strava ~100 lecturas / 15 min: se cortan las páginas en `maxPages`.
 */
export async function syncActivities(auth: StravaAuth, existing: Activity[], initialDays = 365, maxPages = 10): Promise<SyncResult> {
  const token = await validToken(auth);
  const stravaActs = existing.filter((a) => a.source === "strava");
  const latest = stravaActs.reduce((m, a) => (a.startLocal > m ? a.startLocal : m), "");
  // margen de 2 días por zonas horarias y ediciones
  const after = latest
    ? Math.floor(new Date(`${latest}Z`).getTime() / 1000) - 2 * 86400
    : Math.floor(Date.now() / 1000) - initialDays * 86400;

  const fetched: Activity[] = [];
  let page = 1;
  let rateLimited = false;
  for (; page <= maxPages; page++) {
    const res = await fetch(`${API}/athlete/activities?after=${after}&per_page=200&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
    if (!res.ok) throw new Error(`Strava ${res.status}: ${await res.text()}`);
    const batch = (await res.json()) as StravaSummaryActivity[];
    fetched.push(...batch.map(mapActivity));
    if (batch.length < 200) break;
  }

  let imported = 0;
  await updateDb((db) => {
    const byId = new Map(db.activities.map((a) => [a.id, a]));
    for (const a of fetched) {
      if (!byId.has(a.id)) imported++;
      byId.set(a.id, a);
    }
    db.activities = [...byId.values()].sort((x, y) => x.startLocal.localeCompare(y.startLocal));
    db.lastSync = new Date().toISOString();
  });
  return { imported, pages: page, rateLimited };
}

export async function deauthorize(auth: StravaAuth): Promise<void> {
  try {
    const token = await validToken(auth);
    await fetch(`${OAUTH}/deauthorize`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // si el token ya no vale, basta con olvidarlo localmente
  }
}
