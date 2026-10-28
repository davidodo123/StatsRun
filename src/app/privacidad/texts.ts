// Textos de la política de privacidad en cada idioma (es manda). Van aparte por largos: no caben bien en los diccionarios.
import type { Locale } from "@/lib/i18n";

export interface PrivacyItem {
  lead?: string; // en negrita al principio («Perfil»)
  text: string;
}
export interface PrivacySection {
  title: string;
  paras?: string[];
  items?: PrivacyItem[];
  after?: string[];
  toggle?: boolean; // aquí va el interruptor de las métricas
}
export interface PrivacyTexts {
  title: string;
  updated: string;
  sections: PrivacySection[];
  rights: { title: string; before: string; contactFallback: string; writing: string; after: string };
  back: string;
}

const es: PrivacyTexts = {
  title: "Política de privacidad",
  updated: "Última actualización: 28 de octubre de 2026",
  sections: [
    {
      title: "Qué es Zancavolt",
      paras: ["Una aplicación para planificar y analizar entrenamientos de carrera y fuerza, y para compartirlos con amigos. Esta política explica qué datos guarda, para qué y con quién se comparten."],
    },
    {
      title: "Qué datos guardamos",
      items: [
        { lead: "Cuenta", text: "nombre y email. Si entras con Google, también tu foto de perfil y un identificador de Google (no accedemos a tu Gmail, contactos ni ningún otro dato de Google). Si entras con correo y contraseña, la contraseña se guarda cifrada: nunca se puede leer." },
        { lead: "Perfil", text: "edad, sexo, peso, altura, frecuencia cardiaca, nivel, disponibilidad, lesiones y marcas que tú indiques." },
        { lead: "Entrenamientos", text: "los que registras o importas (distancia, tiempo, ritmo, desnivel, pulso, cadencia, recorrido GPS, esfuerzo, sensaciones y notas) y tu plan." },
        { lead: "Strava", text: "(solo si lo conectas) las actividades y el recorrido resumido, más los permisos de acceso que da Strava." },
        { lead: "Salud del iPhone", text: "(solo si creas el atajo) lo que tu atajo envía de cada día: pasos, calorías activas y, si lo añades, variabilidad de la frecuencia cardiaca (VFC), pulso en reposo y horas de sueño. No leemos nada más de Salud. Puedes desactivar la clave cuando quieras en Perfil → Salud." },
        { lead: "Health Connect", text: "(solo en la app de Android y si le das permiso) los pasos, las calorías activas, el pulso en reposo, la VFC y el sueño de los últimos 7 días, que la app lee al abrirla. Solo lectura: no escribimos nada en Health Connect ni leemos otros datos. Puedes quitar el permiso cuando quieras en Perfil → Salud → Permisos o en los ajustes de Health Connect." },
        { lead: "Fotos", text: "(solo si las subes) tu foto de perfil y las fotos de tus entrenos, reducidas en tu móvil antes de enviarlas." },
        { lead: "Amigos", text: "a quién has añadido, solicitudes pendientes y con quién has entrenado." },
      ],
      after: ["Usamos una cookie imprescindible para mantener la sesión iniciada y otra para recordar el idioma. Solo si aceptas las métricas de uso, PostHog guarda en tu navegador un identificador para contar qué pantallas se usan y qué errores salen. No usamos cookies de publicidad."],
      toggle: true,
    },
    {
      title: "Para qué los usamos",
      items: [
        { text: "Calcular tus estadísticas, tu forma y tus ritmos, y generar y ajustar tu plan de entrenamiento." },
        { text: "Mostrar tus entrenos y estadísticas a los amigos que tú aceptes." },
        { text: "Con los datos de salud (Salud del iPhone o Health Connect): enseñarte tus pasos, calorías y recuperación, y adaptar el plan si duermes poco o tu cuerpo no está recuperado. Solo para eso: nunca para publicidad, ni se venden ni se ceden a nadie más." },
        { text: "Con tu email: iniciar sesión y, si lo pides, mandarte el enlace para cambiar la contraseña. No te mandamos publicidad." },
      ],
      after: ["No vendemos tus datos ni los usamos para publicidad."],
    },
    {
      title: "Quién más los ve",
      items: [
        { lead: "Tus amigos", text: "(solo los que aceptas) tus estadísticas, tu plan y tus entrenos con recorrido. Nunca tus sensaciones ni tus notas. En la búsqueda de perfiles cualquiera con cuenta ve tu nombre, tu @usuario y tu foto." },
        { lead: "Entrenador con IA", text: "para ajustar tu plan y contestar en el chat se envían a OpenRouter (y al modelo de IA que use) tu edad, sexo, peso, nivel, lesiones, plan y entrenos recientes con tus sensaciones y, si tienes datos de salud, un resumen de tu recuperación (sueño, pulso en reposo y VFC). No se envían tu nombre ni tu email." },
        { lead: "Proveedores técnicos", text: "Vercel (alojamiento de la web), Upstash (base de datos), Google (inicio de sesión con Google y, con Gmail, el correo para cambiar la contraseña), Strava (si lo conectas), PostHog (solo si aceptas las métricas de uso: qué pantallas visitas y los errores, con tu id interno y en servidores de la UE; nunca tus entrenos ni tus datos de salud), OpenStreetMap (fondos de mapa: tu navegador le pide las imágenes de la zona del recorrido) y GitHub (guarda cada noche una copia de seguridad cifrada, que solo puede abrir el administrador de la app, para no perder datos si algo falla)." },
      ],
    },
    {
      title: "Cuánto tiempo y cómo borrarlos",
      paras: ["Guardamos tus datos mientras tengas cuenta. Puedes borrarla tú mismo en Perfil → Editar perfil → Borrar mi cuenta: se eliminan tu perfil, tu plan, tus entrenos y tus amistades, y se desconecta Strava. También puedes borrar entrenos sueltos y desconectar Strava cuando quieras. Lo borrado desaparece también de las copias de seguridad en un máximo de 30 días (las copias mensuales, en un máximo de 12 meses)."],
    },
  ],
  rights: {
    title: "Tus derechos",
    before: "Puedes acceder, corregir, borrar u oponerte al uso de tus datos y pedir una copia",
    contactFallback: " contactando con el administrador de la app",
    writing: " escribiendo a ",
    after: ". Si crees que no los tratamos bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
  },
  back: "← Volver a la app",
};

