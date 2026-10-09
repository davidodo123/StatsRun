import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { SPORT_LABEL, TagChips, withText } from "@/components/ActivityItem";
import { RouteReplay } from "@/components/RouteReplay";
import { tagsForDb } from "@/lib/engine/tags";
import { estimateVdot } from "@/lib/engine/stats";
import { areFriends, getFriends, getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { publicActivity } from "@/lib/feed";
import { requireUserId } from "@/lib/session";
import { WEEKDAYS, shortDate, todayLocal, weekday } from "@/lib/dates";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";

export const metadata: Metadata = { title: "Sesión" };

const FEEL: Record<string, string> = { muy_facil: "😌 Muy fácil", facil: "🙂 Fácil", bien: "👍 Bien", duro: "😓 Duro", muy_duro: "🥵 Muy duro" };

export default function ActivityPage({ params, searchParams }: PageProps<"/actividad/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: { params: PageProps<"/actividad/[id]">["params"]; searchParams: PageProps<"/actividad/[id]">["searchParams"] }) {
  const [{ id }, sp, uid] = await Promise.all([params, searchParams, requireUserId()]);
  const ownerId = typeof sp.de === "string" && sp.de ? sp.de : uid;
  const mine = ownerId === uid;
  // las sesiones de otro solo se ven si sois amigos
  if (!mine && !(await areFriends(uid, ownerId))) notFound();
  const [db, owner, friends] = await Promise.all([getDb(ownerId), getUser(ownerId), getFriends(uid)]);
  const raw = db.activities.find((a) => a.id === decodeURIComponent(id));
  if (!raw || !owner) notFound();
  const a = mine ? raw : publicActivity(raw);
  const names = new Map<string, string>([...friends.map((f) => [f.id, f.name] as [string, string]), [uid, "ti"], [owner.id, mine ? "ti" : owner.name]]);
  const together = withText(a.with, names);
  const tags = tagsForDb(db, estimateVdot(db.activities, db.profile, todayLocal()).vdot).get(a.id) ?? [];
  const pace = a.sport === "run" && a.distanceM > 0 ? a.movingSec / (a.distanceM / 1000) : undefined;
  const speed = a.distanceM > 0 && a.movingSec > 0 ? a.distanceM / 1000 / (a.movingSec / 3600) : undefined;

  return (
    <>
      <PageHeader
        title={a.name}
        subtitle={
          <>
            {!mine && <strong className="text-ink">{owner.name} · </strong>}
            {WEEKDAYS[weekday(a.date)]} {shortDate(a.date)} · {a.startLocal.slice(11, 16)} · {SPORT_LABEL[a.sport]}
            {together && ` · ${together}`}
          </>
        }
        action={
          <div className="flex gap-2">
            {mine && (
              <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="btn">
                Editar
              </Link>
            )}
            <Link href={mine ? "/perfil?tab=actividades" : `/amigos/${ownerId}`} className="btn btn-ghost">
              ← Volver
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {tags.length > 0 && <TagChips tags={tags} />}
          {a.route ? (
            <RouteReplay route={a.route} distanceKm={a.distanceM / 1000} movingSec={a.movingSec}>
              <RouteMap route={a.route} label={`Mapa de ${a.name}`} />
            </RouteReplay>
          ) : (
            <Card>
              <p className="text-sm text-ink-2">
                Esta sesión no tiene recorrido GPS. Los mapas salen de Strava o de importar el archivo del reloj (GPX, TCX o FIT) en Registrar.
              </p>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {a.distanceM > 0 && <Stat label="Distancia" value={fmtKm(a.distanceM / 1000, 2)} unit="km" />}
            <Stat label="Tiempo en movimiento" value={fmtDuration(a.movingSec)} sub={a.elapsedSec > a.movingSec + 30 ? `Total ${fmtDuration(a.elapsedSec)}` : undefined} />
            {pace ? <Stat label="Ritmo medio" value={fmtPace(pace)} unit="/km" /> : speed ? <Stat label="Velocidad media" value={fmtKm(speed)} unit="km/h" /> : null}
            {a.elevationGainM > 0 && <Stat label="Desnivel +" value={fmtNum(a.elevationGainM)} unit="m" sub={a.maxAltitudeM ? `Altitud máx. ${fmtNum(a.maxAltitudeM)} m` : undefined} />}
            {a.avgHr && <Stat label="FC media" value={Math.round(a.avgHr)} unit="ppm" sub={a.maxHr ? `Máx. ${Math.round(a.maxHr)}` : undefined} />}
            {a.avgCadence && <Stat label="Cadencia" value={Math.round(a.avgCadence)} unit="ppm" />}
            {a.steps && <Stat label="Pasos" value={fmtNum(a.steps)} />}
            {a.rpe && <Stat label="Esfuerzo (RPE)" value={a.rpe} unit="/10" />}
          </div>
        </div>
        <div className="space-y-4">
          {mine && (a.feel || a.feelings || a.notes) && (
            <Card title="Cómo te sentiste" subtitle="Solo lo ves tú (y la IA para ajustar el plan)">
              {a.feel && <p className="text-sm font-semibold">{FEEL[a.feel]}</p>}
              {a.feelings && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.feelings}</p>}
              {a.notes && <p className="mt-2 whitespace-pre-line text-xs text-muted">{a.notes}</p>}
            </Card>
          )}
          {a.source === "strava" && (
            <a href={`https://www.strava.com/activities/${a.id.replace("strava-", "")}`} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-accent">
              Ver en Strava ↗
            </a>
          )}
        </div>
      </div>
    </>
  );
}
