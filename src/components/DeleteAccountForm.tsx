"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";

/** Borrar la cuenta: hay que escribir BORRAR, porque no se puede deshacer. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-2">
      <p className="text-sm text-ink-2">
        Se borran tu perfil, tu plan, todos tus entrenos y tus amistades, y se desconecta Strava. <strong className="text-ink">No se puede deshacer.</strong>
      </p>
      <label className="field">
        Escribe BORRAR para confirmar
        <input className="input" name="confirm" autoComplete="off" required />
      </label>
      <button className="btn border-critical bg-critical text-white" disabled={pending}>
        {pending ? "Borrando…" : "Borrar mi cuenta"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
    </form>
  );
}
