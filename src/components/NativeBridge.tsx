"use client";

import { useEffect } from "react";

const VERIFIER = "rio-login-verifier";

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Solo dentro de la app de Android (Capacitor): «Continuar con Google» se abre en el navegador del sistema
 * (Google no deja entrar en la vista web de una app) y, al volver a la app con su código, se abre la sesión.
 * En la web no hace nada.
 */
export function NativeBridge() {
  useEffect(() => {
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    let off: (() => void) | undefined;

    const onClick = async (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="/api/auth/google"]');
      if (!a) return;
      e.preventDefault();
      // verificador secreto que se queda en la app; al servidor solo va su huella
      const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
      sessionStorage.setItem(VERIFIER, verifier);
      const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: `${location.origin}/api/auth/google?app=${challenge}` });
    };
    document.addEventListener("click", onClick);

    (async () => {
      const [{ App }, { Browser }] = await Promise.all([import("@capacitor/app"), import("@capacitor/browser")]);
      const h = await App.addListener("appUrlOpen", ({ url }) => {
        const code = new URL(url).searchParams.get("code");
        const v = sessionStorage.getItem(VERIFIER);
        if (!code || !v) return;
        sessionStorage.removeItem(VERIFIER);
        Browser.close().catch(() => undefined);
        // navegación completa (no del router): la ruta de la API abre la sesión con una cookie
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`${location.origin}/api/auth/app?code=${encodeURIComponent(code)}&v=${encodeURIComponent(v)}`);
      });
      off = () => h.remove();
    })();

    return () => {
      document.removeEventListener("click", onClick);
      off?.();
    };
  }, []);
  return null;
}
