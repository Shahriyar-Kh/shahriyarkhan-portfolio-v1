import type { SystemMapLayer } from "@/components/motif/system-map";

export interface SystemMapLegendProps {
  layers: readonly SystemMapLayer[];
}

/**
 * Always-visible (never sr-only), rendered beneath the diagram in the
 * same reading order as the SVG's layers. This means there is no content
 * that exists only inside the <svg> - the diagram is decorative-plus,
 * not the sole carrier of information.
 */
export function SystemMapLegend({ layers }: SystemMapLegendProps) {
  return (
    <ol className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      {layers.map((layer, i) => (
        <li key={layer.label} className="flex items-baseline gap-2 text-body-sm">
          <span className="font-mono text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
          <span className="font-medium text-ink-primary">{layer.label}</span>
          {layer.technologies.length > 0 && (
            <span className="font-mono text-caption-sm text-ink-tertiary">
              {layer.technologies.join(", ")}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
