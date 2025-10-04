// src/lib/commands.ts
export type SlashCommand =
  | { name: 'quick'; rest: string }
  | { name: 'help' };

export function parseSlashCommand(input: string): SlashCommand | null {
  const s = (input ?? '').trim();
  if (!s.startsWith('/')) return null;

  const m = s.match(/^\/([a-z?]+)\b(?:\s+(.+))?$/i);
  if (!m) return null;

  const name = m[1].toLowerCase();
  const rest = (m[2] ?? '').trim();

  if (name === 'quick') return { name: 'quick', rest };
  if (name === 'help' || name === '?') return { name: 'help' };
  return null;
}
