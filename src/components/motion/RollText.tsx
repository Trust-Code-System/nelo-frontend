/**
 * Text that rolls upward on hover, revealing a second copy underneath - the
 * classic editorial link tick. The whole visible construction is aria-hidden;
 * the parent link or button keeps its own accessible name via aria-label, so
 * the label is announced exactly once and never duplicated by the second copy.
 *
 * Pure CSS motion (see .rolltext in globals.css): no JavaScript, no state,
 * and under reduced motion the rail simply never moves.
 */
export function RollText({ text }: { text: string }) {
  return (
    <span className="rolltext" aria-hidden="true">
      <span className="rolltext__rail">
        <span className="rolltext__line">{text}</span>
        <span className="rolltext__line rolltext__line--alt">{text}</span>
      </span>
    </span>
  );
}
