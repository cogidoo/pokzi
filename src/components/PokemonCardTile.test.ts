import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PokemonCardTile from './PokemonCardTile.svelte';

describe('PokemonCardTile', () => {
  it('renders card artwork and metadata', () => {
    render(PokemonCardTile, {
      card: {
        id: 'swsh1-001',
        name: 'Glumanda',
        setName: 'Schwert & Schild',
        number: '001/202',
        imageUrl: 'https://img/card.png',
      },
    });

    expect(screen.getByRole('img', { name: 'Glumanda' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Glumanda' })).toBeInTheDocument();
    expect(screen.getByText('Schwert & Schild')).toBeInTheDocument();
    expect(screen.getByText('Nr. 001/202')).toBeInTheDocument();
  });

  it('shows fallback content when artwork is missing', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-004',
        name: 'Glurak',
        setName: 'XY',
        number: '004/108',
        imageUrl: null,
      },
    });

    expect(screen.getByText('Kein Bild')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Glurak' })).toBeInTheDocument();
  });

  it('waits for intersection before loading artwork when observer support is available', async () => {
    let intersectionCallback: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersectionCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    try {
      const view = render(PokemonCardTile, {
        card: {
          id: 'sv1-004',
          name: 'Glumanda',
          setName: 'Karmesin & Purpur',
          number: '004/198',
          imageUrl: 'https://img/card.png',
        },
      });

      expect(screen.queryByRole('img', { name: 'Glumanda' })).not.toBeInTheDocument();
      expect(observe).toHaveBeenCalledTimes(1);

      intersectionCallback?.([{ isIntersecting: false }]);
      expect(screen.queryByRole('img', { name: 'Glumanda' })).not.toBeInTheDocument();

      intersectionCallback?.([{ isIntersecting: true }]);
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Glumanda' })).toBeInTheDocument();
      });
      expect(disconnect).toHaveBeenCalledTimes(1);

      view.unmount();
      expect(disconnect).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
