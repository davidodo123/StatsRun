"use client";

import { useActionState } from "react";
import { regeneratePlan, type FormState } from "@/app/actions";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";

export function AdaptPlanButton({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(() => regeneratePlan(), {});
  return (
    <form action={action} className="contents">
      <button className="btn" disabled={pending} title={t("plan.adaptarTitle")}>
        {pending ? t("plan.adaptando") : t("plan.adaptar")}
      </button>
      {(state.error || state.message) && (
        <p role="status" className={`order-last basis-full text-sm font-medium ${state.error ? "text-critical" : "text-good-ink"}`}>
          {state.error ? `✕ ${state.error}` : `✓ ${state.message}`}
        </p>
      )}
    </form>
  );
}
