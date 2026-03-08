import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonDetail, PokemonSearchResult } from './types/pokemon';

type SearchPokemonFn = (query: string, signal?: AbortSignal) => Promise<PokemonSearchResult[]>;
type FetchPokemonDetailFn = (id: number, signal?: AbortSignal) => Promise<PokemonDetail | null>;
const searchPokemonMock = vi.fn<SearchPokemonFn>();
const fetchPokemonDetailMock = vi.fn<FetchPokemonDetailFn>();

vi.mock('./services/pokemonApi', () => ({
  searchPokemon: (query: string, signal?: AbortSignal) => searchPokemonMock(query, signal),
  fetchPokemonDetail: (id: number, signal?: AbortSignal) => fetchPokemonDetailMock(id, signal),
  isSearchPokemonError: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'isSearchPokemonError' in error &&
    (error as { isSearchPokemonError?: boolean }).isSearchPokemonError === true,
}));

import App from './App.svelte';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Sets the simulated vertical scroll position for jsdom-based scroll tests.
 *
 * @param value - Window scrollY value used by the app scroll listener.
 */
function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
    writable: true,
  });
}

/**
 * Sets document and viewport heights for scrollability edge-case tests.
 *
 * @param scrollHeight - Simulated total page height.
 * @param innerHeight - Simulated viewport height.
 */
function setPageHeights(scrollHeight: number, innerHeight: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(document.body, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeight,
  });
}

/**
 * Dispatches a minimal touch event with one touch point for jsdom interaction tests.
 *
 * @param type - Native touch event type.
 * @param clientY - Vertical touch coordinate.
 */
function dispatchTouch(type: 'touchstart' | 'touchmove', clientY?: number) {
  const event = new Event(type);
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: {
      item: (index: number) =>
        index === 0 && typeof clientY === 'number' ? ({ clientY } as Touch) : null,
    },
  });
  window.dispatchEvent(event);
}

