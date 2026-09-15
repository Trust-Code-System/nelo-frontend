/**
 * A read-only stage track.
 *
 * Deliberately not interactive: customers must not be able to transition a stage. Stage
 * changes are staff production controls, and the current backend module permissions are
 * internal interfaces, not a customer authorization contract.
 */
export function StageTrack<T extends string>({
  order,
  labels,
  current,
  caption,
}: {
  order: readonly T[];
  labels: Readonly<Record<T, string>>;
  current: T;
  caption?: string;
}) {
  const currentIndex = order.indexOf(current);

  return (
    <div className="track">
      {caption ? <span className="lab">{caption}</span> : null}
      <ol
        className="track-steps"
        style={{ gridTemplateColumns: `repeat(${order.length}, minmax(0, 1fr))` }}
      >
        {order.map((stage, index) => {
          const state =
            index < currentIndex ? 'done' : index === currentIndex ? 'now' : 'todo';
          return (
            <li key={stage} className={state} aria-current={state === 'now' ? 'step' : undefined}>
              <span className="n">{String(index + 1).padStart(2, '0')}</span>
              <span className="t">{labels[stage]}</span>
              <span className="sr">
                {state === 'done' ? 'completed' : state === 'now' ? 'in progress' : 'not started'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
