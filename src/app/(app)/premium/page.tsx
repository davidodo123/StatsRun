import type { Metadata } from "next";
import { Suspense } from "react";
import { PremiumPlans } from "@/components/PremiumPlans";
import { Icon, type IconName } from "@/components/icons";
import { Card } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import type { Key } from "@/lib/i18n";

export const metadata: Metadata = { title: "Premium" };

// lo que trae Premium, sin la IA (se decide más adelante: diario/Suscripción.md)
const FEATURES: { icon: IconName; title: Key; text: Key }[] = [
  { icon: "flag", title: "prem.f.temporada", text: "prem.f.temporadaTxt" },
  { icon: "trend", title: "prem.f.stats", text: "prem.f.statsTxt" },
  { icon: "dumbbell", title: "prem.f.rutinas", text: "prem.f.rutinasTxt" },
  { icon: "share", title: "prem.f.compartir", text: "prem.f.compartirTxt" },
  { icon: "folder", title: "prem.f.strava", text: "prem.f.stravaTxt" },
  { icon: "mountain", title: "prem.f.recorrido", text: "prem.f.recorridoTxt" },
];

// true: incluido; texto: lo que trae cada uno
const COMPARE: { label: Key; free: boolean | Key; premium: true | Key }[] = [
  { label: "prem.c.plan", free: true, premium: true },
  { label: "prem.c.registrar", free: true, premium: true },
  { label: "prem.c.amigos", free: true, premium: true },
  { label: "prem.c.fuerza", free: true, premium: true },
  { label: "prem.c.rutinas", free: "prem.c.rutinasGratis", premium: "prem.c.rutinasPremium" },
  { label: "prem.c.temporada", free: false, premium: true },
  { label: "prem.c.stats", free: false, premium: true },
  { label: "prem.c.compartir", free: false, premium: true },
  { label: "prem.c.strava", free: false, premium: true },
  { label: "prem.c.recorrido", free: false, premium: true },
];

export default function PremiumPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { t, locale } = await getT();
  const cell = (v: boolean | Key) =>
    typeof v === "string" ? (
      <span className="text-xs font-semibold">{t(v)}</span>
    ) : v ? (
      <>
        <Icon name="check" className="mx-auto h-4 w-4 text-accent" />
        <span className="sr-only">{t("prem.si")}</span>
      </>
    ) : (
      <>
        <span className="text-muted" aria-hidden>
          –
        </span>
        <span className="sr-only">{t("prem.no")}</span>
      </>
    );
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <p className="text-xs font-bold tracking-widest text-accent uppercase">{t("prem.etiqueta")}</p>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-[0.03em] uppercase">{t("prem.titulo")}</h1>
        <p className="mt-2 text-sm text-ink-2">{t("prem.sub")}</p>
      </header>

      <PremiumPlans locale={locale} />

      <section>
        <h2 className="mb-3 text-xs font-bold tracking-widest text-ink-2 uppercase">{t("prem.incluye")}</h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <span>
                <strong className="block">{t(f.title)}</strong>
                <span className="text-sm text-ink-2">{t(f.text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Card title={t("prem.comparar")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-2">
              <th className="pb-2 text-left font-normal" />
              <th className="w-20 pb-2 font-semibold">{t("prem.gratis")}</th>
              <th className="w-20 pb-2 font-semibold text-accent">{t("nav.premium")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {COMPARE.map((r) => (
              <tr key={r.label}>
                <td className="py-2.5 pr-2">{t(r.label)}</td>
                <td className="text-center">{cell(r.free)}</td>
                <td className="text-center">{cell(r.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-center text-xs text-muted">{t("prem.aviso")}</p>
    </div>
  );
}
