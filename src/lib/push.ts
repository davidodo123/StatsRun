import "server-only";
// Notificaciones push (Web Push): en el iPhone llegan con la web instalada en la pantalla de inicio (iOS 16.4+).
// Claves VAPID en VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (.env.local y Vercel, nunca en el código).
import webpush from "web-push";
import type { PushSub } from "./types";
import type { PushMessage } from "./pushMessage";

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY;
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(`mailto:${process.env.CONTACT_EMAIL ?? "avisos@run-in-out.app"}`, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Manda el aviso a cada móvil suscrito. Devuelve los que ya no existen (desinstalada, permiso quitado) para borrarlos. */
export async function sendPush(subs: PushSub[], msg: PushMessage): Promise<{ sent: number; gone: string[] }> {
  if (!pushConfigured() || !subs.length) return { sent: 0, gone: [] };
  setup();
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
        else console.error("Aviso no enviado:", code, (e as Error).message);
      }
    }),
  );
  return { sent, gone };
}
