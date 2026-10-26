import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPasswordPanel } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import { loginLocale } from "@/lib/i18n/server";
import { unsealValue } from "@/lib/session";

export const metadata: Metadata = { title: "Contraseña nueva" };

export default function NewPasswordPage({ searchParams }: PageProps<"/login/nueva">) {
  return (
    <Suspense fallback={<Loading />}>
      <Panel searchParams={searchParams} />
    </Suspense>
  );
}

async function Panel({ searchParams }: { searchParams: PageProps<"/login/nueva">["searchParams"] }) {
  const [{ t }, locale] = await Promise.all([searchParams, loginLocale()]);
  // el enlace caducado se avisa antes de escribir nada (la acción lo vuelve a comprobar, junto con la contraseña de ahora)
  const token = typeof t === "string" && unsealValue(t) ? t : undefined;
  return <NewPasswordPanel token={token} locale={locale} />;
}
