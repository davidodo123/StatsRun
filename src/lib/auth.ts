import "server-only";
// Cuentas de usuario y amistades. Todos los usuarios en un único documento (app pequeña, entre amigos).
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { LEGACY_DB_KEY, kvDel, kvGet, kvSet, kvUpdate, userDbKey } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const USERS_KEY = "statsrun:users";

export interface User {
  id: string;
  username: string; // en minúsculas, único
  name: string;
  // cuentas antiguas (usuario y contraseña); se usan una sola vez para enlazarlas con Google
  passHash?: string;
  salt?: string;
  googleSub?: string; // id estable de la cuenta de Google
  email?: string;
  picture?: string;
  createdAt: string;
  friendCode: string;
  friends: string[]; // ids
  requests?: string[]; // ids de quienes le han enviado solicitud de amistad (pendientes)
}

interface UsersDoc {
  users: User[];
}

export type PublicUser = Pick<User, "id" | "username" | "name" | "friendCode" | "picture">;
const toPublic = ({ id, username, name, friendCode, picture }: User): PublicUser => ({ id, username, name, friendCode, picture });

// al renderizar, una sola lectura por petición; fuera del renderizado (acciones, rutas) React.cache no memoriza
const readUsers = cache(async (): Promise<UsersDoc> => {
  const raw = await kvGet(USERS_KEY);
  return raw ? (JSON.parse(raw) as UsersDoc) : { users: [] };
});

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

/** Identidad devuelta por Google tras el inicio de sesión. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function findUserByGoogle(sub: string): Promise<PublicUser | undefined> {
  const u = (await readUsers()).users.find((x) => x.googleSub === sub);
  return u && toPublic(u);
}

/** ¿Quedan cuentas antiguas sin enlazar? Solo entonces se ofrece enlazar al entrar con Google por primera vez. */
export async function hasUnlinkedAccounts(): Promise<boolean> {
  return (await readUsers()).users.some((u) => !u.googleSub && u.passHash);
}

// nombre de usuario libre a partir del email (david.s@gmail.com → david.s, david.s2…)
function usernameFor(email: string, taken: Set<string>): string {
  const base = (normalizeUsername(email.split("@")[0]).replace(/[^a-z0-9_.-]/g, "") || "atleta").slice(0, 20).padEnd(3, "0");
  let name = base;
  for (let i = 2; taken.has(name); i++) name = `${base}${i}`;
  return name;
}

/** Cuenta nueva a partir de Google. */
export async function createGoogleUser(g: GoogleIdentity): Promise<PublicUser> {
  let created: User | undefined;
  let first = false;
  await updateUsers((doc) => {
    // si entró dos veces a la vez, no duplicar
    created = doc.users.find((u) => u.googleSub === g.sub);
    if (created) return;
    first = doc.users.length === 0;
    created = {
      id: randomUUID(),
      username: usernameFor(g.email, new Set(doc.users.map((u) => u.username))),
      name: g.name.trim().slice(0, 40) || g.email.split("@")[0],
      googleSub: g.sub,
      email: g.email,
      picture: g.picture,
      createdAt: new Date().toISOString(),
      friendCode: newFriendCode(new Set(doc.users.map((u) => u.friendCode))),
      friends: [],
    };
    doc.users.push(created);
  });

  // la primera cuenta hereda los datos de antes de que hubiera cuentas
  if (first) {
    const legacy = await kvGet(LEGACY_DB_KEY);
    if (legacy && !(await kvGet(userDbKey(created!.id)))) await kvSet(userDbKey(created!.id), legacy);
  }
  return toPublic(created!);
}

/** Enlaza una cuenta antigua (usuario y contraseña) con Google; a partir de ahí solo se entra con Google. */
export async function linkGoogleAccount(usernameRaw: string, password: string, g: GoogleIdentity): Promise<{ user?: PublicUser; error?: string }> {
  const username = normalizeUsername(usernameRaw);
  const user = (await readUsers()).users.find((u) => u.username === username);
  // calcular el hash aunque no exista, para no revelar qué usuarios hay por el tiempo de respuesta
  const got = Buffer.from(await hash(password, user?.salt ?? "0".repeat(32)), "hex");
  const expected = Buffer.from(user?.passHash ?? "", "hex");
  if (!user || expected.length !== got.length || !timingSafeEqual(expected, got)) return { error: "Usuario o contraseña incorrectos." };
  if (user.googleSub) return { error: "Esa cuenta ya está enlazada con otra cuenta de Google." };

  let error: string | undefined;
  let linked: User | undefined;
  await updateUsers((doc) => {
    error = undefined; // la escritura puede reintentarse
    if (doc.users.some((u) => u.googleSub === g.sub)) {
      error = "Tu cuenta de Google ya tiene una cuenta en PaceLab.";
      return;
    }
    linked = doc.users.find((u) => u.id === user.id);
    if (!linked) return;
    linked.googleSub = g.sub;
    linked.email = g.email;
    linked.picture = g.picture;
    // la contraseña ya no sirve para entrar
    delete linked.passHash;
    delete linked.salt;
  });
  if (error || !linked) return { error: error ?? "No se pudo enlazar la cuenta." };
  return { user: toPublic(linked) };
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
    error = undefined; // la escritura puede reintentarse
    const me = doc.users.find((u) => u.id === uid);
    friend = doc.users.find((u) => u.friendCode === code);
    if (!me) error = "Sesión no válida.";
    else if (!friend) error = "No hay nadie con ese código.";
    else if (friend.id === uid) error = "Ese es tu propio código.";
    else if (me.friends.includes(friend.id)) error = `Ya eres amigo de ${friend.name}.`;
    else {
      me.friends.push(friend.id);
      if (!friend.friends.includes(uid)) friend.friends.push(uid);
      // el código vale como aceptación: se limpian solicitudes pendientes entre los dos
      me.requests = me.requests?.filter((x) => x !== friend!.id);
      friend.requests = friend.requests?.filter((x) => x !== uid);
    }
  });
  return error ? { error } : { friend: friend && toPublic(friend) };
}

