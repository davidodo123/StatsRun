"use client";

import { useActionState } from "react";
import { adaptPlanWithAI, type FormState } from "@/app/actions";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";
import { Icon } from "./icons";

export function AiCoachButton({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(() => adaptPlanWithAI(), {});
  return (
    <form action={action} className="space-y-2">
      <button className="btn" disabled={pending}>
        {pending ? t("plan.iaRevisando") : t("plan.ajustarIA")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.ok && !pending && (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-good-ink">
          <Icon name="checkCircle" className="h-4 w-4" />
          {t("plan.iaListo")}
        </p>
      )}
    </form>
  );
}
