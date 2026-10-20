"use client";

import { useEffect } from "react";

// cuánto tiene que encoger la parte visible para que sea el teclado (y no la barra de Safari)
const KEYBOARD_MIN_PX = 120;
const editable = (el: Element | null) => el instanceof HTMLElement && (el.isContentEditable || (el.matches("input, textarea, select") && !el.matches("[type=checkbox], [type=radio], [type=range], [type=file], [type=button], [type=submit]")));

/**
 * El teclado del iPhone desplaza lo que va fijo: la barra de arriba se iba bajo la hora y la de abajo se quedaba
 * flotando en medio (también un rato después de cerrarlo). Marca `html[data-kb]` mientras está abierto y da en
 * `--vv-top` cuánto se ha movido la parte visible, para que el CSS recoloque las barras (globals.css).
 */
export function KeyboardFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let open = false;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      // con un campo activo cuenta como abierto aunque no se pueda medir (si la pantalla encoge entera, covered es 0)
      const now = covered > KEYBOARD_MIN_PX || editable(document.activeElement);
      root.style.setProperty("--vv-top", `${Math.max(0, Math.round(vv.offsetTop))}px`);
      if (now) root.dataset.kb = "1";
      else delete root.dataset.kb;
      // al cerrarse, el iPhone a veces deja lo fijo donde estaba con el teclado: moverse un píxel lo recoloca
      if (open && !now)
        requestAnimationFrame(() => {
          window.scrollBy(0, 1);
          window.scrollBy(0, -1);
        });
      open = now;
    };
    // al salir de un campo el teclado tarda en irse: se vuelve a mirar cuando ya se ha ido
    const later = () => setTimeout(update, 400);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
    };
  }, []);
  return null;
}
