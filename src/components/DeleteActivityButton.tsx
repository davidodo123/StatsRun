"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteActivity } from "@/app/actions";
import { lastVisited } from "./Nav";
import { translator, type Locale } from "@/lib/i18n";

/** Borra un entreno y vuelve a la página desde la que se llegó (Perfil, Inicio, Fuerza…). */
export function DeleteActivityButton({ id, locale = "es" }: { id: string; locale?: Locale }) {
  const t = translator(locale);
  const router = useRouter();
  const [pending, start] = useTransition();
  const remove = () => {
    if (!confirm(t("del.confirm"))) return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteActivity(fd);
      // las páginas de este entreno (ficha y edición) ya no existen
      const enc = encodeURIComponent(id);
      router.replace(lastVisited((u) => u.includes(id) || u.includes(enc), "/perfil?tab=actividades"));
    });
  };
  return (
    <button type="button" onClick={remove} disabled={pending} className="text-sm text-ink-2 underline hover:text-critical">
      {pending ? t("del.borrando") : t("del.borrar")}
    </button>
  );
}
