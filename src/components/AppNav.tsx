import { Nav } from "./Nav";
import { getDb } from "@/lib/db";
import { focusOf } from "@/lib/types";
import { viewIsAdmin } from "@/lib/admin";
import { requireViewerId } from "@/lib/session";

/** Menú según lo que entrena cada uno (la lectura de datos se comparte con la página). */
export async function AppNav() {
  const [db, admin] = await Promise.all([getDb(), requireViewerId().then(viewIsAdmin)]);
  return <Nav focus={focusOf(db.profile)} admin={admin} />;
}
