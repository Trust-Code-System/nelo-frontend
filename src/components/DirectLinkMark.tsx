/**
 * Northeast arrow used on outbound and "continue" links.
 *
 * The Unicode ↗ glyph is treated as an emoji on iOS, so it paints in the
 * system share-icon colours instead of inheriting the surrounding type.
 * An SVG stroke in currentColor stays on the house palette.
 */
export function DirectLinkMark() {
  return (
    <span className="direct-link" aria-hidden="true">
      <svg viewBox="0 0 12 12" width="11" height="11" focusable="false">
        <path
          d="M3.2 8.8 8.8 3.2M4.15 3.2H8.8V7.85"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </span>
  );
}
