"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <div className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">▲</span>
        Pace<span className="text-accent">Lab</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">{children}</div>
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <Shell title="Iniciar sesión" subtitle="Tu plan, tus entrenos y los de tus amigos.">
      <form action={action} className="space-y-4">
        <label className="field">
          Usuario
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="field">
          Contraseña
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      </form>
      <p className="mt-4 text-center text-sm text-ink-2">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-accent">
          Regístrate
        </Link>
      </p>
    </Shell>
  );
}

export function RegisterForm({ needsInvite }: { needsInvite: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  return (
    <Shell title="Crear cuenta" subtitle="Cada cuenta tiene su propio plan y sus entrenos.">
      <form action={action} className="space-y-4">
        <label className="field">
          Nombre
          <input className="input" name="name" autoComplete="given-name" placeholder="Cómo quieres que te vean tus amigos" />
        </label>
        <label className="field">
          Usuario
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" placeholder="p. ej. david_runner" required />
        </label>
        <label className="field">
          Contraseña
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={6} required />
        </label>
        <label className="field">
          Repite la contraseña
          <input className="input" name="password2" type="password" autoComplete="new-password" minLength={6} required />
        </label>
        {needsInvite && (
          <label className="field">
            Código de invitación
            <input className="input" name="invite" autoCapitalize="none" required placeholder="Te lo da quien te invitó" />
          </label>
        )}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      </form>
      <p className="mt-4 text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Inicia sesión
        </Link>
      </p>
    </Shell>
  );
}
