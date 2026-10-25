import { Nav } from "./Nav";
import { getDb } from "@/lib/db";
import { focusOf } from "@/lib/types";
import { viewIsAdmin } from "@/lib/admin";
import { requireViewerId } from "@/lib/session";
import { viewLocale } from "@/lib/i18n/server";

/** Menú según lo que entrena cada uno (la lectura de datos se comparte con la página). */
export async function AppNav() {
  const [db, admin, locale] = await Promise.all([getDb(), requireViewerId().then(viewIsAdmin), viewLocale()]);
  return <Nav focus={focusOf(db.profile)} admin={admin} locale={locale} />;
}
