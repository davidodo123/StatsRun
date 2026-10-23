import type { CapacitorConfig } from "@capacitor/cli";

// App de Android (Google Play): la misma web de Vercel dentro de una app, con acceso a Health Connect.
// La página de capacitor-web solo se ve si no hay conexión al abrirla.
const config: CapacitorConfig = {
  appId: "app.runinout",
  appName: "Run-In-Out",
  webDir: "capacitor-web",
  server: {
    url: "https://run-in-out.vercel.app",
    errorPath: "index.html",
  },
  android: {
    backgroundColor: "#1a1a19",
    // grabar con el GPS en segundo plano: sin esto, Android corta las ubicaciones a los 5 min con la pantalla apagada
    useLegacyBridge: true,
  },
};

export default config;
