import { redirect } from "next/navigation";

// el entrenador de fuerza pasó a ser el «Entrenador IA» general (running y fuerza)
export default function OldStrengthCoachPage() {
  redirect("/entrenador");
}
