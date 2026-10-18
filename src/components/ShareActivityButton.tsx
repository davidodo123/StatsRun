"use client";

import { useState } from "react";
import { Icon } from "./icons";

/** Comparte la imagen del entreno con el menú del móvil (Instagram, WhatsApp…); si no se puede, la descarga. */
export function ShareActivityButton({ id, name }: { id: string; name: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const share = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/compartir/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(String(res.status));
      const file = new File([await res.blob()], "run-in-out.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name });
        } catch (e) {
          // cerrar el menú sin elegir nada no es un error
          if ((e as DOMException).name !== "AbortError") throw e;
        }
      } else {
        const url = URL.createObjectURL(file);
        const link = Object.assign(document.createElement("a"), { href: url, download: file.name });
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setState("idle");
    } catch {
      setState("error");
    }
  };
  return (
    <button type="button" className="btn" onClick={share} disabled={state === "loading"} title="Imagen para Instagram o WhatsApp">
      <Icon name="share" className="mr-1 h-4 w-4 align-[-2px]" />
      {state === "loading" ? "Preparando…" : state === "error" ? "Reintentar" : "Compartir"}
    </button>
  );
}
