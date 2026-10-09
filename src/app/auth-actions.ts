"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { addFriendByCode, regenerateFriendCode, registerUser, removeFriend, verifyLogin } from "@/lib/auth";
import { endSession, requireUserId, startSession } from "@/lib/session";
import type { FormState } from "./actions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  if (password !== str(fd, "password2")) return { error: "Las contraseñas no coinciden." };
  const r = await registerUser({ username: str(fd, "username"), name: str(fd, "name"), password, invite: str(fd, "invite") });
  if (!r.user) return { error: r.error };
  await startSession(r.user.id);
  redirect("/perfil");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = await verifyLogin(str(fd, "username"), str(fd, "password"));
  if (!user) return { error: "Usuario o contraseña incorrectos." };
  await startSession(user.id);
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

export async function unfriend(fd: FormData): Promise<void> {
  await removeFriend(await requireUserId(), str(fd, "id"));
  redirect("/amigos");
}

export async function newFriendCode(): Promise<void> {
  await regenerateFriendCode(await requireUserId());
  refresh();
}
