/** Logo de Run-In-Out: montañas de dos picos en blanco sobre naranja, el mismo dibujo que el icono de la app (public/icon.svg). */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#eb6834" />
      <path d="M14 46l12-20 8 12 6-8 10 16z" fill="#fff" />
    </svg>
  );
}
