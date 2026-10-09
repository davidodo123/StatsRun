import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = { title: "Política de privacidad" };

const UPDATED = "9 de octubre de 2026";

/**
 * Correo de contacto para ejercer derechos (variable CONTACT_EMAIL en Vercel, no en el código).
 * Se lee en cada petición: si se leyera al compilar, cambiar la variable no se notaría hasta recompilar sin caché.
 */
async function ContactLink() {
  await connection();
  const contact = process.env.CONTACT_EMAIL;
  if (!contact) return <> contactando con el administrador de la app</>;
  return (
    <>
      {" "}
      escribiendo a{" "}
      <a href={`mailto:${contact}`} className="font-semibold text-accent underline">
        {contact}
      </a>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** Política de privacidad pública (Google la exige para publicar el inicio de sesión). */
export default function PrivacyPage() {
  return (
    <main className="min-w-0 flex-1 px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">PaceLab · run-in-out.vercel.app</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Política de privacidad</h1>
          <p className="mt-1 text-sm text-muted">Última actualización: {UPDATED}</p>
        </header>

        <Section title="Qué es PaceLab">
          <p>
            Una aplicación para planificar y analizar entrenamientos de carrera y fuerza, y para compartirlos con amigos. Esta política explica qué datos guarda,
            para qué y con quién se comparten.
          </p>
        </Section>

        <Section title="Qué datos guardamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Cuenta de Google</strong>: nombre, email, foto de perfil y un identificador de Google. Solo para iniciar sesión y mostrar tu
              nombre. No accedemos a tu Gmail, contactos ni ningún otro dato de Google.
            </li>
            <li>
              <strong className="text-ink">Perfil</strong>: edad, sexo, peso, altura, frecuencia cardiaca, nivel, disponibilidad, lesiones y marcas que tú indiques.
            </li>
            <li>
              <strong className="text-ink">Entrenamientos</strong>: los que registras o importas (distancia, tiempo, ritmo, desnivel, pulso, cadencia, recorrido GPS,
              esfuerzo, sensaciones y notas) y tu plan.
            </li>
            <li>
              <strong className="text-ink">Strava</strong> (solo si lo conectas): las actividades y el recorrido resumido, más los permisos de acceso que da Strava.
            </li>
            <li>
              <strong className="text-ink">Amigos</strong>: a quién has añadido, solicitudes pendientes y con quién has entrenado.
            </li>
          </ul>
          <p>Usamos una única cookie, imprescindible para mantener la sesión iniciada. No usamos cookies de publicidad ni de analítica.</p>
        </Section>

        <Section title="Para qué los usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Calcular tus estadísticas, tu forma y tus ritmos, y generar y ajustar tu plan de entrenamiento.</li>
            <li>Mostrar tus entrenos y estadísticas a los amigos que tú aceptes.</li>
          </ul>
          <p>No vendemos tus datos ni los usamos para publicidad.</p>
        </Section>

        <Section title="Quién más los ve">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Tus amigos</strong> (solo los que aceptas): tus estadísticas, tu plan y tus entrenos con recorrido. <em>Nunca</em> tus sensaciones
              ni tus notas. En la búsqueda de perfiles cualquiera con cuenta ve tu nombre, tu @usuario y tu foto.
            </li>
            <li>
              <strong className="text-ink">Entrenador con IA</strong>: para ajustar tu plan se envían a OpenRouter (y al modelo de IA que use) tu edad, sexo, peso, nivel,
              lesiones, plan y entrenos recientes con tus sensaciones. No se envían tu nombre ni tu email.
            </li>
            <li>
              <strong className="text-ink">Proveedores técnicos</strong>: Vercel (alojamiento de la web), Upstash (base de datos), Google (inicio de sesión), Strava (si lo
              conectas) y OpenStreetMap (fondos de mapa: tu navegador le pide las imágenes de la zona del recorrido).
            </li>
          </ul>
        </Section>

        <Section title="Cuánto tiempo y cómo borrarlos">
          <p>
            Guardamos tus datos mientras tengas cuenta. Puedes borrarla tú mismo en <strong className="text-ink">Perfil → Editar perfil → Borrar mi cuenta</strong>: se
            eliminan tu perfil, tu plan, tus entrenos y tus amistades, y se desconecta Strava. También puedes borrar entrenos sueltos y desconectar Strava cuando
            quieras.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes acceder, corregir, borrar u oponerte al uso de tus datos y pedir una copia
            <Suspense fallback=" contactando con el administrador de la app">
              <ContactLink />
            </Suspense>
            . Si crees que no los tratamos bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
          </p>
        </Section>

        <p className="text-sm">
          <Link href="/" className="font-semibold text-accent">
            ← Volver a la app
          </Link>
        </p>
      </article>
    </main>
  );
}
