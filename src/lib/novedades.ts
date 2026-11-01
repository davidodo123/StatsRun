import type { IconName } from "@/components/icons";
import type { Locale } from "@/lib/i18n";

type Txt = Record<Locale, [titulo: string, texto: string]>;

export interface Novedad {
  /** Fecha de la versión (AAAA-MM-DD); la más nueva, la primera */
  id: string;
  items: { icon: IconName; txt: Txt }[];
}

/**
 * Lo que trae cada versión: sale en la pantalla «Novedades» cuando hay una versión nueva.
 * Al subir algo que se note, añade una entrada arriba (con fecha nueva) en los cinco idiomas.
 * Si se sube sin entrada nueva, la pantalla dice «Mejoras y arreglos».
 */
export const NOVEDADES: Novedad[] = [
  {
    id: "2026-11-01",
    items: [
      {
        icon: "sparkle",
        txt: {
          es: ["El Entrenador IA vuelve", "Ajusta tu plan, crea rutinas y responde en el chat otra vez, más rápido."],
          en: ["The AI Coach is back", "It adjusts your plan, builds routines and answers in the chat again, faster."],
          ca: ["L'Entrenador IA torna", "Ajusta el teu pla, crea rutines i respon al xat una altra vegada, més ràpid."],
          pt: ["O Treinador IA voltou", "Ajusta o teu plano, cria rotinas e responde no chat outra vez, mais rápido."],
          fr: ["Le Coach IA est de retour", "Il ajuste ton plan, crée des routines et répond dans le chat, plus vite."],
        },
      },
      {
        icon: "checkCircle",
        txt: {
          es: ["Revisión del plan más clara", "El diagnóstico y las sesiones ajustadas, de un vistazo."],
          en: ["Clearer plan review", "The diagnosis and adjusted sessions at a glance."],
          ca: ["Revisió del pla més clara", "El diagnòstic i les sessions ajustades, d'un cop d'ull."],
          pt: ["Revisão do plano mais clara", "O diagnóstico e as sessões ajustadas, num relance."],
          fr: ["Revue du plan plus claire", "Le diagnostic et les séances ajustées en un coup d'œil."],
        },
      },
      {
        icon: "calendar",
        txt: {
          es: ["Planes más realistas", "Si empiezas de cero o vas justo de tiempo, el plan sube poco a poco y sin series."],
          en: ["More realistic plans", "If you're starting from scratch or short on time, the plan builds up gently, without intervals."],
          ca: ["Plans més realistes", "Si comences de zero o vas just de temps, el pla puja a poc a poc i sense sèries."],
          pt: ["Planos mais realistas", "Se começas do zero ou tens pouco tempo, o plano sobe aos poucos e sem séries."],
          fr: ["Des plans plus réalistes", "Si tu pars de zéro ou manques de temps, le plan progresse doucement, sans fractionné."],
        },
      },
      {
        icon: "sunrise",
        txt: {
          es: ["Estiramientos en tu día de descanso", "Unos 10 minutos para recuperar mejor."],
          en: ["Stretches on your rest day", "About 10 minutes to recover better."],
          ca: ["Estiraments el dia de descans", "Uns 10 minuts per recuperar-te millor."],
          pt: ["Alongamentos no dia de descanso", "Cerca de 10 minutos para recuperar melhor."],
          fr: ["Étirements le jour de repos", "Une dizaine de minutes pour mieux récupérer."],
        },
      },
    ],
  },
];

/** Las novedades más nuevas que la versión que tiene abierta el usuario. */
export const novedadesDesde = (lista: Novedad[], desde: string) => lista.filter((n) => n.id > desde);
