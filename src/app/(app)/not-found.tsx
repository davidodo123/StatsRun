import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_LOCALE, translator, type T } from "@/lib/i18n";
import { loginLocale } from "@/lib/i18n/server";

function Body({ t }: { t: T }) {
  return (
    <>
      <h1 className="mt-3 text-xl font-bold">{t("sis.noEncontrado")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("sis.noEncontradoTxt")}</p>
      <Link href="/" className="btn mt-6">
        {t("sis.inicio")}
      </Link>
    </>
  );
}

async function Localized() {
  return <Body t={translator(await loginLocale())} />;
}

// Lo que no existe (o ya se borró): una sesión, una rutina, un ejercicio…
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <Suspense fallback={<Body t={translator(DEFAULT_LOCALE)} />}>
        <Localized />
      </Suspense>
    </div>
  );
}
