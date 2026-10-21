"use client";

import { useEffect } from "react";

const editable = (el: Element | null) => el instanceof HTMLElement && (el.isContentEditable || (el.matches("input, textarea, select") && !el.matches("[type=checkbox], [type=radio], [type=range], [type=file], [type=button], [type=submit]")));

/**
 * Lo fijo de la pantalla (las barras de arriba y de abajo) en el iPhone:
 * - con el teclado abierto se desplazaba (la de arriba bajo la hora, la de abajo flotando en medio). Mientras se escribe
 *   en un campo se marca `html[data-kb]` y `--vv-top` dice cuánto se ha movido la parte visible (globals.css).
 * - al cerrar el teclado, al volver a la app o al reabrirla, a veces se quedaba donde no era hasta mover la página:
 *   un desplazamiento de un píxel lo recoloca.
 * Solo cuenta como teclado un campo activo: al reabrir la app el iPhone mide mal la pantalla un momento, y con eso
 * se escondía la barra de abajo.
 */
export function KeyboardFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    let open = false;
    const nudge = () =>
      requestAnimationFrame(() => {
        window.scrollBy(0, 1);
        window.scrollBy(0, -1);
        // si la página no se puede desplazar, el píxel no hace nada: se fuerza a recolocar (sin que se vea)
        const bar = document.querySelector<HTMLElement>(".mobile-tabbar");
        if (bar) {
          bar.style.transform = "translateZ(0)";
          void bar.offsetHeight;
          bar.style.transform = "";
        }
      });
    const update = () => {
      const now = editable(document.activeElement);
      root.style.setProperty("--vv-top", `${now && vv ? Math.max(0, Math.round(vv.offsetTop)) : 0}px`);
      if (now) root.dataset.kb = "1";
      else delete root.dataset.kb;
      if (open && !now) nudge();
      open = now;
    };
    // al salir de un campo el teclado tarda en irse: se vuelve a mirar cuando ya se ha ido
    const later = () => setTimeout(update, 400);
    // al volver a la app (o al reabrirla desde la pantalla de inicio), recolocar lo fijo cuando ya se ha pintado
    const back = () => {
      if (document.visibilityState !== "visible") return;
      update();
      setTimeout(nudge, 300);
    };
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    document.addEventListener("visibilitychange", back);
    window.addEventListener("pageshow", back);
    update();
    setTimeout(nudge, 300);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("pageshow", back);
    };
  }, []);
  return null;
}
