import "server-only";
import { cookies } from "next/headers";
import { CELEBRATE_COOKIE } from "./celebrateCookie";
import type { SportKind } from "./types";

/** Marca que se acaba de registrar un entreno: WorkoutCelebration la ve (aunque la acción cambie de pantalla) y lanza la animación de ese deporte. */
export async function markCelebration(sport: SportKind): Promise<void> {
  (await cookies()).set(CELEBRATE_COOKIE, sport, { maxAge: 30, path: "/", sameSite: "lax" });
}
