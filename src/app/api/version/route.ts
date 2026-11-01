import { connection } from "next/server";
import { NOVEDADES } from "@/lib/novedades";

/** Versión publicada ahora mismo (el commit de Vercel) y sus novedades: la app la compara con la suya para avisar de que hay una nueva. */
export async function GET() {
  await connection();
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev", novedades: NOVEDADES.slice(0, 5) }, { headers: { "Cache-Control": "no-store" } });
}
