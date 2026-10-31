import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_LOCALE, translator, type T } from "@/lib/i18n";
import { loginLocale } from "@/lib/i18n/server";

function Body({ t }: { t: T }) {
  return (
    <>
      <h1 className="mt-3 text-xl font-bold">{t("sis.noExiste")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("sis.noExisteTxt")}</p>
      <Link href="/" className="btn mt-6">
        {t("sis.inicio")}
      </Link>
    </>
  );
}

async function Localized() {
  return <Body t={translator(await loginLocale())} />;
}

// Direcciones que no existen en toda la app (se prerenderiza: el idioma llega después, en español mientras tanto)
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-24 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <Suspense fallback={<Body t={translator(DEFAULT_LOCALE)} />}>
        <Localized />
      </Suspense>
    </main>
  );
}