function detailFixture(overrides: Partial<PokemonDetail> = {}): PokemonDetail {
  return {
    id: 25,
    name: 'pikachu',
    displayName: 'Pikachu',
    image: 'https://img/pikachu.png',
    types: [{ name: 'Elektro' }],
    baseHp: 35,
    heightMeters: 0.4,
    weightKilograms: 6,
    category: 'Maus-Pokemon',
    flavorText: 'Ein kurzer deutscher Flavor-Text.',
    evolution: {
      stage: 'Phase 1',
      sharedPath: [
        { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
        {
          id: 25,
          displayName: 'Pikachu',
          image: 'https://img/pikachu.png',
          types: [{ name: 'Elektro' }],
        },
      ],
      branchGroups: [
        {
          originId: 25,
          items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
        },
      ],
    },
    ...overrides,
  };
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchPokemonMock.mockReset();
    fetchPokemonDetailMock.mockReset();
    window.history.pushState({}, '', '/');
    setScrollY(0);
    setPageHeights(1600, 800);
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      expect(vi.getTimerCount()).toBe(0);
    }
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('shows initial empty-state guidance', () => {
    render(App);
    expect(screen.getByText('Suche starten')).toBeInTheDocument();
  });

  it('does not hit API for invalid short text query', async () => {
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), { target: { value: 'p' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Bitte genauer suchen')).toBeInTheDocument();
    });
    expect(searchPokemonMock).not.toHaveBeenCalled();
  });

  it('shows loading then renders result list on success', async () => {
    const pending = deferred<PokemonSearchResult[]>();
    searchPokemonMock.mockReturnValue(pending.promise);

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalled();
    });
    expect(screen.getByText('Pokemon werden geladen...')).toBeInTheDocument();

    pending.resolve([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });
    expect(screen.getByText('#025')).toBeInTheDocument();
    expect(screen.getByText(/Mindestens 2 Buchstaben/)).toBeInTheDocument();
  });

  it('keeps search header expanded at top even when results are visible', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    expect(container.querySelector('.app__search-rail--compact')).not.toBeInTheDocument();
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();
  });

  it('compacts on downward scroll in results and expands again near top', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();
  });

  it('expands from compact state on upward wheel intent when page is no longer scrollable', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    setPageHeights(800, 800);
    window.dispatchEvent(new Event('resize'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();
  });

  it('stays compact on scroll-clamp to top without upward intent in non-scrollable edge case', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    setPageHeights(800, 800);
    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();
  });

  it('keeps compact header on upward wheel intent while page is still scrollable', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();
  });

  it('ignores non-upward wheel and non-upward touch intents in compact mode', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    dispatchTouch('touchstart', 120);
    dispatchTouch('touchmove', 100);
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    dispatchTouch('touchmove');
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    dispatchTouch('touchstart');
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();
  });

  it('expands from compact state on upward touch intent when page is no longer scrollable', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    const { container } = render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });

    setScrollY(80);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    setPageHeights(800, 800);
    window.dispatchEvent(new Event('resize'));
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).toBeInTheDocument();

    dispatchTouch('touchstart', 100);
    dispatchTouch('touchmove', 120);
    await Promise.resolve();
    expect(container.querySelector('.app__header--compact')).not.toBeInTheDocument();
  });

  it('shows tolerant-only hint above results when all matches are tolerant', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 133,
        name: 'eevee',
        displayName: 'Evoli',
        image: 'https://img/evoli.png',
        types: [{ name: 'Normal' }],
        evolutionStage: 'Basis',
        matchQuality: 'tolerant',
      },
    ]);

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'evli' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });
    expect(screen.getByText('Meintest du vielleicht:')).toBeInTheDocument();
  });

  it('hides tolerant-only hint when at least one strong match exists', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
        matchQuality: 'exact',
      },
      {
        id: 26,
        name: 'raichu',
        displayName: 'Raichu',
        image: 'https://img/raichu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 2',
        matchQuality: 'tolerant',
      },
    ]);

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikchu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Meintest du vielleicht:')).not.toBeInTheDocument();
  });

  it('keeps UI bound to latest search when earlier request resolves later', async () => {
    const first = deferred<PokemonSearchResult[]>();
    const second = deferred<PokemonSearchResult[]>();

    searchPokemonMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikipek' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalledTimes(2);
    });

    second.resolve([
      {
        id: 731,
        name: 'pikipek',
        displayName: 'Peppeck',
        image: 'https://img/pikipek.png',
        types: [{ name: 'Flug' }],
        evolutionStage: 'Basis',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('#731')).toBeInTheDocument();
    });

    first.resolve([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);

    await Promise.resolve();

    expect(screen.queryByText('#025')).not.toBeInTheDocument();
    expect(screen.getByText('#731')).toBeInTheDocument();
  });

  it('ignores stale rejected requests after a newer search succeeds', async () => {
    const first = deferred<PokemonSearchResult[]>();
    const second = deferred<PokemonSearchResult[]>();

    searchPokemonMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikipek' },
    });
    vi.advanceTimersByTime(300);

    second.resolve([
      {
        id: 731,
        name: 'pikipek',
        displayName: 'Peppeck',
        image: 'https://img/pikipek.png',
        types: [{ name: 'Flug' }],
        evolutionStage: 'Basis',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('#731')).toBeInTheDocument();
    });

    first.reject(new Error('old failed request'));
    await Promise.resolve();

    expect(screen.queryByText('Etwas ist schiefgelaufen')).not.toBeInTheDocument();
    expect(screen.getByText('#731')).toBeInTheDocument();
  });

  it('shows error state and retry triggers another search', async () => {
    searchPokemonMock.mockRejectedValue(new Error('boom'));
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
    });
    expect(screen.getByText(/Mindestens 2 Buchstaben/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows timeout-specific copy for timeout API errors', async () => {
    searchPokemonMock.mockRejectedValue({
      isSearchPokemonError: true,
      code: 'timeout',
    });
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(
        screen.getByText('Die Suche hat zu lange gedauert. Bitte versuche es erneut.'),
      ).toBeInTheDocument();
    });
  });

  it('shows server-specific copy for server API errors', async () => {
    searchPokemonMock.mockRejectedValue({
      isSearchPokemonError: true,
      code: 'server',
    });
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Der Pokemon-Server antwortet gerade nicht richtig. Bitte versuche es erneut.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('falls back to generic copy for SearchPokemonError without specialized UI mapping', async () => {
    searchPokemonMock.mockRejectedValue({
      isSearchPokemonError: true,
      code: 'network',
    });
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(
        screen.getByText('Pokemon konnten gerade nicht geladen werden. Bitte versuche es erneut.'),
      ).toBeInTheDocument();
    });
  });

  it('submits immediately via Search button', async () => {
    searchPokemonMock.mockResolvedValueOnce([]);
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), { target: { value: '25' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalledWith('25', expect.any(AbortSignal));
    });
  });

  it('ignores AbortError without showing a generic error state', async () => {
    searchPokemonMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalled();
    });
    expect(screen.queryByText('Etwas ist schiefgelaufen')).not.toBeInTheDocument();
  });

  it('re-schedules debounce when query changes quickly', async () => {
    searchPokemonMock.mockResolvedValue([]);
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), { target: { value: 'pi' } });
    vi.advanceTimersByTime(1);
    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), { target: { value: 'pik' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchPokemonMock).toHaveBeenCalledWith('pik', expect.any(AbortSignal));
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('opens detail view when a result card is selected', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      image: 'https://img/pikachu.png',
      types: [{ name: 'Elektro' }],
      baseHp: 35,
      heightMeters: 0.4,
      weightKilograms: 6,
      category: 'Maus-Pokemon',
      flavorText: 'Wenn mehrere dieser POKeMON sich versammeln, entladen sie Strom.',
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
          {
            id: 25,
            displayName: 'Pikachu',
            image: 'https://img/pikachu.png',
            types: [{ name: 'Elektro' }],
          },
        ],
        branchGroups: [
          {
            originId: 25,
            items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
          },
        ],
      },
    });

    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pikachu/i })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: /Pikachu/i }));

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledWith(25, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wichtige Fakten' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('Pokemon wird geladen...')).not.toBeInTheDocument();
    });
    expect(window.location.hash).toBe('#/pokemon/25');
    expect(
      screen.getByText('Wenn mehrere dieser POKeMON sich versammeln, entladen sie Strom.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('KP 35')).toBeInTheDocument();
    expect(screen.getByText('Größe')).toBeInTheDocument();
    expect(screen.getByText('Gewicht')).toBeInTheDocument();
    expect(screen.getByText('KP')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Wichtige Fakten' })).toBeInTheDocument();
  });

  it('navigates to adjacent pokemon from evolution tiles', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock
      .mockResolvedValueOnce({
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        heightMeters: 0.4,
        weightKilograms: 6,
        category: null,
        flavorText: null,
        evolution: {
          stage: 'Phase 1',
          sharedPath: [
            { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
            {
              id: 25,
              displayName: 'Pikachu',
              image: 'https://img/pikachu.png',
              types: [{ name: 'Elektro' }],
            },
          ],
          branchGroups: [
            {
              originId: 25,
              items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        id: 26,
        name: 'raichu',
        displayName: 'Raichu',
        image: 'https://img/raichu.png',
        types: [{ name: 'Elektro' }],
        heightMeters: 0.8,
        weightKilograms: 30,
        category: null,
        flavorText: null,
        evolution: {
          stage: 'Phase 2',
          sharedPath: [
            { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
            { id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' },
            { id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' },
          ],
          branchGroups: [],
        },
      });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Raichu wechseln' }));

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledWith(26, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Raichu' })).toBeInTheDocument();
    });
    expect(window.location.hash).toBe('#/pokemon/26');
  });

  it('does not render a KP fact card when base HP is unavailable', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      image: 'https://img/pikachu.png',
      types: [{ name: 'Elektro' }],
      heightMeters: 0.4,
      weightKilograms: 6,
      category: 'Maus-Pokemon',
      flavorText: null,
      evolution: {
        stage: 'Phase 1',
        sharedPath: [{ id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' }],
        branchGroups: [],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wichtige Fakten' })).toBeInTheDocument();
    });

    expect(screen.queryByText('KP')).not.toBeInTheDocument();
  });

  it('does not render a KP badge near the hero name when base HP is unavailable', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      image: 'https://img/pikachu.png',
      types: [{ name: 'Elektro' }],
      baseHp: null,
      heightMeters: 0.4,
      weightKilograms: 6,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Phase 1',
        sharedPath: [{ id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' }],
        branchGroups: [],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/KP /)).not.toBeInTheDocument();
  });

  it('keeps detail frame stable while loading next evolution detail', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    const nextDetailPending = deferred<PokemonDetail | null>();
    fetchPokemonDetailMock
      .mockResolvedValueOnce({
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        heightMeters: 0.4,
        weightKilograms: 6,
        category: null,
        flavorText: 'Ein stabiler Rahmen.',
        evolution: {
          stage: 'Phase 1',
          sharedPath: [
            { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
            {
              id: 25,
              displayName: 'Pikachu',
              image: 'https://img/pikachu.png',
              types: [{ name: 'Elektro' }],
            },
          ],
          branchGroups: [
            {
              originId: 25,
              items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
            },
          ],
        },
      })
      .mockImplementationOnce(() => nextDetailPending.promise);

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Raichu wechseln' }));

    expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    expect(screen.getByText('Neue Details werden geladen...')).toBeInTheDocument();
    expect(screen.queryByText('Pokemon wird geladen...')).not.toBeInTheDocument();

    nextDetailPending.resolve({
      id: 26,
      name: 'raichu',
      displayName: 'Raichu',
      image: 'https://img/raichu.png',
      types: [{ name: 'Elektro' }],
      heightMeters: 0.8,
      weightKilograms: 30,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Phase 2',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
          { id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' },
          { id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' },
        ],
        branchGroups: [],
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Raichu' })).toBeInTheDocument();
    });
  });

  it('navigates to earlier pokemon from evolution tiles', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock
      .mockResolvedValueOnce({
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        heightMeters: 0.4,
        weightKilograms: 6,
        category: null,
        flavorText: null,
        evolution: {
          stage: 'Phase 1',
          sharedPath: [
            { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
            {
              id: 25,
              displayName: 'Pikachu',
              image: 'https://img/pikachu.png',
              types: [{ name: 'Elektro' }],
            },
          ],
          branchGroups: [
            {
              originId: 25,
              items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        id: 172,
        name: 'pichu',
        displayName: 'Pichu',
        image: 'https://img/pichu.png',
        types: [{ name: 'Elektro' }],
        heightMeters: 0.3,
        weightKilograms: 2,
        category: null,
        flavorText: null,
        evolution: {
          stage: 'Basis',
          sharedPath: [{ id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' }],
          branchGroups: [
            {
              originId: 172,
              items: [{ id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' }],
            },
          ],
        },
      });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Pichu wechseln' }));

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledWith(172, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pichu' })).toBeInTheDocument();
    });
    expect(window.location.hash).toBe('#/pokemon/172');
  });

  it('renders branching next evolutions as grouped tiles', async () => {
    window.history.pushState({}, '', '/#/pokemon/133');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 133,
      name: 'eevee',
      displayName: 'Evoli',
      image: 'https://img/evoli.png',
      types: [{ name: 'Normal' }],
      heightMeters: 0.3,
      weightKilograms: 6.5,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Basis',
        sharedPath: [
          {
            id: 133,
            displayName: 'Evoli',
            image: 'https://img/evoli.png',
            types: [{ name: 'Normal' }],
          },
        ],
        branchGroups: [
          { originId: 133, items: [{ id: 134, displayName: 'Aquana', image: null }] },
          {
            originId: 133,
            items: [{ id: 135, displayName: 'Blitza', image: 'https://img/blitza.png' }],
          },
        ],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Evoli' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Aquana wechseln' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Blitza wechseln' })).toBeInTheDocument();
    expect(screen.getAllByText('Kein Bild').length).toBeGreaterThan(0);
  });

  it('renders detail view from direct hash ID route and can return to start search state', async () => {
    window.history.pushState({}, '', '/#/pokemon/7');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 7,
      name: 'squirtle',
      displayName: 'Schiggy',
      image: 'https://img/schiggy.png',
      types: [{ name: 'Wasser' }],
      heightMeters: 0.5,
      weightKilograms: 9,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Basis',
        sharedPath: [
          {
            id: 7,
            displayName: 'Schiggy',
            image: 'https://img/schiggy.png',
            types: [{ name: 'Wasser' }],
          },
        ],
        branchGroups: [
          {
            originId: 7,
            items: [{ id: 8, displayName: 'Schillok', image: 'https://img/schillok.png' }],
          },
        ],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Suche' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Suche starten' })).toBeInTheDocument();
    });
    expect(window.location.hash).toBe('#/');
  });

  it('renders detail view from direct hash deep-link', async () => {
    window.history.pushState({}, '', '/#/pokemon/7');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 7,
      name: 'squirtle',
      displayName: 'Schiggy',
      image: 'https://img/schiggy.png',
      types: [{ name: 'Wasser' }],
      heightMeters: 0.5,
      weightKilograms: 9,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Basis',
        sharedPath: [
          {
            id: 7,
            displayName: 'Schiggy',
            image: 'https://img/schiggy.png',
            types: [{ name: 'Wasser' }],
          },
        ],
        branchGroups: [
          {
            originId: 7,
            items: [{ id: 8, displayName: 'Schillok', image: 'https://img/schillok.png' }],
          },
        ],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });
  });

  it('shows detail error and retries loading detail', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      image: 'https://img/pikachu.png',
      types: [{ name: 'Elektro' }],
      heightMeters: 0.4,
      weightKilograms: 6,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
          {
            id: 25,
            displayName: 'Pikachu',
            image: 'https://img/pikachu.png',
            types: [{ name: 'Elektro' }],
          },
        ],
        branchGroups: [
          {
            originId: 25,
            items: [{ id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' }],
          },
        ],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Details konnten nicht geladen werden')).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });
  });

  it('shows not-found state when detail endpoint returns null', async () => {
    window.history.pushState({}, '', '/#/pokemon/999');
    fetchPokemonDetailMock.mockResolvedValueOnce(null);

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Pokemon nicht gefunden')).toBeInTheDocument();
    });
  });

  it('keeps detail frame visible and shows inline retry when related pokemon loading fails', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock
      .mockResolvedValueOnce(detailFixture())
      .mockRejectedValueOnce(new Error('boom'));

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Zu Raichu wechseln' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Die Pokemon-Details konnten gerade nicht geladen werden. Bitte versuche es erneut.',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/pokemon/25');
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
  });

  it('renders evolution section when optional detail fields are missing', async () => {
    window.history.pushState({}, '', '/#/pokemon/2');
    fetchPokemonDetailMock.mockResolvedValueOnce({
      id: 2,
      name: 'ivysaur',
      displayName: 'Bisaknosp',
      image: null,
      types: [{ name: 'Pflanze' }, { name: 'Gift' }],
      heightMeters: 1,
      weightKilograms: 13,
      category: null,
      flavorText: null,
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          { id: 1, displayName: 'Bisasam', image: null },
          {
            id: 2,
            displayName: 'Bisaknosp',
            image: null,
            types: [{ name: 'Pflanze' }, { name: 'Gift' }],
          },
        ],
        branchGroups: [],
      },
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bisaknosp' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
  });

  it('shows detail loading state while detail request is pending', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    const pending = deferred<PokemonDetail | null>();
    fetchPokemonDetailMock.mockReturnValueOnce(pending.promise);

    render(App);

    expect(screen.getByText('Pokemon wird geladen...')).toBeInTheDocument();
    pending.resolve(detailFixture());
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });
  });

  it('maps timeout and server detail errors to specific german messages', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock.mockRejectedValueOnce({
      isSearchPokemonError: true,
      code: 'timeout',
    });
    render(App);

    await waitFor(() => {
      expect(
        screen.getByText('Die Detailansicht hat zu lange geladen. Bitte versuche es erneut.'),
      ).toBeInTheDocument();
    });

    fetchPokemonDetailMock.mockRejectedValueOnce({
      isSearchPokemonError: true,
      code: 'server',
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await waitFor(() => {
      expect(
        screen.getByText(
          'Der Pokemon-Server antwortet gerade nicht richtig. Bitte versuche es erneut.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('uses browser history back when returning from detail opened via result card', async () => {
    searchPokemonMock.mockResolvedValueOnce([
      {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
    ]);
    fetchPokemonDetailMock.mockResolvedValueOnce(detailFixture());

    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(App);

    await fireEvent.input(screen.getByLabelText('Pokemon suchen'), {
      target: { value: 'pikachu' },
    });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pikachu/i })).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByRole('button', { name: /Pikachu/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Suche' }));
    expect(historyBackSpy).toHaveBeenCalled();
  });

  it('reacts to popstate route changes and loads detail by route id', async () => {
    fetchPokemonDetailMock.mockResolvedValue(detailFixture({ id: 7, displayName: 'Schiggy' }));
    render(App);

    window.history.pushState({}, '', '/#/pokemon/7');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });
  });

  it('does not re-fetch detail when popstate repeats the same detail id', async () => {
    fetchPokemonDetailMock.mockResolvedValue(detailFixture({ id: 7, displayName: 'Schiggy' }));
    window.history.pushState({}, '', '/#/pokemon/7');
    render(App);

    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });

    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await Promise.resolve();

    expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to search route when detail route id is invalid', async () => {
    render(App);

    window.history.pushState({}, '', '/#/pokemon/0');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Suche starten' })).toBeInTheDocument();
    });
    expect(fetchPokemonDetailMock).not.toHaveBeenCalled();
  });

  it('ignores stale detail responses when a newer detail route has already been requested', async () => {
    vi.useRealTimers();

    const first = deferred<PokemonDetail | null>();
    const second = deferred<PokemonDetail | null>();
    fetchPokemonDetailMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    window.history.pushState({}, '', '/#/pokemon/25');
    render(App);
    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(1);
    });

    window.history.pushState({}, '', '/#/pokemon/7');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(2);
    });

    second.resolve(detailFixture({ id: 7, displayName: 'Schiggy' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });

    first.resolve(detailFixture({ id: 25, displayName: 'Pikachu' }));
    await Promise.resolve();
    expect(screen.queryByRole('heading', { name: 'Pikachu' })).not.toBeInTheDocument();
  });

  it('ignores stale detail errors and ignores AbortError in detail flow', async () => {
    vi.useRealTimers();

    const first = deferred<PokemonDetail | null>();
    const second = deferred<PokemonDetail | null>();
    fetchPokemonDetailMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    window.history.pushState({}, '', '/#/pokemon/25');
    render(App);
    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(1);
    });

    window.history.pushState({}, '', '/#/pokemon/7');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(2);
    });

    second.resolve(detailFixture({ id: 7, displayName: 'Schiggy' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Schiggy' })).toBeInTheDocument();
    });

    first.reject(new Error('old detail failed'));
    await Promise.resolve();
    expect(screen.queryByText('Details konnten nicht geladen werden')).not.toBeInTheDocument();

    window.history.pushState({}, '', '/#/pokemon/8');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(fetchPokemonDetailMock).toHaveBeenCalledWith(8, expect.any(AbortSignal));
    });
    expect(fetchPokemonDetailMock).toHaveBeenCalledWith(8, expect.any(AbortSignal));
    expect(screen.queryByText('Details konnten nicht geladen werden')).not.toBeInTheDocument();
  });

  it('hides evolution section when no evolution relations exist', async () => {
    window.history.pushState({}, '', '/#/pokemon/132');
    fetchPokemonDetailMock.mockResolvedValueOnce(
      detailFixture({
        id: 132,
        displayName: 'Ditto',
        evolution: {
          stage: 'Basis',
          sharedPath: [{ id: 132, displayName: 'Ditto', image: 'https://img/pikachu.png' }],
          branchGroups: [],
        },
      }),
    );

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ditto' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Entwicklung' })).not.toBeInTheDocument();
  });

  it('renders feature-05 shared path and branch groups in evolution section', async () => {
    window.history.pushState({}, '', '/#/pokemon/133');
    fetchPokemonDetailMock.mockResolvedValueOnce(
      detailFixture({
        id: 133,
        name: 'eevee',
        displayName: 'Evoli',
        types: [{ name: 'Normal' }],
        evolution: {
          stage: 'Basis',
          sharedPath: [
            {
              id: 133,
              displayName: 'Evoli',
              image: 'https://img/evoli.png',
              types: [{ name: 'Normal' }],
            },
          ],
          branchGroups: [
            {
              originId: 133,
              items: [
                { id: 134, displayName: 'Aquana', image: null, types: [{ name: 'Wasser' }] },
                {
                  id: 135,
                  displayName: 'Blitza',
                  image: 'https://img/blitza.png',
                  types: [{ name: 'Elektro' }],
                },
              ],
            },
          ],
        },
      }),
    );

    render(App);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Evoli' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Aquana wechseln' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Blitza wechseln' })).toBeInTheDocument();
  });

  it('does not retry detail loading when retry handler runs outside detail route', async () => {
    window.history.pushState({}, '', '/#/pokemon/25');
    fetchPokemonDetailMock.mockRejectedValueOnce(new Error('boom'));

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Details konnten nicht geladen werden')).toBeInTheDocument();
    });
    const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' });

    window.history.pushState({}, '', '/#/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Suche starten' })).toBeInTheDocument();
    });

    await fireEvent.click(retryButton);
    expect(fetchPokemonDetailMock).toHaveBeenCalledTimes(1);
  });
});