const en: PrivacyTexts = {
  title: "Privacy policy",
  updated: "Last updated: 28 October 2026",
  sections: [
    {
      title: "What Zancavolt is",
      paras: ["An app to plan and analyse running and strength training, and to share it with friends. This policy explains what data it stores, what for, and who it is shared with."],
    },
    {
      title: "What data we store",
      items: [
        { lead: "Account", text: "name and email. If you sign in with Google, also your profile photo and a Google identifier (we don't access your Gmail, contacts or any other Google data). If you sign in with email and password, the password is stored encrypted: it can never be read." },
        { lead: "Profile", text: "age, sex, weight, height, heart rate, level, availability, injuries and race times that you enter." },
        { lead: "Workouts", text: "the ones you log or import (distance, time, pace, elevation, heart rate, cadence, GPS route, effort, how you felt and notes) and your plan." },
        { lead: "Strava", text: "(only if you connect it) your activities and summary route, plus the access permissions Strava grants." },
        { lead: "iPhone Health", text: "(only if you set up the shortcut) what your shortcut sends for each day: steps, active calories and, if you add them, heart rate variability (HRV), resting heart rate and hours of sleep. We read nothing else from Health. You can turn off the key at any time in Profile → Health." },
        { lead: "Health Connect", text: "(only in the Android app and if you grant permission) steps, active calories, resting heart rate, HRV and sleep from the last 7 days, which the app reads when you open it. Read-only: we don't write anything to Health Connect or read any other data. You can remove the permission at any time in Profile → Health → Permissions or in Health Connect's settings." },
        { lead: "Photos", text: "(only if you upload them) your profile photo and your workout photos, shrunk on your phone before sending." },
        { lead: "Friends", text: "who you've added, pending requests and who you trained with." },
      ],
      after: ["We use an essential cookie to keep you signed in and another to remember your language. Only if you accept usage metrics does PostHog store an identifier in your browser to count which screens are used and which errors occur. We don't use advertising cookies."],
      toggle: true,
    },
    {
      title: "What we use it for",
      items: [
        { text: "To calculate your stats, fitness and paces, and to create and adjust your training plan." },
        { text: "To show your workouts and stats to the friends you accept." },
        { text: "With health data (iPhone Health or Health Connect): to show your steps, calories and recovery, and to adapt the plan if you sleep little or your body hasn't recovered. Only for that: never for advertising, and it's never sold or passed on to anyone." },
        { text: "With your email: to sign you in and, if you ask for it, to send you the link to change your password. We don't send you advertising." },
      ],
      after: ["We don't sell your data or use it for advertising."],
    },
    {
      title: "Who else sees it",
      items: [
        { lead: "Your friends", text: "(only the ones you accept) your stats, your plan and your workouts with routes. Never how you felt or your notes. In the profile search, anyone with an account sees your name, your @username and your photo." },
        { lead: "AI coach", text: "to adjust your plan and answer in the chat, your age, sex, weight, level, injuries, plan and recent workouts with how you felt and, if you have health data, a summary of your recovery (sleep, resting heart rate and HRV) are sent to OpenRouter (and the AI model it uses). Your name and email are not sent." },
        { lead: "Technical providers", text: "Vercel (website hosting), Upstash (database), Google (sign-in with Google and, through Gmail, the email to change your password), Strava (if you connect it), PostHog (only if you accept usage metrics: which screens you visit and errors, with your internal id and on EU servers; never your workouts or health data), OpenStreetMap (map backgrounds: your browser requests the images for the area of the route) and GitHub (stores an encrypted backup every night, which only the app's administrator can open, so data isn't lost if something fails)." },
      ],
    },
    {
      title: "How long we keep it and how to delete it",
      paras: ["We keep your data while you have an account. You can delete it yourself in Profile → Edit profile → Delete my account: your profile, plan, workouts and friendships are removed, and Strava is disconnected. You can also delete individual workouts and disconnect Strava at any time. Deleted data also disappears from the backups within 30 days at most (monthly backups, within 12 months at most)."],
    },
  ],
  rights: {
    title: "Your rights",
    before: "You can access, correct, delete or object to the use of your data and ask for a copy",
    contactFallback: " by contacting the app's administrator",
    writing: " by writing to ",
    after: ". If you believe we're not handling it properly, you can complain to the Spanish Data Protection Agency (aepd.es).",
  },
  back: "← Back to the app",
};

