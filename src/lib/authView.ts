import "server-only";
// Lecturas de usuarios para pintar páginas: en la caché privada, como getDb (ver viewCache en session.ts).
// Las acciones usan las de auth.ts, siempre en directo.
import { areFriends, getFriends, getRequests, getUser } from "./auth";
import { viewCache } from "./session";

export async function viewUser(id: string) {
  "use cache: private";
  viewCache();
  return getUser(id);
}

export async function viewFriends(id: string) {
  "use cache: private";
  viewCache();
  return getFriends(id);
}

export async function viewAreFriends(a: string, b: string) {
  "use cache: private";
  viewCache();
  return areFriends(a, b);
}

export async function viewRequests(uid: string) {
  "use cache: private";
  viewCache();
  return getRequests(uid);
}
