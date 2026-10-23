import "server-only";
// Entrar con Google desde la app de Android: Google no deja iniciar sesión dentro de la vista web de la app,
// así que se hace en el navegador del sistema y se vuelve a la app con un código de un solo uso (2 min).
// El código solo vale junto al «verificador» que la app guardó al empezar (como PKCE): si otra app
// del móvil captara la vuelta, no le serviría.
import { createHash, timingSafeEqual } from "node:crypto";
import type { GoogleIdentity } from "./auth";
import { sealValue, unsealValue } from "./session";

export const APP_CHALLENGE_COOKIE = "google_app";
const APP_SCHEME = "app.runinout";
const CODE_TTL = 120;

export type AppLoginResult = { kind: "session"; uid: string; to: string } | { kind: "pending"; g: GoogleIdentity };

export const isChallenge = (s: string | null | undefined): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{43}$/.test(s);

const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export const appLoginCode = (result: AppLoginResult, challenge: string) => sealValue({ ...result, ch: challenge }, CODE_TTL);

/** Lo que dice el código si es válido, no ha caducado y el verificador es el de quien empezó el inicio de sesión. */
export function redeemAppLogin(code: string | null, verifier: string | null): AppLoginResult | undefined {
  const v = unsealValue<AppLoginResult & { ch: string }>(code ?? undefined);
  if (!v || !verifier) return undefined;
  const a = Buffer.from(challengeOf(verifier));
  const b = Buffer.from(v.ch);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  if (v.kind === "session") return { kind: "session", uid: v.uid, to: v.to };
  return { kind: "pending", g: v.g };
}

/** Página que devuelve a la app (con botón por si el navegador no la abre solo). */
export function backToApp(code: string): Response {
  const url = `${APP_SCHEME}://auth?code=${encodeURIComponent(code)}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Volviendo a Run-In-Out</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#f3f3f2;font-family:system-ui,sans-serif;text-align:center;padding:24px}
a{display:inline-block;margin-top:16px;border-radius:10px;padding:12px 20px;background:#eb6834;color:#111;font-weight:700;text-decoration:none}</style></head>
<body><div><p>Sesión iniciada. Volviendo a la app…</p><a href="${url}">Abrir Run-In-Out</a></div>
<script>location.href=${JSON.stringify(url)}</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
