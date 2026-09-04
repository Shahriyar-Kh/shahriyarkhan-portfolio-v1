export interface LimitationsNoteProps {
  limitations: readonly string[];
}

/**
 * "What this page does not claim." The single most anti-generic element
 * on the site - no template ships a section that states what it isn't
 * asserting.
 */
export function LimitationsNote({ limitations }: LimitationsNoteProps) {
  if (limitations.length === 0) return null;

  return (
    <div className="border border-dashed border-border p-4">
      <p className="text-label text-ink-tertiary uppercase">What this page does not claim</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {limitations.map((item) => (
          <li key={item} className="text-caption text-ink-secondary">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
