"use server";

import { refresh } from "next/cache";
import { updateDb } from "@/lib/db";
import type { PushSub } from "@/lib/types";

type Result = { ok?: boolean; error?: string; message?: string };

/** Guarda la suscripción de este móvil (la da el navegador al aceptar el permiso). */
export async function savePushSubscription(sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } }, device?: string): Promise<Result> {
  const { endpoint } = sub;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) return { error: "Suscripción no válida." };
  await updateDb((db) => {
    const subs = (db.push?.subs ?? []).filter((s) => s.endpoint !== endpoint);
    const s: PushSub = { endpoint, p256dh, auth, at: new Date().toISOString(), ...(device ? { device: device.slice(0, 40) } : {}) };
    // como mucho 5 móviles por persona
    db.push = { ...db.push, subs: [...subs, s].slice(-5) };
  });
  refresh();
  return { ok: true };
}
