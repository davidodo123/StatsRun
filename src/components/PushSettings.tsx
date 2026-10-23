"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushSubscription, savePushSubscription, sendTestPush, setPushRestDays } from "@/app/push-actions";
import { isAndroidApp } from "./healthConnect";

type State = "cargando" | "sin-soporte" | "instalar" | "android" | "denegado" | "apagado" | "activo";

// la clave pública VAPID viene en base64url; el navegador la quiere en bytes
const keyBytes = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const device = () => (/iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Ordenador");

/** Activar el aviso de cada mañana con lo que toca hoy en este móvil. */
export function PushSettings({ publicKey, endpoints, restDays }: { publicKey?: string; endpoints: string[]; restDays: boolean }) {
  const [state, setState] = useState<State>("cargando");
  const [endpoint, setEndpoint] = useState<string>();
  const [note, setNote] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (isAndroidApp()) return setState("android");
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
        // en el iPhone, Safari solo deja avisos a la web instalada en la pantalla de inicio
        return setState(/iPhone|iPad/.test(navigator.userAgent) && !standalone ? "instalar" : "sin-soporte");
      if (Notification.permission === "denied") return setState("denegado");
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      setEndpoint(sub?.endpoint);
      setState(sub && endpoints.includes(sub.endpoint) ? "activo" : "apagado");
    })().catch(() => setState("sin-soporte"));
  }, [endpoints]);

  const enable = () =>
    start(async () => {
      setNote(undefined);
      try {
        // el permiso se pide en el mismo toque (el iPhone no deja pedirlo solo)
        if ((await Notification.requestPermission()) !== "granted") return setState("denegado");
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
        const res = await savePushSubscription(sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }, device());
        if (res.error) return setNote({ ok: false, text: res.error });
        setEndpoint(sub.endpoint);
        setState("activo");
        setNote({ ok: true, text: "Listo: cada mañana te llegará lo que te toca." });
      } catch {
        setNote({ ok: false, text: "No se pudo activar. Vuelve a intentarlo." });
      }
    });
  const disable = () =>
    start(async () => {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      await sub?.unsubscribe().catch(() => {});
      if (endpoint) await removePushSubscription(endpoint);
      setState("apagado");
      setNote(undefined);
    });
  const test = () =>
    start(async () => {
      const res = await sendTestPush();
      setNote(res.error ? { ok: false, text: res.error } : { ok: true, text: res.message ?? "Enviado." });
    });

  if (!publicKey) return <p className="text-sm text-ink-2">Los avisos aún no están configurados en el servidor.</p>;
  if (state === "cargando") return <div className="h-16 animate-pulse rounded-xl bg-surface-2" />;
  if (state === "android") return <p className="text-sm text-ink-2">En la app de Android los avisos llegarán en una próxima versión. Mientras tanto, puedes activarlos abriendo la web en Chrome.</p>;
  if (state === "instalar")
    return (
      <p className="text-sm text-ink-2">
        En el iPhone, los avisos solo llegan con la app instalada: en Safari, <strong className="text-ink">Compartir → Añadir a pantalla de inicio</strong>, ábrela desde el icono y vuelve aquí.
      </p>
    );
  if (state === "sin-soporte") return <p className="text-sm text-ink-2">Este navegador no admite avisos. Prueba con Safari (iPhone, app instalada) o Chrome.</p>;
  if (state === "denegado")
    return (
      <p className="text-sm text-ink-2">
        Los avisos están bloqueados para Run-In-Out. En el iPhone: <strong className="text-ink">Ajustes → Notificaciones → Run-In-Out</strong> y activa «Permitir notificaciones».
      </p>
    );

  return (
    <div className="space-y-3 text-sm">
      {state === "activo" ? (
        <>
          <p className="font-semibold text-good-ink">Activados en este móvil.</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked={restDays} onChange={(e) => start(() => setPushRestDays(e.target.checked))} />
            Avisar también los días de descanso
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={test} disabled={pending}>
              {pending ? "Enviando…" : "Enviar uno de prueba"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={disable} disabled={pending}>
              Desactivar
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn" onClick={enable} disabled={pending}>
          {pending ? "Activando…" : "Activar avisos"}
        </button>
      )}
      {note && <p className={`text-xs font-medium ${note.ok ? "text-good-ink" : "text-critical"}`}>{note.text}</p>}
    </div>
  );
}
