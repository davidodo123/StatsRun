import { connection } from "next/server";
import { allUserIds } from "@/lib/auth";
import { readDbNow, updateDb } from "@/lib/db";
import { pushConfigured, sendPush } from "@/lib/push";
import { todayMessage } from "@/lib/pushMessage";
import { todayMadrid } from "@/lib/health";

export const maxDuration = 60;

/**
 * Aviso de cada mañana con lo que toca hoy. Lo llama el cron de Vercel (vercel.json, 6:00 UTC: 7:00 u 8:00 en España)
 * con «Authorization: Bearer CRON_SECRET». Solo a quien activó los avisos y una vez al día.
 */
export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  if (!pushConfigured()) return Response.json({ ok: false, error: "Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY" }, { status: 500 });
  const today = todayMadrid();
  let users = 0;
  let sent = 0;
  for (const uid of await allUserIds()) {
    const db = await readDbNow(uid);
    const subs = db.push?.subs ?? [];
    if (!subs.length || db.push?.lastSent === today) continue;
    const msg = todayMessage(db, today);
    if (!msg) continue;
    const r = await sendPush(subs, msg);
    users++;
    sent += r.sent;
    await updateDb((d) => {
      if (!d.push) return;
      d.push.lastSent = today;
      d.push.subs = d.push.subs.filter((s) => !r.gone.includes(s.endpoint));
    }, uid);
  }
  return Response.json({ ok: true, today, users, sent });
}
