import { gunzipSync } from "node:zlib";
import { after } from "next/server";
import { adaptWithAI, coachConfig } from "@/lib/coach";
import { requireUserId } from "@/lib/session";
import { updateDb } from "@/lib/db";
import { mergeActivities } from "@/lib/importers/common";
import { parseStravaActivitiesCsv } from "@/lib/importers/stravaCsv";
import { parseFit, parseGpx, parseTcx } from "@/lib/importers/trackFiles";
import type { Activity } from "@/lib/types";

const MAX_FILE = 50 * 1024 * 1024;

export interface ImportResponse {
  added: number;
  skipped: number;
  parsed: number;
  errors: string[];
}

export async function POST(req: Request) {
  const uid = await requireUserId();
  const fd = await req.formData();
  const incoming: Activity[] = [];
  const errors: string[] = [];

  const csv = fd.get("csv");
  if (typeof csv === "string" && csv.trim()) {
    const r = parseStravaActivitiesCsv(csv);
    incoming.push(...r.activities);
    if (r.errors.length) errors.push(...r.errors.slice(0, 5), ...(r.errors.length > 5 ? [`… y ${r.errors.length - 5} filas más ignoradas`] : []));
  }

  for (const entry of fd.getAll("files")) {
    if (typeof entry === "string") continue;
    const name = entry.name;
    try {
      if (entry.size > MAX_FILE) throw new Error("archivo demasiado grande");
      let buf: Uint8Array = new Uint8Array(await entry.arrayBuffer());
      let lower = name.toLowerCase();
      if (lower.endsWith(".gz")) {
        buf = new Uint8Array(gunzipSync(buf));
        lower = lower.slice(0, -3);
      }
      if (lower.endsWith(".fit")) {
        const acts = await parseFit(buf, name);
        if (!acts.length) throw new Error("sin sesiones de actividad");
        incoming.push(...acts);
      } else if (lower.endsWith(".gpx") || lower.endsWith(".tcx")) {
        const xml = new TextDecoder().decode(buf);
        const act = lower.endsWith(".gpx") ? parseGpx(xml, name) : parseTcx(xml, name);
        if (!act) throw new Error("sin puntos con hora");
        incoming.push(act);
      } else if (lower.endsWith(".csv")) {
        const r = parseStravaActivitiesCsv(new TextDecoder().decode(buf));
        incoming.push(...r.activities);
        errors.push(...r.errors.slice(0, 5));
      } else throw new Error("formato no soportado");
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }

  let added = 0;
  let skipped = 0;
  if (incoming.length)
    await updateDb((db) => {
      const r = mergeActivities(db.activities, incoming);
      db.activities = r.merged;
      added = r.added;
      skipped = r.skipped;
      db.lastSync = new Date().toISOString();
    }, uid);

  // entrenos nuevos: la IA reajusta los próximos días en segundo plano
  if (added > 0 && coachConfig().configured) after(() => adaptWithAI(uid).then(() => undefined));

  return Response.json({ added, skipped, parsed: incoming.length, errors } satisfies ImportResponse);
}
