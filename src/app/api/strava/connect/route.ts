import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl, stravaConfig } from "@/lib/strava";

export async function GET() {
  await connection(); // estado OAuth único por petición
  if (!stravaConfig().configured) redirect("/ajustes?strava=sin-config");
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("strava_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  redirect(authorizeUrl(state));
}
