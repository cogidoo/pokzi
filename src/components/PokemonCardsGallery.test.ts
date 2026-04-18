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
    expect(screen.getByLabelText('2 Karten gefunden')).toBeInTheDocument();
    expect(screen.getAllByAltText('Glumanda')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Vorherige Karten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nächste Karten' })).toBeInTheDocument();
  });

  it('shows a visible badge when the card image uses another language than the text', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          ...cards[0],
          language: 'de',
          imageLanguage: 'en',
        },
      ],
      galleryState: 'success',
    });

    expect(screen.getByText('Bild 🇬🇧')).toBeInTheDocument();
  });

  it('does not show a text-language badge in the gallery when a fallback card is used', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          ...cards[0],
          language: 'en',
          imageLanguage: 'en',
        },
      ],
      galleryState: 'success',
    });

    expect(screen.queryByText('Text 🇬🇧')).not.toBeInTheDocument();
  });

  it('sorts cards in German-first order, then English, then Japanese', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'fallback-ja',
          language: 'ja',
          imageLanguage: 'ja',
          name: 'Fallback Ja',
          setName: 'Set D',
          number: '004',
          imageUrl: 'https://img/d.png',
        },
        {
          id: 'fallback-text',
          language: 'en',
          imageLanguage: 'en',
          name: 'Fallback Text',
          setName: 'Set C',
          number: '003',
          imageUrl: 'https://img/c.png',
        },
        {
          id: 'exact-match',
          language: 'de',
          imageLanguage: 'de',
          name: 'Exact Match',
          setName: 'Set A',
          number: '001',
          imageUrl: 'https://img/a.png',
        },
        {
          id: 'image-fallback',
          language: 'de',
          imageLanguage: 'en',
          name: 'Image Fallback',
          setName: 'Set B',
          number: '002',
          imageUrl: 'https://img/b.png',
        },
      ],
      galleryState: 'success',
    });

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings).toEqual(['Exact Match', 'Image Fallback', 'Fallback Text', 'Fallback Ja']);
  });

  it('keeps the same card open when the gallery language changes and cards reorder', async () => {
    const view = render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'fallback-text',
          language: 'en',
          imageLanguage: 'en',
          name: 'Fallback Text',
          setName: 'Set C',
          number: '003',
          imageUrl: 'https://img/c.png',
        },
        {
          id: 'exact-match',
          language: 'de',
          imageLanguage: 'de',
          name: 'Exact Match',
          setName: 'Set A',
          number: '001',
          imageUrl: 'https://img/a.png',
        },
      ],
      galleryState: 'success',
      availableLanguages: ['de', 'en'],
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Fallback Text aus Set C, Nr. 003 öffnen' }),
    );
    expect(screen.getByRole('dialog', { name: 'Karte Fallback Text' })).toBeInTheDocument();

    await view.rerender({
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'fallback-text',
          language: 'en',
          imageLanguage: 'en',
          name: 'Fallback Text',
          setName: 'Set C',
          number: '003',
          imageUrl: 'https://img/c.png',
        },
        {
          id: 'exact-match',
          language: 'en',
          imageLanguage: 'en',
          name: 'Exact Match',
          setName: 'Set A',
          number: '001',
          imageUrl: 'https://img/a.png',
        },
      ],
      galleryState: 'success',
      availableLanguages: ['de', 'en'],
    });

    expect(screen.getByRole('dialog', { name: 'Karte Fallback Text' })).toBeInTheDocument();
  });

  it('lets children browse to the next card inside the fullscreen viewer', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen' }),
    );
    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }));

    const dialog = screen.getByRole('dialog', { name: 'Karte Glumanda' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Karmesin & Purpur')).toBeInTheDocument();
    expect(within(dialog).getByText('Nr. 004/198')).toBeInTheDocument();
  });

  it('closes the fullscreen viewer again from the close action', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Glumanda aus Schwert & Schild, Nr. 001/202 öffnen' }),
    );
    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });
    const closeButton = closeButtons[1];
    if (!(closeButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the dialog close button to be rendered.');
    }

    await fireEvent.click(closeButton);

    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();
  });

  it('closes the viewer when the current card disappears from the gallery data', async () => {
    const view = render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Glumanda aus Karmesin & Purpur, Nr. 004/198 öffnen' }),
    );
    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();

    await view.rerender({
      pokemonName: 'Glumanda',
      cards: [cards[0]],
      galleryState: 'success',
    });

    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();
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

  it('resets the gallery back to the start with scrollTo when cards refresh', async () => {
    const scrollTo = vi.fn();
    const proto = HTMLDivElement.prototype as HTMLDivElement & {
      scrollTo?: typeof scrollTo;
    };
    const originalScrollTo = proto.scrollTo;

    Object.defineProperty(proto, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    try {
      const view = render(PokemonCardsGallery, {
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'success',
      });

      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({
          left: 0,
          behavior: 'smooth',
        }),
      );

      await view.rerender({
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'refreshing',
      });

      expect(scrollTo).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(proto, 'scrollTo', {
        configurable: true,
        value: originalScrollTo,
      });
    }
  });

  it('uses auto scrolling for gallery reset when reduced motion is requested', () => {
    const scrollTo = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const proto = HTMLDivElement.prototype as HTMLDivElement & {
      scrollTo?: typeof scrollTo;
    };
    const originalScrollTo = proto.scrollTo;

    vi.stubGlobal('matchMedia', matchMedia);
    Object.defineProperty(proto, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    try {
      render(PokemonCardsGallery, {
        pokemonName: 'Glumanda',
        cards,
        galleryState: 'success',
      });

      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({
          left: 0,
          behavior: 'auto',
        }),
      );
    } finally {
      Object.defineProperty(proto, 'scrollTo', {
        configurable: true,
        value: originalScrollTo,
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
    expect(screen.getByText('Dazu wurden gerade keine Karten gefunden.')).toBeInTheDocument();
  });

  it('does not render helper text, grouping chips, or a gallery language switch', () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards,
      galleryState: 'success',
      availableLanguages: ['de', 'en', 'ja'],
    });

    expect(screen.queryByRole('radiogroup', { name: 'Karten-Sprache' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Karten-Gruppen')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Deutsch zuerst. Mehr Sprachen gibt es in der großen Kartenansicht.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('🌍 Mehr Karten')).not.toBeInTheDocument();
  });

  it('opens fallback cards with their own default modal language', async () => {
    render(PokemonCardsGallery, {
      pokemonName: 'Glumanda',
      cards: [
        {
          id: 'fallback-text',
          language: 'en',
          variants: {
            en: {
              language: 'en',
              name: 'Fallback Text',
              setName: 'Set C',
              number: '003',
              imageUrl: 'https://img/c.png',
              imageLanguage: 'en',
            },
            ja: {
              language: 'ja',
              name: 'フォールバック',
              setName: 'セット C',
              number: '003',
              imageUrl: 'https://img/c-ja.png',
              imageLanguage: 'ja',
            },
          },
          availableLanguages: ['en', 'ja'],
          imageLanguage: 'en',
          name: 'Fallback Text',
          setName: 'Set C',
          number: '003',
          imageUrl: 'https://img/c.png',
        },
      ],
      galleryState: 'success',
      availableLanguages: ['de', 'en', 'ja'],
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Fallback Text aus Set C, Nr. 003 öffnen' }),
    );
    expect(screen.getByRole('radio', { name: 'Englisch anzeigen' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Deutsch anzeigen' })).toBeDisabled();
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

  it('closes the viewer when the currently open card disappears from the gallery', async () => {
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

    expect(screen.queryByRole('dialog', { name: 'Karte Glumanda' })).not.toBeInTheDocument();
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
