import { Suspense } from "react";
import { Nav, NavView } from "@/components/Nav";

// Páginas de la app (con sesión): menú lateral en escritorio y barra inferior en móvil.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<NavView />}>
        <Nav />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
