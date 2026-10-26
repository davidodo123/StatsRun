import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/components/AuthForms";
import { loginLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginPanel />}>
      <Panel searchParams={searchParams} />
    </Suspense>
  );
}

async function Panel({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const [{ error, borrada }, locale] = await Promise.all([searchParams, loginLocale()]);
  return <LoginPanel error={typeof error === "string" ? error : undefined} deleted={borrada === "1"} locale={locale} />;
}
