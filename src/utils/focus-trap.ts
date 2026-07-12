// src/utils/focus-trap.ts
// Tab-cycle containment, extracted from TerminalMail (two consumers now: the
// mail dialog and the terminal pager). One addition over the original: the
// selector includes `a[href]` — anchors are natively tabbable, and a trap
// that ignores them lets Tab escape when a link is the first or last
// focusable (the pager's [GitHub ↗] link needs this; the mail dialog has no
// anchors, so its cycle is unchanged).
export function trapFocus(e: KeyboardEvent, container: HTMLElement | null): void {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]), textarea:not([disabled]), button:not([disabled]), a[href]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
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
