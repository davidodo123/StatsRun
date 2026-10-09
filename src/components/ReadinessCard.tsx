import { Card, Status } from "@/components/ui";
import { PHASE_LABEL, type Readiness, type SelyePhase } from "@/lib/engine/readiness";

const ORDER: SelyePhase[] = ["desentrenamiento", "alarma", "adaptacion", "agotamiento", "supercompensacion"];

const TONE = {
  progresar: "good",
  mantener: "neutral",
  recuperar: "warn",
  descargar: "bad",
} as const;

const CHECK_LABEL: Record<keyof Readiness["check"], string> = {
  motivacionBaja: "Motivación",
  malDescanso: "Descanso",
  rendimientoBaja: "Rendimiento",
  estresAlto: "Estrés",
  molestias: "Molestias",
};

/** Diagnóstico del estado de forma (Selye + Banister + evaluación de recuperación). */
export function ReadinessCard({ r }: { r: Readiness }) {
  return (
    <Card title="Estado de forma" subtitle="Lo que la IA usa para decidir si progresar, mantener o descargar">
      <div className="space-y-3 text-sm">
        <Status tone={TONE[r.verdict]}>{r.headline}</Status>

        <div>
          <p className="mb-1 text-xs text-muted">Fase de adaptación (Selye)</p>
          <div className="flex gap-1" role="list">
            {ORDER.map((p) => (
              <span
                key={p}
                role="listitem"
                aria-current={p === r.phase ? "step" : undefined}
                className={`flex-1 rounded-md px-1 py-1 text-center text-[10px] leading-tight ${p === r.phase ? "bg-accent font-semibold text-accent-ink" : "bg-surface-2 text-muted"}`}
              >
                {PHASE_LABEL[p]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CHECK_LABEL) as (keyof Readiness["check"])[]).map((k) => (
            <span key={k} className={`rounded-full border px-2 py-0.5 text-xs ${r.check[k] ? "border-warning text-ink" : "border-line text-muted"}`}>
              {r.check[k] ? "⚠ " : "✓ "}
              {CHECK_LABEL[k]}
            </span>
          ))}
        </div>

        {r.reasons.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-ink-2">
            {r.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
