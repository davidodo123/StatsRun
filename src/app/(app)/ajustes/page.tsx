import type { Metadata } from "next";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { Card, Loading, Notice, PageHeader } from "@/components/ui";
import { ImportPanel } from "@/components/ImportPanel";
import { clearDemo, loadDemo } from "../actions";

export const metadata: Metadata = { title: "Importar datos" };

const MESSAGES: Record<string, { tone: "good" | "warn" | "bad"; text: string }> = {
  ok: { tone: "good", text: "Strava conectado y actividades importadas." },
  "conectado-sin-sync": { tone: "warn", text: "Strava conectado, pero la importación falló. Pulsa «Sincronizar ahora»." },
  denegado: { tone: "warn", text: "Has cancelado la autorización en Strava." },
  "sin-permiso": { tone: "bad", text: "Hace falta marcar el permiso de ver tus actividades (activity:read_all)." },
  "error-estado": { tone: "bad", text: "La respuesta de Strava no es válida (estado OAuth). Vuelve a intentarlo." },
  "sin-config": { tone: "bad", text: "Faltan STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en .env.local." },
};

export default function AjustesPage({ searchParams }: PageProps<"/ajustes">) {
  return (
    <>
      <PageHeader title="Importar y datos de ejemplo" subtitle="Lo normal es registrar cada entreno a mano; aquí puedes importar archivos de tu reloj o cargar datos demo." />
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/ajustes">["searchParams"] }) {
  const sp = await searchParams;
  const msg = MESSAGES[String(sp.strava ?? "")];
  const db = await getDb();
  const counts = {
    strava: db.activities.filter((a) => a.source === "strava").length,
    demo: db.activities.filter((a) => a.source === "demo").length,
    manual: db.activities.filter((a) => a.source === "manual").length,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Card
          title="Importar actividades"
          subtitle={`${counts.strava} de Strava · ${counts.manual} de archivos${db.lastSync ? ` · última importación ${new Date(db.lastSync).toLocaleString("es-ES")}` : ""}`}
        >
          <ImportPanel />
          <details className="mt-4 text-sm text-ink-2">
            <summary className="cursor-pointer font-semibold text-ink">Cómo descargar tus datos de Strava (gratis)</summary>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>
                En strava.com: <strong>Ajustes → Mi cuenta</strong> → «Descargar o eliminar tu cuenta» → <strong>Empezar</strong>.
              </li>
              <li>
                En el paso 2 pulsa <strong>«Solicitar tu archivo»</strong>. Te llega un email con un enlace (minutos u horas).
              </li>
              <li>Descarga el .zip y arrástralo aquí. Solo se lee el archivo activities.csv, el resto no sale de tu ordenador.</li>
              <li>
                Para las actividades nuevas: en Strava abre la actividad → <strong>⋯ → Exportar GPX</strong> (o usa el .fit de tu reloj) y arrástralo aquí. También
                puedes volver a pedir el zip: lo repetido se ignora.
              </li>
            </ol>
          </details>
        </Card>
        <Card title="Datos de ejemplo" subtitle="Para probar la app sin conectar Strava">
          <div className="flex flex-wrap items-center gap-3">
            <form action={loadDemo}>
              <button className="btn btn-ghost">{counts.demo ? "Regenerar datos demo" : "Cargar 6 meses de datos demo"}</button>
            </form>
            {counts.demo > 0 && (
              <form action={clearDemo}>
                <button className="btn btn-ghost">Borrar datos demo ({counts.demo})</button>
              </form>
            )}
          </div>
        </Card>
      </div>

      <Card title="Privacidad">
        <p className="mb-3 text-sm text-ink-2">Para apuntar un entreno usa <a href="/registrar" className="font-semibold text-accent">Registrar</a>.</p>
        <ul className="space-y-2 text-sm text-ink-2">
          <li>• Tus datos se guardan solo en tu ordenador (carpeta <code>web/data</code>).</li>
          <li>• Del zip de Strava solo se lee activities.csv, directamente en tu navegador. Fotos y demás no salen de tu equipo.</li>
          <li>• Nunca publicamos nada en Strava. Si usas la conexión directa, puedes revocarla en Strava → Ajustes → Mis aplicaciones.</li>
        </ul>
        
      </Card>
    </div>
  );
}
