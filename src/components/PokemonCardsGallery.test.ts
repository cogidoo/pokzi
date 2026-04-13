import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PokemonCardsGallery from './PokemonCardsGallery.svelte';

const cards = [
  {
    id: 'a',
    name: 'Glumanda',
    setName: 'Schwert & Schild',
    number: '001/202',
    imageUrl: 'https://img/a.png',
  },
  {
    id: 'b',
    name: 'Glumanda',
    setName: 'Karmesin & Purpur',
    number: '004/198',
    imageUrl: 'https://img/b.png',
  },
];

describe('PokemonCardsGallery', () => {
  it('renders the success gallery with cards and scroll controls', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    expect(screen.getByRole('heading', { name: 'Karten' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Glumanda')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Vorherige Karten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nächste Karten' })).toBeInTheDocument();
  });

  it('hides scroll controls when only one card exists', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [cards[0]],
      galleryState: 'success',
    });

    expect(screen.queryByRole('button', { name: 'Vorherige Karten' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nächste Karten' })).not.toBeInTheDocument();
  });

  it('uses reduced motion settings when scrolling cards', async () => {
    const scrollBy = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const proto = HTMLElement.prototype as HTMLElement & {
      scrollBy?: typeof scrollBy;
    };
    const originalScrollBy = proto.scrollBy;

    vi.stubGlobal('matchMedia', matchMedia);
    Object.defineProperty(proto, 'scrollBy', {
      configurable: true,
      value: scrollBy,
    });

    try {
      render(PokemonCardsGallery, {
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'success',
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Nächste Karten' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Vorherige Karten' }));

      expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      expect(scrollBy).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(proto, 'scrollBy', {
        configurable: true,
        value: originalScrollBy,
      });
    }
  });

  it('uses smooth scrolling by default when reduced motion is not requested', async () => {
    const scrollBy = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const proto = HTMLElement.prototype as HTMLElement & {
      scrollBy?: typeof scrollBy;
    };
    const originalScrollBy = proto.scrollBy;

    vi.stubGlobal('matchMedia', matchMedia);
    Object.defineProperty(proto, 'scrollBy', {
      configurable: true,
      value: scrollBy,
    });

    try {
      render(PokemonCardsGallery, {
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'success',
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Nächste Karten' }));

      expect(scrollBy).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        }),
      );
    } finally {
      Object.defineProperty(proto, 'scrollBy', {
        configurable: true,
        value: originalScrollBy,
      });
    }
  });

  it('falls back cleanly when matchMedia is unavailable', () => {
    const originalMatchMedia = window.matchMedia;

    // jsdom allows deleting this API to simulate older browser environments.
    Reflect.deleteProperty(window, 'matchMedia');

    try {
      render(PokemonCardsGallery, {
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'success',
      });

      expect(screen.getByRole('heading', { name: 'Karten' })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('shows the loading skeleton', () => {
    const { container } = render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      galleryState: 'loading',
    });

    expect(screen.getByLabelText('Karten werden geladen')).toBeInTheDocument();
    expect(container.querySelectorAll('.cards-gallery__skeleton')).toHaveLength(3);
  });

  it('renders empty state copy', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      galleryState: 'empty',
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText('Dazu wurden gerade keine deutschen Karten gefunden.'),
    ).toBeInTheDocument();
  });

  it('renders error state and forwards retry intent', async () => {
    const onRetry = vi.fn();
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      galleryState: 'error',
      onRetry,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error state without a retry button when no handler is provided', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      galleryState: 'error',
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).not.toBeInTheDocument();
  });

  it('keeps refreshing cards visible and shows a refresh badge', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'refreshing',
    });

    expect(screen.getByText('Wird aktualisiert')).toBeInTheDocument();
    expect(screen.getAllByAltText('Glumanda')).toHaveLength(2);
  });

  it('opens the fullscreen viewer when a card is selected', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
      }),
    );

    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ansicht schließen' })).toHaveLength(2);
    expect(screen.getByText('Schließen')).toBeInTheDocument();
  });

  it('advances the fullscreen viewer to the next ordered card', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'a',
          name: 'Glumanda',
          setName: 'Schwert & Schild',
          number: '001/202',
          imageUrl: 'https://img/a.png',
        },
        {
          id: 'b',
          name: 'Glutexo',
          setName: 'Karmesin & Purpur',
          number: '002/198',
          imageUrl: 'https://img/b.png',
        },
      ],
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
      }),
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }));

    expect(screen.getByRole('dialog', { name: 'Karte Glutexo' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog', { name: 'Karte Glutexo' })).getByRole('img', {
        name: 'Glutexo',
      }),
    ).toBeInTheDocument();
  });

  it('closes the fullscreen viewer from the close button and backdrop', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
      }),
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });
    await fireEvent.click(closeButtons[1]);
    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
      }),
    );

    const backdropButton = screen.getAllByRole('button', { name: 'Ansicht schließen' })[0];
    await fireEvent.click(backdropButton);
    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();
  });

  it('sorts cards without images after image-backed cards', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'missing',
          name: 'Glumanda',
          setName: 'Promo',
          number: '099',
          imageUrl: null,
        },
        cards[0],
      ],
      galleryState: 'success',
    });

    const buttons = screen.getAllByRole('button', { name: /öffnen$/ });
    expect(buttons[0]).toHaveAttribute(
      'aria-label',
      'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
    );
    expect(screen.getByText('Kein Bild')).toBeInTheDocument();
  });

  it('keeps the viewer stable when the gallery shrinks while a card is open', async () => {
    const view = render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Karmesin & Purpur, Nr. 004/198 öffnen',
      }),
    );

    await view.rerender({
      pokemonName: 'Glumanda',
      cards: [cards[0]],
      galleryState: 'success',
    });

    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();
    expect(screen.getByText('Karte 1 von 1')).toBeInTheDocument();
  });

  it('closes the viewer when the gallery becomes empty', async () => {
    const view = render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen',
      }),
    );

    await view.rerender({
      pokemonName: 'Glumanda',
      cards: [],
      galleryState: 'success',
    });

    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();
  });
});
