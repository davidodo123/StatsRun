import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AnalyticsToggle } from "@/components/Analytics";
import { translator } from "@/lib/i18n";
import { loginLocale } from "@/lib/i18n/server";
import { PRIVACY, type PrivacyTexts } from "./texts";

export const metadata: Metadata = { title: "Política de privacidad" };

/**
 * Correo de contacto para ejercer derechos (variable CONTACT_EMAIL en Vercel, no en el código).
 * Se lee en cada petición: si se leyera al compilar, cambiar la variable no se notaría hasta recompilar sin caché.
 */
async function ContactLink({ r }: { r: PrivacyTexts["rights"] }) {
  await connection();
  const contact = process.env.CONTACT_EMAIL;
  if (!contact) return <>{r.contactFallback}</>;
  return (
    <>
      {r.writing}
      <a href={`mailto:${contact}`} className="font-semibold text-accent underline">
        {contact}
      </a>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** Política de privacidad pública (Google la exige para publicar el inicio de sesión). Sin sesión: el idioma, de la cookie o del navegador. */
export default function PrivacyPage() {
  return (
    <main className="min-w-0 flex-1 px-4 py-10">
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const locale = await loginLocale();
  const p = PRIVACY[locale];
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Zancavolt · run-in-out.vercel.app</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{p.title}</h1>
        <p className="mt-1 text-sm text-muted">{p.updated}</p>
      </header>

      {p.sections.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.paras?.map((x) => <p key={x}>{x}</p>)}
          {s.items && (
            <ul className="list-disc space-y-1 pl-5">
              {s.items.map((it) => (
                <li key={it.text}>
                  {it.lead && <strong className="text-ink">{it.lead}: </strong>}
                  {it.text}
                </li>
              ))}
            </ul>
          )}
          {s.after?.map((x) => <p key={x}>{x}</p>)}
          {s.toggle && <AnalyticsToggle locale={locale} />}
        </Section>
      ))}

      <Section title={p.rights.title}>
        <p>
          {p.rights.before}
          <Suspense fallback={p.rights.contactFallback}>
            <ContactLink r={p.rights} />
          </Suspense>
          {p.rights.after}
        </p>
      </Section>

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/borrar-cuenta" className="font-semibold text-accent">
          {translator(locale)("bc.titulo")}
        </Link>
        <Link href="/" className="font-semibold text-accent">
          {p.back}
        </Link>
      </p>
    </article>
  );
}
