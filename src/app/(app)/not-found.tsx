import Link from "next/link";

// Lo que no existe (o ya se borró): una sesión, una rutina, un ejercicio…
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <h1 className="mt-3 text-xl font-bold">No lo encontramos</h1>
      <p className="mt-2 text-sm text-ink-2">Puede que se haya borrado o que el enlace no sea correcto.</p>
      <Link href="/" className="btn mt-6">
        Ir al inicio
      </Link>
    </div>
  );
}
