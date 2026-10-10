import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { StrengthHome } from "@/components/StrengthHome";

export const metadata: Metadata = { title: "Fuerza" };

export default function StrengthPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StrengthHome />
    </Suspense>
  );
}
