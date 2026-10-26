"use client";

import { useActionState } from "react";
import { markUnavailable, type FormState } from "@/app/actions";
import { keepForm } from "./keepForm";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";

export function UnavailableForm({ today, locale = DEFAULT_LOCALE }: { today: string; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(markUnavailable, {});
  return (
    <form onSubmit={keepForm(action)} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          {t("plan.desde")}
          <input className="input" type="date" name="from" min={today} defaultValue={today} required />
        </label>
        <label className="field">
          {t("plan.hasta")}
          <input className="input" type="date" name="to" min={today} />
        </label>
      </div>
      <button className="btn" disabled={pending}>
        {pending ? t("plan.reorganizando") : t("plan.noPuedoDias")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
