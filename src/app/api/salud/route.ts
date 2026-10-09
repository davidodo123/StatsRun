import { readDbNow, updateDb } from "@/lib/db";
import { mergeHealth, parseHealthPayload, todayMadrid } from "@/lib/health";
import { userForHealthToken } from "@/lib/healthToken";

const reply = (body: { ok: boolean; message?: string; error?: string }, status = 200) => Response.json(body, { status });

/**
 * Recibe los pasos y las calorías del día desde el atajo de Salud del iPhone.
 * Autenticación: cabecera "Authorization: Bearer rio_…" (la clave de Perfil → Pasos y calorías), sin cookie de sesión.
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const uid = token ? await userForHealthToken(token) : undefined;
  if (!uid) return reply({ ok: false, error: "Clave no válida. Crea una nueva en Run-In-Out → Perfil → Pasos y calorías." }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > 200_000) return reply({ ok: false, error: "Demasiados datos." }, 413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "El cuerpo tiene que ser JSON." }, 400);
  }
  const today = todayMadrid();
  const parsed = parseHealthPayload(body, today);
  if ("error" in parsed) return reply({ ok: false, error: parsed.error }, 400);
  if (!(await readDbNow(uid)).healthTokenHash) return reply({ ok: false, error: "Clave revocada." }, 401);

  await updateDb((db) => {
    db.health = mergeHealth(db.health ?? [], parsed.days, today);
  }, uid);
  const d = parsed.days.at(-1)!;
  const what = [d.steps !== undefined && `${d.steps.toLocaleString("es-ES")} pasos`, d.activeKcal !== undefined && `${d.activeKcal} kcal activas`].filter(Boolean).join(" y ");
  return reply({ ok: true, message: parsed.days.length > 1 ? `${parsed.days.length} días guardados.` : `Guardado: ${what || "datos del día"}.` });
}
