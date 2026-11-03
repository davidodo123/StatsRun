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
    id: "2026-11-03",
    items: [
      {
        icon: "trend",
        txt: {
          es: ["Tu carrera, al detalle", "Gráficos de ritmo y desnivel, ritmo ajustado a las cuestas y tiempo en cada zona."],
          en: ["Your run in detail", "Pace and elevation charts, grade-adjusted pace and time in each zone."],
          ca: ["La teva cursa, al detall", "Gràfics de ritme i desnivell, ritme ajustat a les pujades i temps a cada zona."],
          pt: ["A tua corrida ao pormenor", "Gráficos de ritmo e desnível, ritmo ajustado às subidas e tempo em cada zona."],
          fr: ["Ta course en détail", "Graphiques d'allure et de dénivelé, allure ajustée à la pente et temps dans chaque zone."],
        },
      },
      {
        icon: "trophy",
        txt: {
          es: ["Mejores esfuerzos y récords", "Tu mejor 400 m, 1 km, milla, 5 km… de cada carrera, con medalla si es récord."],
          en: ["Best efforts and PRs", "Your best 400 m, 1 km, mile, 5 km… in each run, with a medal when it's a PR."],
          ca: ["Millors esforços i rècords", "El teu millor 400 m, 1 km, milla, 5 km… de cada cursa, amb medalla si és rècord."],
          pt: ["Melhores esforços e recordes", "Os teus melhores 400 m, 1 km, milha, 5 km… de cada corrida, com medalha se for recorde."],
          fr: ["Meilleurs efforts et records", "Ton meilleur 400 m, 1 km, mile, 5 km… de chaque course, avec une médaille si c'est un record."],
        },
      },
      {
        icon: "calendar",
        txt: {
          es: ["Tu progreso, como en Strava", "Tu semana y las 12 anteriores, esfuerzo de la semana, predicción con su tendencia, mejores tiempos con medalla y objetivos."],
          en: ["Your progress, Strava-style", "Your week and the previous 12, weekly effort, prediction trend, best times with medals and goals."],
          ca: ["El teu progrés, com a Strava", "La teva setmana i les 12 anteriors, esforç de la setmana, predicció amb la tendència, millors temps amb medalla i objectius."],
          pt: ["O teu progresso, como no Strava", "A tua semana e as 12 anteriores, esforço da semana, previsão com tendência, melhores tempos com medalha e objetivos."],
          fr: ["Ta progression, façon Strava", "Ta semaine et les 12 précédentes, effort de la semaine, tendance de la prédiction, meilleurs temps avec médailles et objectifs."],
        },
      },
      {
        icon: "bolt",
        txt: {
          es: ["Entreno al momento", "En Plan: elige «Más fácil», «Constante», «Más difícil» o «Variedad» y ponlo hoy en tu plan."],
          en: ["Instant workout", "In Plan: pick «Easier», «Steady», «Harder» or «Variety» and put it in today's plan."],
          ca: ["Entrenament al moment", "A Pla: tria «Més fàcil», «Constant», «Més difícil» o «Varietat» i posa'l avui al teu pla."],
          pt: ["Treino no momento", "No Plano: escolhe «Mais fácil», «Constante», «Mais difícil» ou «Variedade» e põe-no hoje no plano."],
          fr: ["Entraînement du moment", "Dans Plan : choisis «Plus facile», «Régulier», «Plus dur» ou «Variété» et ajoute-le à ton plan du jour."],
        },
      },
      {
        icon: "dumbbell",
        txt: {
          es: ["El chat cambia tus rutinas", "Pídele «cambia la sentadilla por prensa en Pierna» y guarda los cambios: se cambia tu rutina, no una copia."],
          en: ["The chat edits your routines", "Ask «swap squats for leg press in Legs» and save: your routine changes, not a copy."],
          ca: ["El xat canvia les teves rutines", "Demana-li «canvia l'esquat per premsa a Cama» i desa els canvis: canvia la teva rutina, no una còpia."],
          pt: ["O chat muda as tuas rotinas", "Pede «troca o agachamento pela prensa em Pernas» e guarda: muda a tua rotina, não uma cópia."],
          fr: ["Le chat modifie tes séances", "Demande «remplace le squat par la presse dans Jambes» et enregistre : ta séance change, pas une copie."],
        },
      },
      {
        icon: "sparkle",
        txt: {
          es: ["IA más prudente con tu plan", "Ya no cambia el tipo de sesión ni mueve tu tirada larga."],
          en: ["A more careful AI", "It no longer changes session types or moves your long run."],
          ca: ["IA més prudent amb el teu pla", "Ja no canvia el tipus de sessió ni mou la teva tirada llarga."],
          pt: ["IA mais prudente com o teu plano", "Já não muda o tipo de sessão nem mexe no teu longo."],
          fr: ["Une IA plus prudente", "Elle ne change plus le type de séance et ne déplace plus ta sortie longue."],
        },
      },
    ],
  },
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
