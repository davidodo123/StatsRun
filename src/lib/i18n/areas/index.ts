// Todas las zonas con sus textos. Al añadir una zona nueva, va aquí.
import { sesion } from "./sesion";
import { plan } from "./plan";
import { planExtras } from "./planExtras";
import { etiquetas } from "./etiquetas";
import { entreno } from "./entreno";
import { calendario } from "./calendario";
import { fuerzaMas } from "./fuerzaMas";
import { acceso } from "./acceso";
import { actividad } from "./actividad";
import { estadisticas } from "./estadisticas";
import { amigos } from "./amigos";
import { importar } from "./importar";
import { carreras } from "./carreras";
import { perfilResumen } from "./perfilResumen";
import { estados } from "./estados";

export const AREAS = [sesion, plan, planExtras, etiquetas, entreno, calendario, fuerzaMas, acceso, actividad, estadisticas, amigos, importar, carreras, perfilResumen, estados] as const;
