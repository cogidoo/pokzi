import { describe, expect, it } from 'vitest';
import { detailHash, parseRoute, searchUrl, wasOpenedFromResults } from './hashRouter';

describe('hashRouter', () => {
  it('parses search route as fallback', () => {
    expect(parseRoute('')).toEqual({ kind: 'search' });
    expect(parseRoute('#/unknown')).toEqual({ kind: 'search' });
  });

  it('parses detail route with valid id', () => {
    expect(parseRoute('#/pokemon/25')).toEqual({ kind: 'detail', id: 25 });
    expect(parseRoute('#/pokemon/25/')).toEqual({ kind: 'detail', id: 25 });
  });

  it('falls back to search for invalid detail ids', () => {
    expect(parseRoute('#/pokemon/0')).toEqual({ kind: 'search' });
    expect(parseRoute('#/pokemon/not-a-number')).toEqual({ kind: 'search' });
  });

  it('builds stable hash urls', () => {
    expect(detailHash(7)).toBe('#/pokemon/7');
    expect(searchUrl()).toBe('#/');
  });

  it('detects result-origin history state safely', () => {
    expect(wasOpenedFromResults({ source: 'results' })).toBe(true);
    expect(wasOpenedFromResults({ source: 'other' })).toBe(false);
    expect(wasOpenedFromResults(null)).toBe(false);
    expect(wasOpenedFromResults('results')).toBe(false);
  });
});
