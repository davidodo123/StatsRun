"use server";

import { refresh } from "next/cache";
import { readDbNow, updateDb } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { todayMessage } from "@/lib/pushMessage";
import { todayMadrid } from "@/lib/health";
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

/** Deja de avisar a este móvil. */
export async function removePushSubscription(endpoint: string): Promise<void> {
  await updateDb((db) => {
    if (db.push) db.push.subs = db.push.subs.filter((s) => s.endpoint !== endpoint);
  });
  refresh();
}

export async function setPushRestDays(on: boolean): Promise<void> {
  await updateDb((db) => {
    db.push = { subs: [], ...db.push, restDays: on };
  });
  refresh();
}

/** Aviso de prueba ahora mismo (lo que tocaría hoy, o uno de ejemplo). */
export async function sendTestPush(): Promise<Result> {
  const db = await readDbNow();
  const subs = db.push?.subs ?? [];
  if (!subs.length) return { error: "Activa antes los avisos en este móvil." };
  const msg = todayMessage({ plan: db.plan, push: { subs, restDays: true } }, todayMadrid()) ?? { title: "Run-In-Out", body: "Así te llegará cada mañana lo que te toca.", url: "/plan" };
  const { sent, gone } = await sendPush(subs, msg);
  if (gone.length)
    await updateDb((d) => {
      if (d.push) d.push.subs = d.push.subs.filter((s) => !gone.includes(s.endpoint));
    });
  return sent ? { ok: true, message: "Enviado: te llegará en unos segundos." } : { error: "No se pudo enviar. Desactiva y vuelve a activar los avisos." };
}
