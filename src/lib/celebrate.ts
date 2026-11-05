import "server-only";
import { cookies } from "next/headers";
import { CELEBRATE_COOKIE } from "./celebrateCookie";

/** Marca que se acaba de registrar un entreno: WorkoutCelebration la ve (aunque la acción cambie de pantalla) y lanza la animación. */
export async function markCelebration(): Promise<void> {
  (await cookies()).set(CELEBRATE_COOKIE, "1", { maxAge: 30, path: "/", sameSite: "lax" });
}
