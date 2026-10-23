import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { ExerciseForm } from "@/components/ExerciseForm";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Crear ejercicio" };

export default function NewExercisePage({ searchParams }: PageProps<"/fuerza/ejercicios/nuevo">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/ejercicios/nuevo">["searchParams"] }) {
  const [sp, db] = await Promise.all([searchParams, getDb()]);
  const editId = typeof sp.editar === "string" ? sp.editar : undefined;
  const exercise = editId ? db.customExercises?.find((x) => x.id === editId) : undefined;
  if (editId && !exercise) notFound();

  return (
    <>
      <BackLink href={exercise ? `/fuerza/ejercicios/${exercise.id}` : "/fuerza/ejercicios"} />
      <PageHeader title={exercise ? "Editar ejercicio" : "Crear ejercicio"} subtitle="Para lo que no esté en la biblioteca: lo verás junto al resto y podrás usarlo en tus rutinas." />
      <Card>
        <ExerciseForm exercise={exercise} />
      </Card>
    </>
  );
}
