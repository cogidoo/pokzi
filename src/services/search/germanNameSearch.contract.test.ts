import { describe, expect, it, vi } from 'vitest';
import {
  createGermanNameSearchIndex,
  normalizeQuery,
  normalizeToleranceText,
  type BaseSpeciesIndexItem,
  type GermanPokemonIndexItem,
} from './germanNameSearch';

function species(ids: number[]): BaseSpeciesIndexItem[] {
  return ids.map((id) => ({ id, pokemonName: `pokemon-${String(id)}` }));
}

function entry(id: number, germanName: string): GermanPokemonIndexItem {
  return {
    id,
    germanName,
    germanNameToleranceKey: normalizeToleranceText(germanName),
  };
}

describe('germanNameSearch helpers', () => {
  it('normalizes tolerant german text variants', () => {
    expect(normalizeToleranceText(' Flußel ')).toBe('flussel');
    expect(normalizeToleranceText('ÄÖÜ')).toBe('aeoeue');
  });

  it('normalizes plain query text', () => {
    expect(normalizeQuery('  PiKaChU  ')).toBe('pikachu');
  });
});

describe('createGermanNameSearchIndex', () => {
  it('returns exact matches before partial matches', async () => {
    const fetchSpeciesIndex = vi.fn().mockResolvedValue(species([1, 2]));
    const fetchGermanIndexItem = vi.fn((item: BaseSpeciesIndexItem) => {
      if (item.id === 1) {
        return Promise.resolve(entry(1, 'Pikachu'));
      }
      return Promise.resolve(entry(2, 'Pikadings'));
    });

    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex,
        fetchGermanIndexItem,
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    const results = await index.findGermanMatches('pika');

    expect(results.map((result) => result.item.germanName)).toEqual(['Pikachu', 'Pikadings']);
    expect(results[0]?.quality).toBe('partial');
    expect(results[1]?.quality).toBe('partial');
  });

  it('returns exact quality for normalized exact match', async () => {
    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex: () => Promise.resolve(species([1])),
        fetchGermanIndexItem: () => Promise.resolve(entry(1, 'Flußel')),
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    const [result] = await index.findGermanMatches('flussel');

    expect(result.item.germanName).toBe('Flußel');
    expect(result.quality).toBe('exact');
  });

  it('falls back to tolerant ranking by distance then alphabetically', async () => {
    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex: () => Promise.resolve(species([1, 2, 3])),
        fetchGermanIndexItem: (item) => {
          if (item.id === 1) {
            return Promise.resolve(entry(1, 'Mirabu'));
          }
          if (item.id === 2) {
            return Promise.resolve(entry(2, 'Morybu'));
          }
          return Promise.resolve(entry(3, 'Murabu'));
        },
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    const results = await index.findGermanMatches('marabu');

    expect(results.map((result) => result.item.germanName)).toEqual(['Mirabu', 'Murabu', 'Morybu']);
    expect(results.every((result) => result.quality === 'tolerant')).toBe(true);
  });

  it('reuses localized cache between calls', async () => {
    const fetchSpeciesIndex = vi.fn().mockResolvedValue(species([1]));
    const fetchGermanIndexItem = vi.fn().mockResolvedValue(entry(1, 'Pikachu'));

    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex,
        fetchGermanIndexItem,
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    await index.findGermanMatches('pika');
    await index.findGermanMatches('pikachu');

    expect(fetchSpeciesIndex).toHaveBeenCalledTimes(2);
    expect(fetchGermanIndexItem).toHaveBeenCalledTimes(1);
  });

  it('skips entries without german localization', async () => {
    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex: () => Promise.resolve(species([1])),
        fetchGermanIndexItem: () => Promise.resolve(null),
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    await expect(index.findGermanMatches('pik')).resolves.toEqual([]);
  });

  it('skips tolerant candidates when length gap exceeds max distance', async () => {
    const index = createGermanNameSearchIndex(
      {
        fetchSpeciesIndex: () => Promise.resolve(species([1])),
        fetchGermanIndexItem: () => Promise.resolve(entry(1, 'abc')),
      },
      {
        searchResultLimit: 20,
        indexRequestConcurrency: 4,
        indexScanBatchSize: 20,
        maxBatchesAfterExactMatch: 2,
      },
    );

    await expect(index.findGermanMatches('abcdefghij')).resolves.toEqual([]);
  });
});
