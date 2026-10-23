import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { getDb } from "@/lib/db";
import { activePlace, customSummaries } from "@/lib/strength/catalog";
import { lastSets } from "@/lib/strength/workouts";
import { exercisesFromSteps } from "@/lib/strength/planSteps";
import type { Routine } from "@/lib/types";
import { WEEKDAYS, shortDate, weekday } from "@/lib/dates";
import { viewToday } from "@/lib/analysis";

export const metadata: Metadata = { title: "Entreno" };

export default function WorkoutPage({ searchParams }: PageProps<"/fuerza/entreno">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/fuerza/entreno">["searchParams"] }) {
  const [sp, db] = await Promise.all([searchParams, getDb()]);
  const session = typeof sp.sesion === "string" ? db.plan?.weeks.flatMap((w) => w.sessions).find((x) => x.id === sp.sesion && x.type === "strength") : undefined;
  const id = session?.routineId ?? (typeof sp.rutina === "string" ? sp.rutina : undefined);
  const own = id ? db.routines?.find((r) => r.id === id) : undefined;
  // desde una sesión del plan: su rutina y lo que el plan le añade («+ …»), o la plantilla del plan ya en ejercicios
  const routine: Routine | undefined = session
    ? {
        id: own?.id ?? "",
        name: own?.name ?? session.title,
        exercises: [...(own?.exercises ?? []), ...exercisesFromSteps(own ? session.steps.filter((x) => x.startsWith("+ ")) : session.steps, db)],
        createdAt: "",
        updatedAt: "",
      }
    : own;
  // apuntar uno ya hecho (desde Registrar o una sesión pasada del plan): con su fecha y hora, sin cronómetro
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) && sp.fecha <= (await viewToday()) ? sp.fecha : undefined;
  const hora = typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : "18:00";
  return (
    <WorkoutLogger
      routine={routine}
      custom={customSummaries(db)}
      previous={lastSets(db.activities)}
      available={activePlace(db)?.equipment}
      bodyKg={db.profile?.weightKg}
      pastStart={fecha && `${fecha}T${hora}:00`}
      pastLabel={fecha && `${WEEKDAYS[weekday(fecha)].toLowerCase()} ${shortDate(fecha)}`}
    />
  );
}
