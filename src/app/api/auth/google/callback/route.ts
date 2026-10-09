import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createGoogleUser, findUserByGoogle, hasUnlinkedAccounts, type GoogleIdentity } from "@/lib/auth";
import { googleIdentity } from "@/lib/google";
import { GOOGLE_PENDING_COOKIE, sealValue, startSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const jar = await cookies();
  const expected = jar.get("google_state")?.value;
  jar.delete("google_state");

  if (url.searchParams.get("error")) redirect("/login?error=cancelado");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) redirect("/login?error=estado");

  let g: GoogleIdentity;
  try {
    g = await googleIdentity(code, url.origin);
  } catch {
    redirect("/login?error=google");
  }

  const user = await findUserByGoogle(g.sub);
  if (user) {
    await startSession(user.id);
    redirect("/");
  }
  // primera vez con Google: si hay cuentas antiguas, ofrecer enlazar la suya para no perder sus datos
  if (await hasUnlinkedAccounts()) {
    jar.set(GOOGLE_PENDING_COOKIE, sealValue(g, 15 * 60), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60,
      path: "/",
    });
    redirect("/login/enlazar");
  }
  const created = await createGoogleUser(g);
  await startSession(created.id);
  redirect("/perfil");
}
