// src/content/markdown.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function ExternalLink(props: ComponentPropsWithoutRef<'a'>) {
  const { href, children, ...rest } = props;
  const isExternal = href?.startsWith('http');
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className ?? 'prose'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ExternalLink }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
