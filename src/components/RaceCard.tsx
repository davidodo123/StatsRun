import { FoldCard } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { RaceFileUpload } from "@/components/RaceFilesUpload";
import { applyCourseToPlan, removeCourse } from "@/app/actions";
import { fmtKm } from "@/lib/format";
import type { CourseMarker, Goal } from "@/lib/types";
import { translator, type Key, type T } from "@/lib/i18n";

const MARKER_LABEL: Record<CourseMarker["kind"], Key> = { salida: "recorrido.salida", meta: "recorrido.meta", agua: "recorrido.agua", km: "recorrido.km" };

/** Recorrido oficial (KMZ/KML/GPX) de la carrera objetivo: mapa, distancia y desnivel. */
export function RaceCard({ goal, t = translator("es") }: { goal: Goal; t?: T }) {
  const c = goal.course;
  // el desnivel del recorrido ya está aplicado al plan si coincide con el del objetivo
  const applied = c?.elevationGainM === undefined || c.elevationGainM === goal.elevationGainM;
  const kinds = c ? [...new Set(c.markers.map((m) => m.kind))] : [];
  return (
    // sin circuito subido va plegada: es solo el recuadro de subir el archivo
    <FoldCard
      className="mt-4"
      open={Boolean(c)}
      title={t("recorrido.titulo")}
      subtitle={c ? `${fmtKm(c.distanceKm, 2)} km${c.elevationGainM !== undefined ? ` · +${c.elevationGainM} m` : ""}` : t("recorrido.subeCircuito")}
    >
      <div className="space-y-3">
        {c ? (
          <>
            <RouteMap route={c.route} markers={c.markers} label={t("recorrido.de", { nombre: goal.name })} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular">
              <span>
                <span className="text-muted">{t("recorrido.distancia")} </span>
                <strong>{fmtKm(c.distanceKm, 2)} km</strong>
                {Math.abs(c.distanceKm - goal.distanceKm) / goal.distanceKm > 0.03 && (
                  <span className="text-xs text-muted"> {t("recorrido.laCarreraEs", { km: fmtKm(goal.distanceKm, 1) })}</span>
                )}
              </span>
              {c.elevationGainM !== undefined && (
                <span>
                  <span className="text-muted">{t("recorrido.desnivel")} </span>
                  <strong>
                    +{c.elevationGainM} / −{c.elevationLossM} m
                  </strong>
                </span>
              )}
              {kinds.length > 0 && <span className="text-xs text-ink-2">{kinds.map((k) => t(MARKER_LABEL[k])).join(" · ")}</span>}
            </div>
            {!applied && (
              <form action={applyCourseToPlan} className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <p className="text-ink-2">{t("recorrido.ajusteTexto", { plan: goal.elevationGainM ?? 0, recorrido: c.elevationGainM ?? 0 })}</p>
                <button className="btn mt-2 text-sm">{t("recorrido.ajustar")}</button>
              </form>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{t("recorrido.archivo", { nombre: c.fileName })}</span>
              <form action={removeCourse}>
                <button className="underline hover:text-critical">{t("recorrido.quitar")}</button>
              </form>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-2">{t("recorrido.sinRecorrido")}</p>
        )}
        <div className="sm:max-w-xs">
          <RaceFileUpload label={t(c ? "recorrido.cambiar" : "recorrido.subir")} busyLabel={t("recorrido.subiendo")} />
        </div>
      </div>
    </FoldCard>
  );
}
