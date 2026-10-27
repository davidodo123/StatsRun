import { Card, Status } from "@/components/ui";
import { type Readiness, type SelyePhase } from "@/lib/engine/readiness";
import { translator, type Key, type T } from "@/lib/i18n";
import { Icon } from "./icons";

const ORDER: SelyePhase[] = ["desentrenamiento", "alarma", "adaptacion", "agotamiento", "supercompensacion"];

const FULL: Record<SelyePhase, Key> = {
  desentrenamiento: "forma.fase.desentrenamiento",
  alarma: "forma.fase.alarma",
  adaptacion: "forma.fase.adaptacion",
  agotamiento: "forma.fase.agotamiento",
  supercompensacion: "forma.fase.supercompensacion",
};
const SHORT: Record<SelyePhase, Key> = {
  desentrenamiento: "forma.corto.desentrenamiento",
  alarma: "forma.corto.alarma",
  adaptacion: "forma.corto.adaptacion",
  agotamiento: "forma.corto.agotamiento",
  supercompensacion: "forma.corto.supercompensacion",
};

const TONE = {
  progresar: "good",
  mantener: "neutral",
  recuperar: "warn",
  descargar: "bad",
} as const;

const CHECK_LABEL: Record<keyof Readiness["check"], Key> = {
  motivacionBaja: "forma.check.motivacionBaja",
  malDescanso: "forma.check.malDescanso",
  rendimientoBaja: "forma.check.rendimientoBaja",
  estresAlto: "forma.check.estresAlto",
  molestias: "forma.check.molestias",
};

/** Diagnóstico del estado de forma (Selye + Banister + evaluación de recuperación). */
export function ReadinessCard({ r, t = translator("es") }: { r: Readiness; t?: T }) {
  return (
    <Card title={t("forma.titulo")}>
      <div className="space-y-3 text-sm">
        <Status tone={TONE[r.verdict]}>{t(`est.v.${r.verdict}` as Key)}</Status>

        <div>
          <p className="mb-1 text-xs text-muted">{t("forma.faseSelye")}</p>
          <div className="flex gap-1" role="list">
            {ORDER.map((p) => (
              <span
                key={p}
                role="listitem"
                aria-current={p === r.phase ? "step" : undefined}
                className={`min-w-0 flex-1 break-words rounded-md px-1 py-1 text-center text-[10px] leading-tight ${p === r.phase ? "bg-accent font-semibold text-accent-ink" : "bg-surface-2 text-muted"}`}
                title={t(FULL[p])}
              >
                {/* en móvil no caben los nombres largos («Supercompensación») */}
                <span className="sm:hidden">{t(SHORT[p])}</span>
                <span className="hidden sm:inline">{t(FULL[p])}</span>
              </span>
            ))}
          </div>
        </div>

        <details className="group/why">
          <summary className="cursor-pointer list-none text-xs font-semibold text-accent">
            <span className="group-open/why:hidden">{t("forma.verPorQue")}</span>
            <span className="hidden group-open/why:inline">{t("forma.ocultar")}</span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(CHECK_LABEL) as (keyof Readiness["check"])[]).map((k) => (
              <span key={k} className={`rounded-full border px-2 py-0.5 text-xs ${r.check[k] ? "border-warning text-ink" : "border-line text-muted"}`}>
                <Icon name={r.check[k] ? "alert" : "check"} className="mr-1 h-3 w-3 align-[-1px]" />
                {t(CHECK_LABEL[k])}
              </span>
            ))}
          </div>

          {r.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
              {r.reasons.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </Card>
  );
}
