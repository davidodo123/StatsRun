import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, Notice, PageHeader, Stat, StatGroup, Status } from "@/components/ui";
import { viewAdminOverview, viewIsAdmin } from "@/lib/admin";
import { AI_LIMITS } from "@/lib/aiPlan";
import { viewToday } from "@/lib/analysis";
import { diffDays, shortDate } from "@/lib/dates";
import { fmtNum } from "@/lib/format";
import { requireViewerId } from "@/lib/session";

export const metadata: Metadata = { title: "Administración" };

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administración" subtitle="Solo lo ves tú: usuarios, uso de la IA y copias de seguridad." />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

const ago = (date: string | undefined, today: string) => {
  if (!date) return "nunca";
  const d = diffDays(today, date);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
};

async function Content() {
  // a quien no es administrador, la página ni existe
  if (!(await viewIsAdmin(await requireViewerId()))) notFound();
  const today = await viewToday();
  const { rows, totals, backup, ai } = await viewAdminOverview(today);
  const backupAge = backup && diffDays(today, backup.at.slice(0, 10));
  return (
    <div className="space-y-4">
      <StatGroup>
        <Stat label="Usuarios" value={totals.users} sub={totals.newThisWeek ? `${totals.newThisWeek} nuevos esta semana` : undefined} />
        <Stat label="Activos 7 días" value={totals.active7} sub="con algún entreno" />
        <Stat label="Entrenos esta semana" value={totals.activitiesWeek} />
        <Stat label="IA hoy" value={totals.aiChatToday} sub={`mensajes · ${totals.aiAdaptToday} reajustes`} />
      </StatGroup>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Copia de seguridad" subtitle="Cada noche, cifrada, al repo privado de GitHub">
          {!backup ? (
            <p className="text-sm text-ink-2">Aún no hay registro: se apunta a partir de la próxima copia (03:00 UTC).</p>
          ) : backup.ok ? (
            <div className="space-y-1 text-sm text-ink-2">
              <Status tone={backupAge !== undefined && backupAge <= 1 ? "good" : "warn"}>{backupAge !== undefined && backupAge <= 1 ? "Al día" : "Atrasada"}</Status>
              <p>
                Última: {new Date(backup.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {backup.keys} claves · {fmtNum((backup.bytes ?? 0) / 1024)} KB
              </p>
            </div>
          ) : (
            <Notice tone="bad">
              Falló el {new Date(backup.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}: {backup.error}
            </Notice>
          )}
        </Card>
        <Card title="Base de datos e IA">
          <div className="space-y-1 text-sm text-ink-2">
            <p>
              Datos de todos los usuarios: <strong className="text-ink">{fmtNum(totals.kb)} KB</strong> (el plan gratis de Upstash llega a 256 MB).
            </p>
            <p>
              OpenRouter: {ai.openrouter ? "configurado" : <strong className="text-critical">sin clave</strong>}. Límite por usuario: {AI_LIMITS.chat} mensajes y {AI_LIMITS.adapt}{" "}
              reajustes al día, {AI_LIMITS.routines} rutinas a la semana.
            </p>
            {rows.some((r) => r.aiError) && <p className="text-warning">Hay fallos de la IA en {rows.filter((r) => r.aiError).length} usuarios (abajo).</p>}
          </div>
        </Card>
      </div>

      <Card title="Usuarios" subtitle="Por último entreno">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">
                  {r.name} <span className="text-sm font-normal text-muted">@{r.username}</span>
                </p>
                <p className="text-xs text-muted">alta {shortDate(r.since)}</p>
              </div>
              {r.email && <p className="text-xs text-muted">{r.email}</p>}
              <p className="mt-1 text-sm text-ink-2">
                Último entreno: <strong className="text-ink">{ago(r.lastActivity, today)}</strong> · {r.last7} esta semana · {r.activities} en total
              </p>
              <p className="text-sm text-ink-2">
                {r.plan ? `Plan${r.goal ? `: ${r.goal}` : ""}` : "Sin plan"} · IA hoy {r.aiToday.chat} mensajes, {r.aiToday.adapt} reajustes · {r.friends} amigos
                {r.health && ` · Salud: ${r.health}`}
                {r.push && " · Avisos"} · {r.kb} KB
              </p>
              {r.aiError && <p className="mt-1 text-xs text-warning">Último fallo de la IA: {r.aiError}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
