import { randomBytes } from "node:crypto";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeToken(): string {
  return randomBytes(18).toString("base64url");
}

export function makeRoomCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    const bytes = randomBytes(6);
    for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
    if (!existing.has(code)) return code;
  }
  throw new Error("Could not allocate room code");
}

export function normalizeRoomCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizeName(value: unknown): string {
  return String(value ?? "").trim();
}
