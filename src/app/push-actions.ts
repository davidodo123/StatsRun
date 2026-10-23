"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { readDbNow, updateDb } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { todayMessage } from "@/lib/pushMessage";
import { todayMadrid } from "@/lib/health";
import { requireUserId } from "@/lib/session";
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

/**
 * Aviso de prueba (lo que tocaría hoy, o uno de ejemplo). Sale a los 10 s: con la app abierta el iPhone no lo enseña,
 * así da tiempo a salir a la pantalla de inicio. El resultado del envío queda en los registros de Vercel.
 */
export async function sendTestPush(): Promise<Result> {
  const db = await readDbNow();
  if (!db.push?.subs.length) return { error: "Activa antes los avisos en este móvil." };
  const uid = await requireUserId();
  after(async () => {
    await new Promise((r) => setTimeout(r, 10_000));
    const res = await sendTestPushNow(uid);
    if (res.error) console.error("Aviso de prueba:", res.error);
  });
  return { ok: true, message: "Sale en 10 segundos: vuelve ya a la pantalla de inicio (o bloquea el móvil) y espera." };
}

async function sendTestPushNow(uid: string): Promise<Result> {
  const db = await readDbNow(uid);
  const subs = db.push?.subs ?? [];
  if (!subs.length) return { error: "No hay avisos activados." };
  const msg = todayMessage({ plan: db.plan, push: { subs, restDays: true } }, todayMadrid()) ?? { title: "Run-In-Out", body: "Así te llegará cada mañana lo que te toca.", url: "/plan" };
  const { sent, gone, errors } = await sendPush(subs, msg);
  if (gone.length)
    await updateDb((d) => {
      if (d.push) d.push.subs = d.push.subs.filter((s) => !gone.includes(s.endpoint));
    }, uid);
  if (sent) return { ok: true, message: `Enviado a ${sent} ${sent === 1 ? "móvil" : "móviles"}: te llegará en unos segundos.${errors.length ? ` (Falló en otro: ${errors.join("; ")})` : ""}` };
  return { error: `No se pudo enviar. Respuesta: ${errors.join("; ") || "ninguna"}. Desactiva y vuelve a activar los avisos.` };
}
