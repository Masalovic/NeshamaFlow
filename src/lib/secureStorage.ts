// src/lib/secureStorage.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
const ENC_META_KEY = "secure.meta.v1";
const MIGRATION_FLAG = "secure.migrated.v1";
const SECURE_PREFIX = "secure:";

const isBrowser =
  typeof window !== "undefined" && typeof window.crypto !== "undefined";
const enc = isBrowser ? new TextEncoder() : undefined;
const dec = isBrowser ? new TextDecoder() : undefined;

type Meta = {
  v: 1;
  saltB64: string;
  kdf: { name: "PBKDF2"; iter: number; hash: "SHA-256" };
  algo: { name: "AES-GCM"; length: 256; ivBytes: number };
};

let cachedKey: CryptoKey | null = null;

// ---------- helpers ----------
function assertBrowser(): void {
  if (!isBrowser) throw new Error("secureStorage: Not in a browser context.");
}

function bytesToB64(buf: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin);
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// Ensure we pass a real, detached ArrayBuffer to WebCrypto
function toBuffer(u8: Uint8Array): ArrayBuffer {
  // TypedArray.slice() creates a new Uint8Array with its own ArrayBuffer
  return u8.slice().buffer;
}
function getOrCreateMeta(): Meta {
  assertBrowser();
  const raw = localStorage.getItem(ENC_META_KEY);
  if (raw) {
    try {
      const meta = JSON.parse(raw) as Meta;
      if (meta.v === 1) return meta;
    } catch {/* recreate */}
  }
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const meta: Meta = {
    v: 1,
    saltB64: bytesToB64(salt.buffer),
    kdf: { name: "PBKDF2", iter: 250_000, hash: "SHA-256" },
    algo: { name: "AES-GCM", length: 256, ivBytes: 12 },
  };
  localStorage.setItem(ENC_META_KEY, JSON.stringify(meta));
  return meta;
}

async function deriveKey(passphrase: string, meta: Meta): Promise<CryptoKey> {
  assertBrowser();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc!.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBuffer(b64ToBytes(meta.saltB64)),
      iterations: meta.kdf.iter,
      hash: meta.kdf.hash,
    },
    baseKey,
    { name: "AES-GCM", length: meta.algo.length },
    false,
    ["encrypt", "decrypt"]
  );
}

function ensureKey(): CryptoKey {
  if (!cachedKey)
    throw new Error(
      "secureStorage: key not set. Call setEncryptionPassphrase() after unlock."
    );
  return cachedKey;
}

// ---------- public API ----------
export function ready(): boolean {
  return !!cachedKey;
}

export async function setEncryptionPassphrase(passphrase: string): Promise<void> {
  assertBrowser();
  const meta = getOrCreateMeta();
  cachedKey = await deriveKey(passphrase, meta);
}

export function clearEncryptionKey(): void {
  cachedKey = null;
}

export async function encryptValue(value: any): Promise<string> {
  assertBrowser();
  const key = ensureKey();
  const meta = getOrCreateMeta();

  const iv = new Uint8Array(meta.algo.ivBytes);
  crypto.getRandomValues(iv);

  const plaintextBytes = enc!.encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    plaintextBytes
  );
  const payload = {
    v: 1 as const,
    iv: bytesToB64(iv.buffer),
    ct: bytesToB64(ct),
  };
  return SECURE_PREFIX + JSON.stringify(payload);
}

export async function decryptValue<T = any>(encPayload: string): Promise<T> {
  assertBrowser();
  const key = ensureKey();
  if (!encPayload.startsWith(SECURE_PREFIX))
    throw new Error("Value is not encrypted.");
  const json = encPayload.slice(SECURE_PREFIX.length);
  const payload = JSON.parse(json) as { v: 1; iv: string; ct: string };
  const iv = b64ToBytes(payload.iv);
  const ct = b64ToBytes(payload.ct);

  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    toBuffer(ct)
  );
  return JSON.parse(dec!.decode(pt)) as T;
}

export async function setItem(key: string, value: any): Promise<void> {
  assertBrowser();
  const encrypted = await encryptValue(value);
  localStorage.setItem(key, encrypted);
}

export async function getItem<T = any>(key: string): Promise<T | null> {
  assertBrowser();
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  if (stored.startsWith(SECURE_PREFIX)) {
    try {
      return await decryptValue<T>(stored);
    } catch (e) {
      console.error("secureStorage.getItem decrypt failed", e);
      return null;
    }
  }
  return null; // legacy plaintext handled via migrateFromLegacy()
}

export function removeItem(key: string): void {
  assertBrowser();
  localStorage.removeItem(key);
}
export function clearAll(): void {
  assertBrowser();
  localStorage.clear();
}

export async function migrateFromLegacy(keys: string[]): Promise<void> {
  assertBrowser();
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
  if (!keys.length) return;
  ensureKey();

  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (!val) continue;
    if (val.startsWith(SECURE_PREFIX)) continue;
    let parsed: any = null;
    try { parsed = JSON.parse(val); } catch { parsed = val; }
    const encrypted = await encryptValue(parsed);
    localStorage.setItem(key, encrypted);
  }
  localStorage.setItem(MIGRATION_FLAG, "1");
}
