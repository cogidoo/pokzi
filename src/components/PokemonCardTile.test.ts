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

  it('shows a compact inline price chip inside the existing metadata area', () => {
    render(PokemonCardTile, {
      card: {
        id: 'swsh1-002',
        name: 'Glumanda',
        setName: 'Schwert & Schild',
        number: '002/202',
        imageUrl: 'https://img/card.png',
        price: {
          amount: 12.5,
          currency: 'EUR',
          provider: 'cardmarket',
          label: 'Cardmarket',
        },
      },
    });

    expect(screen.getByText('Schwert & Schild')).toBeInTheDocument();
    expect(screen.getByText('Nr. 002/202')).toBeInTheDocument();
    expect(screen.getByLabelText(/Preis laut Cardmarket: 12,50/u)).toBeInTheDocument();
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

  it('shows an image-language badge when the visible card image differs from the card language', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-004',
        language: 'de',
        imageLanguage: 'en',
        name: 'Sharpedo',
        setName: 'Double Crisis',
        number: '21',
        imageUrl: 'https://img/card.png',
      },
    });

    expect(screen.getByText('Bild 🇬🇧')).toBeInTheDocument();
  });

  it('shows the Japanese image-language badge when the image fallback is Japanese', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-005',
        language: 'en',
        imageLanguage: 'ja',
        name: 'Sharpedo',
        setName: 'Double Crisis',
        number: '22',
        imageUrl: 'https://img/card-ja.png',
      },
    });

    expect(screen.getByText('Bild 🇯🇵')).toBeInTheDocument();
  });

  it('shows the German image-language badge when an English card uses a German image fallback', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-006',
        language: 'en',
        imageLanguage: 'de',
        name: 'Sharpedo',
        setName: 'Double Crisis',
        number: '23',
        imageUrl: 'https://img/card-de.png',
      },
    });

    expect(screen.getByText('Bild 🇩🇪')).toBeInTheDocument();
  });

  it('hides the image-language badge when card text and image already use the same language', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-007',
        language: 'de',
        imageLanguage: 'de',
        name: 'Sharpedo',
        setName: 'Double Crisis',
        number: '24',
        imageUrl: 'https://img/card-de.png',
      },
    });

    expect(screen.queryByText(/Bild/)).not.toBeInTheDocument();
  });

  it('falls back to a neutral flag when an unknown image language slips through', () => {
    render(PokemonCardTile, {
      card: {
        id: 'xy1-008',
        language: 'de',
        imageLanguage: 'ko' as never,
        name: 'Sharpedo',
        setName: 'Double Crisis',
        number: '25',
        imageUrl: 'https://img/card-ko.png',
      },
    });

    expect(screen.getByText('Bild 🏳️')).toBeInTheDocument();
  });

  it('loads artwork immediately without IntersectionObserver and falls back cleanly on image errors', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    try {
      render(PokemonCardTile, {
        card: {
          id: 'sv1-005',
          name: 'Glumanda',
          setName: 'Karmesin & Purpur',
          number: '005/198',
          imageUrl: 'https://img/card.png',
        },
      });

      const image = screen.getByRole('img', { name: 'Glumanda' });
      expect(image).toBeInTheDocument();

      image.dispatchEvent(new Event('error'));
      await waitFor(() => {
        expect(screen.queryByRole('img', { name: 'Glumanda' })).not.toBeInTheDocument();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('removes the loading treatment once the tile image finished loading', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    try {
      render(PokemonCardTile, {
        card: {
          id: 'sv1-006',
          name: 'Glumanda',
          setName: 'Karmesin & Purpur',
          number: '006/198',
          imageUrl: 'https://img/card.png',
        },
      });

      const image = screen.getByRole('img', { name: 'Glumanda' });
      expect(image.className).toContain('cards-tile__image--loading');

      image.dispatchEvent(new Event('load'));
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Glumanda' }).className).not.toContain(
          'cards-tile__image--loading',
        );
      });
    } finally {
      vi.unstubAllGlobals();
    }
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
