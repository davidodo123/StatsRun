"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  MIN_PASSWORD,
  addFriendByCode,
  answerFriendRequest,
  cancelFriendRequest,
  createGoogleUser,
  createPasswordUser,
  loginWithPassword,
  resetTarget,
  setNewPassword,
  deleteUser,
  linkGoogleAccount,
  regenerateFriendCode,
  removeFriend,
  sendFriendRequest,
  setAvatar,
  type GoogleIdentity,
} from "@/lib/auth";
import { GOOGLE_PENDING_COOKIE, endSession, requireUserId, sealValue, startSession, unsealValue } from "@/lib/session";
import { clearAttempts, noteAttempt, tooMany } from "@/lib/attempts";
import { mailConfigured, sendMail } from "@/lib/mail";
import { loginLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";
import type { FormState } from "./actions";
import { healthTokenKey, kvDel, readDbNow } from "@/lib/db";
import { deauthorize } from "@/lib/strava";
import { jpegFromDataUrl, photoKey } from "@/lib/photoStore";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Identidad de Google que acaba de volver del inicio de sesión y aún no tiene cuenta. */
async function pendingGoogle(): Promise<GoogleIdentity | undefined> {
  return unsealValue<GoogleIdentity>((await cookies()).get(GOOGLE_PENDING_COOKIE)?.value);
}

/** Enlaza la cuenta antigua (usuario y contraseña) con la cuenta de Google pendiente. */
export async function linkAccount(_: FormState, fd: FormData): Promise<FormState> {
  const g = await pendingGoogle();
  if (!g) redirect("/login?error=caducado");
  const r = await linkGoogleAccount(str(fd, "username"), str(fd, "password"), g);
  if (!r.user) return { error: r.error };
  (await cookies()).delete(GOOGLE_PENDING_COOKIE);
  await startSession(r.user.id);
  redirect("/");
}

/** Cuenta nueva con la cuenta de Google pendiente. */
export async function createAccount(): Promise<void> {
  const g = await pendingGoogle();
  if (!g) redirect("/login?error=caducado");
  const user = await createGoogleUser(g);
  (await cookies()).delete(GOOGLE_PENDING_COOKIE);
  await startSession(user.id);
  redirect("/perfil");
}

const LOGIN_WINDOW = 15 * 60_000;
const RESET_WINDOW = 60 * 60_000;
const RESET_MAX_AGE = 60 * 60; // el enlace del correo vale 1 hora

/** Entrar con correo y contraseña (con freno: 5 fallos en 15 min bloquean ese correo un rato). */
export async function loginPassword(_: FormState, fd: FormData): Promise<FormState> {
  const t = translator(await loginLocale());
  const email = str(fd, "email");
  if (await tooMany("entrar", email, 5, LOGIN_WINDOW)) return { error: t("auth.err.demasiados") };
  const user = await loginWithPassword(email, str(fd, "password"));
  if (!user) {
    await noteAttempt("entrar", email, LOGIN_WINDOW);
    return { error: t("auth.err.malLogin") };
  }
  await clearAttempts("entrar", email);
  await startSession(user.id);
  redirect("/");
}

/** Cuenta nueva con correo y contraseña; después, el perfil por pasos. */
export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const t = translator(await loginLocale());
  const r = await createPasswordUser(str(fd, "name"), str(fd, "email"), str(fd, "password"));
  if (!r.user) return { error: r.error === "password" ? t("auth.err.password", { n: MIN_PASSWORD }) : r.error === "existe" ? t("auth.err.existe") : t("auth.err.email") };
  await startSession(r.user.id);
  redirect("/perfil");
}

