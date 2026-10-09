import { Card } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { RaceFileUpload } from "@/components/RaceFilesUpload";
import { applyCourseToPlan, deleteDocument, removeCourse } from "@/app/actions";
import { fmtKm } from "@/lib/format";
import { shortDate } from "@/lib/dates";
import type { CourseMarker, Goal, StoredDocument } from "@/lib/types";

const MARKER_LABEL: Record<CourseMarker["kind"], string> = { salida: "▶ Salida", meta: "⚑ Meta", agua: "💧 Avituallamiento", km: "• Puntos kilométricos" };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);

/** Recorrido oficial (KMZ/KML/GPX) y documentos PDF de la carrera objetivo. */
export function RaceCard({ goal, documents }: { goal: Goal; documents: StoredDocument[] }) {
  const c = goal.course;
  // el desnivel del recorrido ya está aplicado al plan si coincide con el del objetivo
  const applied = c?.elevationGainM === undefined || c.elevationGainM === goal.elevationGainM;
  const kinds = c ? [...new Set(c.markers.map((m) => m.kind))] : [];
  return (
    <Card className="mt-4" title="Tu carrera: recorrido y documentos" subtitle="Sube el circuito oficial (.kmz, .kml o .gpx) y los PDF de la carrera: reglamento, dorsal, horarios…">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
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
          <RaceFileUpload kind="recorrido" label={c ? "Cambiar recorrido (.kmz, .kml, .gpx)" : "Subir recorrido (.kmz, .kml, .gpx)"} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Documentos</p>
          {documents.length ? (
            <ul className="divide-y divide-line text-sm">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2 py-2">
                  <span aria-hidden>📄</span>
                  <a href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium hover:text-accent" title={d.name}>
                    {d.name}
                  </a>
                  <span className="shrink-0 text-xs text-muted tabular">
                    {kb(d.size)} · {shortDate(d.uploadedAt.slice(0, 10))}
                  </span>
                  <form action={deleteDocument}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="px-1 text-muted hover:text-critical" aria-label={`Borrar ${d.name}`} title="Borrar">
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Sin documentos.</p>
          )}
          <RaceFileUpload kind="documento" label="Subir PDF (máx. 4 MB)" />
          <p className="text-xs text-muted">Solo los ves tú: no se comparten con tus amigos.</p>
        </div>
      </div>
    </Card>
  );
}