export type Relation = "amigo" | "enviada" | "recibida" | "ninguna";

export interface SearchResult extends Omit<PublicUser, "friendCode"> {
  relation: Relation;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Busca perfiles por nombre o @usuario. Solo devuelve nombre, usuario y foto (nunca el código de amigo ni el email):
 * para ver las estadísticas hace falta que el otro acepte la solicitud.
 */
export async function searchUsers(uid: string, query: string, limit = 10): Promise<SearchResult[]> {
  const q = normalize(query.replace(/^@/, ""));
  if (q.length < 2) return [];
  const { users } = await readUsers();
  const me = users.find((u) => u.id === uid);
  if (!me) return [];
  const relation = (u: User): Relation =>
    me.friends.includes(u.id) ? "amigo" : u.requests?.includes(uid) ? "enviada" : me.requests?.includes(u.id) ? "recibida" : "ninguna";
  return users
    .filter((u) => u.id !== uid && (normalize(u.name).includes(q) || u.username.includes(q)))
    .map((u) => ({ u, starts: normalize(u.name).startsWith(q) || u.username.startsWith(q) }))
    .sort((a, b) => Number(b.starts) - Number(a.starts) || a.u.name.localeCompare(b.u.name))
    .slice(0, limit)
    .map(({ u }) => ({ id: u.id, username: u.username, name: u.name, picture: u.picture, relation: relation(u) }));
}

/** Solicitudes recibidas y enviadas pendientes. */
export async function getRequests(uid: string): Promise<{ received: PublicUser[]; sent: PublicUser[] }> {
  const { users } = await readUsers();
  const me = users.find((u) => u.id === uid);
  if (!me) return { received: [], sent: [] };
  return {
    received: users.filter((u) => me.requests?.includes(u.id)).map(toPublic),
    sent: users.filter((u) => u.requests?.includes(uid)).map(toPublic),
  };
}

/** Envía solicitud. Si el otro ya te la había enviado, os hacéis amigos directamente. */
export async function sendFriendRequest(uid: string, targetId: string): Promise<{ error?: string; becameFriends?: boolean }> {
  let error: string | undefined;
  let becameFriends = false;
  await updateUsers((doc) => {
    error = undefined; // la escritura puede reintentarse
    becameFriends = false;
    const me = doc.users.find((u) => u.id === uid);
    const target = doc.users.find((u) => u.id === targetId);
    if (!me || !target || target.id === uid) error = "Usuario no válido.";
    else if (me.friends.includes(target.id)) error = `Ya eres amigo de ${target.name}.`;
    else if (me.requests?.includes(target.id)) {
      me.requests = me.requests.filter((x) => x !== target.id);
      me.friends.push(target.id);
      if (!target.friends.includes(uid)) target.friends.push(uid);
      becameFriends = true;
    } else if (!target.requests?.includes(uid)) target.requests = [...(target.requests ?? []), uid];
  });
  return { error, becameFriends };
}

/** Acepta o rechaza una solicitud recibida. */
export async function answerFriendRequest(uid: string, fromId: string, accept: boolean): Promise<void> {
  await updateUsers((doc) => {
    const me = doc.users.find((u) => u.id === uid);
    const from = doc.users.find((u) => u.id === fromId);
    if (!me?.requests?.includes(fromId)) return;
    me.requests = me.requests.filter((x) => x !== fromId);
    if (accept && from) {
      if (!me.friends.includes(fromId)) me.friends.push(fromId);
      if (!from.friends.includes(uid)) from.friends.push(uid);
    }
  });
}

/** Retira una solicitud enviada. */
export async function cancelFriendRequest(uid: string, targetId: string): Promise<void> {
  await updateUsers((doc) => {
    const target = doc.users.find((u) => u.id === targetId);
    if (target?.requests) target.requests = target.requests.filter((x) => x !== uid);
  });
}

export async function removeFriend(uid: string, friendId: string): Promise<void> {
  await updateUsers((doc) => {
    for (const u of doc.users) {
      if (u.id === uid) u.friends = u.friends.filter((f) => f !== friendId);
      if (u.id === friendId) u.friends = u.friends.filter((f) => f !== uid);
    }
  });
}

/** Borra la cuenta: sus datos de entrenamiento, su usuario y su rastro en amigos y solicitudes de los demás. */
export async function deleteUser(uid: string): Promise<void> {
  await kvDel(userDbKey(uid));
  await updateUsers((doc) => {
    doc.users = doc.users.filter((u) => u.id !== uid);
    for (const u of doc.users) {
      u.friends = u.friends.filter((f) => f !== uid);
      if (u.requests) u.requests = u.requests.filter((r) => r !== uid);
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
