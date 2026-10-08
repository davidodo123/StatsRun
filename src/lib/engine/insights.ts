// Recomendaciones automáticas, siempre con el porqué.
import type { Plan, Profile } from "../types";
import type { Stats } from "./stats";
import type { SessionMatch } from "./planner";
import { bmi } from "./physiology";
import { diffDays } from "../dates";

export interface Insight {
  tone: "good" | "warn" | "bad" | "neutral";
  title: string;
  detail: string;
}

export function buildInsights(stats: Stats, profile: Profile, plan: Plan | undefined, matches: Map<string, SessionMatch> | undefined, today: string): Insight[] {
  const out: Insight[] = [];
  const { acwr, today: t } = stats;

  if (acwr > 1.5)
    out.push({ tone: "bad", title: "Carga disparada", detail: `Tu carga de 7 días es ${acwr.toFixed(2)}× la habitual (zona segura 0,8–1,3). Riesgo de lesión alto: haz 2-3 días suaves o descanso.` });
  else if (acwr > 1.3)
    out.push({ tone: "warn", title: "Subida de carga rápida", detail: `ACWR ${acwr.toFixed(2)}. Estás por encima de 1,3: mantén los rodajes realmente suaves esta semana.` });
  else if (acwr >= 0.8)
    out.push({ tone: "good", title: "Carga bien dosificada", detail: `ACWR ${acwr.toFixed(2)}: progresas sin picos peligrosos.` });

  if (t.tsb < -30) out.push({ tone: "bad", title: "Fatiga acumulada alta", detail: `Frescura ${t.tsb.toFixed(0)}. Si notas piernas pesadas o FC alta en reposo, convierte la próxima sesión de calidad en rodaje.` });

  // 80/20
  const z = stats.zoneTime;
  const total = z.reduce((s, x) => s + x.minutes, 0);
  if (total > 120) {
    const easy = (z[0].minutes + z[1].minutes) / total;
    if (easy < 0.65)
      out.push({
        tone: "warn",
        title: "Demasiado tiempo a intensidad media",
        detail: `Solo el ${Math.round(easy * 100)} % de tu tiempo (8 semanas) es en Z1-Z2. Los mejores planes (80/20, Seiler) buscan ~80 %. Baja el ritmo de los rodajes.`,
      });
    else out.push({ tone: "good", title: "Buena distribución de intensidad", detail: `${Math.round(easy * 100)} % del tiempo en zonas suaves (objetivo ~80 %).` });
  }

  // Eficiencia aeróbica
  const ef = stats.paceTrend.filter((p) => p.ef).map((p) => p.ef!);
  if (ef.length >= 8) {
    const a = ef.slice(0, 4).reduce((s, x) => s + x, 0) / 4;
    const b = ef.slice(-4).reduce((s, x) => s + x, 0) / 4;
    const ch = (b / a - 1) * 100;
    if (ch > 2) out.push({ tone: "good", title: "Tu motor aeróbico mejora", detail: `Efficiency Factor +${ch.toFixed(1)} %: corres más rápido con la misma frecuencia cardiaca.` });
    else if (ch < -3) out.push({ tone: "warn", title: "Eficiencia a la baja", detail: `Efficiency Factor ${ch.toFixed(1)} %. Puede ser fatiga, calor o falta de sueño. Vigila la recuperación.` });
  }

  // Constancia
  if (stats.totals.consistency < 70 && stats.totals.allRuns > 0)
    out.push({ tone: "warn", title: "Constancia mejorable", detail: `Has corrido en el ${Math.round(stats.totals.consistency)} % de las últimas 12 semanas. La constancia gana a cualquier sesión épica.` });

  // Cumplimiento del plan
  if (plan && matches) {
    const past = [...matches.values()].filter((m) => m.session.date < today && diffDays(today, m.session.date) <= 14 && m.session.type !== "strength");
    if (past.length >= 3) {
      const c = past.reduce((s, m) => s + m.compliance, 0) / past.length;
      if (c >= 0.85) out.push({ tone: "good", title: "Cumplimiento excelente", detail: `${Math.round(c * 100)} % del plan completado en 2 semanas. Si te ves sobrado, regenera el plan para actualizar ritmos.` });
      else if (c < 0.6)
        out.push({ tone: "warn", title: "El plan se está quedando grande", detail: `Solo ${Math.round(c * 100)} % completado en 2 semanas. Considera bajar días por semana en tu perfil y regenerar el plan.` });
    }
    // VDOT real vs plan
    if (stats.vdot.vdot > plan.startVdot + 1.5)
      out.push({ tone: "good", title: "Estás más en forma que tu plan", detail: `VDOT estimado ${stats.vdot.vdot.toFixed(1)} vs ${plan.startVdot.toFixed(1)} al crear el plan. Regenera el plan para ajustar ritmos.` });
  }

  const b = bmi(profile.weightKg, profile.heightCm);
  if (b >= 28)
    out.push({ tone: "neutral", title: "Impacto articular", detail: "Con tu peso, prioriza superficies blandas, zapatillas con amortiguación y fuerza de tren inferior 2×/semana." });

  if (!out.length) out.push({ tone: "neutral", title: "Sigue sumando datos", detail: "Con unas semanas de actividades sincronizadas aparecerán aquí recomendaciones personalizadas." });
  return out;
}
