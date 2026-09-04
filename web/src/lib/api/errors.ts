export type ApiErrorKind =
  | "not_configured" // NEXT_PUBLIC_API_BASE_URL unset - no fetch is attempted at all
  | "network" // fetch() rejected: DNS, offline, connection refused
  | "timeout" // AbortController fired
  | "not_found" // 404 - VALID business state for resume + pageSeo; notFound() for a project
  | "validation" // 400 carrying a DRF field-error map (writes only)
  | "http" // any other non-2xx
  | "invalid_response"; // 2xx but the body was not parseable JSON

export type DrfFieldErrors = Record<string, string[]>;

export interface ApiError {
  kind: ApiErrorKind;
  status: number | null;
  /** Safe to render. Never contains a raw 5xx body (Django traceback risk). */
  message: string;
  /** Present only when kind === "validation". */
  fieldErrors?: DrfFieldErrors;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function err<T>(error: ApiError): ApiResult<T> {
  return { ok: false, error };
}

export function isNotFound(result: ApiResult<unknown>): boolean {
  return !result.ok && result.error.kind === "not_found";
}

/** True for kinds a user should be told about as "temporarily unavailable". */
export function isTransient(error: ApiError): boolean {
  return error.kind === "network" || error.kind === "timeout" || error.kind === "http" || error.kind === "invalid_response";
}

const GENERIC_SERVER_ERROR_MESSAGE = "The content service is temporarily unavailable.";

export function messageForStatus(status: number, detail?: string): string {
  if (status >= 500) return GENERIC_SERVER_ERROR_MESSAGE;
  return detail ?? `Request failed with status ${status}.`;
}
