import { encryptSave, decryptLoad } from './storage'
export interface HistoryEntry { ts:number; mood:string; note?:string; ritualId:string; durationSec:number }
const KEY='history'
export function loadHistory(): HistoryEntry[] { return decryptLoad<HistoryEntry[]>(KEY) || [] }
export function appendHistory(e: HistoryEntry) { const list = loadHistory(); list.push(e); encryptSave(KEY, list) }
export interface HistoryItem {
  ts: number
  mood: string
  note: string
  ritualId: string
  durationSec: number
}

