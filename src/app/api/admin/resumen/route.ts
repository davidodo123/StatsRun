import { connection } from "next/server";
import { adminOverview } from "@/lib/admin";
import { todayLocal } from "@/lib/dates";

/**
 * Resumen para el Centro de Operaciones de David (lo lee su tarea de cada noche). Público a propósito:
 * solo totales, sin nombres, correos ni datos de nadie. Se guarda 10 min en la CDN para que no se pueda saturar.
 */
export async function GET() {
  await connection();
  const today = todayLocal();
  const { rows, totals, backup, ai } = await adminOverview(today);
  return Response.json(
    {
      app: "Run-In-Out",
      fecha: today,
      generado: new Date().toISOString(),
      usuarios: totals.users,
      activos7: totals.active7,
      nuevosSemana: totals.newThisWeek,
      entrenosSemana: totals.activitiesWeek,
      iaMensajesHoy: totals.aiChatToday,
      iaReajustesHoy: totals.aiAdaptToday,
      usuariosConFalloIA: rows.filter((r) => r.aiError).length,
      openrouter: ai.openrouter,
      datosKB: totals.kb,
      copia: backup ? { fecha: backup.at, ok: backup.ok } : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" } },
  );
}
