import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

async function Form() {
  // se lee en cada petición: el código de invitación puede cambiar sin recompilar
  await connection();
  return <RegisterForm needsInvite={Boolean(process.env.APP_PASSWORD)} />;
}
