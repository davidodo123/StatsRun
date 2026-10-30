import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { translator, type T } from "@/lib/i18n";
import { loginLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Borrar tu cuenta" };

/** Correo de contacto (variable CONTACT_EMAIL en Vercel), leído en cada petición como en la política de privacidad. */
async function Contact({ t }: { t: T }) {
  await connection();
  const contact = process.env.CONTACT_EMAIL;
  if (!contact) return <>{t("bc.sinCorreo")}</>;
  return (
    <>
      {t("bc.escribe")}
      <a href={`mailto:${contact}?subject=Zancavolt`} className="font-semibold text-accent underline">
        {contact}
      </a>
      .
    </>
  );
}

/** Pública, sin sesión: Google Play pide un enlace para borrar la cuenta sin tener que abrir la app. */
export default function DeleteAccountPage() {
  return (
    <main className="min-w-0 flex-1 px-4 py-10">
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const t = translator(await loginLocale());
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Zancavolt</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("bc.titulo")}</h1>
        <p className="mt-2 text-sm text-ink-2">{t("bc.intro")}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bc.desdeApp")}</h2>
        <p className="text-sm leading-relaxed text-ink-2">{t("bc.pasos")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bc.sinApp")}</h2>
        <p className="text-sm leading-relaxed text-ink-2">
          <Suspense fallback={t("bc.sinCorreo")}>
            <Contact t={t} />
          </Suspense>
          {t("bc.plazo")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bc.queSeBorra")}</h2>
        <p className="text-sm leading-relaxed text-ink-2">{t("bc.borra")}</p>
        <p className="text-sm leading-relaxed text-ink-2">{t("bc.copias")}</p>
      </section>

      <p className="text-sm">
        <Link href="/privacidad" className="font-semibold text-accent">
          {t("bc.privacidad")}
        </Link>
      </p>
    </article>
  );
}
