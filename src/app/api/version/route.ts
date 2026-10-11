import { connection } from "next/server";

/** Versión publicada ahora mismo (el commit de Vercel): la app la compara con la suya para avisar de que hay una nueva. */
export async function GET() {
  await connection();
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
