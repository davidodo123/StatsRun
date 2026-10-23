"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/push-actions";
import { isAndroidApp } from "./healthConnect";
import { Icon } from "./icons";

const SNOOZE = "rio-avisos-luego"; // «Ahora no»: hasta cuándo no se vuelve a preguntar
const SAVED = "rio-avisos-guardado"; // suscripción de este móvil ya guardada en el servidor

// la clave pública VAPID viene en base64url; el navegador la quiere en bytes
const keyBytes = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const device = () => (/iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Ordenador");
const store = (k: string, v?: string) => {
  try {
    if (v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Suscribe este móvil y lo guarda (una vez por suscripción). */
async function subscribe(publicKey: string) {
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  if (read(SAVED) === sub.endpoint) return;
  const res = await savePushSubscription(sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }, device());
  if (!res.error) store(SAVED, sub.endpoint);
}

/**
 * Aviso de cada mañana: con la app instalada en la pantalla de inicio, pregunta una vez si se quiere (el iPhone solo deja
 * pedir el permiso al tocar algo). Con el permiso ya dado, se activa solo. Para quitarlos, desde los ajustes del móvil.
 */
export function PushPrompt({ publicKey }: { publicKey?: string }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!publicKey || isAndroidApp() || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (!installed) return;
    if (Notification.permission === "granted") {
      subscribe(publicKey).catch(() => {});
      return;
    }
    if (Notification.permission === "default" && Number(read(SNOOZE) ?? 0) < Date.now()) {
      // un momento después de abrir, para no tapar la pantalla al entrar
      const t = setTimeout(() => setAsk(true), 1500);
      return () => clearTimeout(t);
    }
  }, [publicKey]);

  if (!ask) return null;
  const later = () => {
    store(SNOOZE, String(Date.now() + 14 * 86_400_000));
    setAsk(false);
  };
  const enable = async () => {
    setBusy(true);
    try {
      // el permiso se pide en el mismo toque
      if ((await Notification.requestPermission()) === "granted") await subscribe(publicKey!);
      else later();
    } catch {
      later();
    }
    setAsk(false);
  };

  return (
    <div className="hide-on-kb fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 md:bottom-4 md:left-56 md:px-8" role="dialog" aria-label="Avisos">
      <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-accent/40 bg-surface p-3 shadow-xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name="bell" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">¿Te aviso cada mañana de lo que te toca?</p>
          <p className="text-xs text-ink-2">Una notificación con el entreno del día. Se quita cuando quieras desde los ajustes del móvil.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn px-4 py-1.5" onClick={enable} disabled={busy}>
              {busy ? "Activando…" : "Activar"}
            </button>
            <button type="button" className="btn btn-ghost px-4 py-1.5" onClick={later} disabled={busy}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
