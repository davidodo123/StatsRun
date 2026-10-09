import type { Metadata } from "next";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { logout } from "../auth-actions";
import { ProfileForm } from "@/components/ProfileForm";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { bmi, bmiLabel, hrMaxOf, hrRestOf, hrZones } from "@/lib/engine/physiology";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return (
    <>
      <PageHeader title="Tu perfil" subtitle="Con estos datos calculamos zonas, ritmos y el volumen adecuado para ti."
        action={
          <form action={logout}>
            <button className="btn btn-ghost">Cerrar sesión</button>
          </form>
        }
      />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const { profile } = await getDb();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileForm profile={profile} />
      </div>
      {profile && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="IMC" value={bmi(profile.weightKg, profile.heightCm).toFixed(1)} sub={bmiLabel(bmi(profile.weightKg, profile.heightCm))} />
            <Stat label="FC máx" value={hrMaxOf(profile)} unit="ppm" sub={profile.hrMax ? "Medida" : "Estimada (Tanaka)"} />
          </div>
          <Card title="Tus zonas de frecuencia cardiaca" subtitle={`Karvonen · FC reposo ${hrRestOf(profile)} ppm`}>
            <table className="w-full text-sm tabular">
              <tbody className="divide-y divide-line">
                {hrZones(hrMaxOf(profile), hrRestOf(profile)).map((z) => (
                  <tr key={z.zone}>
                    <td className="py-2 pr-2 font-semibold">Z{z.zone}</td>
                    <td className="py-2 pr-2">
                      {z.name}
                      <span className="block text-xs text-muted">{z.purpose}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      {z.min}–{z.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
