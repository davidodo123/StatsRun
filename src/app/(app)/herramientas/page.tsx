import type { Metadata } from "next";
import { Calculators } from "@/components/Calculators";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Calculadoras" };

export default function ToolsPage() {
  return (
    <>
      <PageHeader title="Calculadoras" subtitle="VDOT, ritmos de entrenamiento, predicciones, zonas y conversión de ritmo." />
      <Calculators />
    </>
  );
}
