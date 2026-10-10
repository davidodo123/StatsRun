import { Card } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { RaceFileUpload } from "@/components/RaceFilesUpload";
import { applyCourseToPlan, removeCourse } from "@/app/actions";
import { fmtKm } from "@/lib/format";
import type { CourseMarker, Goal } from "@/lib/types";

const MARKER_LABEL: Record<CourseMarker["kind"], string> = { salida: "Salida", meta: "Meta", agua: "Avituallamiento", km: "Puntos kilométricos" };

/** Recorrido oficial (KMZ/KML/GPX) de la carrera objetivo: mapa, distancia y desnivel. */
export function RaceCard({ goal }: { goal: Goal }) {
  const c = goal.course;
  // el desnivel del recorrido ya está aplicado al plan si coincide con el del objetivo
  const applied = c?.elevationGainM === undefined || c.elevationGainM === goal.elevationGainM;
  const kinds = c ? [...new Set(c.markers.map((m) => m.kind))] : [];
  return (
    <Card className="mt-4" title="Recorrido de la carrera" subtitle="Sube el circuito oficial (.kmz, .kml o .gpx) para ver el mapa, la distancia y el desnivel.">
      <div className="space-y-3">
        {c ? (
          <>
            <RouteMap route={c.route} markers={c.markers} label={`Recorrido de ${goal.name}`} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular">
              <span>
                <span className="text-muted">Distancia </span>
                <strong>{fmtKm(c.distanceKm, 2)} km</strong>
                {Math.abs(c.distanceKm - goal.distanceKm) / goal.distanceKm > 0.03 && (
                  <span className="text-xs text-muted"> (la carrera es de {fmtKm(goal.distanceKm, 1)} km)</span>
                )}
              </span>
              {c.elevationGainM !== undefined && (
                <span>
                  <span className="text-muted">Desnivel </span>
                  <strong>
                    +{c.elevationGainM} / −{c.elevationLossM} m
                  </strong>
                </span>
              )}
              {kinds.length > 0 && <span className="text-xs text-ink-2">{kinds.map((k) => MARKER_LABEL[k]).join(" · ")}</span>}
            </div>
            {!applied && (
              <form action={applyCourseToPlan} className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <p className="text-ink-2">
                  El plan cuenta con <strong className="text-ink">+{goal.elevationGainM ?? 0} m</strong> de desnivel y el recorrido tiene{" "}
                  <strong className="text-ink">+{c.elevationGainM} m</strong>. El desnivel cambia el ritmo previsto de la carrera.
                </p>
                <button className="btn mt-2 text-sm">Ajustar el plan a este desnivel</button>
              </form>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>Archivo: {c.fileName}</span>
              <form action={removeCourse}>
                <button className="underline hover:text-critical">Quitar recorrido</button>
              </form>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-2">
            Aún no hay recorrido. Muchas webs de carreras (por ejemplo cruzandolameta.es) dejan descargar el circuito en .kmz o .gpx: súbelo y verás el mapa con salida,
            meta y avituallamientos.
          </p>
        )}
        <div className="sm:max-w-xs">
          <RaceFileUpload label={c ? "Cambiar recorrido (.kmz, .kml, .gpx)" : "Subir recorrido (.kmz, .kml, .gpx)"} />
        </div>
      </div>
    </Card>
  );
}
