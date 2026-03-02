// src/components/states/EmptyState.tsx
export function EmptyState({
  title = 'Nothing here yet.',
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div>{title}</div>
      {hint && <div style={{ opacity: 0.7 }}>{hint}</div>}
    </div>
  );
}