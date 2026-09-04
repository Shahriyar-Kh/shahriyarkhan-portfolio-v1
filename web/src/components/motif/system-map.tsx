import { SystemMapActivation } from "@/components/motif/system-map-activation";
import { SystemMapLegend } from "@/components/motif/system-map-legend";

export interface SystemMapLayer {
  label: string;
  technologies: readonly string[];
}

export interface SystemMapProps {
  /** Exactly 4 layers: client, REST API, auth, data. Technology labels
   * are passed in from live Skill/Technology data by the caller, so the
   * diagram can never drift from what the API actually reports. */
  layers: readonly [SystemMapLayer, SystemMapLayer, SystemMapLayer, SystemMapLayer];
}

const LAYER_Y = [70, 170, 270, 370] as const;
const SPINE_X = 80;
const NODE_X = 220;

/**
 * The signature scroll-driven experience: a system architecture diagram
 * built entirely from the motif's Node/Run primitives. See
 * docs/rebuild/P01_MOTION_MAP.md for the full mechanics and the one
 * documented stroke-dashoffset exception to the transform/opacity-only
 * motion rule.
 *
 * Placement rule (also documented in the motion map): this component
 * must only ever be placed BELOW THE FOLD. data-enhanced is set in a
 * useEffect, i.e. after first paint - an above-the-fold placement would
 * visibly flash complete -> hidden -> animated.
 */
export function SystemMap({ layers }: SystemMapProps) {
  return (
    <div className="relative">
      <SystemMapActivation>
        <svg
          data-system-map
          viewBox="0 0 720 440"
          className="h-auto w-full max-w-2xl text-primary"
          role="img"
          aria-labelledby="system-map-title system-map-desc"
        >
          <title id="system-map-title">A typical system architecture in this portfolio</title>
          <desc id="system-map-desc">
            Four tiers - browser client, REST API, authentication and authorization, and data
            stores - connected by request paths.
          </desc>

          {/* The vertical spine connecting all four layers. */}
          <path
            data-run
            pathLength={1}
            d={`M${SPINE_X},40 L${SPINE_X},400`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />

          {layers.map((layer, i) => {
            // LAYER_Y and `layers` are both fixed 4-tuples by the
            // SystemMapProps type, so this index is always in range -
            // the non-null assertion just satisfies noUncheckedIndexedAccess.
            const y = LAYER_Y[i]!;
            return (
              <g key={layer.label} data-layer={String(i + 1)}>
                <path
                  data-run
                  pathLength={1}
                  d={`M${SPINE_X},${y} L${NODE_X},${y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                />
                <g data-node transform={`translate(${SPINE_X - 3},${y - 3})`}>
                  <rect width={6} height={6} fill="currentColor" />
                </g>
                <g data-node transform={`translate(${NODE_X - 3},${y - 3})`}>
                  <rect width={6} height={6} fill="none" stroke="currentColor" strokeWidth={1} />
                </g>
                <text
                  x={NODE_X + 16}
                  y={y + 5}
                  className="fill-current font-sans text-[15px] font-semibold text-foreground"
                  style={{ fill: "var(--color-foreground)" }}
                >
                  {layer.label}
                </text>
                <text
                  x={NODE_X + 16}
                  y={y + 22}
                  className="font-mono text-[11px]"
                  style={{ fill: "var(--color-ink-tertiary)" }}
                >
                  {layer.technologies.join(" · ") || "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </SystemMapActivation>
      <SystemMapLegend layers={layers} />
    </div>
  );
}
