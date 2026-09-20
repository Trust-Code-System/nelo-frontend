'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * The facet rail, as a sheet on small screens.
 *
 * Mobile is most of this audience's traffic, and stacking a facet rail above the grid means
 * every visitor on a phone scrolls past the filters to reach a single product. So below the
 * rail's breakpoint this becomes a disclosure: one button, and a panel over the page.
 *
 * The rail itself stays a Server Component and is passed in as children. This island owns
 * open/closed and nothing else - no filter state reaches the browser, and the links inside
 * are still ordinary links, so a filtered view remains shareable.
 *
 * Above the breakpoint the button is hidden by CSS and the panel is the static rail, so
 * there is one implementation rather than two.
 */
export function FilterSheet({
  activeCount,
  total,
  children,
}: {
  /** Shown on the trigger so a phone user can see filters are applied without opening it. */
  activeCount: number;
  total: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);

    // The panel covers the page, so the page behind it must not scroll - otherwise closing
    // the sheet returns you somewhere you did not navigate to.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the sheet. Without this a keyboard or screen-reader user opens a panel
    // and stays behind it.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="sheet-trigger btn-q"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Filter
        {activeCount > 0 ? <span className="num"> · {activeCount}</span> : null}
      </button>

      {/* Rendered whatever the state: above the breakpoint this IS the rail, and hiding it
          behind `open` would remove the desktop filters entirely. */}
      <div id={panelId} className="sheet" data-open={open ? 'true' : 'false'}>
        <div className="sheet-head">
          <span className="lab">
            Filter · {total} {total === 1 ? 'garment' : 'garments'}
          </span>
          <button ref={closeRef} className="lab sheet-close" type="button" onClick={close}>
            Close
          </button>
        </div>

        <div className="sheet-body">{children}</div>

        <div className="sheet-foot">
          <button className="btn submit" type="button" onClick={close}>
            Show {total} {total === 1 ? 'garment' : 'garments'}
          </button>
        </div>
      </div>

      {/* Click-away. A button rather than a div so it is reachable and announced, and it
          duplicates Escape rather than being the only way out. */}
      {open ? (
        <button className="sheet-scrim" type="button" aria-label="Close filters" onClick={close} />
      ) : null}
    </>
  );
}
