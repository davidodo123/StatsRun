"use client";

import { useActionState } from "react";
import { addFriend } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";
import { keepForm } from "./keepForm";
import { translator, type Locale } from "@/lib/i18n";

export function FriendCodeForm({ locale = "es" }: { locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(addFriend, {});
  return (
    <form onSubmit={keepForm(action)} className="space-y-2">
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1 uppercase tracking-widest" name="code" placeholder={t("am.codigoPh")} maxLength={6} autoCapitalize="characters" required />
        <button className="btn" disabled={pending}>
          {pending ? t("am.anadiendo") : t("am.anadir")}
        </button>
      </div>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
