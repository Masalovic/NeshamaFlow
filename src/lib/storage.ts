import CryptoJS from 'crypto-js'
const SECRET = import.meta.env.VITE_STORAGE_SECRET || 'default_secret_key'
export function encryptSave(key: string, data: unknown): void {
  const json = JSON.stringify(data); const ct = CryptoJS.AES.encrypt(json, SECRET).toString(); localStorage.setItem(key, ct)
}
export function decryptLoad<T=any>(key: string): T | null {
  const ct = localStorage.getItem(key); if (!ct) return null
  try { const bytes = CryptoJS.AES.decrypt(ct, SECRET); const json = bytes.toString(CryptoJS.enc.Utf8); return JSON.parse(json) as T } catch { return null }
}