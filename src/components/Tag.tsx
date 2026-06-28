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
        padding: '4px 8px',
        borderRadius: 'var(--radius-sharp)',
        border: `1px solid var(--accent-line)`,
        color: isAccent ? 'var(--accent)' : 'var(--text-body)',
        background: 'var(--accent-soft)',
      }}
    >
      {children}
    </span>
  );
}
