"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAccount, linkAccount } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <div className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">▲</span>
        <span>
          Run-In-<span className="text-accent">Out</span>
        </span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">{children}</div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const ERRORS: Record<string, string> = {
  "sin-config": "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.",
  cancelado: "Has cancelado el inicio de sesión con Google.",
  estado: "La sesión de Google ha caducado. Vuelve a intentarlo.",
  caducado: "Ha pasado demasiado tiempo. Vuelve a entrar con Google.",
  google: "Google no ha respondido bien. Vuelve a intentarlo.",
};

export function LoginPanel({ error, deleted }: { error?: string; deleted?: boolean }) {
  return (
    <AuthShell title="Entrar" subtitle="Tu plan, tus entrenos y los de tus amigos.">
      {deleted && <p className="mb-4 text-sm font-medium text-good-ink">✓ Tu cuenta y todos tus datos se han borrado.</p>}
      {/* enlace normal (no fetch): el navegador tiene que ir a Google */}
      <a href="/api/auth/google" className="btn btn-ghost flex w-full items-center justify-center gap-3">
        <GoogleLogo />
        Continuar con Google
      </a>
      {error && <p className="mt-4 text-sm font-medium text-critical">✕ {ERRORS[error] ?? "No se pudo iniciar sesión."}</p>}
      <p className="mt-4 text-center text-xs text-muted">
        Al entrar aceptas la{" "}
        <a href="/privacidad" className="underline">
          política de privacidad
        </a>
        .
      </p>
    </AuthShell>
  );
}

function SubmitButton({ children, pendingText, ghost }: { children: React.ReactNode; pendingText: string; ghost?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn w-full ${ghost ? "btn-ghost" : ""}`} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function LinkPanel({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(linkAccount, {});
  return (
    <AuthShell title="Primera vez con Google" subtitle={`Has entrado como ${email}.`}>
      <p className="text-sm font-semibold">¿Ya tenías cuenta con usuario y contraseña?</p>
      <p className="mt-1 text-xs text-ink-2">Escríbelos una única vez para conservar tus entrenos, tu plan y tus amigos. Después solo entrarás con Google.</p>
      <form action={action} className="mt-4 space-y-4">
        <label className="field">
          Usuario
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="field">
          Contraseña
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </label>
        <SubmitButton pendingText="Enlazando…">Enlazar mi cuenta</SubmitButton>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      </form>
      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-3 text-sm text-ink-2">¿Es tu primera vez en Run-In-Out?</p>
        <form action={createAccount}>
          <SubmitButton ghost pendingText="Creando…">
            Crear cuenta nueva
          </SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
