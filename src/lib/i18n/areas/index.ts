// Todas las zonas con sus textos. Al añadir una zona nueva, va aquí.
import { sesion } from "./sesion";
import { plan } from "./plan";
import { planExtras } from "./planExtras";
import { etiquetas } from "./etiquetas";
import { entreno } from "./entreno";

export const AREAS = [sesion, plan, planExtras, etiquetas, entreno] as const;
