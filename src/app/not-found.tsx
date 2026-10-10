import Link from "next/link";

// Direcciones que no existen en toda la app
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-24 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <h1 className="mt-3 text-xl font-bold">Esta página no existe</h1>
      <p className="mt-2 text-sm text-ink-2">Revisa el enlace o vuelve al inicio.</p>
      <Link href="/" className="btn mt-6">
        Ir al inicio
      </Link>
    </main>
  );
}
