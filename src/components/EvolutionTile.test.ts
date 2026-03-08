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
    expect(screen.queryByRole('button', { name: 'Zu Pikachu wechseln' })).not.toBeInTheDocument();
    expect(screen.getByText('Elektro')).toBeInTheDocument();
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.queryByText('Flug')).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText('Evoli Typen')).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Zu Mewtu wechseln' })).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText('Relaxo Typen')).not.toBeInTheDocument();
  });
});
