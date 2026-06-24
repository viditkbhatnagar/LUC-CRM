// The 13-stage horizontal rail. Done stages styled, current highlighted.
// Clicking a node requests that transition (wired by onNavigate in M4).
export default function LifecycleRail({ stages, currentSlug, maxIndex, onNavigate }) {
  const currentIndex = stages.find((s) => s.slug === currentSlug)?.index ?? -1;

  return (
    <div className="rail" role="list" aria-label="Lifecycle stages">
      {stages.map((s) => {
        const done = s.index < currentIndex || s.index <= maxIndex;
        const current = s.slug === currentSlug;
        const cls = current ? 'current' : done ? 'done' : '';
        return (
          <button
            key={s.slug}
            role="listitem"
            className={`rail-node ${cls}`}
            disabled={!onNavigate}
            title={`${s.index + 1}. ${s.label}`}
            onClick={() => onNavigate?.(s)}
          >
            {s.index + 1}. {s.label}
          </button>
        );
      })}
    </div>
  );
}
