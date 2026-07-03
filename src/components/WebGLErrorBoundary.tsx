// src/components/WebGLErrorBoundary.tsx
// Catches synchronous render-time throws from inside the Canvas tree (R3F
// re-throws them outward) and reports them so App can unmount the Canvas and
// fall back to the HTML/CSS atmosphere. It renders nothing extra on error —
// the fallback content is the always-present semantic HTML layer. Async
// context loss (webglcontextlost) is NOT a thrown error and is handled
// separately by a listener in App's Canvas onCreated.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  onError: (error: unknown) => void;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'WebGLErrorBoundary: render error inside the Canvas; falling back to the HTML atmosphere.',
      error,
      info,
    );
    this.props.onError(error);
  }

  render(): ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}
