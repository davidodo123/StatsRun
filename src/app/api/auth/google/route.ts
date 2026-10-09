import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { googleAuthorizeUrl, googleConfig } from "@/lib/google";

export async function GET(req: NextRequest) {
  await connection(); // estado OAuth único por petición
  if (!googleConfig().configured) redirect("/login?error=sin-config");
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("google_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  redirect(googleAuthorizeUrl(req.nextUrl.origin, state));
}
