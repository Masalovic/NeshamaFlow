// src/components/states/LoadingState.tsx
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div style={{ padding: 16 }}>{label}</div>;
}