import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Pill } from "@/components/ui";
import { PlaceForm } from "@/components/PlaceForm";
import { addPresetPlace, deletePlace, setActivePlace } from "@/app/strength-actions";
import { getDb } from "@/lib/db";
import { CATALOG, activePlace } from "@/lib/strength/catalog";
import { PLACE_PRESETS, canDo } from "@/lib/strength/labels";
import { getT } from "@/lib/i18n/server";
import type { Key } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mi material" };

export default function EquipmentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [db, { t, locale }] = await Promise.all([getDb(), getT()]);
  const places = db.places ?? [];
  const active = activePlace(db);
  const presets = PLACE_PRESETS.filter((p) => !places.some((q) => q.name === p.name));

  return (
    <>
      <BackLink href="/fuerza" label={t("comun.volver")} />
      <PageHeader title={t("mat.titulo")} subtitle={t("mat.sub")} />
      <div className="space-y-3">
        {places.map((p) => {
          const doable = CATALOG.filter((x) => canDo(x.eq, p.equipment)).length;
          const isActive = p.id === active?.id;
          return (
            <Card
              key={p.id}
              title={
                <span className="flex items-center gap-2">
                  {p.name}
                  {isActive && <Pill className="bg-accent text-accent-ink">{t("mat.ahora")}</Pill>}
                </span>
              }
              subtitle={t("mat.posibles", { n: doable })}
              action={
                <div className="flex items-center gap-3">
                  {!isActive && (
                    <form action={setActivePlace}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs font-medium text-accent">{t("mat.entrenoAqui")}</button>
                    </form>
                  )}
                  <form action={deletePlace}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-muted underline hover:text-critical" aria-label={t("mat.borrarAria", { nombre: p.name })}>
                      {t("fh.borrar")}
                    </button>
                  </form>
                </div>
              }
            >
              <ul className="flex flex-wrap gap-1.5">
                {p.equipment.map((e) => {
                  return (
                    <li key={e} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                      {t(`equipo.${e}` as Key)}
                    </li>
                  );
                })}
              </ul>
              {p.notes && <p className="mt-2 text-xs text-ink-2">{p.notes}</p>}
              <details className="mt-3 rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold">{t("ex.editar")}</summary>
                <div className="mt-3">
                  <PlaceForm place={p} locale={locale} />
                </div>
              </details>
            </Card>
          );
        })}

        {presets.length > 0 && (
          <Card title={places.length ? t("mat.rapido") : t("mat.empieza")} subtitle={t("mat.luego")}>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <form key={p.name} action={addPresetPlace}>
                  <input type="hidden" name="preset" value={p.name} />
                  <button className="btn btn-ghost">+ {p.name}</button>
                </form>
              ))}
            </div>
          </Card>
        )}

        <Card title={t("mat.nuevo")}>
          <PlaceForm locale={locale} />
        </Card>
      </div>
    </>
  );
}
