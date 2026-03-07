import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EvolutionSummary from './EvolutionSummary.svelte';

describe('EvolutionSummary', () => {
  it('renders shared path with active current tile and type chips', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          {
            id: 172,
            displayName: 'Pichu',
            image: 'https://img/pichu.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 25,
            displayName: 'Pikachu',
            image: 'https://img/pikachu.png',
            types: [{ name: 'Elektro' }, { name: 'Fee' }, { name: 'Flug' }],
          },
        ],
        branchGroups: [],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('heading', { name: 'Entwicklung' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Entwicklungsweg' })).toBeInTheDocument();
    expect(screen.getByText('Aktuelle Stufe: Phase 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zu Pikachu wechseln' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Elektro').length).toBeGreaterThan(0);
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.queryByText('Flug')).not.toBeInTheDocument();
  });

  it('renders branch groups and calls onSelect for non-current branch items', async () => {
    const onSelect = vi.fn();
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [{ id: 133, displayName: 'Evoli', image: null, types: [{ name: 'Normal' }] }],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null, types: [{ name: 'Wasser' }] },
              { id: 135, displayName: 'Blitza', image: 'https://img/blitza.png', types: [] },
            ],
          },
        ],
      },
      currentPokemonId: 133,
      onSelect,
    });

    expect(screen.getByLabelText('Weitere Entwicklungszweige')).toBeInTheDocument();
    expect(screen.getByLabelText('Entwicklungszweig 1')).toBeInTheDocument();
    expect(screen.getAllByText('Kein Bild').length).toBeGreaterThan(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Aquana wechseln' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Blitza wechseln' }));
    expect(onSelect).toHaveBeenCalledWith(134);
    expect(onSelect).toHaveBeenCalledWith(135);
  });

  it('handles current tile inside branch group', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [{ id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' }],
        branchGroups: [
          {
            originId: 25,
            items: [
              {
                id: 25,
                displayName: 'Pikachu',
                image: 'https://img/pikachu.png',
                types: [{ name: 'Elektro' }],
              },
            ],
          },
        ],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.queryByRole('button', { name: 'Zu Pikachu wechseln' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Pikachu').length).toBeGreaterThan(0);
  });

  it('renders safe empty state when sharedPath and branchGroups are empty', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [],
        branchGroups: [],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('heading', { name: 'Entwicklung' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Weitere Entwicklungszweige')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wechseln/i })).not.toBeInTheDocument();
  });

  it('renders image and type fallbacks for current and non-current tiles', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: null },
          { id: 25, displayName: 'Pikachu', image: null, types: [] },
        ],
        branchGroups: [
          {
            originId: 25,
            items: [{ id: 25, displayName: 'Pikachu', image: null }],
          },
        ],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeInTheDocument();
    expect(screen.getAllByText('Kein Bild').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Pikachu Typen')).not.toBeInTheDocument();
  });
});
