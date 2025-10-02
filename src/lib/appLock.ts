// src/lib/appLock.ts
export async function hashPIN(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${pin}:${salt}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function getLockConfig() {
  const salt = localStorage.getItem('lock.salt');
  const hash = localStorage.getItem('lock.hash');
  return { salt, hash };
}

export async function setLockPIN(pin: string): Promise<void> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = await hashPIN(pin, salt);
  localStorage.setItem('lock.salt', salt);
  localStorage.setItem('lock.hash', hash);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const { salt, hash } = getLockConfig();
  if (!salt || !hash) return false;
  const test = await hashPIN(pin, salt);
  return test === hash;
}

export function clearLock(): void {
  localStorage.removeItem('lock.salt');
  localStorage.removeItem('lock.hash');
}
