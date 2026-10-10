// Iconos dibujados (trazo de 24×24, como los del menú): sustituyen a los emojis en toda la app.

const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const ICON_PATHS = {
  run: `${c(14, 4, 1.8)}M7 21l3-5 3 2 1 4M10 16l1.5-6 4 2.5H19M11.5 10L8 11l-2 3`,
  bike: `${c(5.5, 17, 3.5)}${c(18.5, 17, 3.5)}M5.5 17L9 9h6l3.5 8M9 9l3.5 8M13 5h3`,
  swim: `${c(17, 7, 1.8)}M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M7 14l4-5 4 3`,
  walk: `${c(13, 4, 1.8)}M10 21l2-6 2 2v4M12 15l1-6-3 2-1 3M13 9l2 3h2`,
  dumbbell: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  bolt: "M13 3L5 13h6l-1 8 8-10h-6l1-8z",
  trophy: "M8 4h8v5a4 4 0 01-8 0V4zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M10 17h4v4",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  ruler: "M3 17L17 3l4 4L7 21l-4-4zM7 13l2 2M10 10l2 2M13 7l2 2",
  mountain: "M3 20l6-10 4 6 3-4 5 8H3z",
  flame: "M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.5 2 1.5 3 2.5 3 0-3 1-6 4-8 0 3 4 5.5 4 10.5 0 4-3 7.5-7 7.5z",
  sunrise: "M12 3v4M5 10l1.5 1.5M19 10l-1.5 1.5M3 17h18M7 17a5 5 0 0110 0M8 21h8",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  globe: `${c(12, 12, 9)}M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18`,
  check: "M5 12.5l4.5 4.5L19 7",
  checkCircle: `${c(12, 12, 9)}M8 12.5l3 3 5-6`,
  medal: `${c(12, 15, 6)}M7 3l3 6M17 3l-3 6M10 3h4`,
  shoe: "M3 17h18v-2l-6-2-3-5H8l-1 3H4l-1 6zM3 20h18",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3z",
  pin: `M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z${c(12, 10, 2.5)}`,
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  search: `${c(11, 11, 7)}M21 21l-4.5-4.5`,
  timer: `${c(12, 13, 8)}M12 9v4l2.5 2M9 2h6`,
  pause: "M8 5v14M16 5v14",
  play: "M7 4l13 8-13 8V4z",
  stop: "M6 6h12v12H6z",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zm-7 10a7 7 0 0114 0M16 3.1a4 4 0 010 7.8M22 21a7 7 0 00-4-6.3",
  alert: "M12 3l10 18H2L12 3zM12 10v5M12 18h.01",
  droplet: "M12 3s-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z",
  share: "M12 3v12M8 7l4-4 4 4M5 12v8h14v-8",
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** Icono en línea; hereda el color del texto. */
export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
