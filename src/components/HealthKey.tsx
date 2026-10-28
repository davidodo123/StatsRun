"use client";

import { useActionState, useState } from "react";
import { newHealthKey, type HealthKeyState } from "@/app/actions";
import { translator, type Locale } from "@/lib/i18n";

/** Crear o cambiar la clave del atajo de Salud. La clave solo se ve justo después de crearla. */
export function HealthKey({ hasKey, endpoint, locale = "es" }: { hasKey: boolean; endpoint: string; locale?: Locale }) {
  const t = translator(locale);
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
          <p className="font-semibold">{t("hk.tuClave")}</p>
          <code className="block break-all rounded-lg bg-surface-2 p-2 text-xs">{state.token}</code>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn text-sm" onClick={() => copy("clave", state.token!)}>
              {copied === "clave" ? t("hk.copiada") : t("hk.copiarClave")}
            </button>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => copy("url", endpoint)}>
              {copied === "url" ? t("hk.copiada") : t("hk.copiarUrl")}
            </button>
          </div>
        </div>
      ) : (
        <form action={action}>
          <button className="btn" disabled={pending}>
            {pending ? t("hk.creando") : hasKey ? t("hk.cambiar") : t("hk.crear")}
          </button>
          {hasKey && <p className="mt-1 text-xs text-muted">{t("hk.aviso")}</p>}
        </form>
      )}
    </div>
  );
}