const ca: PrivacyTexts = {
  title: "Política de privadesa",
  updated: "Darrera actualització: 28 d'octubre de 2026",
  sections: [
    {
      title: "Què és Zancavolt",
      paras: ["Una aplicació per planificar i analitzar entrenaments de cursa i força, i per compartir-los amb amics. Aquesta política explica quines dades guarda, per a què i amb qui es comparteixen."],
    },
    {
      title: "Quines dades guardem",
      items: [
        { lead: "Compte", text: "nom i correu. Si entres amb Google, també la teva foto de perfil i un identificador de Google (no accedim al teu Gmail, contactes ni cap altra dada de Google). Si entres amb correu i contrasenya, la contrasenya es guarda xifrada: no es pot llegir mai." },
        { lead: "Perfil", text: "edat, sexe, pes, alçada, freqüència cardíaca, nivell, disponibilitat, lesions i marques que tu indiquis." },
        { lead: "Entrenaments", text: "els que registres o importes (distància, temps, ritme, desnivell, pols, cadència, recorregut GPS, esforç, sensacions i notes) i el teu pla." },
        { lead: "Strava", text: "(només si el connectes) les activitats i el recorregut resumit, més els permisos d'accés que dona Strava." },
        { lead: "Salut de l'iPhone", text: "(només si crees la drecera) el que la drecera envia de cada dia: passos, calories actives i, si ho afegeixes, variabilitat de la freqüència cardíaca (VFC), pols en repòs i hores de son. No llegim res més de Salut. Pots desactivar la clau quan vulguis a Perfil → Salut." },
        { lead: "Health Connect", text: "(només a l'app d'Android i si hi dones permís) els passos, les calories actives, el pols en repòs, la VFC i el son dels últims 7 dies, que l'app llegeix en obrir-la. Només lectura: no escrivim res a Health Connect ni llegim altres dades. Pots treure el permís quan vulguis a Perfil → Salut → Permisos o a la configuració de Health Connect." },
        { lead: "Fotos", text: "(només si les puges) la teva foto de perfil i les fotos dels entrenaments, reduïdes al mòbil abans d'enviar-les." },
        { lead: "Amics", text: "a qui has afegit, sol·licituds pendents i amb qui has entrenat." },
      ],
      after: ["Fem servir una galeta imprescindible per mantenir la sessió iniciada i una altra per recordar l'idioma. Només si acceptes les mètriques d'ús, PostHog guarda al navegador un identificador per comptar quines pantalles es fan servir i quins errors surten. No fem servir galetes de publicitat."],
      toggle: true,
    },
    {
      title: "Per a què les fem servir",
      items: [
        { text: "Calcular les teves estadístiques, la forma i els ritmes, i generar i ajustar el teu pla d'entrenament." },
        { text: "Mostrar els teus entrenaments i estadístiques als amics que acceptis." },
        { text: "Amb les dades de salut (Salut de l'iPhone o Health Connect): mostrar-te els passos, les calories i la recuperació, i adaptar el pla si dorms poc o el cos no està recuperat. Només per a això: mai per a publicitat, i no es venen ni es cedeixen a ningú." },
        { text: "Amb el teu correu: iniciar la sessió i, si ho demanes, enviar-te l'enllaç per canviar la contrasenya. No t'enviem publicitat." },
      ],
      after: ["No venem les teves dades ni les fem servir per a publicitat."],
    },
    {
      title: "Qui més les veu",
      items: [
        { lead: "Els teus amics", text: "(només els que acceptes) les teves estadístiques, el pla i els entrenaments amb recorregut. Mai les sensacions ni les notes. A la cerca de perfils, qualsevol amb compte veu el teu nom, el teu @usuari i la teva foto." },
        { lead: "Entrenador amb IA", text: "per ajustar el pla i respondre al xat s'envien a OpenRouter (i al model d'IA que faci servir) la teva edat, sexe, pes, nivell, lesions, pla i entrenaments recents amb les sensacions i, si tens dades de salut, un resum de la recuperació (son, pols en repòs i VFC). No s'envien ni el nom ni el correu." },
        { lead: "Proveïdors tècnics", text: "Vercel (allotjament del web), Upstash (base de dades), Google (inici de sessió amb Google i, amb Gmail, el correu per canviar la contrasenya), Strava (si el connectes), PostHog (només si acceptes les mètriques d'ús: quines pantalles visites i els errors, amb el teu id intern i en servidors de la UE; mai els entrenaments ni les dades de salut), OpenStreetMap (fons de mapa: el navegador li demana les imatges de la zona del recorregut) i GitHub (guarda cada nit una còpia de seguretat xifrada, que només pot obrir l'administrador de l'app, per no perdre dades si alguna cosa falla)." },
      ],
    },
    {
      title: "Quant de temps i com esborrar-les",
      paras: ["Guardem les teves dades mentre tinguis compte. El pots esborrar tu mateix a Perfil → Editar perfil → Esborrar el meu compte: s'eliminen el perfil, el pla, els entrenaments i les amistats, i es desconnecta Strava. També pots esborrar entrenaments solts i desconnectar Strava quan vulguis. El que s'esborra desapareix també de les còpies de seguretat en un màxim de 30 dies (les còpies mensuals, en un màxim de 12 mesos)."],
    },
  ],
  rights: {
    title: "Els teus drets",
    before: "Pots accedir, corregir, esborrar o oposar-te a l'ús de les teves dades i demanar-ne una còpia",
    contactFallback: " contactant amb l'administrador de l'app",
    writing: " escrivint a ",
    after: ". Si creus que no les tractem bé, pots reclamar davant l'Agència Espanyola de Protecció de Dades (aepd.es).",
  },
  back: "← Tornar a l'app",
};

