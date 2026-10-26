"use client";

import { useActionState } from "react";
import { adaptPlanWithAI, type FormState } from "@/app/actions";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";

export function AiCoachButton({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(() => adaptPlanWithAI(), {});
  return (
    <form action={action} className="space-y-2">
      <button className="btn" disabled={pending}>
        {pending ? t("plan.iaRevisando") : t("plan.ajustarIA")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
