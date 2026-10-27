import "server-only";
// Correos de la app (el de «¿Has olvidado la contraseña?») desde una cuenta de Gmail con contraseña de aplicación.
// Variables en Vercel: GMAIL_USER y GMAIL_APP_PASSWORD.
import nodemailer from "nodemailer";

export const mailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!mailConfigured()) {
    // en local sin Gmail: el enlace sale en la consola del servidor
    if (!process.env.VERCEL) return void console.log(`[correo a ${to}] ${subject}\n${text}`);
    throw new Error("Falta GMAIL_USER o GMAIL_APP_PASSWORD.");
  }
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
  await transport.sendMail({ from: { name: "Zancavolt", address: process.env.GMAIL_USER! }, to, subject, text, html });
}
