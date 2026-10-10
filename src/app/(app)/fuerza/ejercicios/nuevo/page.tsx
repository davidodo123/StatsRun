import type { Metadata } from "next";
import Link from "next/link";
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
      <Link href={exercise ? `/fuerza/ejercicios/${exercise.id}` : "/fuerza/ejercicios"} className="text-sm text-ink-2 hover:text-ink">
        ← {exercise ? exercise.name : "Ejercicios"}
      </Link>
      <PageHeader title={exercise ? "Editar ejercicio" : "Crear ejercicio"} subtitle="Para lo que no esté en la biblioteca: lo verás junto al resto y podrás usarlo en tus rutinas." />
      <Card>
        <ExerciseForm exercise={exercise} />
      </Card>
    </>
  );
}
