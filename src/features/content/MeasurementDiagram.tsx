/**
 * Fig. 01 — where the seven recorded measurements are taken.
 *
 * Lifted from `design/mockups/home.html` so the size guide and the home page draw the same
 * figure rather than two drawings that drift apart. `currentColor` throughout, so it inverts
 * correctly in dark mode without a second copy.
 *
 * The `aria-label` carries the whole point of the image for anyone who cannot see it; the
 * size guide's own table then states each measurement in words, so the figure is support
 * rather than the only source.
 */
export function MeasurementDiagram() {
  return (
    <svg
      viewBox="0 0 340 258"
      role="img"
      aria-label="Front-view garment block showing where each of the seven recorded measurements is taken: shoulder across the back, bust at the fullest point, waist at the narrowest, hip at the fullest, sleeve from shoulder to wrist, inseam from crotch to ankle, and height from crown to floor."
      style={{ width: '100%', height: 'auto', color: 'var(--ink)' }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {/* block: head, shoulders, bodice, skirt */}
        <path d="M148 22c0-8 6-13 14-13s14 5 14 13c0 7-2 11-2 15l30 10c9 3 13 8 14 17l5 38-19 4-3-21-4 133h-70l-4-133-3 21-19-4 5-38c1-9 5-14 14-17l30-10c0-4-2-8-2-15z" />
        {/* sleeve seam + inner leg */}
        <path d="M205 62l14 46M162 152v66" />
        {/* horizontal measurement lines, stopping clear of the labels */}
        <g strokeDasharray="3 3">
          <path d="M118 52h118M110 80h126M114 108h122M110 136h126" />
        </g>
        {/* height dimension, far left */}
        <path d="M40 16v226M35 16h10M35 242h10" />
      </g>
      {/* A `font-family` presentation attribute does not resolve a CSS custom property, so
          the mono family comes through `style` instead — otherwise these labels silently
          render in the sans and the drawing stops matching the rest of the chrome. */}
      <g
        fill="currentColor"
        fontSize="7.5"
        letterSpacing="1.1"
        style={{ fontFamily: 'var(--mono)' }}
        aria-hidden="true"
      >
        <text x="244" y="55">
          SHOULDER
        </text>
        <text x="244" y="83">
          BUST
        </text>
        <text x="244" y="111">
          WAIST
        </text>
        <text x="244" y="139">
          HIP
        </text>
        <text x="228" y="118">
          SLEEVE
        </text>
        <text x="172" y="200">
          INSEAM
        </text>
        <text x="10" y="132" transform="rotate(-90 22 132)" textAnchor="middle">
          HEIGHT
        </text>
      </g>
    </svg>
  );
}
