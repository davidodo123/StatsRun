import { Suspense } from "react";
import { NavView } from "@/components/Nav";
import { AppNav } from "@/components/AppNav";
import { InstallBanner } from "@/components/Pwa";
import { AppUpdates } from "@/components/AppUpdates";
import { KeyboardFix } from "@/components/KeyboardFix";
import { NavHistory } from "@/components/BackLink";
import { LiveWorkoutBar } from "@/components/LiveWorkoutBar";
import { PushPrompt } from "@/components/PushPrompt";
import { pushPublicKey } from "@/lib/push";
import { Analytics } from "@/components/Analytics";
import { requireViewerId } from "@/lib/session";
import { viewLocale } from "@/lib/i18n/server";

async function LiveWorkoutMount() {
  return <LiveWorkoutBar locale={await viewLocale()} />;
}

async function AnalyticsMount() {
  const [uid, locale] = await Promise.all([requireViewerId(), viewLocale()]);
  return <Analytics uid={uid} locale={locale} />;
}

async function PushPromptMount() {
  return <PushPrompt publicKey={pushPublicKey()} locale={await viewLocale()} />;
}

async function InstallBannerMount() {
  return <InstallBanner locale={await viewLocale()} />;
}

// Páginas de la app (con sesión): menú lateral en escritorio y barra inferior en móvil.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* versión con la que se ha abierto la app (el commit de Vercel; en local, «dev») */}
      <AppUpdates version={process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"} />
      <KeyboardFix />
      <Suspense fallback={null}>
        <NavHistory />
        <LiveWorkoutMount />
        <AnalyticsMount />
      </Suspense>
      <Suspense fallback={null}>
        <PushPromptMount />
      </Suspense>
      <Suspense fallback={<NavView />}>
        <AppNav />
      </Suspense>
      {/* arriba, margen para la barra de estado del iPhone cuando la app está instalada (pantalla completa) */}
      <main className="min-w-0 flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-[max(1.5rem,env(safe-area-inset-top))] md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={null}>
            <InstallBannerMount />
          </Suspense>
          {children}
        </div>
      </main>
    </>
  );
}
