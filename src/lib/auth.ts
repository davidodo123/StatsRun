import "server-only";
// Cuentas de usuario y amistades. Todos los usuarios en un único documento (app pequeña, entre amigos).
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { LEGACY_DB_KEY, kvGet, kvSet, kvUpdate, userDbKey } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const USERS_KEY = "statsrun:users";

export interface User {
  id: string;
  username: string; // en minúsculas, único
  name: string;
  passHash: string;
  salt: string;
  createdAt: string;
  friendCode: string;
  friends: string[]; // ids
}

interface UsersDoc {
  users: User[];
}

export type PublicUser = Pick<User, "id" | "username" | "name" | "friendCode">;
const toPublic = ({ id, username, name, friendCode }: User): PublicUser => ({ id, username, name, friendCode });

async function readUsers(): Promise<UsersDoc> {
  const raw = await kvGet(USERS_KEY);
  return raw ? (JSON.parse(raw) as UsersDoc) : { users: [] };
}

const updateUsers = (fn: (doc: UsersDoc) => void | Promise<void>) => kvUpdate<UsersDoc>(USERS_KEY, () => ({ users: [] }), fn);

async function hash(password: string, salt: string) {
  return (await scrypt(password, salt, 64)).toString("hex");
}

function newFriendCode(taken: Set<string>): string {
  // sin caracteres ambiguos (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const code = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
    if (!taken.has(code)) return code;
  }
}

export const normalizeUsername = (u: string) => u.trim().toLowerCase();

/** Registro. Requiere el código de invitación (APP_PASSWORD) si está configurado. */
export async function registerUser(input: { username: string; name: string; password: string; invite: string }): Promise<{ user?: PublicUser; error?: string }> {
  const username = normalizeUsername(input.username);
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) return { error: "Usuario de 3 a 24 caracteres: letras, números, punto, guion o guion bajo." };
  if (input.password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  const invite = process.env.APP_PASSWORD;
  if (invite && input.invite.trim() !== invite) return { error: "Código de invitación incorrecto." };

  const salt = randomBytes(16).toString("hex");
  const passHash = await hash(input.password, salt);
  let created: User | undefined;
  let first = false;
  let error: string | undefined;
  await updateUsers((doc) => {
    if (doc.users.some((u) => u.username === username)) {
      error = "Ese usuario ya existe.";
      return;
    }
    first = doc.users.length === 0;
    created = {
      id: randomUUID(),
      username,
      name: input.name.trim().slice(0, 40) || username,
      passHash,
      salt,
      createdAt: new Date().toISOString(),
      friendCode: newFriendCode(new Set(doc.users.map((u) => u.friendCode))),
      friends: [],
    };
    doc.users.push(created);
  });
  if (error || !created) return { error: error ?? "No se pudo crear la cuenta." };

  // la primera cuenta hereda los datos de antes de que hubiera cuentas
  if (first) {
    const legacy = await kvGet(LEGACY_DB_KEY);
    if (legacy && !(await kvGet(userDbKey(created.id)))) await kvSet(userDbKey(created.id), legacy);
  }
  return { user: toPublic(created) };
}

export async function verifyLogin(usernameRaw: string, password: string): Promise<PublicUser | undefined> {
  const username = normalizeUsername(usernameRaw);
  const user = (await readUsers()).users.find((u) => u.username === username);
  // calcular el hash aunque no exista, para no revelar qué usuarios hay por el tiempo de respuesta
  const got = Buffer.from(await hash(password, user?.salt ?? "0".repeat(32)), "hex");
  if (!user) return undefined;
  const expected = Buffer.from(user.passHash, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got) ? toPublic(user) : undefined;
}

export async function getUser(id: string): Promise<PublicUser | undefined> {
  const u = (await readUsers()).users.find((x) => x.id === id);
  return u && toPublic(u);
}

export async function getFriends(id: string): Promise<PublicUser[]> {
  const { users } = await readUsers();
  const me = users.find((u) => u.id === id);
  if (!me) return [];
  return users.filter((u) => me.friends.includes(u.id)).map(toPublic);
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const me = (await readUsers()).users.find((u) => u.id === a);
  return Boolean(me?.friends.includes(b));
}

/** Añadir amigo con su código: la amistad es mutua (los dos ven las estadísticas del otro). */
export async function addFriendByCode(uid: string, codeRaw: string): Promise<{ friend?: PublicUser; error?: string }> {
  const code = codeRaw.trim().toUpperCase();
  let friend: User | undefined;
  let error: string | undefined;
  await updateUsers((doc) => {
    const me = doc.users.find((u) => u.id === uid);
    friend = doc.users.find((u) => u.friendCode === code);
    if (!me) error = "Sesión no válida.";
    else if (!friend) error = "No hay nadie con ese código.";
    else if (friend.id === uid) error = "Ese es tu propio código.";
    else if (me.friends.includes(friend.id)) error = `Ya eres amigo de ${friend.name}.`;
    else {
      me.friends.push(friend.id);
      if (!friend.friends.includes(uid)) friend.friends.push(uid);
    }
  });
  return error ? { error } : { friend: friend && toPublic(friend) };
}

export async function removeFriend(uid: string, friendId: string): Promise<void> {
  await updateUsers((doc) => {
    for (const u of doc.users) {
      if (u.id === uid) u.friends = u.friends.filter((f) => f !== friendId);
      if (u.id === friendId) u.friends = u.friends.filter((f) => f !== uid);
    }
  });
}

/** Cambiar el código de amigo (por si se ha compartido con quien no se debía). */
export async function regenerateFriendCode(uid: string): Promise<void> {
  await updateUsers((doc) => {
    const me = doc.users.find((u) => u.id === uid);
    if (me) me.friendCode = newFriendCode(new Set(doc.users.map((u) => u.friendCode)));
  });
}
