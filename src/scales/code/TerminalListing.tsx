// src/scales/code/TerminalListing.tsx

export interface TerminalRow {
  name: string;
  description: string;
  stars?: number;
  href?: string;
  perms?: string;
}

interface TerminalListingProps {
  cwd?: string;
  items: TerminalRow[];
}

function formatStars(n: number): string {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function Row({ name, description, stars, href, perms = 'drwxr-xr-x' }: TerminalRow) {
  const inner = (
    <div
      className="terminal-row"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr) max-content',
        gap: 'var(--space-4)',
        alignItems: 'baseline',
        padding: '5px 16px',
        background: 'var(--_row-bg, transparent)',
        textDecoration: 'none',
      }}
    >
      <span style={{ color: 'var(--syntax-perm)' }}>{perms}</span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            color: 'var(--_row-name, var(--text-strong))',
            fontWeight: 'var(--weight-medium)',
            transition: 'color var(--dur-fast) var(--ease-out)',
          }}
        >
          {name}
        </span>
        <span style={{ color: 'var(--text-faint)' }}>/</span>
        {description && (
          <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-4)' }}>
            {description}
          </span>
        )}
      </span>
      <span style={{ color: 'var(--syntax-star)', whiteSpace: 'nowrap', textAlign: 'right' }}>
        {stars ? `★ ${formatStars(stars)}` : ''}
      </span>
    </div>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}

export function TerminalListing({ cwd = '~/projects', items }: TerminalListingProps) {
  return (
    <div
      className="terminal-listing"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.7,
        background: 'var(--surface-deep)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-square)',
        maxWidth: 'var(--measure-wide)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--hairline)',
          color: 'var(--text-muted)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <span style={{ color: 'var(--syntax-fn)' }}>{cwd}</span>{' '}
        <span style={{ color: 'var(--text-faint)' }}>$</span>{' '}
        <span style={{ color: 'var(--text-body)' }}>ls -la</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0' }}>
        {items.map((it) => (
          <Row key={it.name} {...it} />
        ))}
      </ul>
    </div>
  );
}
