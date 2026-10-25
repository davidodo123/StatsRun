import type { Instrumentation } from "next";

// Errores del servidor a PostHog (si hay clave del proyecto). Van sin cookies ni datos del usuario:
// solo el error y la ruta; se une al usuario si su navegador ya tiene el id de PostHog (aceptó las métricas).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token || process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { PostHog } = await import("posthog-node");
    const posthog = new PostHog(token, { host: "https://eu.i.posthog.com", flushAt: 1, flushInterval: 0 });
    let distinctId: string | undefined;
    const cookie = [request.headers.cookie ?? ""].flat().join(";");
    const match = cookie.match(/ph_phc_[^=]*_posthog=([^;]+)/);
    if (match) distinctId = JSON.parse(decodeURIComponent(match[1])).distinct_id;
    posthog.captureException(err, distinctId, { ruta: context.routePath, tipo: context.routeType });
    await posthog.shutdown();
  } catch {}
};
