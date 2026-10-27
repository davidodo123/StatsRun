"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAccount, forgotPassword, linkAccount, loginPassword, resetPassword, signUp } from "@/app/auth-actions";
import type { FormState } from "@/app/actions";
import { translator, type Key, type Locale } from "@/lib/i18n";
import { keepForm } from "./keepForm";
import { LogoMark } from "./LogoMark";

type T = ReturnType<typeof translator>;
const MIN_PASSWORD = 8;

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <div className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight">
        <LogoMark />
        <span>
          Zanca<span className="text-accent">volt</span>
        </span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-ink-2">{footer}</div>}
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

/** Botón de Google: enlace normal (no fetch), el navegador tiene que ir a Google. En la app de Android lo coge NativeBridge. */
function GoogleButton({ label }: { label: string }) {
  return (
    <a href="/api/auth/google" className="btn btn-ghost flex w-full items-center justify-center gap-3">
      <GoogleLogo />
      {label}
    </a>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Contraseña con botón para verla (en el móvil se escribe mal a ciegas). */
function PasswordField({ t, name = "password", label, autoComplete, minLength }: { t: T; name?: string; label: string; autoComplete: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="relative block">
        <input className="input pr-12" name={name} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
          aria-label={show ? t("auth.ocultar") : t("auth.mostrar")}
          aria-pressed={show}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {show && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </span>
    </label>
  );
}

function EmailField({ t }: { t: T }) {
  return (
    <label className="field">
      {t("auth.email")}
      <input className="input" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required />
    </label>
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

const Problem = ({ text }: { text?: string }) => (text ? <p className="text-sm font-medium text-critical">✕ {text}</p> : null);

function Privacy({ t }: { t: T }) {
  return (
    <p className="mt-4 text-center text-xs text-muted">
      {t("auth.aceptas")}{" "}
      <a href="/privacidad" className="underline">
        {t("auth.politica")}
      </a>
      .
    </p>
  );
}

// errores que trae la vuelta de Google en la dirección (?error=…)
const GOOGLE_ERRORS: Record<string, Key> = {
  "sin-config": "auth.err.sinConfig",
  cancelado: "auth.err.cancelado",
  estado: "auth.err.estado",
  caducado: "auth.err.googleCaducado",
  google: "auth.err.google",
};

export function LoginPanel({ error, deleted, locale = "es" }: { error?: string; deleted?: boolean; locale?: Locale }) {
  const t = translator(locale);
  const [state, action] = useActionState<FormState, FormData>(loginPassword, {});
  return (
    <AuthShell
      title={t("auth.entrar")}
      subtitle={t("auth.entrarSub")}
      footer={
        <>
          {t("auth.noCuenta")}{" "}
          <Link href="/login/crear" className="font-semibold text-accent">
            {t("auth.crearCuenta")}
          </Link>
        </>
      }
    >
      {deleted && <p className="mb-4 text-sm font-medium text-good-ink">{t("auth.borrada")}</p>}
      <GoogleButton label={t("auth.google")} />
      {error && (
        <div className="mt-4">
          <Problem text={t(GOOGLE_ERRORS[error] ?? "auth.err.generico")} />
        </div>
      )}
      <Divider label={t("auth.o")} />
      <form onSubmit={keepForm(action)} className="space-y-4">
        <EmailField t={t} />
        <div>
          <PasswordField t={t} label={t("auth.password")} autoComplete="current-password" />
          <Link href="/login/olvide" className="mt-2 inline-block text-xs font-medium text-accent">
            {t("auth.olvide")}
          </Link>
        </div>
        <SubmitButton pendingText={t("auth.entrando")}>{t("auth.entrar")}</SubmitButton>
        <Problem text={state.error} />
      </form>
      <Privacy t={t} />
    </AuthShell>
  );
}

export function SignUpPanel({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  return (
    <AuthShell
      title={t("auth.crearCuenta")}
      subtitle={t("auth.crearSub")}
      footer={
        <>
          {t("auth.yaCuenta")}{" "}
          <Link href="/login" className="font-semibold text-accent">
            {t("auth.entrar")}
          </Link>
        </>
      }
    >
      <GoogleButton label={t("auth.crearGoogle")} />
      <Divider label={t("auth.o")} />
      <form onSubmit={keepForm(action)} className="space-y-4">
        <label className="field">
          {t("auth.nombre")}
          <input className="input" name="name" autoComplete="name" maxLength={40} placeholder={t("auth.nombrePh")} required />
        </label>
        <EmailField t={t} />
        <div>
          <PasswordField t={t} label={t("auth.password")} autoComplete="new-password" minLength={MIN_PASSWORD} />
          <p className="mt-1 text-xs text-muted">{t("auth.minimo", { n: MIN_PASSWORD })}</p>
        </div>
        <SubmitButton pendingText={t("auth.creando")}>{t("auth.crearCuenta")}</SubmitButton>
        <Problem text={state.error} />
      </form>
      <Privacy t={t} />
    </AuthShell>
  );
}

export function ForgotPanel({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});
  return (
    <AuthShell
      title={t("auth.olvide")}
      subtitle={t("auth.olvideSub")}
      footer={
        <Link href="/login" className="font-semibold text-accent">
          {t("auth.volverEntrar")}
        </Link>
      }
    >
      {state.ok ? (
        <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>
      ) : (
        <form onSubmit={keepForm(action)} className="space-y-4">
          <EmailField t={t} />
          <SubmitButton pendingText={t("auth.enviando")}>{t("auth.enviarEnlace")}</SubmitButton>
          <Problem text={state.error} />
        </form>
      )}
    </AuthShell>
  );
}

export function NewPasswordPanel({ token, locale }: { token?: string; locale: Locale }) {
  const t = translator(locale);
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <AuthShell title={t("auth.nuevaTitulo")} subtitle={token ? t("auth.nuevaSub") : t("auth.caducado")}>
      {token ? (
        <form onSubmit={keepForm(action)} className="space-y-4">
          <input type="hidden" name="t" value={token} />
          <div>
            <PasswordField t={t} label={t("auth.password")} autoComplete="new-password" minLength={MIN_PASSWORD} />
            <p className="mt-1 text-xs text-muted">{t("auth.minimo", { n: MIN_PASSWORD })}</p>
          </div>
          <PasswordField t={t} name="password2" label={t("auth.repetir")} autoComplete="new-password" minLength={MIN_PASSWORD} />
          <SubmitButton pendingText={t("auth.guardando")}>{t("auth.guardarEntrar")}</SubmitButton>
          <Problem text={state.error} />
        </form>
      ) : (
        <Link href="/login/olvide" className="btn w-full">
          {t("auth.pedirOtro")}
        </Link>
      )}
    </AuthShell>
  );
}

export function LinkPanel({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(linkAccount, {});
  return (
    <AuthShell title="Primera vez con Google" subtitle={`Has entrado como ${email}.`}>
      <p className="text-sm font-semibold">¿Ya tenías cuenta con usuario y contraseña?</p>
      <p className="mt-1 text-xs text-ink-2">Escríbelos una única vez para conservar tus entrenos, tu plan y tus amigos. Después solo entrarás con Google.</p>
      <form onSubmit={keepForm(action)} className="mt-4 space-y-4">
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
        <p className="mb-3 text-sm text-ink-2">¿Es tu primera vez en Zancavolt?</p>
        <form action={createAccount}>
          <SubmitButton ghost pendingText="Creando…">
            Crear cuenta nueva
          </SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
