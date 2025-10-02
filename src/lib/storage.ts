// DEPRECATED: Do not use. Switch to secureStorage + history helpers.
export function encryptSave(): never {
  throw new Error('DEPRECATED storage.ts used. Use secureStorage/history instead.');
}
export function decryptLoad(): never {
  throw new Error('DEPRECATED storage.ts used. Use secureStorage/history instead.');
}