const pt: PrivacyTexts = {
  title: "Política de privacidade",
  updated: "Última atualização: 28 de outubro de 2026",
  sections: [
    {
      title: "O que é o Zancavolt",
      paras: ["Uma aplicação para planear e analisar treinos de corrida e força, e para os partilhar com amigos. Esta política explica que dados guarda, para quê e com quem são partilhados."],
    },
    {
      title: "Que dados guardamos",
      items: [
        { lead: "Conta", text: "nome e email. Se entrares com o Google, também a tua foto de perfil e um identificador do Google (não acedemos ao teu Gmail, contactos nem a nenhum outro dado do Google). Se entrares com email e palavra-passe, a palavra-passe é guardada cifrada: nunca pode ser lida." },
        { lead: "Perfil", text: "idade, sexo, peso, altura, frequência cardíaca, nível, disponibilidade, lesões e marcas que indicares." },
        { lead: "Treinos", text: "os que registas ou importas (distância, tempo, ritmo, desnível, pulso, cadência, percurso GPS, esforço, sensações e notas) e o teu plano." },
        { lead: "Strava", text: "(só se o ligares) as atividades e o percurso resumido, mais as permissões de acesso que o Strava dá." },
        { lead: "Saúde do iPhone", text: "(só se criares o atalho) o que o teu atalho envia de cada dia: passos, calorias ativas e, se os adicionares, variabilidade da frequência cardíaca (VFC), pulso em repouso e horas de sono. Não lemos mais nada da Saúde. Podes desativar a chave quando quiseres em Perfil → Saúde." },
        { lead: "Health Connect", text: "(só na app de Android e se deres permissão) os passos, as calorias ativas, o pulso em repouso, a VFC e o sono dos últimos 7 dias, que a app lê ao abri-la. Só leitura: não escrevemos nada no Health Connect nem lemos outros dados. Podes retirar a permissão quando quiseres em Perfil → Saúde → Permissões ou nas definições do Health Connect." },
        { lead: "Fotos", text: "(só se as carregares) a tua foto de perfil e as fotos dos teus treinos, reduzidas no telemóvel antes de as enviar." },
        { lead: "Amigos", text: "quem adicionaste, pedidos pendentes e com quem treinaste." },
      ],
      after: ["Usamos um cookie imprescindível para manter a sessão iniciada e outro para lembrar o idioma. Só se aceitares as métricas de utilização é que o PostHog guarda no teu navegador um identificador para contar que ecrãs são usados e que erros surgem. Não usamos cookies de publicidade."],
      toggle: true,
    },
    {
      title: "Para que os usamos",
      items: [
        { text: "Calcular as tuas estatísticas, a tua forma e os teus ritmos, e gerar e ajustar o teu plano de treino." },
        { text: "Mostrar os teus treinos e estatísticas aos amigos que aceitares." },
        { text: "Com os dados de saúde (Saúde do iPhone ou Health Connect): mostrar-te os passos, as calorias e a recuperação, e adaptar o plano se dormires pouco ou o corpo não estiver recuperado. Só para isso: nunca para publicidade, e nunca são vendidos nem cedidos a ninguém." },
        { text: "Com o teu email: iniciar sessão e, se o pedires, enviar-te o link para mudar a palavra-passe. Não te enviamos publicidade." },
      ],
      after: ["Não vendemos os teus dados nem os usamos para publicidade."],
    },
    {
      title: "Quem mais os vê",
      items: [
        { lead: "Os teus amigos", text: "(só os que aceitas) as tuas estatísticas, o teu plano e os teus treinos com percurso. Nunca as tuas sensações nem as tuas notas. Na pesquisa de perfis, qualquer pessoa com conta vê o teu nome, o teu @utilizador e a tua foto." },
        { lead: "Treinador com IA", text: "para ajustar o plano e responder no chat são enviados ao OpenRouter (e ao modelo de IA que usar) a tua idade, sexo, peso, nível, lesões, plano e treinos recentes com as tuas sensações e, se tiveres dados de saúde, um resumo da tua recuperação (sono, pulso em repouso e VFC). Não são enviados o teu nome nem o teu email." },
        { lead: "Fornecedores técnicos", text: "Vercel (alojamento do site), Upstash (base de dados), Google (início de sessão com o Google e, com o Gmail, o email para mudar a palavra-passe), Strava (se o ligares), PostHog (só se aceitares as métricas de utilização: que ecrãs visitas e os erros, com o teu id interno e em servidores da UE; nunca os teus treinos nem os teus dados de saúde), OpenStreetMap (fundos de mapa: o teu navegador pede-lhe as imagens da zona do percurso) e GitHub (guarda todas as noites uma cópia de segurança cifrada, que só o administrador da app pode abrir, para não perder dados se algo falhar)." },
      ],
    },
    {
      title: "Durante quanto tempo e como apagá-los",
      paras: ["Guardamos os teus dados enquanto tiveres conta. Podes apagá-la tu mesmo em Perfil → Editar perfil → Apagar a minha conta: são eliminados o teu perfil, o teu plano, os teus treinos e as tuas amizades, e o Strava é desligado. Também podes apagar treinos soltos e desligar o Strava quando quiseres. O que for apagado desaparece também das cópias de segurança num máximo de 30 dias (as cópias mensais, num máximo de 12 meses)."],
    },
  ],
  rights: {
    title: "Os teus direitos",
    before: "Podes aceder, corrigir, apagar ou opor-te à utilização dos teus dados e pedir uma cópia",
    contactFallback: " contactando o administrador da app",
    writing: " escrevendo para ",
    after: ". Se achares que não os tratamos bem, podes apresentar reclamação à Agência Espanhola de Proteção de Dados (aepd.es).",
  },
  back: "← Voltar à app",
};

