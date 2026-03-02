// src/components/states/ErrorState.tsx
export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div>{message}</div>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  );
}