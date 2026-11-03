import { connection } from "next/server";
import { areFriends } from "@/lib/auth";
import { readDbNow, updateDb } from "@/lib/db";
import { todayLocal } from "@/lib/dates";
import { estimateVdot } from "@/lib/engine/stats";
import { trainingPaces } from "@/lib/engine/physiology";
import { bestEfforts, zoneLimits, type Stream } from "@/lib/engine/streams";
import { fetchStream } from "@/lib/strava";
import { getStream, putStream } from "@/lib/streamStore";
import { getUserId } from "@/lib/session";

export interface StreamResponse {
  stream: Stream | null;
  efforts: Record<number, number>;
  /** puesto de cada esfuerzo entre todas las carreras con serie (1 = récord) */
  ranks: Record<number, number>;
  zones: number[]; // límites de las zonas de ritmo (s/km)
}

/**
 * Serie de una carrera para los gráficos de la ficha: la ve su dueño y sus amigos.
 * Las de Strava se piden la primera vez que el dueño abre la ficha y se guardan.
 */
export async function GET(_: Request, ctx: RouteContext<"/api/serie/[uid]/[id]">) {
  await connection();
  const [{ uid, id: rawId }, me] = await Promise.all([ctx.params, getUserId()]);
  if (!me || (me !== uid && !(await areFriends(me, uid)))) return new Response(null, { status: 404 });
  const id = decodeURIComponent(rawId);
  let db = await readDbNow(uid);
  const a = db.activities.find((x) => x.id === id);
  if (!a || a.sport !== "run") return new Response(null, { status: 404 });

  let stream = await getStream(uid, id);
  if (stream === undefined && me === uid && a.source === "strava" && db.strava) {
    const got = await fetchStream(db.strava, id).catch(() => "limite" as const);
    if (got !== "limite") {
      stream = got;
      await putStream(uid, id, got);
      if (got) db = await updateDb((d) => {
        const x = d.activities.find((y) => y.id === id);
        if (x) x.efforts = bestEfforts(got);
      }, uid);
    }
  }
  const body: StreamResponse = { stream: stream ?? null, efforts: {}, ranks: {}, zones: [] };
  if (stream) {
    body.efforts = bestEfforts(stream) as Record<number, number>;
    for (const [dist, sec] of Object.entries(body.efforts)) {
      const others = db.activities.filter((x) => x.id !== id && x.efforts?.[Number(dist)] !== undefined).map((x) => x.efforts![Number(dist)]!);
      body.ranks[Number(dist)] = 1 + others.filter((o) => o < sec).length;
    }
    body.zones = zoneLimits(trainingPaces(estimateVdot(db.activities, db.profile, todayLocal()).vdot));
  }
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=300" } });
}