/** «¿Has olvidado la contraseña?»: manda el enlace si hay cuenta. La respuesta es la misma haya o no, para no desvelar qué correos tienen cuenta. */
export async function forgotPassword(_: FormState, fd: FormData): Promise<FormState> {
  const t = translator(await loginLocale());
  const email = str(fd, "email").trim();
  if (!mailConfigured() && process.env.VERCEL) return { error: t("auth.err.sinCorreo") };
  const target = email && !(await tooMany("enlace", email, 3, RESET_WINDOW)) ? await resetTarget(email) : undefined;
  if (target) {
    await noteAttempt("enlace", email, RESET_WINDOW);
    // en producción, la dirección fija de Vercel (no la cabecera Host, que podría venir cambiada y llevar el enlace a otra web)
    const h = await headers();
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    const origin = prod ? `https://${prod}` : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const link = `${origin}/login/nueva?t=${encodeURIComponent(sealValue({ u: target.uid, m: target.mark }, RESET_MAX_AGE))}`;
    const esc = (x: string) => x.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    try {
      await sendMail(
        target.email,
        t("auth.mail.asunto"),
        `${t("auth.mail.hola", { nombre: target.name })}

${t("auth.mail.texto")}
${link}

${t("auth.mail.ignora")}`,
        `<p>${esc(t("auth.mail.hola", { nombre: target.name }))}</p><p>${esc(t("auth.mail.texto"))}</p><p><a href="${esc(link)}" style="display:inline-block;background:#d4ff3a;color:#000;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none">${esc(t("auth.mail.boton"))}</a></p><p style="color:#666;font-size:13px">${esc(t("auth.mail.ignora"))}</p>`,
      );
    } catch (e) {
      console.error("No se pudo mandar el correo", e);
      return { error: t("auth.err.sinCorreo") };
    }
  }
  return { ok: true, message: t("auth.enviado") };
}

/** Contraseña nueva desde el enlace del correo; luego entra directamente. */
export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const t = translator(await loginLocale());
  const token = unsealValue<{ u: string; m: string }>(str(fd, "t"));
  if (!token) return { error: t("auth.caducado") };
  if (str(fd, "password") !== str(fd, "password2")) return { error: t("auth.err.noCoinciden") };
  const r = await setNewPassword(token.u, token.m, str(fd, "password"));
  if (!r.user) return { error: r.error === "password" ? t("auth.err.password", { n: MIN_PASSWORD }) : t("auth.caducado") };
  await startSession(r.user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function addFriend(_: FormState, fd: FormData): Promise<FormState> {
  const r = await addFriendByCode(await requireUserId(), str(fd, "code"));
  if (r.error) return { error: r.error };
  refresh();
  return { ok: true, message: `Ahora ${r.friend?.name} y tú podéis ver vuestras estadísticas.` };
}

export async function requestFriend(fd: FormData): Promise<void> {
  await sendFriendRequest(await requireUserId(), str(fd, "id"));
  refresh();
}

export async function answerRequest(fd: FormData): Promise<void> {
  await answerFriendRequest(await requireUserId(), str(fd, "id"), str(fd, "accept") === "1");
  refresh();
}

export async function cancelRequest(fd: FormData): Promise<void> {
  await cancelFriendRequest(await requireUserId(), str(fd, "id"));
  refresh();
}

export async function unfriend(fd: FormData): Promise<void> {
  await removeFriend(await requireUserId(), str(fd, "id"));
  refresh();
  redirect("/amigos");
}

/** Borra la cuenta y todos sus datos. Hay que escribir BORRAR para confirmar. */
export async function deleteAccount(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, "confirm").trim().toUpperCase() !== "BORRAR") return { error: "Escribe BORRAR para confirmar." };
  const uid = await requireUserId();
  // desconectar Strava para que deje de dar acceso a la app
  const db = await readDbNow(uid);
  if (db.strava) await deauthorize(db.strava).catch(() => undefined);
  // y que la clave del atajo de Salud deje de apuntar a la cuenta
  if (db.healthTokenHash) await kvDel(healthTokenKey(db.healthTokenHash));
  // y las fotos de sus entrenos
  await Promise.all(db.activities.filter((a) => a.photoAt).map((a) => kvDel(photoKey(uid, a.id))));
  await deleteUser(uid);
  await endSession();
  redirect("/login?borrada=1");
}

export async function newFriendCode(): Promise<void> {
  await regenerateFriendCode(await requireUserId());
  refresh();
}

/** Guarda la foto de perfil (llega ya recortada y reducida a JPEG desde el navegador). */
export async function saveAvatar(dataUrl: string): Promise<FormState> {
  // JPEG de verdad y pequeño (el navegador la deja en ~20-40 KB)
  const jpeg = jpegFromDataUrl(dataUrl, 200_000);
  if (!jpeg) return { error: "La foto no es válida." };
  await setAvatar(await requireUserId(), jpeg);
  refresh();
  return { ok: true };
}

export async function removeAvatar(): Promise<void> {
  await setAvatar(await requireUserId());
  refresh();
}
