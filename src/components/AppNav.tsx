import { Nav } from "./Nav";
import { getDb } from "@/lib/db";
import { focusOf } from "@/lib/types";

/** Menú según lo que entrena cada uno (la lectura de datos se comparte con la página). */
export async function AppNav() {
  const db = await getDb();
  return <Nav focus={focusOf(db.profile)} />;
}
