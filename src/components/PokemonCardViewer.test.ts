import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PokemonCardViewer from './PokemonCardViewer.svelte';

const cards = [
  {
    id: 'a',
    name: 'Glumanda',
    setName: 'Schwert & Schild',
    number: '001/202',
    imageUrl: 'https://img/a/low.webp',
  },
  {
    id: 'b',
    name: 'Glutexo',
    setName: 'Karmesin & Purpur',
    number: '002/198',
    imageUrl: null,
  },
];

describe('PokemonCardViewer', () => {
  it('renders the selected card and upgrades the image URL for fullscreen viewing', () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      availableLanguages: ['de', 'en'],
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('dialog', { name: 'Karte Glumanda' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Glumanda' })).toHaveAttribute(
      'src',
      'https://img/a/high.webp',
    );
  });

  it('shows a clear loading state until the fullscreen image finishes loading', async () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Karte wird geladen...')).toBeInTheDocument();

    await fireEvent.load(screen.getByRole('img', { name: 'Glumanda' }));

    expect(screen.queryByText('Karte wird geladen...')).not.toBeInTheDocument();
  });

  it('renders language controls, hides text labels, and switches language only for the current card', async () => {
    render(PokemonCardViewer, {
      cards: [
        {
          ...cards[0],
          language: 'en',
          availableLanguages: ['en', 'ja'],
          variants: {
            en: {
              language: 'en',
              name: 'Charmander',
              setName: 'Base Set',
              number: '001/102',
              imageUrl: 'https://img/a/low.webp',
              imageLanguage: 'en',
            },
            ja: {
              language: 'ja',
              name: 'ヒトカゲ',
              setName: 'ベースセット',
              number: '001/102',
              imageUrl: 'https://img/a-ja/low.webp',
              imageLanguage: 'ja',
            },
          },
        },
        {
          ...cards[1],
          language: 'de',
          availableLanguages: ['de', 'en'],
          variants: {
            de: {
              language: 'de',
              name: 'Glutexo',
              setName: 'Karmesin & Purpur',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
            en: {
              language: 'en',
              name: 'Charmeleon',
              setName: 'Scarlet & Violet',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
          },
        },
      ],
      currentIndex: 0,
      availableLanguages: ['de', 'en', 'ja'],
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('radiogroup', { name: 'Sprache der Karte' })).toBeInTheDocument();
    expect(screen.queryByText('Deutsch')).not.toBeInTheDocument();
    expect(screen.queryByText('Englisch')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Deutsch anzeigen' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Japanisch anzeigen' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await fireEvent.click(screen.getByRole('radio', { name: 'Japanisch anzeigen' }));
    expect(screen.getByRole('heading', { name: 'ヒトカゲ' })).toBeInTheDocument();
  });

  it('resets the modal language to the next card default instead of remembering the previous card choice', async () => {
    const view = render(PokemonCardViewer, {
      cards: [
        {
          ...cards[0],
          language: 'en',
          availableLanguages: ['en', 'ja'],
          variants: {
            en: {
              language: 'en',
              name: 'Charmander',
              setName: 'Base Set',
              number: '001/102',
              imageUrl: 'https://img/a/low.webp',
              imageLanguage: 'en',
            },
            ja: {
              language: 'ja',
              name: 'ヒトカゲ',
              setName: 'ベースセット',
              number: '001/102',
              imageUrl: 'https://img/a-ja/low.webp',
              imageLanguage: 'ja',
            },
          },
        },
        {
          ...cards[1],
          language: 'de',
          availableLanguages: ['de', 'en'],
          variants: {
            de: {
              language: 'de',
              name: 'Glutexo',
              setName: 'Karmesin & Purpur',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
            en: {
              language: 'en',
              name: 'Charmeleon',
              setName: 'Scarlet & Violet',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
          },
        },
      ],
      currentIndex: 0,
      availableLanguages: ['de', 'en', 'ja'],
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    await fireEvent.click(screen.getByRole('radio', { name: 'Japanisch anzeigen' }));
    expect(screen.getByRole('heading', { name: 'ヒトカゲ' })).toBeInTheDocument();

    await view.rerender({
      cards: [
        {
          ...cards[0],
          language: 'en',
          availableLanguages: ['en', 'ja'],
          variants: {
            en: {
              language: 'en',
              name: 'Charmander',
              setName: 'Base Set',
              number: '001/102',
              imageUrl: 'https://img/a/low.webp',
              imageLanguage: 'en',
            },
            ja: {
              language: 'ja',
              name: 'ヒトカゲ',
              setName: 'ベースセット',
              number: '001/102',
              imageUrl: 'https://img/a-ja/low.webp',
              imageLanguage: 'ja',
            },
          },
        },
        {
          ...cards[1],
          language: 'de',
          availableLanguages: ['de', 'en'],
          variants: {
            de: {
              language: 'de',
              name: 'Glutexo',
              setName: 'Karmesin & Purpur',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
            en: {
              language: 'en',
              name: 'Charmeleon',
              setName: 'Scarlet & Violet',
              number: '002/198',
              imageUrl: null,
              imageLanguage: null,
            },
          },
        },
      ],
      currentIndex: 1,
      availableLanguages: ['de', 'en', 'ja'],
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('heading', { name: 'Glutexo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Deutsch anzeigen' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('does not show extra fallback prose in the modal', () => {
    render(PokemonCardViewer, {
      cards: [
        {
          ...cards[0],
          language: 'de',
          imageLanguage: 'en',
          availableLanguages: ['de', 'en'],
        },
      ],
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.queryByText(/Text:/)).not.toBeInTheDocument();
  });

  it('ignores clicks on disabled language buttons', async () => {
    render(PokemonCardViewer, {
      cards: [
        {
          ...cards[0],
          language: 'en',
          availableLanguages: ['en'],
          variants: {
            en: {
              language: 'en',
              name: 'Charmander',
              setName: 'Base Set',
              number: '001/102',
              imageUrl: 'https://img/a/low.webp',
              imageLanguage: 'en',
            },
          },
        },
      ],
      currentIndex: 0,
      availableLanguages: ['de', 'en', 'ja'],
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    await fireEvent.click(screen.getByRole('radio', { name: 'Deutsch anzeigen' }));

    expect(screen.getByRole('heading', { name: 'Charmander' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Englisch anzeigen' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('supports previous and next navigation buttons', async () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('supports previous navigation from later cards', async () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 1,
      onClose: vi.fn(),
      onSelect,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Vorherige Karte' }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('shows a metadata fallback when the current card has no image', () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 1,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument();
    expect(screen.getByText('Glutexo')).toBeInTheDocument();
    expect(screen.getByText('Nr. 002/198')).toBeInTheDocument();
  });

  it('falls back to metadata mode when the fullscreen image errors', async () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    await fireEvent.error(screen.getByRole('img', { name: 'Glumanda' }));

    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument();
    expect(screen.getByText('Schwert & Schild')).toBeInTheDocument();
  });

  it('closes on escape key', async () => {
    const onClose = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose,
      onSelect: vi.fn(),
    });

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports arrow-key navigation and keeps the original image URL when no upgrade applies', async () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards: [
        {
          id: 'a',
          name: 'Glumanda',
          setName: 'Basis',
          number: '001',
          imageUrl: 'https://img/a.png',
        },
        cards[1],
      ],
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect,
    });

    expect(screen.getByRole('img', { name: 'Glumanda' })).toHaveAttribute(
      'src',
      'https://img/a.png',
    );

    await fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith(1);

    await fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not advance past the last card on ArrowRight', async () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 1,
      onClose: vi.fn(),
      onSelect,
    });

    await fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('supports swipe navigation and ignores incomplete swipe gestures', async () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect,
    });

    const stage = screen.getByRole('group', { name: 'Kartenansicht' });

    await fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 10 }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    await fireEvent.touchStart(stage, {
      touches: [{ clientX: 120 }],
    });
    await fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 40 }],
    });
    expect(onSelect).toHaveBeenCalledWith(1);

    onSelect.mockClear();

    await fireEvent.touchStart(stage, {
      touches: [{ clientX: 120 }],
    });
    await fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 100 }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    onSelect.mockClear();

    const previousView = render(PokemonCardViewer, {
      cards,
      currentIndex: 1,
      onClose: vi.fn(),
      onSelect,
    });

    const previousStage = screen.getAllByRole('group', { name: 'Kartenansicht' })[1];
    await fireEvent.touchStart(previousStage, {
      touches: [{ clientX: 40 }],
    });
    await fireEvent.touchEnd(previousStage, {
      changedTouches: [{ clientX: 120 }],
    });
    expect(onSelect).toHaveBeenCalledWith(0);

    previousView.unmount();
  });

  it('reads touch coordinates from item-based touch lists and ignores null touches', () => {
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect,
    });

    const stage = screen.getByRole('group', { name: 'Kartenansicht' });

    const swipeStart = new Event('touchstart', { bubbles: true });
    Object.defineProperty(swipeStart, 'touches', {
      value: {
        item: () => ({ clientX: 140 }),
      },
    });
    stage.dispatchEvent(swipeStart);

    const swipeEnd = new Event('touchend', { bubbles: true });
    Object.defineProperty(swipeEnd, 'changedTouches', {
      value: {
        item: () => ({ clientX: 80 }),
      },
    });
    stage.dispatchEvent(swipeEnd);

    expect(onSelect).toHaveBeenCalledWith(1);

    onSelect.mockClear();

    const incompleteStart = new Event('touchstart', { bubbles: true });
    Object.defineProperty(incompleteStart, 'touches', {
      value: {
        item: () => null,
      },
    });
    stage.dispatchEvent(incompleteStart);

    const incompleteEnd = new Event('touchend', { bubbles: true });
    Object.defineProperty(incompleteEnd, 'changedTouches', {
      value: {
        item: () => ({ clientX: 80 }),
      },
    });
    stage.dispatchEvent(incompleteEnd);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('moves focus into the viewer and traps tab navigation inside it', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    document.body.append(opener);
    opener.focus();

    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });
    const nextButton = screen.getByRole('button', { name: 'Nächste Karte' });

    expect(closeButtons[1]).toHaveFocus();

    await fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(nextButton).toHaveFocus();

    opener.remove();
  });

  it('skips focus trapping when the viewer temporarily has no focusable controls', async () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const dialog = screen.getByRole('dialog', { name: 'Karte Glumanda' });
    const closeButton = screen.getAllByRole('button', { name: 'Ansicht schließen' })[1];
    const querySelectorAllSpy = vi
      .spyOn(dialog, 'querySelectorAll')
      .mockReturnValue([] as unknown as NodeListOf<HTMLElement>);

    try {
      await fireEvent.keyDown(window, { key: 'Tab' });
      expect(closeButton).toHaveFocus();
    } finally {
      querySelectorAllSpy.mockRestore();
    }
  });

  it('wraps focus forward to the first control when tabbing from the last control', async () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const nextButton = screen.getByRole('button', { name: 'Nächste Karte' });
    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });

    nextButton.focus();
    await fireEvent.keyDown(window, { key: 'Tab' });

    expect(closeButtons[1]).toHaveFocus();
  });

  it('keeps focus order natural when tabbing from middle controls', async () => {
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });
    const nextButton = screen.getByRole('button', { name: 'Nächste Karte' });

    closeButtons[1].focus();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButtons[1]).toHaveFocus();

    nextButton.focus();
    await fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(nextButton).toHaveFocus();
  });

  it('ignores unrelated keyboard input', async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose,
      onSelect,
    });

    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('restores focus to the opener when the viewer unmounts', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    document.body.append(opener);
    opener.focus();

    const view = render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    view.unmount();
    expect(opener).toHaveFocus();

    opener.remove();
  });

  it('closes from both backdrop and close button', async () => {
    const onClose = vi.fn();
    render(PokemonCardViewer, {
      cards,
      currentIndex: 0,
      onClose,
      onSelect: vi.fn(),
    });

    const closeButtons = screen.getAllByRole('button', { name: 'Ansicht schließen' });
    await fireEvent.click(closeButtons[0]);
    await fireEvent.click(closeButtons[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('falls back gracefully when no current card is available', async () => {
    render(PokemonCardViewer, {
      cards: [],
      currentIndex: 0,
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('dialog', { name: 'Karte Karte' })).toBeInTheDocument();
    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('dialog', { name: 'Karte Karte' })).toBeInTheDocument();
  });
});
