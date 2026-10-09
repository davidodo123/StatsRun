import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LinkPanel } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import type { GoogleIdentity } from "@/lib/auth";
import { GOOGLE_PENDING_COOKIE, unsealValue } from "@/lib/session";

export const metadata: Metadata = { title: "Enlazar cuenta" };

export default function EnlazarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  const g = unsealValue<GoogleIdentity>((await cookies()).get(GOOGLE_PENDING_COOKIE)?.value);
  if (!g) redirect("/login?error=caducado");
  return <LinkPanel email={g.email} />;
}
