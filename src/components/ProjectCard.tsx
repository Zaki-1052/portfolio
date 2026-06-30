// src/components/ProjectCard.tsx

interface ProjectCardProps {
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  meta?: string;
}

export function ProjectCard({ title, href, description, tags = [], meta }: ProjectCardProps) {
  return (
    <article
      className="project-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius)',
        border: '1px solid',
        borderColor: 'var(--_card-border, var(--hairline-soft))',
        borderLeft: '3px solid var(--_card-border, var(--accent-line))',
        background: 'var(--surface-deep)',
        boxShadow: 'var(--_card-shadow, var(--shadow-sm))',
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
            color: 'var(--_card-title, var(--text-strong))',
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
                  opacity: 'var(--_card-arrow, 0.3)',
                  marginLeft: 'var(--space-2)',
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
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sharp)',
                border: '1px solid var(--accent-line)',
                color: 'var(--text-body)',
                background: 'var(--accent-soft)',
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
