import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HttpStatusError,
  SearchPokemonError,
  fetchJson,
  isAbortError,
  isHttpStatusError,
  isSearchPokemonError,
} from './pokeApiClient';

function asResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('pokeApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns parsed json for successful responses', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({ value: 42 }));

    await expect(fetchJson<{ value: number }>('https://api.test/ping')).resolves.toEqual({
      value: 42,
    });
  });

  it('maps 5xx responses to SearchPokemonError(server)', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 500));

    await expect(fetchJson('https://api.test/ping')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'server',
      status: 500,
    });
  });

  it('throws HttpStatusError for non-5xx responses', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 404));

    await expect(fetchJson('https://api.test/ping')).rejects.toMatchObject({
      name: 'HttpStatusError',
      status: 404,
    });
  });

  it('maps generic fetch failures to SearchPokemonError(network)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('socket hang up'));

    await expect(fetchJson('https://api.test/ping')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'network',
    });
  });

  it('maps timeout errors to SearchPokemonError(timeout)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));

    await expect(fetchJson('https://api.test/ping')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'timeout',
    });
  });

  it('maps non-user aborts to SearchPokemonError(timeout)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(fetchJson('https://api.test/ping')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'timeout',
    });
  });

  it('keeps caller abort as AbortError without network call', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(fetchJson('https://api.test/ping', abortController.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('exposes stable runtime type guards', () => {
    const searchError = new SearchPokemonError('server', 'boom', 500);
    const statusError = new HttpStatusError(404);
    const abortError = new DOMException('Aborted', 'AbortError');

    expect(isSearchPokemonError(searchError)).toBe(true);
    expect(isSearchPokemonError(new Error('boom'))).toBe(false);

    expect(isHttpStatusError(statusError)).toBe(true);
    expect(isHttpStatusError(statusError, 404)).toBe(true);
    expect(isHttpStatusError(statusError, 500)).toBe(false);
    expect(isHttpStatusError(searchError)).toBe(false);

    expect(isAbortError(abortError)).toBe(true);
    expect(isAbortError(new Error('boom'))).toBe(false);
  });
});
