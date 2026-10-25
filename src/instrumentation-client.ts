// Métricas y errores con PostHog (servidor en Europa). Solo si hay clave del proyecto y el usuario acepta
// (components/Analytics.tsx): hasta entonces no se manda nada ni se guarda ninguna cookie (todo en memoria).
// Sin grabaciones de pantalla ni clics automáticos: solo qué páginas se visitan y los errores; nunca datos de salud.
import posthog from "posthog-js";
import { CONSENT_KEY } from "./components/analyticsConsent";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
if (token) {
  try {
    const accepted = localStorage.getItem(CONSENT_KEY) === "si";
    posthog.init(token, {
      // por la propia web (next.config: /ingest → eu.i.posthog.com): así no lo cortan los bloqueadores
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      persistence: accepted ? "localStorage+cookie" : "memory",
      opt_out_capturing_by_default: !accepted,
      opt_out_capturing_persistence_type: "localStorage",
      advanced_disable_flags: true,
      autocapture: false,
      disable_session_recording: true,
      capture_exceptions: true,
      person_profiles: "identified_only",
    });
  } catch {}
}
