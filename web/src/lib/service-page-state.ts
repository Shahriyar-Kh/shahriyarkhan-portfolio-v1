import type { ApiResult } from "@/lib/api/errors";
import type { Service } from "@/lib/api/types";

export type ServicePageState =
  | { kind: "not_found" }
  | { kind: "unavailable"; message: string }
  | { kind: "ready"; service: Service };

/** Deliberately the same shape as resolveProjectPageState - one pattern,
 * not two. */
export function resolveServicePageState(result: ApiResult<Service>): ServicePageState {
  if (result.ok) return { kind: "ready", service: result.data };
  if (result.error.kind === "not_found") return { kind: "not_found" };
  return { kind: "unavailable", message: result.error.message };
}
