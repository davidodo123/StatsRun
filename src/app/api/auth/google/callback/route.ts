import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createGoogleUser, findUserByGoogle, hasUnlinkedAccounts, linkGoogleByEmail, type GoogleIdentity } from "@/lib/auth";
import { googleIdentity } from "@/lib/google";
import { GOOGLE_PENDING_COOKIE, sealValue, startSession } from "@/lib/session";
import { APP_CHALLENGE_COOKIE, appLoginCode, backToApp, isChallenge, type AppLoginResult } from "@/lib/appLogin";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const jar = await cookies();
  const expected = jar.get("google_state")?.value;
  jar.delete("google_state");
  // desde la app de Android: el inicio de sesión va en el navegador del sistema y la sesión se abre en la app
  const challenge = jar.get(APP_CHALLENGE_COOKIE)?.value;
  jar.delete(APP_CHALLENGE_COOKIE);

  if (url.searchParams.get("error")) redirect("/login?error=cancelado");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) redirect("/login?error=estado");

  let g: GoogleIdentity;
  try {
    g = await googleIdentity(code, url.origin);
  } catch {
    redirect("/login?error=google");
  }

  let result: AppLoginResult;
  // ya tenía cuenta con Google, o con correo y contraseña de ese mismo correo
  const user = (await findUserByGoogle(g.sub)) ?? (await linkGoogleByEmail(g));
  if (user) result = { kind: "session", uid: user.id, to: "/" };
  // primera vez con Google: si hay cuentas antiguas, ofrecer enlazar la suya para no perder sus datos
  else if (await hasUnlinkedAccounts()) result = { kind: "pending", g };
  else result = { kind: "session", uid: (await createGoogleUser(g)).id, to: "/perfil" };

  if (isChallenge(challenge)) return backToApp(appLoginCode(result, challenge));

  if (result.kind === "session") {
    await startSession(result.uid);
    redirect(result.to);
  }
  jar.set(GOOGLE_PENDING_COOKIE, sealValue(result.g, 15 * 60), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });
  redirect("/login/enlazar");
}
