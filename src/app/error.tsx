'use client';

import { useEffect } from 'react';

/**
 * Error boundary.
 *
 * Shows what went wrong and what to do about it. Never renders a raw trace or an error
 * message from upstream: a Vendure transport failure can carry internal detail, and the
 * customer needs a recovery path rather than a stack.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logging is where the detail belongs. The digest correlates this render
    // with that log without exposing anything here.
    console.error('Unhandled error', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="shell" style={{ paddingBlock: 'var(--s9)' }}>
      <span className="lab">Something went wrong</span>
      <h1 style={{ fontSize: 'var(--t-xl)', fontWeight: 600, letterSpacing: '-.018em' }}>
        We could not load this page
      </h1>
      <p style={{ color: 'var(--smoke)', maxWidth: '48ch' }}>
        This is our fault, not yours. Try again - if it keeps happening, the atelier can help
        directly.
      </p>
      <div className="acts-row">
        <button className="btn" type="button" onClick={reset}>
          Try again
        </button>
      </div>
      {error.digest ? (
        <p className="mnote" style={{ marginTop: 'var(--s6)' }}>
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  );
}
