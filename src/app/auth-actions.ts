"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  addFriendByCode,
  answerFriendRequest,
  cancelFriendRequest,
  createGoogleUser,
  deleteUser,
  linkGoogleAccount,
  regenerateFriendCode,
  removeFriend,
  sendFriendRequest,
  type GoogleIdentity,
} from "@/lib/auth";
import { GOOGLE_PENDING_COOKIE, endSession, requireUserId, startSession, unsealValue } from "@/lib/session";
import type { FormState } from "./actions";
import { readDbNow } from "@/lib/db";
import { deauthorize } from "@/lib/strava";
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
  redirect("/amigos");
}

/** Borra la cuenta y todos sus datos. Hay que escribir BORRAR para confirmar. */
export async function deleteAccount(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, "confirm").trim().toUpperCase() !== "BORRAR") return { error: "Escribe BORRAR para confirmar." };
  const uid = await requireUserId();
  // desconectar Strava para que deje de dar acceso a la app
  const db = await readDbNow(uid);
  if (db.strava) await deauthorize(db.strava).catch(() => undefined);  await deleteUser(uid);
  await endSession();
  redirect("/login?borrada=1");
}

export async function newFriendCode(): Promise<void> {
  await regenerateFriendCode(await requireUserId());
  refresh();
}
