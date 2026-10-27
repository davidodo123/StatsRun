import type { Metadata } from "next";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { Card, Loading, Notice, PageHeader } from "@/components/ui";
import { ImportPanel } from "@/components/ImportPanel";
import { clearDemo, loadDemo } from "@/app/actions";
import { getT } from "@/lib/i18n/server";
import { intlLocale, type Key } from "@/lib/i18n";

export const metadata: Metadata = { title: "Importar datos" };

// avisos de la vuelta de Strava (?strava=…); el texto va en imp.msg.<código>
const MESSAGES: Record<string, "good" | "warn" | "bad"> = { ok: "good", "conectado-sin-sync": "warn", denegado: "warn", "sin-permiso": "bad", "error-estado": "bad", "sin-config": "bad" };

export default function AjustesPage({ searchParams }: PageProps<"/ajustes">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/ajustes">["searchParams"] }) {
  const [sp, db, { t, locale }] = await Promise.all([searchParams, getDb(), getT()]);
  const code = String(sp.strava ?? "");
  const tone = MESSAGES[code];
  const counts = {
    strava: db.activities.filter((a) => a.source === "strava").length,
    demo: db.activities.filter((a) => a.source === "demo").length,
    manual: db.activities.filter((a) => a.source === "manual").length,
  };

  return (
    <>
    <PageHeader title={t("imp.titulo")} subtitle={t("imp.sub")} />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {tone && <Notice tone={tone}>{t(`imp.msg.${code}` as Key)}</Notice>}
        <Card
          title={t("imp.importar")}
          subtitle={t("imp.cuenta", { strava: counts.strava, archivos: counts.manual }) + (db.lastSync ? t("imp.ultima", { fecha: new Date(db.lastSync).toLocaleString(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }) }) : "")}
        >
          <ImportPanel locale={locale} />
          <details className="mt-4 text-sm text-ink-2">
            <summary className="cursor-pointer font-semibold text-ink">{t("imp.como")}</summary>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>{t("imp.paso1")}</li>
              <li>{t("imp.paso2")}</li>
              <li>{t("imp.paso3")}</li>
              <li>{t("imp.paso4")}</li>
            </ol>
          </details>
        </Card>
        <Card title={t("imp.demo")} subtitle={t("imp.demoSub")}>
          <div className="flex flex-wrap items-center gap-3">
            <form action={loadDemo}>
              <button className="btn btn-ghost">{counts.demo ? t("imp.regenerar") : t("imp.cargar")}</button>
            </form>
            {counts.demo > 0 && (
              <form action={clearDemo}>
                <button className="btn btn-ghost">{t("imp.borrar", { n: counts.demo })}</button>
              </form>
            )}
          </div>
        </Card>
      </div>

      <Card title={t("imp.privacidad")}>
        <p className="mb-3 text-sm text-ink-2">{t("imp.registrar1")}{" "}
          <a href="/registrar" className="font-semibold text-accent">
            {t("nav.registrar")}
          </a>
          .</p>
        <ul className="space-y-2 text-sm text-ink-2">
          <li>• {t("imp.priv1")}</li>
          <li>• {t("imp.priv2")}</li>
          <li>• {t("imp.priv3")}</li>
        </ul>
      </Card>
    </div>
    </>
  );
}
