import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { exchangeCode, syncActivities } from "@/lib/strava";
import { updateDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const jar = await cookies();
  const expected = jar.get("strava_state")?.value;
  jar.delete("strava_state");

  if (url.searchParams.get("error")) redirect("/ajustes?strava=denegado");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) redirect("/ajustes?strava=error-estado");

  const scope = url.searchParams.get("scope") ?? "";
  if (!scope.includes("activity:read")) redirect("/ajustes?strava=sin-permiso");

  const auth = await exchangeCode(code, scope);
  const db = await updateDb((d) => {
    d.strava = auth;
  });
  try {
    await syncActivities(auth, db.activities);
  } catch {
    redirect("/ajustes?strava=conectado-sin-sync");
  }
  redirect("/ajustes?strava=ok");
}
