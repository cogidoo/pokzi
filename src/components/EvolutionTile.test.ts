import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EvolutionTile from './EvolutionTile.svelte';

describe('EvolutionTile', () => {
  it('renders current tile as non-clickable article', () => {
    render(EvolutionTile, {
      tile: {
        id: 25,
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }, { name: 'Fee' }, { name: 'Flug' }],
      },
      current: true,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Pikachu').closest('article')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Elektro')).toBeInTheDocument();
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.getAllByText(/Elektro|Fee/)).toHaveLength(2);
  });

  it('renders non-current tile as button and emits onSelect', async () => {
    const onSelect = vi.fn();
    render(EvolutionTile, {
      tile: {
        id: 26,
        displayName: 'Raichu',
        image: 'https://img/raichu.png',
        types: [{ name: 'Elektro' }],
      },
      current: false,
      onSelect,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Zu Raichu wechseln' }));
    expect(onSelect).toHaveBeenCalledWith(26);
  });

  it('renders image fallback and hides type group when no types exist', () => {
    render(EvolutionTile, {
      tile: {
        id: 133,
        displayName: 'Evoli',
        image: null,
        types: [],
      },
      current: false,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Kein Bild')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Evoli wechseln' })).toBeInTheDocument();
  });

  it('keeps types visible on non-current tile', () => {
    render(EvolutionTile, {
      tile: {
        id: 4,
        displayName: 'Glumanda',
        image: 'https://img/glumanda.png',
        types: [{ name: 'Feuer' }],
      },
      current: false,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Feuer')).toBeInTheDocument();
  });

  it('renders image fallback for current tile when image is missing', () => {
    render(EvolutionTile, {
      tile: {
        id: 150,
        displayName: 'Mewtu',
        image: null,
        types: [{ name: 'Psycho' }],
      },
      current: true,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Kein Bild')).toBeInTheDocument();
    expect(screen.getByText('Mewtu').closest('article')).toHaveAttribute('aria-current', 'true');
  });

  it('handles current tile without type metadata', () => {
    render(EvolutionTile, {
      tile: {
        id: 143,
        displayName: 'Relaxo',
        image: 'https://img/relaxo.png',
      },
      current: true,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Relaxo')).toBeInTheDocument();
    expect(screen.getByText('Relaxo').closest('article')).toHaveAttribute('aria-current', 'true');
  });

  it('keeps long names readable', () => {
    render(EvolutionTile, {
      tile: {
        id: 999,
        displayName: 'SehrLangesPokemonMitVielemTextUndMehrerenSilben',
        image: 'https://img/longname.png',
        types: [{ name: 'Drache' }],
      },
      current: false,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('SehrLangesPokemonMitVielemTextUndMehrerenSilben')).toBeInTheDocument();
  });
});
