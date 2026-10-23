import "server-only";
// Notificaciones push (Web Push): en el iPhone llegan con la web instalada en la pantalla de inicio (iOS 16.4+).
// Claves VAPID en VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (.env.local y Vercel, nunca en el código).
import webpush from "web-push";
import type { PushSub } from "./types";
import type { PushMessage } from "./pushMessage";

// sin espacios ni saltos de línea (se cuelan al pegarlas en Vercel)
const env = (k: string) => process.env[k]?.trim() || undefined;
export const pushPublicKey = () => env("VAPID_PUBLIC_KEY");
export const pushConfigured = () => Boolean(env("VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY"));

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(`mailto:${env("CONTACT_EMAIL") ?? "avisos@run-in-out.app"}`, env("VAPID_PUBLIC_KEY")!, env("VAPID_PRIVATE_KEY")!);
  ready = true;
}

/** Manda el aviso a cada móvil suscrito. Devuelve los que ya no existen (desinstalada, permiso quitado) para borrarlos. */
export async function sendPush(subs: PushSub[], msg: PushMessage): Promise<{ sent: number; gone: string[]; errors: string[] }> {
  if (!pushConfigured() || !subs.length) return { sent: 0, gone: [], errors: [] };
  try {
    setup();
  } catch (e) {
    // claves mal copiadas (p. ej. cambiadas entre sí o incompletas)
    return { sent: 0, gone: [], errors: [`claves VAPID no válidas: ${(e as Error).message}`] };
  }
  let sent = 0;
  const gone: string[] = [];
  // lo que contesta el servicio de avisos (Apple, Google…) cuando no lo acepta: para saber por qué
  const errors: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" });
        sent++;
      } catch (e) {
        const { statusCode: code, body } = e as { statusCode?: number; body?: string };
        const host = new URL(s.endpoint).host;
        errors.push(`${host}: ${code ?? "sin respuesta"} ${(body ?? (e as Error).message).slice(0, 120)}`.trim());
        if (code === 404 || code === 410) gone.push(s.endpoint);
        else console.error("Aviso no enviado:", host, code, body ?? (e as Error).message);
      }
    }),
  );
  return { sent, gone, errors };
}
