// Cifrado de las copias de seguridad (AES-256-GCM). Formato: "RIOB1" + iv (12) + etiqueta (16) + datos.
// También lo usa scripts/backup-restore.mjs (misma lógica, copiada) para descifrar.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("RIOB1");
const keyOf = (secret: string) => createHash("sha256").update(secret).digest();

export function encryptBackup(plain: Buffer, secret: string): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const data = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), data]);
}

export function decryptBackup(file: Buffer, secret: string): Buffer {
  if (!file.subarray(0, 5).equals(MAGIC)) throw new Error("No es una copia de Zancavolt.");
  const iv = file.subarray(5, 17);
  const tag = file.subarray(17, 33);
  const d = createDecipheriv("aes-256-gcm", keyOf(secret), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(file.subarray(33)), d.final()]);
}
