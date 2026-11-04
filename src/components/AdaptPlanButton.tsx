"use client";

import { useActionState } from "react";
import { regeneratePlan, type FormState } from "@/app/actions";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";
import { ChangeCard } from "./ChangeCard";

export function AdaptPlanButton({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(() => regeneratePlan(), {});
  return (
    <form action={action} className="contents">
      <button className="btn" disabled={pending} title={t("plan.adaptarTitle")}>
        {pending ? t("plan.adaptando") : t("plan.adaptar")}
      </button>
      {state.error && (
        <p role="status" className="order-last basis-full text-sm font-medium text-critical">
          ✕ {state.error}
        </p>
      )}
      {state.ok && (
        <div className="order-last basis-full">
          <ChangeCard change={state.change} text={state.message} locale={locale} link={false} />
        </div>
      )}
    </form>
  );
}
