import React from 'react';

export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`mx-auto my-10 h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent animate-spin ${className}`}
    />
  );
}
