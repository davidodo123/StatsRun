// Actividad de los amigos y sesiones en las que te han incluido.
import type { Activity, Db } from "./types";
import { diffDays } from "./dates";

export interface FeedPerson {
  id: string;
  name: string;
}

export interface FeedItem {
  owner: FeedPerson;
  activity: Activity;
}

export interface Feed {
  /** Últimas sesiones de los amigos (más recientes primero). */
  items: FeedItem[];
  /** Sesiones de amigos en las que te han marcado y aún no has añadido ni descartado. */
  sharedWithMe: FeedItem[];
}

/** Sin sensaciones ni notas: son privadas aunque se compartan las estadísticas. */
export function publicActivity(a: Activity): Activity {
  const out = { ...a };
  delete out.feelings;
  delete out.notes;
  delete out.feel;
  return out;
}

export function buildFeed(meId: string, me: Db, friends: { person: FeedPerson; db: Db }[], today: string, days = 14, limit = 30): Feed {
  const copied = new Set(me.activities.map((a) => a.sharedFrom).filter(Boolean));
  const dismissed = new Set(me.dismissedShared ?? []);
  const items: FeedItem[] = [];
  const sharedWithMe: FeedItem[] = [];
  for (const { person, db } of friends)
    for (const a of db.activities) {
      if (a.date > today) continue;
      const age = diffDays(today, a.date);
      if (age < days) items.push({ owner: person, activity: publicActivity(a) });
      const key = `${person.id}:${a.id}`;
      if (age < 30 && a.with?.includes(meId) && !copied.has(key) && !dismissed.has(key)) sharedWithMe.push({ owner: person, activity: publicActivity(a) });
    }
  const newest = (x: FeedItem, y: FeedItem) => y.activity.startLocal.localeCompare(x.activity.startLocal);
  return { items: items.sort(newest).slice(0, limit), sharedWithMe: sharedWithMe.sort(newest) };
}
