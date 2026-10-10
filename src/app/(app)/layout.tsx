import { Suspense } from "react";
import { Nav, NavView } from "@/components/Nav";
import { InstallBanner } from "@/components/Pwa";

// Páginas de la app (con sesión): menú lateral en escritorio y barra inferior en móvil.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<NavView />}>
        <Nav />
      </Suspense>
      {/* arriba, margen para la barra de estado del iPhone cuando la app está instalada (pantalla completa) */}
      <main className="min-w-0 flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-[max(1.5rem,env(safe-area-inset-top))] md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <InstallBanner />
          {children}
        </div>
      </main>
    </>
  );
}
