import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { googleAuthorizeUrl, googleConfig } from "@/lib/google";
import { APP_CHALLENGE_COOKIE, isChallenge } from "@/lib/appLogin";

export async function GET(req: NextRequest) {
  await connection(); // estado OAuth único por petición
  if (!googleConfig().configured) redirect("/login?error=sin-config");
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" };
  jar.set("google_state", state, opts);
  // desde la app de Android (?app=<reto>): al acabar se vuelve a la app con un código que solo canjea ella
  const challenge = req.nextUrl.searchParams.get("app");
  if (isChallenge(challenge)) jar.set(APP_CHALLENGE_COOKIE, challenge, opts);
  else jar.delete(APP_CHALLENGE_COOKIE);
  redirect(googleAuthorizeUrl(req.nextUrl.origin, state));
}
