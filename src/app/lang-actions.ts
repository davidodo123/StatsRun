"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { updateDb } from "@/lib/db";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";

/** Cambia el idioma: cookie de este dispositivo (un año) y en la cuenta (para los demás dispositivos). */
export async function setLanguage(fd: FormData): Promise<void> {
  const lang = fd.get("lang");
  if (!isLocale(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 86400, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  await updateDb((db) => {
    db.lang = lang;
  });
  refresh();
}
