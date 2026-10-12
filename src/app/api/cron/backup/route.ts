import { connection } from "next/server";
import { runBackup } from "@/lib/backup";

// copiar todo y subirlo puede tardar algo más que una petición normal
export const maxDuration = 60;

/** Copia de seguridad diaria. La llama el cron de Vercel (vercel.json) con «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  try {
    const r = await runBackup();
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error("Copia de seguridad fallida:", e);
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
