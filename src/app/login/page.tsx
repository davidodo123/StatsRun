import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginPanel />}>
      <Panel searchParams={searchParams} />
    </Suspense>
  );
}

async function Panel({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return <LoginPanel error={typeof error === "string" ? error : undefined} />;
}
