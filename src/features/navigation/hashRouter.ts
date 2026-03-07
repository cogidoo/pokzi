/**
 * Minimal app route model driven by hash URLs.
 */
export type AppRoute = { kind: 'search' } | { kind: 'detail'; id: number };

/**
 * Browser history marker for detail pages opened from search results.
 */
export interface DetailHistoryState {
  source: 'results';
}

const SEARCH_HASH = '#/';
const DETAIL_HASH_PATTERN = /^#\/pokemon\/(\d+)\/?$/;

/**
 * Parses a browser hash into the app route model.
 *
 * @param hash - Current location hash string.
 * @returns Parsed route with search fallback.
 */
export function parseRoute(hash: string): AppRoute {
  const match = DETAIL_HASH_PATTERN.exec(hash);
  if (!match) {
    return { kind: 'search' };
  }

  const id = Number(match[1]);
  if (!Number.isFinite(id) || id < 1) {
    return { kind: 'search' };
  }

  return { kind: 'detail', id };
}

/**
 * Creates a detail hash URL for one Pokemon.
 *
 * @param id - Pokemon id.
 * @returns Hash-only detail URL.
 */
export function detailHash(id: number): string {
  return `#/pokemon/${String(id)}`;
}

/**
 * Builds the root search URL.
 *
 * @returns Hash URL for search screen.
 */
export function searchUrl(): string {
  return SEARCH_HASH;
}

/**
 * Reads whether a history event was opened from result cards.
 *
 * @param state - Popstate payload.
 * @returns True when the payload marks result-origin navigation.
 */
export function wasOpenedFromResults(state: unknown): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  return 'source' in state && (state as { source?: unknown }).source === 'results';
}
