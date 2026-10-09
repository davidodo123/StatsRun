"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Registra el service worker (solo en producción: en desarrollo la caché serviría código viejo). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pacelab-install-dismissed";

/**
 * Aviso para instalar la app en la pantalla de inicio.
 * Android / Chrome / Edge: botón que abre el diálogo del sistema. iPhone/iPad (Safari): instrucciones, porque no hay diálogo.
 * No aparece si ya está instalada o si se ha cerrado antes.
 */
/** Qué aviso toca en este navegador: ninguno (instalada o cerrado antes), instrucciones de iOS u otro. */
function installEnv(): "hide" | "ios" | "other" {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // almacenamiento bloqueado: se muestra igual
  }
  if (standalone || dismissed) return "hide";
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "other";
}
const noSubscribe = () => () => undefined;

export function InstallBanner() {
  // en el servidor no se sabe el navegador: no se pinta nada hasta el cliente
  const env = useSyncExternalStore(noSubscribe, installEnv, () => "hide" as const);
  const ios = env === "ios";
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // fuera de iOS solo se ofrece si el navegador permite instalar (ha llegado beforeinstallprompt)
  if (closed || env === "hide" || (!ios && !prompt)) return null;

  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // sin almacenamiento: solo se oculta en esta visita
    }
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setClosed(true);
    setPrompt(undefined);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-sm" role="region" aria-label="Instalar la app">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Instala PaceLab en tu móvil</p>
        {ios ? (
          <p className="text-xs text-ink-2">
            En Safari pulsa <strong>Compartir</strong> <span aria-hidden>⎋</span> y luego <strong>«Añadir a pantalla de inicio»</strong>.
          </p>
        ) : (
          <p className="text-xs text-ink-2">Ábrela como una app, a pantalla completa y desde tu pantalla de inicio.</p>
        )}
      </div>
      {!ios && prompt && (
        <button type="button" onClick={install} className="btn shrink-0 px-3 py-1.5 text-xs">
          Instalar
        </button>
      )}
      <button type="button" onClick={dismiss} className="shrink-0 px-1 text-lg leading-none text-muted" aria-label="Cerrar aviso de instalación">
        ×
      </button>
    </div>
  );
}
