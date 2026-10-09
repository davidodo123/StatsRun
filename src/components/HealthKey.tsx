"use client";

import { useActionState, useState } from "react";
import { newHealthKey, type HealthKeyState } from "@/app/actions";

/** Crear o cambiar la clave del atajo de Salud. La clave solo se ve justo después de crearla. */
export function HealthKey({ hasKey, endpoint }: { hasKey: boolean; endpoint: string }) {
  const [state, action, pending] = useActionState<HealthKeyState, FormData>(newHealthKey, {});
  const [copied, setCopied] = useState<string>();
  const copy = (label: string, text: string) =>
    navigator.clipboard.writeText(text).then(
      () => setCopied(label),
      () => setCopied(undefined),
    );
  return (
    <div className="space-y-3 text-sm">
      {state.token ? (
        <div className="space-y-2 rounded-xl border border-accent p-3">
          <p className="font-semibold">Tu clave (cópiala ahora: no se volverá a ver)</p>
          <code className="block break-all rounded-lg bg-surface-2 p-2 text-xs">{state.token}</code>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn text-sm" onClick={() => copy("cabecera", `Bearer ${state.token}`)}>
              {copied === "cabecera" ? "✓ Copiado" : "Copiar «Bearer clave»"}
            </button>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => copy("url", endpoint)}>
              {copied === "url" ? "✓ Copiada" : "Copiar la URL"}
            </button>
          </div>
        </div>
      ) : (
        <form action={action}>
          <button className="btn" disabled={pending}>
            {pending ? "Creando…" : hasKey ? "Cambiar la clave" : "Crear mi clave"}
          </button>
          {hasKey && <p className="mt-1 text-xs text-muted">Al cambiarla, la del atajo actual deja de funcionar y tendrás que pegar la nueva.</p>}
        </form>
      )}
    </div>
  );
}
