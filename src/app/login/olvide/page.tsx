import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPanel } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import { loginLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Contraseña olvidada" };

export default function ForgotPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  return <ForgotPanel locale={await loginLocale()} />;
}
