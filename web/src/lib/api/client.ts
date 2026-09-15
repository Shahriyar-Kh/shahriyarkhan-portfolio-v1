import { API_BASE_URL, DEFAULT_TIMEOUT_MS, IS_API_CONFIGURED, RETRY_BACKOFF_MS } from "@/lib/api/config";
import { err, isNotFound as _isNotFound, messageForStatus, ok, type ApiError, type ApiResult, type DrfFieldErrors } from "@/lib/api/errors";
import type { Paginated } from "@/lib/api/types";

export interface RequestOptions {
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
  /** GET only, never applied to POST. Retries with bounded backoff
   * (config.ts's RETRY_BACKOFF_MS) on network/timeout failures only -
   * never on a 4xx/5xx/validation/schema error, since retrying a real
   * outage or a permanent client error just doubles load on an
   * already-struggling instance without changing the outcome. */
  retry?: boolean;
  /** Test-only override for the retry backoff schedule, so retry tests
   * don't have to wait out the real multi-second production delays. */
  retryBackoffMs?: readonly number[];
  /** Forces the underlying fetch's `cache` mode directly instead of
   * Next's `next.revalidate` cache-config path - "no-store" means never
   * served from any cache layer, not even briefly (mutually exclusive
   * with `revalidate`/`tags`: Next throws if both `cache` and
   * `next.revalidate` are set on the same fetch call). Reserve for a
   * resource that must reflect the immediate current server state on
   * every request - see lib/api/resume.ts's getDefaultResume(). Every
   * other established page/resource keeps using `revalidate` and is
   * unaffected by this option's existence. */
  cache?: "no-store";
}

const MAX_LIST_PAGES = 10;

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/** Re-normalizes a DRF-emitted `next` URL (which is absolute, on the API
 * host) back through apiUrl() so a backend-emitted URL can never
 * redirect this app to a different host or downgrade the scheme. */
function toApiPath(nextUrl: string): string {
  try {
    const parsed = new URL(nextUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return nextUrl;
  }
}

function combineSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal {
  if (a && b) return AbortSignal.any([a, b]);
  return a ?? b ?? new AbortController().signal;
}

async function doFetch(path: string, init: RequestInit, options: RequestOptions): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = combineSignals(timeoutSignal, options.signal);

  // `cache: "no-store"` and `next: { revalidate }` are mutually
  // exclusive on a single fetch call (Next throws if both are present),
  // so `options.cache` takes a distinct branch rather than layering on
  // top of the revalidate-based one below.
  const cacheInit: RequestInit =
    options.cache === "no-store" ? { cache: "no-store" } : { next: options.revalidate === false ? { revalidate: 0 } : { revalidate: options.revalidate, tags: options.tags } };

  return fetch(apiUrl(path), {
    ...init,
    signal,
    // Passing a signal opts this request out of Next's per-render fetch
    // memoization (it does NOT disable the persistent next.revalidate
    // data cache). Mitigation: every resource is fetched exactly once
    // per page at the page/layout level and passed down as props - there
    // is nothing to memoize across components for the same resource.
    ...cacheInit,
  });
}

function classifyFetchError(e: unknown): ApiError {
  if (e instanceof DOMException && e.name === "AbortError") {
    return { kind: "timeout", status: null, message: "The content service took too long to respond." };
  }
  return { kind: "network", status: null, message: "Could not reach the content service." };
}

async function attemptGet<T>(path: string, options: RequestOptions): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await doFetch(path, { headers: { Accept: "application/json" } }, options);
  } catch (e) {
    return err(classifyFetchError(e));
  }

  if (response.status === 404) {
    return err({ kind: "not_found", status: 404, message: "Not found." });
  }

  if (!response.ok) {
    return err({ kind: "http", status: response.status, message: messageForStatus(response.status) });
  }

  try {
    const data = (await response.json()) as T;
    return ok(data);
  } catch {
    return err({ kind: "invalid_response", status: response.status, message: "Received an unreadable response." });
  }
}

function isRetryableKind(kind: ApiError["kind"]): boolean {
  // Deliberately excludes "http" (4xx/5xx), "validation", "not_found",
  // and "invalid_response" - a permanent or schema-level failure is not
  // fixed by waiting, and retrying a real 5xx outage just adds load to
  // an already-struggling instance.
  return kind === "network" || kind === "timeout";
}

export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  if (!IS_API_CONFIGURED) {
    return err({ kind: "not_configured", status: null, message: "The content service is not configured." });
  }

  let result = await attemptGet<T>(path, options);
  if (!options.retry) return result;

  const backoffSchedule = options.retryBackoffMs ?? RETRY_BACKOFF_MS;
  for (const backoffMs of backoffSchedule) {
    if (result.ok || !isRetryableKind(result.error.kind)) break;
    // Safe diagnostic context only - path and error kind, never a
    // response body (which could carry a Django traceback on a 5xx).
    console.warn(`apiGet: retrying ${path} after a "${result.error.kind}" error (waiting ${backoffMs}ms)`);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
    result = await attemptGet<T>(path, options);
  }

  return result;
}

export async function apiGetList<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T[]>> {
  if (!IS_API_CONFIGURED) {
    return err({ kind: "not_configured", status: null, message: "The content service is not configured." });
  }

  const collected: T[] = [];
  let nextPath: string | null = path;
  let pages = 0;

  while (nextPath && pages < MAX_LIST_PAGES) {
    const result: ApiResult<Paginated<T> | T[]> = await apiGet<Paginated<T> | T[]>(nextPath, options);
    if (!result.ok) return result;

    if (Array.isArray(result.data)) {
      collected.push(...result.data);
      nextPath = null;
    } else {
      collected.push(...result.data.results);
      nextPath = result.data.next ? toApiPath(result.data.next) : null;
    }
    pages += 1;
  }

  if (nextPath) {
    console.warn(`apiGetList: hit the ${MAX_LIST_PAGES}-page cap for ${path}`);
  }

  return ok(collected);
}

export async function apiPost<TRes, TBody extends object>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<ApiResult<TRes>> {
  if (!IS_API_CONFIGURED) {
    return err({ kind: "not_configured", status: null, message: "The content service is not configured." });
  }

  let response: Response;
  try {
    response = await doFetch(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
      { ...options, revalidate: false },
    );
  } catch (e) {
    return err(classifyFetchError(e));
  }

  if (response.status === 400) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return err({ kind: "http", status: 400, message: "The submission was rejected." });
    }
    const fieldErrors = parseDrfFieldErrors(parsed);
    if (fieldErrors) {
      return err({ kind: "validation", status: 400, message: "Please correct the highlighted fields.", fieldErrors });
    }
    return err({ kind: "http", status: 400, message: "The submission was rejected." });
  }

  if (!response.ok) {
    return err({ kind: "http", status: response.status, message: messageForStatus(response.status) });
  }

  try {
    const data = (await response.json()) as TRes;
    return ok(data);
  } catch {
    return err({ kind: "invalid_response", status: response.status, message: "Received an unreadable response." });
  }
}

function parseDrfFieldErrors(body: unknown): DrfFieldErrors | null {
  if (typeof body !== "object" || body === null) return null;
  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.length === 0) return null;
  const result: DrfFieldErrors = {};
  for (const [key, value] of entries) {
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      result[key] = value;
    } else if (typeof value === "string") {
      result[key] = [value];
    } else {
      return null;
    }
  }
  return result;
}

export const isNotFound = _isNotFound;
