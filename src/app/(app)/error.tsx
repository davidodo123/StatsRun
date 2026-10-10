"use client";

// Si algo falla al cargar una página (sin conexión, la base de datos no responde…), se puede reintentar sin perder la app
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold">Algo ha fallado</h1>
      <p className="mt-2 text-sm text-ink-2">No hemos podido cargar esta página. Comprueba la conexión y vuelve a intentarlo.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Código: {error.digest}</p>}
      <button type="button" className="btn mt-6" onClick={() => retry()}>
        Reintentar
      </button>
    </div>
  );
}
