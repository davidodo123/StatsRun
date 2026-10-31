"use client";

import { useClientLocale } from "@/components/useClientLocale";
import { translator } from "@/lib/i18n";

// Si algo falla al cargar una página (sin conexión, la base de datos no responde…), se puede reintentar sin perder la app
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = translator(useClientLocale());
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold">{t("sis.fallo")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("sis.falloTxt")}</p>
      {error.digest && <p className="mt-2 text-xs text-muted">{t("sis.codigo", { c: error.digest })}</p>}
      <button type="button" className="btn mt-6" onClick={() => retry()}>
        {t("sis.reintentar")}
      </button>
    </div>
  );
}
