import type { Activity } from "./types";

/** Dirección de la foto de un entreno (la versión hace que el navegador coja la nueva al cambiarla). */
export const activityPhotoUrl = (ownerId: string, a: Pick<Activity, "id" | "photoAt">) =>
  a.photoAt ? `/api/foto/${ownerId}/${encodeURIComponent(a.id)}?v=${Date.parse(a.photoAt)}` : undefined;
