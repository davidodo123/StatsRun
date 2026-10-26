import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader } from "@/components/ui";
import { ExerciseForm } from "@/components/ExerciseForm";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Crear ejercicio" };

export default function NewExercisePage({ searchParams }: PageProps<"/fuerza/ejercicios/nuevo">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/ejercicios/nuevo">["searchParams"] }) {
  const [sp, db, { t, locale }] = await Promise.all([searchParams, getDb(), getT()]);
  const editId = typeof sp.editar === "string" ? sp.editar : undefined;
  const exercise = editId ? db.customExercises?.find((x) => x.id === editId) : undefined;
  if (editId && !exercise) notFound();

  return (
    <>
      <BackLink href={exercise ? `/fuerza/ejercicios/${exercise.id}` : "/fuerza/ejercicios"} label={t("comun.volver")} />
      <PageHeader title={exercise ? t("ex.editarEj") : t("ef.crear")} subtitle={t("ex.nuevoSub")} />
      <Card>
        <ExerciseForm exercise={exercise} locale={locale} />
      </Card>
    </>
  );
}
