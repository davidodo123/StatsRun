import { describe, expect, it } from "vitest";
import { gunzipSync, gzipSync } from "node:zlib";
import { decryptBackup, encryptBackup } from "./backupCrypto";

describe("copias de seguridad cifradas", () => {
  const plain = gzipSync(JSON.stringify({ version: 1, keys: { "statsrun:users": '{"users":[]}' } }));

  it("se descifran con la misma clave y dan lo mismo", () => {
    const enc = encryptBackup(plain, "secreto");
    expect(enc.subarray(0, 5).toString()).toBe("RIOB1");
    expect(enc.includes(Buffer.from("statsrun"))).toBe(false); // nada legible
    expect(JSON.parse(gunzipSync(decryptBackup(enc, "secreto")).toString()).keys).toEqual({ "statsrun:users": '{"users":[]}' });
  });

  it("con otra clave, o tocando el archivo, falla", () => {
    const enc = encryptBackup(plain, "secreto");
    expect(() => decryptBackup(enc, "otra")).toThrow();
    const broken = Buffer.from(enc);
    broken[broken.length - 1] ^= 1;
    expect(() => decryptBackup(broken, "secreto")).toThrow();
    expect(() => decryptBackup(Buffer.from("hola"), "secreto")).toThrow(/No es una copia/);
  });
});
