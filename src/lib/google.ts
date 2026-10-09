import "server-only";
// Inicio de sesión con Google (OAuth 2.0 / OpenID Connect).
// Docs: https://developers.google.com/identity/protocols/oauth2/web-server
import type { GoogleIdentity } from "./auth";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

// la URL de vuelta sale del dominio de la petición: sirve igual en local y en producción
// (hay que darlas de alta las dos en Google Cloud)
export const googleRedirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function googleAuthorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: googleConfig().clientId ?? "",
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

/** Cambia el código de vuelta por la identidad del usuario. */
export async function googleIdentity(code: string, origin: string): Promise<GoogleIdentity> {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId ?? "",
      client_secret: clientSecret ?? "",
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { access_token } = (await res.json()) as { access_token: string };

  const info = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" });
  if (!info.ok) throw new Error(`Google ${info.status}`);
  const u = (await info.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!u.sub || !u.email || !u.email_verified) throw new Error("La cuenta de Google no tiene un email verificado.");
  return { sub: u.sub, email: u.email.toLowerCase(), name: u.name ?? "", picture: u.picture };
}
