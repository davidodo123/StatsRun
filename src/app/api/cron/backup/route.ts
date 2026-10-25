import { connection } from "next/server";
import { runBackup } from "@/lib/backup";
import { BACKUP_STATUS_KEY, kvSet } from "@/lib/db";

// copiar todo y subirlo puede tardar algo más que una petición normal
export const maxDuration = 60;

/** Copia de seguridad diaria. La llama el cron de Vercel (vercel.json) con «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  try {
    const r = await runBackup();
    await kvSet(BACKUP_STATUS_KEY, JSON.stringify({ at: new Date().toISOString(), ok: true, keys: r.keys, bytes: r.bytes }));
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error("Copia de seguridad fallida:", e);
    await kvSet(BACKUP_STATUS_KEY, JSON.stringify({ at: new Date().toISOString(), ok: false, error: (e as Error).message.slice(0, 300) })).catch(() => {});
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
