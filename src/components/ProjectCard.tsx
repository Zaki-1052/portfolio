// src/components/ProjectCard.tsx
import { useState } from 'react';

interface ProjectCardProps {
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  meta?: string;
  glass?: boolean;
}

export function ProjectCard({
  title,
  href,
  description,
  tags = [],
  meta,
  glass = false,
}: ProjectCardProps) {
  const [hover, setHover] = useState(false);

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius)',
        border: '1px solid',
        borderColor: hover ? 'var(--accent-line)' : 'var(--hairline)',
        background: glass ? 'var(--surface-overlay)' : 'var(--surface-raised)',
        backdropFilter: glass ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: glass ? 'blur(10px)' : 'none',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition:
          'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        maxWidth: 'var(--measure-wide)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            color: hover ? 'var(--accent)' : 'var(--text-strong)',
            transition: 'color var(--dur-fast) var(--ease-out)',
          }}
        >
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {title}
              <span
                aria-hidden="true"
                style={{
                  opacity: hover ? 1 : 0,
                  marginLeft: 8,
                  fontSize: '0.8em',
                  transition: 'opacity var(--dur-fast) var(--ease-out)',
                }}
              >
                ↗
              </span>
            </a>
          ) : (
            title
          )}
        </h3>
        {meta && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            {meta}
          </span>
        )}
      </header>

      {description && (
        <p
          style={{
            margin: 0,
            color: 'var(--text-body)',
            fontSize: 'var(--text-base)',
            lineHeight: 'var(--leading-normal)',
            maxWidth: '62ch',
          }}
        >
          {description}
        </p>
      )}

      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-1)',
          }}
        >
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                lineHeight: 1,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sharp)',
                border: '1px solid var(--hairline)',
                color: 'var(--text-muted)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
