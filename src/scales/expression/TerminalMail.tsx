// src/scales/expression/TerminalMail.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useTerminalMail } from '@/hooks/useTerminalMail';

interface TerminalMailProps {
  open: boolean;
  onClose: () => void;
}

export function TerminalMail({ open, onClose }: TerminalMailProps) {
  const { state, fields, errors, setField, submit, reset, canSubmit, rateLimited, config } =
    useTerminalMail();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => firstInputRef.current?.focus());
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        trapFocus(e, dialogRef.current);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submit();
    },
    [submit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        submit();
      }
    },
    [canSubmit, submit],
  );

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!open) return null;

  const isSending = state.phase === 'sending';
  const isDone = state.phase === 'success';
  const isError = state.phase === 'error';

  return (
    <div className="terminal-mail-overlay" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="terminal-mail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terminal-mail-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="terminal-mail__header">
          <span id="terminal-mail-title">mail &mdash; {config.recipientDisplay}</span>
          <button className="terminal-mail__close" onClick={handleClose}>
            esc
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="terminal-mail__body">
            <div className="terminal-mail__prompt terminal-mail__prompt--command">
              <span style={{ color: 'var(--text-faint)' }}>$ </span>
              <span>mail zara</span>
            </div>

            <div className="terminal-mail__prompt terminal-mail__prompt--fixed">
              <span className="terminal-mail__label">To:</span>
              <span>{config.recipientDisplay}</span>
            </div>

            <div>
              <div className="terminal-mail__prompt">
                <label className="terminal-mail__label" htmlFor="mail-name">
                  Name:
                </label>
                <input
                  ref={firstInputRef}
                  id="mail-name"
                  className="terminal-mail__input"
                  type="text"
                  value={fields.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="your name"
                  disabled={isSending || isDone}
                  autoComplete="name"
                />
              </div>
              {errors.name && <div className="terminal-mail__error">{errors.name}</div>}
            </div>

            <div>
              <div className="terminal-mail__prompt">
                <label className="terminal-mail__label" htmlFor="mail-from">
                  From:
                </label>
                <input
                  id="mail-from"
                  className="terminal-mail__input"
                  type="email"
                  value={fields.from}
                  onChange={(e) => setField('from', e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSending || isDone}
                  autoComplete="email"
                />
              </div>
              {errors.from && <div className="terminal-mail__error">{errors.from}</div>}
            </div>

            <div>
              <div className="terminal-mail__prompt">
                <label className="terminal-mail__label" htmlFor="mail-subject">
                  Subject:
                </label>
                <input
                  id="mail-subject"
                  className="terminal-mail__input"
                  type="text"
                  value={fields.subject}
                  onChange={(e) => setField('subject', e.target.value)}
                  placeholder="re: ..."
                  disabled={isSending || isDone}
                />
              </div>
              {errors.subject && <div className="terminal-mail__error">{errors.subject}</div>}
            </div>

            <div>
              <div className="terminal-mail__prompt" style={{ alignItems: 'flex-start' }}>
                <label
                  className="terminal-mail__label"
                  htmlFor="mail-body"
                  style={{ paddingTop: 'var(--space-1)' }}
                >
                  Body:
                </label>
              </div>
              <textarea
                id="mail-body"
                className="terminal-mail__textarea"
                value={fields.body}
                onChange={(e) => setField('body', e.target.value)}
                placeholder="write your message..."
                disabled={isSending || isDone}
                rows={5}
              />
              {errors.body && (
                <div className="terminal-mail__error" style={{ marginLeft: 0 }}>
                  {errors.body}
                </div>
              )}
            </div>

            {/* Formspree honeypot */}
            <input type="text" name="_gotcha" style={{ display: 'none' }} tabIndex={-1} />
          </div>

          {errors.general && (
            <div className="terminal-mail__status terminal-mail__status--error">
              {errors.general}
            </div>
          )}

          {(isSending || isDone || isError) && (
            <div className="terminal-mail__actions">
              <span style={{ color: 'rgba(97, 175, 239, 0.5)' }}>$ send</span>
              <div className="terminal-mail__progress">
                <div className="terminal-mail__bar">
                  <div
                    className={`terminal-mail__bar-fill${isDone ? ' terminal-mail__bar-fill--done' : ''}${isError ? ' terminal-mail__bar-fill--error' : ''}`}
                  />
                </div>
                <span>{isDone ? '100%' : isError ? 'ERR' : '...'}</span>
              </div>
            </div>
          )}

          {isDone && (
            <div
              className="terminal-mail__status terminal-mail__status--success"
              role="status"
              aria-live="polite"
            >
              &#10003; Message delivered to {config.recipientDisplay}
            </div>
          )}

          {isError && (
            <div
              className="terminal-mail__status terminal-mail__status--error"
              role="alert"
              aria-live="assertive"
            >
              &#10007; {state.message}
            </div>
          )}

          {!isSending && !isDone && !isError && (
            <div className="terminal-mail__actions">
              <button
                type="submit"
                className="terminal-mail__send"
                disabled={!canSubmit || rateLimited}
              >
                <span style={{ color: 'var(--text-faint)' }}>$ </span>send
              </button>
              {rateLimited && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--aod-red)', opacity: 0.8 }}>
                  daily limit reached
                </span>
              )}
            </div>
          )}

          {(isDone || isError) && (
            <div className="terminal-mail__actions">
              {isError && (
                <button type="button" className="terminal-mail__send" onClick={reset}>
                  <span style={{ color: 'var(--text-faint)' }}>$ </span>retry
                </button>
              )}
              <button type="button" className="terminal-mail__close" onClick={handleClose}>
                close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
