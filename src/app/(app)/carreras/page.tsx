import type { Metadata } from "next";
import { RACES } from "@/lib/races";
import { RaceList } from "@/components/RaceList";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Carreras" };

export default function CarrerasPage() {
  return (
    <>
      <PageHeader title="Elige tu carrera objetivo" subtitle="Consulta el recorrido, el clima típico y genera un plan ajustado a ella." />
      <RaceList races={RACES} />
      <p className="mt-6 text-xs text-muted">Desnivel, temperatura y fechas son aproximados: confírmalos en la web oficial de cada carrera.</p>
    </>
  );
}
