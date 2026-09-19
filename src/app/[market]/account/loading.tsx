/**
 * Account loading state.
 *
 * Account pages are always server-rendered on demand, so there is a real wait here. A
 * skeleton that matches the eventual layout beats a spinner: nothing jumps when it resolves.
 */
export default function Loading() {
  return (
    <main className="shell" style={{ paddingBlock: 'var(--s9)' }} aria-busy="true">
      <span className="lab">Loading your account…</span>
      {/* A real h1, not just a grey bar. Without it the page has no level-one heading for
          as long as the load takes, and a screen reader landing here has nothing to orient
          on. It is visually hidden because the skeleton bar below is the visual placeholder. */}
      <h1 className="sr">Your account</h1>
      <div className="skeleton-head" />
      <div className="skeleton-rows">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton-row" />
        ))}
      </div>
      <span className="sr" role="status">
        Loading
      </span>
    </main>
  );
}