const fr: PrivacyTexts = {
  title: "Politique de confidentialité",
  updated: "Dernière mise à jour : 28 octobre 2026",
  sections: [
    {
      title: "Qu'est-ce que Zancavolt",
      paras: ["Une application pour planifier et analyser des entraînements de course et de musculation, et les partager avec des amis. Cette politique explique quelles données elle conserve, pourquoi et avec qui elles sont partagées."],
    },
    {
      title: "Quelles données nous conservons",
      items: [
        { lead: "Compte", text: "nom et e-mail. Si tu te connectes avec Google, aussi ta photo de profil et un identifiant Google (nous n'accédons pas à ton Gmail, à tes contacts ni à aucune autre donnée Google). Si tu te connectes avec e-mail et mot de passe, le mot de passe est stocké chiffré : il ne peut jamais être lu." },
        { lead: "Profil", text: "âge, sexe, poids, taille, fréquence cardiaque, niveau, disponibilités, blessures et chronos que tu indiques." },
        { lead: "Séances", text: "celles que tu enregistres ou importes (distance, temps, allure, dénivelé, pouls, cadence, parcours GPS, effort, ressenti et notes) et ton plan." },
        { lead: "Strava", text: "(seulement si tu le connectes) les activités et le parcours résumé, ainsi que les autorisations d'accès accordées par Strava." },
        { lead: "Santé de l'iPhone", text: "(seulement si tu crées le raccourci) ce que ton raccourci envoie pour chaque jour : pas, calories actives et, si tu les ajoutes, variabilité de la fréquence cardiaque (VFC), pouls au repos et heures de sommeil. Nous ne lisons rien d'autre dans Santé. Tu peux désactiver la clé quand tu veux dans Profil → Santé." },
        { lead: "Health Connect", text: "(seulement dans l'appli Android et si tu donnes l'autorisation) les pas, les calories actives, le pouls au repos, la VFC et le sommeil des 7 derniers jours, que l'appli lit à l'ouverture. Lecture seule : nous n'écrivons rien dans Health Connect et ne lisons aucune autre donnée. Tu peux retirer l'autorisation quand tu veux dans Profil → Santé → Autorisations ou dans les réglages de Health Connect." },
        { lead: "Photos", text: "(seulement si tu les envoies) ta photo de profil et les photos de tes séances, réduites sur ton téléphone avant l'envoi." },
        { lead: "Amis", text: "qui tu as ajouté, les demandes en attente et avec qui tu t'es entraîné." },
      ],
      after: ["Nous utilisons un cookie indispensable pour garder ta session ouverte et un autre pour retenir la langue. Uniquement si tu acceptes les statistiques d'utilisation, PostHog enregistre dans ton navigateur un identifiant pour compter les écrans utilisés et les erreurs. Nous n'utilisons pas de cookies publicitaires."],
      toggle: true,
    },
    {
      title: "À quoi elles servent",
      items: [
        { text: "Calculer tes statistiques, ta forme et tes allures, et créer et ajuster ton plan d'entraînement." },
        { text: "Montrer tes séances et statistiques aux amis que tu acceptes." },
        { text: "Avec les données de santé (Santé de l'iPhone ou Health Connect) : te montrer tes pas, tes calories et ta récupération, et adapter le plan si tu dors peu ou si ton corps n'a pas récupéré. Uniquement pour cela : jamais pour la publicité, et elles ne sont jamais vendues ni cédées à quiconque." },
        { text: "Avec ton e-mail : te connecter et, si tu le demandes, t'envoyer le lien pour changer ton mot de passe. Nous ne t'envoyons pas de publicité." },
      ],
      after: ["Nous ne vendons pas tes données et ne les utilisons pas pour la publicité."],
    },
    {
      title: "Qui d'autre les voit",
      items: [
        { lead: "Tes amis", text: "(seulement ceux que tu acceptes) tes statistiques, ton plan et tes séances avec parcours. Jamais ton ressenti ni tes notes. Dans la recherche de profils, toute personne ayant un compte voit ton nom, ton @utilisateur et ta photo." },
        { lead: "Coach IA", text: "pour ajuster ton plan et répondre dans le chat, ton âge, ton sexe, ton poids, ton niveau, tes blessures, ton plan et tes séances récentes avec ton ressenti et, si tu as des données de santé, un résumé de ta récupération (sommeil, pouls au repos et VFC) sont envoyés à OpenRouter (et au modèle d'IA utilisé). Ni ton nom ni ton e-mail ne sont envoyés." },
        { lead: "Prestataires techniques", text: "Vercel (hébergement du site), Upstash (base de données), Google (connexion avec Google et, via Gmail, l'e-mail pour changer le mot de passe), Strava (si tu le connectes), PostHog (seulement si tu acceptes les statistiques d'utilisation : écrans visités et erreurs, avec ton id interne et sur des serveurs de l'UE ; jamais tes séances ni tes données de santé), OpenStreetMap (fonds de carte : ton navigateur lui demande les images de la zone du parcours) et GitHub (conserve chaque nuit une sauvegarde chiffrée, que seul l'administrateur de l'appli peut ouvrir, pour ne pas perdre de données en cas de problème)." },
      ],
    },
    {
      title: "Combien de temps et comment les supprimer",
      paras: ["Nous conservons tes données tant que tu as un compte. Tu peux le supprimer toi-même dans Profil → Modifier le profil → Supprimer mon compte : ton profil, ton plan, tes séances et tes amitiés sont effacés, et Strava est déconnecté. Tu peux aussi supprimer des séances isolées et déconnecter Strava quand tu veux. Ce qui est supprimé disparaît aussi des sauvegardes sous 30 jours maximum (les sauvegardes mensuelles, sous 12 mois maximum)."],
    },
  ],
  rights: {
    title: "Tes droits",
    before: "Tu peux accéder à tes données, les corriger, les supprimer ou t'opposer à leur utilisation, et en demander une copie",
    contactFallback: " en contactant l'administrateur de l'appli",
    writing: " en écrivant à ",
    after: ". Si tu estimes que nous ne les traitons pas correctement, tu peux porter réclamation auprès de l'Agence espagnole de protection des données (aepd.es).",
  },
  back: "← Retour à l'appli",
};

export const PRIVACY: Record<Locale, PrivacyTexts> = { es, en, ca, pt, fr };
