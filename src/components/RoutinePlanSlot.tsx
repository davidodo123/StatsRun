"use client";

import { useRef } from "react";
import { setRoutinePlanSlot } from "@/app/strength-actions";
import { translator, type Key, type Locale } from "@/lib/i18n";

const KINDS = ["pierna", "posterior", "superior", "completo", "pecho", "espalda", "hombro"];

/** En qué día del plan va esta rutina: lo decide el plan, uno concreto o ninguno. Se guarda al elegir. */
export function RoutinePlanSlot({ id, slot, kinds, uses, locale }: { id: string; slot?: string; kinds: string[]; uses: number; locale: Locale }) {
  const t = translator(locale);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setRoutinePlanSlot} className="mt-4 rounded-xl border border-line bg-surface p-3">
      <input type="hidden" name="id" value={id} />
      <label className="field">
        {t("rps.enPlan")}
        <select className="input" name="slot" defaultValue={slot ?? ""} onChange={() => form.current?.requestSubmit()}>
          <option value="">{t("rps.auto")}</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {KINDS.includes(k) ? t(`rps.${k}` as Key) : k}
            </option>
          ))}
          <option value="no">{t("rps.no")}</option>
        </select>
      </label>
      <p className="mt-2 text-xs text-muted">
        {slot === "no" ? t("rps.noUsa") : uses ? (uses === 1 ? t("rps.usos1") : t("rps.usos", { n: uses })) : t("rps.ninguna")}
      </p>
    </form>
  );
}
