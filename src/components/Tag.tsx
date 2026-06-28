// src/components/Tag.tsx
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  tone?: 'muted' | 'accent';
}

export function Tag({ children, tone = 'muted' }: TagProps) {
  const isAccent = tone === 'accent';
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        lineHeight: 1,
        padding: 'var(--space-1) var(--space-2)',
        borderRadius: 'var(--radius-sharp)',
        border: `1px solid ${isAccent ? 'var(--accent-line)' : 'var(--hairline)'}`,
        color: isAccent ? 'var(--accent)' : 'var(--text-muted)',
      }}
    >
      {children}
    </span>
  );
}
