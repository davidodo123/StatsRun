import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpPanel } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import { loginLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  return <SignUpPanel locale={await loginLocale()} />;
}
