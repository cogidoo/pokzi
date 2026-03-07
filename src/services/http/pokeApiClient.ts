import { throwIfAborted } from '../utils/async';

const REQUEST_TIMEOUT_MS = 6000;

/**
 * Stable error categories exposed by the Pokemon API client.
 */
export type SearchPokemonErrorCode = 'timeout' | 'network' | 'server';

/**
 * Domain error used by UI code to show meaningful feedback.
 */
export class SearchPokemonError extends Error {
  readonly code: SearchPokemonErrorCode;
  readonly status?: number;

  /**
   * Creates a typed search error with optional HTTP status context.
   *
   * @param code - Internal error category.
   * @param message - Human-readable error text.
   * @param status - Optional HTTP status code.
   */
  constructor(code: SearchPokemonErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SearchPokemonError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Internal marker error for non-5xx HTTP failures.
 */
export class HttpStatusError extends Error {
  readonly status: number;

  /**
   * Creates an internal HTTP status marker error.
   *
   * @param status - HTTP response status code.
   */
  constructor(status: number) {
    super(`Request failed: ${String(status)}`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

/**
 * Runtime type guard for search-domain errors.
 *
 * @param error - Unknown thrown value.
 * @returns True when the value is a `SearchPokemonError`.
 */
export function isSearchPokemonError(error: unknown): error is SearchPokemonError {
  return error instanceof SearchPokemonError;
}

/**
 * Narrowing helper for internal HTTP status errors.
 *
 * @param error - Unknown thrown value.
 * @param status - Optional expected status code.
 * @returns True when the error matches `HttpStatusError`.
 */
export function isHttpStatusError(error: unknown, status?: number): error is HttpStatusError {
  if (!(error instanceof HttpStatusError)) {
    return false;
  }

  if (status === undefined) {
    return true;
  }

  return error.status === status;
}

/**
 * Detects explicit abort errors thrown by fetch/AbortSignal.
 *
 * @param error - Unknown thrown value.
 * @returns True when the error represents an abort.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Detects timeout-style DOM exceptions.
 *
 * @param error - Unknown thrown value.
 * @returns True when the error represents a timeout.
 */
function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout'))
  );
}

/**
 * Builds a timeout-aware signal that also honors caller cancellation.
 *
 * @param signal - Optional upstream abort signal.
 * @returns Combined abort signal for the request.
 */
function withTimeout(signal: AbortSignal | undefined): AbortSignal {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

/**
 * Fetches JSON and maps transport errors to domain errors.
 *
 * @param url - Absolute endpoint URL.
 * @param signal - Optional cancellation signal.
 * @returns Parsed JSON payload typed as `T`.
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);

  let response: Response;

  try {
    response = await fetch(url, { signal: withTimeout(signal) });
  } catch (error) {
    if (isAbortError(error) && signal?.aborted) {
      throw error;
    }

    if (isTimeoutError(error) || isAbortError(error)) {
      throw new SearchPokemonError('timeout', 'Anfrage hat zu lange gedauert.');
    }

    throw new SearchPokemonError('network', 'Netzwerkfehler bei der Anfrage.');
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new SearchPokemonError(
        'server',
        `Request failed: ${String(response.status)}`,
        response.status,
      );
    }

    throw new HttpStatusError(response.status);
  }

  return response.json() as Promise<T>;
}
