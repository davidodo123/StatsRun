import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { redeemAppLogin } from "@/lib/appLogin";
import { GOOGLE_PENDING_COOKIE, sealValue, startSession } from "@/lib/session";

/** La app de Android canjea aquí el código con el que volvió del navegador: abre la sesión en la propia app. */
export async function GET(req: NextRequest) {
  await connection();
  const r = redeemAppLogin(req.nextUrl.searchParams.get("code"), req.nextUrl.searchParams.get("v"));
  if (!r) redirect("/login?error=estado");
  if (r.kind === "session") {
    await startSession(r.uid);
    redirect(r.to);
  }
  (await cookies()).set(GOOGLE_PENDING_COOKIE, sealValue(r.g, 15 * 60), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });
  redirect("/login/enlazar");
}
