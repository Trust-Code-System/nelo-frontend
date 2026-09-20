import type { ReactNode } from 'react';

/**
 * Per-navigation entrance. A template (not a layout) re-mounts on every
 * navigation, so the CSS enter animation replays per page - a quiet fade for
 * the chrome, a short rise for <main>. Where the browser runs a React
 * ViewTransition (the garment morph), its snapshot covers this; elsewhere this
 * is the transition. Reduced motion disables both in globals.css.
 */
export default function MarketTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
