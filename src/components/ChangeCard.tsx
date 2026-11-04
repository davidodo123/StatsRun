import Link from "next/link";
import type { ReactNode } from "react";
import type { PlanChange } from "@/lib/types";
import { intlLocale, translator, type Locale } from "@/lib/i18n";
import { Icon } from "./icons";

/**
 * Lo que cambió en el plan (al rehacerlo con «Adaptar» o al aplicar un cambio pedido en el chat), en una tarjeta:
 * antes era una línea de texto verde oscuro y en español. `text`: mensajes antiguos que solo guardaban el texto.
 */
export function ChangeCard({ change, text, locale, link = true }: { change?: PlanChange; text?: string; locale: Locale; link?: boolean }) {
  const t = translator(locale);
  const num = (n: number) => n.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 });
  const items: ReactNode[] = [];
  let title = t("chg.aplicado");
  if (change?.kind === "recalc") {
    const same = !change.days && change.kmBefore === change.kmAfter && change.vdotBefore === undefined;
    title = same ? t("chg.igual") : t("chg.recalculado");
    if (change.days) items.push(change.days === 1 ? t("chg.dia1") : t("chg.dias", { n: change.days }));
    if (change.kmBefore !== undefined && change.kmAfter !== undefined && change.kmBefore !== change.kmAfter) items.push(t("chg.km", { a: num(change.kmBefore), b: num(change.kmAfter) }));
    if (change.vdotBefore !== undefined && change.vdotAfter !== undefined) items.push(t("chg.vdot", { a: num(change.vdotBefore), b: num(change.vdotAfter) }));
  } else if (change) {
    if (change.blocked) items.push(change.blocked === 1 ? t("chg.sinEntrenar1") : t("chg.sinEntrenar", { n: change.blocked }));
    if (change.adjusted !== undefined) items.push(change.adjusted === 1 ? t("plan.ajustada1") : change.adjusted ? t("plan.ajustadas", { n: change.adjusted }) : t("plan.sinCambios"));
  }
  return (
    <div role="status" className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <div className="flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-ink" aria-hidden>
          <Icon name="check" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold text-ink">{title}</p>
          {items.length > 0 && (
            <ul className="space-y-0.5 text-sm text-ink-2">
              {items.map((x, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent" aria-hidden>
                    •
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          )}
          {/* lo que explica la IA (ya viene en su idioma); en los mensajes antiguos, el texto que se guardó */}
          {(change?.summary || (!change && text)) && <p className="text-sm leading-relaxed text-ink-2">{change?.summary ?? text}</p>}
          {change?.ai && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Icon name="sparkle" className="h-3.5 w-3.5 text-accent" />
              {t("chg.iaAjustando")}
            </p>
          )}
          {link && (
            <Link href="/plan/actual" className="inline-block pt-1 text-sm font-semibold text-accent">
              {t("chg.verPlan")} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
