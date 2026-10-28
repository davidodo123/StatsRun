"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";
import { keepForm } from "./keepForm";
import { translator, type Locale } from "@/lib/i18n";

/** Borrar la cuenta: hay que escribir BORRAR, porque no se puede deshacer. */
export function DeleteAccountForm({ locale = "es" }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form onSubmit={keepForm(action)} className="space-y-2">
      <p className="text-sm text-ink-2">
        {t("dc.texto")} <strong className="text-ink">{t("dc.noDeshacer")}</strong>
      </p>
      <label className="field">
        {t("dc.escribe")}
        <input className="input" name="confirm" autoComplete="off" required />
      </label>
      <button className="btn border-critical bg-critical text-white" disabled={pending}>
        {pending ? t("dc.borrando") : t("dc.borrar")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
    </form>
  );
}
